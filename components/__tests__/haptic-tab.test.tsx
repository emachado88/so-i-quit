import { fireEvent, render } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";

describe("HapticTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fires a light impact on pressIn", async () => {
    const { getByTestId } = await render(<HapticTab testID="tab" />);
    await fireEvent(getByTestId("tab"), "pressIn", { nativeEvent: {} });
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light,
    );
  });

  it("forwards the pressIn event to the caller's handler", async () => {
    const onPressIn = jest.fn();
    const { getByTestId } = await render(
      <HapticTab testID="tab" onPressIn={onPressIn} />,
    );
    const event = { nativeEvent: { pageX: 10 } };
    await fireEvent(getByTestId("tab"), "pressIn", event);
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressIn).toHaveBeenCalledWith(event);
  });

  it("passes other props through to PlatformPressable", async () => {
    const { getByTestId } = await render(
      <HapticTab testID="haptic" accessibilityLabel="Progress" />,
    );
    expect(getByTestId("haptic").props.accessibilityLabel).toBe("Progress");
  });

  it("keeps haptics working without a custom onPressIn", async () => {
    const { getByTestId } = await render(<HapticTab testID="tab" />);
    await fireEvent(getByTestId("tab"), "pressIn");
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });
});
