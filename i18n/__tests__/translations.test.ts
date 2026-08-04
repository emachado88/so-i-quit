import { describe, expect, it } from "@jest/globals";

import de from "@/i18n/de";
import en from "@/i18n/en";
import es from "@/i18n/es";
import fr from "@/i18n/fr";
import itLang from "@/i18n/it";
import nl from "@/i18n/nl";
import pt from "@/i18n/pt";
import zh from "@/i18n/zh";

const translations: Record<string, Record<string, string>> = {
  en,
  pt,
  fr,
  es,
  it: itLang,
  zh,
  de,
  nl,
};

const enKeys = Object.keys(en).sort();

describe("i18n translation completeness", () => {
  for (const [code, dict] of Object.entries(translations)) {
    describe(code, () => {
      it("has exactly the same key set as English", () => {
        expect(Object.keys(dict).sort()).toEqual(enKeys);
      });

      it("has no empty or whitespace-only values", () => {
        for (const value of Object.values(dict)) {
          expect(value.trim().length).toBeGreaterThan(0);
        }
      });

      it("is a plain record of strings", () => {
        expect(Object.values(dict).every((v) => typeof v === "string")).toBe(
          true,
        );
      });
    });
  }
});
