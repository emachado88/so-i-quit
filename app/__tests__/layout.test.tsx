import { render, waitFor } from "@testing-library/react-native";
import { jest } from "@jest/globals";
import React from "react";

import RootLayout from "@/app/_layout";

// The setup mock pins useFonts to `[true]`; this file needs the not-loaded
// branch too, so re-mock with a controllable flag (later registrations win).
jest.mock("expo-font", () => ({
  useFonts: () => [
    (globalThis as unknown as { __rnTestFontsLoaded?: boolean })
      .__rnTestFontsLoaded ?? true,
  ],
  isLoaded: () => true,
}));

const seedSettings = (values: Record<string, string>) => {
  const store = (globalThis as unknown as { __rnTestStorage: Map<string, string> })
    .__rnTestStorage;
  for (const [key, value] of Object.entries(values)) store.set(key, value);
};

describe("app/_layout (root)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    (globalThis as unknown as { __rnTestFontsLoaded?: boolean }).__rnTestFontsLoaded =
      true;
  });

  it("returns null while fonts are not loaded", async () => {
    (globalThis as unknown as { __rnTestFontsLoaded?: boolean }).__rnTestFontsLoaded =
      false;
    const { container } = await render(<RootLayout />);
    expect(container.children).toHaveLength(0);
  });

  it("renders the provider tree once fonts and settings are loaded", async () => {
    seedSettings({
      "settings:theme": "dark",
      "settings:language": "pt",
      "settings:currency": "EUR",
      "settings:milestoneNotifications": "true",
      "settings:milestoneNotificationsPrompted": "true",
    });
    const { container } = await render(<RootLayout />);

    await waitFor(() => expect(container.children.length).toBeGreaterThan(0));
  });
});
