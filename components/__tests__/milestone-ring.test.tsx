import { act, render } from "@testing-library/react-native";
import { jest } from "@jest/globals";
import React from "react";
import * as Reanimated from "react-native-reanimated";

import { MilestoneRing } from "@/components/milestone-ring";

const CIRC = (r: number) => `${2 * Math.PI * r} ${2 * Math.PI * r}`;

describe("MilestoneRing", () => {
  it("renders track and fill circles with radius driven by size/strokeWidth", async () => {
    const { container } = await render(
      <MilestoneRing
        progress={0.5}
        size={100}
        strokeWidth={10}
        color="#1A6B5C"
        trackColor="#E0E0E0"
      />,
    );

    const svg = container.queryAll(
      (i) => i.props.width === 100 && i.props.height === 100,
    );
    expect(svg).toHaveLength(1);

    const track = container.queryAll(
      (i) => i.props.stroke === "#E0E0E0" && !i.props.strokeDasharray,
    );
    expect(track).toHaveLength(1);
    expect(track[0].props.r).toBe(45); // (size - strokeWidth) / 2
    expect(track[0].props.strokeWidth).toBe(10);
    expect(track[0].props.cx).toBe(50);
    expect(track[0].props.cy).toBe(50);

    const fill = container.queryAll(
      (i) => i.props.stroke === "#1A6B5C" && i.props.strokeDasharray,
    );
    expect(fill).toHaveLength(1);
    expect(fill[0].props.r).toBe(45);
    expect(fill[0].props.strokeDasharray).toBe(CIRC(45));
    expect(fill[0].props.transform).toBe("rotate(-90 50 50)");
  });

  it("uses the full circumference as the initial dash pattern for a fresh mount", async () => {
    const { container } = await render(
      <MilestoneRing
        progress={0.9}
        size={80}
        strokeWidth={8}
        color="#1A6B5C"
        trackColor="#E0E0E0"
      />,
    );
    const fill = container.queryAll(
      (i) => i.props.strokeDasharray === CIRC(36), // (80 - 8) / 2
    );
    expect(fill).toHaveLength(1);
  });

  it.each([1.5, -0.5])("clamps out-of-range progress %s without crashing", async (progress) => {
    const { container } = await render(
      <MilestoneRing
        progress={progress}
        size={100}
        strokeWidth={10}
        color="#1A6B5C"
        trackColor="#E0E0E0"
      />,
    );
    // Still renders the track + fill pair.
    expect(container.queryAll((i) => i.props.strokeDasharray)).toHaveLength(1);
    expect(container.queryAll((i) => i.props.stroke === "#E0E0E0")).toHaveLength(1);
  });

  it("re-renders with a different size", async () => {
    const { container, rerender } = await render(
      <MilestoneRing
        progress={0.2}
        size={100}
        strokeWidth={10}
        color="#1A6B5C"
        trackColor="#E0E0E0"
      />,
    );
    await rerender(
      <MilestoneRing
        progress={0.2}
        size={200}
        strokeWidth={20}
        color="#1A6B5C"
        trackColor="#E0E0E0"
      />,
    );
    expect(container.queryAll((i) => i.props.r === 90)).toHaveLength(2);
  });

  it("ignores small progress changes while a tween is in flight", async () => {
    // Fake timers keep the stub's completion callback from firing mid-test,
    // so `animating` stays true for the rerender.
    jest.useFakeTimers();
    const { container, rerender } = await render(
      <MilestoneRing
        progress={0.5}
        size={100}
        strokeWidth={10}
        color="#1A6B5C"
        trackColor="#E0E0E0"
      />,
    );
    // First effect sets animating.value = true; a sub-threshold jump (< 0.2)
    // must not interrupt the in-flight tween (no crash, still renders).
    await rerender(
      <MilestoneRing
        progress={0.55}
        size={100}
        strokeWidth={10}
        color="#1A6B5C"
        trackColor="#E0E0E0"
      />,
    );
    expect(container.queryAll((i) => i.props.strokeDasharray)).toHaveLength(1);
    jest.useRealTimers();
  });

  it("restarts the tween on a small jump once the previous one completed", async () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(Reanimated, "withTiming");
    const { rerender } = await render(
      <MilestoneRing
        progress={0.5}
        size={100}
        strokeWidth={10}
        color="#1A6B5C"
        trackColor="#E0E0E0"
      />,
    );
    expect(spy).toHaveBeenCalledTimes(1);

    // Tween completes → animating flag resets.
    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    // Now the same small jump restarts the tween.
    await rerender(
      <MilestoneRing
        progress={0.55}
        size={100}
        strokeWidth={10}
        color="#1A6B5C"
        trackColor="#E0E0E0"
      />,
    );
    expect(spy).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
