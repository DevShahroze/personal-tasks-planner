import mongoose from "mongoose";
import { CURRENT_PROJECT_STATUSES } from "@/lib/current-projects/constants";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/security/constants";

const milestoneSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    addedAt: { type: Date, required: true },
    achievedAt: { type: Date, default: null },
  },
  { _id: true },
);

const currentProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "", trim: true, maxlength: 500 },
    notes: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    status: {
      type: String,
      enum: CURRENT_PROJECT_STATUSES,
      default: "Active",
      index: true,
    },
    startedAt: { type: Date, default: null },
    targetDate: { type: Date, default: null, index: true },
    milestones: { type: [milestoneSchema], default: [] },
  },
  { timestamps: true },
);

currentProjectSchema.index({ title: "text", summary: "text" });
currentProjectSchema.index({ updatedAt: -1 });

export default mongoose.models.CurrentProject ||
  mongoose.model("CurrentProject", currentProjectSchema);
