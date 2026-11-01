"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import { useTaskCalendar } from "@/hooks/use-task-calendar";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants";

const TaskCalendarContext = createContext(null);

export function TaskCalendarProvider({ children }) {
  const clientToday = useClientTodayYmd();
  const [viewOverride, setViewOverride] = useState(null);
  const [selectedYmd, setSelectedYmd] = useState("");

  const activeView =
    viewOverride ||
    (clientToday ? { year: clientToday.year, month: clientToday.month } : null);

  const timeZone = DEFAULT_SCHEDULE_TIMEZONE;
  const calendarQuery = useTaskCalendar(
    activeView?.year,
    activeView?.month,
    timeZone,
    Boolean(clientToday && activeView),
  );

  const todayYmd = clientToday?.ymd || "";
  const selected = selectedYmd || todayYmd;

  const dayEntries = useMemo(
    () => calendarQuery.data?.days || {},
    [calendarQuery.data?.days],
  );

  const value = useMemo(
    () => ({
      clientToday,
      activeView,
      setView: setViewOverride,
      selectedYmd: selected,
      setSelectedYmd,
      todayYmd,
      timeZone,
      calendarQuery,
      dayEntries,
      isLoading: calendarQuery.isLoading,
      isFetching: calendarQuery.isFetching,
    }),
    [clientToday, activeView, selected, todayYmd, timeZone, calendarQuery, dayEntries],
  );

  return (
    <TaskCalendarContext.Provider value={value}>
      {children}
    </TaskCalendarContext.Provider>
  );
}

export function useTaskCalendarContext() {
  const context = useContext(TaskCalendarContext);
  if (!context) {
    throw new Error("useTaskCalendarContext must be used within TaskCalendarProvider");
  }
  return context;
}
