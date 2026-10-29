import { useQuery } from "@tanstack/react-query";
import { availabilityTemplatesApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";

export function useAvailabilityTemplates() {
  return useQuery({
    queryKey: queryKeys.availabilityTemplates,
    queryFn: () => availabilityTemplatesApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}
