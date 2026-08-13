import { Ionicons } from "@expo/vector-icons";
import { Slot, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusAvatar } from "@/components/StatusAvatar";
import { env } from "@/config/env";
import { canManageGroup } from "@/domain/accessPolicy";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { addGroupMemberDraft, getAddedGroupMemberIds, useGroupMemberDraftRevision } from "@/state/groupMemberDrafts";
import { colors, spacing, typography } from "@/theme";

export default function GroupLayout() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "");
  const insets = useSafeAreaInsets();
  const { currentUser } = useSession();
  const { getConversation: getServerConversation } = useMessaging();
  const { members, getConversation: getLocalConversation, decorateConversation } = useExperience();
  const { getCreatedGroup } = useGroupAdmin();
  const revision = useGroupMemberDraftRevision();
  const [pickerOpen, setPickerOpen] = useState(false);

  const rawConversation = getServerConversation(id) ?? getLocalConversation(id) ?? getCreatedGroup(id);
  const conversation = rawConversation ? decorateConversation(rawConversation) : undefined;
  const addedIds = getAddedGroupMemberIds(id);

  if (conversation && env.mockMode && addedIds.length > 0) {
    const merged = [...new Set([...(conversation.memberIds ?? []), ...addedIds])];
    conversation.memberIds = merged;
    conversation.memberCount = Math.max(conversation.memberCount, merged.length);
  }

  const canManage = canManageGroup(currentUser, conversation);
  const memberIds = new Set([...(conversation?.memberIds ?? []), ...addedIds]);
  const candidates = useMemo(() => members.filter((member) => !memberIds.has(member.id)), [members, revision, conversation?.memberIds?.join("|")]);

  const addMember = (memberId: string) => {
    if (!env.mockMode) {
      Alert.alert("Ajout prêt côté application", "Cette action sera synchronisée dès que l’endpoint d’ajout de membres sera branché au backend Connexio.");
      return;
    }
    addGroupMemberDraft(id, memberId);
    setPickerOpen(false);
  };

  return (
    <View style={styles.root}>
      <Slot />
      {canManage ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un membre au groupe" onPress={() => setPickerOpen(true)} style={({ pressed }) => [styles.fab, { bottom: Math.max(insets.bottom, 12) + 12 }, pressed && styles.fabPressed]}>
          <Ionicons name="person-add" size={20} color={colors.white} />
          <Text style={styles.fabText}>Ajouter un membre</Text>
        </Pressable>
      ) : null}

      <Modal transparent animationType="slide" visible={pickerOpen} onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]} onPress={() => undefined}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={styles.headerCopy}><Text style={styles.sheetTitle}>Ajouter un membre</Text><Text style={styles.sheetSubtitle}>Sélectionnez une personne de l’annuaire Neptune.</Text></View>
              <Pressable accessibilityLabel="Fermer" onPress={() => setPickerOpen(false)} style={styles.close}><Ionicons name="close" size={22} color={colors.textMuted} /></Pressable>
            </View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {candidates.map((member) => (
                <Pressable key={member.id} onPress={() => addMember(member.id)} style={({ pressed }) => [styles.memberRow, pressed && styles.memberPressed]}>
                  <StatusAvatar user={member} size={42} />
                  <View style={styles.memberCopy}><Text style={styles.memberName}>{member.name}</Text><Text numberOfLines={1} style={styles.memberMeta}>{member.company} · {member.roleLabel}</Text></View>
                  <Ionicons name="add-circle" size={26} color={colors.violet} />
                </Pressable>
              ))}
              {candidates.length === 0 ? <Text style={styles.empty}>Tous les membres visibles sont déjà dans ce groupe.</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fab: { position: "absolute", alignSelf: "center", minHeight: 52, paddingHorizontal: 17, borderRadius: 26, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 20, elevation: 18, shadowColor: "#000", shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  fabPressed: { opacity: 0.84, transform: [{ scale: 0.97 }] }, fabText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "flex-end" }, sheet: { width: "100%", maxWidth: 650, maxHeight: "72%", alignSelf: "center", padding: spacing.md, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong }, handle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12, backgroundColor: colors.textMuted }, sheetHeader: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 8 }, headerCopy: { flex: 1 }, sheetTitle: { ...typography.heading2, color: colors.text }, sheetSubtitle: { ...typography.bodySmall, color: colors.textMuted, marginTop: 3 }, close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, list: { maxHeight: 440 }, memberRow: { minHeight: 68, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, flexDirection: "row", alignItems: "center", gap: 10 }, memberPressed: { opacity: 0.72 }, memberCopy: { flex: 1, minWidth: 0 }, memberName: { color: colors.text, fontSize: 14, fontWeight: "900" }, memberMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3 }, empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl }
});
