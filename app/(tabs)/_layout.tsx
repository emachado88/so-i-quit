import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { fontFamilyConfig, themes } from "@/constants/theme";
import { useAppSettings } from "@/contexts/settings-context";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function TabLayout() {
  const { scheme, t } = useAppSettings();

  return (
    <Tabs
      screenOptions={{
        animation: "fade",
        tabBarActiveTintColor: themes[scheme].colors.primary,
        tabBarButton: HapticTab,
        sceneStyle: {
          backgroundColor: themes[scheme].colors.background,
        },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: themes[scheme].colors.background,
        },
        headerTitleContainerStyle: {
          paddingHorizontal: 20,
          marginHorizontal: 0,
        },
        headerTitleStyle: {
          color: themes[scheme].colors.inversePrimary,
        },
        tabBarStyle: {
          height: 80,
          paddingTop: 15,
          backgroundColor: themes[scheme].colors.inverseOnSurface,
        },
        tabBarLabelStyle: {
          ...fontFamilyConfig.labelLarge,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.progress"),
          headerTitle: t("progress.congratulations"),
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              color={color}
              size={28}
              name="chart-box-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: t("tabs.habits"),
          headerTitle: t("habits.title"),
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              color={color}
              size={28}
              name="clipboard-list"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          headerTitle: t("settings.title"),
          tabBarIcon: ({ color }) => (
            <MaterialIcons color={color} size={28} name="settings" />
          ),
        }}
      />
    </Tabs>
  );
}
