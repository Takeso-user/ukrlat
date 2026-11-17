import { spawn } from "bun";

console.log("🧪 Запуск всех тестов UkrLat...\n");

const proc = spawn(
  [
    "bun",
    "test",
    "tests/transliterate.test.ts",
    "extension/tests/extension.test.ts",
    "extension/tests/lang-detect.test.ts",
  ],
  {
    stdout: "inherit",
    stderr: "inherit",
  },
);

const code = await proc.exited;
if (code !== 0) {
  process.exit(code);
}
console.log("\n✅ Все тесты успешно пройдены!");
