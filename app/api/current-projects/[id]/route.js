import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { validateCurrentProjectUpdate } from "@/lib/current-projects/validate";
import { canAddMilestone } from "@/lib/current-projects/milestones";
import CurrentProject from "@/models/CurrentProject";

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid id", 400);
  }

  await connectDB();
  const record = await CurrentProject.findById(id).lean();
  if (!record) {
    return jsonError("Project not found", 404);
  }

  return jsonOk(record);
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid id", 400);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const validated = validateCurrentProjectUpdate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const doc = await CurrentProject.findById(id);
  if (!doc) {
    return jsonError("Project not found", 404);
  }

  if (validated.addMilestone) {
    if (!canAddMilestone(doc.milestones)) {
      return jsonError(
        "Mark the current milestone achieved before adding another",
        422,
      );
    }
    doc.milestones.push(validated.addMilestone);
  }

  if (validated.achieveMilestone) {
    const { milestoneId, achievedAt } = validated.achieveMilestone;
    if (!isValidObjectId(milestoneId)) {
      return jsonError("Invalid milestone id", 400);
    }
    const milestone = doc.milestones.id(milestoneId);
    if (!milestone) {
      return jsonError("Milestone not found", 404);
    }
    if (milestone.achievedAt) {
      return jsonError("Milestone is already achieved", 422);
    }
    const openIndex = doc.milestones.findIndex((item) => !item.achievedAt);
    const targetIndex = doc.milestones.findIndex(
      (item) => String(item._id) === milestoneId,
    );
    if (openIndex !== targetIndex) {
      return jsonError("Only the active milestone can be marked achieved", 422);
    }
    milestone.achievedAt = achievedAt;
  }

  if (validated.updateMilestone) {
    const { milestoneId, text, addedAt } = validated.updateMilestone;
    if (!isValidObjectId(milestoneId)) {
      return jsonError("Invalid milestone id", 400);
    }
    const milestone = doc.milestones.id(milestoneId);
    if (!milestone) {
      return jsonError("Milestone not found", 404);
    }
    milestone.text = text;
    milestone.addedAt = addedAt;
  }

  if (Object.keys(validated.patch).length) {
    Object.assign(doc, validated.patch);
  }

  await doc.save();
  return jsonOk(doc.toObject());
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid id", 400);
  }

  await connectDB();
  const record = await CurrentProject.findByIdAndDelete(id);
  if (!record) {
    return jsonError("Project not found", 404);
  }

  return jsonOk({ ok: true });
}
