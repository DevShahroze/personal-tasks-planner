import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { plansApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { detailQueryOptions, listQueryOptions } from "@/lib/query-cache";

export function usePlans(filters) {
  return useQuery({
    queryKey: queryKeys.plans(filters),
    queryFn: () => plansApi.list(filters),
    placeholderData: (prev) => prev,
    ...listQueryOptions(),
  });
}

export function usePlan(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.plan(id),
    queryFn: () => plansApi.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}

function invalidatePlanQueries(queryClient, id) {
  queryClient.invalidateQueries({ queryKey: ["plans"] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: queryKeys.plan(id) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.listings });
}

export function useCreatePlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plansApi.create,
    onSuccess: () => invalidatePlanQueries(queryClient),
  });
}

export function useUpdatePlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => plansApi.update(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.plan(data._id), data);
      invalidatePlanQueries(queryClient, data._id);
    },
  });
}

export function useDeletePlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plansApi.remove,
    onSuccess: () => invalidatePlanQueries(queryClient),
  });
}

export function usePlanLinkMutations(planId) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.plan(planId) });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["thoughts"] });
  };

  return {
    linkTask: useMutation({
      mutationFn: (taskId) => plansApi.linkTask(planId, taskId),
      onSuccess: invalidate,
    }),
    unlinkTask: useMutation({
      mutationFn: (taskId) => plansApi.unlinkTask(planId, taskId),
      onSuccess: invalidate,
    }),
    linkThought: useMutation({
      mutationFn: (thoughtId) => plansApi.linkThought(planId, thoughtId),
      onSuccess: invalidate,
    }),
    unlinkThought: useMutation({
      mutationFn: (thoughtId) => plansApi.unlinkThought(planId, thoughtId),
      onSuccess: invalidate,
    }),
  };
}
