import { useAppCategories } from "@/contexts/app-data-context";

export function useCategories() {
  const categories = useAppCategories();
  return {
    data: { items: categories.items },
    isLoading: categories.isLoading,
    isError: categories.isError,
    error: categories.error,
    refetch: categories.refetch,
  };
}

export function useCategoryMutations() {
  const categories = useAppCategories();
  return {
    create: {
      mutateAsync: categories.create,
      isPending: categories.creating,
    },
    update: {
      mutateAsync: ({ id, body }) => categories.update(id, body),
      isPending: categories.updating,
    },
    remove: {
      mutateAsync: categories.remove,
      isPending: categories.removing,
    },
  };
}
