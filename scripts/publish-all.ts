import { bumpVersion } from "./bump-version";

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

async function runScript(scriptPath: string) {
  const proc = Bun.spawn(["bun", "run", scriptPath], {
    env: getCleanEnv(),
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  return exitCode;
}

async function publishAll() {
  const rawArg = process.argv[2] || "patch";
  const bumpType = rawArg.replace(/^--bump=/, "").toLowerCase();

  const labelMap: Record<string, string> = {
    patch: "МЕЛКИЙ ПАТЧ (3-я цифра: багфиксы)",
    minor: "МИНОРНАЯ ВЕРСИЯ (2-я цифра: новые функции)",
    major: "МАЖОРНАЯ ВЕРСИЯ (1-я цифра: глобальные изменения)",
  };

  const releaseLabel = labelMap[bumpType] || `РЕЛИЗ (${bumpType})`;

  console.log(
    "=================================================================",
  );
  console.log(`🚀 ДЕПЛОЙ UKRLAT ВО ВСЕ МАГАЗИНЫ: ${releaseLabel}`);
  console.log(
    "=================================================================\n",
  );

  // 1. Проверяем опубликованные версии во всех магазинах и инкрементируем SemVer
  const newVersion = await bumpVersion(bumpType, { checkStores: true });

  console.log(
    `📦 Начинаем автоматическую сборку и выгрузку версии ${newVersion}...\n`,
  );

  // 2. Firefox AMO
  console.log("▶ [1/3] Выгрузка в Mozilla Add-ons (Firefox AMO)...");
  const ffResult = await runScript("scripts/publish-firefox.ts");

  // 3. Chrome Web Store
  console.log("\n▶ [2/3] Выгрузка в Chrome Web Store...");
  const chromeResult = await runScript("scripts/publish-chrome.ts");

  // 4. Safari Mac App Store
  console.log("\n▶ [3/3] Выгрузка в Apple App Store Connect (Safari macOS)...");
  const safariResult = await runScript("scripts/publish-safari.ts");

  console.log(
    "\n=================================================================",
  );
  console.log(`📊 Итоги деплоя версии ${newVersion}:`);
  console.log(
    "=================================================================",
  );
  console.log(
    `  🦊 Firefox AMO:      ${ffResult === 0 ? "✅ Успешно выгружено" : "❌ Ошибка / Пропущено"}`,
  );
  console.log(
    `  🌐 Chrome Web Store: ${chromeResult === 0 ? "✅ Успешно выгружено" : "❌ Ошибка / Пропущено"}`,
  );
  console.log(
    `  🍎 Safari App Store: ${safariResult === 0 ? "✅ Успешно выгружено" : "❌ Ошибка / Пропущено"}`,
  );
  console.log(
    "=================================================================\n",
  );
  console.log("💡 Для детальной проверки статусов выполните: bun run status\n");
}

publishAll().catch((err) => {
  console.error("Ошибка при публикации:", err);
  process.exit(1);
});
