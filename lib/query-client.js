import { QueryCache, MutationCache, QueryClient } from "@tanstack/react-query";
import { toastApiError } from "./toast-bus.js";

function queryErrorLabel(query) {
  const key = query.queryKey;
  if (!Array.isArray(key) || !key.length) {
    return "Request";
  }
  return key.join(" · ");
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        toastApiError(error, queryErrorLabel(query));
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        toastApiError(error, "Action failed");
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserClient;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserClient) {
    browserClient = makeQueryClient();
  }
  return browserClient;
}

export const queryKeys = {
  dashboard: {
    summary: ["dashboard", "summary"],
    charts: ["dashboard", "charts"],
    listings: ["dashboard", "listings"],
  },
  tasks: (filters) => ["tasks", filters],
  tasksCalendar: (year, month, timeZone) => [
    "tasks",
    "calendar",
    year,
    month,
    timeZone,
  ],
  task: (id) => ["task", id],
  subtasks: (parentId) => ["task", parentId, "subtasks"],
  thoughts: (filters) => ["thoughts", filters],
  thought: (id) => ["thought", id],
  plans: (filters) => ["plans", filters],
  plan: (id) => ["plan", id],
  categories: ["categories"],
  availabilityTemplates: ["availability-templates"],
  searchOptions: (q) => ["search", "options", q],
  taskNotes: (taskId) => ["task", taskId, "notes"],
  financialRecords: (filters) => ["financial-records", filters],
  financialRecord: (id) => ["financial-record", id],
};
