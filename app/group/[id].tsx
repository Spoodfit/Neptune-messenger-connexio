import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
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

import {
  GROUP_VISIBILITY_ROLES,
  isGovernanceRole,
  ROLE_LABELS
} from "@/domain/roles";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import type { CanonicalUserRole, Conversation } from "@/types/messaging";

export default function GroupSettingsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "");
  const { currentUser } = useSession();
  const { getConversation: getServerConversation } = useMessaging();
  const {
    members,
    getConversation: getLocalConversation,
    decorateConversation,
    toggleConversationMuted,
    leaveConversation,
    updateGroup
  } = useExperience();
  const {
    getCreatedGroup,
    updateCreatedGroup,
    removeCreatedGroup
  } = useGroupAdmin();

  const rawConversation =
    getServerConversation(id) ?? getLocalConversation(id) ?? getCreatedGroup(id);
  const conversation = rawConversation
    ? decorateConversation(rawConversation)
    : undefined;
  const canManage = Boolean(
    conversation?.canManage ||
      conversation?.adminIds?.includes(currentUser.id) ||
      isGovernanceRole(currentUser.role)
  );

  const [name, setName] = useState(conversation?.name ?? "");
  const [description, setDescription] = useState(conversation?.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(conversation?.avatarUrl ?? "");
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

  useEffect(() => {
    if (!conversation) return;
    setName(conversation.name);
    setDescription(conversation.description ?? "");
    setAvatarUrl(conversation.avatarUrl ?? "");
    setMembersCanPost(conversation.canPost ?? true);
  }, [conversation?.id]);

  const groupMembers = useMemo(() => {
    if (!conversation) return [];
    if (conversation.memberIds?.length) {
      return conversation.memberIds
        .map((memberId) => members.find((member) => member.id === memberId))
        .filter((member): member is (typeof members)[number] => Boolean(member));
    }
    return members.slice(0, Math.min(members.length, 5));
  }, [conversation, members]);

  if (!conversation) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.missing}>
        <Text style={styles.title}>Groupe introuvable</Text>
        <Text style={styles.mutedText}>
          Le groupe est masqué, supprimé ou votre statut ne permet plus d’y accéder.
        </Text>
        <Pressable onPress={() => router.replace("/(tabs)/messages")} style={styles.primaryAction}>
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
  };

  const save = () => {
    if (!canManage) return;
    if (!name.trim()) {
      Alert.alert("Nom requis", "Le groupe doit conserver un nom.");
      return;
    }
    if (allowedRoles.length === 0) {
      Alert.alert("Visibilité requise", "Sélectionnez au moins un statut.");
      return;
    }
    const draft = {
      name,
      description,
      avatarUrl: avatarUrl.trim() || undefined,
      iconName: conversation.iconName ?? "people",
      allowedRoles,
      canMembersPost: membersCanPost
    };
    if (getCreatedGroup(id)) updateCreatedGroup(id, draft);
    else updateGroup(id, draft);
    Alert.alert("Paramètres enregistrés", "Le front est à jour. Le backend devra appliquer ces règles sur chaque endpoint et événement temps réel.");
  };

  const leave = () => {
    Alert.alert(
      "Quitter le groupe ?",
      "Le groupe disparaîtra de vos discussions. Les administrateurs pourront définir les règles de réintégration.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: () => {
            if (getCreatedGroup(id)) removeCreatedGroup(id);
            else leaveConversation(id);
            router.replace("/(tabs)/messages");
          }
        }
      ]
    );
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
            onPress={save}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>Enregistrer</Text>
          </Pressable>
        ) : (
          <View style={styles.saveButton} />
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
        <View style={styles.identityCard}>
          <LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>
            <View style={styles.avatarInner}>
              {conversation.avatarUrl ? (
                <Image source={{ uri: conversation.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="people" size={34} color={colors.text} />
              )}
            </View>
          </LinearGradient>
          <Text style={styles.groupName}>{conversation.name}</Text>
          <Text style={styles.groupMeta}>
            {conversation.memberCount} membre{conversation.memberCount > 1 ? "s" : ""} · {conversation.categoryLabel}
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
          <Pressable
            accessibilityRole="button"
            onPress={leave}
            style={styles.quickAction}
          >
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
          <Pressable style={styles.allMembersButton}>
            <Text style={styles.allMembersText}>Voir tous les membres</Text>
          </Pressable>
        </View>

        {canManage ? (
          <>
            <Text style={styles.sectionTitle}>Administration</Text>
            <View style={styles.panelForm}>
              <Text style={styles.fieldLabel}>Nom</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor={colors.textMuted}
                maxLength={70}
              />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={[styles.input, styles.multiline]}
                placeholder="Description du groupe"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={240}
              />
              <Text style={styles.fieldLabel}>URL de l’image de groupe</Text>
              <TextInput
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                style={styles.input}
                placeholder="https://…"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />

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
                    Le serveur devra également bloquer les écritures non autorisées.
                  </Text>
                </View>
                <Switch
                  value={membersCanPost}
                  onValueChange={setMembersCanPost}
                  trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
          <Text style={styles.securityText}>
            Les règles de visibilité, d’écriture, de création et de modification doivent être contrôlées par le backend sur la liste, le détail, les messages, les notifications et le temps réel.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 58, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: colors.text, flex: 1, textAlign: "center" },
  saveButton: { minWidth: 78, minHeight: 44, alignItems: "center", justifyContent: "center" },
  saveText: { color: colors.orange, fontSize: 12, fontWeight: "900" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center" },
  identityCard: { padding: spacing.lg, alignItems: "center" },
  avatarShell: { width: 84, height: 84, borderRadius: 29, padding: 3 },
  avatarInner: { flex: 1, borderRadius: 26, overflow: "hidden", backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface },
  avatarImage: { width: "100%", height: "100%" },
  groupName: { ...typography.heading2, color: colors.text, textAlign: "center", marginTop: 12 },
  groupMeta: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  description: { ...typography.bodySmall, color: colors.textSecondary, textAlign: "center", marginTop: 10, maxWidth: 440 },
  quickActions: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  quickAction: { flex: 1, minHeight: 66, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 5 },
  quickLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  dangerText: { color: colors.danger },
  sectionTitle: { ...typography.heading3, color: colors.text, marginTop: spacing.sm, marginBottom: 8 },
  panel: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, overflow: "hidden", marginBottom: spacing.lg },
  memberRow: { minHeight: 68, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  memberDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  memberAvatar: { width: 42, height: 42, borderRadius: 14, overflow: "hidden", backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  memberInitials: { color: colors.text, fontSize: 11, fontWeight: "900" },
  memberContent: { flex: 1, minWidth: 0 },
  memberName: { color: colors.text, fontSize: 13, fontWeight: "900" },
  memberRole: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  adminBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9, backgroundColor: "rgba(107,79,234,0.22)" },
  adminText: { color: colors.textSecondary, fontSize: 9, fontWeight: "800" },
  allMembersButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: colors.borderSoft },
  allMembersText: { color: colors.orange, fontSize: 12, fontWeight: "900" },
  panelForm: { padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, gap: 8, marginBottom: spacing.lg },
  fieldLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "800", marginTop: 5 },
  input: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, color: colors.text, ...typography.bodySmall },
  multiline: { minHeight: 86, textAlignVertical: "top" },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  roleChip: { minHeight: 38, paddingHorizontal: 11, borderRadius: 19, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  roleChipSelected: { borderColor: colors.violet, backgroundColor: "rgba(107,79,234,0.22)" },
  roleText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  roleTextSelected: { color: colors.text },
  switchRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md },
  switchContent: { flex: 1, minWidth: 0 },
  switchTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  switchSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  securityNote: { padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.successSoft, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  securityText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  title: { ...typography.heading2, color: colors.text, textAlign: "center" },
  mutedText: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 430 },
  primaryAction: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryActionText: { color: colors.white, fontWeight: "900" }
});
