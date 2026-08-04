/**
 * Stack smoke test — proves the whole component-test pipeline works:
 * test-renderer v1 + @testing-library/react-native v14 + react-native +
 * react-native-paper + the global mocks in test/setup.ts.
 *
 * If this fails, nothing in tickets 4-6 will render; fix the stack first.
 */
import { render, screen } from "@testing-library/react-native";
import React from "react";
import { PaperProvider } from "react-native-paper";

import { ThemedText } from "@/components/themed-text";
import { themes } from "@/constants/theme";
import { renderWithProviders } from "@/test/utils";

describe("test stack smoke", () => {
  it("renders a real Paper-backed component through the stack", async () => {
    await render(
      <PaperProvider theme={themes.light}>
        <ThemedText type="title">Hello Stack</ThemedText>
      </PaperProvider>,
    );

    expect(screen.getByText("Hello Stack")).toBeOnTheScreen();
  });

  it("renders inside the AppSettings provider helper", async () => {
    const { getByText } = await renderWithProviders(
      <ThemedText>Hello Provider</ThemedText>,
    );
    expect(getByText("Hello Provider")).toBeTruthy();
  });
});
