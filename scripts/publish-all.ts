import { bumpVersion } from "./bump-version";

async function runScript(scriptPath: string) {
  const proc = Bun.spawn(["bun", "run", scriptPath], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  return exitCode;
}

async function publishAll() {
  console.log(
    "🚀 === Publishing UkrLat Extension to All Stores (Firefox, Chrome, Safari) ===",
  );

  const args = process.argv.slice(2);
  const bumpArg = args.find((a) => a.startsWith("--bump="))?.split("=")[1];

  if (bumpArg) {
    process.argv[2] = bumpArg;
    bumpVersion();
  }

  console.log("\n▶ [1/3] Publishing to Firefox AMO...");
  const ffResult = await runScript("scripts/publish-firefox.ts");

  console.log("\n▶ [2/3] Publishing to Chrome Web Store...");
  const chromeResult = await runScript("scripts/publish-chrome.ts");

  console.log("\n▶ [3/3] Publishing to Safari App Store...");
  const safariResult = await runScript("scripts/publish-safari.ts");

  console.log("\n📊 === Summary of Store Uploads ===");
  console.log(
    `  Firefox AMO:      ${ffResult === 0 ? "✅ Success" : "❌ Failed / Skipped"}`,
  );
  console.log(
    `  Chrome Web Store: ${chromeResult === 0 ? "✅ Success" : "❌ Failed / Skipped"}`,
  );
  console.log(
    `  Safari App Store: ${safariResult === 0 ? "✅ Success" : "❌ Failed / Skipped"}`,
  );
}

publishAll().catch((err) => {
  console.error("Publish all error:", err);
  process.exit(1);
});
