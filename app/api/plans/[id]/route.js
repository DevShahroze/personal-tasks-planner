import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { validatePlanUpdate } from "@/lib/validations";
import { removePlanReferences } from "@/lib/relationships";
import Plan from "@/models/Plan";
import Task from "@/models/Task";

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid plan id", 400);
  }

  await connectDB();
  const plan = await Plan.findById(id)
    .populate("linkedTasks", "title status priority")
    .populate("linkedThoughts", "title")
    .lean();

  if (!plan) {
    return jsonError("Plan not found", 404);
  }

  const linkedTasks = plan.linkedTasks || [];
  const completed = linkedTasks.filter((t) => t.status === "Completed").length;
  const progress =
    linkedTasks.length === 0 ? 0 : Math.round((completed / linkedTasks.length) * 100);

  return jsonOk({ ...plan, progress });
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid plan id", 400);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }
  const body = parsed.body;

  const { errors, patch } = validatePlanUpdate(body);
  if (errors.length) {
    return jsonError("Validation failed", 400, errors);
  }

  await connectDB();
  const plan = await Plan.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  })
    .populate("linkedTasks", "title status priority")
    .populate("linkedThoughts", "title")
    .lean();

  if (!plan) {
    return jsonError("Plan not found", 404);
  }

  const linkedTasks = plan.linkedTasks || [];
  const completed = linkedTasks.filter((t) => t.status === "Completed").length;
  const progress =
    linkedTasks.length === 0 ? 0 : Math.round((completed / linkedTasks.length) * 100);

  return jsonOk({ ...plan, progress });
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid plan id", 400);
  }

  await connectDB();
  const plan = await Plan.findById(id);
  if (!plan) {
    return jsonError("Plan not found", 404);
  }

  await removePlanReferences(id);
  await Plan.findByIdAndDelete(id);

  return jsonOk({ ok: true });
}
