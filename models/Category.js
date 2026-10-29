import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.models.Category || mongoose.model("Category", categorySchema);
