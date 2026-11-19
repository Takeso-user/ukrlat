import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  attachBuildToVersion,
  cancelAppleReviewSubmission,
  getAppleApiConfig,
  getAppleStatus,
  submitForReview,
  updateAppleVersionString,
  waitForValidBuild,
} from "./apple-api";

const rootDir = join(import.meta.dir, "..");
const extDir = join(rootDir, "extension");
const distDir = join(extDir, "dist");
const xcodeProj = join(distDir, "safari-xcode", "UkrLat", "UkrLat.xcodeproj");
const xcprojFile = join(xcodeProj, "project.xcproj");
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

  const appleConfig = getAppleApiConfig();
  const rootPkg = JSON.parse(
    readFileSync(join(rootDir, "package.json"), "utf-8"),
  ) as { version?: string };
  const pkgVersion = rootPkg.version || "1.0.0";

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

  // Ensure Xcode MARKETING_VERSION & CURRENT_PROJECT_VERSION are up to date and higher than any build in App Store Connect
  let buildNum = 2;
  if (existsSync(xcprojFile)) {
    const rawXcproj = readFileSync(xcprojFile, "utf-8");
    const matchBuild = rawXcproj.match(/"CURRENT_PROJECT_VERSION":\s*"(\d+)"/);
    if (matchBuild?.[1]) {
      buildNum = Number.parseInt(matchBuild[1], 10) || 2;
    }
  }

  let alreadyUploadedValidBuildNum: number | null = null;
  if (appleConfig && !process.argv.includes("--force-upload")) {
    try {
      const { builds } = await getAppleStatus(appleConfig);
      for (const b of builds) {
        const uploadedBuild = Number.parseInt(
          String(b.attributes?.version || "0"),
          10,
        );
        const uploadedDate = String(b.attributes?.uploadedDate || "");
        const state = String(b.attributes?.processingState || "");
        const ageMs = uploadedDate
          ? Date.now() - new Date(uploadedDate).getTime()
          : Number.POSITIVE_INFINITY;

        if (
          !Number.isNaN(uploadedBuild) &&
          state === "VALID" &&
          ageMs < 30 * 60 * 1000
        ) {
          alreadyUploadedValidBuildNum = uploadedBuild;
          buildNum = uploadedBuild;
          break;
        }
        if (!Number.isNaN(uploadedBuild) && uploadedBuild >= buildNum) {
          buildNum = uploadedBuild + 1;
        }
      }
    } catch {
      // Non-blocking if offline
    }
  }

  if (existsSync(xcprojFile)) {
    let rawXcproj = readFileSync(xcprojFile, "utf-8");
    rawXcproj = rawXcproj.replace(
      /"MARKETING_VERSION":\s*"[^"]+"/g,
      `"MARKETING_VERSION": "${pkgVersion}"`,
    );
    rawXcproj = rawXcproj.replace(
      /"CURRENT_PROJECT_VERSION":\s*"\d+"/g,
      `"CURRENT_PROJECT_VERSION": "${buildNum}"`,
    );
    writeFileSync(xcprojFile, rawXcproj, "utf-8");
    console.log(
      `  ✓ Синхронизирован Xcode: версия ${pkgVersion}, билд #${buildNum}`,
    );
  }

  const authFlags: string[] = [];
  if (
    appleConfig?.keyId &&
    appleConfig?.issuerId &&
    appleConfig?.privateKeyPath
  ) {
    const absKeyPath = resolve(rootDir, appleConfig.privateKeyPath);
    authFlags.push(
      "-authenticationKeyPath",
      absKeyPath,
      "-authenticationKeyID",
      appleConfig.keyId,
      "-authenticationKeyIssuerID",
      appleConfig.issuerId,
    );
  }

  if (alreadyUploadedValidBuildNum !== null) {
    console.log(
      `\n[2/3 & 3/3] ⏭️ В App Store Connect уже загружена свежая обработанная сборка #${alreadyUploadedValidBuildNum} (VALID) — переходим сразу к привязке к версии ${pkgVersion}!`,
    );
  } else {
    // 2. Archive using xcodebuild with automatic signing
    console.log("\n[2/3] Archiving Xcode project with xcodebuild...");
    const archiveCmd = [
      "xcodebuild",
      "-project",
      xcodeProj,
      "-scheme",
      "UkrLat (macOS)",
      "-destination",
      "generic/platform=macOS",
      "-configuration",
      "Release",
      "-archivePath",
      archivePath,
      "-allowProvisioningUpdates",
      "DEVELOPMENT_TEAM=YX94DR995G",
      `MARKETING_VERSION=${pkgVersion}`,
      `CURRENT_PROJECT_VERSION=${buildNum}`,
      ...authFlags,
      "-quiet",
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
      ...authFlags,
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
      console.log("Or open the archive directly in Xcode Organizer:");
      console.log(`  open ${archivePath}`);
      process.exit(uploadCode);
    }

    console.log(
      "\n🎉 Safari extension uploaded to App Store Connect successfully!",
    );
  }

  // 4. Automated submission via App Store Connect REST API if configured
  if (appleConfig) {
    console.log(
      "\n[4/4] Automating App Store Connect review submission via API...",
    );
    try {
      const { versions, submissions, builds } =
        await getAppleStatus(appleConfig);
      const latestVersion = versions[0] || {
        id: "129bc1a2-0dd7-42b7-b9e3-1aab8a16c74d",
        type: "appStoreVersions",
        attributes: {
          versionString: pkgVersion,
          appStoreState: "WAITING_FOR_REVIEW",
        },
      };
      const activeSub = submissions.find(
        (s) =>
          s.attributes?.state === "WAITING_FOR_REVIEW" ||
          s.attributes?.state === "READY_FOR_REVIEW",
      );

      if (
        activeSub ||
        latestVersion.attributes?.appStoreState === "WAITING_FOR_REVIEW"
      ) {
        console.log(
          `  ℹ️ Обнаружена предыдущая заявка на модерации (WAITING_FOR_REVIEW). Отменяем её через Apple API для замены на сборку #${buildNum} (${pkgVersion})...`,
        );
        await cancelAppleReviewSubmission(
          appleConfig,
          activeSub?.id || "f14565c5-a777-4fd8-bf7a-96096e3dfd3c",
          latestVersion.id,
        );
        console.log("  ✓ Предыдущая заявка успешно отменена, ожидаем 3 сек...");
        await new Promise((r) => setTimeout(r, 3000));
      }

      if (latestVersion) {
        const currentVerStr = String(
          latestVersion.attributes?.versionString || "",
        );
        if (currentVerStr !== pkgVersion) {
          console.log(
            `  🔄 Обновляем номер версии в App Store Connect: ${currentVerStr} ➔ ${pkgVersion}...`,
          );
          await updateAppleVersionString(
            appleConfig,
            latestVersion.id,
            pkgVersion,
          );
          console.log(`  ✓ Номер версии обновлен на ${pkgVersion}`);
        }

        const existingValid = builds.find(
          (b) =>
            String(b.attributes?.version) === String(buildNum) &&
            b.attributes?.processingState === "VALID",
        );
        const validBuild =
          existingValid ||
          (await waitForValidBuild(appleConfig, String(buildNum)));
        if (validBuild) {
          console.log(
            `  🔗 Прикрепляем сборку #${buildNum} к версии ${pkgVersion}...`,
          );
          await attachBuildToVersion(
            appleConfig,
            latestVersion.id,
            validBuild.id,
          );
          console.log(
            `  🚀 Отправляем версию ${pkgVersion} на проверку в App Review...`,
          );
          await submitForReview(appleConfig, latestVersion.id);
          console.log(
            `  ✓ Версия ${pkgVersion} (сборка #${buildNum}) успешно отправлена на модерацию в App Store Connect!`,
          );
        } else {
          console.log(
            `  ℹ️ Сборка #${buildNum} (${pkgVersion}) загружена и еще обрабатывается серверами Apple.`,
          );
        }
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
