import { useQuery } from "@tanstack/react-query";
import { availabilityTemplatesApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { catalogQueryOptions } from "@/lib/query-cache";

export function useAvailabilityTemplates() {
  return useQuery({
    queryKey: queryKeys.availabilityTemplates,
    queryFn: () => availabilityTemplatesApi.list(),
    ...catalogQueryOptions(),
  });
}
