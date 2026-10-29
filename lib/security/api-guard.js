import { jsonError } from "@/lib/api-response";
import {
  assertMutationOrigin,
  getClientIp,
  readJsonBody,
  rejectOversizedBody,
} from "@/lib/security/request";
import { consumeRateLimit, resolveRateLimitProfile } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";

export function enforceRateLimit(request) {
  const { pathname } = new URL(request.url);
  const profile = resolveRateLimitProfile(pathname, request.method.toUpperCase());
  if (!profile) {
    return null;
  }

  const result = consumeRateLimit(getClientIp(request), profile);
  if (result.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter) },
      },
    );
  }

  return null;
}

export function enforceMutationGuards(request) {
  const method = request.method.toUpperCase();
  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    const originError = assertMutationOrigin(request);
    if (originError) {
      return originError;
    }
    const sizeError = rejectOversizedBody(request);
    if (sizeError) {
      return sizeError;
    }
  }

  return null;
}

export async function parseSecureJson(request) {
  const guards = enforceMutationGuards(request);
  if (guards) {
    return { error: guards };
  }

  if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method.toUpperCase())) {
    return readJsonBody(request);
  }

  return { body: null };
}

export async function secureApiHandler(request, handler, options = {}) {
  const limited = enforceRateLimit(request);
  if (limited) {
    return limited;
  }

  if (options.mutate !== false) {
    const mutationGuard = enforceMutationGuards(request);
    if (mutationGuard) {
      return mutationGuard;
    }
  }

  try {
    return await handler(request);
  } catch {
    return jsonError("Internal server error", 500);
  }
}
