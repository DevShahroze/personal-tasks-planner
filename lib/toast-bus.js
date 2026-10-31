const listeners = new Set();

export function subscribeToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishToast(toast) {
  const item = {
    id: toast.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    variant: toast.variant || "error",
    message: toast.message || "Something went wrong",
    description: toast.description || "",
  };
  for (const listener of listeners) {
    listener(item);
  }
  return item.id;
}

export function toastApiError(error, source) {
  if (typeof window === "undefined") {
    return;
  }
  if (Array.isArray(error?.incompleteSubtasks) && error.incompleteSubtasks.length) {
    publishToast({
      variant: "error",
      message: "Complete subtasks before marking this task completed",
      description: error.incompleteSubtasks.map((item) => item.title).join(", "),
    });
    return;
  }
  if (Array.isArray(error?.conflicts) && error.conflicts.length) {
    publishToast({
      variant: "error",
      message: "Scheduling conflict",
      description: "Choose another time or turn off conflict avoidance for this task.",
    });
    return;
  }
  const status = error?.status ? ` (${error.status})` : "";
  const message =
    Array.isArray(error?.details) && error.details.length
      ? error.details.join(", ")
      : error?.message || "Request failed";
  publishToast({
    variant: "error",
    message: `${message}${status}`,
    description: source ? String(source) : "",
  });
}

export function toastError(message, description = "") {
  if (typeof window === "undefined") {
    return;
  }
  publishToast({
    variant: "error",
    message: message || "Something went wrong",
    description: description ? String(description) : "",
  });
}

export function toastSuccess(message) {
  publishToast({ variant: "success", message });
}
