import dayjs from "dayjs";
import "dayjs/locale/de";
import "dayjs/locale/es";
import "dayjs/locale/fr";
import "dayjs/locale/it";
import "dayjs/locale/nl";
import "dayjs/locale/pt";
import "dayjs/locale/pt-br";
import "dayjs/locale/en-gb";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getLocales } from "expo-localization";
import "react-native-reanimated";

import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { themes } from "@/constants/theme";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import React, { useCallback, useEffect, useState } from "react";
import { getTheme, saveTheme } from "@/data/settings";
import type { Theme } from "@/constants/interfaces";
import {
  AppThemeContext,
  type AppThemeValue,
} from "@/contexts/theme-context";

/**
 * Map of region codes to dayjs locale names.
 * Most European regions (PT→pt, FR→fr, DE→de, ES→es, IT→it, NL→nl, etc.)
 * happen to match by lowercasing the code, but we enumerate explicitly for clarity
 * and to handle exceptions (US→en, GB→en-gb, BR→pt-br, etc.).
 *
 * All referenced locale files are statically imported above because Metro
 * cannot resolve dynamic import() expressions at build time.
 */
const REGION_TO_LOCALE: Record<string, string> = {
  PT: "pt",
  BR: "pt-br",
  FR: "fr",
  DE: "de",
  ES: "es",
  IT: "it",
  NL: "nl",
  GB: "en-gb",
  US: "en",
  CN: "zh-cn",
  TW: "zh-tw",
  HK: "zh-hk",
  JP: "ja",
  KR: "ko",
};

/** Set the dayjs locale based on the device's region (date/time format), not language. */
function initDayjsLocale() {
  const locale = getLocales()[0];
  if (!locale) {
    dayjs.locale("en");
    return;
  }

  const { regionCode, languageCode } = locale;

  // Region controls date/time/number formatting — prefer it over language
  if (regionCode) {
    const mapped = REGION_TO_LOCALE[regionCode.toUpperCase()];
    if (mapped) {
      dayjs.locale(mapped);
      return;
    }
  }

  // Fall back to the language code
  dayjs.locale((languageCode ?? "en").toLowerCase());
}

initDayjsLocale();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
    "Inter-Black": Inter_900Black,
  });

  const deviceScheme = useColorScheme() ?? "light";
  const [storedTheme, setStoredTheme] = useState<Theme | null>(null);

  // Starts in parallel with font loading — both block rendering together
  useEffect(() => {
    getTheme().then(setStoredTheme);
  }, []);

  const setTheme = useCallback(async (theme: Theme) => {
    await saveTheme(theme);
    setStoredTheme(theme);
  }, []);

  // Block until both fonts AND persisted theme are ready — no flicker
  if (!fontsLoaded || storedTheme === null) return null;

  const scheme: "light" | "dark" =
    storedTheme === "system" ? deviceScheme : storedTheme;

  const contextValue: AppThemeValue = { scheme, storedTheme, setTheme };

  return (
    <AppThemeContext.Provider value={contextValue}>
      <PaperProvider theme={themes[scheme]}>
        <Stack
          screenOptions={{
            contentStyle: {
              backgroundColor: themes[scheme].colors.background,
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </PaperProvider>
    </AppThemeContext.Provider>
  );
}
