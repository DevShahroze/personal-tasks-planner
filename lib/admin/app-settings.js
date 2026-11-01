import { connectDB } from "../mongodb.js";
import AppSettings, { APP_SETTINGS_ID } from "@/models/AppSettings";

export async function loadAppSettings() {
  await connectDB();
  let doc = await AppSettings.findById(APP_SETTINGS_ID).lean();
  if (!doc) {
    doc = (await AppSettings.create({ _id: APP_SETTINGS_ID })).toObject();
  }
  return doc;
}
