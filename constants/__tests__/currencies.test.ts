import { describe, expect, it } from "@jest/globals";

import {
  CURRENCY_SYMBOLS,
  REGION_TO_CURRENCY,
} from "@/constants/currencies";

const ISO_CODE = /^[A-Z]{3}$/;

describe("constants/currencies", () => {
  describe("CURRENCY_SYMBOLS", () => {
    it("uses 3-letter uppercase ISO codes as keys", () => {
      for (const code of Object.keys(CURRENCY_SYMBOLS)) {
        expect(code).toMatch(ISO_CODE);
      }
    });

    it("has non-empty symbols", () => {
      for (const symbol of Object.values(CURRENCY_SYMBOLS)) {
        expect(symbol.length).toBeGreaterThan(0);
      }
    });

    it("includes the major currencies", () => {
      expect(CURRENCY_SYMBOLS.EUR).toBe("€");
      expect(CURRENCY_SYMBOLS.USD).toBe("$");
      expect(CURRENCY_SYMBOLS.GBP).toBe("£");
      expect(CURRENCY_SYMBOLS.JPY).toBe("¥");
    });
  });

  describe("REGION_TO_CURRENCY", () => {
    it("maps every region to a 3-letter uppercase currency code", () => {
      for (const [region, currency] of Object.entries(REGION_TO_CURRENCY)) {
        expect(region).toMatch(/^[A-Z]{2}$/);
        expect(currency).toMatch(ISO_CODE);
      }
    });

    it("covers known region mappings", () => {
      expect(REGION_TO_CURRENCY.PT).toBe("EUR");
      expect(REGION_TO_CURRENCY.US).toBe("USD");
      expect(REGION_TO_CURRENCY.BR).toBe("BRL");
      expect(REGION_TO_CURRENCY.JP).toBe("JPY");
      expect(REGION_TO_CURRENCY.GB).toBe("GBP");
    });
  });
});
