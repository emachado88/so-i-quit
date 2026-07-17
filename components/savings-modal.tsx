import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { CURRENCY_SYMBOLS } from "@/constants/currencies";
import { useAppSettings } from "@/contexts/settings-context";
import { Button, Modal, Portal, TextInput } from "react-native-paper";
import { themes } from "@/constants/theme";
import React, { useState, useEffect } from "react";

interface SavingsModalProps {
  visible: boolean;
  value: string | null;
  currency: string;
  scheme: "light" | "dark";
  onSave: (value: string | null) => void;
  onDismiss: () => void;
  optional?: boolean;
}

export default function SavingsModal({
  visible,
  value,
  currency,
  scheme,
  onSave,
  onDismiss,
  optional = false,
}: SavingsModalProps) {
  const { t } = useAppSettings();
  const [localValue, setLocalValue] = useState(value ?? "");

  useEffect(() => {
    if (visible) {
      setLocalValue(value ?? "");
    }
  }, [visible, value]);

  const normalize = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const num = parseFloat(trimmed);
    if (isNaN(num)) return null;
    return num % 1 === 0 ? String(num) : num.toFixed(2);
  };

  const handleSave = () => {
    onSave(normalize(localValue));
  };

  const handleSkip = () => {
    onSave(value);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: themes[scheme].colors.surface },
        ]}
      >
        <ThemedText style={styles.title}>
          {optional ? t("savings.titleOptional") : t("savings.title")}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {t("savings.subtitle")}
        </ThemedText>

        <TextInput
          label={t("savings.amount")}
          value={localValue}
          inputMode="decimal"
          keyboardType="numeric"
          mode="outlined"
          placeholder="0.00"
          right={
            <TextInput.Affix
              text={`${CURRENCY_SYMBOLS[currency] ?? currency}${t("common.perDay")}`}
            />
          }
          onChangeText={(text) =>
            setLocalValue(
              text
                .replace(/[^0-9.]/g, "")
                .replace(/(\..*)\./g, "$1")
                .replace(/(\.\d{2})\d+/g, "$1"),
            )
          }
          autoFocus
        />

        <View style={styles.buttons}>
          {optional && (
            <Button mode="text" onPress={handleSkip}>
              {t("savings.skip")}
            </Button>
          )}
          <Button
            mode="contained"
            disabled={optional && !localValue}
            onPress={handleSave}
          >
            {optional ? t("savings.save") : t("savings.confirm")}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 24,
    borderRadius: 2,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: 4,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});
