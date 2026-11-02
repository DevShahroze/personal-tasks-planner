import mongoose from "mongoose";

const taskProcessorDailySessionSchema = new mongoose.Schema(
  {
    calendarDateYmd: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      required: true,
      index: true,
    },
    executionType: {
      type: String,
      enum: ["automatic", "manual"],
      default: "automatic",
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.TaskProcessorDailySession ||
  mongoose.model("TaskProcessorDailySession", taskProcessorDailySessionSchema);
