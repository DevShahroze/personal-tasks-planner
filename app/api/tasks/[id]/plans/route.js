import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { linkTaskPlan, unlinkTaskPlan } from "@/lib/relationships";
import Task from "@/models/Task";
import Plan from "@/models/Plan";

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid task id", 400);
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
  const [task, plan] = await Promise.all([Task.findById(id), Plan.findById(planId)]);

  if (!task) {
    return jsonError("Task not found", 404);
  }
  if (!plan) {
    return jsonError("Plan not found", 404);
  }

  await linkTaskPlan(task._id, plan._id);
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
  await unlinkTaskPlan(id, planId);
  return jsonOk({ ok: true });
}
