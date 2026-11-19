import crypto from "node:crypto";
import {
  type AppleResource,
  fetchAppleApi,
  getAppleApiConfig,
  updateApplePrivacyPolicyUrl,
} from "./apple-api";

const PRIVACY_POLICY_URL = "https://ukrlat.uk/privacy";
const AMO_ADDON_SLUG = "ukrlat@takeso.com";

function createAmoJwt(issuer: string, secret: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: issuer,
      jti: Math.random().toString(),
      iat: now,
      exp: now + 60,
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function syncApplePrivacyUrl(): Promise<void> {
  console.log("\n🍎 [Apple App Store Connect (Safari macOS)]");
  const config = getAppleApiConfig();
  if (!config) {
    throw new Error(
      "Apple App Store Connect API credentials are not configured.",
    );
  }

  const updated = await updateApplePrivacyPolicyUrl(config, PRIVACY_POLICY_URL);
  console.log(`  ✓ PATCH обновлений локализаций: ${updated.length}`);

  // Read-back verification
  const infosRes = await fetchAppleApi(
    `/apps/${config.appId}/appInfos`,
    config,
  );
  const infos = (infosRes.data || []) as AppleResource[];
  for (const info of infos) {
    const locsRes = await fetchAppleApi(
      `/appInfos/${info.id}/appInfoLocalizations`,
      config,
    );
    const locs = (locsRes.data || []) as AppleResource[];
    for (const loc of locs) {
      console.log(
        `  ✓ Read-back [${loc.id}] locale=${loc.attributes?.locale}: privacyPolicyUrl=${loc.attributes?.privacyPolicyUrl}`,
      );
    }
  }
}

async function syncAmoPrivacyPolicy(): Promise<void> {
  console.log("\n🦊 [Mozilla Firefox Add-ons (AMO)]");
  const issuer = process.env.AMO_JWT_ISSUER?.trim();
  const secret = process.env.AMO_JWT_SECRET?.trim();
  if (!issuer || !secret) {
    throw new Error("AMO_JWT_ISSUER or AMO_JWT_SECRET is missing in .env");
  }

  const jwtPatch = createAmoJwt(issuer, secret);
  const patchRes = await fetch(
    `https://addons.mozilla.org/api/v5/addons/addon/${AMO_ADDON_SLUG}/eula_policy/`,
    {
      method: "PATCH",
      headers: {
        Authorization: `JWT ${jwtPatch}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        privacy_policy: {
          uk: `Розширення UkrLat — Українська латинка працює 100% локально у вашому браузері та не збирає, не зберігає на зовнішніх серверах і не передає третім особам жодних персональних даних, історії перегляду чи вмісту сторінок.\n\nПовний текст політики конфіденційності: ${PRIVACY_POLICY_URL}`,
          "en-US": `The UkrLat — Українська латинка extension runs 100% locally in your browser and does not collect, store remotely, transmit, or share any personal data, browsing history, or page contents.\n\nFull Privacy Policy: ${PRIVACY_POLICY_URL}`,
        },
      }),
    },
  );

  if (!patchRes.ok) {
    const errBody = await patchRes.text().catch(() => "");
    throw new Error(
      `Mozilla AMO PATCH /eula_policy/ failed: HTTP ${patchRes.status} ${patchRes.statusText} — ${errBody}`,
    );
  }
  console.log("  ✓ PATCH /eula_policy/ выполнен успешно");

  // Read-back verification
  const jwtRead = createAmoJwt(issuer, secret);
  const addonRes = await fetch(
    `https://addons.mozilla.org/api/v5/addons/addon/${AMO_ADDON_SLUG}/`,
    { headers: { Authorization: `JWT ${jwtRead}` } },
  );
  if (!addonRes.ok) {
    throw new Error(`Mozilla AMO GET addon failed: HTTP ${addonRes.status}`);
  }
  const addonData = (await addonRes.json()) as {
    has_privacy_policy?: boolean;
  };

  const policyRes = await fetch(
    `https://addons.mozilla.org/api/v5/addons/addon/${AMO_ADDON_SLUG}/eula_policy/`,
    { headers: { Authorization: `JWT ${jwtRead}` } },
  );
  if (!policyRes.ok) {
    throw new Error(
      `Mozilla AMO GET /eula_policy/ failed: HTTP ${policyRes.status}`,
    );
  }
  const policyData = (await policyRes.json()) as {
    privacy_policy?: Record<string, string> | null;
  };

  console.log(
    `  ✓ Read-back addon.has_privacy_policy = ${addonData.has_privacy_policy}`,
  );
  console.log(
    `  ✓ Read-back eula_policy.privacy_policy = ${JSON.stringify(policyData.privacy_policy, null, 2)}`,
  );
}

async function main() {
  console.log("==========================================");
  console.log("🔒 Sync Privacy Policy URL across Stores");
  console.log(`   URL: ${PRIVACY_POLICY_URL}`);
  console.log("==========================================");

  await syncApplePrivacyUrl();
  await syncAmoPrivacyPolicy();

  console.log("\n✅ Готово!");
}

main().catch((err) => {
  console.error("\n❌ Error syncing privacy policy:", err);
  process.exit(1);
});
