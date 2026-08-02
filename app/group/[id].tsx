import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import { MemberAvatarStack } from "@/components/MemberAvatarStack";
import { env } from "@/config/env";
import {
  GROUP_VISIBILITY_ROLES,
  isVisionnaireRole,
  ROLE_LABELS
} from "@/domain/roles";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import { uploadGroupAvatar } from "@/services/api/uploadApi";
import { pickGroupAvatar } from "@/services/media/mediaPicker";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import type { CanonicalUserRole } from "@/types/messaging";

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

export default function GroupSettingsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "");
  const { currentUser, accessToken } = useSession();
  const { getConversation: getServerConversation, refreshConversations } =
    useMessaging();
  const {
    members,
    getConversation: getLocalConversation,
    decorateConversation,
    toggleConversationMuted,
    leaveConversation,
    updateGroup
  } = useExperience();
  const { getCreatedGroup, updateCreatedGroup, removeCreatedGroup } =
    useGroupAdmin();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)),
    [accessToken]
  );

  const rawConversation =
    getServerConversation(id) ?? getLocalConversation(id) ?? getCreatedGroup(id);
  const conversation = rawConversation
    ? decorateConversation(rawConversation)
    : undefined;
  const canManage = isVisionnaireRole(currentUser.role);

  const [name, setName] = useState(conversation?.name ?? "");
  const [description, setDescription] = useState(conversation?.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(conversation?.avatarUrl ?? "");
  const [iconName, setIconName] = useState<keyof typeof Ionicons.glyphMap>(
    (conversation?.iconName as keyof typeof Ionicons.glyphMap) ?? "people"
  );
  const [membersCanPost, setMembersCanPost] = useState(
    conversation?.canPost ?? true
  );
  const [allowedRoles, setAllowedRoles] = useState<CanonicalUserRole[]>(
    (conversation?.allowedRoles?.map((role) =>
      role === "visionary"
        ? "visionnaire"
        : role === "admiral"
          ? "amiral"
          : role === "captain"
            ? "capitaine"
            : role === "member"
              ? "triton"
              : (role as CanonicalUserRole)
    ) ?? GROUP_VISIBILITY_ROLES) as CanonicalUserRole[]
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!conversation) return;
    setName(conversation.name);
    setDescription(conversation.description ?? "");
    setAvatarUrl(conversation.avatarUrl ?? "");
    setIconName(
      (conversation.iconName as keyof typeof Ionicons.glyphMap) ?? "people"
    );
    setMembersCanPost(conversation.canPost ?? true);
  }, [conversation?.id]);

  const groupMembers = useMemo(() => {
    if (!conversation) return [];
    if (conversation.memberIds?.length) {
      return conversation.memberIds
        .map((memberId) => members.find((member) => member.id === memberId))
        .filter((member): member is (typeof members)[number] => Boolean(member));
    }
    return members.slice(0, conversation.memberCount || members.length);
  }, [conversation, members]);
  const exactMemberCount = conversation?.memberIds?.length ?? conversation?.memberCount ?? 0;
  const activeMemberIds = conversation?.activeMemberIds?.length
    ? conversation.activeMemberIds
    : conversation?.memberIds ?? [];

  const hasChanges = Boolean(
    conversation &&
      (name.trim() !== conversation.name ||
        description.trim() !== (conversation.description ?? "") ||
        avatarUrl !== (conversation.avatarUrl ?? "") ||
        iconName !== ((conversation.iconName as keyof typeof Ionicons.glyphMap) ?? "people") ||
        membersCanPost !== (conversation.canPost ?? true) ||
        JSON.stringify([...allowedRoles].sort()) !==
          JSON.stringify([...(conversation.allowedRoles ?? GROUP_VISIBILITY_ROLES)].sort()))
  );

  if (!conversation) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.missing}>
        <Text style={styles.title}>Groupe introuvable</Text>
        <Text style={styles.mutedText}>
          Le groupe est supprimé, masqué ou votre statut ne permet plus d’y accéder.
        </Text>
        <Pressable
          onPress={() => router.replace("/(tabs)/messages")}
          style={styles.primaryAction}
        >
          <Text style={styles.primaryActionText}>Retour aux messages</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const toggleRole = (role: CanonicalUserRole) => {
    if (!canManage) return;
    setAllowedRoles((previous) =>
      previous.includes(role)
        ? previous.filter((item) => item !== role)
        : [...previous, role]
    );
    setSavedAt(null);
  };

  const selectAvatar = async () => {
    if (!canManage) return;
    try {
      const selected = await pickGroupAvatar();
      if (selected) {
        setAvatarUrl(selected);
        setSavedAt(null);
      }
    } catch (error) {
      Alert.alert(
        "Image indisponible",
        error instanceof Error
          ? error.message
          : "L’image n’a pas pu être sélectionnée."
      );
    }
  };

  const save = async () => {
    if (!canManage || saving) return;
    if (!name.trim()) {
      Alert.alert("Nom requis", "Le groupe doit conserver un nom.");
      return;
    }
    if (allowedRoles.length === 0) {
      Alert.alert("Visibilité requise", "Sélectionnez au moins un statut.");
      return;
    }
    setSaving(true);
    setSavedAt(null);
    try {
      let readyAvatar = avatarUrl.trim() || undefined;
      if (api && readyAvatar?.startsWith("file:")) {
        readyAvatar = await uploadGroupAvatar(readyAvatar, accessToken);
      }
      const draft = {
        name: name.trim(),
        description: description.trim(),
        avatarUrl: readyAvatar,
        iconName,
        allowedRoles,
        canMembersPost: membersCanPost
      };
      if (api && !id.startsWith("local-")) {
        await api.updateGroup(id, draft);
        await refreshConversations();
      } else if (getCreatedGroup(id)) {
        updateCreatedGroup(id, draft);
      } else {
        updateGroup(id, draft);
      }
      setAvatarUrl(readyAvatar ?? "");
      const timestamp = new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
      });
      setSavedAt(timestamp);
      Alert.alert("Paramètres enregistrés", "Les règles du groupe sont actives.");
    } catch (error) {
      Alert.alert(
        "Enregistrement impossible",
        error instanceof Error ? error.message : "Les paramètres n’ont pas été enregistrés."
      );
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    Alert.alert(
      "Quitter le groupe ?",
      "Le groupe disparaîtra de vos discussions.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                if (api && !id.startsWith("local-")) {
                  await api.leaveGroup(id);
                  await refreshConversations();
                } else if (getCreatedGroup(id)) {
                  removeCreatedGroup(id);
                } else {
                  leaveConversation(id);
                }
                router.replace("/(tabs)/messages");
              } catch (error) {
                Alert.alert(
                  "Départ impossible",
                  error instanceof Error ? error.message : "Réessayez ultérieurement."
                );
              }
            })();
          }
        }
      ]
    );
  };

  const reportGroup = () => {
    Alert.alert("Signaler ce groupe", "Le signalement sera envoyé à Neptune.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Signaler",
        style: "destructive",
        onPress: () => {
          if (!api) {
            Alert.alert("Signalement enregistré", "Mode démonstration.");
            return;
          }
          void api
            .reportContent("group", id, "Groupe signalé depuis Connexio")
            .then(() => Alert.alert("Signalement transmis"))
            .catch((error: unknown) =>
              Alert.alert(
                "Signalement impossible",
                error instanceof Error ? error.message : "Réessayez ultérieurement."
              )
            );
        }
      }
    ]);
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
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Informations du groupe
        </Text>
        {canManage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enregistrer les paramètres"
            accessibilityState={{ busy: saving, disabled: saving || !hasChanges }}
            disabled={saving || !hasChanges}
            onPress={() => void save()}
            style={[styles.saveButton, !hasChanges && styles.saveDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.orange} />
            ) : savedAt && !hasChanges ? (
              <Ionicons name="checkmark-circle" size={23} color={colors.success} />
            ) : (
              <Text style={styles.saveText}>Enregistrer</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Signaler le groupe"
            onPress={reportGroup}
            style={styles.headerButton}
          >
            <Ionicons name="flag-outline" size={21} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingLeft: spacing.md + insets.left,
            paddingRight: spacing.md + insets.right,
            paddingBottom: Math.max(insets.bottom, spacing.xl)
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {savedAt ? (
          <View style={styles.savedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.savedText}>Enregistré à {savedAt}</Text>
          </View>
        ) : null}

        <View style={styles.identityCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={canManage ? "Modifier et recadrer l’image du groupe" : "Image du groupe"}
            disabled={!canManage}
            onPress={() => void selectAvatar()}
          >
            <LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>
              <View style={styles.avatarInner}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name={iconName} size={34} color={colors.text} />
                )}
                {canManage ? (
                  <View style={styles.cropBadge}>
                    <Ionicons name="crop-outline" size={14} color={colors.white} />
                  </View>
                ) : null}
              </View>
            </LinearGradient>
          </Pressable>
          <Text style={styles.groupName}>{conversation.name}</Text>
          <MemberAvatarStack
            memberIds={activeMemberIds}
            members={members}
            memberCount={exactMemberCount}
            maxVisible={5}
            size={28}
          />
          <Text style={styles.groupMeta}>
            {exactMemberCount} membre{exactMemberCount > 1 ? "s" : ""} · {conversation.categoryLabel}
          </Text>
          {conversation.description ? (
            <Text style={styles.description}>{conversation.description}</Text>
          ) : null}
        </View>

        <View style={styles.quickActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => toggleConversationMuted(id)}
            style={styles.quickAction}
          >
            <Ionicons
              name={conversation.muted ? "notifications" : "notifications-off"}
              size={21}
              color={colors.text}
            />
            <Text style={styles.quickLabel}>
              {conversation.muted ? "Réactiver" : "Sourdine"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(`/chat/${encodeURIComponent(id)}`)}
            style={styles.quickAction}
          >
            <Ionicons name="chatbubble-outline" size={21} color={colors.text} />
            <Text style={styles.quickLabel}>Messages</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={leave} style={styles.quickAction}>
            <Ionicons name="exit-outline" size={21} color={colors.danger} />
            <Text style={[styles.quickLabel, styles.dangerText]}>Quitter</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Membres</Text>
        <View style={styles.panel}>
          {groupMembers.map((member, index) => (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir le profil de ${member.name}`}
              onPress={() => router.push(`/profile/${encodeURIComponent(member.id)}`)}
              style={[
                styles.memberRow,
                index < groupMembers.length - 1 && styles.memberDivider
              ]}
            >
              <View style={styles.memberAvatar}>
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.memberInitials}>{member.initials}</Text>
                )}
              </View>
              <View style={styles.memberContent}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole} numberOfLines={1}>
                  {member.company} · {member.roleLabel}
                </Text>
              </View>
              {conversation.adminIds?.includes(member.id) ? (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminText}>Admin</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
          {groupMembers.length === 0 ? (
            <Text style={styles.emptyMembers}>Aucun membre visible.</Text>
          ) : null}
        </View>

        {canManage ? (
          <>
            <View style={styles.visionnaireNote}>
              <Ionicons name="diamond" size={18} color={colors.orange} />
              <Text style={styles.visionnaireText}>
                Administration réservée aux Visionnaires et vérifiée par le serveur.
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Administration</Text>
            <View style={styles.panelForm}>
              <Text style={styles.fieldLabel}>Nom</Text>
              <TextInput
                value={name}
                onChangeText={(value) => { setName(value); setSavedAt(null); }}
                style={styles.input}
                placeholderTextColor={colors.textMuted}
                maxLength={70}
              />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={description}
                onChangeText={(value) => { setDescription(value); setSavedAt(null); }}
                style={[styles.input, styles.multiline]}
                placeholder="Description du groupe"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={240}
              />

              <Text style={styles.fieldLabel}>Icône de remplacement</Text>
              <View style={styles.iconGrid}>
                {GROUP_ICONS.map((icon) => {
                  const selected = iconName === icon;
                  return (
                    <Pressable
                      key={icon}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => { setIconName(icon); setSavedAt(null); }}
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

              <Text style={styles.fieldLabel}>Statuts autorisés</Text>
              <View style={styles.roles}>
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
                    Sinon, l’écriture est réservée aux Visionnaires autorisés.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Autoriser les membres à publier"
                  style={styles.switchControl}
                  value={membersCanPost}
                  onValueChange={(value) => { setMembersCanPost(value); setSavedAt(null); }}
                  trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 58, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: colors.text, flex: 1, textAlign: "center" },
  saveButton: { minWidth: 88, minHeight: 44, alignItems: "center", justifyContent: "center" },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: colors.orange, fontSize: 12, fontWeight: "900" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center" },
  savedBanner: { minHeight: 42, marginBottom: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.successSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  savedText: { color: colors.success, fontSize: 10, fontWeight: "900" },
  identityCard: { padding: spacing.lg, alignItems: "center", gap: 6 },
  avatarShell: { width: 84, height: 84, borderRadius: 29, padding: 3 },
  avatarInner: { flex: 1, borderRadius: 26, overflow: "hidden", position: "relative", backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface },
  cropBadge: { position: "absolute", right: 4, bottom: 4, width: 28, height: 28, borderRadius: 10, backgroundColor: "rgba(2,7,19,0.80)", alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  groupName: { ...typography.heading2, color: colors.text, textAlign: "center", marginTop: 6 },
  groupMeta: { ...typography.caption, color: colors.textMuted },
  description: { ...typography.bodySmall, color: colors.textSecondary, textAlign: "center", marginTop: 5, maxWidth: 440 },
  quickActions: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  quickAction: { flex: 1, minHeight: 66, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 5 },
  quickLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  dangerText: { color: colors.danger },
  sectionTitle: { ...typography.heading3, color: colors.text, marginTop: spacing.sm, marginBottom: 8 },
  panel: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, overflow: "hidden", marginBottom: spacing.lg },
  memberRow: { minHeight: 68, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  memberDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  memberAvatar: { width: 42, height: 42, borderRadius: 14, overflow: "hidden", backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  memberInitials: { color: colors.text, fontSize: 10, fontWeight: "900" },
  memberContent: { flex: 1, minWidth: 0 },
  memberName: { color: colors.text, fontSize: 12, fontWeight: "900" },
  memberRole: { color: colors.textMuted, fontSize: 9.5, marginTop: 3 },
  adminBadge: { minHeight: 23, paddingHorizontal: 7, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  adminText: { color: colors.orange, fontSize: 8.5, fontWeight: "900" },
  emptyMembers: { color: colors.textMuted, textAlign: "center", padding: spacing.lg },
  visionnaireNote: { minHeight: 52, padding: 11, borderRadius: 17, backgroundColor: "rgba(244,177,131,0.10)", flexDirection: "row", alignItems: "center", gap: 8 },
  visionnaireText: { flex: 1, color: colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: "800" },
  panelForm: { padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, marginBottom: spacing.lg },
  fieldLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: "900", marginTop: 10, marginBottom: 6 },
  input: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, color: colors.text, ...typography.bodySmall },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconChoice: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  iconChoiceSelected: { borderColor: colors.violet, backgroundColor: "rgba(107,79,234,0.2)" },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  roleChip: { minHeight: 44, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  roleChipSelected: { borderColor: colors.violet, backgroundColor: "rgba(107,79,234,0.22)" },
  roleText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  roleTextSelected: { color: colors.text },
  switchRow: { minHeight: 72, marginTop: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  switchContent: { flex: 1, minWidth: 0 },
  switchTitle: { color: colors.text, fontSize: 12, fontWeight: "900" },
  switchSubtitle: { color: colors.textMuted, fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  switchControl: { width: 48, height: 44 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  title: { ...typography.heading2, color: colors.text, textAlign: "center" },
  mutedText: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 430 },
  primaryAction: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryActionText: { color: colors.white, fontWeight: "900" }
});
