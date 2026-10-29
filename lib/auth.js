import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getServerConfig } from "@/lib/env";
import { SESSION_COOKIE } from "./constants";

const secret = () => {
  const { authSecret } = getServerConfig();
  return new TextEncoder().encode(authSecret);
};

export async function createSessionToken() {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySessionToken(token) {
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.sub !== "owner") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function requireAuth() {
  const session = await getSessionFromCookies();
  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }
  return { session };
}

export async function verifyLoginCredentials(username, password) {
  const { appUsername, appPasswordHash } = getServerConfig();

  if (username !== appUsername) {
    return { ok: false, error: "Invalid credentials" };
  }

  const match = await bcrypt.compare(password, appPasswordHash);
  if (!match) {
    return { ok: false, error: "Invalid credentials" };
  }

  return { ok: true };
}

export function sessionCookieOptions(maxAgeSeconds) {
  const { isProduction, sessionMaxAgeSeconds } = getServerConfig();
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds ?? sessionMaxAgeSeconds,
  };
}
