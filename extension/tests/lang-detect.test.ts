import { describe, expect, test } from "bun:test";
import { detectLanguage } from "../src/content/lang-detect";

describe("Language Detection Module (lang-detect)", () => {
  test("identifies authentic Ukrainian sentences", () => {
    const text =
      "Сьогодні в Києві відбулася важлива зустріч представників уряду та громадських організацій.";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(true);
    expect(result.detectedLang).toBe("uk");
    expect(result.ukScore).toBeGreaterThan(0);
    expect(result.ruScore).toBe(0);
  });

  test("identifies Ukrainian text with unique characters (і, ї, є, ґ, apostrophe)", () => {
    const text =
      "Україна — європейська держава з багатовіковою історією та ґрунтовними традиціями.";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(true);
    expect(result.detectedLang).toBe("uk");
  });

  test("identifies Ukrainian text containing apostrophes (м'ясо, п'ять, зв'язок)", () => {
    const text = "Сім'я купила п'ять кілограмів м'яса на ярмарку.";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(true);
    expect(result.detectedLang).toBe("uk");
  });

  test("rejects standard Russian text with Russian-exclusive letters (ы, э, ъ, ё)", () => {
    const text =
      "Этот сайт был создан для того, чтобы объяснить основные принципы работы веб-расширений.";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(false);
    expect(result.detectedLang).toBe("ru");
    expect(result.ruScore).toBeGreaterThan(0);
  });

  test("rejects Russian text without special letters using stop-word analysis", () => {
    // "Что ты думаешь про это?" contains 'что', 'это' (Russian stop words)
    const text = "Что ты думаешь про это? Как нам поступить?";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(false);
    expect(result.detectedLang).toBe("ru");
  });

  test("rejects non-Cyrillic languages (English, German, code)", () => {
    const english =
      "Welcome to our website! This is an open-source project written in TypeScript.";
    const resultEn = detectLanguage(english);
    expect(resultEn.isUkrainian).toBe(false);
    expect(resultEn.detectedLang).toBe("other");

    const code = "const x = 42; function calculateTotal() { return x * 10; }";
    const resultCode = detectLanguage(code);
    expect(resultCode.isUkrainian).toBe(false);
    expect(resultCode.detectedLang).toBe("other");
  });

  test("uses HTML lang attribute and og:locale to disambiguate short Cyrillic text", () => {
    // Shared Cyrillic words "Новини дня" vs "Новости дня"
    const ukText = "Новий розділ";
    const ukWithAttr = detectLanguage(ukText, { langAttr: "uk-UA" });
    expect(ukWithAttr.isUkrainian).toBe(true);
    expect(ukWithAttr.detectedLang).toBe("uk");

    const ruText = "Новый раздел";
    const ruWithAttr = detectLanguage(ruText, { langAttr: "ru-RU" });
    expect(ruWithAttr.isUkrainian).toBe(false);
    expect(ruWithAttr.detectedLang).toBe("ru");
  });

  test("handles empty and whitespace strings gracefully", () => {
    expect(detectLanguage("").isUkrainian).toBe(false);
    expect(detectLanguage("   ").isUkrainian).toBe(false);
  });
});
