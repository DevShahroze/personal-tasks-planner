import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk } from "@/lib/api-response";
import { validateDeskNoteCreate } from "@/lib/desk-notes/validate";
import DeskNote from "@/models/DeskNote";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();
  const items = await DeskNote.find({}, { title: 1, updatedAt: 1, createdAt: 1 })
    .sort({ updatedAt: -1 })
    .lean();

  return jsonOk({ items });
}

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const { errors, value } = validateDeskNoteCreate(parsed.body);
  if (errors.length) {
    return jsonError("Validation failed", 400, errors);
  }

  await connectDB();
  const note = await DeskNote.create(value);
  return jsonOk(note, 201);
}
