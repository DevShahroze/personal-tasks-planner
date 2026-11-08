import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateInstallmentUpdate } from "@/lib/planning/validate";
import { syncInstallmentCommitment } from "@/lib/planning/installments";
import InstallmentCommitment from "@/models/InstallmentCommitment";
import { sortPaymentsByPaidAtAsc } from "@/lib/payments/sort";

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid id", 400);
  }

  const todayYmd =
    new URL(request.url).searchParams.get("todayYmd") ||
    new Date().toISOString().slice(0, 10);

  await connectDB();
  const lean = await InstallmentCommitment.findById(id).lean();
  if (!lean) {
    return jsonError("Installment commitment not found", 404);
  }
  const synced = {
    ...lean,
    payments: (lean.payments || []).map((payment) => ({ ...payment })),
  };
  syncInstallmentCommitment(synced, todayYmd);
  await InstallmentCommitment.updateOne(
    { _id: id },
    {
      $set: {
        nextDueDate: synced.nextDueDate,
        manualNextDueDate: synced.manualNextDueDate,
        installmentsPaid: synced.installmentsPaid,
        outstandingBalance: synced.outstandingBalance,
        status: synced.status,
        payments: synced.payments,
      },
    },
  );
  return jsonOk({
    ...synced,
    payments: sortPaymentsByPaidAtAsc(synced.payments),
  });
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

  const validated = validateInstallmentUpdate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const doc = await InstallmentCommitment.findById(id);
  if (!doc) {
    return jsonError("Installment commitment not found", 404);
  }

  Object.assign(doc, validated.patch);
  syncInstallmentCommitment(doc, new Date().toISOString().slice(0, 10));
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
  const deleted = await InstallmentCommitment.findByIdAndDelete(id);
  if (!deleted) {
    return jsonError("Installment commitment not found", 404);
  }
  return jsonOk({ ok: true });
}
