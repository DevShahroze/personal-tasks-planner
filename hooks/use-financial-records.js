import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financialRecordsApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";

function invalidateFinancialQueries(queryClient, id) {
  queryClient.invalidateQueries({ queryKey: ["financial-records"] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: queryKeys.financialRecord(id) });
  }
  queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
}

export function useFinancialRecords(filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.financialRecords(filters),
    queryFn: () => financialRecordsApi.list(filters),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useFinancialRecord(id, todayYmd, enabled = true) {
  return useQuery({
    queryKey: queryKeys.financialRecord(id),
    queryFn: () => financialRecordsApi.get(id, todayYmd),
    enabled: Boolean(id) && enabled,
  });
}

export function useFinancialRecordMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: financialRecordsApi.create,
    onSuccess: () => invalidateFinancialQueries(queryClient),
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => financialRecordsApi.update(id, body),
    onSuccess: (data) => invalidateFinancialQueries(queryClient, data._id),
  });

  const remove = useMutation({
    mutationFn: financialRecordsApi.remove,
    onSuccess: () => invalidateFinancialQueries(queryClient),
  });

  const addPayment = useMutation({
    mutationFn: ({ id, body }) => financialRecordsApi.addPayment(id, body),
    onSuccess: (data) => invalidateFinancialQueries(queryClient, data._id),
  });

  return { create, update, remove, addPayment };
}
