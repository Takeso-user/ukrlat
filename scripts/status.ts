import crypto from "node:crypto";
import getClient from "chrome-webstore-upload";
import { getAppleApiConfig, getAppleStatus } from "./apple-api";

function base64url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

async function checkChromeStatus() {
  console.log("\n🌐 [Chrome Web Store]");
  const extensionId = process.env.CHROME_EXTENSION_ID?.trim();
  const publisherId = process.env.CHROME_PUBLISHER_ID?.trim();
  const clientId = process.env.CHROME_CLIENT_ID?.trim();
  const clientSecret = process.env.CHROME_CLIENT_SECRET?.trim();
  const refreshToken = process.env.CHROME_REFRESH_TOKEN?.trim();

  if (
    !extensionId ||
    !publisherId ||
    !clientId ||
    !clientSecret ||
    !refreshToken
  ) {
    console.log("  ⚠️ Missing Chrome Web Store API credentials in .env");
    return;
  }

  try {
    const client = getClient({
      extensionId,
      publisherId,
      clientId,
      clientSecret,
      refreshToken,
    });
    const token = await client.fetchToken();

    // Query v1.1 DRAFT projection to get uploaded package version
    const draftRes = await fetch(
      `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}?projection=DRAFT`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-goog-api-version": "2",
        },
      },
    );
    const draftData = (await draftRes.json().catch(() => ({}))) as {
      crxVersion?: string;
      uploadState?: string;
    };

    // Query v2 fetchStatus to inspect live/submission lifecycle
    const statusRes = await fetch(
      `https://chromewebstore.googleapis.com/v2/publishers/${publisherId}/items/${extensionId}:fetchStatus`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const statusData = (await statusRes.json().catch(() => ({}))) as {
      publishedItemRevisionStatus?: { state?: string };
      submittedItemRevisionStatus?: { state?: string };
    };

    const uploadedVersion = draftData.crxVersion || "N/A";
    const isLive = Boolean(statusData.publishedItemRevisionStatus);
    const isSubmitted = Boolean(statusData.submittedItemRevisionStatus);

    let stage = "Draft / Pending (⏳ Загружена версия, отправлена на проверку)";
    if (isLive) {
      stage = "Published (✅ Опубликовано / Live в Chrome Web Store)";
    } else if (isSubmitted) {
      stage = "In Review (⏳ Находится на модерации Google)";
    }

    console.log(`  ✓ Item ID:          ${extensionId}`);
    console.log(`  ✓ Package Version:  ${uploadedVersion}`);
    console.log(`  ✓ Stage:            ${stage}`);
    console.log(
      `  ✓ Public Listing:   ${isLive ? "Доступно пользователям" : "Еще не опубликовано (на модерации)"}`,
    );
    console.log(
      `  ✓ Dev Console URL:  https://chrome.google.com/webstore/devconsole/${publisherId}/${extensionId}/edit`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ Chrome API error: ${msg}`);
  }
}

async function checkFirefoxStatus() {
  console.log("\n🦊 [Mozilla Firefox Add-ons (AMO)]");
  const issuer = process.env.AMO_JWT_ISSUER?.trim();
  const secret = process.env.AMO_JWT_SECRET?.trim();

  if (!issuer || !secret) {
    console.log("  ⚠️ Missing Mozilla AMO API credentials in .env");
    return;
  }

  try {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: issuer,
      jti: Math.random().toString(),
      iat: now,
      exp: now + 60,
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;

    const res = await fetch(
      "https://addons.mozilla.org/api/v5/addons/addon/ukrlat@takeso.com/",
      {
        headers: {
          Authorization: `JWT ${jwt}`,
        },
      },
    );

    if (!res.ok) {
      console.log(`  ❌ AMO API responded with HTTP ${res.status}`);
      return;
    }

    const data = (await res.json()) as {
      guid?: string;
      name?: Record<string, string>;
      current_version?: { version?: string };
      status?: string;
      last_updated?: string;
    };
    const version = data.current_version?.version || "N/A";
    const status = data.status || "Unknown";

    let latestSubmitted = version;
    const versionsRes = await fetch(
      "https://addons.mozilla.org/api/v5/addons/addon/ukrlat@takeso.com/versions/?filter=all_with_unlisted&page_size=1",
      {
        headers: {
          Authorization: `JWT ${jwt}`,
        },
      },
    );
    if (versionsRes.ok) {
      const versionsData = (await versionsRes.json().catch(() => ({}))) as {
        results?: Array<{ version?: string }>;
      };
      if (versionsData.results?.[0]?.version) {
        latestSubmitted = versionsData.results[0].version;
      }
    }

    let readableStatus = status;
    if (status === "nominated") {
      readableStatus = "nominated (⏳ В очереди на проверку / In Review Queue)";
    }
    if (status === "public") {
      readableStatus = "public (✅ Опубликовано / Live)";
    }

    console.log(`  ✓ Add-on ID:        ${data.guid || "ukrlat@takeso.com"}`);
    console.log(
      `  ✓ Name:             ${data.name?.uk || data.name?.["en-US"] || "UkrLat"}`,
    );
    console.log(`  ✓ Latest Submitted: ${latestSubmitted}`);
    console.log(`  ✓ Live/Approved:    ${version}`);
    console.log(`  ✓ Status:           ${readableStatus}`);
    console.log(`  ✓ Last Updated:     ${data.last_updated}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ Mozilla AMO API error: ${msg}`);
  }
}

async function checkAppleStatus() {
  console.log("\n🍎 [Apple App Store Connect (Safari macOS)]");
  const config = getAppleApiConfig();

  if (!config) {
    console.log(
      "  ⚠️ Apple App Store Connect API credentials not configured in .env yet.",
    );
    console.log("     Add to .env:");
    console.log("       APPLE_APP_ID=6835107571");
    console.log("       APPLE_KEY_ID=your_key_id");
    console.log("       APPLE_ISSUER_ID=your_issuer_id");
    console.log("       APPLE_PRIVATE_KEY_PATH=./AuthKey_XXXXXXXXXX.p8");
    return;
  }

  try {
    const { versions, builds, submissions } = await getAppleStatus(config);

    const v = versions[0];
    if (v) {
      const state = (v.attributes?.appStoreState as string) || "UNKNOWN";
      let stateLabel = state;
      if (state === "PREPARE_FOR_SUBMISSION") {
        stateLabel = "Prepare for Submission (Черновик)";
      }
      if (state === "WAITING_FOR_REVIEW") {
        stateLabel = "Waiting for Review (⏳ В очереди на проверку)";
      }
      if (state === "IN_REVIEW") {
        stateLabel = "In Review (🔍 Проверяется модератором Apple)";
      }
      if (state === "READY_FOR_SALE") {
        stateLabel = "Ready for Sale (✅ Опубликовано)";
      }
      if (state === "REJECTED") {
        stateLabel = "Rejected (❌ Отклонено)";
      }

      console.log(
        `  ✓ App Store Version: ${(v.attributes?.versionString as string) || "1.0"}`,
      );
      console.log(`  ✓ Version State:     ${stateLabel}`);
    }

    const b = builds[0];
    if (b) {
      const procState = (b.attributes?.processingState as string) || "UNKNOWN";
      console.log(
        `  ✓ Latest Build:      ${b.attributes?.version} (${b.attributes?.uploadedDate})`,
      );
      console.log(
        `  ✓ Build Processing:  ${procState === "VALID" ? "VALID (✅ Обработана)" : procState}`,
      );
    }

    const sub = submissions[0];
    if (sub) {
      console.log(`  ✓ Review Submission: State: ${sub.attributes?.state}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ Apple API error: ${msg}`);
  }
}

async function main() {
  console.log("==========================================");
  console.log("🚀 UkrLat Multi-Store Live Status Dashboard");
  console.log("==========================================");

  await checkChromeStatus();
  await checkFirefoxStatus();
  await checkAppleStatus();

  console.log("\n==========================================");
}

main().catch(console.error);
