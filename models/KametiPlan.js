import mongoose from "mongoose";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import { KAMETI_STATUSES, DEFAULT_PLANNING_CURRENCY } from "@/lib/planning/constants";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/security/constants";
import { createPaymentSubschema } from "@/lib/payments/mongoose";

const kametiSchema = new mongoose.Schema(
  {
    planName: { type: String, required: true, trim: true },
    totalParticipants: { type: Number, required: true, min: 1 },
    contributionAmount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: DEFAULT_PLANNING_CURRENCY },
    contributionFrequency: {
      type: String,
      enum: PAYMENT_FREQUENCIES,
      default: "monthly",
    },
    customIntervalDays: { type: Number, default: null },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null },
    nextContributionDueDate: { type: Date, default: null, index: true },
    expectedPayoutDate: { type: Date, default: null, index: true },
    payoutReceivedAt: { type: Date, default: null },
    payoutAmount: { type: Number, default: null },
    contributionPayments: { type: [createPaymentSubschema()], default: [] },
    contributionsPaidCount: { type: Number, default: 0 },
    remainingContributionsOwed: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    status: {
      type: String,
      enum: KAMETI_STATUSES,
      default: "active",
      index: true,
    },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
  },
  { timestamps: true },
);

kametiSchema.index({ updatedAt: -1 });

export default mongoose.models.KametiPlan || mongoose.model("KametiPlan", kametiSchema);
