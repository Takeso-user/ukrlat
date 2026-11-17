import { spawn } from "bun";

console.log("🧪 Запуск всех тестов UkrLat...\n");

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

const proc = spawn(
  [
    "bun",
    "test",
    "tests/transliterate.test.ts",
    "extension/tests/extension.test.ts",
    "extension/tests/lang-detect.test.ts",
  ],
  {
    env: getCleanEnv(),
    stdout: "inherit",
    stderr: "inherit",
  },
);

const code = await proc.exited;
if (code !== 0) {
  process.exit(code);
}
console.log("\n✅ Все тесты успешно пройдены!");
