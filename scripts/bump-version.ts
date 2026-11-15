import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import semver from "semver";

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

function bumpVersion() {
  const arg = process.argv[2] || "patch";
  const validTypes = ["patch", "minor", "major"] as const;

  const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf-8")) as {
    version?: string;
  };
  const currentVersion = rootPkg.version || "1.0.0";

  let nextVersion: string | null = null;

  if (validTypes.includes(arg as (typeof validTypes)[number])) {
    nextVersion = semver.inc(
      currentVersion,
      arg as "patch" | "minor" | "major",
    );
  } else if (semver.valid(arg)) {
    nextVersion = arg;
  } else {
    console.error(
      `❌ Invalid semver bump type or version: "${arg}". Use 'patch', 'minor', 'major' or '1.2.3'.`,
    );
    process.exit(1);
  }

  if (!nextVersion) {
    console.error("❌ Failed to calculate next semver version.");
    process.exit(1);
  }

  console.log(`\n🔖 Bumping version: ${currentVersion} ➔ ${nextVersion}`);

  // 1. Root package.json
  updateJsonFile(rootPkgPath, (pkg) => {
    pkg.version = nextVersion;
  });
  console.log(`  ✓ Updated package.json`);

  // 2. Extension package.json
  updateJsonFile(extPkgPath, (pkg) => {
    pkg.version = nextVersion;
  });
  console.log(`  ✓ Updated extension/package.json`);

  // 3. Firefox Manifest
  updateJsonFile(ffManifestPath, (manifest) => {
    manifest.version = nextVersion;
  });
  console.log(`  ✓ Updated extension/manifests/manifest.firefox.json`);

  // 4. Chrome Manifest
  updateJsonFile(chromeManifestPath, (manifest) => {
    manifest.version = nextVersion;
  });
  console.log(`  ✓ Updated extension/manifests/manifest.chrome.json`);

  // 5. Safari Xcode project if already generated
  if (existsSync(xcodeProjPath)) {
    let pbx = readFileSync(xcodeProjPath, "utf-8");
    pbx = pbx.replace(
      /MARKETING_VERSION = [^;]+;/g,
      `MARKETING_VERSION = ${nextVersion};`,
    );
    writeFileSync(xcodeProjPath, pbx, "utf-8");
    console.log(`  ✓ Updated Xcode project MARKETING_VERSION`);
  }

  console.log(`✨ Successfully bumped version to ${nextVersion}\n`);
  return nextVersion;
}

if (import.meta.main) {
  bumpVersion();
}

export { bumpVersion };
