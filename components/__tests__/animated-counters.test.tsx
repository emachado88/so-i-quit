import { act, screen } from "@testing-library/react-native";
import { jest } from "@jest/globals";
import React from "react";

import { CounterText, TimeValue } from "@/components/animated-counters";
import { renderWithProviders } from "@/test/utils";

// The setup mock pins useIsFocused to `true`; this file needs to flip it per
// test, so re-mock expo-router with a globalThis-controlled implementation
// (later jest.mock registrations win over the setup file's).
jest.mock("expo-router", () => ({
  useIsFocused: () =>
    (globalThis as unknown as { __rnTestIsFocused?: boolean }).__rnTestIsFocused ??
    true,
}));

describe("TimeValue", () => {
  it("renders the value as title text", async () => {
    const { getByText } = await renderWithProviders(<TimeValue value={42} />);
    expect(getByText("42")).toBeOnTheScreen();
  });

  it("renders a different value", async () => {
    const { getByText } = await renderWithProviders(<TimeValue value={7} />);
    expect(getByText("7")).toBeOnTheScreen();
  });
});

describe("CounterText", () => {
  beforeEach(() => {
    (globalThis as unknown as { __rnTestIsFocused?: boolean }).__rnTestIsFocused =
      true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders formatAmount(0) with the context currency on first focus", async () => {
    await renderWithProviders(<CounterText value={0} />);
    expect(screen.getByText("€0.00")).toBeOnTheScreen();
  });

  it("uses the currency from the settings context", async () => {
    await renderWithProviders(<CounterText value={0} />, { currency: "USD" });
    expect(screen.getByText("$0.00")).toBeOnTheScreen();
  });

  it("counts up to the new value while focused", async () => {
    const { rerender } = await renderWithProviders(<CounterText value={0} />);
    expect(screen.getByText("€0.00")).toBeOnTheScreen();

    // Fake timers AFTER the initial render: RTL v14's async render/act must
    // run against the real clock; only the rAF loop itself is faked.
    jest.useFakeTimers();
    await rerender(<CounterText value={100} />);
    // Duration is clamped to 1500ms; give the rAF loop plenty of time.
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText("€100.00")).toBeOnTheScreen();
  });

  it("does not animate while blurred", async () => {
    (globalThis as unknown as { __rnTestIsFocused?: boolean }).__rnTestIsFocused =
      false;
    const { rerender } = await renderWithProviders(<CounterText value={0} />);
    expect(screen.getByText("€0.00")).toBeOnTheScreen();

    // Blurred → the effect bails out before scheduling any rAF, so the
    // display must stay at the initial value even after real time passes.
    await rerender(<CounterText value={50} />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByText("€0.00")).toBeOnTheScreen();
  });
});
