import { describe, expect, test } from "bun:test";
import { transliterate, transliterateWithCase } from "../src/transliterate";
import { containsUkrainianCyrillic } from "../src/content/dom-transliterate";

describe("Extension Transliteration Module", () => {
  test("transliterates Ukrainian Cyrillic words to UkrLat", () => {
    expect(transliterate("Україна")).toBe("Ukraîna");
    expect(transliterate("Київ")).toBe("Kyîv");
    expect(transliterate("Львів")).toBe("Ĺviv");
    expect(transliterate("Харків")).toBe("Harkiv");
    expect(transliterate("Одеса")).toBe("Odesa");
    expect(transliterate("Дніпро")).toBe("Dnipro");
  });

  test("handles digraphs and soft signs", () => {
    expect(transliterate("щастя")).toBe("ščastâ");
    expect(transliterate("сьогодні")).toBe("śogodni");
    expect(transliterate("любов")).toBe("lûbov");
    expect(transliterate("п'ять")).toBe("p'âť");
  });

  test("preserves formatting and whitespace in transliterateWithCase", () => {
    const text = "Привіт, світе!\nЦе тестовий рядок з   кількома   пробілами.";
    const expected = "Pryvit, svite!\nCe testovyj râdok z   kiĺkoma   probilamy.";
    expect(transliterateWithCase(text)).toBe(expected);
  });

  test("preserves all-uppercase tokens", () => {
    expect(transliterateWithCase("СЬОГОДНІ В КИЄВІ")).toBe("ŚOGODNI V KYÊVI");
    expect(transliterateWithCase("УКРАЇНА ТА ЄВРОПА")).toBe("UKRAÎNA TA ÊVROPA");
  });

  test("detects Ukrainian Cyrillic correctly", () => {
    expect(containsUkrainianCyrillic("Привіт")).toBe(true);
    expect(containsUkrainianCyrillic("Київ")).toBe(true);
    expect(containsUkrainianCyrillic("Hello World")).toBe(false);
    expect(containsUkrainianCyrillic("12345 !@#$")).toBe(false);
  });
});
