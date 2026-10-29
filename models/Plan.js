import mongoose from "mongoose";
import { PLAN_STATUSES } from "@/lib/constants";

const planSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: PLAN_STATUSES,
      default: "Considering",
      index: true,
    },
    startDate: { type: Date, default: null },
    targetDate: { type: Date, default: null, index: true },
    linkedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    linkedThoughts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Thought" }],
  },
  { timestamps: true },
);

planSchema.index({ title: "text", description: "text" });
planSchema.index({ updatedAt: -1 });

export default mongoose.models.Plan || mongoose.model("Plan", planSchema);
