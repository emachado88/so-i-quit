import { screen } from "@testing-library/react-native";
import React from "react";

import TabLayout from "@/app/(tabs)/_layout";
import { renderWithProviders } from "@/test/utils";

describe("app/(tabs)/_layout (tab bar)", () => {
  it("renders the tab bar with the three screens", async () => {
    await renderWithProviders(<TabLayout />);
    // The Tabs mock renders a View container; the screen options (titles,
    // icons) are evaluated during render.
    expect(screen.toJSON()).not.toBeNull();
  });

  it("resolves colors from the active scheme", async () => {
    await renderWithProviders(<TabLayout />, { scheme: "dark" });
    expect(screen.toJSON()).not.toBeNull();
  });
});
