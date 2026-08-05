import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, gradients, radii } from "@/theme";

type TabsProps = ComponentProps<typeof Tabs>;
type NeptuneTabBarProps = Parameters<NonNullable<TabsProps["tabBar"]>>[0];

const ICONS = {
  messages: {
    active: "chatbubble-ellipses" as const,
    inactive: "chatbubble-ellipses-outline" as const,
    label: "Messages"
  },
  highlights: {
    active: "sparkles" as const,
    inactive: "sparkles-outline" as const,
    label: "Temps forts"
  },
  calls: {
    active: "call" as const,
    inactive: "call-outline" as const,
    label: "Appels"
  },
  settings: {
    active: "person" as const,
    inactive: "person-outline" as const,
    label: "Profil"
  }
};

export function NeptuneTabBar({
  state,
  descriptors,
  navigation
}: NeptuneTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const visibleRoutes = useMemo(
    () => state.routes.filter((route) => route.name in ICONS),
    [state.routes]
  );

  const currentKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === currentKey)
  );
  const innerWidth = Math.max(0, barWidth - 10);
  const itemWidth = visibleRoutes.length > 0 ? innerWidth / visibleRoutes.length : 0;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: itemWidth * activeIndex,
      useNativeDriver: true,
      damping: 18,
      stiffness: 175,
      mass: 0.72
    }).start();
  }, [activeIndex, itemWidth, translateX]);

  const onLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outer,
        { paddingBottom: Math.max(insets.bottom, 8) }
      ]}
    >
      <View onLayout={onLayout} style={styles.bar}>
        {itemWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: itemWidth,
                transform: [{ translateX }]
              }
            ]}
          >
            <LinearGradient
              colors={gradients.activeTab}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.indicatorGradient}
            />
          </Animated.View>
        ) : null}

        {visibleRoutes.map((route) => {
          const focused = route.key === currentKey;
          const options = descriptors[route.key]?.options;
          const icon = ICONS[route.name as keyof typeof ICONS] ?? ICONS.messages;
          const badge = options?.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? icon.label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.item,
                { width: itemWidth || `${100 / visibleRoutes.length}%` },
                pressed && styles.pressed
              ]}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={focused ? icon.active : icon.inactive}
                  size={21}
                  color={focused ? colors.text : "#7F8DAB"}
                />
                {badge !== undefined ? (
                  <View style={styles.badge} accessibilityElementsHidden>
                    <Text style={styles.badgeText} numberOfLines={1}>
                      {String(badge)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.label, focused && styles.labelActive]}
              >
                {icon.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 10,
    paddingTop: 4,
    backgroundColor: colors.background
  },
  bar: {
    height: 72,
    padding: 5,
    overflow: "hidden",
    position: "relative",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(8,18,38,0.98)",
    flexDirection: "row",
    shadowColor: "#000000",
    shadowOpacity: 0.36,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 18
  },
  indicator: {
    position: "absolute",
    left: 5,
    top: 5,
    bottom: 5,
    paddingHorizontal: 2
  },
  indicatorGradient: {
    flex: 1,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  item: {
    minHeight: 62,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  pressed: { transform: [{ scale: 0.96 }] },
  iconWrap: { position: "relative", width: 28, alignItems: "center" },
  label: {
    maxWidth: "100%",
    color: "#7F8DAB",
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "800"
  },
  labelActive: { color: colors.text },
  badge: {
    position: "absolute",
    right: -13,
    top: -8,
    minWidth: 21,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.magenta,
    borderWidth: 2,
    borderColor: colors.surface
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "900" }
});
