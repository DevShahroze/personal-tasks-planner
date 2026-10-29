import mongoose from "mongoose";

const failureSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    message: { type: String, default: "" },
  },
  { _id: false },
);

const taskProcessorRunSchema = new mongoose.Schema(
  {
    businessDateYmd: { type: String, required: true, index: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
      index: true,
    },
    timezone: { type: String, required: true },
    taskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    processedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    failures: [failureSchema],
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    lastStepAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.TaskProcessorRun ||
  mongoose.model("TaskProcessorRun", taskProcessorRunSchema);
