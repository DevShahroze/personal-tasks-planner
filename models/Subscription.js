import mongoose from "mongoose";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import {
  SUBSCRIPTION_STATUSES,
  DEFAULT_PLANNING_CURRENCY,
} from "@/lib/planning/constants";
import { createPaymentSubschema } from "@/lib/payments/mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: DEFAULT_PLANNING_CURRENCY },
    billingFrequency: { type: String, enum: PAYMENT_FREQUENCIES, default: "monthly" },
    customIntervalDays: { type: Number, default: null },
    nextBillingDate: { type: Date, default: null, index: true },
    startDate: { type: Date, required: true, index: true },
    renewalDate: { type: Date, default: null },
    cancellationDate: { type: Date, default: null },
    autoRenew: { type: Boolean, default: true },
    manualBilling: { type: Boolean, default: false },
    paymentHistory: { type: [createPaymentSubschema()], default: [] },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "active",
      index: true,
    },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
  },
  { timestamps: true },
);

subscriptionSchema.index({ updatedAt: -1 });

export default mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);
