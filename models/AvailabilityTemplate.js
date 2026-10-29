import mongoose from "mongoose";
import { DEFAULT_SCHEDULE_TIMEZONE, ISO_WEEKDAYS } from "@/lib/scheduling/constants";

const availabilityTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    daysOfWeek: {
      type: [Number],
      default: () => [...ISO_WEEKDAYS],
    },
    startTime: { type: String, default: "00:00" },
    endTime: { type: String, default: "23:59" },
    timezone: { type: String, default: DEFAULT_SCHEDULE_TIMEZONE },
    excludePublicHolidays: { type: Boolean, default: false },
  },
  { timestamps: true },
);

availabilityTemplateSchema.index({ name: 1 });

export default mongoose.models.AvailabilityTemplate ||
  mongoose.model("AvailabilityTemplate", availabilityTemplateSchema);
