import crypto from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import getClient from "chrome-webstore-upload";
import semver from "semver";
import { fetchAppleApi, getAppleApiConfig } from "./apple-api";

const rootDir = join(import.meta.dir, "..");
const rootPkgPath = join(rootDir, "package.json");
const extPkgPath = join(rootDir, "extension", "package.json");
const ffManifestPath = join(
  rootDir,
  "extension",
  "manifests",
  "manifest.firefox.json",
);
const chromeManifestPath = join(
  rootDir,
  "extension",
  "manifests",
  "manifest.chrome.json",
);
const xcodeProjPath = join(
  rootDir,
  "extension",
  "dist",
  "safari-xcode",
  "UkrLat",
  "UkrLat.xcodeproj",
  "project.pbxproj",
);

function updateJsonFile(
  filePath: string,
  updateFn: (data: Record<string, unknown>) => void,
) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as Record<string, unknown>;
  updateFn(data);
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export async function detectHighestVersion(): Promise<{
  highestVersion: string;
  versions: {
    local: string;
    chrome: string | null;
    firefox: string | null;
    apple: string | null;
  };
}> {
  const local =
    (JSON.parse(readFileSync(rootPkgPath, "utf-8")) as { version?: string })
      .version || "1.0.0";
  const versions = {
    local,
    chrome: null as string | null,
    firefox: null as string | null,
    apple: null as string | null,
  };

  console.log("🔍 Проверяем актуальные версии в магазинах перед деплоем...");

  // 1. Chrome Web Store
  try {
    const extId = process.env.CHROME_EXTENSION_ID?.trim();
    const pubId = process.env.CHROME_PUBLISHER_ID?.trim();
    const clientId = process.env.CHROME_CLIENT_ID?.trim();
    const clientSecret = process.env.CHROME_CLIENT_SECRET?.trim();
    const refreshToken = process.env.CHROME_REFRESH_TOKEN?.trim();

    if (extId && pubId && clientId && clientSecret && refreshToken) {
      const client = getClient({
        extensionId: extId,
        publisherId: pubId,
        clientId,
        clientSecret,
        refreshToken,
      });
      const token = await client.fetchToken();
      const res = await fetch(
        `https://www.googleapis.com/chromewebstore/v1.1/items/${extId}?projection=DRAFT`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = (await res.json()) as { crxVersion?: string };
      if (data.crxVersion && semver.valid(data.crxVersion)) {
        versions.chrome = data.crxVersion;
      }
    }
  } catch {
    // Non-blocking
  }

  // 2. Mozilla Firefox AMO
  try {
    const issuer = process.env.AMO_JWT_ISSUER?.trim();
    const secret = process.env.AMO_JWT_SECRET?.trim();

    if (issuer && secret) {
      const header = Buffer.from(
        JSON.stringify({ alg: "HS256", typ: "JWT" }),
      ).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({
          iss: issuer,
          jti: Math.random().toString(),
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 60,
        }),
      ).toString("base64url");
      const sig = crypto
        .createHmac("sha256", secret)
        .update(`${header}.${payload}`)
        .digest("base64url");

      const res = await fetch(
        "https://addons.mozilla.org/api/v5/addons/addon/ukrlat@takeso.com/",
        { headers: { Authorization: `JWT ${header}.${payload}.${sig}` } },
      );
      const data = (await res.json()) as {
        current_version?: { version?: string };
      };
      const v = data.current_version?.version;
      if (v && semver.valid(v)) {
        versions.firefox = v;
      }
    }
  } catch {
    // Non-blocking
  }

  // 3. Apple App Store Connect
  try {
    const appleConfig = getAppleApiConfig();
    if (appleConfig) {
      const data = (await fetchAppleApi(
        `/apps/${appleConfig.appId}/appStoreVersions?filter[platform]=MAC_OS`,
        appleConfig,
      )) as { data?: Array<{ attributes?: { versionString?: string } }> };
      const v = data.data?.[0]?.attributes?.versionString;
      const coerced = semver.coerce(v)?.version;
      if (coerced && semver.valid(coerced)) {
        versions.apple = coerced;
      }
    }
  } catch {
    // Non-blocking
  }

  let highestVersion = versions.local;
  for (const v of [versions.chrome, versions.firefox, versions.apple]) {
    if (v && semver.valid(v) && semver.gt(v, highestVersion)) {
      highestVersion = v;
    }
  }

  console.log(`  • Локальная версия (package.json): ${versions.local}`);
  console.log(
    `  • Chrome Web Store:                ${versions.chrome || "нет связи / не опубликовано"}`,
  );
  console.log(
    `  • Mozilla AMO:                     ${versions.firefox || "нет связи / не опубликовано"}`,
  );
  console.log(
    `  • Apple App Store:                 ${versions.apple || "нет связи / не опубликовано"}`,
  );
  console.log(`  ➔ Базовая версия для отсчета:      ${highestVersion}`);

  return { highestVersion, versions };
}

export async function bumpVersion(
  bumpType: "patch" | "minor" | "major" | string = "patch",
  options: { checkStores?: boolean } = { checkStores: true },
): Promise<string> {
  const validTypes = ["patch", "minor", "major"] as const;

  let baseVersion =
    (JSON.parse(readFileSync(rootPkgPath, "utf-8")) as { version?: string })
      .version || "1.0.0";

  if (options.checkStores) {
    const { highestVersion } = await detectHighestVersion();
    baseVersion = highestVersion;
  }

  let nextVersion: string | null = null;
  if (validTypes.includes(bumpType as (typeof validTypes)[number])) {
    nextVersion = semver.inc(
      baseVersion,
      bumpType as "patch" | "minor" | "major",
    );
  } else if (semver.valid(bumpType)) {
    nextVersion = bumpType;
  } else {
    throw new Error(
      `❌ Неверный тип инкремента: "${bumpType}". Используйте 'patch', 'minor', 'major' или конкретную версию (например, '1.2.3').`,
    );
  }

  if (!nextVersion) {
    throw new Error("❌ Не удалось вычислить следующую версию.");
  }

  console.log(`\n🔖 Автоинкремент версии: ${baseVersion} ➔ ${nextVersion}`);

  // 1. Root package.json
  updateJsonFile(rootPkgPath, (pkg) => {
    pkg.version = nextVersion;
  });
  console.log("  ✓ Обновлен package.json");

  // 2. Extension package.json
  updateJsonFile(extPkgPath, (pkg) => {
    pkg.version = nextVersion;
  });
  console.log("  ✓ Обновлен extension/package.json");

  // 3. Firefox Manifest
  updateJsonFile(ffManifestPath, (manifest) => {
    manifest.version = nextVersion;
  });
  console.log("  ✓ Обновлен extension/manifests/manifest.firefox.json");

  // 4. Chrome Manifest
  updateJsonFile(chromeManifestPath, (manifest) => {
    manifest.version = nextVersion;
  });
  console.log("  ✓ Обновлен extension/manifests/manifest.chrome.json");

  // 5. Safari Xcode project if already generated
  if (existsSync(xcodeProjPath)) {
    let pbx = readFileSync(xcodeProjPath, "utf-8");
    pbx = pbx.replace(
      /MARKETING_VERSION = [^;]+;/g,
      `MARKETING_VERSION = ${nextVersion};`,
    );
    const matchBuild = pbx.match(/CURRENT_PROJECT_VERSION = (\d+);/);
    if (matchBuild?.[1]) {
      const currentBuild = Number.parseInt(matchBuild[1], 10) || 1;
      const nextBuild = currentBuild + 1;
      pbx = pbx.replace(
        /CURRENT_PROJECT_VERSION = \d+;/g,
        `CURRENT_PROJECT_VERSION = ${nextBuild};`,
      );
      console.log(
        `  ✓ Обновлен Xcode: маркетинговая версия ${nextVersion}, билд #${nextBuild}`,
      );
    } else {
      console.log(`  ✓ Обновлен Xcode: маркетинговая версия ${nextVersion}`);
    }
    writeFileSync(xcodeProjPath, pbx, "utf-8");
  }

  console.log(`✨ Успешно установлена версия ${nextVersion}\n`);
  return nextVersion;
}

if (import.meta.main) {
  const arg = process.argv[2] || "patch";
  await bumpVersion(arg, { checkStores: true });
}
