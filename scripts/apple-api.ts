import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface AppleApiConfig {
  appId: string;
  keyId: string;
  issuerId: string;
  privateKey: string;
}

export interface AppleResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

export function getAppleApiConfig(): AppleApiConfig | null {
  const appId = process.env.APPLE_APP_ID?.trim() || "6835107571";
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const issuerId = process.env.APPLE_ISSUER_ID?.trim();
  let privateKey = process.env.APPLE_PRIVATE_KEY?.trim();
  const privateKeyPath = process.env.APPLE_PRIVATE_KEY_PATH?.trim();

  if (!privateKey && privateKeyPath) {
    const fullPath = resolve(process.cwd(), privateKeyPath);
    if (existsSync(fullPath)) {
      privateKey = readFileSync(fullPath, "utf-8");
    }
  }

  // Also check if AuthKey_${keyId}.p8 exists in root or scripts
  if (!privateKey && keyId) {
    const candidateRoot = resolve(process.cwd(), `AuthKey_${keyId}.p8`);
    if (existsSync(candidateRoot)) {
      privateKey = readFileSync(candidateRoot, "utf-8");
    }
  }

  if (!keyId || !issuerId || !privateKey) {
    return null;
  }

  return { appId, keyId, issuerId, privateKey };
}

export function generateAppleToken(config: AppleApiConfig): string {
  const header = Buffer.from(
    JSON.stringify({
      alg: "ES256",
      kid: config.keyId,
      typ: "JWT",
    }),
  ).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: config.issuerId,
      iat: now,
      exp: now + 1200, // 20 minutes
      aud: "appstoreconnect-v1",
    }),
  ).toString("base64url");

  const data = `${header}.${payload}`;
  const sig = crypto.sign("sha256", Buffer.from(data), {
    key: config.privateKey,
    dsaEncoding: "ieee-p1363",
  });

  return `${data}.${sig.toString("base64url")}`;
}

export async function fetchAppleApi(
  endpoint: string,
  config: AppleApiConfig,
  options: RequestInit = {},
): Promise<Record<string, unknown>> {
  const token = generateAppleToken(config);
  const url = endpoint.startsWith("http")
    ? endpoint
    : `https://api.appstoreconnect.apple.com/v1${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = (await res.json().catch(() => ({}))) as {
    errors?: Array<{ title?: string; detail?: string }>;
    data?: unknown;
  };

  if (!res.ok) {
    const errorMsg =
      json.errors
        ?.map((e) => `${e.title || "Error"}: ${e.detail || ""}`)
        .join("; ") || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(`Apple API error: ${errorMsg}`);
  }

  return json as Record<string, unknown>;
}

export async function getAppleStatus(config: AppleApiConfig) {
  // 1. App store versions for macOS
  const versionsData = await fetchAppleApi(
    `/apps/${config.appId}/appStoreVersions?filter[platform]=MAC_OS`,
    config,
  );
  const versions = (versionsData.data || []) as AppleResource[];

  // 2. Recent builds
  const buildsData = await fetchAppleApi(
    `/apps/${config.appId}/builds?limit=5`,
    config,
  );
  const builds = (buildsData.data || []) as AppleResource[];

  // 3. Review submissions
  const submissionsData = await fetchAppleApi(
    `/reviewSubmissions?filter[app]=${config.appId}&limit=3`,
    config,
  );
  const submissions = (submissionsData.data || []) as AppleResource[];

  return { versions, builds, submissions };
}

export async function submitForReview(
  config: AppleApiConfig,
  versionId: string,
) {
  // Create review submission container
  const submissionRes = await fetchAppleApi("/reviewSubmissions", config, {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "reviewSubmissions",
        attributes: { platform: "MAC_OS" },
        relationships: {
          app: { data: { id: config.appId, type: "apps" } },
        },
      },
    }),
  });

  const submissionData = submissionRes.data as AppleResource | undefined;
  const submissionId = submissionData?.id;
  if (!submissionId) {
    throw new Error("Failed to create review submission in App Store Connect");
  }

  // Add version to the review submission
  await fetchAppleApi("/reviewSubmissionItems", config, {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "reviewSubmissionItems",
        relationships: {
          reviewSubmission: {
            data: { id: submissionId, type: "reviewSubmissions" },
          },
          appStoreVersion: {
            data: { id: versionId, type: "appStoreVersions" },
          },
        },
      },
    }),
  });

  // Submit the review submission
  const finalRes = await fetchAppleApi(
    `/reviewSubmissions/${submissionId}`,
    config,
    {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          id: submissionId,
          type: "reviewSubmissions",
          attributes: { submitted: true },
        },
      }),
    },
  );

  return finalRes;
}
