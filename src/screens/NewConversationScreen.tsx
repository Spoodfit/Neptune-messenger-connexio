import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { env } from "../config/env";
import {
  GROUP_VISIBILITY_ROLES,
  isGovernanceRole,
  ROLE_LABELS
} from "../domain/roles";
import {
  MAX_PRIVATE_CONTACTS,
  MAX_PRIVATE_PARTICIPANTS,
  useExperience
} from "../providers/ExperienceProvider";
import { useGroupAdmin } from "../providers/GroupAdminProvider";
import { useMessaging } from "../providers/MessagingProvider";
import { useSession } from "../providers/SessionProvider";
import { NeptuneExperienceApi } from "../services/api/experienceApi";
import { uploadGroupAvatar } from "../services/api/uploadApi";
import { pickGroupAvatar } from "../services/media/mediaPicker";
import { colors, gradients, spacing, typography } from "../theme";
import type { CanonicalUserRole } from "../types/messaging";

const GROUP_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  "people",
  "business",
  "bulb",
  "rocket",
  "location",
  "calendar",
  "megaphone",
  "school",
  "trophy",
  "construct"
];

export default function NewConversationScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, accessToken } = useSession();
  const { members, createPrivateConversation } = useExperience();
  const { createGroup } = useGroupAdmin();
  const { refreshConversations } = useMessaging();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)),
    [accessToken]
  );
  const canCreateOfficialGroup = isGovernanceRole(currentUser.role);

  const [mode, setMode] = useState<"private" | "group">("private");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [privateName, setPrivateName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [membersCanPost, setMembersCanPost] = useState(true);
  const [allowedRoles, setAllowedRoles] = useState<CanonicalUserRole[]>([
    ...GROUP_VISIBILITY_ROLES
  ]);
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [iconName, setIconName] = useState<keyof typeof Ionicons.glyphMap>(
    "people"
  );
  const [creating, setCreating] = useState(false);

  const filteredMembers = useMemo(() => {
    const cleanQuery = query.trim().toLocaleLowerCase("fr");
    return members
      .filter((member) => member.id !== currentUser.id)
      .filter((member) =>
        cleanQuery
          ? [member.name, member.company, member.city]
              .join(" ")
              .toLocaleLowerCase("fr")
              .includes(cleanQuery)
          : true
      );
  }, [currentUser.id, members, query]);

  const toggleMember = (memberId: string) => {
    setSelectedIds((previous) => {
      if (previous.includes(memberId)) {
        return previous.filter((id) => id !== memberId);
      }
      if (previous.length >= MAX_PRIVATE_CONTACTS) {
        Alert.alert(
          "Limite atteinte",
          `${MAX_PRIVATE_PARTICIPANTS} participants maximum, vous compris.`
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

  const selectAvatar = async () => {
    try {
      const selected = await pickGroupAvatar();
      if (selected) setAvatarUri(selected);
    } catch (error) {
      Alert.alert(
        "Image indisponible",
        error instanceof Error
          ? error.message
          : "L’image du groupe n’a pas pu être sélectionnée."
      );
    }
  };

  const submit = async () => {
    if (creating) return;
    if (mode === "private" && selectedIds.length === 0) {
      Alert.alert("Contact requis", "Sélectionnez au moins un membre.");
      return;
    }
    if (mode === "group") {
      if (!canCreateOfficialGroup) {
        Alert.alert(
          "Autorisation insuffisante",
          "Votre statut Neptune ne permet pas de créer un groupe officiel."
        );
        return;
      }
      if (!groupName.trim()) {
        Alert.alert("Nom requis", "Indiquez le nom du groupe.");
        return;
      }
      if (allowedRoles.length === 0) {
        Alert.alert("Visibilité requise", "Sélectionnez au moins un statut.");
        return;
      }
    }

    setCreating(true);
    try {
      if (mode === "private") {
        const conversation = api
          ? await api.createPrivateConversation(
              selectedIds,
              privateName.trim() || undefined
            )
          : createPrivateConversation({
              memberIds: selectedIds,
              name: privateName.trim() || undefined
            });
        if (api) await refreshConversations();
        router.replace(`/chat/${encodeURIComponent(conversation.id)}`);
        return;
      }

      let readyAvatar = avatarUri;
      if (api && avatarUri?.startsWith("file:")) {
        readyAvatar = await uploadGroupAvatar(avatarUri, accessToken);
      }
      const draft = {
        name: groupName,
        description,
        allowedRoles,
        canMembersPost: membersCanPost,
        iconName,
        avatarUrl: readyAvatar
      };
      const group = api ? await api.createGroup(draft) : createGroup(draft);
      if (api) await refreshConversations();
      router.replace(`/group/${encodeURIComponent(group.id)}`);
    } catch (error) {
      Alert.alert(
        "Création impossible",
        error instanceof Error ? error.message : "La création a échoué."
      );
    } finally {
      setCreating(false);
    }
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
        <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>
          Nouvelle conversation
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Créer"
          accessibilityState={{ busy: creating, disabled: creating }}
          disabled={creating}
          onPress={() => void submit()}
          style={styles.createAction}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.orange} />
          ) : (
            <Text style={styles.createActionText}>Créer</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {(["private", "group"] as const).map((value) => {
          const active = mode === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setMode(value)}
              style={styles.tab}
            >
              {active ? (
                <LinearGradient
                  colors={gradients.activeTab}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Ionicons
                name={value === "private" ? "chatbubbles" : "people"}
                size={17}
                color={active ? colors.text : colors.textMuted}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {value === "private" ? "Privée" : "Groupe officiel"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mode === "private" ? (
          <>
            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark" size={19} color={colors.success} />
              <Text style={styles.infoText}>
                Discussion individuelle ou mini-groupe de {MAX_PRIVATE_PARTICIPANTS} participants au total, vous compris.
              </Text>
            </View>

            {selectedIds.length > 1 ? (
              <TextInput
                value={privateName}
                onChangeText={setPrivateName}
                placeholder="Nom du mini-groupe (facultatif)"
                placeholderTextColor={colors.textMuted}
                maxLength={70}
                style={styles.input}
              />
            ) : null}

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher par nom, entreprise ou ville"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <View style={styles.selectionRow}>
              <Text style={styles.selectionText}>
                {selectedIds.length}/{MAX_PRIVATE_CONTACTS} contact{selectedIds.length > 1 ? "s" : ""}
              </Text>
              <Text style={styles.participantText}>
                {selectedIds.length + 1}/{MAX_PRIVATE_PARTICIPANTS} participants
              </Text>
            </View>

            <View style={styles.memberList}>
              {filteredMembers.map((member) => {
                const selected = selectedIds.includes(member.id);
                return (
                  <Pressable
                    key={member.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${member.name}, ${member.company}`}
                    onPress={() => toggleMember(member.id)}
                    style={({ pressed }) => [
                      styles.memberRow,
                      selected && styles.memberRowSelected,
                      pressed && styles.pressed
                    ]}
                  >
                    <View style={styles.avatar}>
                      {member.avatarUrl ? (
                        <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.initials}>{member.initials}</Text>
                      )}
                    </View>
                    <View style={styles.memberContent}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberMeta} numberOfLines={1}>
                        {member.company} · {member.city}
                      </Text>
                    </View>
                    <View style={[styles.check, selected && styles.checkSelected]}>
                      {selected ? (
                        <Ionicons name="checkmark" size={18} color={colors.white} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {!canCreateOfficialGroup ? (
              <View style={[styles.infoCard, styles.warningCard]}>
                <Ionicons name="lock-closed" size={19} color={colors.warning} />
                <Text style={styles.infoText}>
                  Seuls les statuts de gouvernance autorisés peuvent créer un groupe officiel.
                </Text>
              </View>
            ) : null}

            <Text style={styles.label}>Identité du groupe</Text>
            <View style={styles.identityRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choisir l’image du groupe"
                onPress={() => void selectAvatar()}
                style={styles.groupAvatar}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name={iconName} size={28} color={colors.text} />
                )}
              </Pressable>
              <View style={styles.identityFields}>
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Nom du groupe"
                  placeholderTextColor={colors.textMuted}
                  maxLength={70}
                  style={styles.input}
                />
                <Text style={styles.helperText}>Touchez l’avatar pour choisir une image.</Text>
              </View>
            </View>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description du groupe"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={240}
              textAlignVertical="top"
              style={[styles.input, styles.multiline]}
            />

            <Text style={styles.label}>Icône de remplacement</Text>
            <View style={styles.iconGrid}>
              {GROUP_ICONS.map((icon) => {
                const selected = iconName === icon;
                return (
                  <Pressable
                    key={icon}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setIconName(icon)}
                    style={[styles.iconChoice, selected && styles.iconChoiceSelected]}
                  >
                    <Ionicons
                      name={icon}
                      size={22}
                      color={selected ? colors.orange : colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Visibilité par statut</Text>
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
                  Sinon, seuls les administrateurs autorisés pourront envoyer des messages.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Autoriser les membres à publier"
                style={styles.switchControl}
                value={membersCanPost}
                onValueChange={setMembersCanPost}
                trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 58,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center"
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.text,
    flex: 1,
    minWidth: 0,
    textAlign: "center"
  },
  createAction: {
    minWidth: 64,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  createActionText: { color: colors.orange, fontSize: 12, fontWeight: "900" },
  tabs: {
    height: 52,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    overflow: "hidden"
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  tabText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  tabTextActive: { color: colors.text },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm
  },
  infoCard: {
    minHeight: 60,
    marginBottom: spacing.sm,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  warningCard: { borderColor: "rgba(244,177,131,0.38)" },
  infoText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  input: {
    minHeight: 48,
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
  multiline: { minHeight: 96 },
  selectionRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  selectionText: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  participantText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  memberList: { gap: 7 },
  memberRow: {
    minHeight: 68,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  memberRowSelected: {
    borderColor: colors.violet,
    backgroundColor: "rgba(107,79,234,0.13)"
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.992 }] },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: { width: "100%", height: "100%" },
  initials: { color: colors.text, fontSize: 11, fontWeight: "900" },
  memberContent: { flex: 1, minWidth: 0 },
  memberName: { color: colors.text, fontSize: 13, fontWeight: "900" },
  memberMeta: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  checkSelected: { borderColor: colors.violet, backgroundColor: colors.violet },
  label: {
    ...typography.heading3,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: 8
  },
  identityRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  groupAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  identityFields: { flex: 1, minWidth: 0 },
  helperText: { color: colors.textMuted, fontSize: 9, marginTop: -5, marginBottom: 10 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconChoice: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  iconChoiceSelected: {
    borderColor: colors.violet,
    backgroundColor: "rgba(107,79,234,0.2)"
  },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  roleChip: {
    minHeight: 44,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  roleChipSelected: {
    borderColor: colors.violet,
    backgroundColor: "rgba(107,79,234,0.2)"
  },
  roleText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  roleTextSelected: { color: colors.text },
  switchRow: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  switchContent: { flex: 1, minWidth: 0 },
  switchTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  switchSubtitle: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  switchControl: { width: 48, height: 44 }
});
