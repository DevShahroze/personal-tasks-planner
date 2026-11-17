import { useQueries } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { listQueryOptions } from "@/lib/query-cache";
import { PLANNING_HUB_SECTIONS } from "@/lib/planning/hub-list";

const defaultListParams = { limit: 50 };

const HUB_FETCHERS = {
  installments: (params) => planningApi.installments.list(params),
  kameti: (params) => planningApi.kameti.list(params),
  subscriptions: (params) => planningApi.subscriptions.list(params),
  insurance: (params) => planningApi.insurance.list(params),
  applications: (params) => planningApi.applications.list(params),
  tours: (params) => planningApi.tours.list(params),
};

const HUB_QUERY_KEYS = {
  installments: (params) => queryKeys.planning.installments.list(params),
  kameti: (params) => queryKeys.planning.kameti.list(params),
  subscriptions: (params) => queryKeys.planning.subscriptions.list(params),
  insurance: (params) => queryKeys.planning.insurance.list(params),
  applications: (params) => queryKeys.planning.applications.list(params),
  tours: (params) => queryKeys.planning.tours.list(params),
};

/**
 * @param {"categorized" | "merged"} viewMode — included in query keys so switching refetches.
 */
export function usePlanningHubLists(viewMode) {
  const params = defaultListParams;
  const queries = useQueries({
    queries: PLANNING_HUB_SECTIONS.map((section) => ({
      queryKey: [...HUB_QUERY_KEYS[section.key](params), "hub", viewMode],
      queryFn: () => HUB_FETCHERS[section.key](params),
      ...listQueryOptions(),
    })),
  });

  const itemsByKey = {};
  PLANNING_HUB_SECTIONS.forEach((section, index) => {
    itemsByKey[section.key] = queries[index].data?.items || [];
  });

  return {
    queries,
    itemsByKey,
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
  };
}
