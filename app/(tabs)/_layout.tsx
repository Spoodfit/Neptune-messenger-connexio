import { Tabs } from "expo-router";

import { NeptuneTabBar } from "@/components/NeptuneTabBar";
import { env } from "@/config/env";
import { useMessaging } from "@/providers/MessagingProvider";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { visibleConversations } = useMessaging();
  const unreadCount = visibleConversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );

  return (
    <Tabs
      tabBar={(props) => <NeptuneTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background }
      }}
    >
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarAccessibilityLabel:
            unreadCount > 0
              ? `Messages, ${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}`
              : "Messages, aucun message non lu",
          tabBarBadge:
            unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined
        }}
      />
      <Tabs.Screen name="communities" options={{ title: "Espaces" }} />
      <Tabs.Screen
        name="contacts"
        options={{ href: env.mockMode ? undefined : null, title: "Membres" }}
      />
      <Tabs.Screen name="settings" options={{ title: "Profil" }} />
    </Tabs>
  );
}
