import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { validateThoughtUpdate } from "@/lib/validations";
import { removeThoughtReferences } from "@/lib/relationships";
import Thought from "@/models/Thought";

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid thought id", 400);
  }

  await connectDB();
  const thought = await Thought.findById(id)
    .populate("linkedTasks", "title status priority")
    .populate("linkedPlans", "title status")
    .lean();

  if (!thought) {
    return jsonError("Thought not found", 404);
  }

  return jsonOk(thought);
}

export async function PATCH(request, { params }) {
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

  const { errors, patch } = validateThoughtUpdate(body);
  if (errors.length) {
    return jsonError("Validation failed", 400, errors);
  }

  await connectDB();
  const thought = await Thought.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  })
    .populate("linkedTasks", "title status priority")
    .populate("linkedPlans", "title status")
    .lean();

  if (!thought) {
    return jsonError("Thought not found", 404);
  }

  return jsonOk(thought);
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid thought id", 400);
  }

  await connectDB();
  const thought = await Thought.findById(id);
  if (!thought) {
    return jsonError("Thought not found", 404);
  }

  await removeThoughtReferences(id);
  await Thought.findByIdAndDelete(id);

  return jsonOk({ ok: true });
}
