import { toastError } from "@/lib/toast-bus";
import { formatValidationErrors } from "@/lib/planning/money-fields";

export function apiErrorMessage(error) {
  if (Array.isArray(error?.details) && error.details.length) {
    return error.details.join(" ");
  }
  return error?.message || "Request failed";
}

export function toastValidationErrors(errors) {
  const message = formatValidationErrors(errors);
  if (message) {
    toastError(message);
  }
}

export function toastFormApiError(error) {
  toastError(apiErrorMessage(error));
}

export function toastFormError(message) {
  if (message) {
    toastError(message);
  }
}
