import { connectDB } from "@/lib/mongodb.js";
import { requireAuth } from "@/lib/auth";
import { jsonOk } from "@/lib/api-response";
import { runProcessorStep } from "@/lib/task-processor/run.js";
import { NextResponse } from "next/server";

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let executionType = "automatic";
  try {
    const body = await request.json();
    if (body?.executionType === "manual") {
      executionType = "manual";
    }
  } catch {
    // empty body is fine for automatic runs
  }

  await connectDB();
  const result = await runProcessorStep({ executionType });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, status: result.status },
      { status: 409 },
    );
  }
  return jsonOk(result);
}
