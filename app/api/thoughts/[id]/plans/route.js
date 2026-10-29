import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { linkThoughtPlan, unlinkThoughtPlan } from "@/lib/relationships";
import Thought from "@/models/Thought";
import Plan from "@/models/Plan";

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid thought id", 400);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }
  const body = parsed.body;

  const planId = body.planId;
  if (!isValidObjectId(planId)) {
    return jsonError("Invalid plan id", 400);
  }

  await connectDB();
  const [thought, plan] = await Promise.all([
    Thought.findById(id),
    Plan.findById(planId),
  ]);

  if (!thought) return jsonError("Thought not found", 404);
  if (!plan) return jsonError("Plan not found", 404);

  await linkThoughtPlan(thought._id, plan._id);
  return jsonOk({ ok: true });
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId");

  if (!isValidObjectId(id) || !isValidObjectId(planId)) {
    return jsonError("Invalid id", 400);
  }

  await connectDB();
  await unlinkThoughtPlan(id, planId);
  return jsonOk({ ok: true });
}
