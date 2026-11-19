import { cpSync, existsSync, mkdirSync, rmSync, utimesSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { buildKeyboardBundle, bundleDir } from "./build";

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

function resolveTargetDir(explicitTargetDir?: string): string {
  if (explicitTargetDir) {
    return resolve(explicitTargetDir);
  }

  const destArg = process.argv.find((arg) => arg.startsWith("--dest="));
  if (destArg) {
    return resolve(destArg.slice("--dest=".length));
  }

  const envDest = process.env.UKRLAT_KEYBOARD_DEST?.trim();
  if (envDest) {
    return resolve(envDest);
  }

  if (process.argv.includes("--system")) {
    return "/Library/Keyboard Layouts";
  }

  return join(homedir(), "Library", "Keyboard Layouts");
}

async function registerWithMacOSTIS(
  installedPath: string,
): Promise<{ ok: boolean; status?: number; details?: string }> {
  const swiftScript = `
import Carbon
import Foundation
guard let path = ProcessInfo.processInfo.environment["UKRLAT_BUNDLE_PATH"] else { exit(2) }
let url = URL(fileURLWithPath: path) as CFURL
let status = TISRegisterInputSource(url)
print("STATUS=\\(status)")
if status != noErr { exit(1) }
let list = TISCreateInputSourceList(nil, true).takeRetainedValue() as! [TISInputSource]
var found = false
var hasUchr = false
for src in list {
    guard let ptr = TISGetInputSourceProperty(src, kTISPropertyBundleID) else { continue }
    let bid = Unmanaged<CFString>.fromOpaque(ptr).takeUnretainedValue() as String
    if bid == "com.takeso.keyboardlayout.ukrlat" {
        found = true
        hasUchr = TISGetInputSourceProperty(src, kTISPropertyUnicodeKeyLayoutData) != nil
        break
    }
}
print("FOUND=\\(found) UCHR=\\(hasUchr)")
if !found || !hasUchr { exit(3) }
`;
  try {
    const proc = Bun.spawn(["swift", "-e", swiftScript], {
      env: { ...getCleanEnv(), UKRLAT_BUNDLE_PATH: installedPath },
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const statusMatch = stdout.match(/STATUS=(-?\d+)/);
    const statusStr = statusMatch?.[1];
    const status =
      statusStr !== undefined ? Number.parseInt(statusStr, 10) : undefined;
    if (
      exitCode === 0 &&
      status === 0 &&
      stdout.includes("FOUND=true") &&
      stdout.includes("UCHR=true")
    ) {
      return { ok: true, status };
    }
    return {
      ok: false,
      status,
      details: (stderr || stdout).trim(),
    };
  } catch (err) {
    return {
      ok: false,
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function installKeyboardBundle(
  explicitTargetDir?: string,
): Promise<string> {
  const isTestOverride = Boolean(
    explicitTargetDir ||
      process.env.UKRLAT_KEYBOARD_DEST ||
      process.argv.some((a) => a.startsWith("--dest=")),
  );
  const targetDir = resolveTargetDir(explicitTargetDir);
  const installedPath = join(targetDir, "UkrLat.bundle");

  if (!existsSync(bundleDir) || !isTestOverride) {
    await buildKeyboardBundle();
  }

  mkdirSync(targetDir, { recursive: true });
  if (existsSync(installedPath)) {
    rmSync(installedPath, { recursive: true, force: true });
  }
  cpSync(bundleDir, installedPath, { recursive: true });

  const now = new Date();
  utimesSync(targetDir, now, now);

  const plistPath = join(installedPath, "Contents", "Info.plist");
  const proc = Bun.spawn(["plutil", "-lint", plistPath], {
    env: getCleanEnv(),
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const errText = await new Response(proc.stderr).text();
    throw new Error(
      `Проверка Info.plist не пройдена (${exitCode}): ${errText}`,
    );
  }

  if (!isTestOverride) {
    let tisResult: { ok: boolean; status?: number; details?: string } | null =
      null;
    if (process.platform === "darwin") {
      console.log("⏳ Ожидание синхронизации FSEvents macOS...");
      await Bun.sleep(4000);
      tisResult = await registerWithMacOSTIS(installedPath);
    }

    console.log(
      "=================================================================",
    );
    console.log("✅ Раскладка UkrLat успешно установлена в систему macOS!");
    console.log(
      "=================================================================",
    );
    console.log(`📁 Путь установки: ${installedPath}`);
    if (tisResult?.ok) {
      console.log(
        "✓ Раскладка зарегистрирована в macOS TIS (без перезагрузки)",
      );
    } else if (tisResult) {
      console.log(
        `⚠️ Не удалось мгновенно зарегистрировать через TISRegisterInputSource (${tisResult.status ?? "ошибка"}${tisResult.details ? `: ${tisResult.details}` : ""}). Перелогиньтесь или перезагрузите Mac.`,
      );
    }
    console.log("\n📌 Следующие шаги для активации в macOS:");
    console.log(
      "  1. Закройте (Cmd+Q) и снова откройте «Системные настройки» → Клавиатура → Источники ввода → Изменить…",
    );
    console.log(
      "     (Если раскладка не появилась из-за кэша, выйдите из учетной записи или перезагрузите Mac.)",
    );
    console.log(
      "  2. Нажмите «+» → выберите язык «Українська» (Ukrainian) → добавьте «UkrLat».",
    );
    console.log("\n⌨️ Быстрая шпаргалка (аккорд Option ⌥ + клавиша):");
    console.log("  • Йотированные и ґ:  ⌥+A=â  ⌥+E=ê  ⌥+I=î  ⌥+U=û  ⌥+G=ĝ");
    console.log("  • Шипящие и щ:       ⌥+C=č  ⌥+S=š  ⌥+Z=ž  ⌥+Q=šč");
    console.log("  • Мягкие согласные:  ⌥+D=ď  ⌥+T=ť  ⌥+L=ĺ  ⌥+N=ń  ⌥+R=ŕ");
    console.log(
      "  • Мягкие коллизии:   ⌥+W=ś (над S)  ⌥+X=ź (рядом с Z)  ⌥+V=ć (рядом с C)",
    );
    console.log(
      "  • Типографика:       ⌥+4=₴  ⌥+'=’  ⌥+[=«  ⌥+]=»  ⌥+-=–  ⌥+⇧+-=—",
    );
    console.log("  • Мертвые клавиши:   ⌥+; затем буква (смягчение ´)");
    console.log(
      "                       ⌥+\\ затем буква (гачек/циркумфлекс ˇ)",
    );
    console.log(
      "=================================================================\n",
    );
  }

  return installedPath;
}

if (import.meta.main) {
  await installKeyboardBundle().catch((err) => {
    console.error("❌ Ошибка при установке раскладки:", err);
    process.exit(1);
  });
}
