/**
 * Gold Tax Calculator
 * Tính thuế chuyển nhượng vàng miệng
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN sửa đổi 2025 (Quốc hội thông qua 10/12/2025)
 * - Có hiệu lực từ 01/07/2026
 *
 * Quy định chính:
 * - Thuế suất: 0,1% trên giá trị giao dịch chuyển nhượng
 * - Áp dụng cho vàng miệng (gold bars/ingots)
 * - Không phân biệt lãi/lỗ - tính trên giá trị giao dịch
 * - Chỉ áp dụng khi BÁN, không áp dụng khi MUA
 * - Vàng trang sức/mỹ nghệ: không thuộc phạm vi này
 */

import type { GoldTypeCode } from './goldPriceService';

// Tax configuration
export const GOLD_TAX_CONFIG = {
  // Thuế suất chuyển nhượng vàng miệng
  transferRate: 0.001, // 0,1%

  // Ngày hiệu lực
  effectiveDate: new Date('2026-07-01'),

  // So sánh với các loại thuế tương tự
  comparison: {
    gold: { rate: 0.001, name: 'Vàng miệng', label: 'Vàng' },
    securities: { rate: 0.001, name: 'Chứng khoán niêm yết', label: 'CK' },
    crypto: { rate: 0.001, name: 'Tài sản số', label: 'Crypto' },
    realEstate: { rate: 0.02, name: 'Bất động sản', label: 'BĐS' },
  },
};

// Gold classification
export type GoldClassification = 'bar' | 'ring' | 'jewelry';

export interface GoldClassificationInfo {
  id: GoldClassification;
  name: string;
  description: string;
  isTaxable: boolean;
  taxNote: string;
}

export const GOLD_CLASSIFICATIONS: GoldClassificationInfo[] = [
  {
    id: 'bar',
    name: 'Vàng miếng',
    description: 'SJC, DOJI, PNJ, BTMC dạng miếng (1 chỉ, 2 chỉ, 1 lượng, 5 lượng, 10 lượng)',
    isTaxable: true,
    taxNote: 'Chịu thuế 0,1% khi bán (từ 01/07/2026)',
  },
  {
    id: 'ring',
    name: 'Vàng nhẫn trơn',
    description: 'Nhẫn tròn trơn 9999, 24K (dùng như phương tiện tích trữ)',
    isTaxable: true,
    taxNote: 'Chịu thuế 0,1% khi bán (từ 01/07/2026)',
  },
  {
    id: 'jewelry',
    name: 'Vàng trang sức',
    description: 'Dây chuyền, lắc tay, nhẫn đính đá... (vàng mỹ nghệ)',
    isTaxable: false,
    taxNote: 'Không thuộc phạm vi thuế chuyển nhượng vàng miệng',
  },
];

// Transaction type
export type GoldTransactionType = 'buy' | 'sell';

// Weight unit
export type GoldWeightUnit = 'luong' | 'chi' | 'gram';

// Weight conversion: everything to lượng
export const WEIGHT_TO_LUONG: Record<GoldWeightUnit, number> = {
  luong: 1,
  chi: 0.1,       // 1 chỉ = 0.1 lượng
  gram: 1 / 37.5, // 1 lượng ≈ 37.5 gram
};

export const WEIGHT_UNIT_NAMES: Record<GoldWeightUnit, string> = {
  luong: 'Lượng',
  chi: 'Chỉ',
  gram: 'Gram',
};

// Common gold weights for quick selection
export const COMMON_WEIGHTS = [
  { label: '1 chỉ', unit: 'chi' as GoldWeightUnit, value: 1 },
  { label: '2 chỉ', unit: 'chi' as GoldWeightUnit, value: 2 },
  { label: '5 chỉ', unit: 'chi' as GoldWeightUnit, value: 5 },
  { label: '1 lượng', unit: 'luong' as GoldWeightUnit, value: 1 },
  { label: '2 lượng', unit: 'luong' as GoldWeightUnit, value: 2 },
  { label: '5 lượng', unit: 'luong' as GoldWeightUnit, value: 5 },
  { label: '10 lượng', unit: 'luong' as GoldWeightUnit, value: 10 },
];

// Single gold transaction
export interface GoldTransaction {
  id: string;
  date: Date;
  type: GoldTransactionType;
  classification: GoldClassification;
  goldTypeCode?: GoldTypeCode;
  goldTypeName: string;
  weight: number;
  weightUnit: GoldWeightUnit;
  pricePerLuong: number; // VND per lượng
  totalValue: number;    // VND
  notes?: string;
}

// Calculator input
export interface GoldTaxInput {
  transactions: GoldTransaction[];
}

// Transaction with tax calculated
export interface GoldTransactionWithTax extends GoldTransaction {
  taxAmount: number;
  isTaxable: boolean;
  taxNote: string;
  weightInLuong: number;
}

// Calculator result
export interface GoldTaxResult {
  // Tổng quan
  totalTransactions: number;
  totalTaxableTransactions: number;

  // Giá trị giao dịch
  totalBuyValue: number;
  totalSellValue: number;
  totalBuyWeight: number;  // lượng
  totalSellWeight: number; // lượng

  // Thuế
  totalTaxableValue: number;
  totalTax: number;
  effectiveTaxRate: number;

  // Chi tiết theo loại vàng
  taxByGoldType: {
    goldTypeName: string;
    transactionCount: number;
    totalValue: number;
    taxAmount: number;
  }[];

  // Lãi/lỗ ước tính (nếu có cả mua và bán)
  estimatedProfitLoss: number | null;

  // So sánh thuế suất
  taxComparison: {
    asset: string;
    label: string;
    rate: number;
    taxAmount: number;
    difference: number;
  }[];

  // Giao dịch chi tiết
  transactionsWithTax: GoldTransactionWithTax[];
}

/**
 * Convert weight to lượng
 */
export function convertToLuong(weight: number, unit: GoldWeightUnit): number {
  return weight * WEIGHT_TO_LUONG[unit];
}

/**
 * Calculate total value from weight and price per lượng
 */
export function calculateTotalValue(
  weight: number,
  unit: GoldWeightUnit,
  pricePerLuong: number
): number {
  const weightInLuong = convertToLuong(weight, unit);
  return Math.round(weightInLuong * pricePerLuong);
}

/**
 * Check if transaction is taxable
 * - Only SELL transactions are taxable
 * - Only bar and ring gold (not jewelry)
 * - Only after effective date
 */
function isTransactionTaxable(tx: GoldTransaction): boolean {
  if (tx.type !== 'sell') return false;

  const classification = GOLD_CLASSIFICATIONS.find(c => c.id === tx.classification);
  if (!classification || !classification.isTaxable) return false;

  if (tx.date < GOLD_TAX_CONFIG.effectiveDate) return false;

  return true;
}

/**
 * Get tax note for a transaction
 */
function getTaxNote(tx: GoldTransaction): string {
  if (tx.type === 'buy') {
    return 'Mua vào không chịu thuế';
  }

  const classification = GOLD_CLASSIFICATIONS.find(c => c.id === tx.classification);
  if (!classification?.isTaxable) {
    return 'Vàng trang sức không thuộc phạm vi chịu thuế';
  }

  if (tx.date < GOLD_TAX_CONFIG.effectiveDate) {
    return 'Giao dịch trước ngày luật có hiệu lực (01/07/2026)';
  }

  return `Chịu thuế 0,1% × ${new Intl.NumberFormat('vi-VN').format(tx.totalValue)} đ`;
}

/**
 * Calculate tax for a single transaction
 */
function calculateTransactionTax(tx: GoldTransaction): GoldTransactionWithTax {
  const isTaxable = isTransactionTaxable(tx);
  const taxAmount = isTaxable ? Math.round(tx.totalValue * GOLD_TAX_CONFIG.transferRate) : 0;
  const weightInLuong = convertToLuong(tx.weight, tx.weightUnit);

  return {
    ...tx,
    taxAmount,
    isTaxable,
    taxNote: getTaxNote(tx),
    weightInLuong,
  };
}

/**
 * Main calculation function
 */
export function calculateGoldTax(input: GoldTaxInput): GoldTaxResult {
  const { transactions } = input;

  // Calculate tax for each transaction
  const transactionsWithTax = transactions.map(calculateTransactionTax);

  // Summary
  let totalBuyValue = 0;
  let totalSellValue = 0;
  let totalBuyWeight = 0;
  let totalSellWeight = 0;
  let totalTaxableValue = 0;
  let totalTax = 0;

  const goldTypeMap = new Map<string, {
    transactionCount: number;
    totalValue: number;
    taxAmount: number;
  }>();

  for (const tx of transactionsWithTax) {
    if (tx.type === 'buy') {
      totalBuyValue += tx.totalValue;
      totalBuyWeight += tx.weightInLuong;
    } else {
      totalSellValue += tx.totalValue;
      totalSellWeight += tx.weightInLuong;
    }

    if (tx.isTaxable) {
      totalTaxableValue += tx.totalValue;
      totalTax += tx.taxAmount;
    }

    // Group by gold type
    const key = tx.goldTypeName;
    const existing = goldTypeMap.get(key) || {
      transactionCount: 0,
      totalValue: 0,
      taxAmount: 0,
    };
    existing.transactionCount++;
    existing.totalValue += tx.totalValue;
    existing.taxAmount += tx.taxAmount;
    goldTypeMap.set(key, existing);
  }

  // Tax by gold type
  const taxByGoldType = Array.from(goldTypeMap.entries()).map(([name, data]) => ({
    goldTypeName: name,
    ...data,
  }));

  // Estimated P&L (if both buy and sell exist)
  let estimatedProfitLoss: number | null = null;
  if (totalBuyValue > 0 && totalSellValue > 0) {
    estimatedProfitLoss = totalSellValue - totalBuyValue;
  }

  // Tax comparison
  const taxComparison = Object.entries(GOLD_TAX_CONFIG.comparison).map(([, config]) => {
    const taxAmount = Math.round(totalTaxableValue * config.rate);
    return {
      asset: config.name,
      label: config.label,
      rate: config.rate,
      taxAmount,
      difference: taxAmount - totalTax,
    };
  });

  // Effective tax rate
  const totalValue = totalBuyValue + totalSellValue;
  const effectiveTaxRate = totalValue > 0 ? (totalTax / totalValue) * 100 : 0;

  return {
    totalTransactions: transactions.length,
    totalTaxableTransactions: transactionsWithTax.filter(tx => tx.isTaxable).length,
    totalBuyValue,
    totalSellValue,
    totalBuyWeight,
    totalSellWeight,
    totalTaxableValue,
    totalTax,
    effectiveTaxRate,
    taxByGoldType,
    estimatedProfitLoss,
    taxComparison,
    transactionsWithTax,
  };
}

/**
 * Generate unique transaction ID
 */
export function generateGoldTransactionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Format weight for display
 */
export function formatWeight(weight: number, unit: GoldWeightUnit): string {
  const luong = convertToLuong(weight, unit);
  if (unit === 'luong') {
    return `${weight} lượng`;
  }
  if (unit === 'chi') {
    return `${weight} chỉ (${luong.toFixed(1)} lượng)`;
  }
  return `${weight}g (${luong.toFixed(2)} lượng)`;
}
