import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { requireAuth, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
