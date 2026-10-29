import mongoose from "mongoose";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/security/constants";

const taskNoteSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_DESCRIPTION_LENGTH,
    },
  },
  { timestamps: true },
);

taskNoteSchema.index({ taskId: 1, createdAt: -1 });

export default mongoose.models.TaskNote || mongoose.model("TaskNote", taskNoteSchema);
