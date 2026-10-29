import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: dashboardApi.summary,
  });
}

export function useDashboardCharts() {
  return useQuery({
    queryKey: queryKeys.dashboard.charts,
    queryFn: dashboardApi.charts,
  });
}

export function useDashboardListings() {
  return useQuery({
    queryKey: queryKeys.dashboard.listings,
    queryFn: dashboardApi.listings,
  });
}
