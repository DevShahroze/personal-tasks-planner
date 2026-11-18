import mongoose from "mongoose";
import { getServerConfig } from "@/lib/env.js";

function bytesToMb(value) {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round((value / (1024 * 1024)) * 10) / 10;
}

export async function collectMongoHealth() {
  const { mongodbDbName } = getServerConfig();
  const connection = mongoose.connection;
  if (connection.readyState !== 1 || !connection.db) {
    return {
      platform: "MongoDB",
      status: "error",
      summary: "Database is not connected",
      database: mongodbDbName,
      metrics: null,
      dashboardUrl: "https://cloud.mongodb.com/",
      usageNote:
        "Atlas M0 free tier: 512 MB storage. Check cluster metrics in Atlas → Metrics / Billing.",
    };
  }

  try {
    await connection.db.admin().command({ ping: 1 });
    const stats = await connection.db.stats();
    const dataMb = bytesToMb(stats.dataSize);
    const storageMb = bytesToMb(stats.storageSize);
    const freeTierMb = 512;
    const storagePercent =
      storageMb != null
        ? Math.min(100, Math.round((storageMb / freeTierMb) * 1000) / 10)
        : null;

    return {
      platform: "MongoDB",
      status: "ok",
      summary: "Connected and responding to ping",
      database: connection.db.databaseName || mongodbDbName,
      metrics: {
        collections: stats.collections ?? null,
        documents: stats.objects ?? null,
        dataSizeMb: dataMb,
        storageSizeMb: storageMb,
        freeTierStorageMb: freeTierMb,
        storageUsedPercentOfFreeTier: storagePercent,
      },
      dashboardUrl: "https://cloud.mongodb.com/",
      usageNote:
        "Storage above is for this database in the current cluster. Atlas billing shows account-wide usage.",
    };
  } catch (error) {
    return {
      platform: "MongoDB",
      status: "error",
      summary: error.message || "Health check failed",
      database: mongodbDbName,
      metrics: null,
      dashboardUrl: "https://cloud.mongodb.com/",
      usageNote: "Verify Atlas network access and credentials.",
    };
  }
}

export function collectVercelHealth() {
  const linked = Boolean(process.env.VERCEL);
  const url = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;

  return {
    platform: "Vercel",
    status: linked ? "ok" : "local",
    summary: linked
      ? `Running on Vercel (${process.env.VERCEL_ENV || "production"})`
      : "Not running on Vercel (local or other host)",
    metrics: linked
      ? {
          environment: process.env.VERCEL_ENV || null,
          region: process.env.VERCEL_REGION || null,
          deploymentUrl: url,
        }
      : null,
    dashboardUrl: "https://vercel.com/account/usage",
    usageNote:
      "Hobby plan: bandwidth, serverless execution, and build minutes — open Usage in the Vercel dashboard.",
  };
}

export function collectFirebaseHealth() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || null;

  return {
    platform: "Firebase",
    status: projectId ? "configured" : "not_linked",
    summary: projectId
      ? `Project id configured (${projectId})`
      : "Not used by this app (no FIREBASE_PROJECT_ID)",
    metrics: projectId
      ? {
          projectId,
        }
      : null,
    dashboardUrl: projectId
      ? `https://console.firebase.google.com/project/${projectId}/usage`
      : "https://console.firebase.google.com/",
    usageNote:
      "Spark (free) quotas: Auth, Firestore, Hosting, etc. Set FIREBASE_PROJECT_ID only if you attach Firebase to this project.",
  };
}

export async function collectPlatformHealth() {
  return {
    checkedAt: new Date().toISOString(),
    mongodb: await collectMongoHealth(),
    vercel: collectVercelHealth(),
    firebase: collectFirebaseHealth(),
  };
}
