import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Divider, SegmentedButtons, Snackbar } from "react-native-paper";

import { ThemedText } from "@/components/themed-text";
import { globalStyles } from "@/constants/styles";
import { useAppTheme } from "@/contexts/theme-context";
import type { Theme } from "@/constants/interfaces";
import { themes } from "@/constants/theme";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const { storedTheme, scheme, setTheme } = useAppTheme();
  const [error, setError] = useState<string | null>(null);

  const handleThemeChange = useCallback(
    (value: string) => {
      setTheme(value as Theme).catch(() =>
        setError("Failed to save theme preference"),
      );
    },
    [setTheme],
  );

  return (
    <View style={globalStyles.flex1}>
      <View style={[globalStyles.container, styles.container]}>
        <ThemedText>Appearance</ThemedText>

        <SegmentedButtons
          value={storedTheme}
          buttons={THEME_OPTIONS}
          onValueChange={handleThemeChange}
        />

        <Divider />

        <ThemedText>Language and currency settings coming soon.</ThemedText>
      </View>

      <Snackbar
        visible={!!error}
        duration={5000}
        action={{
          label: "Dismiss",
          textColor: themes[scheme].colors.onPrimary,
          onPress: () => setError(null),
        }}
        style={{
          backgroundColor: themes[scheme].colors.error,
        }}
        onDismiss={() => setError(null)}
      >
        <ThemedText style={{ color: themes[scheme].colors.onPrimary }}>
          {error}
        </ThemedText>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
});
