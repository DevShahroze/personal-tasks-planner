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
  const message = error?.message || "Request failed";
  const status = error?.status ? ` (${error.status})` : "";
  publishToast({
    variant: "error",
    message: `${message}${status}`,
    description: source ? String(source) : "",
  });
}

export function toastSuccess(message) {
  publishToast({ variant: "success", message });
}
