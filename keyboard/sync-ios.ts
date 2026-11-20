import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const rootDir = join(import.meta.dir, "..");
export const iosKeyboardSrcDir = join(rootDir, "keyboard", "ios");
export const defaultSafariXcodeAppDir = join(
  rootDir,
  "extension",
  "dist",
  "safari-xcode",
  "UkrLat",
);

const KEYBOARD_TARGET_NAME = "UkrLat Keyboard (iOS)";
const KEYBOARD_TARGET_ID = "7C9DEFA330A9F26D0086E4CC";
const KEYBOARD_PRODUCT_ID = "7C9DEFA430A9F26D0086E4CC";
const KEYBOARD_GROUP_PATH = "iOS (Keyboard)";

interface XcprojNode {
  kind?: string;
  path?: string;
  name?: string;
  id?: string;
  type?: string;
  index?: boolean;
  "target-membership"?: unknown[];
  children?: XcprojNode[];
}

interface XcprojTarget {
  name: string;
  id: string;
  product: string;
  "product-type": string;
  dependencies?: string[];
  "build-phases": unknown[];
  "build-settings": Record<string, string | string[]>;
}

interface XcprojDocument {
  "default-configuration": string;
  configurations: string[];
  localizations: Record<string, unknown>;
  files: XcprojNode[];
  targets: XcprojTarget[];
  "build-settings": Record<string, string | string[]>;
  "last-upgrade"?: string;
  "last-swift-update"?: string;
}

/**
 * Strips trailing commas outside string literals so Xcode's JSON5-like
 * project.xcproj parses cleanly with standard JSON.parse.
 */
export function parseXcprojJson(raw: string): XcprojDocument {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    if (ch === ",") {
      let j = i + 1;
      while (j < raw.length && /\s/.test(raw[j] ?? "")) {
        j += 1;
      }
      if (raw[j] === "}" || raw[j] === "]") {
        continue;
      }
    }

    out += ch;
  }

  return JSON.parse(out) as XcprojDocument;
}

function getBuildSettingString(
  settings: Record<string, string | string[]>,
  key: string,
  fallback: string,
): string {
  const val = settings[key];
  return typeof val === "string" && val.length > 0 ? val : fallback;
}

export function syncIosKeyboardExtension(
  xcodeAppDir: string = defaultSafariXcodeAppDir,
): { synced: boolean; xcprojPath: string; keyboardDir: string } {
  const xcprojPath = join(xcodeAppDir, "UkrLat.xcodeproj", "project.xcproj");
  const keyboardDir = join(xcodeAppDir, KEYBOARD_GROUP_PATH);

  if (!existsSync(iosKeyboardSrcDir)) {
    throw new Error(`iOS keyboard source not found at: ${iosKeyboardSrcDir}`);
  }
  if (!existsSync(xcprojPath)) {
    return { synced: false, xcprojPath, keyboardDir };
  }

  // 1. Copy Swift sources & Info.plist into Xcode project folder
  mkdirSync(keyboardDir, { recursive: true });
  cpSync(iosKeyboardSrcDir, keyboardDir, { recursive: true });

  // 2. Patch project.xcproj idempotently
  const doc = parseXcprojJson(readFileSync(xcprojPath, "utf-8"));

  const iosAppTarget = doc.targets.find((t) => t.name === "UkrLat (iOS)");
  if (!iosAppTarget) {
    throw new Error('Target "UkrLat (iOS)" not found in project.xcproj');
  }

  const marketingVersion = getBuildSettingString(
    iosAppTarget["build-settings"],
    "MARKETING_VERSION",
    "1.2.1",
  );
  const currentProjectVersion = getBuildSettingString(
    iosAppTarget["build-settings"],
    "CURRENT_PROJECT_VERSION",
    "1",
  );
  const devTeam = getBuildSettingString(
    iosAppTarget["build-settings"],
    "DEVELOPMENT_TEAM",
    "YX94DR995G",
  );
  const iosDeploymentTarget = getBuildSettingString(
    iosAppTarget["build-settings"],
    "IPHONEOS_DEPLOYMENT_TARGET",
    "17.0",
  );

  // 2a. Ensure "iOS (Keyboard)" file group exists in doc.files
  const keyboardGroup: XcprojNode = {
    kind: "group",
    path: KEYBOARD_GROUP_PATH,
    children: [
      {
        path: "KeyboardViewController.swift",
        "target-membership": [`${KEYBOARD_TARGET_NAME}/compile-sources`],
      },
      {
        path: "UkrLatKeyboardLayout.swift",
        "target-membership": [`${KEYBOARD_TARGET_NAME}/compile-sources`],
      },
      {
        path: "UkrLatKeyboardView.swift",
        "target-membership": [`${KEYBOARD_TARGET_NAME}/compile-sources`],
      },
      { path: "Info.plist" },
    ],
  };

  const existingGroupIdx = doc.files.findIndex(
    (f) => f.kind === "group" && f.path === KEYBOARD_GROUP_PATH,
  );
  if (existingGroupIdx >= 0) {
    doc.files[existingGroupIdx] = keyboardGroup;
  } else {
    const productsIdx = doc.files.findIndex(
      (f) => f.kind === "group" && f.name === "Products",
    );
    if (productsIdx >= 0) {
      doc.files.splice(productsIdx, 0, keyboardGroup);
    } else {
      doc.files.push(keyboardGroup);
    }
  }

  // 2b. Ensure "<PRODUCTS>/UkrLat Keyboard.appex" exists in Products group & embedded in UkrLat (iOS)
  const productsGroup = doc.files.find(
    (f) => f.kind === "group" && f.name === "Products",
  );
  if (productsGroup) {
    productsGroup.children = productsGroup.children ?? [];
    const productEntry: XcprojNode = {
      path: "<PRODUCTS>/UkrLat Keyboard.appex",
      id: KEYBOARD_PRODUCT_ID,
      type: "wrapper.app-extension",
      index: false,
      "target-membership": [
        {
          "build-phase": "UkrLat (iOS)/copy/Embed Foundation Extensions",
          "header-preservation": "remove-on-copy",
        },
      ],
    };
    const existingProdIdx = productsGroup.children.findIndex(
      (c) => c.id === KEYBOARD_PRODUCT_ID || c.path === productEntry.path,
    );
    if (existingProdIdx >= 0) {
      productsGroup.children[existingProdIdx] = productEntry;
    } else {
      productsGroup.children.push(productEntry);
    }
  }

  // 2c. Add dependency on "UkrLat Keyboard (iOS)" in "UkrLat (iOS)"
  iosAppTarget.dependencies = iosAppTarget.dependencies ?? [];
  if (!iosAppTarget.dependencies.includes(KEYBOARD_TARGET_NAME)) {
    iosAppTarget.dependencies.push(KEYBOARD_TARGET_NAME);
  }

  // 2d. Ensure "UkrLat Keyboard (iOS)" target exists
  const keyboardTarget: XcprojTarget = {
    name: KEYBOARD_TARGET_NAME,
    id: KEYBOARD_TARGET_ID,
    product: `id:${KEYBOARD_PRODUCT_ID}`,
    "product-type": "app-extension",
    "build-phases": ["compile-sources", "frameworks", "resources"],
    "build-settings": {
      CODE_SIGN_STYLE: "Automatic",
      CURRENT_PROJECT_VERSION: currentProjectVersion,
      DEVELOPMENT_TEAM: devTeam,
      GENERATE_INFOPLIST_FILE: "YES",
      INFOPLIST_FILE: `${KEYBOARD_GROUP_PATH}/Info.plist`,
      INFOPLIST_KEY_CFBundleDisplayName: "UkrLat",
      INFOPLIST_KEY_NSHumanReadableCopyright: "",
      IPHONEOS_DEPLOYMENT_TARGET: iosDeploymentTarget,
      LD_RUNPATH_SEARCH_PATHS: [
        "$(inherited)",
        "@executable_path/Frameworks",
        "@executable_path/../../Frameworks",
      ],
      MARKETING_VERSION: marketingVersion,
      PRODUCT_BUNDLE_IDENTIFIER: "com.takeso.ukrlat.Keyboard",
      PRODUCT_NAME: "UkrLat Keyboard",
      SDKROOT: "iphoneos",
      SKIP_INSTALL: "YES",
      STRING_CATALOG_GENERATE_SYMBOLS: "YES",
      SWIFT_APPROACHABLE_CONCURRENCY: "YES",
      SWIFT_DEFAULT_ACTOR_ISOLATION: "MainActor",
      SWIFT_EMIT_LOC_STRINGS: "YES",
      SWIFT_UPCOMING_FEATURE_MEMBER_IMPORT_VISIBILITY: "YES",
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: "1,2",
      "VALIDATE_PRODUCT[config=Release]": "YES",
    },
  };

  const existingTargetIdx = doc.targets.findIndex(
    (t) => t.name === KEYBOARD_TARGET_NAME || t.id === KEYBOARD_TARGET_ID,
  );
  if (existingTargetIdx >= 0) {
    doc.targets[existingTargetIdx] = keyboardTarget;
  } else {
    doc.targets.push(keyboardTarget);
  }

  writeFileSync(xcprojPath, `${JSON.stringify(doc, null, 2)}\n`, "utf-8");

  // 3. Enhance iOS onboarding text in Shared (App)/Resources/Base.lproj/Main.html
  const mainHtmlPath = join(
    xcodeAppDir,
    "Shared (App)",
    "Resources",
    "Base.lproj",
    "Main.html",
  );
  if (existsSync(mainHtmlPath)) {
    const html = readFileSync(mainHtmlPath, "utf-8");
    if (!html.includes("UkrLat keyboard")) {
      const updated = html.replace(
        '<p class="platform-ios">You can turn on UkrLat’s Safari extension in Settings.</p>',
        '<p class="platform-ios">You can turn on UkrLat’s Safari extension in Settings → Apps → Safari → Extensions.</p>\n    <p class="platform-ios">To enable the UkrLat keyboard: Settings → General → Keyboard → Keyboards → Add New Keyboard… → UkrLat.</p>',
      );
      if (updated !== html) {
        writeFileSync(mainHtmlPath, updated, "utf-8");
      }
    }
  }

  return { synced: true, xcprojPath, keyboardDir };
}

if (import.meta.main) {
  const result = syncIosKeyboardExtension();
  if (!result.synced) {
    console.error(
      `❌ Xcode-проект не найден: ${result.xcprojPath}. Сначала соберите Safari-проект (bun run build:extension).`,
    );
    process.exit(1);
  }
  console.log(
    "⌨️ iOS Keyboard Extension «UkrLat Keyboard (iOS)» синхронизирован!",
  );
  console.log(`  ✓ Файлы: ${result.keyboardDir}`);
  console.log(`  ✓ Проект: ${result.xcprojPath}`);
  console.log(
    "  ✓ Bundle ID: com.takeso.ukrlat.Keyboard (RequestsOpenAccess = false)",
  );
}
