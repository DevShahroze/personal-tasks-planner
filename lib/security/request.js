import { jsonError } from "../api-response.js";
import { MAX_JSON_BODY_BYTES } from "./constants.js";
import { isPlainJsonObject, safeAppPath } from "./pure.js";

export { safeAppPath };

export function assertPlainJsonObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, response: jsonError("Invalid JSON body", 400) };
  }

  if (!isPlainJsonObject(body)) {
    return { ok: false, response: jsonError("Invalid request payload", 400) };
  }

  return { ok: true };
}

export function getRequestBodySize(request) {
  const header = request.headers.get("content-length");
  if (!header) {
    return 0;
  }
  const size = Number.parseInt(header, 10);
  return Number.isFinite(size) ? size : 0;
}

export function rejectOversizedBody(request) {
  const size = getRequestBodySize(request);
  if (size > MAX_JSON_BODY_BYTES) {
    return jsonError("Request payload too large", 413);
  }
  return null;
}

export async function readJsonBody(request) {
  const tooLarge = rejectOversizedBody(request);
  if (tooLarge) {
    return { error: tooLarge };
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return { error: jsonError("Invalid JSON", 400) };
  }

  const plain = assertPlainJsonObject(body);
  if (!plain.ok) {
    return { error: plain.response };
  }

  return { body };
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "local";
}

export function assertMutationOrigin(request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const host = request.headers.get("host");
  const origin = request.headers.get("origin");

  if (origin && host) {
    try {
      if (new URL(origin).host === host) {
        return null;
      }
    } catch {
      return jsonError("Forbidden", 403);
    }
    return jsonError("Forbidden", 403);
  }

  const referer = request.headers.get("referer");
  if (referer && host) {
    try {
      if (new URL(referer).host === host) {
        return null;
      }
    } catch {
      return jsonError("Forbidden", 403);
    }
  }

  return jsonError("Forbidden", 403);
}
