import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const rootDir = import.meta.dir;
const distDir = join(rootDir, "dist");
const srcDir = join(rootDir, "src");
const manifestsDir = join(rootDir, "manifests");

type BrowserTarget = "firefox" | "chrome" | "safari";

const args = process.argv.slice(2);
const targetArg = args.find((a) => a.startsWith("--target="))?.split("=")[1] as
  | BrowserTarget
  | undefined;
const targets: BrowserTarget[] = targetArg
  ? [targetArg]
  : ["firefox", "chrome", "safari"];

async function bundleCode(outTargetDir: string) {
  const result = await Bun.build({
    entrypoints: [
      join(srcDir, "background", "background.ts"),
      join(srcDir, "content", "content.ts"),
      join(srcDir, "popup", "popup.ts"),
    ],
    outdir: outTargetDir,
    naming: "[name].js",
    target: "browser",
    minify: true,
  });

  if (!result.success) {
    console.error("Build failed:", result.logs);
    throw new Error("Bun build failed");
  }
}

function copyStaticAssets(target: BrowserTarget, outTargetDir: string) {
  // Copy popup assets
  cpSync(join(srcDir, "popup", "popup.html"), join(outTargetDir, "popup.html"));
  cpSync(join(srcDir, "popup", "popup.css"), join(outTargetDir, "popup.css"));

  // Copy icons
  cpSync(join(srcDir, "icons"), join(outTargetDir, "icons"), {
    recursive: true,
  });

  // Copy locales
  cpSync(join(srcDir, "_locales"), join(outTargetDir, "_locales"), {
    recursive: true,
  });

  // Copy manifest
  const manifestFile =
    target === "firefox" ? "manifest.firefox.json" : "manifest.chrome.json";
  cpSync(join(manifestsDir, manifestFile), join(outTargetDir, "manifest.json"));
}

async function createZip(sourceDir: string, zipPath: string) {
  // Use system zip command
  const proc = Bun.spawn(["zip", "-r", "-q", zipPath, "."], {
    cwd: sourceDir,
  });
  await proc.exited;
}

async function buildTarget(target: BrowserTarget) {
  console.log(
    `\n📦 Building UkrLat Extension for [${target.toUpperCase()}]...`,
  );
  const outTargetDir = join(distDir, target);

  if (existsSync(outTargetDir)) {
    rmSync(outTargetDir, { recursive: true, force: true });
  }
  mkdirSync(outTargetDir, { recursive: true });

  await bundleCode(outTargetDir);
  copyStaticAssets(target, outTargetDir);

  const zipPath = join(distDir, `ukrlat-${target}.zip`);
  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }
  await createZip(outTargetDir, zipPath);
  console.log(`  ✓ Built: ${outTargetDir}`);
  console.log(`  ✓ Packaged Store Archive: ${zipPath}`);

  // For Safari, generate native Xcode project using safari-web-extension-converter if not present
  if (target === "safari") {
    const xcodeOutDir = join(distDir, "safari-xcode");
    const existingProj = join(xcodeOutDir, "UkrLat", "UkrLat.xcodeproj");
    const forceRecreate = args.includes("--force-recreate");

    if (!existsSync(existingProj) || forceRecreate) {
      if (existsSync(xcodeOutDir)) {
        rmSync(xcodeOutDir, { recursive: true, force: true });
      }
      mkdirSync(xcodeOutDir, { recursive: true });

      console.log(
        `  🍎 Generating Safari Xcode Project with safari-web-extension-converter...`,
      );
      const proc = Bun.spawn([
        "xcrun",
        "safari-web-extension-converter",
        outTargetDir,
        "--project-location",
        xcodeOutDir,
        "--app-name",
        "UkrLat",
        "--bundle-identifier",
        "com.takeso.ukrlat",
        "--swift",
        "--no-open",
        "--force",
      ]);

      const exitCode = await proc.exited;
      if (exitCode === 0) {
        console.log(
          `  ✓ Safari Xcode project generated at: ${xcodeOutDir}/UkrLat`,
        );
      } else {
        console.warn(
          `  ⚠️ safari-web-extension-converter finished with code ${exitCode}`,
        );
      }
    } else {
      console.log(`  ✓ Preserving existing Safari Xcode project at: ${existingProj}`);
    }
  }
}

async function main() {
  console.log("🚀 Starting UkrLat Browser Extension Build...");
  mkdirSync(distDir, { recursive: true });

  for (const target of targets) {
    await buildTarget(target);
  }

  console.log("\n✨ All builds completed successfully!");
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
