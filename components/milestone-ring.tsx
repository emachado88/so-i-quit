import React, { useEffect } from "react";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Duration of the ring fill tween. */
const FILL_DURATION = 2500;

/**
 * Progress changes larger than this interrupt an in-flight tween. Covers the
 * meaningful jumps (milestone reached, habit date edited); per-second ticks
 * are far below it and never restart the animation.
 */
const JUMP_THRESHOLD = 0.2;

interface MilestoneRingProps {
  /** Progress toward the next milestone, clamped to [0, 1]. */
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  trackColor: string;
}

/**
 * Circular progress ring for the next milestone.
 *
 * The fill eases toward `progress` with a 2.5s ease-out. It draws in from
 * empty on mount, keeps tracking the slow per-second creep of `progress`
 * (invisible micro-tweens, never interrupting an in-flight one) and reacts
 * instantly to real jumps (new milestone, edited habit date).
 */
export const MilestoneRing = ({
  progress,
  size,
  strokeWidth,
  color,
  trackColor,
}: MilestoneRingProps): React.JSX.Element => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);

  const fill = useSharedValue(0);
  const animating = useSharedValue(false);

  useEffect(() => {
    const jump = Math.abs(clamped - fill.value);

    // Let small in-flight tweens finish; only interrupt for real jumps.
    if (animating.value && jump < JUMP_THRESHOLD) return;

    animating.value = true;
    fill.value = withTiming(
      clamped,
      { duration: FILL_DURATION, easing: Easing.out(Easing.cubic) },
      () => {
        animating.value = false;
      },
    );
  }, [clamped, fill, animating]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.value),
  }));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <AnimatedCircle
        animatedProps={animatedProps}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};
