import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from "react-native-reanimated";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { useAppTheme } from "../providers/ThemeProvider";
import type { CoworkingActionFeedback } from "../services/coworking/coworkingActionFeedback";
import { Text } from "./LocalizedText";

interface Props {
  feedback: CoworkingActionFeedback;
  onFinished: () => void;
}

export function CoworkingActionMotion({ feedback, onFinished }: Props) {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.84);
  const handRotation = useSharedValue(0);
  const handX = useSharedValue(0);
  const cardX = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: reducedMotion ? 80 : 180 }),
      withDelay(reducedMotion ? 1050 : 1450, withTiming(0, { duration: 220 }))
    );
    scale.value = withSequence(
      withTiming(1, { duration: reducedMotion ? 80 : 220, easing: Easing.out(Easing.back(1.5)) }),
      withDelay(reducedMotion ? 1050 : 1450, withTiming(0.94, { duration: 220 }))
    );

    const hapticTimers: ReturnType<typeof setTimeout>[] = [];
    if (!reducedMotion && feedback.type === "hello") {
      handRotation.value = withSequence(
        withTiming(-22, { duration: 140 }),
        withTiming(20, { duration: 150 }),
        withTiming(-18, { duration: 140 }),
        withTiming(17, { duration: 150 }),
        withTiming(0, { duration: 160 })
      );
      void Haptics.selectionAsync().catch(() => undefined);
    }
    if (!reducedMotion && feedback.type === "knock") {
      handX.value = withSequence(
        withTiming(13, { duration: 105 }), withTiming(0, { duration: 105 }),
        withTiming(13, { duration: 105 }), withTiming(0, { duration: 105 }),
        withTiming(13, { duration: 105 }), withTiming(0, { duration: 145 })
      );
      cardX.value = withSequence(
        withDelay(90, withTiming(5, { duration: 50 })),
        withTiming(-5, { duration: 55 }), withTiming(4, { duration: 50 }),
        withTiming(-3, { duration: 50 }), withTiming(0, { duration: 60 })
      );
      [90, 300, 510].forEach((delay) => {
        hapticTimers.push(setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        }, delay));
      });
    }

    const finishTimer = setTimeout(onFinished, reducedMotion ? 1450 : 2050);
    return () => {
      clearTimeout(finishTimer);
      hapticTimers.forEach(clearTimeout);
    };
  }, [cardX, feedback.id, feedback.type, handRotation, handX, onFinished, opacity, reducedMotion, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: cardX.value }, { scale: scale.value }]
  }));
  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: handX.value }, { rotate: `${handRotation.value}deg` }]
  }));

  return (
    <Animated.View
      testID="coworking-action-motion"
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={feedback.type === "hello" ? "Animation bonjour" : "Animation de toquement"}
      style={[
        styles.card,
        cardStyle,
        {
          backgroundColor: theme.shellBackground,
          borderColor: feedback.type === "knock" ? theme.danger : theme.violet,
          shadowColor: theme.shadow
        }
      ]}
    >
      <View style={[styles.iconStage, { backgroundColor: feedback.type === "knock" ? theme.dangerSoft : theme.violetSoft }]}>
        <Animated.View style={[styles.hand, handStyle]}>
          <Ionicons name="hand-left" size={47} color={feedback.type === "knock" ? theme.danger : theme.violet} />
        </Animated.View>
        {feedback.type === "knock" ? <Ionicons name="log-in-outline" size={30} color={theme.pageTextMuted} /> : null}
      </View>
      <Text style={[styles.message, { color: theme.pageText }]}>{feedback.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { position: "absolute", top: "22%", alignSelf: "center", width: 220, minHeight: 160, borderRadius: 30, borderWidth: 1.5, padding: 16, alignItems: "center", justifyContent: "center", gap: 12, elevation: 36, shadowOpacity: 0.32, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  iconStage: { width: 112, height: 80, borderRadius: 26, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, overflow: "hidden" },
  hand: { width: 58, height: 58, alignItems: "center", justifyContent: "center" },
  message: { fontSize: 13, lineHeight: 18, fontWeight: "900", textAlign: "center" }
});
