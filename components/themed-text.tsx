import { StyleSheet, type TextProps } from "react-native";
import React from "react";
import { Text as PaperText } from "react-native-paper";
import type { VariantProp } from "react-native-paper/lib/typescript/components/Typography/types";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

const variantMap: Record<
  NonNullable<ThemedTextProps["type"]>,
  VariantProp<never>
> = {
  default: "bodyLarge",
  defaultSemiBold: "bodyLarge",
  title: "titleLarge",
  subtitle: "titleSmall",
  link: "bodyLarge",
};

export function ThemedText({
  style,
  type = "default",
  ...rest
}: ThemedTextProps) {
  return (
    <PaperText
      variant={variantMap[type]}
      style={[
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        style,
      ]}
      {...(rest as any)}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 0.02,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 24,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
  },
});
