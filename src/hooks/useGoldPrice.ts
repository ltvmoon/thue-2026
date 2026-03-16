'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchGoldPrices,
  type GoldPrice,
  type GoldTypeCode,
  POPULAR_GOLD_TYPES,
} from '@/lib/goldPriceService';

export interface UseGoldPriceReturn {
  prices: GoldPrice[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  getPrice: (typeCode: GoldTypeCode) => GoldPrice | undefined;
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 phút

export function useGoldPrice(autoRefresh = true): UseGoldPriceReturn {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchGoldPrices();
      if (!isMountedRef.current) return;

      // Filter to popular types and sort
      const filtered = response.data.filter(p =>
        POPULAR_GOLD_TYPES.includes(p.typeCode)
      );
      // Keep order of POPULAR_GOLD_TYPES
      const sorted = POPULAR_GOLD_TYPES
        .map(code => filtered.find(p => p.typeCode === code))
        .filter((p): p is GoldPrice => p != null);

      // If we got fewer than expected, add any remaining
      const remaining = filtered.filter(
        p => !sorted.some(s => s.typeCode === p.typeCode)
      );

      setPrices([...sorted, ...remaining]);
      setLastUpdated(new Date());
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể lấy giá vàng. Vui lòng thử lại.'
      );
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const getPrice = useCallback(
    (typeCode: GoldTypeCode): GoldPrice | undefined => {
      return prices.find(p => p.typeCode === typeCode);
    },
    [prices]
  );

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refresh]);

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    refresh,
    getPrice,
  };
}
