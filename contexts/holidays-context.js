"use client";

import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { holidaysApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";

const HolidaysContext = createContext(null);

const HOLIDAYS_STALE_MS = 24 * 60 * 60 * 1000;

export function HolidaysProvider({ children }) {
  const query = useQuery({
    queryKey: queryKeys.holidaysBundle,
    queryFn: () => holidaysApi.bundle(),
    staleTime: HOLIDAYS_STALE_MS,
    gcTime: HOLIDAYS_STALE_MS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const value = useMemo(() => {
    const bundle = query.data ?? null;

    return {
      bundle,
      isLoading: query.isLoading,
      isError: query.isError,
      refetch: query.refetch,
      todayYmd: bundle?.todayYmd ?? null,
      upcoming(limit = 8) {
        if (!bundle?.upcoming) {
          return [];
        }
        return bundle.upcoming.slice(0, Math.max(1, limit));
      },
      holidaysForYear(year) {
        const entry = bundle?.years?.[String(year)];
        return entry?.holidays ?? [];
      },
      yearErrors(year) {
        return bundle?.years?.[String(year)]?.errors ?? bundle?.errors ?? {};
      },
      loadedYears() {
        if (!bundle?.years) {
          return [];
        }
        return Object.keys(bundle.years)
          .map(Number)
          .sort((a, b) => a - b);
      },
    };
  }, [query.data, query.isError, query.isLoading, query.refetch]);

  return <HolidaysContext.Provider value={value}>{children}</HolidaysContext.Provider>;
}

export function useHolidaysContext() {
  const ctx = useContext(HolidaysContext);
  if (!ctx) {
    throw new Error("useHolidaysContext must be used within HolidaysProvider");
  }
  return ctx;
}

/** Slice upcoming holidays from the shared bundle (no extra API call). */
export function useUpcomingHolidays(limit = 8) {
  const ctx = useHolidaysContext();

  return useMemo(
    () => ({
      data: ctx.bundle
        ? {
            todayYmd: ctx.todayYmd,
            holidays: ctx.upcoming(limit),
            errors: ctx.bundle.errors ?? {},
          }
        : undefined,
      isLoading: ctx.isLoading,
      isError: ctx.isError,
      refetch: ctx.refetch,
    }),
    [
      ctx.bundle,
      ctx.todayYmd,
      ctx.isLoading,
      ctx.isError,
      ctx.refetch,
      ctx.upcoming,
      limit,
    ],
  );
}

/** Holidays for one year from the shared bundle (no extra API call). */
export function useHolidaysForYear(year) {
  const ctx = useHolidaysContext();

  return useMemo(
    () => ({
      data: ctx.bundle
        ? {
            year,
            holidays: ctx.holidaysForYear(year),
            errors: ctx.yearErrors(year),
          }
        : undefined,
      isLoading: ctx.isLoading,
      isError: ctx.isError,
      refetch: ctx.refetch,
    }),
    [
      ctx.bundle,
      ctx.isLoading,
      ctx.isError,
      ctx.refetch,
      ctx.holidaysForYear,
      ctx.yearErrors,
      year,
    ],
  );
}
