import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GROUP_VISIBILITY_ROLES, isGovernanceRole, ROLE_LABELS } from "@/domain/roles";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useSession } from "@/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import type { CanonicalUserRole } from "@/types/messaging";

export default function NewConversationScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useSession();
  const { members, createPrivateConversation } = useExperience();
  const { createGroup } = useGroupAdmin();
  const canCreateOfficialGroup = isGovernanceRole(currentUser.role);
  const [mode, setMode] = useState<"private" | "group">("private");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowedRoles, setAllowedRoles] = useState<CanonicalUserRole[]>([
    "visionnaire",
    "amiral",
    "capitaine",
    "legende",
    "moussaillon",
    "triton"
  ]);
  const [membersCanPost, setMembersCanPost] = useState(true);

  const availableMembers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return members
      .filter((member) => member.id !== currentUser.id)
      .filter((member) =>
        query
          ? [member.name, member.company, member.city]
              .join(" ")
              .toLocaleLowerCase("fr")
              .includes(query)
          : true
      );
  }, [currentUser.id, members, search]);

  const toggleMember = (memberId: string) => {
    setSelectedIds((previous) => {
      if (previous.includes(memberId)) {
        return previous.filter((id) => id !== memberId);
      }
      if (mode === "private" && previous.length >= 4) {
        Alert.alert(
          "Limite atteinte",
          "Un mini-groupe privé accepte quatre contacts maximum, en plus de vous."
        );
        return previous;
      }
      return [...previous, memberId];
    });
  };

  const toggleRole = (role: CanonicalUserRole) => {
    setAllowedRoles((previous) =>
      previous.includes(role)
        ? previous.filter((item) => item !== role)
        : [...previous, role]
    );
  };

  const submit = () => {
    if (mode === "private") {
      if (selectedIds.length < 1) {
        Alert.alert("Sélection requise", "Choisissez au moins un contact.");
        return;
      }
      try {
        const conversation = createPrivateConversation({
          memberIds: selectedIds,
          name: name.trim() || undefined
        });
        router.replace(`/chat/${encodeURIComponent(conversation.id)}`);
      } catch (error) {
        Alert.alert(
          "Conversation impossible",
          error instanceof Error ? error.message : "Vérifiez les contacts sélectionnés."
        );
      }
      return;
    }

    if (!canCreateOfficialGroup) {
      Alert.alert(
        "Autorisation insuffisante",
        "La création d’un groupe officiel dépend des permissions administrateur du backend Neptune."
      );
      return;
    }
    if (!name.trim()) {
      Alert.alert("Nom requis", "Donnez un nom au groupe.");
      return;
    }
    if (allowedRoles.length === 0) {
      Alert.alert(
        "Visibilité requise",
        "Sélectionnez au moins un statut autorisé."
      );
      return;
    }
    const group = createGroup({
      name,
      description,
      allowedRoles,
      canMembersPost: membersCanPost,
      iconName: "people"
    });
    router.replace(`/group/${encodeURIComponent(group.id)}`);
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, spacing.sm),
            paddingLeft: spacing.sm + insets.left,
            paddingRight: spacing.sm + insets.right
          }
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer la création"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="close" size={25} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Nouvelle conversation
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Créer"
          onPress={submit}
          style={styles.doneButton}
        >
          <Text style={styles.doneText}>Créer</Text>
        </Pressable>
      </View>

      <View style={styles.modeSwitch} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "private" }}
          onPress={() => {
            setMode("private");
            setSelectedIds((previous) => previous.slice(0, 4));
          }}
          style={styles.modeButton}
        >
          {mode === "private" ? (
            <LinearGradient
              colors={gradients.activeTab}
              style={StyleSheet.absoluteFillObject}
            />
          ) : null}
          <Text style={[styles.modeText, mode === "private" && styles.modeTextActive]}>
            Privée
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "group" }}
          onPress={() => setMode("group")}
          style={styles.modeButton}
        >
          {mode === "group" ? (
            <LinearGradient
              colors={gradients.activeTab}
              style={StyleSheet.absoluteFillObject}
            />
          ) : null}
          <Text style={[styles.modeText, mode === "group" && styles.modeTextActive]}>
            Groupe officiel
          </Text>
        </Pressable>
      </View>

      {mode === "private" ? (
        <View style={styles.flex}>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={18} color={colors.success} />
            <Text style={styles.infoText}>
              Une discussion individuelle ou un mini-groupe privé de quatre contacts maximum.
            </Text>
          </View>
          {selectedIds.length > 1 ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nom du mini-groupe (facultatif)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={70}
            />
          ) : null}
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher nom, entreprise ou ville"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.selectionCount}>
            {selectedIds.length}/4 contact{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
          </Text>
          <FlatList
            data={availableMembers}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.memberList}
            renderItem={({ item }) => {
              const selected = selectedIds.includes(item.id);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleMember(item.id)}
                  style={({ pressed }) => [styles.memberRow, pressed && styles.pressed]}
                >
                  <View style={styles.memberAvatar}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.memberInitials}>{item.initials}</Text>
                    )}
                  </View>
                  <View style={styles.memberContent}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberMeta} numberOfLines={1}>
                      {item.company} · {item.city}
                    </Text>
                  </View>
                  <View style={[styles.check, selected && styles.checkSelected]}>
                    {selected ? (
                      <Ionicons name="checkmark" size={18} color={colors.white} />
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.groupForm,
            { paddingBottom: Math.max(insets.bottom, spacing.xl) }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {!canCreateOfficialGroup ? (
            <View style={[styles.infoCard, styles.warningCard]}>
              <Ionicons name="lock-closed" size={18} color={colors.warning} />
              <Text style={styles.infoText}>
                Cet écran est visible, mais le backend devra confirmer le droit administrateur avant la création.
              </Text>
            </View>
          ) : null}
          <Text style={styles.label}>Identité du groupe</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nom du groupe"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={70}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.multiline]}
            multiline
            maxLength={240}
          />

          <Text style={styles.label}>Visibilité selon les statuts</Text>
          <View style={styles.roleGrid}>
            {GROUP_VISIBILITY_ROLES.map((role) => {
              const selected = allowedRoles.includes(role);
              return (
                <Pressable
                  key={role}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleRole(role)}
                  style={[styles.roleChip, selected && styles.roleChipSelected]}
                >
                  <Text style={[styles.roleText, selected && styles.roleTextSelected]}>
                    {ROLE_LABELS[role]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.switchTitle}>Les membres peuvent publier</Text>
              <Text style={styles.switchSubtitle}>
                Sinon, seuls les administrateurs et responsables autorisés publient.
              </Text>
            </View>
            <Switch
              value={membersCanPost}
              onValueChange={setMembersCanPost}
              trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.backendNote}>
            <Text style={styles.backendTitle}>Branchement backend attendu</Text>
            <Text style={styles.backendText}>
              Le serveur devra filtrer la liste, les notifications, l’accès direct par URL et les permissions d’écriture. Masquer seulement l’onglet côté mobile ne constitue pas une autorisation.
            </Text>
          </View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    minHeight: 58,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    ...typography.heading2,
    color: colors.text,
    flex: 1,
    minWidth: 0
  },
  doneButton: {
    minWidth: 64,
    minHeight: 44,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  doneText: { color: colors.orange, fontWeight: "900" },
  modeSwitch: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    height: 44,
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    overflow: "hidden"
  },
  modeButton: {
    flex: 1,
    borderRadius: 13,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center"
  },
  modeText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  modeTextActive: { color: colors.text },
  infoCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start"
  },
  warningCard: { borderColor: "rgba(244,177,131,0.38)" },
  infoText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  input: {
    minHeight: 48,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    color: colors.text,
    ...typography.body
  },
  multiline: { minHeight: 92, textAlignVertical: "top" },
  selectionCount: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingBottom: 6
  },
  memberList: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  memberRow: {
    minHeight: 68,
    marginBottom: 7,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.992 }] },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: { width: "100%", height: "100%" },
  memberInitials: { color: colors.text, fontWeight: "900" },
  memberContent: { flex: 1, minWidth: 0 },
  memberName: { ...typography.heading3, color: colors.text },
  memberMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  checkSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupForm: { paddingBottom: spacing.xl },
  label: {
    ...typography.heading3,
    color: colors.text,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: 8
  },
  roleGrid: {
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  roleChip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  roleChipSelected: {
    borderColor: colors.violet,
    backgroundColor: "rgba(107,79,234,0.22)"
  },
  roleText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  roleTextSelected: { color: colors.text },
  switchRow: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  switchContent: { flex: 1, minWidth: 0 },
  switchTitle: { ...typography.heading3, color: colors.text },
  switchSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  backendNote: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted
  },
  backendTitle: { color: colors.orange, fontWeight: "900" },
  backendText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 6 }
});
