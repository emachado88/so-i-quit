import {
  MD3DarkTheme,
  MD3LightTheme,
  configureFonts,
} from "react-native-paper";

export const Colors = {
  standard: {
    primary: "#1A6B5C",
    hover: "#2A8F7A",
    depth: "#12504A",
    accent: "#D4922A",
    subtleFill: "#E5A94A",
    vitality: "#E8735A",
    success: "#2D9D6A",
    danger: "#D94F4F",
  },
  light: {
    background: "#F7F6F3",
    surface: "#FFFFFF",
    card: "#F0EEEA",
    border: "#E2E0DC",
    muted: "#8A8680",
    foreground: "#1C1B1A",
    text: "#1C1B1A",
  },
  dark: {
    background: "#0F0E0D",
    surface: "#1A1918",
    card: "#242321",
    border: "#2E2D2B",
    muted: "#7A7670",
    foreground: "#F0EEEA",
    text: "#F0EEEA",
  },
};

const fontFamilyConfig = {
  // Inter — headings (Black for prominence, Bold for titles)
  displayLarge: { fontFamily: "Inter-Black" },
  displayMedium: { fontFamily: "Inter-Black" },
  displaySmall: { fontFamily: "Inter-Bold" },
  headlineLarge: { fontFamily: "Inter-Black" },
  headlineMedium: { fontFamily: "Inter-Black" },
  headlineSmall: { fontFamily: "Inter-Bold" },
  titleLarge: { fontFamily: "Inter-Bold" },
  titleMedium: { fontFamily: "Inter-Bold" },
  titleSmall: { fontFamily: "Inter-Medium" },
  // Inter — body & labels
  bodyLarge: { fontFamily: "Inter-Regular" },
  bodyMedium: { fontFamily: "Inter-Regular" },
  bodySmall: { fontFamily: "Inter-Regular" },
  labelLarge: { fontFamily: "Inter-Medium" },
  labelMedium: { fontFamily: "Inter-Medium" },
  labelSmall: { fontFamily: "Inter-SemiBold" },
};

const fonts = configureFonts({ config: fontFamilyConfig });

export const themes = {
  light: {
    ...MD3LightTheme,
    roundness: 4,
    fonts,
    colors: {
      // Primary — brand teal
      primary: Colors.standard.primary,
      onPrimary: "#FFFFFF",
      primaryContainer: "#CEE8E0",
      onPrimaryContainer: "#08352C",

      // Secondary — accent gold
      secondary: Colors.standard.accent,
      onSecondary: "#FFFFFF",
      secondaryContainer: "#F5E8C8",
      onSecondaryContainer: "#4D3300",

      // Tertiary — coral vitality
      tertiary: Colors.standard.vitality,
      onTertiary: "#FFFFFF",
      tertiaryContainer: "#FCE4DC",
      onTertiaryContainer: "#5C1A0E",

      // Surface / Background
      background: Colors.light.background,
      onBackground: Colors.light.foreground,
      surface: Colors.light.surface,
      onSurface: Colors.light.foreground,
      surfaceVariant: Colors.light.card,
      onSurfaceVariant: Colors.light.muted,
      surfaceDisabled: "#E3E3E3",
      onSurfaceDisabled: "#A8A8A7",

      // Error
      error: Colors.standard.danger,
      onError: "#FFFFFF",
      errorContainer: "#FCE4E4",
      onErrorContainer: "#601010",

      // Outline / Border
      outline: Colors.light.border,
      outlineVariant: "#C8C5C0",

      // Inverse
      inverseSurface: Colors.dark.surface,
      inverseOnSurface: Colors.dark.foreground,
      inversePrimary: Colors.standard.hover,

      // Misc
      shadow: "#000000",
      scrim: "#000000",
      backdrop: "#A4A3A3",

      // Elevation — surface with primary tint at varying opacities
      elevation: {
        level0: "transparent",
        level1: "#F3F7F6",
        level2: "#ECF3F1",
        level3: "#E5EEED",
        level4: "#E3EDEB",
        level5: "#DEEAE8",
      },
    },
  },
  dark: {
    ...MD3DarkTheme,
    roundness: 4,
    fonts,
    colors: {
      // Primary — lighter teal for dark bg visibility
      primary: Colors.standard.primary,
      onPrimary: "#FFFFFF",
      primaryContainer: Colors.standard.depth,
      onPrimaryContainer: "#CEE8E0",

      // Secondary — lighter gold for dark bg
      secondary: Colors.standard.subtleFill,
      onSecondary: Colors.dark.foreground,
      secondaryContainer: "#4D3300",
      onSecondaryContainer: "#F5E8C8",

      // Tertiary — coral vitality (bright enough for dark)
      tertiary: Colors.standard.vitality,
      onTertiary: "#FFFFFF",
      tertiaryContainer: "#5C1A0E",
      onTertiaryContainer: "#FCE4DC",

      // Surface / Background
      background: Colors.dark.background,
      onBackground: Colors.dark.foreground,
      surface: Colors.dark.surface,
      onSurface: Colors.dark.foreground,
      surfaceVariant: Colors.dark.card,
      onSurfaceVariant: Colors.dark.muted,
      surfaceDisabled: "#333231",
      onSurfaceDisabled: "#6B6967",

      // Error — lighter red for dark bg readability
      error: "#F06060",
      onError: Colors.dark.foreground,
      errorContainer: "#601010",
      onErrorContainer: "#FCE4E4",

      // Outline / Border
      outline: Colors.dark.border,
      outlineVariant: "#3A3835",

      // Inverse
      inverseSurface: Colors.light.background,
      inverseOnSurface: Colors.light.foreground,
      inversePrimary: Colors.standard.hover,

      // Misc
      shadow: "#000000",
      scrim: "#000000",
      backdrop: "#696765",

      // Elevation — dark surface with primary80 tint at varying opacities
      elevation: {
        level0: "transparent",
        level1: "#1A1E1C",
        level2: "#1B221F",
        level3: "#1B2522",
        level4: "#1B2723",
        level5: "#1C2925",
      },
    },
  },
};
