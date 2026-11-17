/**
 * Language detection module for UkrLat.
 * Determines whether a text sample or web page is PREDOMINANTLY Ukrainian,
 * while safely ignoring other Slavic and non-Ukrainian Cyrillic languages
 * (Russian, Bulgarian, Serbian, Macedonian, Belarusian, Kazakh, etc.).
 */

export interface LanguageDetectionResult {
  isUkrainian: boolean;
  detectedLang: "uk" | "foreign_cyrillic" | "other";
  confidence: number; // 0 to 1
  ukPercentage: number; // 0 to 100%
  ukScore: number;
  foreignScore: number;
}

export interface DetectionOptions {
  langAttr?: string | null;
  ogLocale?: string | null;
}

// Letters that exist ONLY in Ukrainian (never in standard Russian, Bulgarian, Serbian)
export const UKRAINIAN_EXCLUSIVE_REGEX = /[іїєґІЇЄҐ]/g;

// Typical Ukrainian word-internal apostrophe (e.g. м'ясо, п'ять, з'їзд, сім'я)
export const UKRAINIAN_APOSTROPHE_REGEX =
  /[бпвмфгркхжчшщБПВМФГРКХЖЧШЩ]['’`ʼ][яюєїЯЮЄЇ]/g;

/**
 * Characters that exist in other Cyrillic alphabets, but NEVER in standard Ukrainian:
 * - Russian: ы, э, ъ, ё
 * - Bulgarian: ъ (used as a frequent vowel)
 * - Serbian / Montenegrin: ђ, ћ, џ, ј, љ, њ
 * - Macedonian: ѓ, ќ, ѕ, ј, љ, њ, џ
 * - Belarusian: ў, ы, э, ё
 * - Kazakh & Central Asian Cyrillic: ә, ғ, қ, ң, ө, ұ, ү, һ, ҷ, ӣ, ҳ, җ
 */
export const NON_UKRAINIAN_CYRILLIC_REGEX =
  /[ыэъёўђћџјљњѓќѕәғқңөұүһҷӣҳҗЫЭЪЁЎЂЋЏЈЉЊЃЌЅӘҒҚҢӨҰҮҺҶӢҲҖ]/g;

// General Cyrillic characters range
const GENERAL_CYRILLIC_REGEX = /[\u0400-\u04FF]/g;

// Distinctive Ukrainian high-frequency stop words
const UKRAINIAN_STOP_WORDS = new Set([
  "та",
  "що",
  "як",
  "це",
  "для",
  "від",
  "до",
  "про",
  "але",
  "чи",
  "щоб",
  "якщо",
  "коли",
  "був",
  "була",
  "було",
  "були",
  "буде",
  "будуть",
  "його",
  "її",
  "їх",
  "також",
  "після",
  "дуже",
  "ще",
  "вже",
  "може",
  "можуть",
  "тому",
  "україна",
  "україни",
  "української",
  "український",
  "українська",
  "року",
  "році",
  "роки",
  "років",
  "новини",
  "людей",
  "сьогодні",
  "тільки",
  "навіть",
  "можна",
  "через",
  "перед",
  "понад",
  "проти",
  "хоча",
  "привіт",
  "зараз",
  "майже",
  "ці",
  "цих",
  "цим",
  "своїх",
  "свої",
  "країни",
  "міста",
  "який",
  "яка",
  "яке",
  "які",
  "яких",
  "якому",
  "якій",
  "яку",
  "більше",
  "менше",
  "перший",
  "перша",
  "перше",
  "інші",
  "інших",
  "цього",
  "цьому",
  "разом",
  "всі",
  "усі",
  "всіх",
  "усіх",
  "однак",
  "під",
  "над",
  "при",
  "без",
  "між",
  "серед",
  "деякі",
  "лише",
  "зокрема",
  "втім",
  "ніж",
  "немає",
  "поки",
]);

// Distinctive non-Ukrainian Cyrillic stop words (Russian, Bulgarian, Serbian, Belarusian)
const NON_UKRAINIAN_STOP_WORDS = new Set([
  // Russian
  "что",
  "как",
  "это",
  "или",
  "если",
  "когда",
  "был",
  "была",
  "было",
  "были",
  "будет",
  "будут",
  "его",
  "ее",
  "их",
  "также",
  "после",
  "очень",
  "еще",
  "уже",
  "может",
  "могут",
  "потому",
  "россия",
  "россии",
  "российской",
  "российский",
  "года",
  "году",
  "годы",
  "годов",
  "новости",
  "сегодня",
  "жизни",
  "только",
  "даже",
  "можно",
  "зачем",
  "почему",
  "привет",
  "сейчас",
  "своих",
  "свои",
  "город",
  "города",
  "страны",
  "других",
  "более",
  "менее",
  "время",
  "всегда",
  "тогда",
  "который",
  "которая",
  "которое",
  "которые",
  "которых",
  "этого",
  "этому",
  "эти",
  "этих",
  "первый",
  "первая",
  "первое",
  "другие",
  "вместе",
  "все",
  "всех",
  "однако",
  "нет",
  "при",
  "из",
  "под",
  "над",
  "между",
  "среди",
  "лишь",
  "впрочем",
  "чем",
  "пока",
  "тоже",
  "ведь",
  "нибудь",
  "какой",
  "какая",
  "какие",
  "чтобы",
  "без",
  "перед",
  "около",
  // Bulgarian
  "съм",
  "във",
  "това",
  "който",
  "която",
  "които",
  "всички",
  "един",
  "една",
  "тези",
  "още",
  "няма",
  "само",
  "като",
  "когато",
  "беше",
  "през",
  "защото",
  "всичко",
  "много",
  // Serbian / Montenegrin / Bosnian (Cyrillic)
  "као",
  "бити",
  "јесте",
  "само",
  "ово",
  "тога",
  "све",
  "ако",
  "када",
  "већ",
  "још",
  "због",
  "након",
  "такође",
  "између",
  "против",
  // Belarusian
  "гэта",
  "што",
  "які",
  "быў",
  "яны",
  "яго",
  "такі",
  "пасля",
  "таксама",
  "якая",
  "якое",
  "якія",
  "ёсць",
  "вельмі",
  "толькі",
  "больш",
  "разам",
]);

/**
 * Tokenizes text into lowercase words.
 */
function extractWords(text: string): string[] {
  const matches = text.toLowerCase().match(/[\p{L}'’`ʼ-]+/gu);
  return matches ?? [];
}

/**
 * Evaluates whether text is PREDOMINANTLY Ukrainian by calculating the ratio
 * of Ukrainian language markers against other Cyrillic languages.
 */
export function detectLanguage(
  text: string,
  options?: DetectionOptions,
): LanguageDetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      isUkrainian: false,
      detectedLang: "other",
      confidence: 0,
      ukPercentage: 0,
      ukScore: 0,
      foreignScore: 0,
    };
  }

  const cyrillicMatches = text.match(GENERAL_CYRILLIC_REGEX);
  const cyrillicCount = cyrillicMatches ? cyrillicMatches.length : 0;

  // Metadata cues
  const langAttr = options?.langAttr?.toLowerCase().trim() ?? "";
  const ogLocale = options?.ogLocale?.toLowerCase().trim() ?? "";

  const hasUkLangAttr =
    langAttr.startsWith("uk") ||
    ogLocale.startsWith("uk") ||
    ogLocale.includes("uk_ua");

  const hasForeignLangAttr =
    langAttr.startsWith("ru") ||
    langAttr.startsWith("be") ||
    langAttr.startsWith("bg") ||
    langAttr.startsWith("sr") ||
    langAttr.startsWith("mk") ||
    langAttr.startsWith("kk") ||
    langAttr.startsWith("tg") ||
    ogLocale.startsWith("ru") ||
    ogLocale.startsWith("bg") ||
    ogLocale.startsWith("sr") ||
    ogLocale.startsWith("be");

  // If there's barely any Cyrillic text and no relevant language attributes
  if (cyrillicCount < 20 && !hasUkLangAttr && !hasForeignLangAttr) {
    return {
      isUkrainian: false,
      detectedLang: "other",
      confidence: 0,
      ukPercentage: 0,
      ukScore: 0,
      foreignScore: 0,
    };
  }

  // 1. Character-level counts
  const ukLetters = text.match(UKRAINIAN_EXCLUSIVE_REGEX)?.length ?? 0;
  const ukApostrophes = text.match(UKRAINIAN_APOSTROPHE_REGEX)?.length ?? 0;
  const ukCharCount = ukLetters + ukApostrophes;

  const foreignCharCount =
    text.match(NON_UKRAINIAN_CYRILLIC_REGEX)?.length ?? 0;

  // 2. Lexical / Stop-word counts
  const words = extractWords(text);
  let ukWordCount = 0;
  let foreignWordCount = 0;

  for (const word of words) {
    if (UKRAINIAN_STOP_WORDS.has(word)) {
      ukWordCount++;
    }
    if (NON_UKRAINIAN_STOP_WORDS.has(word)) {
      foreignWordCount++;
    }
  }

  // 3. Composite score calculation
  let ukScore = ukCharCount * 3 + ukWordCount * 4;
  let foreignScore = foreignCharCount * 3 + foreignWordCount * 4;

  if (hasUkLangAttr) {
    ukScore += 15;
  }
  if (hasForeignLangAttr) {
    foreignScore += 20;
  }

  const totalScore = ukScore + foreignScore;

  // Case A: No discriminating markers found at all
  if (totalScore === 0) {
    if (hasUkLangAttr && cyrillicCount >= 20) {
      return {
        isUkrainian: true,
        detectedLang: "uk",
        confidence: 0.75,
        ukPercentage: 100,
        ukScore,
        foreignScore,
      };
    }
    return {
      isUkrainian: false,
      detectedLang: cyrillicCount >= 20 ? "foreign_cyrillic" : "other",
      confidence: 0.2,
      ukPercentage: 0,
      ukScore,
      foreignScore,
    };
  }

  // Case B: Calculate proportion / percentage of Ukrainian markers
  const ukRatio = ukScore / totalScore;
  const ukPercentage = Math.round(ukRatio * 100);

  // A page is PREDOMINANTLY Ukrainian if:
  // 1. It has noticeable Ukrainian evidence (ukScore >= 4)
  // 2. Ukrainian markers constitute at least 70% of all language markers (ukPercentage >= 70)
  //    (meaning a couple of Russian/foreign words in a quote or comment will NOT block it).
  const isPredominantlyUkrainian = ukScore >= 4 && ukPercentage >= 70;

  const confidence = Math.min(1, Math.max(0.5, ukRatio));

  return {
    isUkrainian: isPredominantlyUkrainian,
    detectedLang: isPredominantlyUkrainian
      ? "uk"
      : foreignScore > 0
        ? "foreign_cyrillic"
        : "other",
    confidence,
    ukPercentage,
    ukScore,
    foreignScore,
  };
}

/**
 * Samples text content from the current document to analyze page language.
 */
export function samplePageText(): string {
  if (typeof document === "undefined") return "";

  const samples: string[] = [];

  if (document.title) {
    samples.push(document.title);
  }

  // Meta description & OpenGraph description
  const metaDesc = document.querySelector(
    'meta[name="description"], meta[property="og:description"]',
  );
  if (metaDesc) {
    const content = metaDesc.getAttribute("content");
    if (content) samples.push(content);
  }

  // Headings
  const headings = document.querySelectorAll("h1, h2, h3");
  const maxHeadings = Math.min(headings.length, 15);
  for (let i = 0; i < maxHeadings; i++) {
    const text = headings[i]?.textContent?.trim();
    if (text) samples.push(text);
  }

  // Main content paragraphs
  const paragraphs = document.querySelectorAll(
    "main p, article p, [role='main'] p, p",
  );
  const maxParagraphs = Math.min(paragraphs.length, 30);
  for (let i = 0; i < maxParagraphs; i++) {
    const text = paragraphs[i]?.textContent?.trim();
    if (text) {
      samples.push(text.slice(0, 400));
    }
  }

  // Fallback to body text sample if structured selectors yielded little text
  const currentTotal = samples.join(" ").length;
  if (currentTotal < 250 && document.body) {
    const bodySample = document.body.textContent?.slice(0, 4000);
    if (bodySample) samples.push(bodySample);
  }

  return samples.join("\n");
}

/**
 * Evaluates whether the current DOM page is reliably and predominantly Ukrainian.
 */
export function isUkrainianPage(): boolean {
  if (typeof document === "undefined") return false;

  const docLang =
    document.documentElement?.lang ||
    document.body?.getAttribute("lang") ||
    null;

  const ogLocaleMeta = document.querySelector(
    'meta[property="og:locale"], meta[name="og:locale"]',
  );
  const ogLocale = ogLocaleMeta?.getAttribute("content") || null;

  const textSample = samplePageText();
  const result = detectLanguage(textSample, {
    langAttr: docLang,
    ogLocale,
  });

  return result.isUkrainian;
}
