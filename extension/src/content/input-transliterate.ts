import { transliterateWithCase } from "../transliterate";
import { containsUkrainianCyrillic } from "./dom-transliterate";

let isInputTransliterationActive = false;

function isEligibleInput(
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement {
  if (!target) return false;

  if (target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled;
  }

  if (target instanceof HTMLInputElement) {
    if (target.readOnly || target.disabled) return false;
    const type = target.type.toLowerCase();
    const ineligibleTypes = new Set([
      "password",
      "email",
      "number",
      "date",
      "time",
      "file",
      "color",
      "range",
    ]);
    return !ineligibleTypes.has(type);
  }

  return false;
}

function handleInputEvent(event: Event): void {
  if (!isInputTransliterationActive) return;

  const target = event.target;
  if (!isEligibleInput(target)) return;

  const originalValue = target.value;
  if (!containsUkrainianCyrillic(originalValue)) return;

  const selectionStart = target.selectionStart;
  const selectionEnd = target.selectionEnd;

  const convertedValue = transliterateWithCase(originalValue);
  if (convertedValue !== originalValue) {
    target.value = convertedValue;

    // Adjust cursor position if length changed (e.g. щ -> šč adds 1 char)
    if (selectionStart !== null && selectionEnd !== null) {
      const diff = convertedValue.length - originalValue.length;
      const newCursor = Math.max(0, selectionStart + diff);
      try {
        target.setSelectionRange(newCursor, newCursor);
      } catch {
        // Ignored for input types that don't support setSelectionRange
      }
    }
  }
}

/**
 * Transliterates currently selected text in active input or on the document.
 * Safely preserves DOM elements when transliterating multi-node selections.
 */
export function transliterateCurrentSelection(): void {
  const activeEl = document.activeElement;

  if (isEligibleInput(activeEl)) {
    const start = activeEl.selectionStart ?? 0;
    const end = activeEl.selectionEnd ?? 0;
    const text = activeEl.value;

    if (start !== end) {
      const selected = text.slice(start, end);
      const converted = transliterateWithCase(selected);
      activeEl.setRangeText(converted, start, end, "select");
    } else {
      // If nothing is selected, transliterate the entire field
      activeEl.value = transliterateWithCase(text);
    }
    return;
  }

  // If outside of an input, transliterate the window selection
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return;
  }

  const range = selection.getRangeAt(0);

  // Case 1: Selection is inside a single text node
  if (
    range.startContainer === range.endContainer &&
    range.startContainer.nodeType === Node.TEXT_NODE
  ) {
    const textNode = range.startContainer as Text;
    const full = textNode.nodeValue ?? "";
    const start = range.startOffset;
    const end = range.endOffset;
    const selected = full.slice(start, end);

    if (containsUkrainianCyrillic(selected)) {
      const converted = transliterateWithCase(selected);
      textNode.nodeValue = full.slice(0, start) + converted + full.slice(end);
    }
    return;
  }

  // Case 2: Selection spans multiple DOM nodes — safely transliterate text nodes in place
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
  );

  let node = walker.nextNode();
  while (node) {
    if (
      selection.containsNode(node, true) &&
      node.nodeType === Node.TEXT_NODE
    ) {
      const textNode = node as Text;
      const val = textNode.nodeValue ?? "";
      if (val && containsUkrainianCyrillic(val)) {
        textNode.nodeValue = transliterateWithCase(val);
      }
    }
    node = walker.nextNode();
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  // Alt+U shortcut to transliterate selection or current input field
  if (
    event.altKey &&
    (event.key === "u" ||
      event.key === "U" ||
      event.key === "г" ||
      event.key === "Г")
  ) {
    event.preventDefault();
    transliterateCurrentSelection();
  }
}

export function enableInputTransliteration(): void {
  if (isInputTransliterationActive) return;
  isInputTransliterationActive = true;

  document.addEventListener("input", handleInputEvent, true);
  document.addEventListener("keydown", handleKeyDown, true);
}

export function disableInputTransliteration(): void {
  if (!isInputTransliterationActive) return;
  isInputTransliterationActive = false;

  document.removeEventListener("input", handleInputEvent, true);
  document.removeEventListener("keydown", handleKeyDown, true);
}
