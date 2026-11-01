import { jsonError, jsonOk } from "@/lib/api-response";
import { readSessionPayload } from "@/lib/auth";

export async function GET() {
  const payload = await readSessionPayload();
  if (!payload) {
    return jsonError("Unauthorized", 401);
  }

  const exp = typeof payload.exp === "number" ? payload.exp : null;
  const expiresAt = exp ? new Date(exp * 1000).toISOString() : null;

  return jsonOk({
    authenticated: true,
    expiresAt,
  });
}
