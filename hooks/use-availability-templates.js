import { useAppAvailabilityTemplates } from "@/contexts/app-data-context";

export function useAvailabilityTemplates() {
  const availabilityTemplates = useAppAvailabilityTemplates();
  return {
    data: { items: availabilityTemplates.items },
    isLoading: availabilityTemplates.isLoading,
    isError: availabilityTemplates.isError,
    error: availabilityTemplates.error,
    refetch: availabilityTemplates.refetch,
  };
}
