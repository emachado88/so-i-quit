import { fireEvent } from "@testing-library/react-native";
import React from "react";

import SavingsModal from "@/components/savings-modal";
import { renderWithProviders } from "@/test/utils";

const renderModal = async (props: {
  visible?: boolean;
  value?: string | null;
  currency?: string;
  scheme?: "light" | "dark";
  optional?: boolean;
  onSave?: (v: string | null) => void;
  onDismiss?: () => void;
} = {}) => {
  const onSave = props.onSave ?? jest.fn();
  const onDismiss = props.onDismiss ?? jest.fn();
  const result = await renderWithProviders(
    <SavingsModal
      visible={props.visible ?? true}
      value={props.value ?? null}
      currency={props.currency ?? "EUR"}
      scheme={props.scheme ?? "light"}
      optional={props.optional}
      onSave={onSave}
      onDismiss={onDismiss}
    />,
  );
  return { ...result, onSave, onDismiss };
};

describe("SavingsModal", () => {
  it("renders nothing when hidden", async () => {
    const { queryByText } = await renderModal({ visible: false });
    expect(queryByText("Daily Savings")).toBeNull();
  });

  it("renders title, subtitle and a confirm button in the default mode", async () => {
    const { getByText, queryByText } = await renderModal();
    expect(getByText("Daily Savings")).toBeOnTheScreen();
    expect(
      getByText("How much do you save per day by quitting?"),
    ).toBeOnTheScreen();
    expect(getByText("Confirm")).toBeOnTheScreen();
    expect(queryByText("Skip")).toBeNull();
    expect(getByText("€/day")).toBeOnTheScreen();
  });

  it("shows the currency symbol affix and falls back to the raw code", async () => {
    const { getByText, rerender } = await renderModal({ currency: "USD" });
    expect(getByText("$/day")).toBeOnTheScreen();
    await rerender(
      <SavingsModal
        visible
        value={null}
        currency="XXX"
        scheme="light"
        onSave={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByText("XXX/day")).toBeOnTheScreen();
  });

  it("sanitizes input: strips letters, keeps one decimal point, caps at 2 decimals", async () => {
    const { getByPlaceholderText } = await renderModal();
    const input = getByPlaceholderText("0.00");

    await fireEvent.changeText(input, "abc12.345");
    expect(getByPlaceholderText("0.00")).toHaveDisplayValue("12.34");

    await fireEvent.changeText(input, "1.2.3");
    expect(getByPlaceholderText("0.00")).toHaveDisplayValue("1.23");

    await fireEvent.changeText(input, "abc");
    expect(getByPlaceholderText("0.00")).toHaveDisplayValue("");
  });

  it("saves null when the input cannot be parsed (e.g. a lone dot)", async () => {
    const { getByPlaceholderText, getByText, onSave } = await renderModal();
    await fireEvent.changeText(getByPlaceholderText("0.00"), ".");
    await fireEvent.press(getByText("Confirm"));
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it("saves a normalized integer", async () => {
    const { getByPlaceholderText, getByText, onSave } = await renderModal();
    await fireEvent.changeText(getByPlaceholderText("0.00"), "5");
    await fireEvent.press(getByText("Confirm"));
    expect(onSave).toHaveBeenCalledWith("5");
  });

  it("saves a normalized float with two decimals", async () => {
    const { getByPlaceholderText, getByText, onSave } = await renderModal();
    await fireEvent.changeText(getByPlaceholderText("0.00"), "5.25");
    await fireEvent.press(getByText("Confirm"));
    expect(onSave).toHaveBeenCalledWith("5.25");
  });

  it("saves null when the input is empty", async () => {
    const { getByPlaceholderText, getByText, onSave } = await renderModal({
      value: "5",
    });
    await fireEvent.changeText(getByPlaceholderText("0.00"), "");
    await fireEvent.press(getByText("Confirm"));
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it("optional mode shows Skip, Save and disables Save while empty", async () => {
    const { getByText, getByRole, getByPlaceholderText } = await renderModal({
      optional: true,
      value: "5",
    });
    expect(getByText("Daily Savings (optional)")).toBeOnTheScreen();
    expect(getByText("Skip")).toBeOnTheScreen();
    expect(getByText("Save")).toBeOnTheScreen();

    // Value present → Save enabled.
    expect(
      getByRole("button", { name: "Save", disabled: false }),
    ).toBeOnTheScreen();

    // Cleared → Save disabled.
    await fireEvent.changeText(getByPlaceholderText("0.00"), "");
    expect(
      getByRole("button", { name: "Save", disabled: true }),
    ).toBeOnTheScreen();
  });

  it("optional mode Skip keeps the existing value", async () => {
    const { getByText, onSave } = await renderModal({ optional: true, value: "5" });
    await fireEvent.press(getByText("Skip"));
    expect(onSave).toHaveBeenCalledWith("5");
  });

  it("default mode keeps the save button enabled even when empty", async () => {
    const { getByRole } = await renderModal({ value: null });
    expect(
      getByRole("button", { name: "Confirm", disabled: false }),
    ).toBeOnTheScreen();
  });
});
