import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { capabilitiesForBackendContract } from "@/config/backendCapabilities";
import { env } from "@/config/env";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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
        {focused ? <LinearGradient colors={theme.isLight ? ["rgba(0,72,186,0.11)", "rgba(107,79,234,0.12)"] : gradients.activeTab} style={[styles.activePill, { borderColor: theme.navBorder }]} /> : null}
        <View style={styles.iconWrap}>
          <Ionicons name={focused ? icon.active : icon.inactive} size={21} color={focused ? (theme.isLight ? colors.primary : colors.text) : theme.navInactive} />
          {badge !== undefined ? <View style={styles.badge}><Text style={styles.badgeText}>{String(badge)}</Text></View> : null}
        </View>
        <Text numberOfLines={1} style={[styles.label, { color: focused ? theme.pageText : theme.navInactive }]}>{icon.label}</Text>
      </Pressable>
    );
  };

  const openNewConversation = () => { setMenuOpen(false); router.push("/new-conversation"); };
  const openNewHighlight = () => { setMenuOpen(false); router.push("/new-highlight"); };
  const actionTranslate = menuProgress.interpolate({ inputRange: [0, 1], outputRange: [26, -74] });
  const actionScale = menuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <View pointerEvents="box-none" style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: theme.pageBackground }]}>
      {menuOpen ? <Pressable accessibilityLabel="Fermer les actions rapides" onPress={() => setMenuOpen(false)} style={styles.dismissLayer} /> : null}
      <View style={[styles.bar, { backgroundColor: theme.navBackground, borderColor: theme.navBorder }]}>
        <View style={styles.sideGroup}>{leftRoutes.map(renderRoute)}</View>
        <View style={styles.centerSlot} />
        <View style={styles.sideGroup}>{rightRoutes.map(renderRoute)}</View>
      </View>

      <Animated.View pointerEvents={menuOpen ? "auto" : "none"} style={[styles.quickAction, styles.quickMessage, { opacity: menuProgress, transform: [{ translateY: actionTranslate }, { scale: actionScale }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Nouvelle conversation" onPress={openNewConversation} style={({ pressed }) => [styles.quickPressable, pressed && styles.quickPressed]}>
          <LinearGradient colors={["#0E5ED7", "#644FEA"]} style={styles.quickGradient}>
            <View style={styles.quickIcon}><Ionicons name="chatbubble-ellipses" size={21} color={colors.white} /></View><Text style={styles.quickLabel}>Conversation</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
      <Animated.View pointerEvents={menuOpen ? "auto" : "none"} style={[styles.quickAction, styles.quickHighlight, { opacity: menuProgress, transform: [{ translateY: actionTranslate }, { scale: actionScale }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Publier un Temps fort" onPress={openNewHighlight} style={({ pressed }) => [styles.quickPressable, pressed && styles.quickPressed]}>
          <LinearGradient colors={["#7B49EA", "#C043C8", "#EA6A8D"]} style={styles.quickGradient}>
            <View style={styles.quickIcon}><Ionicons name="star" size={21} color={colors.white} /></View><Text style={styles.quickLabel}>Temps fort</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.createShell, { backgroundColor: theme.pageBackground, transform: [{ rotate: menuProgress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] }) }, { scale: menuProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={menuOpen ? "Fermer la création" : "Créer"} accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen((value) => !value)} style={({ pressed }) => [styles.createPressable, pressed && styles.createPressed]}>
          <LinearGradient colors={gradients.primary} style={styles.createGradient}><Ionicons name="add" size={29} color={colors.white} /></LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 8, paddingTop: 4, position: "relative", zIndex: 1000, elevation: 40 },
  dismissLayer: { position: "absolute", left: -20, right: -20, top: -190, bottom: 0, zIndex: 1001 },
  bar: { height: 72, padding: 5, overflow: "visible", position: "relative", borderRadius: radii.xl, borderWidth: 1, flexDirection: "row", alignItems: "center", elevation: 42, zIndex: 1002, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  sideGroup: { flex: 1, minWidth: 0, height: "100%", flexDirection: "row" }, centerSlot: { width: 48, flexShrink: 0 },
  item: { flex: 1, minWidth: 0, minHeight: 62, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 6, overflow: "hidden" }, activePill: { ...StyleSheet.absoluteFillObject, borderRadius: 18, borderWidth: 1 }, pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] }, iconWrap: { position: "relative", width: 28, alignItems: "center" }, label: { maxWidth: "100%", fontSize: 11, lineHeight: 13, fontWeight: "800" },
  badge: { position: "absolute", right: -13, top: -8, minWidth: 21, height: 18, paddingHorizontal: 5, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.magenta, borderWidth: 2, borderColor: colors.surface }, badgeText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  createShell: { position: "absolute", left: "50%", marginLeft: -29, top: -11, width: 58, height: 58, borderRadius: 29, padding: 4, zIndex: 1020, elevation: 50 }, createPressable: { flex: 1, borderRadius: 25 }, createPressed: { opacity: 0.86 }, createGradient: { flex: 1, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" },
  quickAction: { position: "absolute", top: 0, zIndex: 1010, width: 132, height: 56, borderRadius: 20, elevation: 48, shadowColor: "#000", shadowOpacity: 0.42, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }, quickMessage: { left: "50%", marginLeft: -142 }, quickHighlight: { left: "50%", marginLeft: 10 }, quickPressable: { flex: 1, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.32)" }, quickPressed: { opacity: 0.86, transform: [{ scale: 0.97 }] }, quickGradient: { flex: 1, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, quickIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(2,7,19,0.26)", alignItems: "center", justifyContent: "center" }, quickLabel: { color: colors.white, fontSize: 11, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 4 }
});
