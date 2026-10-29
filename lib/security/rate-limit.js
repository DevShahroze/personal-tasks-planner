const buckets = new Map();

export const RATE_LIMIT_PROFILES = {
  auth: { limit: 10, windowMs: 15 * 60 * 1000 },
  mutation: { limit: 120, windowMs: 60 * 1000 },
  read: { limit: 300, windowMs: 60 * 1000 },
  dashboard: { limit: 60, windowMs: 60 * 1000 },
};

export function resolveRateLimitProfile(pathname, method) {
  if (pathname.startsWith("/api/auth/login")) {
    return "auth";
  }
  if (pathname.startsWith("/api/dashboard/")) {
    return "dashboard";
  }
  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    return "mutation";
  }
  if (pathname.startsWith("/api/")) {
    return "read";
  }
  return null;
}

function pruneExpiredBuckets(now) {
  for (const [bucketKey, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(bucketKey);
    }
  }
}

export function consumeRateLimit(key, profileName) {
  const profile = RATE_LIMIT_PROFILES[profileName];
  if (!profile) {
    return { limited: false };
  }

  const now = Date.now();
  pruneExpiredBuckets(now);
  const bucketKey = `${profileName}:${key}`;
  let bucket = buckets.get(bucketKey);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + profile.windowMs };
    buckets.set(bucketKey, bucket);
  }

  bucket.count += 1;

  if (bucket.count > profile.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
