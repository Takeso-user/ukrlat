import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const rootDir = join(import.meta.dir, "..");
const keyboardDir = join(rootDir, "keyboard");
export const bundleDir = join(keyboardDir, "UkrLat.bundle");

interface KeyEntry {
  code: number;
  output?: string;
  rawOutput?: string;
  action?: string;
}

interface WhenRule {
  state: string;
  output?: string;
  next?: string;
}

interface ActionSpec {
  id: string;
  when: WhenRule[];
}

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

function escapeXmlAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getProjectVersion(): string {
  const pkgPath = join(rootDir, "package.json");
  if (!existsSync(pkgPath)) return "1.0.0";
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    version?: string;
  };
  return pkg.version || "1.0.0";
}

function generateLocalizableStrings(): { en: string; uk: string } {
  return {
    en: `"UkrLat" = "UkrLat";\n`,
    uk: `"UkrLat" = "UkrLat (Латинка)";\n`,
  };
}

export function generateInfoPlist(
  version: string = getProjectVersion(),
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>English</string>
  <key>CFBundleIdentifier</key>
  <string>com.takeso.keyboardlayout.ukrlat</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>UkrLat</string>
  <key>CFBundlePackageType</key>
  <string>BNDL</string>
  <key>CFBundleShortVersionString</key>
  <string>${escapeXmlAttr(version)}</string>
  <key>CFBundleVersion</key>
  <string>${escapeXmlAttr(version)}</string>
  <key>KLInfo_UkrLat</key>
  <dict>
    <key>TISIconIsTemplate</key>
    <false/>
    <key>TISInputSourceID</key>
    <string>com.takeso.keyboardlayout.ukrlat.keylayout.UkrLat</string>
    <key>TISIntendedLanguage</key>
    <string>uk</string>
  </dict>
</dict>
</plist>
`;
}

// Special, navigation, function, and numpad keys included in every keyMap (0..6)
// so Option+Backspace, Option+Arrows, Shift+Arrows, Shift+Enter, F-keys, and Numpad always work.
const SPECIAL_KEYS: readonly KeyEntry[] = [
  { code: 36, rawOutput: "&#x000D;" }, // Return
  { code: 48, rawOutput: "&#x0009;" }, // Tab
  { code: 51, rawOutput: "&#x0008;" }, // Delete (Backspace)
  { code: 52, rawOutput: "&#x0003;" }, // Enter (PowerBook)
  { code: 53, rawOutput: "&#x001B;" }, // Escape
  { code: 65, output: "." }, // Keypad .
  { code: 67, output: "*" }, // Keypad *
  { code: 69, output: "+" }, // Keypad +
  { code: 71, rawOutput: "&#x001B;" }, // Keypad Clear
  { code: 75, output: "/" }, // Keypad /
  { code: 76, rawOutput: "&#x0003;" }, // Keypad Enter
  { code: 78, output: "-" }, // Keypad -
  { code: 81, output: "=" }, // Keypad =
  { code: 82, output: "0" },
  { code: 83, output: "1" },
  { code: 84, output: "2" },
  { code: 85, output: "3" },
  { code: 86, output: "4" },
  { code: 87, output: "5" },
  { code: 88, output: "6" },
  { code: 89, output: "7" },
  { code: 91, output: "8" },
  { code: 92, output: "9" },
  { code: 96, rawOutput: "&#x0010;" }, // F5
  { code: 97, rawOutput: "&#x0010;" }, // F6
  { code: 98, rawOutput: "&#x0010;" }, // F7
  { code: 99, rawOutput: "&#x0010;" }, // F3
  { code: 100, rawOutput: "&#x0010;" }, // F8
  { code: 101, rawOutput: "&#x0010;" }, // F9
  { code: 103, rawOutput: "&#x0010;" }, // F11
  { code: 105, rawOutput: "&#x0010;" }, // F13
  { code: 106, rawOutput: "&#x0010;" }, // F16
  { code: 107, rawOutput: "&#x0010;" }, // F14
  { code: 109, rawOutput: "&#x0010;" }, // F10
  { code: 111, rawOutput: "&#x0010;" }, // F12
  { code: 113, rawOutput: "&#x0010;" }, // F15
  { code: 114, rawOutput: "&#x0005;" }, // Help
  { code: 115, rawOutput: "&#x0001;" }, // Home
  { code: 116, rawOutput: "&#x000B;" }, // Page Up
  { code: 117, rawOutput: "&#x007F;" }, // Forward Delete
  { code: 118, rawOutput: "&#x0010;" }, // F4
  { code: 119, rawOutput: "&#x0004;" }, // End
  { code: 120, rawOutput: "&#x0010;" }, // F2
  { code: 121, rawOutput: "&#x000C;" }, // Page Down
  { code: 122, rawOutput: "&#x0010;" }, // F1
  { code: 123, rawOutput: "&#x001C;" }, // Left Arrow
  { code: 124, rawOutput: "&#x001D;" }, // Right Arrow
  { code: 125, rawOutput: "&#x001F;" }, // Down Arrow
  { code: 126, rawOutput: "&#x001E;" }, // Up Arrow
];

interface LetterDef {
  code: number;
  lower: string;
  upper: string;
  optLower: string;
  optUpper: string;
  optCapsUpper?: string;
  softOut?: [string, string]; // [lowercase, uppercase] after dead soft (⌥+;)
  caronOut?: [string, string]; // [lowercase, uppercase] after dead caron (⌥+\)
  ctrlHex: string; // Control character entity &#x0001;..&#x001A;
}

function toCtrlEntity(asciiCode: number): string {
  return `&#x${asciiCode.toString(16).toUpperCase().padStart(4, "0")};`;
}

// Complete US QWERTY + Polish/Slovak Option chord + Dual Dead Key letter table
const LETTERS: readonly LetterDef[] = [
  {
    code: 0,
    lower: "a",
    upper: "A",
    optLower: "â",
    optUpper: "Â",
    caronOut: ["â", "Â"],
    ctrlHex: toCtrlEntity(1),
  },
  {
    code: 11,
    lower: "b",
    upper: "B",
    optLower: "b",
    optUpper: "B",
    ctrlHex: toCtrlEntity(2),
  },
  {
    code: 8,
    lower: "c",
    upper: "C",
    optLower: "č",
    optUpper: "Č",
    softOut: ["ć", "Ć"],
    caronOut: ["č", "Č"],
    ctrlHex: toCtrlEntity(3),
  },
  {
    code: 2,
    lower: "d",
    upper: "D",
    optLower: "ď",
    optUpper: "Ď",
    softOut: ["ď", "Ď"],
    caronOut: ["ď", "Ď"],
    ctrlHex: toCtrlEntity(4),
  },
  {
    code: 14,
    lower: "e",
    upper: "E",
    optLower: "ê",
    optUpper: "Ê",
    caronOut: ["ê", "Ê"],
    ctrlHex: toCtrlEntity(5),
  },
  {
    code: 3,
    lower: "f",
    upper: "F",
    optLower: "f",
    optUpper: "F",
    ctrlHex: toCtrlEntity(6),
  },
  {
    code: 5,
    lower: "g",
    upper: "G",
    optLower: "ĝ",
    optUpper: "Ĝ",
    caronOut: ["ĝ", "Ĝ"],
    ctrlHex: toCtrlEntity(7),
  },
  {
    code: 4,
    lower: "h",
    upper: "H",
    optLower: "h",
    optUpper: "H",
    ctrlHex: toCtrlEntity(8),
  },
  {
    code: 34,
    lower: "i",
    upper: "I",
    optLower: "î",
    optUpper: "Î",
    caronOut: ["î", "Î"],
    ctrlHex: toCtrlEntity(9),
  },
  {
    code: 38,
    lower: "j",
    upper: "J",
    optLower: "j",
    optUpper: "J",
    ctrlHex: toCtrlEntity(10),
  },
  {
    code: 40,
    lower: "k",
    upper: "K",
    optLower: "k",
    optUpper: "K",
    ctrlHex: toCtrlEntity(11),
  },
  {
    code: 37,
    lower: "l",
    upper: "L",
    optLower: "ĺ",
    optUpper: "Ĺ",
    softOut: ["ĺ", "Ĺ"],
    ctrlHex: toCtrlEntity(12),
  },
  {
    code: 46,
    lower: "m",
    upper: "M",
    optLower: "m",
    optUpper: "M",
    ctrlHex: toCtrlEntity(13),
  },
  {
    code: 45,
    lower: "n",
    upper: "N",
    optLower: "ń",
    optUpper: "Ń",
    softOut: ["ń", "Ń"],
    ctrlHex: toCtrlEntity(14),
  },
  {
    code: 31,
    lower: "o",
    upper: "O",
    optLower: "o",
    optUpper: "O",
    ctrlHex: toCtrlEntity(15),
  },
  {
    code: 35,
    lower: "p",
    upper: "P",
    optLower: "p",
    optUpper: "P",
    ctrlHex: toCtrlEntity(16),
  },
  {
    code: 12,
    lower: "q",
    upper: "Q",
    optLower: "šč",
    optUpper: "Šč",
    optCapsUpper: "ŠČ",
    ctrlHex: toCtrlEntity(17),
  },
  {
    code: 15,
    lower: "r",
    upper: "R",
    optLower: "ŕ",
    optUpper: "Ŕ",
    softOut: ["ŕ", "Ŕ"],
    ctrlHex: toCtrlEntity(18),
  },
  {
    code: 1,
    lower: "s",
    upper: "S",
    optLower: "š",
    optUpper: "Š",
    softOut: ["ś", "Ś"],
    caronOut: ["š", "Š"],
    ctrlHex: toCtrlEntity(19),
  },
  {
    code: 17,
    lower: "t",
    upper: "T",
    optLower: "ť",
    optUpper: "Ť",
    softOut: ["ť", "Ť"],
    caronOut: ["ť", "Ť"],
    ctrlHex: toCtrlEntity(20),
  },
  {
    code: 32,
    lower: "u",
    upper: "U",
    optLower: "û",
    optUpper: "Û",
    caronOut: ["û", "Û"],
    ctrlHex: toCtrlEntity(21),
  },
  {
    code: 9,
    lower: "v",
    upper: "V",
    optLower: "ć",
    optUpper: "Ć",
    ctrlHex: toCtrlEntity(22),
  },
  {
    code: 13,
    lower: "w",
    upper: "W",
    optLower: "ś",
    optUpper: "Ś",
    ctrlHex: toCtrlEntity(23),
  },
  {
    code: 7,
    lower: "x",
    upper: "X",
    optLower: "ź",
    optUpper: "Ź",
    ctrlHex: toCtrlEntity(24),
  },
  {
    code: 16,
    lower: "y",
    upper: "Y",
    optLower: "y",
    optUpper: "Y",
    ctrlHex: toCtrlEntity(25),
  },
  {
    code: 6,
    lower: "z",
    upper: "Z",
    optLower: "ž",
    optUpper: "Ž",
    softOut: ["ź", "Ź"],
    caronOut: ["ž", "Ž"],
    ctrlHex: toCtrlEntity(26),
  },
];

interface SymbolDef {
  code: number;
  base: string;
  shift: string;
  opt: string;
  optShift: string;
  ctrlHex?: string;
  optAction?: string;
}

const SYMBOLS: readonly SymbolDef[] = [
  { code: 10, base: "§", shift: "±", opt: "§", optShift: "±" }, // ISO Section
  { code: 18, base: "1", shift: "!", opt: "¡", optShift: "⁄" },
  { code: 19, base: "2", shift: "@", opt: "™", optShift: "€" },
  { code: 20, base: "3", shift: "#", opt: "£", optShift: "№" },
  { code: 21, base: "4", shift: "$", opt: "₴", optShift: "€" },
  { code: 23, base: "5", shift: "%", opt: "∞", optShift: "‰" },
  {
    code: 22,
    base: "6",
    shift: "^",
    opt: "§",
    optShift: "§",
    ctrlHex: toCtrlEntity(30),
  },
  { code: 26, base: "7", shift: "&", opt: "¶", optShift: "‡" },
  { code: 28, base: "8", shift: "*", opt: "•", optShift: "°" },
  { code: 25, base: "9", shift: "(", opt: "ª", optShift: "·" },
  { code: 29, base: "0", shift: ")", opt: "º", optShift: "°" },
  {
    code: 27,
    base: "-",
    shift: "_",
    opt: "–",
    optShift: "—",
    ctrlHex: toCtrlEntity(31),
  },
  { code: 24, base: "=", shift: "+", opt: "≠", optShift: "±" },
  {
    code: 33,
    base: "[",
    shift: "{",
    opt: "«",
    optShift: "“",
    ctrlHex: toCtrlEntity(27),
  },
  {
    code: 30,
    base: "]",
    shift: "}",
    opt: "»",
    optShift: "”",
    ctrlHex: toCtrlEntity(29),
  },
  {
    code: 42,
    base: "\\",
    shift: "|",
    opt: "\\",
    optShift: "|",
    ctrlHex: toCtrlEntity(28),
    optAction: "act_dead_caron",
  },
  {
    code: 41,
    base: ";",
    shift: ":",
    opt: ";",
    optShift: ":",
    optAction: "act_dead_soft",
  },
  { code: 39, base: "'", shift: '"', opt: "’", optShift: "„" },
  { code: 43, base: ",", shift: "<", opt: "≤", optShift: "„" },
  { code: 47, base: ".", shift: ">", opt: "…", optShift: "·" },
  { code: 44, base: "/", shift: "?", opt: "÷", optShift: "¿" },
  { code: 50, base: "`", shift: "~", opt: "`", optShift: "~" },
];

function renderKeyEntry(entry: KeyEntry): string {
  if (entry.action) {
    return `      <key code="${entry.code}" action="${entry.action}" />`;
  }
  if (entry.rawOutput !== undefined) {
    return `      <key code="${entry.code}" output="${entry.rawOutput}" />`;
  }
  return `      <key code="${entry.code}" output="${escapeXmlAttr(entry.output ?? "")}" />`;
}

function renderKeyMap(index: number, entries: KeyEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.code - b.code);
  return [
    `    <keyMap index="${index}">`,
    ...sorted.map(renderKeyEntry),
    "    </keyMap>",
  ].join("\n");
}

function buildActionsAndTerminators(): {
  actions: ActionSpec[];
  terminators: WhenRule[];
} {
  const actions: ActionSpec[] = [
    {
      id: "act_dead_soft",
      when: [
        { state: "none", next: "soft" },
        { state: "soft", output: "´" },
        { state: "caron", output: ";" },
      ],
    },
    {
      id: "act_dead_caron",
      when: [
        { state: "none", next: "caron" },
        { state: "caron", output: "ˇ" },
        { state: "soft", output: "\\" },
      ],
    },
    {
      id: "act_space",
      when: [
        { state: "none", output: " " },
        { state: "soft", output: "´" },
        { state: "caron", output: "ˇ" },
      ],
    },
  ];

  for (const letter of LETTERS) {
    if (!letter.softOut && !letter.caronOut) continue;

    const lowerWhen: WhenRule[] = [{ state: "none", output: letter.lower }];
    const upperWhen: WhenRule[] = [{ state: "none", output: letter.upper }];

    if (letter.softOut) {
      lowerWhen.push({ state: "soft", output: letter.softOut[0] });
      upperWhen.push({ state: "soft", output: letter.softOut[1] });
    }
    if (letter.caronOut) {
      lowerWhen.push({ state: "caron", output: letter.caronOut[0] });
      upperWhen.push({ state: "caron", output: letter.caronOut[1] });
    }

    actions.push({ id: `act_${letter.lower}_lower`, when: lowerWhen });
    actions.push({ id: `act_${letter.lower}_upper`, when: upperWhen });
  }

  const terminators: WhenRule[] = [
    { state: "soft", output: "´" },
    { state: "caron", output: "ˇ" },
  ];

  return { actions, terminators };
}

export function generateKeylayoutXml(): string {
  const { actions, terminators } = buildActionsAndTerminators();

  const map0: KeyEntry[] = [{ code: 49, action: "act_space" }, ...SPECIAL_KEYS];
  const map1: KeyEntry[] = [{ code: 49, action: "act_space" }, ...SPECIAL_KEYS];
  const map2: KeyEntry[] = [{ code: 49, action: "act_space" }, ...SPECIAL_KEYS];
  const map3: KeyEntry[] = [
    { code: 49, rawOutput: "&#x00A0;" },
    ...SPECIAL_KEYS,
  ];
  const map4: KeyEntry[] = [
    { code: 49, rawOutput: "&#x00A0;" },
    ...SPECIAL_KEYS,
  ];
  const map5: KeyEntry[] = [
    { code: 49, rawOutput: "&#x00A0;" },
    ...SPECIAL_KEYS,
  ];
  const map6: KeyEntry[] = [{ code: 49, output: " " }, ...SPECIAL_KEYS];

  for (const letter of LETTERS) {
    const hasDeadAction = Boolean(letter.softOut || letter.caronOut);
    map0.push(
      hasDeadAction
        ? { code: letter.code, action: `act_${letter.lower}_lower` }
        : { code: letter.code, output: letter.lower },
    );
    map1.push(
      hasDeadAction
        ? { code: letter.code, action: `act_${letter.lower}_upper` }
        : { code: letter.code, output: letter.upper },
    );
    map2.push(
      hasDeadAction
        ? { code: letter.code, action: `act_${letter.lower}_upper` }
        : { code: letter.code, output: letter.upper },
    );
    map3.push({ code: letter.code, output: letter.optLower });
    map4.push({ code: letter.code, output: letter.optUpper });
    map5.push({
      code: letter.code,
      output: letter.optCapsUpper ?? letter.optUpper,
    });
    map6.push({ code: letter.code, rawOutput: letter.ctrlHex });
  }

  for (const sym of SYMBOLS) {
    map0.push({ code: sym.code, output: sym.base });
    map1.push({ code: sym.code, output: sym.shift });
    map2.push({ code: sym.code, output: sym.base }); // Caps Lock keeps digits & punctuation unshifted
    map3.push(
      sym.optAction
        ? { code: sym.code, action: sym.optAction }
        : { code: sym.code, output: sym.opt },
    );
    map4.push({ code: sym.code, output: sym.optShift });
    map5.push({ code: sym.code, output: sym.optShift });
    map6.push(
      sym.ctrlHex
        ? { code: sym.code, rawOutput: sym.ctrlHex }
        : { code: sym.code, output: sym.base },
    );
  }

  const actionsXml = actions
    .map((act) => {
      const whenLines = act.when
        .map((w) => {
          const attrs = [`state="${w.state}"`];
          if (w.next) attrs.push(`next="${w.next}"`);
          if (w.output !== undefined) {
            attrs.push(`output="${escapeXmlAttr(w.output)}"`);
          }
          return `      <when ${attrs.join(" ")} />`;
        })
        .join("\n");
      return `    <action id="${act.id}">\n${whenLines}\n    </action>`;
    })
    .join("\n");

  const terminatorsXml = terminators
    .map(
      (t) =>
        `    <when state="${t.state}" output="${escapeXmlAttr(t.output ?? "")}" />`,
    )
    .join("\n");

  return `<?xml version="1.1" encoding="UTF-8"?>
<!DOCTYPE keyboard SYSTEM "file://localhost/System/Library/DTDs/KeyboardLayout.dtd">
<keyboard group="126" id="-16420" name="UkrLat" maxout="2">
  <layouts>
    <layout first="0" last="255" mapSet="ANSI" modifiers="commonModifiers" />
  </layouts>
  <modifierMap id="commonModifiers" defaultIndex="0">
    <keyMapSelect mapIndex="0">
      <modifier keys="" />
      <modifier keys="command" />
      <modifier keys="anyOption command" />
    </keyMapSelect>
    <keyMapSelect mapIndex="1">
      <modifier keys="anyShift caps?" />
      <modifier keys="anyShift caps? command" />
      <modifier keys="anyShift caps? anyOption command" />
    </keyMapSelect>
    <keyMapSelect mapIndex="2">
      <modifier keys="caps" />
      <modifier keys="caps command" />
      <modifier keys="caps anyOption command" />
    </keyMapSelect>
    <keyMapSelect mapIndex="3">
      <modifier keys="anyOption" />
    </keyMapSelect>
    <keyMapSelect mapIndex="4">
      <modifier keys="anyShift anyOption caps?" />
    </keyMapSelect>
    <keyMapSelect mapIndex="5">
      <modifier keys="caps anyOption" />
    </keyMapSelect>
    <keyMapSelect mapIndex="6">
      <modifier keys="anyShift? caps? anyOption? command? anyControl" />
    </keyMapSelect>
  </modifierMap>
  <keyMapSet id="ANSI">
${renderKeyMap(0, map0)}
${renderKeyMap(1, map1)}
${renderKeyMap(2, map2)}
${renderKeyMap(3, map3)}
${renderKeyMap(4, map4)}
${renderKeyMap(5, map5)}
${renderKeyMap(6, map6)}
  </keyMapSet>
  <actions>
${actionsXml}
  </actions>
  <terminators>
${terminatorsXml}
  </terminators>
</keyboard>
`;
}

async function runTool(cmd: string[], cwd: string = rootDir): Promise<void> {
  const proc = Bun.spawn(cmd, {
    cwd,
    env: getCleanEnv(),
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(
      `Command failed (${exitCode}): ${cmd.join(" ")}\n${stderr}`,
    );
  }
}

async function generateIcnsIcon(outIcnsPath: string): Promise<void> {
  const icon128 = join(rootDir, "extension", "src", "icons", "icon128.png");
  const fallbackIcon = join(rootDir, "public", "icon.png");
  const sourceIcon = existsSync(icon128) ? icon128 : fallbackIcon;

  if (!existsSync(sourceIcon)) {
    throw new Error(`Source icon not found at ${icon128} or ${fallbackIcon}`);
  }

  await runTool([
    "sips",
    "-s",
    "format",
    "icns",
    sourceIcon,
    "--out",
    outIcnsPath,
  ]);
}

export async function buildKeyboardBundle(): Promise<string> {
  console.log("⌨️ Сборка macOS раскладки UkrLat.bundle...");
  const version = getProjectVersion();

  const contentsDir = join(bundleDir, "Contents");
  const resourcesDir = join(contentsDir, "Resources");
  const enLprojDir = join(resourcesDir, "en.lproj");
  const ukLprojDir = join(resourcesDir, "uk.lproj");

  if (existsSync(bundleDir)) {
    rmSync(bundleDir, { recursive: true, force: true });
  }
  mkdirSync(enLprojDir, { recursive: true });
  mkdirSync(ukLprojDir, { recursive: true });

  const plistPath = join(contentsDir, "Info.plist");
  const keylayoutPath = join(resourcesDir, "UkrLat.keylayout");
  const icnsPath = join(resourcesDir, "UkrLat.icns");

  writeFileSync(plistPath, generateInfoPlist(version), "utf-8");
  writeFileSync(keylayoutPath, generateKeylayoutXml(), "utf-8");

  const strings = generateLocalizableStrings();
  writeFileSync(join(enLprojDir, "InfoPlist.strings"), strings.en, "utf-8");
  writeFileSync(join(ukLprojDir, "InfoPlist.strings"), strings.uk, "utf-8");

  await generateIcnsIcon(icnsPath);
  await runTool(["plutil", "-lint", plistPath]);

  console.log(`  ✓ Собран бандл: ${bundleDir}`);
  console.log(`  ✓ Версия: ${version}, язык системы: uk (Українська)`);
  console.log("  ✓ Схема: QWERTY + Option (⌥) аккорды + 2 мертвые клавиши");
  return bundleDir;
}

if (import.meta.main) {
  await buildKeyboardBundle().catch((err) => {
    console.error("❌ Ошибка сборки раскладки:", err);
    process.exit(1);
  });
}
