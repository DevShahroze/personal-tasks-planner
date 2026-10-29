import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";

export function useTaskNotes(taskId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.taskNotes(taskId),
    queryFn: () => tasksApi.listNotes(taskId),
    enabled: Boolean(taskId) && enabled,
  });
}

export function useTaskNoteMutations(taskId) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.taskNotes(taskId) });
  };

  const createNote = useMutation({
    mutationFn: (body) => tasksApi.createNote(taskId, body),
    onSuccess: invalidate,
  });

  const updateNote = useMutation({
    mutationFn: ({ noteId, body }) => tasksApi.updateNote(taskId, noteId, body),
    onSuccess: invalidate,
  });

  const deleteNote = useMutation({
    mutationFn: (noteId) => tasksApi.deleteNote(taskId, noteId),
    onSuccess: invalidate,
  });

  return { createNote, updateNote, deleteNote };
}
