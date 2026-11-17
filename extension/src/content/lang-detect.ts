/**
 * Language detection module for UkrLat.
 * Determines whether a text sample or the current web page is reliably Ukrainian.
 */

export interface LanguageDetectionResult {
  isUkrainian: boolean;
  detectedLang: "uk" | "ru" | "other";
  confidence: number; // 0 to 1
  ukScore: number;
  ruScore: number;
}

export interface DetectionOptions {
  langAttr?: string | null;
  ogLocale?: string | null;
}

// Letters that exist ONLY in Ukrainian (never in standard Russian)
const UKRAINIAN_EXCLUSIVE_REGEX = /[іїєґІЇЄҐ]/g;

// Typical Ukrainian word-internal apostrophe (e.g. м'ясо, п'ять, з'їзд, сім'я)
const UKRAINIAN_APOSTROPHE_REGEX =
  /[бпвмфгркхжчшщБПВМФГРКХЖЧШЩ]['’`ʼ][яюєїЯЮЄЇ]/g;

// Letters that exist ONLY in Russian (never in standard Ukrainian)
const RUSSIAN_EXCLUSIVE_REGEX = /[ыэъёЫЭЪЁ]/g;

// General Cyrillic characters
const CYRILLIC_REGEX = /[а-яА-ЯёЁіІїЇєЄґҐ]/g;

// High-frequency distinctive Ukrainian stop words (normalized to lowercase)
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

// High-frequency distinctive Russian stop words (normalized to lowercase)
const RUSSIAN_STOP_WORDS = new Set([
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
]);

/**
 * Tokenizes text into lowercase words.
 */
function extractWords(text: string): string[] {
  const matches = text.toLowerCase().match(/[\p{L}'’`ʼ-]+/gu);
  return matches ?? [];
}

/**
 * Detects whether the given text is reliably Ukrainian.
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
      ukScore: 0,
      ruScore: 0,
    };
  }

  const cyrillicMatches = text.match(CYRILLIC_REGEX);
  const cyrillicCount = cyrillicMatches ? cyrillicMatches.length : 0;

  // Metadata cues
  const langAttr = options?.langAttr?.toLowerCase().trim() ?? "";
  const ogLocale = options?.ogLocale?.toLowerCase().trim() ?? "";

  const hasUkLangAttr =
    langAttr.startsWith("uk") ||
    ogLocale.startsWith("uk") ||
    ogLocale.includes("uk_ua");

  const hasRuLangAttr =
    langAttr.startsWith("ru") ||
    langAttr.startsWith("be") ||
    ogLocale.startsWith("ru") ||
    ogLocale.includes("ru_ru");

  // If there's barely any Cyrillic text
  if (cyrillicCount < 10 && !hasUkLangAttr) {
    return {
      isUkrainian: false,
      detectedLang: "other",
      confidence: 0,
      ukScore: 0,
      ruScore: 0,
    };
  }

  // Character-level metrics
  const ukLetters = text.match(UKRAINIAN_EXCLUSIVE_REGEX)?.length ?? 0;
  const ukApostrophes = text.match(UKRAINIAN_APOSTROPHE_REGEX)?.length ?? 0;
  const ukCharCount = ukLetters + ukApostrophes;

  const ruCharCount = text.match(RUSSIAN_EXCLUSIVE_REGEX)?.length ?? 0;

  // Lexical / Stop-word metrics
  const words = extractWords(text);
  let ukWordCount = 0;
  let ruWordCount = 0;

  for (const word of words) {
    if (UKRAINIAN_STOP_WORDS.has(word)) {
      ukWordCount++;
    }
    if (RUSSIAN_STOP_WORDS.has(word)) {
      ruWordCount++;
    }
  }

  // Compute weighted scores
  let ukScore = ukCharCount * 4 + ukWordCount * 3;
  let ruScore = ruCharCount * 4 + ruWordCount * 3;

  if (hasUkLangAttr) {
    ukScore += 12;
  }
  if (hasRuLangAttr) {
    ruScore += 16;
  }

  // Rule 1: Clear Russian markers present and no Ukrainian markers
  if (ruCharCount > 0 && ukCharCount === 0 && ukWordCount === 0) {
    return {
      isUkrainian: false,
      detectedLang: "ru",
      confidence: 0.95,
      ukScore,
      ruScore,
    };
  }

  // Rule 2: Russian score distinctly dominates
  if (ruScore > ukScore * 1.3 || (ruScore > 0 && ukScore === 0)) {
    return {
      isUkrainian: false,
      detectedLang: "ru",
      confidence: Math.min(1, ruScore / 20),
      ukScore,
      ruScore,
    };
  }

  // Rule 3: Clear Ukrainian markers present
  if (ukScore >= 2 && ukScore > ruScore) {
    const confidence = Math.min(
      1,
      0.5 + (ukScore - ruScore) / (ukScore + ruScore + 5),
    );
    return {
      isUkrainian: true,
      detectedLang: "uk",
      confidence,
      ukScore,
      ruScore,
    };
  }

  // Rule 4: Ambiguous / shared letters only (e.g. short Cyrillic phrase)
  if (cyrillicCount >= 10) {
    if (hasUkLangAttr && !hasRuLangAttr) {
      return {
        isUkrainian: true,
        detectedLang: "uk",
        confidence: 0.7,
        ukScore,
        ruScore,
      };
    }
    if (hasRuLangAttr) {
      return {
        isUkrainian: false,
        detectedLang: "ru",
        confidence: 0.7,
        ukScore,
        ruScore,
      };
    }
  }

  return {
    isUkrainian: false,
    detectedLang: cyrillicCount > 10 ? "other" : "other",
    confidence: 0.2,
    ukScore,
    ruScore,
  };
}

/**
 * Samples visible text content from the current document to analyze page language.
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
  const maxHeadings = Math.min(headings.length, 12);
  for (let i = 0; i < maxHeadings; i++) {
    const text = headings[i]?.textContent?.trim();
    if (text) samples.push(text);
  }

  // Main content paragraphs
  const paragraphs = document.querySelectorAll(
    "main p, article p, [role='main'] p, p",
  );
  const maxParagraphs = Math.min(paragraphs.length, 25);
  for (let i = 0; i < maxParagraphs; i++) {
    const text = paragraphs[i]?.textContent?.trim();
    if (text) {
      samples.push(text.slice(0, 400));
    }
  }

  // Fallback to body text sample if structured selectors yielded little text
  const currentTotal = samples.join(" ").length;
  if (currentTotal < 200 && document.body) {
    const bodySample = document.body.textContent?.slice(0, 3000);
    if (bodySample) samples.push(bodySample);
  }

  return samples.join("\n");
}

/**
 * Evaluates whether the current DOM page is reliably Ukrainian.
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
