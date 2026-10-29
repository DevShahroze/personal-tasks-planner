import { QueryCache, MutationCache, QueryClient } from "@tanstack/react-query";
import { toastApiError } from "./toast-bus.js";
import { STALE_MS, GC_MS } from "./query-cache.js";

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
        staleTime: STALE_MS.list,
        gcTime: GC_MS.default,
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
  taskProcessor: {
    status: ["task-processor", "status"],
  },
  planning: {
    installments: {
      list: (params) => ["planning", "installments", "list", params ?? {}],
      detail: (id) => ["planning", "installments", id],
    },
    kameti: {
      list: (params) => ["planning", "kameti", "list", params ?? {}],
      detail: (id) => ["planning", "kameti", id],
    },
    subscriptions: {
      list: (params) => ["planning", "subscriptions", "list", params ?? {}],
      detail: (id) => ["planning", "subscriptions", id],
    },
    applications: {
      list: (params) => ["planning", "applications", "list", params ?? {}],
      detail: (id) => ["planning", "applications", id],
    },
    tours: {
      list: (params) => ["planning", "tours", "list", params ?? {}],
      detail: (id) => ["planning", "tours", id],
    },
    insurance: {
      list: (params) => ["planning", "insurance", "list", params ?? {}],
      detail: (id) => ["planning", "insurance", id],
    },
  },
};
