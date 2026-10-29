import mongoose from "mongoose";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import { INSTALLMENT_STATUSES, DEFAULT_PLANNING_CURRENCY } from "@/lib/planning/constants";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/security/constants";
import { createPaymentSubschema } from "@/lib/payments/mongoose";

const installmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    totalAmount: { type: Number, required: true, min: 0.01 },
    installmentAmount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: DEFAULT_PLANNING_CURRENCY },
    frequency: { type: String, enum: PAYMENT_FREQUENCIES, default: "monthly" },
    customIntervalDays: { type: Number, default: null },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null, index: true },
    nextDueDate: { type: Date, default: null, index: true },
    totalInstallments: { type: Number, default: null },
    installmentsPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: INSTALLMENT_STATUSES,
      default: "active",
      index: true,
    },
    payments: { type: [createPaymentSubschema()], default: [] },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
  },
  { timestamps: true },
);

installmentSchema.index({ updatedAt: -1 });

export default mongoose.models.InstallmentCommitment ||
  mongoose.model("InstallmentCommitment", installmentSchema);
