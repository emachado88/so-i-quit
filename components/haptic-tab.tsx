import * as Haptics from "expo-haptics";
import { PlatformPressable } from "expo-router/build/react-navigation";
import React from "react";

export function HapticTab(props: any) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPressIn?.(ev);
      }}
    />
  );
}
