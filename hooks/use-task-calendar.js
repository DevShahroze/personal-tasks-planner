import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { calendarQueryOptions } from "@/lib/query-cache";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants";

export function useTaskCalendar(
  year,
  month,
  timeZone = DEFAULT_SCHEDULE_TIMEZONE,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.tasksCalendar(year, month, timeZone),
    queryFn: () => tasksApi.calendar({ year, month, timeZone }),
    enabled: enabled && Boolean(year) && Boolean(month),
    ...calendarQueryOptions(),
  });
}
