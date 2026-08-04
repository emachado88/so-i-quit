import { describe, expect, it } from "@jest/globals";

import { Colors, fontFamilyConfig, themes } from "@/constants/theme";

describe("constants/theme", () => {
  describe("Colors.standard (brand)", () => {
    it("matches the documented brand tokens", () => {
      expect(Colors.standard.primary).toBe("#1A6B5C");
      expect(Colors.standard.hover).toBe("#2A8F7A");
      expect(Colors.standard.depth).toBe("#12504A");
      expect(Colors.standard.accent).toBe("#D4922A");
    });

    it("exposes the full standard palette", () => {
      expect(Object.keys(Colors.standard).sort()).toEqual(
        [
          "primary",
          "hover",
          "depth",
          "accent",
          "subtleFill",
          "vitality",
          "success",
          "danger",
        ].sort(),
      );
    });
  });

  describe("themes.light / themes.dark", () => {
    const requiredKeys = [
      "primary",
      "onPrimary",
      "background",
      "surface",
      "onSurface",
      "surfaceVariant",
      "error",
      "outline",
      "elevation",
    ];

    it("light exposes the MD3 color contract", () => {
      for (const key of requiredKeys) {
        expect(themes.light.colors).toHaveProperty(key);
      }
      expect(themes.light.roundness).toBe(1);
    });

    it("dark exposes the MD3 color contract", () => {
      for (const key of requiredKeys) {
        expect(themes.dark.colors).toHaveProperty(key);
      }
      expect(themes.dark.roundness).toBe(1);
    });

    it("uses the brand primary in both schemes", () => {
      expect(themes.light.colors.primary).toBe(Colors.standard.primary);
      expect(themes.dark.colors.primary).toBe(Colors.standard.primary);
    });

    it("dark uses dark surfaces, light uses light surfaces", () => {
      expect(themes.dark.colors.background).toBe(Colors.dark.background);
      expect(themes.light.colors.background).toBe(Colors.light.background);
    });
  });

  describe("fontFamilyConfig", () => {
    it("maps every MD3 text role to an Inter family", () => {
      for (const [role, config] of Object.entries(fontFamilyConfig)) {
        expect(config.fontFamily).toMatch(/^Inter-(Regular|Medium|SemiBold|Bold|Black)$/);
        expect(role).toMatch(/^(display|headline|title|body|label)/);
      }
    });

    it("uses Black for display/headlines and Bold for titles", () => {
      expect(fontFamilyConfig.displayLarge.fontFamily).toBe("Inter-Black");
      expect(fontFamilyConfig.headlineMedium.fontFamily).toBe("Inter-Black");
      expect(fontFamilyConfig.titleLarge.fontFamily).toBe("Inter-Bold");
    });

    it("uses Regular for body and Medium/SemiBold for labels", () => {
      expect(fontFamilyConfig.bodyLarge.fontFamily).toBe("Inter-Regular");
      expect(fontFamilyConfig.labelMedium.fontFamily).toBe("Inter-Medium");
      expect(fontFamilyConfig.labelSmall.fontFamily).toBe("Inter-SemiBold");
    });
  });
});
