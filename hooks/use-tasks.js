import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { detailQueryOptions, listQueryOptions } from "@/lib/query-cache";

export function useTasks(filters) {
  return useQuery({
    queryKey: queryKeys.tasks(filters),
    queryFn: () => tasksApi.list(filters),
    placeholderData: (prev) => prev,
    ...listQueryOptions(),
  });
}

export function useTask(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.task(id),
    queryFn: () => tasksApi.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}

function invalidateTaskQueries(queryClient, id, parentTaskId) {
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: queryKeys.task(id) });
  }
  if (parentTaskId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.subtasks(parentTaskId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.task(parentTaskId) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.charts });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.listings });
  queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
}

export function useSubtasks(parentId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.subtasks(parentId),
    queryFn: () => tasksApi.listSubtasks(parentId),
    enabled: Boolean(parentId) && enabled,
    ...detailQueryOptions(),
  });
}

export function useSubtaskMutations(parentId) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    invalidateTaskQueries(queryClient, parentId, parentId);
    queryClient.invalidateQueries({ queryKey: queryKeys.subtasks(parentId) });
  };

  const createSubtask = useMutation({
    mutationFn: (body) => tasksApi.createSubtask(parentId, body),
    onSuccess: () => invalidate(),
  });

  const updateSubtask = useMutation({
    mutationFn: ({ id, body }) => tasksApi.update(id, body),
    onSuccess: (data) => invalidate(),
  });

  const deleteSubtask = useMutation({
    mutationFn: (id) => tasksApi.remove(id),
    onSuccess: () => invalidate(),
  });

  return { createSubtask, updateSubtask, deleteSubtask };
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => invalidateTaskQueries(queryClient),
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => tasksApi.update(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.task(data._id), data);
      invalidateTaskQueries(queryClient, data._id, data.parentTaskId || undefined);
      if (!data.parentTaskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.subtasks(data._id) });
      }
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.remove,
    onSuccess: () => invalidateTaskQueries(queryClient),
  });
}

export function useTaskLinkMutations(taskId) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    queryClient.invalidateQueries({ queryKey: ["thoughts"] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  };

  const linkThought = useMutation({
    mutationFn: (thoughtId) => tasksApi.linkThought(taskId, thoughtId),
    onSuccess: invalidate,
  });

  const unlinkThought = useMutation({
    mutationFn: (thoughtId) => tasksApi.unlinkThought(taskId, thoughtId),
    onSuccess: invalidate,
  });

  const linkPlan = useMutation({
    mutationFn: (planId) => tasksApi.linkPlan(taskId, planId),
    onSuccess: invalidate,
  });

  const unlinkPlan = useMutation({
    mutationFn: (planId) => tasksApi.unlinkPlan(taskId, planId),
    onSuccess: invalidate,
  });

  return { linkThought, unlinkThought, linkPlan, unlinkPlan };
}
