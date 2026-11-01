import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importantInfoApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { detailQueryOptions, listQueryOptions } from "@/lib/query-cache";

export function useImportantInfoList(filters) {
  return useQuery({
    queryKey: queryKeys.importantInfo(filters),
    queryFn: () => importantInfoApi.list(filters),
    placeholderData: (prev) => prev,
    ...listQueryOptions(),
  });
}

export function useImportantInfoRecord(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.importantInfoRecord(id),
    queryFn: () => importantInfoApi.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}

function invalidateImportantInfoQueries(queryClient, id) {
  queryClient.invalidateQueries({ queryKey: ["important-info"] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: queryKeys.importantInfoRecord(id) });
  }
}

export function useCreateImportantInfoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importantInfoApi.create,
    onSuccess: () => invalidateImportantInfoQueries(queryClient),
  });
}

export function useUpdateImportantInfoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => importantInfoApi.update(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.importantInfoRecord(data._id), data);
      invalidateImportantInfoQueries(queryClient, data._id);
    },
  });
}

export function useDeleteImportantInfoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importantInfoApi.remove,
    onSuccess: () => invalidateImportantInfoQueries(queryClient),
  });
}
