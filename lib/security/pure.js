export function isValidObjectId(id) {
  return /^[a-fA-F0-9]{24}$/.test(String(id));
}

export function safeAppPath(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }
  if (path.includes("\\") || path.includes("://")) {
    return "/dashboard";
  }
  return path;
}

function hasOperatorKey(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasOperatorKey(item));
  }
  return Object.keys(value).some((key) => key.startsWith("$"));
}

export function isPlainJsonObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }
  return !hasOperatorKey(body);
}
