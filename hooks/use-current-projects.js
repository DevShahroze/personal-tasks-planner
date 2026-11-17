import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currentProjectsApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { detailQueryOptions, listQueryOptions } from "@/lib/query-cache";

export function useCurrentProjects(filters) {
  return useQuery({
    queryKey: queryKeys.currentProjects(filters),
    queryFn: () => currentProjectsApi.list(filters),
    placeholderData: (prev) => prev,
    ...listQueryOptions(),
  });
}

export function useCurrentProject(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.currentProject(id),
    queryFn: () => currentProjectsApi.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}

function invalidateCurrentProjectQueries(queryClient, id) {
  queryClient.invalidateQueries({ queryKey: ["current-projects"] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: queryKeys.currentProject(id) });
  }
}

export function useCreateCurrentProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: currentProjectsApi.create,
    onSuccess: () => invalidateCurrentProjectQueries(queryClient),
  });
}

export function useUpdateCurrentProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => currentProjectsApi.update(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.currentProject(data._id), data);
      invalidateCurrentProjectQueries(queryClient, data._id);
    },
  });
}

export function useDeleteCurrentProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: currentProjectsApi.remove,
    onSuccess: () => invalidateCurrentProjectQueries(queryClient),
  });
}
