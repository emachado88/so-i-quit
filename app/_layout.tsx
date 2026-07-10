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

import { useColorScheme } from "@/hooks/use-color-scheme";
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
import React from "react";

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
  const colorScheme = useColorScheme() ?? "light";

  const [fontsLoaded] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
    "Inter-Black": Inter_900Black,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider theme={themes[colorScheme]}>
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: themes[colorScheme].colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </PaperProvider>
  );
}
