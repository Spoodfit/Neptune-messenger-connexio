import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

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
  color: string;
  size: number;
  focused: boolean;
}) => React.ReactNode {
  return ({ color, size, focused }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
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
        }
      }}
    >
      <Tabs.Screen
        name="messages"
        options={{
          title: "Discussions",
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
