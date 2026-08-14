import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { canBeGroupResponsible } from "../domain/accessPolicy";
import { colors } from "../theme";
import type { AppUser } from "../types/messaging";
import { MemberStatusBadge } from "./MemberStatusBadge";
import { StatusAvatar } from "./StatusAvatar";

interface SwipeableMemberRowProps { member: AppUser; isResponsible: boolean; canManage: boolean; isLast?: boolean; onOpen: () => void; onToggleResponsible?: () => void; onRemove?: () => void; }
const ACTION_WIDTH = 176;

import { useAppTheme } from "@/providers/ThemeProvider";
export function SwipeableMemberRow({ member, isResponsible, canManage, isLast = false, onOpen, onToggleResponsible, onRemove }: SwipeableMemberRowProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const translateX = useRef(new Animated.Value(0)).current;
  const responsibleEligible = canBeGroupResponsible(member.role);
  const close = () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 240, mass: 0.7 }).start();
  const open = () => Animated.spring(translateX, { toValue: -ACTION_WIDTH, useNativeDriver: true, damping: 20, stiffness: 240, mass: 0.7 }).start();
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => canManage && Math.abs(gesture.dx) > 7 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
    onMoveShouldSetPanResponderCapture: (_, gesture) => canManage && Math.abs(gesture.dx) > 7 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(-ACTION_WIDTH, Math.min(0, gesture.dx))),
    onPanResponderRelease: (_, gesture) => gesture.dx < -40 || gesture.vx < -0.35 ? open() : close(),
    onPanResponderTerminate: close
  }), [canManage, translateX]);
  const run = (action?: () => void) => { close(); action?.(); };
  return (
    <View style={[styles.stage, !isLast && styles.divider]}>
      {canManage ? <View style={styles.actions}>
        {responsibleEligible ? <Pressable onPress={() => run(onToggleResponsible)} style={[styles.action, styles.responsibleAction]}><Ionicons name={isResponsible ? "person-outline" : "shield-checkmark"} size={19} color={colors.white} /><Text style={styles.actionText}>{isResponsible ? "Standard" : "Responsable"}</Text></Pressable> : <View style={[styles.action, styles.disabledAction]} />}
        <Pressable onPress={() => run(onRemove)} style={[styles.action, styles.removeAction]}><Ionicons name="person-remove" size={19} color={colors.white} /><Text style={styles.actionText}>Exclure</Text></Pressable>
      </View> : null}
      <Animated.View {...panResponder.panHandlers} style={[styles.foreground, { transform: [{ translateX }] }]}>
        <Pressable onPress={() => { close(); onOpen(); }} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <StatusAvatar user={member} size={44} />
          <View style={styles.content}>
            <View style={styles.nameLine}><Text numberOfLines={1} style={styles.name}>{member.name}</Text>{isResponsible ? <View style={styles.responsibleBadge}><Ionicons name="shield-checkmark" size={12} color={theme.orange} /><Text style={styles.responsibleText}>Responsable</Text></View> : null}</View>
            <Text numberOfLines={1} style={styles.company}>{member.company || member.city}</Text>
            <View style={styles.metaLine}><MemberStatusBadge role={member.role} compact />{canManage ? <Text style={styles.swipeHint}>Glisser à gauche ou toucher Gérer</Text> : null}</View>
          </View>
          {canManage ? <Pressable accessibilityLabel={`Gérer ${member.name}`} onPress={(event) => { event.stopPropagation(); open(); }} style={styles.manageButton}><Ionicons name="ellipsis-horizontal" size={20} color={theme.pageTextSecondary} /><Text style={styles.manageText}>Gérer</Text></Pressable> : <Ionicons name="chevron-forward" size={18} color={theme.pageTextMuted} />}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  stage: { minHeight: 82, overflow: "hidden", backgroundColor: theme.surfaceStrong }, divider: { borderBottomWidth: 1, borderBottomColor: theme.borderSoft }, actions: { position: "absolute", top: 0, right: 0, bottom: 0, width: ACTION_WIDTH, flexDirection: "row" }, action: { width: ACTION_WIDTH / 2, alignItems: "center", justifyContent: "center", gap: 7 }, responsibleAction: { backgroundColor: colors.primaryDark }, removeAction: { backgroundColor: theme.danger }, disabledAction: { backgroundColor: theme.surfaceMuted }, actionText: { color: colors.white, fontSize: 10, fontWeight: "900" }, foreground: { backgroundColor: theme.surface }, row: { minHeight: 82, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 11 }, pressed: { opacity: 0.78 }, content: { flex: 1, minWidth: 0 }, nameLine: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 }, name: { flex: 1, minWidth: 0, color: theme.pageText, fontSize: 14, fontWeight: "900" }, company: { color: theme.pageTextMuted, fontSize: 11, marginTop: 3 }, metaLine: { minHeight: 25, marginTop: 5, flexDirection: "row", alignItems: "center", gap: 8 }, responsibleBadge: { minHeight: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: "rgba(244,177,131,0.12)", flexDirection: "row", alignItems: "center", gap: 5 }, responsibleText: { color: theme.orange, fontSize: 10, fontWeight: "900" }, swipeHint: { flex: 1, color: theme.pageTextMuted, fontSize: 9, textAlign: "right" }, manageButton: { minWidth: 54, minHeight: 48, paddingHorizontal: 6, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: theme.surfaceStrong }, manageText: { color: theme.pageTextMuted, fontSize: 9, fontWeight: "900" }
});