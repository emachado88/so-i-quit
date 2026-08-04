import { renderHook } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";

import { useBumpValue } from "@/hooks/use-bump-value";

describe("hooks/use-bump-value", () => {
  it("returns an animated style object", async () => {
    const { result } = await renderHook(() => useBumpValue(5));
    expect(result.current.animatedStyle).toBeDefined();
  });

  it("survives re-renders with the same value", async () => {
    const { rerender, result } = await renderHook(() => useBumpValue(3));
    await rerender({});
    expect(result.current.animatedStyle).toBeDefined();
  });

  it("survives value changes while focused", async () => {
    const { rerender, result } = await renderHook(
      (props: { value: number }) => useBumpValue(props.value),
      { initialProps: { value: 1 } },
    );
    await rerender({ value: 2 });
    expect(result.current.animatedStyle).toBeDefined();
  });

  it("unmounts cleanly", async () => {
    const { unmount } = await renderHook(() => useBumpValue(1));
    await expect(unmount()).resolves.toBeUndefined();
  });
});
