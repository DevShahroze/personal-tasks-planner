import AppSettings, { APP_SETTINGS_ID } from "@/models/AppSettings";
import { verifyAppPassword } from "../auth.js";
import { loadAppSettings } from "./app-settings.js";
import { normalizeIdleMinutes } from "./pin-screen.js";

const DEFAULT_SESSION_TOKEN_MAX_AGE_MINUTES = 10080;

export function normalizeSessionTokenMaxAgeMinutes(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 15 || n > 43200) {
    return null;
  }
  return n;
}

export function sessionTokenMaxAgeMinutesFromDoc(doc) {
  return doc?.sessionTokenMaxAgeMinutes ?? DEFAULT_SESSION_TOKEN_MAX_AGE_MINUTES;
}

export async function configuredSessionMaxAgeSeconds() {
  const doc = await loadAppSettings();
  return sessionTokenMaxAgeMinutesFromDoc(doc) * 60;
}

export function sessionIdleLogoutPublicView(doc) {
  return {
    enabled: Boolean(doc.sessionIdleLogoutEnabled),
    idleMinutes: doc.sessionIdleLogoutMinutes ?? 30,
    tokenMaxAgeMinutes: sessionTokenMaxAgeMinutesFromDoc(doc),
  };
}

export async function updateSessionIdleLogoutSettings(body) {
  const password = body.password;
  if (!password || typeof password !== "string") {
    return { ok: false, status: 400, error: "Password is required" };
  }
  const passwordOk = await verifyAppPassword(password);
  if (!passwordOk) {
    return { ok: false, status: 401, error: "Invalid password" };
  }

  const patch = {};

  if (body.enabled !== undefined) {
    patch.sessionIdleLogoutEnabled = Boolean(body.enabled);
  }

  if (body.idleMinutes !== undefined) {
    const idleMinutes = normalizeIdleMinutes(body.idleMinutes);
    if (idleMinutes === null) {
      return { ok: false, status: 422, error: "Idle duration must be 1–1440 minutes" };
    }
    patch.sessionIdleLogoutMinutes = idleMinutes;
  }

  if (body.tokenMaxAgeMinutes !== undefined) {
    const tokenMaxAgeMinutes = normalizeSessionTokenMaxAgeMinutes(
      body.tokenMaxAgeMinutes,
    );
    if (tokenMaxAgeMinutes === null) {
      return {
        ok: false,
        status: 422,
        error: "Session token lifetime must be 15–43200 minutes",
      };
    }
    patch.sessionTokenMaxAgeMinutes = tokenMaxAgeMinutes;
  }

  const updated = await AppSettings.findByIdAndUpdate(
    APP_SETTINGS_ID,
    { $set: patch },
    { new: true, upsert: true },
  ).lean();

  return { ok: true, settings: sessionIdleLogoutPublicView(updated) };
}
