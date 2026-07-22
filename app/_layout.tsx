import dayjs from "dayjs";
import "dayjs/locale/de";
import "dayjs/locale/es";
import "dayjs/locale/fr";
import "dayjs/locale/it";
import "dayjs/locale/nl";
import "dayjs/locale/pt";
import "dayjs/locale/pt-br";
import "dayjs/locale/en-gb";
import "dayjs/locale/zh-cn";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getLocales } from "expo-localization";
import "react-native-reanimated";
import * as Sentry from "@sentry/react-native";
import { initSentry } from "@/lib/sentry";
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
import {
  getTheme,
  saveTheme,
  getCurrency,
  saveCurrency,
  getLanguage,
  saveLanguage,
} from "@/data/settings";
import type { Theme } from "@/constants/interfaces";
import {
  AppSettingsContext,
  type AppSettingsValue,
} from "@/contexts/settings-context";
import { useTranslation } from "@/i18n";

initSentry();

/**
 * Map region codes to dayjs locale names.
 * Most European regions (PT→pt, FR→fr, DE→de, ES→es, IT→it, NL→nl, etc.)
 * happen to match the lowercased code, but we enumerate explicitly for clarity
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
  TW: "zh-cn",
  HK: "zh-cn",
  JP: "ja",
  KR: "ko",
};

/** Set dayjs locale based on device's region (date/time format), not language. */
const initDayjsLocale = (): void => {
  const locale = getLocales()[0];
  if (!locale) {
    dayjs.locale("en");
    return;
  }
  const regionCode = locale.regionCode;
  const languageCode = locale.languageCode;

  if (regionCode) {
    const mapped = REGION_TO_LOCALE[regionCode.toUpperCase()];
    if (mapped) {
      dayjs.locale(mapped);
      return;
    }
  }

  dayjs.locale((languageCode ?? "en").toLowerCase());
};

initDayjsLocale();

const RootLayout = (): React.JSX.Element | null => {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
    "Inter-Black": Inter_900Black,
  });

  const deviceScheme = useColorScheme() ?? "light";
  const [storedTheme, setStoredTheme] = useState<Theme | null>(null);
  const [currency, setCurrencyState] = useState<string | null>(null);
  const [language, setLanguageState] = useState<string | null>(null);

  const { t } = useTranslation(language ?? "en");

  // Keep dayjs locale in sync with the app language setting
  useEffect(() => {
    if (language) {
      const dayjsMap: Record<string, string> = { zh: "zh-cn" };
      dayjs.locale(dayjsMap[language] ?? language);
    }
  }, [language]);

  useEffect(() => {
    Promise.all([
      getTheme().then(setStoredTheme),
      getCurrency().then(setCurrencyState),
      getLanguage().then(setLanguageState),
    ]);
  }, []);

  const setTheme = useCallback(async (theme: Theme): Promise<void> => {
    await saveTheme(theme);
    setStoredTheme(theme);
  }, []);

  const setCurrency = useCallback(async (code: string): Promise<void> => {
    await saveCurrency(code);
    setCurrencyState(code);
  }, []);

  const setLanguage = useCallback(async (code: string): Promise<void> => {
    await saveLanguage(code);
    setLanguageState(code);
  }, []);

  if (!fontsLoaded || storedTheme === null || currency === null || language === null) {
    return null;
  }

  const scheme: "light" | "dark" =
    storedTheme === "system"
      ? (deviceScheme === "unspecified" ? "light" : deviceScheme)
      : storedTheme;

  const contextValue: AppSettingsValue = {
    scheme,
    storedTheme,
    setTheme,
    currency,
    setCurrency,
    language,
    setLanguage,
    t,
  };

  return (
    <AppSettingsContext.Provider value={contextValue}>
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
    </AppSettingsContext.Provider>
  );
};

export default Sentry.wrap(RootLayout);
