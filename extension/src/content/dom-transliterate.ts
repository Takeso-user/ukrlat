import { transliterateWithCase } from "../transliterate";

const IGNORED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
  "SVG",
  "MATH",
]);

// Cache original text for text nodes to allow restoring when toggled off
const originalTextMap = new WeakMap<Text, string>();

let observer: MutationObserver | null = null;
let isTransliterationActive = false;

function shouldIgnoreNode(node: Node): boolean {
  if (!node) return true;

  const parent = node.parentElement;
  if (!parent) return false;

  if (IGNORED_TAGS.has(parent.tagName.toUpperCase())) {
    return true;
  }

  if (parent.isContentEditable) {
    return true;
  }

  if (
    parent.getAttribute("translate") === "no" ||
    parent.classList.contains("notranslate")
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a string contains any Ukrainian Cyrillic characters.
 */
export function containsUkrainianCyrillic(text: string): boolean {
  return /[а-яіїєґА-ЯІЇЄҐ]/.test(text);
}

/**
 * Transliterates a single DOM text node and records its original value.
 */
export function transliterateTextNode(node: Text): void {
  if (shouldIgnoreNode(node)) return;

  const currentVal = node.nodeValue ?? "";
  if (!currentVal.trim() || !containsUkrainianCyrillic(currentVal)) {
    return;
  }

  if (!originalTextMap.has(node)) {
    originalTextMap.set(node, currentVal);
  }

  const converted = transliterateWithCase(currentVal);
  if (converted !== currentVal) {
    node.nodeValue = converted;
  }
}

/**
 * Restores the original text of a text node if cached.
 */
export function restoreTextNode(node: Text): void {
  if (originalTextMap.has(node)) {
    const original = originalTextMap.get(node);
    if (original !== undefined) {
      node.nodeValue = original;
    }
  }
}

/**
 * Traverses a subtree and applies a callback to every eligible text node.
 */
export function walkTextNodes(
  root: Node,
  callback: (node: Text) => void,
): void {
  if (root.nodeType === Node.TEXT_NODE) {
    callback(root as Text);
    return;
  }

  const parentElement = root as Element;
  if (
    parentElement.tagName &&
    (IGNORED_TAGS.has(parentElement.tagName.toUpperCase()) ||
      (parentElement instanceof HTMLElement && parentElement.isContentEditable))
  ) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldIgnoreNode(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    callback(currentNode as Text);
    currentNode = walker.nextNode();
  }
}

/**
 * Enables automatic page transliteration and starts the mutation observer.
 */
export function enablePageTransliteration(): void {
  if (isTransliterationActive) return;
  isTransliterationActive = true;

  if (document.body) {
    walkTextNodes(document.body, transliterateTextNode);
  }

  if (!observer) {
    observer = new MutationObserver((mutations) => {
      if (!isTransliterationActive) return;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            walkTextNodes(node, transliterateTextNode);
          });
        } else if (mutation.type === "characterData") {
          const target = mutation.target;
          if (target.nodeType === Node.TEXT_NODE) {
            transliterateTextNode(target as Text);
          }
        }
      }
    });
  }

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}

/**
 * Disables page transliteration and restores original text content.
 */
export function disablePageTransliteration(): void {
  if (!isTransliterationActive) return;
  isTransliterationActive = false;

  if (observer) {
    observer.disconnect();
  }

  if (document.body) {
    walkTextNodes(document.body, restoreTextNode);
  }
}
