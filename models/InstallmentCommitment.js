import mongoose from "mongoose";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import {
  INSTALLMENT_STATUSES,
  DEFAULT_PLANNING_CURRENCY,
} from "@/lib/planning/constants";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/security/constants";
import { createPaymentSubschema } from "@/lib/payments/mongoose";

const installmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    openEnded: { type: Boolean, default: false },
    totalAmount: {
      type: Number,
      default: null,
      min: 0.01,
      required: function installmentTotalAmountRequired() {
        return !this.openEnded;
      },
    },
    downPaymentAmount: { type: Number, default: null, min: 0.01 },
    downPaymentDate: { type: Date, default: null },
    installmentAmount: { type: Number, default: null, min: 0.01 },
    currency: { type: String, default: DEFAULT_PLANNING_CURRENCY },
    frequency: { type: String, enum: PAYMENT_FREQUENCIES, default: "monthly" },
    customIntervalDays: { type: Number, default: null },
    startDate: { type: Date, default: null, index: true },
    endDate: { type: Date, default: null, index: true },
    nextDueDate: { type: Date, default: null, index: true },
    manualNextDueDate: { type: Boolean, default: false },
    totalInstallments: { type: Number, default: null },
    installmentsPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0, min: 0 },
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

const MODEL_NAME = "InstallmentCommitment";

if (mongoose.models[MODEL_NAME]) {
  delete mongoose.models[MODEL_NAME];
}

export default mongoose.model(MODEL_NAME, installmentSchema);
