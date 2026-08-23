import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs } from "expo-router";
import { useMemo, type ComponentProps } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CoworkingPortalButton } from "@/components/CoworkingPortalButton";
import { capabilitiesForBackendContract } from "@/config/backendCapabilities";
import { env } from "@/config/env";
import { useCoworking } from "@/providers/CoworkingProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { colors, gradients, radii } from "@/theme";

const CALLS_AVAILABLE = env.mockMode || capabilitiesForBackendContract(env.backendContract).calls;
type TabsProps = ComponentProps<typeof Tabs>;
type NeptuneTabBarProps = Parameters<NonNullable<TabsProps["tabBar"]>>[0];
const ICONS = {
  messages: { active: "chatbubble-ellipses", inactive: "chatbubble-ellipses-outline", label: "Messages" },
  highlights: { active: "sparkles", inactive: "sparkles-outline", label: "Temps forts" },
  calls: { active: "call", inactive: "call-outline", label: "Appels" },
  settings: { active: "person", inactive: "person-outline", label: "Profil" }
} as const;

export function NeptuneTabBar({ state, descriptors, navigation }: NeptuneTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compactBar = width < 310;
  const { serviceAvailable: coworkingAvailable } = useCoworking();
  const currentKey = state.routes[state.index]?.key;
  const routesByName = useMemo(() => new Map(state.routes.map((route) => [route.name, route])), [state.routes]);
  const leftRoutes = [routesByName.get("messages"), routesByName.get("highlights")].filter(Boolean) as typeof state.routes;
  const rightRoutes = [CALLS_AVAILABLE ? routesByName.get("calls") : undefined, routesByName.get("settings")].filter(Boolean) as typeof state.routes;

  const renderRoute = (route: (typeof state.routes)[number]) => {
    const focused = route.key === currentKey;
    const options = descriptors[route.key]?.options;
    const icon = ICONS[route.name as keyof typeof ICONS] ?? ICONS.messages;
    const badge = options?.tabBarBadge;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={options?.tabBarAccessibilityLabel ?? icon.label}
        onPress={() => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        {focused ? <LinearGradient colors={theme.isLight ? [theme.accentSoft, theme.violetSoft] : gradients.activeTab} style={[styles.activePill, { borderColor: theme.navBorder }]} /> : null}
        <View style={styles.iconWrap}>
          <Ionicons name={focused ? icon.active : icon.inactive} size={21} color={focused ? theme.accent : theme.navInactive} />
          {badge !== undefined ? <View style={[styles.badge, { borderColor: theme.navBackground }]}><Text style={styles.badgeText}>{String(badge)}</Text></View> : null}
        </View>
        <Text numberOfLines={compactBar ? 2 : 1} style={[styles.label, compactBar && styles.compactLabel, { color: focused ? theme.pageText : theme.navInactive }]}>{icon.label}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: theme.pageBackground }]}>
      <View style={[styles.bar, { backgroundColor: theme.navBackground, borderColor: theme.navBorder, shadowColor: theme.shadow }]}>
        <View style={styles.sideGroup}>{leftRoutes.map(renderRoute)}</View>
        <View pointerEvents="none" style={[styles.centerSlot, compactBar && styles.compactCenterSlot]} />
        <View style={styles.sideGroup}>{rightRoutes.map(renderRoute)}</View>
      </View>
      {coworkingAvailable ? (
        <CoworkingPortalButton />
      ) : (
        <View style={[styles.fallbackShell, { backgroundColor: theme.pageBackground }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nouvelle conversation"
            onPress={() => router.push("/new-conversation")}
            style={({ pressed }) => [styles.fallbackPressable, pressed && styles.pressed]}
          >
            <LinearGradient colors={gradients.primary} style={styles.fallbackGradient}>
              <Ionicons name="add" size={29} color={colors.white} />
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 8, paddingTop: 4, position: "relative", zIndex: 1000, elevation: 40 },
  bar: { height: 72, padding: 5, overflow: "hidden", position: "relative", borderRadius: radii.xl, borderWidth: 1, flexDirection: "row", alignItems: "stretch", elevation: 42, zIndex: 1002, shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  sideGroup: { flex: 1, minWidth: 0, height: "100%", flexDirection: "row", alignItems: "stretch" },
  centerSlot: { width: 60, flexShrink: 0 },
  compactCenterSlot: { width: 52 },
  item: { flex: 1, minWidth: 0, height: "100%", borderRadius: 17, alignItems: "center", justifyContent: "center", gap: 5, overflow: "hidden", position: "relative" },
  activePill: { position: "absolute", left: 1, right: 1, top: 1, bottom: 1, borderRadius: 16, borderWidth: 1 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  iconWrap: { position: "relative", width: 28, alignItems: "center" },
  label: { maxWidth: "100%", fontSize: 11, lineHeight: 13, fontWeight: "800", textAlign: "center" },
  compactLabel: { lineHeight: 12 },
  badge: { position: "absolute", right: -13, top: -8, minWidth: 21, height: 18, paddingHorizontal: 5, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.magenta, borderWidth: 2 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  fallbackShell: { position: "absolute", left: "50%", marginLeft: -31, top: -13, width: 62, height: 62, borderRadius: 31, padding: 4, zIndex: 1020, elevation: 50 },
  fallbackPressable: { flex: 1, borderRadius: 27, overflow: "hidden" },
  fallbackGradient: { flex: 1, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" }
});
