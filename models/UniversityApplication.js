import mongoose from "mongoose";
import {
  APPLICATION_STATUSES,
  FEE_PAYMENT_STATUSES,
  DEFAULT_PLANNING_CURRENCY,
} from "@/lib/planning/constants";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/security/constants";

const universityApplicationSchema = new mongoose.Schema(
  {
    universityName: { type: String, required: true, trim: true },
    programName: { type: String, required: true, trim: true },
    applicationDeadline: { type: Date, default: null, index: true },
    applicationFee: { type: Number, default: null },
    feeCurrency: { type: String, default: DEFAULT_PLANNING_CURRENCY },
    feePaymentStatus: {
      type: String,
      enum: FEE_PAYMENT_STATUSES,
      default: "unpaid",
    },
    applicationStatus: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: "researching",
      index: true,
    },
    submissionDate: { type: Date, default: null },
    resultDate: { type: Date, default: null },
    notes: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    relatedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  },
  { timestamps: true },
);

universityApplicationSchema.index({ updatedAt: -1 });

export default mongoose.models.UniversityApplication ||
  mongoose.model("UniversityApplication", universityApplicationSchema);
