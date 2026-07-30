import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ReactNode } from "react";
import type { ColorValue } from "react-native";

import { env } from "@/config/env";
import { useMessaging } from "@/providers/MessagingProvider";
import { colors } from "@/theme";

type TabIconName =
  | "chatbubble-ellipses"
  | "people"
  | "person-circle"
  | "settings"
  | "chatbubble-ellipses-outline"
  | "people-outline"
  | "person-circle-outline"
  | "settings-outline";

function icon(
  active: TabIconName,
  inactive: TabIconName
): ({ color, size, focused }: {
  color: ColorValue;
  size: number;
  focused: boolean;
}) => ReactNode {
  return ({ color, size, focused }) => (
    <Ionicons
      name={focused ? active : inactive}
      size={size}
      color={String(color)}
    />
  );
}

export default function TabsLayout() {
  const { visibleConversations } = useMessaging();
  const unreadCount = visibleConversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700"
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.primary,
          color: colors.white,
          fontSize: 10,
          fontWeight: "900"
        }
      }}
    >
      <Tabs.Screen
        name="messages"
        options={{
          title: "Discussions",
          tabBarAccessibilityLabel:
            unreadCount > 0
              ? `Discussions, ${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}`
              : "Discussions, aucun message non lu",
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
          tabBarIcon: icon(
            "chatbubble-ellipses",
            "chatbubble-ellipses-outline"
          )
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: "Espaces",
          tabBarIcon: icon("people", "people-outline")
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          href: env.mockMode ? undefined : null,
          title: "Membres",
          tabBarIcon: icon("person-circle", "person-circle-outline")
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Réglages",
          tabBarIcon: icon("settings", "settings-outline")
        }}
      />
    </Tabs>
  );
}
