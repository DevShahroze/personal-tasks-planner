import mongoose from "mongoose";

const thoughtSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    linkedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    linkedPlans: [{ type: mongoose.Schema.Types.ObjectId, ref: "Plan" }],
  },
  { timestamps: true },
);

thoughtSchema.index({ title: "text", content: "text" });
thoughtSchema.index({ updatedAt: -1 });

export default mongoose.models.Thought || mongoose.model("Thought", thoughtSchema);
