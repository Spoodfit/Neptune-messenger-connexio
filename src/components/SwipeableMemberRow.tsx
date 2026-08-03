import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { canBeGroupResponsible } from "../domain/accessPolicy";
import { colors } from "../theme";
import type { AppUser } from "../types/messaging";
import { MemberStatusBadge } from "./MemberStatusBadge";
import { StatusAvatar } from "./StatusAvatar";

interface SwipeableMemberRowProps {
  member: AppUser;
  isResponsible: boolean;
  canManage: boolean;
  isLast?: boolean;
  onOpen: () => void;
  onToggleResponsible?: () => void;
  onRemove?: () => void;
}

const ACTION_WIDTH = 154;

export function SwipeableMemberRow({
  member,
  isResponsible,
  canManage,
  isLast = false,
  onOpen,
  onToggleResponsible,
  onRemove
}: SwipeableMemberRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const responsibleEligible = canBeGroupResponsible(member.role);

  const close = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 240,
      mass: 0.7
    }).start();
  };

  const open = () => {
    Animated.spring(translateX, {
      toValue: -ACTION_WIDTH,
      useNativeDriver: true,
      damping: 20,
      stiffness: 240,
      mass: 0.7
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          canManage &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
        onPanResponderMove: (_, gesture) => {
          translateX.setValue(Math.max(-ACTION_WIDTH, Math.min(0, gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -45) open();
          else close();
        },
        onPanResponderTerminate: close
      }),
    [canManage, translateX]
  );

  const run = (action?: () => void) => {
    close();
    action?.();
  };

  return (
    <View style={[styles.stage, !isLast && styles.divider]}>
      {canManage ? (
        <View style={styles.actions}>
          {responsibleEligible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isResponsible
                  ? `Retirer ${member.name} des responsables`
                  : `Nommer ${member.name} responsable`
              }
              onPress={() => run(onToggleResponsible)}
              style={[styles.action, styles.responsibleAction]}
            >
              <Ionicons
                name={isResponsible ? "shield-outline" : "shield-checkmark"}
                size={19}
                color={colors.white}
              />
              <Text style={styles.actionText}>
                {isResponsible ? "Retirer" : "Responsable"}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Retirer ${member.name} du groupe`}
            onPress={() => run(onRemove)}
            style={[styles.action, styles.removeAction]}
          >
            <Ionicons name="person-remove" size={19} color={colors.white} />
            <Text style={styles.actionText}>Retirer</Text>
          </Pressable>
        </View>
      ) : null}

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.foreground, { transform: [{ translateX }] }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${member.name}, ${member.company}, statut ${member.roleLabel}${
            isResponsible ? ", responsable du groupe" : ""
          }${canManage ? ". Glisser vers la gauche pour gérer." : ""}`}
          accessibilityHint="Ouvre le profil du membre"
          onPress={() => {
            close();
            onOpen();
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <StatusAvatar user={member} size={44} />
          <View style={styles.content}>
            <View style={styles.nameLine}>
              <Text numberOfLines={1} style={styles.name}>
                {member.name}
              </Text>
              {isResponsible ? (
                <View style={styles.responsibleBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.orange} />
                  <Text style={styles.responsibleText}>Responsable</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.company}>
              {member.company || member.city}
            </Text>
            <View style={styles.metaLine}>
              <MemberStatusBadge role={member.role} compact />
              {canManage ? (
                <Text style={styles.swipeHint}>Glisser pour gérer</Text>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { minHeight: 82, overflow: "hidden", backgroundColor: colors.surfaceStrong },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  actions: {
    ...StyleSheet.absoluteFillObject,
    left: undefined,
    width: ACTION_WIDTH,
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  action: {
    width: ACTION_WIDTH / 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  responsibleAction: { backgroundColor: colors.primaryDark },
  removeAction: { backgroundColor: colors.dangerSoft },
  actionText: { color: colors.white, fontSize: 8, fontWeight: "900" },
  foreground: { backgroundColor: colors.surface },
  row: {
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  pressed: { opacity: 0.78 },
  content: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  name: { flex: 1, minWidth: 0, color: colors.text, fontSize: 12, fontWeight: "900" },
  company: { color: colors.textMuted, fontSize: 9.5, marginTop: 3 },
  metaLine: { minHeight: 25, marginTop: 5, flexDirection: "row", alignItems: "center", gap: 6 },
  responsibleBadge: {
    minHeight: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: "rgba(244,177,131,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  responsibleText: { color: colors.orange, fontSize: 8, fontWeight: "900" },
  swipeHint: { flex: 1, color: colors.textMuted, fontSize: 8, textAlign: "right" }
});
