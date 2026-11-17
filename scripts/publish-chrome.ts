import { join } from "node:path";

const rootDir = join(import.meta.dir, "..");
const extDir = join(rootDir, "extension");
const chromeZip = join(extDir, "dist", "ukrlat-chrome.zip");

function getCleanEnv(
  extraEnv: Record<string, string> = {},
): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {
    ...process.env,
    ...extraEnv,
  };
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
  extraEnv: Record<string, string> = {},
): Promise<number> {
  console.log(`  $ ${cmd.join(" ")}`);
  const proc = Bun.spawn(cmd, {
    cwd,
    env: getCleanEnv(extraEnv),
    stdout: "inherit",
    stderr: "inherit",
  });
  return await proc.exited;
}

async function publishChrome() {
  console.log("\n🌐 === UkrLat Chrome Web Store Upload ===");

  const extensionId = process.env.CHROME_EXTENSION_ID?.trim();
  const publisherId =
    process.env.CHROME_PUBLISHER_ID?.trim() ||
    "2eac7970-16dc-4341-9754-ea8698fc781d";
  const clientId = process.env.CHROME_CLIENT_ID?.trim();
  const clientSecret = process.env.CHROME_CLIENT_SECRET?.trim();
  const refreshToken = process.env.CHROME_REFRESH_TOKEN?.trim();

  if (!extensionId || !clientId || !clientSecret || !refreshToken) {
    console.error(
      "\n❌ Missing Chrome Web Store API credentials in environment or .env!",
    );
    console.error("Please add the following to your .env file:");
    console.error("  CHROME_EXTENSION_ID=abcdefghijklmnopqrstuvwxyz123456");
    console.error("  CHROME_PUBLISHER_ID=2eac7970-16dc-4341-9754-ea8698fc781d");
    console.error(
      "  CHROME_CLIENT_ID=your_oauth_client_id.apps.googleusercontent.com",
    );
    console.error("  CHROME_CLIENT_SECRET=your_oauth_client_secret");
    console.error("  CHROME_REFRESH_TOKEN=your_oauth_refresh_token");
    console.error(
      "\nSetup guide: https://github.com/fregante/chrome-webstore-upload/blob/main/How%20to%20generate%20Google%20API%20keys.md\n",
    );
    process.exit(1);
  }

  // 1. Build extension for Chrome
  console.log("\n[1/2] Building Chrome extension bundle & zip...");
  const buildStatus = await runCommand(["bun", "run", "build:chrome"], extDir);
  if (buildStatus !== 0) {
    console.error("❌ Chrome extension build failed.");
    process.exit(1);
  }

  // 2. Upload and publish to Chrome Web Store
  console.log("\n[2/2] Uploading and publishing to Chrome Web Store...");
  const uploadCmd = [
    "bunx",
    "chrome-webstore-upload",
    `--source=${chromeZip}`,
    `--extension-id=${extensionId}`,
    `--publisher-id=${publisherId}`,
  ];

  const uploadCode = await runCommand(uploadCmd, rootDir, {
    CLIENT_ID: clientId,
    CLIENT_SECRET: clientSecret,
    REFRESH_TOKEN: refreshToken,
    EXTENSION_ID: extensionId,
    PUBLISHER_ID: publisherId,
  });
  if (uploadCode !== 0) {
    console.error(
      `❌ Chrome Web Store upload failed with exit code ${uploadCode}`,
    );
    process.exit(uploadCode);
  }

  console.log("\n🎉 Chrome extension uploaded and published successfully!");
}

publishChrome().catch((err) => {
  console.error("Chrome publication error:", err);
  process.exit(1);
});
