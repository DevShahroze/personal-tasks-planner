import { useQuery } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { detailQueryOptions, listQueryOptions } from "@/lib/query-cache";

const defaultListParams = { limit: 50 };

export function useInstallmentCommitments(params = defaultListParams) {
  return useQuery({
    queryKey: queryKeys.planning.installments.list(params),
    queryFn: () => planningApi.installments.list(params),
    ...listQueryOptions(),
  });
}

export function useInstallmentCommitment(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.planning.installments.detail(id),
    queryFn: () => planningApi.installments.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}

export function useKametiPlans(params = defaultListParams) {
  return useQuery({
    queryKey: queryKeys.planning.kameti.list(params),
    queryFn: () => planningApi.kameti.list(params),
    ...listQueryOptions(),
  });
}

export function useKametiPlan(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.planning.kameti.detail(id),
    queryFn: () => planningApi.kameti.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}

export function useSubscriptions(params = defaultListParams) {
  return useQuery({
    queryKey: queryKeys.planning.subscriptions.list(params),
    queryFn: () => planningApi.subscriptions.list(params),
    ...listQueryOptions(),
  });
}

export function useSubscription(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.planning.subscriptions.detail(id),
    queryFn: () => planningApi.subscriptions.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}

export function useUniversityApplications(params = defaultListParams) {
  return useQuery({
    queryKey: queryKeys.planning.applications.list(params),
    queryFn: () => planningApi.applications.list(params),
    ...listQueryOptions(),
  });
}

export function useUniversityApplication(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.planning.applications.detail(id),
    queryFn: () => planningApi.applications.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}

export function useTours(params = defaultListParams) {
  return useQuery({
    queryKey: queryKeys.planning.tours.list(params),
    queryFn: () => planningApi.tours.list(params),
    ...listQueryOptions(),
  });
}

export function useTour(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.planning.tours.detail(id),
    queryFn: () => planningApi.tours.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}

export function useInsurancePolicies(params = defaultListParams) {
  return useQuery({
    queryKey: queryKeys.planning.insurance.list(params),
    queryFn: () => planningApi.insurance.list(params),
    ...listQueryOptions(),
  });
}

export function useInsurancePolicy(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.planning.insurance.detail(id),
    queryFn: () => planningApi.insurance.get(id),
    enabled: Boolean(id) && enabled,
    ...detailQueryOptions(),
  });
}
