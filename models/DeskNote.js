import mongoose from "mongoose";

const deskNoteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
  },
  { timestamps: true },
);

deskNoteSchema.index({ updatedAt: -1 });
deskNoteSchema.index({ title: "text", content: "text" });

export default mongoose.models.DeskNote || mongoose.model("DeskNote", deskNoteSchema);
