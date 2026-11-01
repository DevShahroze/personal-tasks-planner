import bcrypt from "bcryptjs";
import AppSettings, { APP_SETTINGS_ID } from "@/models/AppSettings";
import { verifyAppPassword } from "../auth.js";
import { loadAppSettings } from "./app-settings.js";

const PIN_PATTERN = /^\d{4}$/;

export function isValidPin(pin) {
  return typeof pin === "string" && PIN_PATTERN.test(pin);
}

export function normalizeIdleMinutes(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 1440) {
    return null;
  }
  return n;
}

export async function loadPinScreenSettings() {
  return loadAppSettings();
}

export function pinScreenPublicView(doc) {
  return {
    enabled: Boolean(doc.pinScreenEnabled),
    idleMinutes: doc.pinScreenIdleMinutes ?? 5,
    configured: Boolean(doc.pinScreenHash),
  };
}

export async function verifyPinScreenPin(pin) {
  if (!isValidPin(pin)) {
    return { ok: false, error: "Invalid PIN" };
  }
  const doc = await loadPinScreenSettings();
  if (!doc.pinScreenEnabled || !doc.pinScreenHash) {
    return { ok: false, error: "PIN screen is not active" };
  }
  const match = await bcrypt.compare(pin, doc.pinScreenHash);
  if (!match) {
    return { ok: false, error: "Incorrect PIN" };
  }
  return { ok: true };
}

export async function updatePinScreenSettings(body) {
  const password = body.password;
  if (!password || typeof password !== "string") {
    return { ok: false, status: 400, error: "Password is required" };
  }
  const passwordOk = await verifyAppPassword(password);
  if (!passwordOk) {
    return { ok: false, status: 401, error: "Invalid password" };
  }

  const doc = await loadPinScreenSettings();
  const patch = {};

  if (body.enabled !== undefined) {
    patch.pinScreenEnabled = Boolean(body.enabled);
  }

  if (body.idleMinutes !== undefined) {
    const idleMinutes = normalizeIdleMinutes(body.idleMinutes);
    if (idleMinutes === null) {
      return { ok: false, status: 422, error: "Idle duration must be 1–1440 minutes" };
    }
    patch.pinScreenIdleMinutes = idleMinutes;
  }

  if (body.pin !== undefined && body.pin !== null && body.pin !== "") {
    if (!isValidPin(body.pin)) {
      return { ok: false, status: 422, error: "PIN must be exactly 4 digits" };
    }
    patch.pinScreenHash = await bcrypt.hash(body.pin, 10);
  }

  const nextEnabled =
    patch.pinScreenEnabled !== undefined
      ? patch.pinScreenEnabled
      : doc.pinScreenEnabled;
  const nextHash =
    patch.pinScreenHash !== undefined ? patch.pinScreenHash : doc.pinScreenHash;

  if (nextEnabled && !nextHash) {
    return {
      ok: false,
      status: 422,
      error: "Set a 4-digit PIN before enabling PIN screen",
    };
  }

  const updated = await AppSettings.findByIdAndUpdate(
    APP_SETTINGS_ID,
    { $set: patch },
    { new: true, upsert: true },
  ).lean();

  return { ok: true, settings: pinScreenPublicView(updated) };
}
