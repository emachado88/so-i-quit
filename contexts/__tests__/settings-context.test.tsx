import { renderHook } from "@testing-library/react-native";
import React from "react";
import { describe, expect, it } from "@jest/globals";

import {
  AppSettingsContext,
  useAppSettings,
} from "@/contexts/settings-context";
import { makeSettingsValue } from "@/test/utils";

describe("contexts/settings-context", () => {
  it("throws when used outside the provider", async () => {
    await expect(renderHook(() => useAppSettings())).rejects.toThrow(
      "useAppSettings must be used within AppSettingsProvider",
    );
  });

  it("returns the context value inside the provider", async () => {
    const value = makeSettingsValue({ currency: "USD", language: "pt" });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppSettingsContext.Provider value={value}>
        {children}
      </AppSettingsContext.Provider>
    );
    const { result } = await renderHook(() => useAppSettings(), { wrapper });
    expect(result.current.currency).toBe("USD");
    expect(result.current.language).toBe("pt");
    expect(result.current.scheme).toBe("light");
    expect(result.current.setTheme).toBe(value.setTheme);
  });

  it("exposes the t function from the context", async () => {
    const value = makeSettingsValue({ t: (key) => `T:${key}` });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppSettingsContext.Provider value={value}>
        {children}
      </AppSettingsContext.Provider>
    );
    const { result } = await renderHook(() => useAppSettings(), { wrapper });
    expect(result.current.t("common.dismiss")).toBe("T:common.dismiss");
  });
});
