async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || response.statusText || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.details = data.details;
    error.conflicts = data.conflicts;
    error.incompleteSubtasks = data.incompleteSubtasks;
    throw error;
  }
  return data;
}

function onClient() {
  return typeof window !== "undefined";
}

async function loadLogger() {
  if (!onClient()) {
    return null;
  }
  return import("@/lib/activity-logger");
}

export async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const logger = await loadLogger();
  const safePath = logger ? logger.sanitizeApiPath(path) : path;
  const requestId = logger?.recordApiStart(method, safePath);
  const started = onClient() ? performance.now() : 0;

  try {
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (logger && requestId) {
      logger.recordApiEnd(requestId, {
        status: response.status,
        outcome: response.ok ? "SUCCESS" : "HTTP_ERROR",
        durationMs: Math.round(performance.now() - started),
      });
    }

    return parseJson(response);
  } catch (error) {
    if (logger && requestId) {
      const cancelled = error?.name === "AbortError";
      logger.recordApiEnd(requestId, {
        status: "",
        outcome: cancelled ? "CANCELLED" : "NETWORK_ERROR",
        durationMs: Math.round(performance.now() - started),
      });
    }
    throw error;
  }
}

export const authApi = {
  login: (body) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),
  session: () => apiFetch("/api/auth/session"),
};

export const taskProcessorApi = {
  status: () => apiFetch("/api/task-processor/status"),
  step: () => apiFetch("/api/task-processor/step", { method: "POST" }),
};

export const dashboardApi = {
  summary: () => apiFetch("/api/dashboard/summary"),
  charts: () => apiFetch("/api/dashboard/charts"),
  listings: () => apiFetch("/api/dashboard/listings"),
};

export const tasksApi = {
  list: (params) => {
    const clean = Object.fromEntries(
      Object.entries(params || {}).filter(
        ([, value]) => value !== undefined && value !== "",
      ),
    );
    const qs = new URLSearchParams(clean).toString();
    return apiFetch(`/api/tasks?${qs}`);
  },
  get: (id) => apiFetch(`/api/tasks/${id}`),
  listSubtasks: (parentId) => apiFetch(`/api/tasks/${parentId}/subtasks`),
  createSubtask: (parentId, body) =>
    apiFetch(`/api/tasks/${parentId}/subtasks`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  create: (body) =>
    apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    apiFetch(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id) => apiFetch(`/api/tasks/${id}`, { method: "DELETE" }),
  linkThought: (id, thoughtId) =>
    apiFetch(`/api/tasks/${id}/thoughts`, {
      method: "POST",
      body: JSON.stringify({ thoughtId }),
    }),
  unlinkThought: (id, thoughtId) =>
    apiFetch(`/api/tasks/${id}/thoughts?thoughtId=${thoughtId}`, {
      method: "DELETE",
    }),
  linkPlan: (id, planId) =>
    apiFetch(`/api/tasks/${id}/plans`, {
      method: "POST",
      body: JSON.stringify({ planId }),
    }),
  unlinkPlan: (id, planId) =>
    apiFetch(`/api/tasks/${id}/plans?planId=${planId}`, { method: "DELETE" }),
  scheduleSlots: (id, body) =>
    apiFetch(`/api/tasks/${id}/schedule/slots`, {
      method: "POST",
      body: JSON.stringify(body || {}),
    }),
  calendar: ({ year, month, timeZone }) => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      timeZone: timeZone || "Asia/Karachi",
    });
    return apiFetch(`/api/tasks/calendar?${params.toString()}`);
  },
  listNotes: (taskId) => apiFetch(`/api/tasks/${taskId}/notes`),
  createNote: (taskId, body) =>
    apiFetch(`/api/tasks/${taskId}/notes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateNote: (taskId, noteId, body) =>
    apiFetch(`/api/tasks/${taskId}/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteNote: (taskId, noteId) =>
    apiFetch(`/api/tasks/${taskId}/notes/${noteId}`, { method: "DELETE" }),
};

export const financialRecordsApi = {
  list: (params) => {
    const clean = Object.fromEntries(
      Object.entries(params || {}).filter(
        ([, value]) => value !== undefined && value !== "",
      ),
    );
    const qs = new URLSearchParams(clean).toString();
    return apiFetch(`/api/financial-records?${qs}`);
  },
  get: (id, todayYmd) => {
    const qs = todayYmd ? `?todayYmd=${encodeURIComponent(todayYmd)}` : "";
    return apiFetch(`/api/financial-records/${id}${qs}`);
  },
  create: (body) =>
    apiFetch("/api/financial-records", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    apiFetch(`/api/financial-records/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id) => apiFetch(`/api/financial-records/${id}`, { method: "DELETE" }),
  addPayment: (id, body) =>
    apiFetch(`/api/financial-records/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

function listApi(path, params) {
  const clean = Object.fromEntries(
    Object.entries(params || {}).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
  const qs = new URLSearchParams(clean).toString();
  return apiFetch(`${path}?${qs}`);
}

export const planningApi = {
  installments: {
    list: (params) => listApi("/api/installment-commitments", params),
    get: (id) => apiFetch(`/api/installment-commitments/${id}`),
    create: (body) =>
      apiFetch("/api/installment-commitments", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id, body) =>
      apiFetch(`/api/installment-commitments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id) =>
      apiFetch(`/api/installment-commitments/${id}`, { method: "DELETE" }),
    addPayment: (id, body, todayYmd) =>
      apiFetch(
        `/api/installment-commitments/${id}/payments${todayYmd ? `?todayYmd=${encodeURIComponent(todayYmd)}` : ""}`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  },
  kameti: {
    list: (params) => listApi("/api/kameti-plans", params),
    get: (id) => apiFetch(`/api/kameti-plans/${id}`),
    create: (body) =>
      apiFetch("/api/kameti-plans", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) =>
      apiFetch(`/api/kameti-plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id) => apiFetch(`/api/kameti-plans/${id}`, { method: "DELETE" }),
    addContribution: (id, body, todayYmd) =>
      apiFetch(
        `/api/kameti-plans/${id}/contributions${todayYmd ? `?todayYmd=${encodeURIComponent(todayYmd)}` : ""}`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    recordPayout: (id, body, todayYmd) =>
      apiFetch(
        `/api/kameti-plans/${id}/payout${todayYmd ? `?todayYmd=${encodeURIComponent(todayYmd)}` : ""}`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  },
  subscriptions: {
    list: (params) => listApi("/api/subscriptions", params),
    get: (id) => apiFetch(`/api/subscriptions/${id}`),
    create: (body) =>
      apiFetch("/api/subscriptions", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) =>
      apiFetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id) => apiFetch(`/api/subscriptions/${id}`, { method: "DELETE" }),
    addPayment: (id, body) =>
      apiFetch(`/api/subscriptions/${id}/payments`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    removePayment: (id, paymentId) =>
      apiFetch(`/api/subscriptions/${id}/payments/${paymentId}`, {
        method: "DELETE",
      }),
  },
  insurance: {
    list: (params) => listApi("/api/insurance-policies", params),
    get: (id) => apiFetch(`/api/insurance-policies/${id}`),
    create: (body) =>
      apiFetch("/api/insurance-policies", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id, body) =>
      apiFetch(`/api/insurance-policies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id) => apiFetch(`/api/insurance-policies/${id}`, { method: "DELETE" }),
    addPayment: (id, body, todayYmd) =>
      apiFetch(
        `/api/insurance-policies/${id}/payments${todayYmd ? `?todayYmd=${encodeURIComponent(todayYmd)}` : ""}`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    removePayment: (id, paymentId) =>
      apiFetch(`/api/insurance-policies/${id}/payments/${paymentId}`, {
        method: "DELETE",
      }),
  },
  applications: {
    list: (params) => listApi("/api/university-applications", params),
    get: (id) => apiFetch(`/api/university-applications/${id}`),
    create: (body) =>
      apiFetch("/api/university-applications", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id, body) =>
      apiFetch(`/api/university-applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id) =>
      apiFetch(`/api/university-applications/${id}`, { method: "DELETE" }),
  },
  tours: {
    list: (params) => listApi("/api/tours", params),
    get: (id) => apiFetch(`/api/tours/${id}`),
    create: (body) =>
      apiFetch("/api/tours", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) =>
      apiFetch(`/api/tours/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id) => apiFetch(`/api/tours/${id}`, { method: "DELETE" }),
    addExpense: (id, body) =>
      apiFetch(`/api/tours/${id}/expenses`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};

export const availabilityTemplatesApi = {
  list: () => apiFetch("/api/availability-templates"),
  create: (body) =>
    apiFetch("/api/availability-templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id, body) =>
    apiFetch(`/api/availability-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id) => apiFetch(`/api/availability-templates/${id}`, { method: "DELETE" }),
};

export const thoughtsApi = {
  list: (params) => {
    const clean = Object.fromEntries(
      Object.entries(params || {}).filter(
        ([, value]) => value !== undefined && value !== "",
      ),
    );
    const qs = new URLSearchParams(clean).toString();
    return apiFetch(`/api/thoughts?${qs}`);
  },
  get: (id) => apiFetch(`/api/thoughts/${id}`),
  create: (body) =>
    apiFetch("/api/thoughts", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    apiFetch(`/api/thoughts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id) => apiFetch(`/api/thoughts/${id}`, { method: "DELETE" }),
  linkTask: (id, taskId) =>
    apiFetch(`/api/thoughts/${id}/tasks`, {
      method: "POST",
      body: JSON.stringify({ taskId }),
    }),
  unlinkTask: (id, taskId) =>
    apiFetch(`/api/thoughts/${id}/tasks?taskId=${taskId}`, {
      method: "DELETE",
    }),
  linkPlan: (id, planId) =>
    apiFetch(`/api/thoughts/${id}/plans`, {
      method: "POST",
      body: JSON.stringify({ planId }),
    }),
  unlinkPlan: (id, planId) =>
    apiFetch(`/api/thoughts/${id}/plans?planId=${planId}`, {
      method: "DELETE",
    }),
};

export const plansApi = {
  list: (params) => {
    const clean = Object.fromEntries(
      Object.entries(params || {}).filter(
        ([, value]) => value !== undefined && value !== "",
      ),
    );
    const qs = new URLSearchParams(clean).toString();
    return apiFetch(`/api/plans?${qs}`);
  },
  get: (id) => apiFetch(`/api/plans/${id}`),
  create: (body) =>
    apiFetch("/api/plans", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    apiFetch(`/api/plans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id) => apiFetch(`/api/plans/${id}`, { method: "DELETE" }),
  linkTask: (id, taskId) =>
    apiFetch(`/api/plans/${id}/tasks`, {
      method: "POST",
      body: JSON.stringify({ taskId }),
    }),
  unlinkTask: (id, taskId) =>
    apiFetch(`/api/plans/${id}/tasks?taskId=${taskId}`, {
      method: "DELETE",
    }),
  linkThought: (id, thoughtId) =>
    apiFetch(`/api/plans/${id}/thoughts`, {
      method: "POST",
      body: JSON.stringify({ thoughtId }),
    }),
  unlinkThought: (id, thoughtId) =>
    apiFetch(`/api/plans/${id}/thoughts?thoughtId=${thoughtId}`, {
      method: "DELETE",
    }),
};

export const categoriesApi = {
  list: () => apiFetch("/api/categories"),
  create: (body) =>
    apiFetch("/api/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id, body) =>
    apiFetch(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id) => apiFetch(`/api/categories/${id}`, { method: "DELETE" }),
};

export const searchApi = {
  options: (q) => apiFetch(`/api/search/options?q=${encodeURIComponent(q || "")}`),
};
