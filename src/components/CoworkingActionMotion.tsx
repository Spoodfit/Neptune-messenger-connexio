import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

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
  // Keep the first rendered frame visible. Playwright, web browsers and native
  // screens can otherwise observe a mounted-but-transparent alert before the
  // UI-thread animation has committed its first frame.
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.84)).current;
  const handRotation = useRef(new Animated.Value(0)).current;
  const handX = useRef(new Animated.Value(0)).current;
  const cardX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(1);
    scale.setValue(reducedMotion ? 1 : 0.84);
    handRotation.setValue(0);
    handX.setValue(0);
    cardX.setValue(0);

    const exitDelay = reducedMotion ? 1050 : 1450;
    const animations: Animated.CompositeAnimation[] = [
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: reducedMotion ? 0 : 220, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.delay(exitDelay),
        Animated.timing(scale, { toValue: 0.94, duration: 220, useNativeDriver: true })
      ]),
      Animated.sequence([
        Animated.delay((reducedMotion ? 0 : 220) + exitDelay),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true })
      ])
    ];

    const hapticTimers: ReturnType<typeof setTimeout>[] = [];
    if (!reducedMotion && feedback.type === "hello") {
      animations.push(Animated.sequence([
        Animated.timing(handRotation, { toValue: -22, duration: 140, useNativeDriver: true }),
        Animated.timing(handRotation, { toValue: 20, duration: 150, useNativeDriver: true }),
        Animated.timing(handRotation, { toValue: -18, duration: 140, useNativeDriver: true }),
        Animated.timing(handRotation, { toValue: 17, duration: 150, useNativeDriver: true }),
        Animated.timing(handRotation, { toValue: 0, duration: 160, useNativeDriver: true })
      ]));
      void Haptics.selectionAsync().catch(() => undefined);
    }
    if (!reducedMotion && feedback.type === "knock") {
      animations.push(Animated.sequence([
        Animated.timing(handX, { toValue: 13, duration: 105, useNativeDriver: true }), Animated.timing(handX, { toValue: 0, duration: 105, useNativeDriver: true }),
        Animated.timing(handX, { toValue: 13, duration: 105, useNativeDriver: true }), Animated.timing(handX, { toValue: 0, duration: 105, useNativeDriver: true }),
        Animated.timing(handX, { toValue: 13, duration: 105, useNativeDriver: true }), Animated.timing(handX, { toValue: 0, duration: 145, useNativeDriver: true })
      ]));
      animations.push(Animated.sequence([
        Animated.delay(90), Animated.timing(cardX, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(cardX, { toValue: -5, duration: 55, useNativeDriver: true }), Animated.timing(cardX, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(cardX, { toValue: -3, duration: 50, useNativeDriver: true }), Animated.timing(cardX, { toValue: 0, duration: 60, useNativeDriver: true })
      ]));
      [90, 300, 510].forEach((delay) => {
        hapticTimers.push(setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        }, delay));
      });
    }

    const running = Animated.parallel(animations);
    running.start();

    const finishTimer = setTimeout(onFinished, reducedMotion ? 1450 : 2050);
    return () => {
      running.stop();
      clearTimeout(finishTimer);
      hapticTimers.forEach(clearTimeout);
    };
  }, [cardX, feedback.id, feedback.type, handRotation, handX, onFinished, opacity, reducedMotion, scale]);

  const rotation = handRotation.interpolate({ inputRange: [-22, 20], outputRange: ["-22deg", "20deg"] });

  return (
    <Animated.View
      testID="coworking-action-motion"
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={feedback.type === "hello" ? "Animation bonjour" : "Animation de toquement"}
      style={[
        styles.card,
        { opacity, transform: [{ translateX: cardX }, { scale }] },
        {
          backgroundColor: theme.shellBackground,
          borderColor: feedback.type === "knock" ? theme.danger : theme.violet,
          shadowColor: theme.shadow
        }
      ]}
    >
      <View style={[styles.iconStage, { backgroundColor: feedback.type === "knock" ? theme.dangerSoft : theme.violetSoft }]}>
        <Animated.View style={[styles.hand, { transform: [{ translateX: handX }, { rotate: rotation }] }]}>
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
