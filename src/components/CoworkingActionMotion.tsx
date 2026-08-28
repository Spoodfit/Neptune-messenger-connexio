import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
import type { CoworkingActionFeedback } from "../services/coworking/coworkingActionFeedback";
import { Text } from "./LocalizedText";

interface Props {
  feedback: CoworkingActionFeedback;
  onFinished: () => void;
}

export function CoworkingActionMotion({ feedback, onFinished }: Props) {
  const theme = useAppTheme();
  const { t } = useAppLanguage();
  const reducedMotion = useReducedMotion();
  const handRotation = useSharedValue(0);
  const handX = useSharedValue(0);
  const cardX = useSharedValue(0);

  useEffect(() => {
    handRotation.value = 0;
    handX.value = 0;
    cardX.value = 0;
    const hapticTimers: ReturnType<typeof setTimeout>[] = [];

    if (!reducedMotion && feedback.type === "hello") {
      handRotation.value = withSequence(
        withTiming(-20, { duration: 120 }),
        withTiming(18, { duration: 130 }),
        withTiming(-15, { duration: 120 }),
        withTiming(13, { duration: 120 }),
        withTiming(0, { duration: 140 })
      );
      void Haptics.selectionAsync().catch(() => undefined);
    }

    if (!reducedMotion && feedback.type === "knock") {
      handX.value = withSequence(
        withTiming(9, { duration: 90 }),
        withTiming(0, { duration: 90 }),
        withTiming(9, { duration: 90 }),
        withTiming(0, { duration: 90 }),
        withTiming(9, { duration: 90 }),
        withTiming(0, { duration: 120 })
      );
      cardX.value = withSequence(
        withTiming(3, { duration: 80, easing: Easing.out(Easing.quad) }),
        withTiming(-3, { duration: 80 }),
        withTiming(2, { duration: 80 }),
        withTiming(0, { duration: 90 })
      );
      [70, 250, 430].forEach((delay) => {
        hapticTimers.push(setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        }, delay));
      });
    }

    const finishTimer = setTimeout(onFinished, reducedMotion ? 950 : 1350);
    return () => {
      clearTimeout(finishTimer);
      hapticTimers.forEach(clearTimeout);
    };
  }, [cardX, feedback.id, feedback.type, handRotation, handX, onFinished, reducedMotion]);

  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: handX.value }, { rotate: `${handRotation.value}deg` }]
  }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cardX.value }] }));

  return (
    <Animated.View
      testID="coworking-action-motion"
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={t(feedback.message)}
      entering={reducedMotion ? FadeInDown.duration(0) : FadeInDown.duration(180)}
      exiting={reducedMotion ? FadeOutUp.duration(0) : FadeOutUp.duration(160)}
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
          <Ionicons name="hand-left" size={31} color={feedback.type === "knock" ? theme.danger : theme.violet} />
        </Animated.View>
        {feedback.type === "knock" ? <Ionicons name="log-in-outline" size={19} color={theme.pageTextMuted} /> : null}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: feedback.type === "knock" ? theme.danger : theme.violet }]}>{feedback.type === "knock" ? "DEMANDE ENVOYÉE" : "BONJOUR ENVOYÉ"}</Text>
        <Text numberOfLines={2} style={[styles.message, { color: theme.pageText }]}>{feedback.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    top: "18%",
    left: 22,
    right: 22,
    maxWidth: 340,
    minHeight: 84,
    alignSelf: "center",
    borderRadius: 23,
    borderWidth: 1.5,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    elevation: 30,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 }
  },
  iconStage: { width: 62, height: 58, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 1, overflow: "hidden" },
  hand: { width: 38, height: 42, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 9, lineHeight: 12, fontWeight: "900", letterSpacing: 0.55 },
  message: { marginTop: 3, fontSize: 12, lineHeight: 16, fontWeight: "900" }
});
