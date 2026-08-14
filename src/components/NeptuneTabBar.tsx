import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { capabilitiesForBackendContract } from "@/config/backendCapabilities";
import { env } from "@/config/env";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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
  const reducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuProgress = useRef(new Animated.Value(0)).current;
  const currentKey = state.routes[state.index]?.key;
  const routesByName = useMemo(() => new Map(state.routes.map((route) => [route.name, route])), [state.routes]);
  const leftRoutes = [routesByName.get("messages"), routesByName.get("highlights")].filter(Boolean) as typeof state.routes;
  const rightRoutes = [CALLS_AVAILABLE ? routesByName.get("calls") : undefined, routesByName.get("settings")].filter(Boolean) as typeof state.routes;

  useEffect(() => {
    if (reducedMotion) {
      menuProgress.setValue(menuOpen ? 1 : 0);
      return;
    }
    Animated.spring(menuProgress, { toValue: menuOpen ? 1 : 0, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.72 }).start();
  }, [menuOpen, menuProgress, reducedMotion]);

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
          setMenuOpen(false);
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        {focused ? <LinearGradient colors={gradients.activeTab} style={styles.activePill} /> : null}
        <View style={styles.iconWrap}>
          <Ionicons name={focused ? icon.active : icon.inactive} size={21} color={focused ? colors.text : "#7F8DAB"} />
          {badge !== undefined ? <View style={styles.badge}><Text style={styles.badgeText}>{String(badge)}</Text></View> : null}
        </View>
        <Text numberOfLines={1} style={[styles.label, focused && styles.labelActive]}>{icon.label}</Text>
      </Pressable>
    );
  };

  const openNewConversation = () => { setMenuOpen(false); router.push("/new-conversation"); };
  const openNewHighlight = () => { setMenuOpen(false); router.push("/new-highlight"); };

  return (
    <View pointerEvents="box-none" style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {menuOpen ? <Pressable accessibilityLabel="Fermer les actions rapides" onPress={() => setMenuOpen(false)} style={styles.dismissLayer} /> : null}
      <View style={styles.bar}>
        <View style={styles.sideGroup}>{leftRoutes.map(renderRoute)}</View>
        <View style={styles.centerSlot} />
        <View style={styles.sideGroup}>{rightRoutes.map(renderRoute)}</View>
      </View>

      <Animated.View pointerEvents={menuOpen ? "auto" : "none"} style={[styles.quickAction, styles.quickMessage, { opacity: menuProgress, transform: [{ translateY: menuProgress.interpolate({ inputRange: [0, 1], outputRange: [28, -70] }) }, { scale: menuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
        <LinearGradient colors={["#0754C8", "#674FEA"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.quickGradient} />
        <Pressable accessibilityRole="button" accessibilityLabel="Nouvelle conversation" onPress={openNewConversation} style={styles.quickPressable}>
          <Ionicons name="chatbubble-ellipses" size={22} color={colors.white} />
          <Text style={styles.quickLabel}>Conversation</Text>
        </Pressable>
      </Animated.View>
      <Animated.View pointerEvents={menuOpen ? "auto" : "none"} style={[styles.quickAction, styles.quickHighlight, { opacity: menuProgress, transform: [{ translateY: menuProgress.interpolate({ inputRange: [0, 1], outputRange: [28, -70] }) }, { scale: menuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
        <LinearGradient colors={["#6436C8", "#A044C8", "#C36A8D"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.quickGradient} />
        <Pressable accessibilityRole="button" accessibilityLabel="Publier un Temps fort" onPress={openNewHighlight} style={styles.quickPressable}>
          <Ionicons name="star" size={22} color={colors.white} />
          <Text style={styles.quickLabel}>Temps fort</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.createShell, { transform: [{ rotate: menuProgress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] }) }, { scale: menuProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={menuOpen ? "Fermer la création" : "Créer"}
          accessibilityState={{ expanded: menuOpen }}
          onPress={() => setMenuOpen((value) => !value)}
          style={({ pressed }) => [styles.createPressable, pressed && styles.createPressed]}
        >
          <LinearGradient colors={gradients.primary} style={styles.createGradient}>
            <Ionicons name="add" size={29} color={colors.white} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 8, paddingTop: 4, backgroundColor: colors.background, position: "relative", zIndex: 40 },
  dismissLayer: { position: "absolute", left: -20, right: -20, top: -180, bottom: 0, zIndex: 1 },
  bar: { height: 72, padding: 5, overflow: "visible", position: "relative", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(8,18,38,0.98)", flexDirection: "row", alignItems: "center", elevation: 18, zIndex: 2 },
  sideGroup: { flex: 1, minWidth: 0, height: "100%", flexDirection: "row" },
  centerSlot: { width: 48, flexShrink: 0 },
  item: { flex: 1, minWidth: 0, minHeight: 62, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 6, overflow: "hidden" },
  activePill: { ...StyleSheet.absoluteFillObject, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  iconWrap: { position: "relative", width: 28, alignItems: "center" },
  label: { maxWidth: "100%", color: "#7F8DAB", fontSize: 11, lineHeight: 13, fontWeight: "800" },
  labelActive: { color: colors.text },
  badge: { position: "absolute", right: -13, top: -8, minWidth: 21, height: 18, paddingHorizontal: 5, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.magenta, borderWidth: 2, borderColor: colors.surface },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  createShell: { position: "absolute", left: "50%", marginLeft: -29, top: -11, width: 58, height: 58, borderRadius: 29, padding: 4, backgroundColor: colors.background, zIndex: 6, elevation: 24 },
  createPressable: { flex: 1, borderRadius: 25 },
  createPressed: { opacity: 0.86 },
  createGradient: { flex: 1, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" },
  quickAction: { position: "absolute", top: 0, zIndex: 5, minWidth: 108, height: 52, borderRadius: 18, overflow: "hidden", backgroundColor: "#263D77", borderWidth: 1.5, borderColor: "rgba(180,159,255,0.72)", elevation: 24, shadowColor: "#805DFF", shadowOpacity: 0.62, shadowRadius: 17, shadowOffset: { width: 0, height: 7 } },
  quickMessage: { left: "50%", marginLeft: -122 },
  quickHighlight: { left: "50%", marginLeft: 14, borderColor: "rgba(232,154,255,0.76)", shadowColor: "#C05DFF" },
  quickGradient: { ...StyleSheet.absoluteFillObject },
  quickPressable: { flex: 1, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  quickLabel: { color: colors.white, fontSize: 11, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.36)", textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } }
});
