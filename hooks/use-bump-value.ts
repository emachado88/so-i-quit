import { useEffect, useRef } from "react";
import { useIsFocused } from "expo-router";
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * Scale-bump effect when a numeric value changes OR the screen re-focuses.
 * Uses withSequence instead of withSpring callbacks to avoid Reanimated v4
 * stack overflow with nested UI-thread callbacks.
 */
export const useBumpValue = (value: number) => {
  const scale = useSharedValue(1);
  const isInitial = useRef(true);
  const lastAnimated = useRef<number | undefined>(undefined);
  const focused = useIsFocused();

  useEffect(() => {
    const shouldAnimate =
      focused && !isInitial.current && lastAnimated.current !== value;

    if (isInitial.current) {
      isInitial.current = false;
      lastAnimated.current = value;
      return;
    }

    if (shouldAnimate) {
      lastAnimated.current = value;
      cancelAnimation(scale);
      scale.value = withSequence(
        withSpring(1.15, { damping: 6, stiffness: 180 }),
        withTiming(1, { duration: 150 }),
      );
    }
  }, [value, focused]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle };
};
