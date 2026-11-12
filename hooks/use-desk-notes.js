import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deskNotesApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { GC_MS } from "@/lib/query-cache";

const deskNotesQueryOptions = {
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: GC_MS.default,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

export function useDeskNotesList(enabled = true) {
  return useQuery({
    queryKey: queryKeys.deskNotes.list,
    queryFn: () => deskNotesApi.list(),
    enabled,
    ...deskNotesQueryOptions,
  });
}

export function useDeskNote(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.deskNote(id),
    queryFn: () => deskNotesApi.get(id),
    enabled: Boolean(id) && enabled,
    ...deskNotesQueryOptions,
  });
}

function upsertListItem(queryClient, note) {
  queryClient.setQueryData(queryKeys.deskNotes.list, (prev) => {
    const items = [...(prev?.items || [])];
    const index = items.findIndex((item) => item._id === note._id);
    const summary = {
      _id: note._id,
      title: note.title,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
    };
    if (index === -1) {
      items.unshift(summary);
    } else {
      items[index] = { ...items[index], ...summary };
    }
    items.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return { ...prev, items };
  });
}

export function useDeskNoteMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (body) => deskNotesApi.create(body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.deskNote(data._id), data);
      upsertListItem(queryClient, data);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => deskNotesApi.update(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.deskNote(data._id), data);
      upsertListItem(queryClient, data);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => deskNotesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.deskNote(id) });
      queryClient.setQueryData(queryKeys.deskNotes.list, (prev) => {
        if (!prev?.items) {
          return prev;
        }
        return {
          ...prev,
          items: prev.items.filter((item) => item._id !== id),
        };
      });
    },
  });

  return { create, update, remove };
}
