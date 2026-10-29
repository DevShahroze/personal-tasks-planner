import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateAvailabilityTemplateInput } from "@/lib/scheduling/template-validate";
import { ensureDefaultAvailabilityTemplates } from "@/lib/scheduling/seed-templates";
import AvailabilityTemplate from "@/models/AvailabilityTemplate";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();
  await ensureDefaultAvailabilityTemplates();

  const items = await AvailabilityTemplate.find({}).sort({ name: 1 }).lean();

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

  const validated = validateAvailabilityTemplateInput(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const created = await AvailabilityTemplate.create(validated.value);
  return jsonOk(created.toObject(), 201);
}
