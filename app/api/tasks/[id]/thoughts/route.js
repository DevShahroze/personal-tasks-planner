import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { linkTaskThought, unlinkTaskThought } from "@/lib/relationships";
import Task from "@/models/Task";
import Thought from "@/models/Thought";

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

  const thoughtId = body.thoughtId;
  if (!isValidObjectId(thoughtId)) {
    return jsonError("Invalid thought id", 400);
  }

  await connectDB();
  const [task, thought] = await Promise.all([
    Task.findById(id),
    Thought.findById(thoughtId),
  ]);

  if (!task) {
    return jsonError("Task not found", 404);
  }
  if (!thought) {
    return jsonError("Thought not found", 404);
  }

  await linkTaskThought(task._id, thought._id);
  return jsonOk({ ok: true });
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const thoughtId = searchParams.get("thoughtId");

  if (!isValidObjectId(id) || !isValidObjectId(thoughtId)) {
    return jsonError("Invalid id", 400);
  }

  await connectDB();
  await unlinkTaskThought(id, thoughtId);
  return jsonOk({ ok: true });
}
