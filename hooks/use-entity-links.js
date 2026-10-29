import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, thoughtsApi, plansApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";

export function useEntityLinks(entityType, entityId) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (entityType === "task") {
      queryClient.invalidateQueries({ queryKey: queryKeys.task(entityId) });
    } else if (entityType === "thought") {
      queryClient.invalidateQueries({ queryKey: queryKeys.thought(entityId) });
    } else if (entityType === "plan") {
      queryClient.invalidateQueries({ queryKey: queryKeys.plan(entityId) });
    }
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["thoughts"] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  };

  const linkThoughtToTask = useMutation({
    mutationFn: (thoughtId) => tasksApi.linkThought(entityId, thoughtId),
    onSuccess: invalidate,
  });

  const unlinkThoughtFromTask = useMutation({
    mutationFn: (thoughtId) => tasksApi.unlinkThought(entityId, thoughtId),
    onSuccess: invalidate,
  });

  const linkPlanToTask = useMutation({
    mutationFn: (planId) => tasksApi.linkPlan(entityId, planId),
    onSuccess: invalidate,
  });

  const unlinkPlanFromTask = useMutation({
    mutationFn: (planId) => tasksApi.unlinkPlan(entityId, planId),
    onSuccess: invalidate,
  });

  const linkTaskToThought = useMutation({
    mutationFn: (taskId) => thoughtsApi.linkTask(entityId, taskId),
    onSuccess: invalidate,
  });

  const unlinkTaskFromThought = useMutation({
    mutationFn: (taskId) => thoughtsApi.unlinkTask(entityId, taskId),
    onSuccess: invalidate,
  });

  const linkPlanToThought = useMutation({
    mutationFn: (planId) => thoughtsApi.linkPlan(entityId, planId),
    onSuccess: invalidate,
  });

  const unlinkPlanFromThought = useMutation({
    mutationFn: (planId) => thoughtsApi.unlinkPlan(entityId, planId),
    onSuccess: invalidate,
  });

  const linkTaskToPlan = useMutation({
    mutationFn: (taskId) => plansApi.linkTask(entityId, taskId),
    onSuccess: invalidate,
  });

  const unlinkTaskFromPlan = useMutation({
    mutationFn: (taskId) => plansApi.unlinkTask(entityId, taskId),
    onSuccess: invalidate,
  });

  const linkThoughtToPlan = useMutation({
    mutationFn: (thoughtId) => plansApi.linkThought(entityId, thoughtId),
    onSuccess: invalidate,
  });

  const unlinkThoughtFromPlan = useMutation({
    mutationFn: (thoughtId) => plansApi.unlinkThought(entityId, thoughtId),
    onSuccess: invalidate,
  });

  return {
    linkThoughtToTask,
    unlinkThoughtFromTask,
    linkPlanToTask,
    unlinkPlanFromTask,
    linkTaskToThought,
    unlinkTaskFromThought,
    linkPlanToThought,
    unlinkPlanFromThought,
    linkTaskToPlan,
    unlinkTaskFromPlan,
    linkThoughtToPlan,
    unlinkThoughtFromPlan,
  };
}
