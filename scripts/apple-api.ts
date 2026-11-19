import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface AppleApiConfig {
  appId: string;
  keyId: string;
  issuerId: string;
  privateKey: string;
  privateKeyPath?: string;
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
  const envKeyPath = process.env.APPLE_PRIVATE_KEY_PATH?.trim();
  let resolvedKeyPath: string | undefined;

  if (!privateKey && envKeyPath) {
    const fullPath = resolve(process.cwd(), envKeyPath);
    if (existsSync(fullPath)) {
      privateKey = readFileSync(fullPath, "utf-8");
      resolvedKeyPath = fullPath;
    }
  }

  // Also check if AuthKey_${keyId}.p8 exists in root or scripts
  if (keyId) {
    const candidateRoot = resolve(process.cwd(), `AuthKey_${keyId}.p8`);
    if (existsSync(candidateRoot)) {
      if (!privateKey) {
        privateKey = readFileSync(candidateRoot, "utf-8");
      }
      if (!resolvedKeyPath) {
        resolvedKeyPath = candidateRoot;
      }
    }
  }

  if (!keyId || !issuerId || !privateKey) {
    return null;
  }

  return {
    appId,
    keyId,
    issuerId,
    privateKey,
    privateKeyPath: resolvedKeyPath,
  };
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
  retries = 2,
): Promise<Record<string, unknown>> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `https://api.appstoreconnect.apple.com/v1${endpoint}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const token = generateAppleToken(config);
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
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
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
      const errorMsg =
        json.errors
          ?.map((e) => `${e.title || "Error"}: ${e.detail || ""}`)
          .join("; ") || `HTTP ${res.status} ${res.statusText}`;
      throw new Error(`Apple API error: ${errorMsg}`);
    }

    return json as Record<string, unknown>;
  }

  throw new Error("Apple API error: Max retries exceeded");
}

export async function getAppleStatus(config: AppleApiConfig) {
  let versions: AppleResource[] = [];
  let builds: AppleResource[] = [];
  let submissions: AppleResource[] = [];

  // 1. App store versions for macOS
  try {
    const versionsData = await fetchAppleApi(
      `/apps/${config.appId}/appStoreVersions`,
      config,
    );
    versions = (versionsData.data || []) as AppleResource[];
  } catch (err) {
    console.warn("  ⚠️ Versions query warning:", (err as Error).message);
  }

  // 2. Recent builds
  try {
    const buildsData = await fetchAppleApi(
      `/builds?filter[app]=${config.appId}&limit=5`,
      config,
    );
    builds = (buildsData.data || []) as AppleResource[];
  } catch (err) {
    console.warn("  ⚠️ Builds query warning:", (err as Error).message);
  }

  // 3. Review submissions
  try {
    const submissionsData = await fetchAppleApi(
      `/apps/${config.appId}/reviewSubmissions`,
      config,
    );
    submissions = (submissionsData.data || []) as AppleResource[];
  } catch {
    // Non-blocking: version.attributes.appStoreState already provides the review state
  }

  return { versions, builds, submissions };
}

export async function cancelAppleReviewSubmission(
  config: AppleApiConfig,
  submissionId?: string,
  versionId?: string,
) {
  if (submissionId) {
    try {
      const res = await fetchAppleApi(
        `/reviewSubmissions/${submissionId}`,
        config,
        {
          method: "PATCH",
          body: JSON.stringify({
            data: {
              id: submissionId,
              type: "reviewSubmissions",
              attributes: { canceled: true },
            },
          }),
        },
      );
      return res;
    } catch (err) {
      console.warn("  ⚠️ Cancel reviewSubmission note:", (err as Error).message);
    }
  }
  if (versionId) {
    try {
      return await fetchAppleApi(
        `/appStoreVersionSubmissions/${versionId}`,
        config,
        {
          method: "DELETE",
        },
      );
    } catch (err) {
      console.warn(
        "  ⚠️ Delete appStoreVersionSubmission note:",
        (err as Error).message,
      );
    }
  }
  return null;
}

export async function updateAppleVersionString(
  config: AppleApiConfig,
  versionId: string,
  versionString: string,
) {
  return await fetchAppleApi(`/appStoreVersions/${versionId}`, config, {
    method: "PATCH",
    body: JSON.stringify({
      data: {
        id: versionId,
        type: "appStoreVersions",
        attributes: { versionString },
      },
    }),
  });
}

export async function attachBuildToVersion(
  config: AppleApiConfig,
  versionId: string,
  buildId: string,
) {
  return await fetchAppleApi(
    `/appStoreVersions/${versionId}/relationships/build`,
    config,
    {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          id: buildId,
          type: "builds",
        },
      }),
    },
  );
}

export async function waitForValidBuild(
  config: AppleApiConfig,
  expectedBuildNum: string,
  maxAttempts = 20,
  intervalMs = 15000,
): Promise<AppleResource | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { builds } = await getAppleStatus(config);
    const matching = builds.find(
      (b) => String(b.attributes?.version) === expectedBuildNum,
    );
    if (matching) {
      const state = String(matching.attributes?.processingState || "");
      console.log(
        `  ⏳ Проверка сборки #${expectedBuildNum} в App Store Connect [${attempt}/${maxAttempts}]: статус = ${state}`,
      );
      if (state === "VALID") {
        return matching;
      }
      if (state === "FAILED" || state === "INVALID") {
        throw new Error(
          `Сборка #${expectedBuildNum} отклонена Apple со статусом ${state}`,
        );
      }
    } else {
      console.log(
        `  ⏳ Ожидание появления сборки #${expectedBuildNum} в App Store Connect [${attempt}/${maxAttempts}]...`,
      );
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return null;
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

export interface ApplePrivacyUpdateResult {
  id: string;
  locale: string;
  privacyPolicyUrl: string;
}

/**
 * Updates the privacyPolicyUrl attribute across all appInfoLocalizations for the configured app.
 */
export async function updateApplePrivacyPolicyUrl(
  config: AppleApiConfig,
  privacyPolicyUrl: string,
): Promise<ApplePrivacyUpdateResult[]> {
  const infosRes = await fetchAppleApi(
    `/apps/${config.appId}/appInfos`,
    config,
  );
  const infos = (infosRes.data || []) as AppleResource[];
  const results: ApplePrivacyUpdateResult[] = [];

  for (const info of infos) {
    const locsRes = await fetchAppleApi(
      `/appInfos/${info.id}/appInfoLocalizations`,
      config,
    );
    const locs = (locsRes.data || []) as AppleResource[];

    for (const loc of locs) {
      const updated = await fetchAppleApi(
        `/appInfoLocalizations/${loc.id}`,
        config,
        {
          method: "PATCH",
          body: JSON.stringify({
            data: {
              type: "appInfoLocalizations",
              id: loc.id,
              attributes: { privacyPolicyUrl },
            },
          }),
        },
      );

      const updatedData = updated.data as AppleResource | undefined;
      results.push({
        id: loc.id,
        locale: String(
          updatedData?.attributes?.locale ?? loc.attributes?.locale ?? "",
        ),
        privacyPolicyUrl: String(
          updatedData?.attributes?.privacyPolicyUrl ?? privacyPolicyUrl,
        ),
      });
    }
  }

  return results;
}
