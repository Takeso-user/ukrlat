import { join } from "node:path";

const rootDir = join(import.meta.dir, "..");
const extDir = join(rootDir, "extension");
const ffSourceDir = join(extDir, "dist", "firefox");

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

async function publishFirefox() {
  console.log("\n🦊 === UkrLat Firefox Extension AMO Publication ===");

  const apiKey = process.env.AMO_JWT_ISSUER?.trim();
  const apiSecret = process.env.AMO_JWT_SECRET?.trim();
  const channel = process.env.AMO_CHANNEL?.trim() || "listed";

  if (!apiKey || !apiSecret) {
    console.error("\n❌ Missing AMO credentials in environment or .env!");
    console.error("Please add the following to your .env file:");
    console.error("  AMO_JWT_ISSUER=user:12345678:999");
    console.error("  AMO_JWT_SECRET=your_mozilla_api_secret_key");
    console.error(
      "\nGet your API keys from: https://addons.mozilla.org/developers/addon/api/key/\n",
    );
    process.exit(1);
  }

  // 1. Build extension for Firefox
  console.log("\n[1/2] Building Firefox extension bundle...");
  const buildStatus = await runCommand(["bun", "run", "build:firefox"], extDir);
  if (buildStatus !== 0) {
    console.error("❌ Firefox extension build failed.");
    process.exit(1);
  }

  const metadataPath = join(extDir, "amo-metadata.json");

  // 2. Sign and submit to Mozilla Add-ons via web-ext
  console.log(`\n[2/2] Submitting to Mozilla Add-ons (${channel} channel)...`);
  const signCmd = [
    "bunx",
    "web-ext",
    "sign",
    `--source-dir=${ffSourceDir}`,
    `--api-key=${apiKey}`,
    `--api-secret=${apiSecret}`,
    `--channel=${channel}`,
    `--amo-metadata=${metadataPath}`,
    "--approval-timeout=0",
  ];

  const signCode = await runCommand(signCmd);
  if (signCode !== 0) {
    console.error(`❌ web-ext sign failed with exit code ${signCode}`);
    process.exit(signCode);
  }

  console.log(
    "\n🎉 Firefox extension submitted to Mozilla Add-ons successfully!",
  );
}

publishFirefox().catch((err) => {
  console.error("Firefox publication error:", err);
  process.exit(1);
});
