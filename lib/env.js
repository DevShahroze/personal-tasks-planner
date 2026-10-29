/**
 * Central server-side environment configuration.
 * Import only from server code (route handlers, middleware auth helpers, scripts).
 * Never expose these values with NEXT_PUBLIC_ or client bundles.
 */

const DEFAULT_MONGODB_DB_NAME = "personal_tasks_planner";

let serverConfigCache = null;

function readRequired(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Bcrypt hashes contain `$`; Next/dotenv mangle unquoted/double-quoted values. Use base64 in .env. */
function readPasswordHash() {
  const encoded = process.env.APP_PASSWORD_HASH_B64?.trim();
  if (encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    if (!decoded.startsWith("$2")) {
      throw new Error("APP_PASSWORD_HASH_B64 is not a valid bcrypt hash");
    }
    return decoded;
  }

  const direct = process.env.APP_PASSWORD_HASH?.trim();
  if (direct?.startsWith("$2")) {
    return direct;
  }

  if (direct) {
    throw new Error(
      "APP_PASSWORD_HASH looks corrupted (shell/env `$` expansion). Set APP_PASSWORD_HASH_B64 instead.",
    );
  }

  throw new Error("Missing APP_PASSWORD_HASH_B64 (recommended) or APP_PASSWORD_HASH");
}

function resolveMongoDbName() {
  return process.env.MONGODB_DB_NAME?.trim() || DEFAULT_MONGODB_DB_NAME;
}

/** Atlas URI with a dedicated database name (database is created on first use). */
export function resolveMongoUri() {
  const dbName = resolveMongoDbName();
  let uri = process.env.MONGODB_URI?.trim();

  const username = process.env.MONGODB_USERNAME?.trim();
  const password = process.env.MONGODB_PASSWORD?.trim();

  if (!uri && username && password) {
    const host =
      process.env.MONGODB_HOST?.trim() || "cluster0.2irm696.mongodb.net";
    uri = `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}`;
  }

  if (!uri) {
    throw new Error(
      "Missing MongoDB configuration: set MONGODB_URI or MONGODB_USERNAME and MONGODB_PASSWORD",
    );
  }

  const [base, query = ""] = uri.split("?");
  const normalizedBase = base.replace(/\/$/, "");
  const hostSegment = normalizedBase.includes("@")
    ? normalizedBase.split("@").pop()
    : normalizedBase;

  const hasDatabasePath =
    hostSegment.includes("/") && hostSegment.split("/").length > 1;

  if (hasDatabasePath) {
    return query ? `${normalizedBase}?${query}` : normalizedBase;
  }

  const params = new URLSearchParams(query);
  if (!params.has("retryWrites")) {
    params.set("retryWrites", "true");
  }
  if (!params.has("w")) {
    params.set("w", "majority");
  }
  const queryString = params.toString();
  return `${normalizedBase}/${dbName}${queryString ? `?${queryString}` : ""}`;
}

/** Runtime flags that do not require database or auth secrets. Safe for middleware. */
export function getRuntimeConfig() {
  const nodeEnv = process.env.NODE_ENV || "development";
  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
  };
}

/** Validated application secrets and connection settings (lazy, cached per process). */
export function getServerConfig() {
  if (serverConfigCache) {
    return serverConfigCache;
  }

  serverConfigCache = {
    ...getRuntimeConfig(),
    mongodbUri: resolveMongoUri(),
    mongodbDbName: resolveMongoDbName(),
    authSecret: readRequired("AUTH_SECRET"),
    appUsername: readRequired("APP_USERNAME"),
    appPasswordHash: readPasswordHash(),
    sessionMaxAgeSeconds: 60 * 60 * 24 * 7,
  };

  return serverConfigCache;
}

/** @internal Test-only reset; avoids stale config across Node test workers when env changes. */
export function resetServerConfigCacheForTests() {
  serverConfigCache = null;
}
