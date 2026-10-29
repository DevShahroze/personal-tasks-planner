/** Shared TanStack Query cache policy for client API data. */

export const STALE_MS = {
  /** Rarely changes (categories, availability templates). */
  catalog: 5 * 60 * 1000,
  /** List pages (tasks, planning lists, financial lists). */
  list: 2 * 60 * 1000,
  /** Detail records. */
  detail: 60 * 1000,
  /** Dashboard aggregates. */
  dashboard: 90 * 1000,
  /** Calendar month grid. */
  calendar: 30 * 1000,
  /** Typeahead / search. */
  search: 15 * 1000,
  /** Task processor status (navbar + rollover). */
  taskProcessor: 60 * 1000,
};

export const GC_MS = {
  default: 10 * 60 * 1000,
  catalog: 30 * 60 * 1000,
};

const stableList = {
  staleTime: STALE_MS.list,
  gcTime: GC_MS.default,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

const stableCatalog = {
  staleTime: STALE_MS.catalog,
  gcTime: GC_MS.catalog,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

const stableDetail = {
  staleTime: STALE_MS.detail,
  gcTime: GC_MS.default,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

export function listQueryOptions(overrides = {}) {
  return { ...stableList, ...overrides };
}

export function catalogQueryOptions(overrides = {}) {
  return { ...stableCatalog, ...overrides };
}

export function detailQueryOptions(overrides = {}) {
  return { ...stableDetail, ...overrides };
}

export function dashboardQueryOptions(overrides = {}) {
  return listQueryOptions({
    staleTime: STALE_MS.dashboard,
    ...overrides,
  });
}

export function calendarQueryOptions(overrides = {}) {
  return listQueryOptions({
    staleTime: STALE_MS.calendar,
    ...overrides,
  });
}

export function searchQueryOptions(overrides = {}) {
  return {
    staleTime: STALE_MS.search,
    gcTime: GC_MS.default,
    refetchOnWindowFocus: false,
    ...overrides,
  };
}

export function taskProcessorStatusQueryOptions(overrides = {}) {
  return {
    staleTime: STALE_MS.taskProcessor,
    gcTime: GC_MS.default,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    ...overrides,
  };
}
