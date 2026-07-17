import React, { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  Divider,
  IconButton,
  Searchbar,
  SegmentedButtons,
  Snackbar,
} from "react-native-paper";

import { ThemedText } from "@/components/themed-text";
import { CURRENCY_SYMBOLS } from "@/constants/currencies";
import { globalStyles } from "@/constants/styles";
import { useAppSettings } from "@/contexts/settings-context";
import type { Theme } from "@/constants/interfaces";
import { themes } from "@/constants/theme";
import { SUPPORTED_LANGUAGES } from "@/i18n";

export default function SettingsScreen(): React.JSX.Element {
  const {
    storedTheme,
    scheme,
    setTheme,
    currency,
    setCurrency,
    language,
    setLanguage,
    t,
  } = useAppSettings();
  const options = useCurrencyOptions();
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const themeOptions = useMemo(
    () => [
      { value: "system" as Theme, label: t("settings.system") },
      { value: "light" as Theme, label: t("settings.light") },
      { value: "dark" as Theme, label: t("settings.dark") },
    ],
    [t],
  );

  const currentLangLabel = useMemo(
    () =>
      SUPPORTED_LANGUAGES.find((l) => l.code === language)?.label ?? language,
    [language],
  );

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(
      (c) =>
        c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [options, search]);

  const handleThemeChange = useCallback(
    (value: string): void => {
      setTheme(value as Theme).catch(() => setError(t("settings.failedTheme")));
    },
    [setTheme, t],
  );

  const handleLanguageChange = useCallback(
    (value: string): void => {
      setLanguage(value).catch(() => setError(t("settings.failedLanguage")));
    },
    [setLanguage, t],
  );

  const handleCurrencyChange = useCallback(
    (code: string): void => {
      setCurrency(code).catch(() => setError(t("settings.failedCurrency")));
    },
    [setCurrency, t],
  );

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setSearch("");
  }, []);

  const selectCurrency = useCallback(
    (code: string): void => {
      handleCurrencyChange(code);
      closePicker();
    },
    [handleCurrencyChange, closePicker],
  );

  const currentSymbol = CURRENCY_SYMBOLS[currency] ?? currency;

  return (
    <View style={globalStyles.flex1}>
      <ScrollView
        contentContainerStyle={[globalStyles.container, styles.container]}
      >
        {/* ── Appearance ── */}
        <ThemedText>{t("settings.appearance")}</ThemedText>
        <SegmentedButtons
          value={storedTheme}
          buttons={themeOptions}
          onValueChange={handleThemeChange}
        />

        <Divider />

        {/* ── Language ── */}
        <ThemedText>{t("settings.language")}</ThemedText>
        <Pressable
          onPress={() => setLangPickerOpen(true)}
          style={[
            styles.pickerButton,
            { backgroundColor: themes[scheme].colors.surfaceVariant },
          ]}
        >
          <View style={styles.pickerButtonContent}>
            <ThemedText style={styles.pickerButtonLabel}>
              {currentLangLabel}
            </ThemedText>
            <IconButton icon="chevron-down" style={{ margin: 0 }} />
          </View>
        </Pressable>

        <Divider />

        {/* ── Currency ── */}
        <ThemedText>{t("settings.currency")}</ThemedText>
        <Pressable
          onPress={openPicker}
          style={[
            styles.pickerButton,
            { backgroundColor: themes[scheme].colors.surfaceVariant },
          ]}
        >
          <View style={styles.pickerButtonContent}>
            <ThemedText style={styles.pickerButtonLabel}>
              {currentSymbol} {currency}
            </ThemedText>
            <IconButton icon="chevron-down" style={{ margin: 0 }} />
          </View>
        </Pressable>
      </ScrollView>

      {/* ── Language picker modal ── */}
      <Modal
        visible={langPickerOpen}
        onRequestClose={() => setLangPickerOpen(false)}
        animationType="fade"
        transparent
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLangPickerOpen(false)}
        >
          <Pressable
            style={[
              globalStyles.container,
              styles.modalContent,
              { backgroundColor: themes[scheme].colors.surface },
            ]}
            onPress={() => {}}
          >
            <ScrollView style={styles.modalList}>
              {SUPPORTED_LANGUAGES.map((l) => {
                const isActive = l.code === language;
                return (
                  <Pressable
                    key={l.code}
                    onPress={() => {
                      handleLanguageChange(l.code);
                      setLangPickerOpen(false);
                    }}
                  >
                    <View
                      style={[
                        styles.optionRow,
                        isActive && {
                          backgroundColor:
                            themes[scheme].colors.primaryContainer,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.optionText,
                          isActive && {
                            color: themes[scheme].colors.onPrimaryContainer,
                          },
                        ]}
                      >
                        {l.label}
                      </ThemedText>
                      {isActive && (
                        <ThemedText
                          style={{
                            color: themes[scheme].colors.onPrimaryContainer,
                          }}
                        >
                          ✓
                        </ThemedText>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Searchable currency picker modal ── */}
      <Modal
        visible={pickerOpen}
        onRequestClose={closePicker}
        animationType="fade"
        transparent
      >
        <Pressable style={styles.modalOverlay} onPress={closePicker}>
          <Pressable
            style={[
              globalStyles.container,
              styles.modalContent,
              { backgroundColor: themes[scheme].colors.surface },
            ]}
            onPress={() => {}} /* prevent tap-through to backdrop */
          >
            <Searchbar
              placeholder={t("settings.searchCurrency")}
              onChangeText={setSearch}
              value={search}
              autoFocus
              style={styles.searchbar}
            />

            <ScrollView style={styles.modalList}>
              {filtered.map((c) => {
                const symbol = CURRENCY_SYMBOLS[c.code] ?? c.code;
                const isActive = c.code === currency;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => selectCurrency(c.code)}
                  >
                    <View
                      style={[
                        styles.optionRow,
                        isActive && {
                          backgroundColor:
                            themes[scheme].colors.primaryContainer,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.optionText,
                          isActive && {
                            color: themes[scheme].colors.onPrimaryContainer,
                          },
                        ]}
                      >
                        {symbol} {c.code}
                      </ThemedText>
                      {isActive && (
                        <ThemedText
                          style={{
                            color: themes[scheme].colors.onPrimaryContainer,
                          }}
                        >
                          ✓
                        </ThemedText>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Error snackbar ── */}
      <Snackbar
        visible={!!error}
        duration={5000}
        action={{
          label: t("common.dismiss"),
          textColor: themes[scheme].colors.onPrimary,
          onPress: () => setError(null),
        }}
        style={{ backgroundColor: themes[scheme].colors.error }}
        onDismiss={() => setError(null)}
      >
        <ThemedText style={{ color: themes[scheme].colors.onPrimary }}>
          {error}
        </ThemedText>
      </Snackbar>
    </View>
  );
}

interface CurrencyOption {
  code: string;
  name: string;
}

/** Build the currency picker list from Intl APIs with a fallback. */
const useCurrencyOptions = (): CurrencyOption[] =>
  useMemo(() => {
    try {
      const codes = Intl.supportedValuesOf("currency") as string[];
      return codes
        .filter((c) => CURRENCY_SYMBOLS[c])
        .sort()
        .map((code) => ({
          code,
          name:
            new Intl.DisplayNames("en", { type: "currency" }).of(code) ?? code,
        }));
    } catch {
      return Object.keys(CURRENCY_SYMBOLS)
        .sort()
        .map((code) => ({ code, name: code }));
    }
  }, []);

const styles = StyleSheet.create({
  container: { gap: 16 },
  pickerButton: {
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  pickerButtonContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerButtonLabel: {
    fontSize: 14,
  },
  hint: {
    fontSize: 13,
    marginTop: -12,
  },
  // ── Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    maxHeight: "80%",
  },
  searchbar: {
    marginBottom: 8,
  },
  modalList: {
    maxHeight: 400,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  optionText: {
    fontSize: 15,
  },
});
