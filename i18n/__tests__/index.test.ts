import { renderHook } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";

import { SUPPORTED_LANGUAGES, detectLanguage, useTranslation } from "@/i18n";
import type { TranslationKey } from "@/i18n/en";

/** Override the device locale fixture for one test. */
const setLocales = (locales: unknown[]) => {
  const target = (globalThis as unknown as { __rnTestLocales: unknown[] })
    .__rnTestLocales;
  target.splice(0, target.length, ...locales);
};

describe("i18n/index", () => {
  describe("detectLanguage", () => {
    it("maps pt-br to pt", () => {
      setLocales([{ languageTag: "pt-BR", languageCode: "pt" }]);
      expect(detectLanguage()).toBe("pt");
    });

    it("maps zh-tw / zh-hk to zh", () => {
      setLocales([{ languageTag: "zh-TW", languageCode: "zh" }]);
      expect(detectLanguage()).toBe("zh");
      setLocales([{ languageTag: "zh-HK", languageCode: "zh" }]);
      expect(detectLanguage()).toBe("zh");
    });

    it("maps en-gb to en", () => {
      setLocales([{ languageTag: "en-GB", languageCode: "en" }]);
      expect(detectLanguage()).toBe("en");
    });

    it("falls back to en for unsupported languages", () => {
      setLocales([{ languageTag: "ja-JP", languageCode: "ja" }]);
      expect(detectLanguage()).toBe("en");
    });

    it("falls back to en when no locale is available", () => {
      setLocales([]);
      expect(detectLanguage()).toBe("en");
    });
  });

  describe("useTranslation", () => {
    it("returns the requested language dictionary", async () => {
      const { result } = await renderHook(() => useTranslation("pt"));
      expect(result.current.t("common.dismiss")).not.toBe("common.dismiss");
    });

    it("interpolates {{params}} placeholders", async () => {
      const { result } = await renderHook(() => useTranslation("en"));
      const out = result.current.t("progress.freeFor", { name: "Alcohol" });
      expect(out).toContain("Alcohol");
      expect(out).not.toContain("{{");
    });

    it("keeps missing params as raw placeholders", async () => {
      const { result } = await renderHook(() => useTranslation("en"));
      // Pass no params to a key that requires them.
      const out = result.current.t("progress.freeFor");
      expect(out).toContain("{{name}}");
    });

    it("falls back to English for unknown languages", async () => {
      const { result } = await renderHook(() => useTranslation("xx"));
      const out = result.current.t("common.dismiss");
      expect(out).not.toBe("xx");
      expect(typeof out).toBe("string");
    });

    it("returns the raw key when the key is missing everywhere", async () => {
      const { result } = await renderHook(() => useTranslation("en"));
      const missing = "does.not.exist" as TranslationKey;
      expect(result.current.t(missing)).toBe(missing);
    });
  });

  describe("SUPPORTED_LANGUAGES", () => {
    it("lists 8 languages with unique codes and non-empty labels", () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(8);
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      expect(new Set(codes).size).toBe(codes.length);
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(lang.label.length).toBeGreaterThan(0);
      }
    });
  });
});
