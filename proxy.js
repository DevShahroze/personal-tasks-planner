import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getRuntimeConfig } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/constants";
import {
  assertMutationOrigin,
  getClientIp,
  rejectOversizedBody,
} from "@/lib/security/request";
import { consumeRateLimit, resolveRateLimitProfile } from "@/lib/security/rate-limit";

const publicPaths = ["/login"];

function buildContentSecurityPolicy() {
  const { isProduction } = getRuntimeConfig();
  const scriptSrc = isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  const connectSrc = isProduction
    ? "connect-src 'self'"
    : "connect-src 'self' ws: wss:";
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    connectSrc,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function applySecurityHeaders(response) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  if (getRuntimeConfig().isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains",
    );
  }
  return response;
}

function secure(response) {
  return applySecurityHeaders(response);
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const profile = resolveRateLimitProfile(pathname, request.method.toUpperCase());
    if (profile) {
      const limited = consumeRateLimit(getClientIp(request), profile);
      if (limited.limited) {
        return secure(
          NextResponse.json(
            { error: "Too many requests. Please try again later." },
            {
              status: 429,
              headers: { "Retry-After": String(limited.retryAfter) },
            },
          ),
        );
      }
    }

    if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method.toUpperCase())) {
      const originError = assertMutationOrigin(request);
      if (originError) {
        return secure(originError);
      }
      const sizeError = rejectOversizedBody(request);
      if (sizeError) {
        return secure(sizeError);
      }
    }
  }

  const isApi = pathname.startsWith("/api");
  const isAuthApi =
    pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout");

  if (isApi && isAuthApi) {
    return secure(NextResponse.next());
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const isAuthenticated = Boolean(session);

  if (isApi && !isAuthenticated) {
    return secure(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  if (publicPaths.includes(pathname)) {
    if (isAuthenticated) {
      return secure(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
    return secure(NextResponse.next());
  }

  if (!isAuthenticated) {
    if (isApi) {
      return secure(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const loginUrl = new URL("/login", request.url);
    const safeFrom =
      pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/dashboard";
    loginUrl.searchParams.set("from", safeFrom);
    return secure(NextResponse.redirect(loginUrl));
  }

  return secure(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
