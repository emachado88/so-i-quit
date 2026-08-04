import { render } from "@testing-library/react-native";
import React from "react";
import { PaperProvider } from "react-native-paper";

import { ThemedText, type ThemedTextProps } from "@/components/themed-text";
import { themes } from "@/constants/theme";

const renderThemed = async (ui: React.ReactElement) =>
  render(<PaperProvider theme={themes.light}>{ui}</PaperProvider>);

describe("ThemedText", () => {
  it("renders children", async () => {
    const { getByText } = await renderThemed(<ThemedText>Hello</ThemedText>);
    expect(getByText("Hello")).toBeOnTheScreen();
  });

  it.each([
    ["default", "bodyLarge"],
    ["defaultSemiBold", "bodyLarge"],
    ["title", "titleLarge"],
    ["subtitle", "titleSmall"],
    ["link", "bodyLarge"],
  ] as [NonNullable<ThemedTextProps["type"]>, string][])(
    "maps type %s to the %s Paper variant (observable via the theme font)",
    async (type, variant) => {
      const { getByText } = await renderThemed(<ThemedText type={type}>T</ThemedText>);
      // ThemedText's own styles override fontSize/lineHeight but never
      // fontFamily — so the host text font reveals the Paper variant used.
      expect(getByText("T")).toHaveStyle({
        fontFamily: themes.light.fonts[variant as keyof typeof themes.light.fonts]
          .fontFamily,
      });
    },
  );

  it("defaults to the default variant when no type is given", async () => {
    const { getByText } = await renderThemed(<ThemedText>T</ThemedText>);
    expect(getByText("T")).toHaveStyle({
      fontFamily: themes.light.fonts.bodyLarge.fontFamily,
    });
  });

  it("passes a style prop through to the underlying Paper text", async () => {
    const { getByText } = await renderThemed(
      <ThemedText style={{ fontSize: 99, color: "rgb(255, 0, 0)" }}>Styled</ThemedText>,
    );
    expect(getByText("Styled")).toHaveStyle({ fontSize: 99 });
    expect(getByText("Styled")).toHaveStyle({ color: "rgb(255, 0, 0)" });
  });

  it("forwards extra text props (e.g. numberOfLines)", async () => {
    const { getByText } = await renderThemed(
      <ThemedText numberOfLines={2}>Clipped</ThemedText>,
    );
    expect(getByText("Clipped")).toHaveProp("numberOfLines", 2);
  });
});
