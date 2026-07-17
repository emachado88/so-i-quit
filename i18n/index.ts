import { getLocales } from "expo-localization";
import { useCallback, useMemo } from "react";
import en, { type TranslationKey } from "./en";
import type { Translations } from "./en";

// ── Available languages ──

const translations: Record<string, Translations> = {
  en: require("./en").default,
  pt: require("./pt").default,
  fr: require("./fr").default,
  es: require("./es").default,
  it: require("./it").default,
  zh: require("./zh").default,
  de: require("./de").default,
  nl: require("./nl").default,
};

/** Supported language codes for the settings picker. */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "zh", label: "中文" },
  { code: "de", label: "Deutsch" },
  { code: "nl", label: "Nederlands" },
] as const;

/** Map device language codes to our supported codes. */
const LANGUAGE_MAP: Record<string, string> = {
  pt: "pt",
  "pt-br": "pt",
  fr: "fr",
  es: "es",
  it: "it",
  zh: "zh",
  "zh-cn": "zh",
  "zh-tw": "zh",
  "zh-hk": "zh",
  de: "de",
  nl: "nl",
  en: "en",
  "en-us": "en",
  "en-gb": "en",
};

// ── Detection ──

/**
 * Detect the best language code from the device locale.
 * Returns a supported language code, defaulting to "en".
 */
export const detectLanguage = (): string => {
  try {
    const locale = getLocales()[0];
    if (!locale) return "en";

    const tag = locale.languageTag?.toLowerCase();
    const code = locale.languageCode?.toLowerCase();

    // Try full tag first (e.g. "pt-br"), then language code (e.g. "pt")
    if (tag && LANGUAGE_MAP[tag]) return LANGUAGE_MAP[tag];
    if (code && LANGUAGE_MAP[code]) return LANGUAGE_MAP[code];
  } catch {
    // fall through
  }
  return "en";
};

// ── Interpolation ──

/**
 * Replace `{{key}}` placeholders in a translation string.
 * Example: interpolate("Hello {{name}}!", { name: "World" }) → "Hello World!"
 */
const interpolate = (template: string, params?: Record<string, string>): string => {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
};

// ── Hook ──

export interface UseTranslationReturn {
  /** Translate a key with optional interpolation params. */
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

/**
 * Get the translation function for a given language code.
 * Falls back to English for missing keys.
 */
export const useTranslation = (language: string): UseTranslationReturn => {
  const dict = useMemo(() => translations[language] ?? translations.en, [language]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string>): string => {
      const template = dict[key] ?? en[key] ?? key;
      return interpolate(template, params);
    },
    [dict],
  );

  return { t };
};
