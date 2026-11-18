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

function invalidateCurrentProjectListQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["current-projects", "list"] });
}

export function useCreateCurrentProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: currentProjectsApi.create,
    onSuccess: () => invalidateCurrentProjectListQueries(queryClient),
  });
}

export function useUpdateCurrentProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => currentProjectsApi.update(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.currentProject(data._id), data);
      invalidateCurrentProjectListQueries(queryClient);
    },
  });
}

export function useDeleteCurrentProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: currentProjectsApi.remove,
    onSuccess: (_, id) => {
      invalidateCurrentProjectListQueries(queryClient);
      if (id) {
        queryClient.removeQueries({ queryKey: queryKeys.currentProject(id) });
      }
    },
  });
}
