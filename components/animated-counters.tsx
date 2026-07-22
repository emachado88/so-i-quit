import React, { useEffect, useRef, useState } from "react";
import { useIsFocused } from "expo-router";
import Animated from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { useAppSettings } from "@/contexts/settings-context";
import { formatAmount } from "@/utils/utils";
import { useBumpValue } from "@/hooks/use-bump-value";

/** Time value with a brief scale bump when the number changes. */
export const TimeValue = ({
  value,
  style,
}: {
  value: number;
  style?: object;
}) => {
  const { animatedStyle } = useBumpValue(value);
  return (
    <Animated.View style={animatedStyle}>
      <ThemedText type="title" style={style}>
        {value}
      </ThemedText>
    </Animated.View>
  );
};

/**
 * Savings counter that smoothly counts from the previous value to the new one.
 * Animates from 0 on first focus; subsequent value changes while focused
 * count smoothly. Stops animating when the tab is blurred.
 */
export const CounterText = ({
  value,
  style,
}: {
  value: number;
  style?: object;
}) => {
  const { currency } = useAppSettings();
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const rafRef = useRef<number>(0);
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const from = displayRef.current;

    if (from === value) return;

    cancelAnimationFrame(rafRef.current);
    const to = value;
    const duration = Math.min(1500, Math.max(300, Math.abs(to - from) * 15));
    const start = Date.now();

    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      displayRef.current = current;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, focused]);

  return (
    <ThemedText type="title" style={style}>
      {formatAmount(display, currency)}
    </ThemedText>
  );
};
