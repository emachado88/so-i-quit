import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { globalStyles } from "@/constants/styles";

export default function SettingsScreen() {
  return (
    <View style={[globalStyles.container, styles.container]}>
      <ThemedText>Theme, language, and currency settings coming soon.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
});
