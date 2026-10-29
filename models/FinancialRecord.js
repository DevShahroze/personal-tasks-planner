import mongoose from "mongoose";
import {
  FINANCIAL_RECORD_STATUSES,
  FINANCIAL_RECORD_TYPES,
  DEFAULT_FINANCIAL_CURRENCY,
} from "@/lib/finance/constants";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/security/constants";

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    paidAt: { type: Date, required: true, default: Date.now },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const financialRecordSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: FINANCIAL_RECORD_TYPES,
      required: true,
      index: true,
    },
    partyName: { type: String, required: true, trim: true },
    description: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    originalAmount: { type: Number, required: true, min: 0.01 },
    outstandingBalance: { type: Number, required: true, min: 0 },
    currency: { type: String, default: DEFAULT_FINANCIAL_CURRENCY },
    expectedDate: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: FINANCIAL_RECORD_STATUSES,
      default: "pending",
      index: true,
    },
    notes: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    payments: { type: [paymentSchema], default: [] },
  },
  { timestamps: true },
);

financialRecordSchema.index({ updatedAt: -1 });
financialRecordSchema.index({ expectedDate: 1, status: 1 });

export default mongoose.models.FinancialRecord ||
  mongoose.model("FinancialRecord", financialRecordSchema);
