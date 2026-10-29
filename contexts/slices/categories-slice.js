"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { catalogQueryOptions } from "@/lib/query-cache";

function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function upsertCategory(items, category) {
  const row = { ...category, taskCount: category.taskCount ?? 0 };
  const without = items.filter((item) => String(item._id) !== String(category._id));
  return sortByName([...without, row]);
}

/** Shared catalog slice — register more slices alongside this in app-data-context. */
export function useCategoriesSlice() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: categoriesApi.list,
    ...catalogQueryOptions(),
  });

  const patchList = useCallback(
    (updater) => {
      queryClient.setQueryData(queryKeys.categories, (current) => {
        const prevItems = current?.items ?? [];
        return { items: updater(prevItems) };
      });
    },
    [queryClient],
  );

  const invalidateTaskViews = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.charts });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: (category) => {
      patchList((items) => upsertCategory(items, category));
      invalidateTaskViews();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => categoriesApi.update(id, body),
    onSuccess: (category) => {
      patchList((items) => upsertCategory(items, category));
      invalidateTaskViews();
    },
  });

  const removeMutation = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      invalidateTaskViews();
    },
  });

  const items = listQuery.data?.items ?? [];

  return useMemo(
    () => ({
      items,
      isLoading: listQuery.isLoading,
      isError: listQuery.isError,
      error: listQuery.error,
      refetch: listQuery.refetch,
      create: createMutation.mutateAsync,
      update: (id, body) => updateMutation.mutateAsync({ id, body }),
      remove: removeMutation.mutateAsync,
      creating: createMutation.isPending,
      updating: updateMutation.isPending,
      removing: removeMutation.isPending,
    }),
    [
      items,
      listQuery.isLoading,
      listQuery.isError,
      listQuery.error,
      listQuery.refetch,
      createMutation,
      updateMutation,
      removeMutation,
      removeMutation.mutateAsync,
      removeMutation.isPending,
    ],
  );
}
