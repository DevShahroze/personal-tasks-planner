import mongoose from "mongoose";

export const APP_SETTINGS_ID = "singleton";

const appSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: APP_SETTINGS_ID },
    pinScreenEnabled: { type: Boolean, default: false },
    pinScreenHash: { type: String, default: null },
    pinScreenIdleMinutes: { type: Number, default: 5, min: 1, max: 1440 },
    rolloverStatuses: { type: [String], default: null },
  },
  { timestamps: true },
);

export default mongoose.models.AppSettings ||
  mongoose.model("AppSettings", appSettingsSchema);
