import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getAppleApiConfig,
  getAppleStatus,
  submitForReview,
} from "./apple-api";

const rootDir = join(import.meta.dir, "..");
const extDir = join(rootDir, "extension");
const distDir = join(extDir, "dist");
const xcodeProj = join(distDir, "safari-xcode", "UkrLat", "UkrLat.xcodeproj");
const archivePath = join(distDir, "UkrLat.xcarchive");
const exportOptionsPlist = join(rootDir, "scripts", "exportOptions.plist");

function getCleanEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.BUN_INSPECT;
  delete env.BUN_INSPECT_PORT;
  delete env.BUN_INSPECT_NOTIFY;
  delete env.BUN_INSPECT_SOCKET;
  delete env.NODE_OPTIONS;
  delete env.VSCODE_INSPECTOR_OPTIONS;
  return env;
}

async function runCommand(
  cmd: string[],
  cwd: string = rootDir,
): Promise<number> {
  console.log(`  $ ${cmd.join(" ")}`);
  const proc = Bun.spawn(cmd, {
    cwd,
    env: getCleanEnv(),
    stdout: "inherit",
    stderr: "inherit",
  });
  return await proc.exited;
}

async function publishSafari() {
  console.log("\n🍎 === UkrLat Safari Extension App Store Upload ===");

  // 1. Build extension for Safari
  console.log("\n[1/3] Building Safari extension bundle...");
  const buildStatus = await runCommand(["bun", "run", "build:safari"], extDir);
  if (buildStatus !== 0) {
    console.error("❌ Safari extension build failed.");
    process.exit(1);
  }

  if (!existsSync(xcodeProj)) {
    console.error(`❌ Xcode project not found at: ${xcodeProj}`);
    process.exit(1);
  }

  // 2. Archive using xcodebuild with automatic signing
  console.log("\n[2/3] Archiving Xcode project with xcodebuild...");
  const archiveCmd = [
    "xcodebuild",
    "-project",
    xcodeProj,
    "-scheme",
    "UkrLat (macOS)",
    "-configuration",
    "Release",
    "-archivePath",
    archivePath,
    "-allowProvisioningUpdates",
    "DEVELOPMENT_TEAM=YX94DR995G",
    "archive",
  ];

  const archiveCode = await runCommand(archiveCmd);
  if (archiveCode !== 0) {
    console.error(
      "❌ Xcode archive failed. Ensure your Apple Developer team is selected in Xcode.",
    );
    process.exit(1);
  }
  console.log(`  ✓ Archive created at: ${archivePath}`);

  // 3. Upload to App Store Connect
  console.log("\n[3/3] Uploading archive to App Store Connect via CLI...");
  const uploadCmd = [
    "xcodebuild",
    "-exportArchive",
    "-archivePath",
    archivePath,
    "-exportOptionsPlist",
    exportOptionsPlist,
    "-allowProvisioningUpdates",
  ];

  const uploadCode = await runCommand(uploadCmd);
  if (uploadCode !== 0) {
    console.warn(
      "\n⚠️ Direct xcodebuild export upload exited with code",
      uploadCode,
    );
    console.log(
      "Tip: If two-factor authentication or app-specific password is required, you can also use xcrun altool:",
    );
    console.log(
      "  xcrun altool --upload-app -f <path-to-pkg/app> -t osx --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>",
    );
    console.log(`Or open the archive directly in Xcode Organizer:`);
    console.log(`  open ${archivePath}`);
    process.exit(uploadCode);
  }

  console.log(
    "\n🎉 Safari extension uploaded to App Store Connect successfully!",
  );

  // 4. Automated submission via App Store Connect REST API if configured
  const appleConfig = getAppleApiConfig();
  if (appleConfig) {
    console.log(
      "\n[4/4] Automating App Store Connect review submission via API...",
    );
    try {
      const { versions } = await getAppleStatus(appleConfig);
      const latestVersion = versions[0];
      if (
        latestVersion &&
        latestVersion.attributes?.appStoreState === "PREPARE_FOR_SUBMISSION"
      ) {
        console.log(
          `  Submitting version ${latestVersion.attributes.versionString} for review...`,
        );
        await submitForReview(appleConfig, latestVersion.id);
        console.log("  ✓ Successfully submitted to App Review via API!");
      } else {
        console.log(
          `  Version state is: ${latestVersion?.attributes?.appStoreState || "READY"}`,
        );
      }
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
      console.warn("  ⚠️ Auto-submission note:", msg);
      console.log(
        "  (The build was uploaded to App Store Connect, you can also submit it manually in Connect)",
      );
    }
  } else {
    console.log(
      "\n💡 Tip: To automate submitting for review without opening the browser, configure APPLE_KEY_ID, APPLE_ISSUER_ID, and APPLE_PRIVATE_KEY_PATH in .env.",
    );
  }
}

publishSafari().catch((err) => {
  console.error("Safari publication error:", err);
  process.exit(1);
});
