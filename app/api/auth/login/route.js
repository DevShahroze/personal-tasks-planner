import { NextResponse } from "next/server";
import {
  createSessionToken,
  verifyLoginCredentials,
  sessionCookieOptions,
} from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { jsonError } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";

export async function POST(request) {
  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.body;
  const username = body.username?.trim();
  const password = body.password;

  if (!username || !password || typeof password !== "string") {
    return jsonError("Username and password are required", 400);
  }

  if (username.length > 200 || password.length > 500) {
    return jsonError("Invalid credentials", 401);
  }

  const result = await verifyLoginCredentials(username, password);
  if (!result.ok) {
    return jsonError("Invalid credentials", 401);
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
