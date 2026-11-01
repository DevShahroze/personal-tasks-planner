import mongoose from "mongoose";
import { IMPORTANT_INFO_CATEGORIES } from "@/lib/important-info/constants";

const importantInfoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: IMPORTANT_INFO_CATEGORIES,
      default: "Other",
      index: true,
    },
    subjectName: { type: String, default: "", trim: true },
    value: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

importantInfoSchema.index({ title: "text", notes: "text", subjectName: "text" });
importantInfoSchema.index({ updatedAt: -1 });

export default mongoose.models.ImportantInfo ||
  mongoose.model("ImportantInfo", importantInfoSchema);
