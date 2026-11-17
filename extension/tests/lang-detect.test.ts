import { describe, expect, test } from "bun:test";
import {
  detectLanguage,
  NON_UKRAINIAN_CYRILLIC_REGEX,
  UKRAINIAN_EXCLUSIVE_REGEX,
} from "../src/content/lang-detect";

describe("Language Detection Module (lang-detect)", () => {
  test("identifies authentic Ukrainian sentences", () => {
    const text =
      "Сьогодні в Києві відбулася важлива зустріч представників уряду та громадських організацій.";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(true);
    expect(result.detectedLang).toBe("uk");
    expect(result.ukPercentage).toBeGreaterThanOrEqual(70);
    expect(result.ukScore).toBeGreaterThan(0);
    expect(result.foreignScore).toBe(0);
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

  test("CRUCIAL: 1-2 words in Russian do NOT break Ukrainian auto-detection on a predominantly Ukrainian page", () => {
    // A predominantly Ukrainian news snippet quoting a 2-word Russian title
    const text =
      "У щоденному зверненні Президент України наголосив на важливості відновлення енергетики. " +
      "Також видання «Новости дня» опублікувало коментар експерта щодо цієї ситуації у місті Києві. " +
      "Уряд підготував новий пакет допомоги для громадян, які постраждали від обстрілів.";

    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(true);
    expect(result.detectedLang).toBe("uk");
    expect(result.ukPercentage).toBeGreaterThanOrEqual(70);
    expect(result.foreignScore).toBeGreaterThan(0); // Detected the Russian quote words
    expect(result.ukScore).toBeGreaterThan(result.foreignScore);
  });

  test("rejects standard Russian text with Russian-exclusive letters (ы, э, ъ, ё)", () => {
    const text =
      "Этот сайт был создан для того, чтобы объяснить основные принципы работы веб-расширений.";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(false);
    expect(result.detectedLang).toBe("foreign_cyrillic");
    expect(result.foreignScore).toBeGreaterThan(0);
    expect(result.ukPercentage).toBeLessThan(70);
  });

  test("rejects Russian text without special letters using stop-word analysis", () => {
    const text = "Что ты думаешь про это? Как нам поступить?";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(false);
    expect(result.detectedLang).toBe("foreign_cyrillic");
  });

  test("rejects Bulgarian text (frequent ъ letters and Bulgarian vocabulary)", () => {
    const text =
      "Българският език е южнославянски език. Всички граждани имат право на свободен избор и път към развитие.";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(false);
    expect(result.detectedLang).toBe("foreign_cyrillic");
    expect(result.foreignScore).toBeGreaterThan(0);
  });

  test("rejects Serbian / Macedonian text (letters ј, љ, њ, ђ, ћ, џ)", () => {
    const text =
      "Српски језик је један од јужнословенских језика. Ово је пример текста где се користи ћирилица.";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(false);
    expect(result.detectedLang).toBe("foreign_cyrillic");
  });

  test("rejects Kazakh / Central Asian Cyrillic (letters ә, ғ, қ, ң, ө, ұ, ү, һ)", () => {
    const text =
      "Қазақстан Республикасы — Еуразия құрлығының орталығында орналасқан тәуелсіз мемлекет.";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(false);
    expect(result.detectedLang).toBe("foreign_cyrillic");
  });

  test("rejects Belarusian text (letters ў, ы, э, ё and Belarusian vocabulary)", () => {
    const text =
      "Беларуская мова — нацыянальная мова беларусаў, якая адносіцца да славянскай групы.";
    const result = detectLanguage(text);
    expect(result.isUkrainian).toBe(false);
    expect(result.detectedLang).toBe("foreign_cyrillic");
  });

  test("rejects bilingual / balanced mixed text where Ukrainian does NOT predominate", () => {
    // 50% Russian, 50% Ukrainian
    const text =
      "Сегодня мы обсуждаем этот важный вопрос и будем думать как поступить. " +
      "Сьогодні ми обговорюємо це важливе питання і будемо думати як вчинити.";
    const result = detectLanguage(text);
    // Because it's 50/50, ukPercentage is ~50%, which is below the 70% threshold
    expect(result.isUkrainian).toBe(false);
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

  test("uses HTML lang attribute to disambiguate short Cyrillic text", () => {
    const ukText = "Новий розділ";
    const ukWithAttr = detectLanguage(ukText, { langAttr: "uk-UA" });
    expect(ukWithAttr.isUkrainian).toBe(true);
    expect(ukWithAttr.detectedLang).toBe("uk");

    const ruText = "Новый раздел";
    const ruWithAttr = detectLanguage(ruText, { langAttr: "ru-RU" });
    expect(ruWithAttr.isUkrainian).toBe(false);
    expect(ruWithAttr.detectedLang).toBe("foreign_cyrillic");
  });

  test("regex patterns match their intended character classes", () => {
    expect("іїєґІЇЄҐ".match(UKRAINIAN_EXCLUSIVE_REGEX)?.length).toBe(8);
    expect(
      "ыэъёўђћџјљњѓќѕәғқңөұүһҷӣҳҗ".match(NON_UKRAINIAN_CYRILLIC_REGEX)?.length,
    ).toBe(26);
  });

  test("handles empty and whitespace strings gracefully", () => {
    expect(detectLanguage("").isUkrainian).toBe(false);
    expect(detectLanguage("   ").isUkrainian).toBe(false);
  });
});
