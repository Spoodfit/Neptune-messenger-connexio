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
import {
  addGroupMemberDraft,
  getAddedGroupMemberIds,
  removeGroupMemberDraft,
  useGroupMemberDraftRevision
} from "@/state/groupMemberDrafts";
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
  const addedMembers = useMemo(
    () => addedIds.map((memberId) => members.find((member) => member.id === memberId)).filter(Boolean),
    [addedIds.join("|"), members, revision]
  );

  const canManage = canManageGroup(currentUser, conversation);
  const memberIds = new Set([...(conversation?.memberIds ?? []), ...addedIds]);
  const candidates = useMemo(
    () => members.filter((member) => !memberIds.has(member.id)),
    [members, revision, conversation?.memberIds?.join("|"), addedIds.join("|")]
  );

  const addMember = (memberId: string) => {
    if (!env.mockMode) {
      Alert.alert(
        "Ajout prêt côté application",
        "L’ajout réel sera synchronisé dès que l’endpoint de gestion des membres sera branché au backend Connexio. Aucun faux ajout serveur n’est effectué."
      );
      return;
    }
    addGroupMemberDraft(id, memberId);
  };

  const removeDraftMember = (memberId: string) => {
    removeGroupMemberDraft(id, memberId);
  };

  return (
    <View style={styles.root}>
      <Slot />
      {canManage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter un membre au groupe"
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [
            styles.fab,
            { bottom: Math.max(insets.bottom, 12) + 12 },
            pressed && styles.fabPressed
          ]}
        >
          <Ionicons name="person-add" size={20} color={colors.white} />
          <Text style={styles.fabText}>
            Ajouter un membre{env.mockMode && addedIds.length > 0 ? ` · ${addedIds.length}` : ""}
          </Text>
        </Pressable>
      ) : null}

      <Modal transparent animationType="slide" visible={pickerOpen} onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
            onPress={() => undefined}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={styles.headerCopy}>
                <Text style={styles.sheetTitle}>Ajouter un membre</Text>
                <Text style={styles.sheetSubtitle}>
                  {env.mockMode
                    ? "Mode standalone : les ajouts restent actifs pendant cette session de test."
                    : "Sélectionnez une personne de l’annuaire Neptune."}
                </Text>
              </View>
              <Pressable accessibilityLabel="Fermer" onPress={() => setPickerOpen(false)} style={styles.close}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            {env.mockMode && addedMembers.length > 0 ? (
              <View style={styles.addedSection}>
                <View style={styles.addedHeader}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.addedTitle}>Ajoutés pendant cette session</Text>
                </View>
                {addedMembers.map((member) => member ? (
                  <View key={member.id} style={styles.addedRow}>
                    <StatusAvatar user={member} size={38} />
                    <View style={styles.memberCopy}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text numberOfLines={1} style={styles.memberMeta}>{member.company} · {member.roleLabel}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Retirer ${member.name} de l’ajout en attente`}
                      onPress={() => removeDraftMember(member.id)}
                      style={styles.removeDraft}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                    </Pressable>
                  </View>
                ) : null)}
              </View>
            ) : null}

            <Text style={styles.availableTitle}>Membres disponibles</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {candidates.map((member) => (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ajouter ${member.name}`}
                  onPress={() => addMember(member.id)}
                  style={({ pressed }) => [styles.memberRow, pressed && styles.memberPressed]}
                >
                  <StatusAvatar user={member} size={42} />
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text numberOfLines={1} style={styles.memberMeta}>{member.company} · {member.roleLabel}</Text>
                  </View>
                  <Ionicons name="add-circle" size={26} color={colors.violet} />
                </Pressable>
              ))}
              {candidates.length === 0 ? (
                <Text style={styles.empty}>Tous les membres visibles sont déjà dans ce groupe ou ajoutés à la session.</Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fab: {
    position: "absolute",
    alignSelf: "center",
    minHeight: 52,
    paddingHorizontal: 17,
    borderRadius: 26,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 20,
    elevation: 18,
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }
  },
  fabPressed: { opacity: 0.84, transform: [{ scale: 0.97 }] },
  fabText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "flex-end" },
  sheet: {
    width: "100%",
    maxWidth: 650,
    maxHeight: "78%",
    alignSelf: "center",
    padding: spacing.md,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong
  },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12, backgroundColor: colors.textMuted },
  sheetHeader: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 8 },
  headerCopy: { flex: 1 },
  sheetTitle: { ...typography.heading2, color: colors.text },
  sheetSubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  addedSection: { marginTop: 8, marginBottom: 12, padding: 10, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  addedHeader: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 7 },
  addedTitle: { color: colors.success, fontSize: 12, fontWeight: "900" },
  addedRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  removeDraft: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  availableTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: "900", marginBottom: 5 },
  list: { maxHeight: 360 },
  memberRow: { minHeight: 68, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, flexDirection: "row", alignItems: "center", gap: 10 },
  memberPressed: { opacity: 0.72 },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { color: colors.text, fontSize: 14, fontWeight: "900" },
  memberMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl, fontSize: 13, lineHeight: 18 }
});
