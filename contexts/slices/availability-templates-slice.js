"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { availabilityTemplatesApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { catalogQueryOptions } from "@/lib/query-cache";

/** Shared catalog slice — list cached for task schedule forms. */
export function useAvailabilityTemplatesSlice() {
  const listQuery = useQuery({
    queryKey: queryKeys.availabilityTemplates,
    queryFn: availabilityTemplatesApi.list,
    ...catalogQueryOptions(),
  });

  const items = listQuery.data?.items ?? [];

  return useMemo(
    () => ({
      items,
      isLoading: listQuery.isLoading,
      isError: listQuery.isError,
      error: listQuery.error,
      refetch: listQuery.refetch,
    }),
    [items, listQuery.isLoading, listQuery.isError, listQuery.error, listQuery.refetch],
  );
}
