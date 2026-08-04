import { fireEvent } from "@testing-library/react-native";
import React from "react";

import MilestoneOptInDialog from "@/components/milestone-opt-in-dialog";
import { themes } from "@/constants/theme";
import { renderWithProviders } from "@/test/utils";

describe("MilestoneOptInDialog", () => {
  it("renders nothing when hidden", async () => {
    const { queryByText } = await renderWithProviders(
      <MilestoneOptInDialog visible={false} onEnable={jest.fn()} onNotNow={jest.fn()} />,
    );
    expect(queryByText("Celebrate your milestones?")).toBeNull();
    expect(queryByText("Enable notifications")).toBeNull();
  });

  it("shows title and body when visible", async () => {
    const { getByText } = await renderWithProviders(
      <MilestoneOptInDialog visible onEnable={jest.fn()} onNotNow={jest.fn()} />,
    );
    expect(getByText("Celebrate your milestones?")).toBeOnTheScreen();
    expect(
      getByText("Get a celebration when you reach a milestone."),
    ).toBeOnTheScreen();
    expect(getByText("Enable notifications")).toBeOnTheScreen();
    expect(getByText("Not now")).toBeOnTheScreen();
  });

  it("Enable calls onEnable", async () => {
    const onEnable = jest.fn();
    const { getByText } = await renderWithProviders(
      <MilestoneOptInDialog visible onEnable={onEnable} onNotNow={jest.fn()} />,
    );
    await fireEvent.press(getByText("Enable notifications"));
    expect(onEnable).toHaveBeenCalledTimes(1);
  });

  it("Not Now calls onNotNow", async () => {
    const onNotNow = jest.fn();
    const { getByText } = await renderWithProviders(
      <MilestoneOptInDialog visible onEnable={jest.fn()} onNotNow={onNotNow} />,
    );
    await fireEvent.press(getByText("Not now"));
    expect(onNotNow).toHaveBeenCalledTimes(1);
  });

  it("colors the enable button with the scheme's onPrimary", async () => {
    const { getByText } = await renderWithProviders(
      <MilestoneOptInDialog visible onEnable={jest.fn()} onNotNow={jest.fn()} />,
      { scheme: "dark" },
    );
    // textColor lands on the button's label Text style.
    expect(getByText("Enable notifications")).toHaveStyle({
      color: themes.dark.colors.onPrimary,
    });
  });
});
