import mongoose from "mongoose";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import {
  INSURANCE_POLICY_STATUSES,
  DEFAULT_PLANNING_CURRENCY,
} from "@/lib/planning/constants";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/security/constants";
import { createPaymentSubschema } from "@/lib/payments/mongoose";

const insurancePolicySchema = new mongoose.Schema(
  {
    insurerName: { type: String, required: true, trim: true },
    policyNumber: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    premiumAmount: { type: Number, required: true, min: 0.01 },
    totalPremiumAmount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: DEFAULT_PLANNING_CURRENCY },
    frequency: { type: String, enum: PAYMENT_FREQUENCIES, default: "yearly" },
    customIntervalDays: { type: Number, default: null },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null, index: true },
    termYears: { type: Number, default: null, min: 1 },
    totalPremiumPayments: { type: Number, default: null, min: 1 },
    nextDueDate: { type: Date, default: null, index: true },
    premiumsPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: INSURANCE_POLICY_STATUSES,
      default: "active",
      index: true,
    },
    payments: { type: [createPaymentSubschema()], default: [] },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
  },
  { timestamps: true },
);

insurancePolicySchema.index({ updatedAt: -1 });

export default mongoose.models.InsurancePolicy ||
  mongoose.model("InsurancePolicy", insurancePolicySchema);
