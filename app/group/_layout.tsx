import { Text } from "@/components/LocalizedText";
import {
  Ionicons } from "@expo/vector-icons";
import { Slot,
  useLocalSearchParams } from "expo-router";
import { useMemo,
  useState } from "react";
import { Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusAvatar } from "@/components/StatusAvatar";
import { env } from "@/config/env";
import { canManageGroup } from "@/domain/accessPolicy";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { AppAlert } from "@/services/ui/AppAlert";
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
  const theme = useAppTheme();
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
      AppAlert.alert(
        "Ajout prêt côté application",
        "L’ajout réel sera synchronisé dès que l’endpoint de gestion des membres sera branché au backend Connexio. Aucun faux ajout serveur n’est effectué."
      );
      return;
    }
    addGroupMemberDraft(id, memberId);
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
            { bottom: Math.max(insets.bottom, 12) + 12, shadowColor: theme.shadow },
            pressed && styles.fabPressed
          ]}
        >
          <Ionicons name="person-add" size={20} color={colors.white} />
          <Text style={styles.fabText}>Ajouter un membre{env.mockMode && addedIds.length > 0 ? ` · ${addedIds.length}` : ""}</Text>
        </Pressable>
      ) : null}

      <Modal transparent animationType="slide" visible={pickerOpen} onRequestClose={() => setPickerOpen(false)} statusBarTranslucent>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg), borderColor: theme.border, backgroundColor: theme.surface, shadowColor: theme.shadow }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: theme.pageTextMuted }]} />
            <View style={styles.sheetHeader}>
              <View style={styles.headerCopy}>
                <Text style={[styles.sheetTitle, { color: theme.pageText }]}>Ajouter un membre</Text>
                <Text style={[styles.sheetSubtitle, { color: theme.pageTextMuted }]}>
                  {env.mockMode ? "Mode standalone : les ajouts restent actifs pendant cette session de test." : "Sélectionnez une personne de l’annuaire Neptune."}
                </Text>
              </View>
              <Pressable accessibilityLabel="Fermer" onPress={() => setPickerOpen(false)} style={[styles.close, { backgroundColor: theme.surfaceStrong }]}>
                <Ionicons name="close" size={22} color={theme.pageTextMuted} />
              </Pressable>
            </View>

            {env.mockMode && addedMembers.length > 0 ? (
              <View style={[styles.addedSection, { borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong }]}>
                <View style={styles.addedHeader}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                  <Text style={[styles.addedTitle, { color: theme.success }]}>Ajoutés pendant cette session</Text>
                </View>
                {addedMembers.map((member) => member ? (
                  <View key={member.id} style={[styles.addedRow, { borderTopColor: theme.borderSoft }]}>
                    <StatusAvatar user={member} size={38} />
                    <View style={styles.memberCopy}>
                      <Text style={[styles.memberName, { color: theme.pageText }]}>{member.name}</Text>
                      <Text numberOfLines={1} style={[styles.memberMeta, { color: theme.pageTextMuted }]}>{member.company} · {member.roleLabel}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${member.name} de l’ajout en attente`} onPress={() => removeGroupMemberDraft(id, member.id)} style={styles.removeDraft}>
                      <Ionicons name="close-circle" size={24} color={theme.danger} />
                    </Pressable>
                  </View>
                ) : null)}
              </View>
            ) : null}

            <Text style={[styles.availableTitle, { color: theme.pageTextSecondary }]}>Membres disponibles</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {candidates.map((member) => (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ajouter ${member.name}`}
                  onPress={() => addMember(member.id)}
                  style={({ pressed }) => [styles.memberRow, { borderBottomColor: theme.borderSoft }, pressed && styles.memberPressed]}
                >
                  <StatusAvatar user={member} size={42} />
                  <View style={styles.memberCopy}>
                    <Text style={[styles.memberName, { color: theme.pageText }]}>{member.name}</Text>
                    <Text numberOfLines={1} style={[styles.memberMeta, { color: theme.pageTextMuted }]}>{member.company} · {member.roleLabel}</Text>
                  </View>
                  <Ionicons name="add-circle" size={26} color={theme.violet} />
                </Pressable>
              ))}
              {candidates.length === 0 ? <Text style={[styles.empty, { color: theme.pageTextMuted }]}>Tous les membres visibles sont déjà dans ce groupe ou ajoutés à la session.</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fab: { position: "absolute", alignSelf: "center", minHeight: 52, paddingHorizontal: 17, borderRadius: 26, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 20, elevation: 18, shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  fabPressed: { opacity: 0.84, transform: [{ scale: 0.97 }] },
  fabText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 650, maxHeight: "78%", alignSelf: "center", padding: spacing.md, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, elevation: 30, shadowOpacity: 0.2, shadowRadius: 28, shadowOffset: { width: 0, height: -8 } },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetHeader: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 8 },
  headerCopy: { flex: 1 },
  sheetTitle: { ...typography.heading2 },
  sheetSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  close: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  addedSection: { marginTop: 8, marginBottom: 12, padding: 10, borderRadius: 18, borderWidth: 1 },
  addedHeader: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 7 },
  addedTitle: { fontSize: 12, fontWeight: "900" },
  addedRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9, borderTopWidth: 1 },
  removeDraft: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  availableTitle: { fontSize: 12, fontWeight: "900", marginBottom: 5 },
  list: { maxHeight: 360 },
  memberRow: { minHeight: 68, paddingHorizontal: 6, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  memberPressed: { opacity: 0.72 },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: "900" },
  memberMeta: { fontSize: 12, marginTop: 3 },
  empty: { textAlign: "center", padding: spacing.xl, fontSize: 13, lineHeight: 18 }
});
