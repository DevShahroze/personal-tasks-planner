import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: categoriesApi.list,
  });
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.charts });
  };

  return {
    create: useMutation({
      mutationFn: categoriesApi.create,
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }) => categoriesApi.update(id, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: categoriesApi.remove,
      onSuccess: invalidate,
    }),
  };
}
