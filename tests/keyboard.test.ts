import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildKeyboardBundle,
  bundleDir,
  generateInfoPlist,
  generateKeylayoutXml,
} from "../keyboard/build";
import { installKeyboardBundle } from "../keyboard/install";
import { translitMap } from "../src/transliterate";

describe("macOS UkrLat Keyboard Layout Bundle", () => {
  const tempDirs: string[] = [];

  beforeAll(async () => {
    await buildKeyboardBundle();
  });

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir && existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  test("generates complete .bundle directory structure with Info.plist, keylayout, icns, and localizations", () => {
    const plistPath = join(bundleDir, "Contents", "Info.plist");
    const keylayoutPath = join(
      bundleDir,
      "Contents",
      "Resources",
      "UkrLat.keylayout",
    );
    const icnsPath = join(bundleDir, "Contents", "Resources", "UkrLat.icns");
    const enStringsPath = join(
      bundleDir,
      "Contents",
      "Resources",
      "en.lproj",
      "InfoPlist.strings",
    );
    const ukStringsPath = join(
      bundleDir,
      "Contents",
      "Resources",
      "uk.lproj",
      "InfoPlist.strings",
    );

    expect(existsSync(plistPath)).toBe(true);
    expect(existsSync(keylayoutPath)).toBe(true);
    expect(existsSync(icnsPath)).toBe(true);
    expect(existsSync(enStringsPath)).toBe(true);
    expect(existsSync(ukStringsPath)).toBe(true);

    expect(statSync(icnsPath).size).toBeGreaterThan(100);
    expect(readFileSync(ukStringsPath, "utf-8")).toContain("UkrLat");
  });

  test("Info.plist specifies TISIntendedLanguage = uk, valid CFBundleIdentifier, and passes plutil -lint", async () => {
    const plistPath = join(bundleDir, "Contents", "Info.plist");
    const plistContent = readFileSync(plistPath, "utf-8");

    expect(plistContent).toContain("<key>KLInfo_UkrLat</key>");
    expect(plistContent).toContain("<key>TISIntendedLanguage</key>");
    expect(plistContent).toContain("<string>uk</string>");
    expect(plistContent).toContain(
      "<key>CFBundleIdentifier</key>\n  <string>com.takeso.keyboardlayout.ukrlat</string>",
    );
    const bundleIdMatch = plistContent.match(
      /<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/,
    );
    expect(bundleIdMatch?.[1]).toBeDefined();
    expect(bundleIdMatch?.[1]).toContain(".keyboardlayout.");
    expect(plistContent).toContain(
      "<string>com.takeso.keyboardlayout.ukrlat.keylayout.UkrLat</string>",
    );

    const generated = generateInfoPlist("1.2.1");
    expect(generated).toContain("<string>1.2.1</string>");

    const proc = Bun.spawn(["plutil", "-lint", plistPath], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;
    expect(code).toBe(0);
  });

  test("UkrLat.keylayout conforms to Apple TN2056 header, XML 1.1, and avoids null byte entities", () => {
    const xml = readFileSync(
      join(bundleDir, "Contents", "Resources", "UkrLat.keylayout"),
      "utf-8",
    );

    expect(xml).toContain('<?xml version="1.1" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<!DOCTYPE keyboard SYSTEM "file://localhost/System/Library/DTDs/KeyboardLayout.dtd">',
    );
    expect(xml).toContain(
      '<keyboard group="126" id="-16420" name="UkrLat" maxout="2">',
    );
    expect(xml).not.toContain("&#x0000;");
    expect(xml).not.toContain("<after ");
    expect(xml).toContain("<terminators>");
  });

  test("maps every unique non-ASCII character from translitMap plus шч/Šč and Ukrainian punctuation", () => {
    const xml = generateKeylayoutXml();

    const uniqueNonAsciiChars = new Set<string>();
    for (const output of Object.values(translitMap)) {
      for (const ch of output) {
        if (ch.charCodeAt(0) > 127) {
          uniqueNonAsciiChars.add(ch);
        }
      }
    }

    // Sanity check: expected 32 unique accented characters (16 lower + 16 upper)
    expect(uniqueNonAsciiChars.size).toBeGreaterThanOrEqual(32);

    for (const ch of uniqueNonAsciiChars) {
      expect(xml).toContain(`output="${ch}"`);
    }

    // Digraph šč / Šč / ŠČ + hryvnia + Ukrainian apostrophe + guillemets
    expect(xml).toContain('output="šč"');
    expect(xml).toContain('output="Šč"');
    expect(xml).toContain('output="ŠČ"');
    expect(xml).toContain('output="₴"');
    expect(xml).toContain('output="’"');
    expect(xml).toContain('output="«"');
    expect(xml).toContain('output="»"');
  });

  test("maintains referential integrity across keyMapSelect indices, actions, and terminators", () => {
    const xml = generateKeylayoutXml();

    // Every mapIndex declared in modifierMap has a matching <keyMap index="...">
    const mapSelectMatches = [
      ...xml.matchAll(/<keyMapSelect mapIndex="(\d+)">/g),
    ];
    expect(mapSelectMatches.length).toBe(7);
    for (const m of mapSelectMatches) {
      expect(xml).toContain(`<keyMap index="${m[1]}">`);
    }

    // Every action referenced by a <key> is defined in <actions>
    const definedActionIds = new Set(
      [...xml.matchAll(/<action id="([^"]+)">/g)].map((m) => m[1]),
    );
    const referencedActions = [
      ...xml.matchAll(/<key [^>]*action="([^"]+)"/g),
    ].map((m) => m[1]);
    expect(referencedActions.length).toBeGreaterThan(0);
    for (const actionId of referencedActions) {
      expect(definedActionIds.has(actionId)).toBe(true);
    }

    // Every next="..." state in <actions> has a matching <when state="..." ...> inside <terminators>
    const terminatorsSection =
      xml.split("<terminators>")[1]?.split("</terminators>")[0] ?? "";
    const terminatorStates = new Set(
      [...terminatorsSection.matchAll(/<when state="([^"]+)"/g)].map(
        (m) => m[1],
      ),
    );
    const nextStates = [...xml.matchAll(/next="([^"]+)"/g)].map((m) => m[1]);
    expect(nextStates.length).toBeGreaterThan(0);
    for (const state of nextStates) {
      expect(terminatorStates.has(state)).toBe(true);
    }
  });

  test("installKeyboardBundle copies a valid bundle to target directory", async () => {
    const tempTarget = mkdtempSync(join(tmpdir(), "ukrlat-kb-test-"));
    tempDirs.push(tempTarget);

    const installedPath = await installKeyboardBundle(tempTarget);
    expect(installedPath).toBe(join(tempTarget, "UkrLat.bundle"));
    expect(existsSync(join(installedPath, "Contents", "Info.plist"))).toBe(
      true,
    );
    expect(
      existsSync(
        join(installedPath, "Contents", "Resources", "UkrLat.keylayout"),
      ),
    ).toBe(true);
    expect(
      existsSync(join(installedPath, "Contents", "Resources", "UkrLat.icns")),
    ).toBe(true);
  });
});
