import { Tabs } from "expo-router";

import { NeptuneTabBar } from "@/components/NeptuneTabBar";
import { SkeletonPulseGroup } from "@/components/SkeletonPulseGroup";
import { StandalonePersistenceBridge } from "@/components/StandalonePersistenceBridge";
import { TabsLoadingOverlay } from "@/components/TabsLoadingOverlay";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAppTheme } from "@/providers/ThemeProvider";
import { useMessaging } from "@/providers/MessagingProvider";

export default function TabsLayout() {
  const { visibleConversations } = useMessaging();
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const unreadCount = visibleConversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );

  return (
    <>
      <StandalonePersistenceBridge />
      <Tabs
        tabBar={(props) => <NeptuneTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: reducedMotion ? "none" : "fade",
          sceneStyle: { backgroundColor: theme.pageBackground }
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
        <Tabs.Screen name="highlights" options={{ title: "Temps forts" }} />
        <Tabs.Screen name="calls" options={{ title: "Appels" }} />
        <Tabs.Screen name="settings" options={{ title: "Profil" }} />
        <Tabs.Screen name="communities" options={{ href: null, title: "Espaces" }} />
        <Tabs.Screen name="contacts" options={{ href: null, title: "Membres" }} />
      </Tabs>
      <SkeletonPulseGroup>
        <TabsLoadingOverlay />
      </SkeletonPulseGroup>
    </>
  );
}
