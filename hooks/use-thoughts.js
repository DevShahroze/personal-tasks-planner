import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { thoughtsApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { detailQueryOptions, listQueryOptions } from "@/lib/query-cache";

export function useThoughts(filters) {
  return useQuery({
    queryKey: queryKeys.thoughts(filters),
    queryFn: () => thoughtsApi.list(filters),
    placeholderData: (prev) => prev,
    ...listQueryOptions(),
  });
}

export function useThought(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.thought(id),
    queryFn: () => thoughtsApi.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}

function invalidateThoughtQueries(queryClient, id) {
  queryClient.invalidateQueries({ queryKey: ["thoughts"] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: queryKeys.thought(id) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.listings });
}

export function useCreateThoughtMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: thoughtsApi.create,
    onSuccess: () => invalidateThoughtQueries(queryClient),
  });
}

export function useUpdateThoughtMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => thoughtsApi.update(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.thought(data._id), data);
      invalidateThoughtQueries(queryClient, data._id);
    },
  });
}

export function useDeleteThoughtMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: thoughtsApi.remove,
    onSuccess: () => invalidateThoughtQueries(queryClient),
  });
}

export function useThoughtLinkMutations(thoughtId) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.thought(thoughtId) });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  };

  return {
    linkTask: useMutation({
      mutationFn: (taskId) => thoughtsApi.linkTask(thoughtId, taskId),
      onSuccess: invalidate,
    }),
    unlinkTask: useMutation({
      mutationFn: (taskId) => thoughtsApi.unlinkTask(thoughtId, taskId),
      onSuccess: invalidate,
    }),
    linkPlan: useMutation({
      mutationFn: (planId) => thoughtsApi.linkPlan(thoughtId, planId),
      onSuccess: invalidate,
    }),
    unlinkPlan: useMutation({
      mutationFn: (planId) => thoughtsApi.unlinkPlan(thoughtId, planId),
      onSuccess: invalidate,
    }),
  };
}
