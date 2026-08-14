import { Ionicons } from "@expo/vector-icons";
import { ThemeModeButton } from "../components/ThemeModeButton";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppAlert } from "@/services/ui/AppAlert";

import { env } from "../config/env";
import {
  canInitiatePrivateInteraction,
  TRITON_CHECKOUT_URL
} from "../domain/accessPolicy";
import {
  GROUP_VISIBILITY_ROLES,
  isVisionnaireRole,
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
import { type ConnexioTheme, useAppTheme } from "../providers/ThemeProvider";
import { NeptuneExperienceApi } from "../services/api/experienceApi";
import { uploadGroupAvatar } from "../services/api/uploadApi";
import { pickGroupAvatar } from "../services/media/mediaPicker";
import { colors, gradients, radii, spacing, typography } from "../theme";
import type {
  CanonicalUserRole,
  Conversation
} from "../types/messaging";
import { StatusAvatar } from "../components/StatusAvatar";

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

function sameParticipants(
  conversation: Conversation,
  participantIds: string[]
): boolean {
  if (
    conversation.type !== "direct" &&
    conversation.type !== "small_group"
  ) {
    return false;
  }
  const existing = [...(conversation.memberIds ?? [])].sort();
  const requested = [...participantIds].sort();
  return (
    existing.length === requested.length &&
    existing.every((id, index) => id === requested[index])
  );
}

export default function NewConversationScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const { currentUser, accessToken } = useSession();
  const {
    members,
    localConversations,
    createPrivateConversation
  } = useExperience();
  const { createGroup } = useGroupAdmin();
  const { visibleConversations, refreshConversations } = useMessaging();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)),
    [accessToken]
  );
  const canCreateOfficialGroup = isVisionnaireRole(currentUser.role);
  const canInitiatePrivate = canInitiatePrivateInteraction(currentUser.role);

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

  const existingPrivateConversation = useMemo(() => {
    if (selectedIds.length === 0) return undefined;
    const participantIds = [currentUser.id, ...selectedIds];
    return [...visibleConversations, ...localConversations].find((conversation) =>
      sameParticipants(conversation, participantIds)
    );
  }, [
    currentUser.id,
    localConversations,
    selectedIds,
    visibleConversations
  ]);

  const toggleMember = (memberId: string) => {
    if (!canInitiatePrivate) {
      void Linking.openURL(TRITON_CHECKOUT_URL);
      return;
    }
    setSelectedIds((previous) => {
      if (previous.includes(memberId)) {
        return previous.filter((id) => id !== memberId);
      }
      if (previous.length >= MAX_PRIVATE_CONTACTS) {
        AppAlert.alert(
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
      AppAlert.alert(
        "Image indisponible",
        error instanceof Error
          ? error.message
          : "L’image du groupe n’a pas pu être sélectionnée."
      );
    }
  };

  const openExistingConversation = (conversation: Conversation) => {
    router.replace(`/chat/${encodeURIComponent(conversation.id)}`);
  };

  const submit = async () => {
    if (creating) return;
    if (mode === "private") {
      if (!canInitiatePrivate) {
        AppAlert.alert(
          "Passez Triton",
          "Un compte Free peut recevoir une invitation privée, mais doit passer Triton pour démarrer une conversation.",
          [
            { text: "Plus tard", style: "cancel" },
            {
              text: "Passer Triton",
              onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL)
            }
          ]
        );
        return;
      }
      if (selectedIds.length === 0) {
        AppAlert.alert("Contact requis", "Sélectionnez au moins un membre.");
        return;
      }
      if (existingPrivateConversation) {
        AppAlert.alert(
          "Conversation déjà ouverte",
          "Une conversation existe déjà avec exactement ces participants.",
          [
            { text: "Annuler", style: "cancel" },
            {
              text: "Ouvrir",
              onPress: () => openExistingConversation(existingPrivateConversation)
            }
          ]
        );
        return;
      }
    }

    if (mode === "group") {
      if (!canCreateOfficialGroup) {
        AppAlert.alert(
          "Réservé aux Visionnaires",
          "Seuls les Visionnaires peuvent créer ou administrer un groupe officiel."
        );
        return;
      }
      if (!groupName.trim()) {
        AppAlert.alert("Nom requis", "Indiquez le nom du groupe.");
        return;
      }
      if (allowedRoles.length === 0) {
        AppAlert.alert("Visibilité requise", "Sélectionnez au moins un statut.");
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
      AppAlert.alert(
        "Création impossible",
        error instanceof Error ? error.message : "La création a échoué."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
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
          <Ionicons name="close" size={25} color={theme.pageText} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>
          Nouvelle conversation
        </Text>
        <ThemeModeButton />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Créer"
          accessibilityState={{ busy: creating, disabled: creating }}
          disabled={creating}
          onPress={() => void submit()}
          style={styles.createAction}
        >
          {creating ? (
            <ActivityIndicator size="small" color={theme.orange} />
          ) : (
            <Text style={styles.createActionText}>Créer</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "private" }}
          onPress={() => setMode("private")}
          style={styles.tab}
        >
          {mode === "private" ? (
            <LinearGradient colors={theme.isLight ? [theme.accentSoft, theme.violetSoft] : gradients.activeTab} style={StyleSheet.absoluteFill} />
          ) : null}
          <Ionicons
            name="chatbubbles"
            size={17}
            color={mode === "private" ? theme.pageText : theme.pageTextMuted}
          />
          <Text style={[styles.tabText, mode === "private" && styles.tabTextActive]}>
            Privée
          </Text>
        </Pressable>
        {canCreateOfficialGroup ? (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "group" }}
            onPress={() => setMode("group")}
            style={styles.tab}
          >
            {mode === "group" ? (
              <LinearGradient colors={theme.isLight ? [theme.accentSoft, theme.violetSoft] : gradients.activeTab} style={StyleSheet.absoluteFill} />
            ) : null}
            <Ionicons
              name="people"
              size={17}
              color={mode === "group" ? theme.pageText : theme.pageTextMuted}
            />
            <Text style={[styles.tabText, mode === "group" && styles.tabTextActive]}>
              Groupe officiel
            </Text>
          </Pressable>
        ) : null}
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
              <Ionicons name="shield-checkmark" size={19} color={theme.success} />
              <Text style={styles.infoText}>
                Discussion individuelle ou mini-groupe de {MAX_PRIVATE_PARTICIPANTS} participants au total, vous compris.
              </Text>
            </View>

            {selectedIds.length > 1 ? (
              <TextInput
                value={privateName}
                onChangeText={setPrivateName}
                placeholder="Nom du mini-groupe (facultatif)"
                placeholderTextColor={theme.pageTextMuted}
                maxLength={70}
                style={styles.input}
              />
            ) : null}

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher par nom, entreprise ou ville"
              placeholderTextColor={theme.pageTextMuted}
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

            {existingPrivateConversation ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ouvrir la conversation déjà existante"
                onPress={() => openExistingConversation(existingPrivateConversation)}
                style={styles.existingBanner}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color={theme.orange} />
                <View style={styles.existingContent}>
                  <Text style={styles.existingTitle}>Conversation déjà ouverte</Text>
                  <Text style={styles.existingText} numberOfLines={1}>
                    {existingPrivateConversation.name}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={theme.orange} />
              </Pressable>
            ) : null}

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
                    <StatusAvatar user={member} size={44} accessible={false} />
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
            <View style={[styles.infoCard, styles.visionnaireCard]}>
              <Ionicons name="diamond" size={19} color={theme.orange} />
              <Text style={styles.infoText}>
                Administration officielle réservée aux Visionnaires. Les droits sont également contrôlés par le backend.
              </Text>
            </View>

            <Text style={styles.label}>Identité du groupe</Text>
            <View style={styles.identityRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choisir et recadrer l’image du groupe"
                onPress={() => void selectAvatar()}
                style={styles.groupAvatar}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name={iconName} size={28} color={theme.pageText} />
                )}
                <View style={styles.cropBadge}>
                  <Ionicons name="crop-outline" size={14} color={colors.white} />
                </View>
              </Pressable>
              <View style={styles.identityFields}>
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Nom du groupe"
                  placeholderTextColor={theme.pageTextMuted}
                  maxLength={70}
                  style={styles.input}
                />
                <Text style={styles.helperText}>
                  Touchez l’image pour zoomer et la recadrer au format carré.
                </Text>
              </View>
            </View>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description du groupe"
              placeholderTextColor={theme.pageTextMuted}
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
                      color={selected ? theme.orange : theme.pageTextMuted}
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
                  Sinon, seuls les Visionnaires autorisés pourront envoyer des messages.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Autoriser les membres à publier"
                style={styles.switchControl}
                value={membersCanPost}
                onValueChange={setMembersCanPost}
                trackColor={{ false: theme.surfaceMuted, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const createStyles = (theme: ConnexioTheme) => StyleSheet.create({
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
    color: theme.pageText,
    flex: 1,
    minWidth: 0,
    textAlign: "center"
  },
  createAction: {
    minWidth: 62,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  createActionText: { color: theme.orange, fontSize: 14, fontWeight: "900" },
  tabs: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    minHeight: 52,
    padding: 4,
    marginBottom: 4,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    flexDirection: "row"
  },
  tab: {
    flex: 1,
    minHeight: 48,
    overflow: "hidden",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  tabText: { color: theme.pageTextMuted, fontSize: 11, fontWeight: "900" },
  tabTextActive: { color: theme.pageText },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    gap: 9
  },
  infoCard: {
    minHeight: 60,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: theme.successSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  visionnaireCard: { backgroundColor: "rgba(244,177,131,0.11)" },
  infoText: { ...typography.bodySmall, color: theme.pageTextSecondary, flex: 1 },
  input: {
    minHeight: 50,
    paddingHorizontal: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    color: theme.pageText,
    ...typography.bodySmall
  },
  multiline: { minHeight: 92, paddingVertical: 12 },
  selectionRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  selectionText: { color: theme.pageTextSecondary, fontSize: 11, fontWeight: "900" },
  participantText: { color: theme.pageTextMuted, fontSize: 11, fontWeight: "800" },
  existingBanner: {
    minHeight: 58,
    padding: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(244,177,131,0.40)",
    backgroundColor: "rgba(244,177,131,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  existingContent: { flex: 1, minWidth: 0 },
  existingTitle: { color: theme.orange, fontSize: 11, fontWeight: "900" },
  existingText: { color: theme.pageTextSecondary, fontSize: 11, marginTop: 2 },
  memberList: { gap: 8 },
  memberRow: {
    minHeight: 65,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  memberRowSelected: {
    borderColor: theme.violet,
    backgroundColor: "rgba(107,79,234,0.16)"
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.993 }] },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: theme.accentSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: { width: "100%", height: "100%" },
  initials: { color: theme.pageText, fontSize: 11, fontWeight: "900" },
  memberContent: { flex: 1, minWidth: 0 },
  memberName: { color: theme.pageText, fontSize: 14, fontWeight: "900" },
  memberMeta: { color: theme.pageTextMuted, fontSize: 11, marginTop: 3 },
  check: {
    width: 27,
    height: 27,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center"
  },
  checkSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { color: theme.pageTextSecondary, fontSize: 11, fontWeight: "900", marginTop: 7 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  groupAvatar: {
    width: 84,
    height: 84,
    borderRadius: 26,
    overflow: "hidden",
    position: "relative",
    backgroundColor: theme.accentSoft,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center"
  },
  cropBadge: {
    position: "absolute",
    right: 5,
    bottom: 5,
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: "rgba(2,7,19,0.82)",
    alignItems: "center",
    justifyContent: "center"
  },
  identityFields: { flex: 1, minWidth: 0, gap: 8 },
  helperText: { color: theme.pageTextMuted, fontSize: 11, lineHeight: 12 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconChoice: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  iconChoiceSelected: { borderColor: theme.orange, backgroundColor: "rgba(244,177,131,0.12)" },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: {
    minHeight: 42,
    paddingHorizontal: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  roleChipSelected: { borderColor: theme.violet, backgroundColor: "rgba(107,79,234,0.18)" },
  roleText: { color: theme.pageTextMuted, fontSize: 11, fontWeight: "800" },
  roleTextSelected: { color: theme.pageText },
  switchRow: {
    minHeight: 74,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  switchContent: { flex: 1, minWidth: 0 },
  switchTitle: { color: theme.pageText, fontSize: 14, fontWeight: "900" },
  switchSubtitle: { color: theme.pageTextMuted, fontSize: 11, lineHeight: 13, marginTop: 3 },
  switchControl: { width: 48, height: 48 }
});
