import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { AppAlert } from "@/services/ui/AppAlert";

import { MemberAvatarStack } from "@/components/MemberAvatarStack";
import { MemberStatusBadge } from "@/components/MemberStatusBadge";
import { StatusAvatar } from "@/components/StatusAvatar";
import { ThemeModeButton } from "@/components/ThemeModeButton";
import { type ConnexioTheme, useAppTheme } from "@/providers/ThemeProvider";
import { SwipeableMemberRow } from "@/components/SwipeableMemberRow";
import { env } from "@/config/env";
import {
  canBeGroupResponsible,
  canManageGroup,
  canScheduleMessages
} from "@/domain/accessPolicy";
import {
  GROUP_VISIBILITY_ROLES,
  isVisionnaireRole,
  normalizeUserRole,
  ROLE_LABELS
} from "@/domain/roles";
import { getRoleAppearance } from "@/domain/roleAppearance";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import { uploadGroupAvatar } from "@/services/api/uploadApi";
import { pickGroupAvatar } from "@/services/media/mediaPicker";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import type { AppUser, CanonicalUserRole } from "@/types/messaging";

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

function first(value?: string | string[]): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function GroupSettingsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const id = first(params.id);
  const { currentUser, accessToken } = useSession();
  const { getConversation: getServerConversation, refreshConversations } = useMessaging();
  const {
    members,
    getConversation: getLocalConversation,
    decorateConversation,
    toggleConversationMuted,
    leaveConversation,
    joinConversation,
    updateGroup
  } = useExperience();
  const { getCreatedGroup, updateCreatedGroup, removeCreatedGroup } = useGroupAdmin();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)),
    [accessToken]
  );

  const rawConversation =
    getServerConversation(id) ?? getLocalConversation(id) ?? getCreatedGroup(id);
  const conversation = rawConversation ? decorateConversation(rawConversation) : undefined;
  const canEditSettings = isVisionnaireRole(currentUser.role);
  const canManageMembers = canManageGroup(currentUser, conversation);
  const canUseAutomations = canScheduleMessages(currentUser, conversation);
  const isAnnouncement = conversation?.type === "announcement";

  const [name, setName] = useState(conversation?.name ?? "");
  const [description, setDescription] = useState(conversation?.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(conversation?.avatarUrl ?? "");
  const [iconName, setIconName] = useState<keyof typeof Ionicons.glyphMap>(
    (conversation?.iconName as keyof typeof Ionicons.glyphMap) ?? "people"
  );
  const [membersCanPost, setMembersCanPost] = useState(conversation?.canPost ?? true);
  const [allowedRoles, setAllowedRoles] = useState<CanonicalUserRole[]>([]);
  const [responsibleIds, setResponsibleIds] = useState<string[]>(conversation?.adminIds ?? []);
  const [publisherIds, setPublisherIds] = useState<string[]>(
    conversation?.announcementPublisherIds ?? []
  );
  const [allowFreeDiscovery, setAllowFreeDiscovery] = useState(
    conversation?.allowFreeDiscovery ?? false
  );
  const [removedMemberIds, setRemovedMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!conversation) return;
    setName(conversation.name);
    setDescription(conversation.description ?? "");
    setAvatarUrl(conversation.avatarUrl ?? "");
    setIconName((conversation.iconName as keyof typeof Ionicons.glyphMap) ?? "people");
    setMembersCanPost(conversation.canPost ?? true);
    setAllowedRoles(
      (conversation.allowedRoles ?? GROUP_VISIBILITY_ROLES).map((role) =>
        normalizeUserRole(role)
      )
    );
    setResponsibleIds(conversation.adminIds ?? []);
    setPublisherIds(conversation.announcementPublisherIds ?? []);
    setAllowFreeDiscovery(conversation.allowFreeDiscovery ?? false);
    setRemovedMemberIds([]);
  }, [conversation?.id]);

  const groupMembers = useMemo(() => {
    if (!conversation) return [];
    const source = conversation.memberIds?.length
      ? conversation.memberIds
          .map((memberId) => members.find((member) => member.id === memberId))
          .filter((member): member is AppUser => Boolean(member))
      : members.slice(0, conversation.memberCount || members.length);
    return source.filter((member) => !removedMemberIds.includes(member.id));
  }, [conversation, members, removedMemberIds]);

  const eligiblePublishers = groupMembers.filter((member) => {
    const role = normalizeUserRole(member.role);
    return role === "amiral" || role === "capitaine";
  });
  const exactMemberCount = groupMembers.length || conversation?.memberCount || 0;
  const activeMemberIds = (conversation?.activeMemberIds?.length ? conversation.activeMemberIds : conversation?.memberIds ?? []).filter(
    (memberId) => !removedMemberIds.includes(memberId)
  );

  const buildDraft = (overrides?: {
    nextResponsibleIds?: string[];
    nextPublisherIds?: string[];
  }) => ({
    name: name.trim(),
    description: description.trim(),
    avatarUrl: avatarUrl.trim() || undefined,
    iconName,
    allowedRoles,
    canMembersPost: isAnnouncement ? false : membersCanPost,
    adminIds: overrides?.nextResponsibleIds ?? responsibleIds,
    announcementPublisherIds: overrides?.nextPublisherIds ?? publisherIds,
    allowFreeDiscovery
  });

  const hasChanges = Boolean(
    conversation &&
      (name.trim() !== conversation.name ||
        description.trim() !== (conversation.description ?? "") ||
        avatarUrl !== (conversation.avatarUrl ?? "") ||
        iconName !== ((conversation.iconName as keyof typeof Ionicons.glyphMap) ?? "people") ||
        (!isAnnouncement && membersCanPost !== (conversation.canPost ?? true)) ||
        JSON.stringify([...allowedRoles].sort()) !==
          JSON.stringify(
            [...(conversation.allowedRoles ?? GROUP_VISIBILITY_ROLES)]
              .map((role) => normalizeUserRole(role))
              .sort()
          ) ||
        JSON.stringify([...responsibleIds].sort()) !==
          JSON.stringify([...(conversation.adminIds ?? [])].sort()) ||
        JSON.stringify([...publisherIds].sort()) !==
          JSON.stringify([...(conversation.announcementPublisherIds ?? [])].sort()) ||
        allowFreeDiscovery !== (conversation.allowFreeDiscovery ?? false))
  );

  if (!conversation) {
    return (
      <LinearGradient colors={theme.pageGradient} style={styles.center}>
        <Ionicons name="people-outline" size={42} color={theme.pageTextMuted} />
        <Text style={styles.title}>Groupe introuvable</Text>
        <Text style={styles.mutedText}>
          Le groupe est supprimé, masqué ou votre statut ne permet plus d’y accéder.
        </Text>
        <Pressable onPress={() => router.replace("/(tabs)/messages")} style={styles.primaryAction}>
          <Text style={styles.primaryActionText}>Retour aux messages</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const persistLocalDraft = (draft = buildDraft()) => {
    if (getCreatedGroup(id)) updateCreatedGroup(id, draft);
    else updateGroup(id, draft);
  };

  const toggleRole = (role: CanonicalUserRole) => {
    if (!canEditSettings) return;
    setAllowedRoles((previous) =>
      previous.includes(role)
        ? previous.filter((item) => item !== role)
        : [...previous, role]
    );
    setSavedAt(null);
  };

  const selectAvatar = async () => {
    if (!canEditSettings) return;
    try {
      const selected = await pickGroupAvatar();
      if (selected) {
        setAvatarUrl(selected);
        setSavedAt(null);
      }
    } catch (error) {
      AppAlert.alert(
        "Image indisponible",
        error instanceof Error ? error.message : "L’image n’a pas pu être sélectionnée."
      );
    }
  };

  const save = async () => {
    if (!canEditSettings || saving) return;
    if (!name.trim()) {
      AppAlert.alert("Nom requis", "Le groupe doit conserver un nom.");
      return;
    }
    if (allowedRoles.length === 0) {
      AppAlert.alert("Visibilité requise", "Sélectionnez au moins un statut.");
      return;
    }
    setSaving(true);
    setSavedAt(null);
    try {
      let readyAvatar = avatarUrl.trim() || undefined;
      if (api && readyAvatar?.startsWith("file:")) {
        readyAvatar = await uploadGroupAvatar(readyAvatar, accessToken);
      }
      const draft = { ...buildDraft(), avatarUrl: readyAvatar };
      if (api && !id.startsWith("local-")) {
        await api.updateGroup(id, draft);
        await refreshConversations();
      } else {
        persistLocalDraft(draft);
      }
      setAvatarUrl(readyAvatar ?? "");
      setSavedAt(
        new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      );
      AppAlert.alert("Paramètres enregistrés", "Les règles du groupe sont actives.");
    } catch (error) {
      AppAlert.alert(
        "Enregistrement impossible",
        error instanceof Error ? error.message : "Les paramètres n’ont pas été enregistrés."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleResponsible = async (member: AppUser) => {
    if (!canManageMembers || busyMemberId) return;
    if (!canBeGroupResponsible(member.role)) {
      AppAlert.alert(
        "Statut non éligible",
        "Un responsable de groupe doit être Amiral ou Capitaine."
      );
      return;
    }
    const active = responsibleIds.includes(member.id);
    const next = active
      ? responsibleIds.filter((memberId) => memberId !== member.id)
      : [...responsibleIds, member.id];
    setBusyMemberId(member.id);
    setResponsibleIds(next);
    try {
      if (api && !id.startsWith("local-")) {
        await api.setGroupResponsible(id, member.id, !active);
        await refreshConversations();
      } else {
        persistLocalDraft(buildDraft({ nextResponsibleIds: next }));
      }
    } catch (error) {
      setResponsibleIds(responsibleIds);
      AppAlert.alert(
        "Gestion impossible",
        error instanceof Error ? error.message : "Le responsable n’a pas été modifié."
      );
    } finally {
      setBusyMemberId(null);
    }
  };

  const removeMember = (member: AppUser) => {
    if (!canManageMembers || busyMemberId || member.id === currentUser.id) return;
    AppAlert.alert(
      `Retirer ${member.name} ?`,
      "Cette personne perdra immédiatement l’accès au groupe.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: () => {
            setBusyMemberId(member.id);
            setRemovedMemberIds((previous) => [...previous, member.id]);
            setResponsibleIds((previous) => previous.filter((idValue) => idValue !== member.id));
            setPublisherIds((previous) => previous.filter((idValue) => idValue !== member.id));
            void (async () => {
              try {
                if (api && !id.startsWith("local-")) {
                  await api.removeGroupMember(id, member.id);
                  await refreshConversations();
                }
              } catch (error) {
                setRemovedMemberIds((previous) => previous.filter((value) => value !== member.id));
                AppAlert.alert(
                  "Retrait impossible",
                  error instanceof Error ? error.message : "Le membre n’a pas été retiré."
                );
              } finally {
                setBusyMemberId(null);
              }
            })();
          }
        }
      ]
    );
  };

  const toggleAnnouncementPublisher = async (member: AppUser) => {
    if (!canEditSettings || !isAnnouncement || busyMemberId) return;
    const active = publisherIds.includes(member.id);
    const next = active
      ? publisherIds.filter((memberId) => memberId !== member.id)
      : [...publisherIds, member.id];
    setBusyMemberId(member.id);
    setPublisherIds(next);
    try {
      if (api && !id.startsWith("local-")) {
        await api.setAnnouncementPublisher(id, member.id, !active);
        await refreshConversations();
      } else {
        persistLocalDraft(buildDraft({ nextPublisherIds: next }));
      }
    } catch (error) {
      setPublisherIds(publisherIds);
      AppAlert.alert(
        "Autorisation impossible",
        error instanceof Error ? error.message : "L’autorisation n’a pas été modifiée."
      );
    } finally {
      setBusyMemberId(null);
    }
  };

  const leave = () => {
    AppAlert.alert("Quitter le groupe ?", "Vous pourrez le rejoindre à nouveau depuis vos groupes.", [
      { text: "Annuler", style: "cancel" },
      { text: "Quitter", style: "destructive", onPress: () => {
        if (getCreatedGroup(id)) removeCreatedGroup(id);
        else leaveConversation(id);
        router.replace("/(tabs)/messages");
      } }
    ]);
  };

  const rejoin = async () => {
    try {
      await joinConversation(id);
      await refreshConversations();
      router.replace(`/chat/${encodeURIComponent(id)}`);
    } catch (error) {
      AppAlert.alert("Impossible de rejoindre le groupe", error instanceof Error ? error.message : "Réessayez ultérieurement.");
    }
  };

  const reportGroup = () => {
    AppAlert.alert("Signaler ce groupe", "Le signalement sera envoyé à Neptune.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Signaler",
        style: "destructive",
        onPress: () => {
          if (!api) {
            AppAlert.alert("Signalement enregistré", "Mode démonstration.");
            return;
          }
          void api
            .reportContent("group", id, "Groupe signalé depuis Connexio")
            .then(() => AppAlert.alert("Signalement transmis"))
            .catch((error: unknown) =>
              AppAlert.alert(
                "Signalement impossible",
                error instanceof Error ? error.message : "Réessayez ultérieurement."
              )
            );
        }
      }
    ]);
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
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={theme.pageText} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>Informations du groupe</Text>
        <ThemeModeButton />
        {canEditSettings ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enregistrer les paramètres"
            accessibilityState={{ busy: saving, disabled: saving || !hasChanges }}
            disabled={saving || !hasChanges}
            onPress={() => void save()}
            style={[styles.saveButton, !hasChanges && styles.saveDisabled]}
          >
            {saving ? <ActivityIndicator size="small" color={theme.orange} /> : <Text style={styles.saveText}>Enregistrer</Text>}
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Signaler le groupe" onPress={reportGroup} style={styles.headerButton}>
            <Ionicons name="flag-outline" size={21} color={theme.pageTextMuted} />
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
            <Ionicons name="checkmark-circle" size={18} color={theme.success} />
            <Text style={styles.savedText}>Enregistré à {savedAt}</Text>
          </View>
        ) : null}

        <View style={styles.identityCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={canEditSettings ? "Modifier l’image du groupe" : "Image du groupe"}
            disabled={!canEditSettings}
            onPress={() => void selectAvatar()}
          >
            <LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>
              <View style={styles.avatarInner}>
                {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <Ionicons name={isAnnouncement ? "megaphone" : iconName} size={34} color={theme.pageText} />}
                {canEditSettings ? <View style={styles.cropBadge}><Ionicons name="crop-outline" size={14} color={colors.white} /></View> : null}
              </View>
            </LinearGradient>
          </Pressable>
          <Text style={styles.groupName}>{conversation.name}</Text>
          {isAnnouncement ? <View style={styles.announcementBadge}><Ionicons name="megaphone" size={14} color={theme.orange} /><Text style={styles.announcementText}>Annonces officielles · réactions autorisées</Text></View> : null}
          <MemberAvatarStack memberIds={activeMemberIds} members={members} memberCount={exactMemberCount} maxVisible={7} size={28} />
          <Text style={styles.groupMeta}>{exactMemberCount} membre{exactMemberCount > 1 ? "s" : ""} · {conversation.categoryLabel}</Text>
          {conversation.description ? <Text style={styles.description}>{conversation.description}</Text> : null}
        </View>

        <View style={styles.quickActions}>
          <Pressable accessibilityRole="button" onPress={() => toggleConversationMuted(id)} style={styles.quickAction}>
            <Ionicons name={conversation.muted ? "notifications" : "notifications-off"} size={21} color={theme.pageText} />
            <Text style={styles.quickLabel}>{conversation.muted ? "Réactiver" : "Sourdine"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.replace(`/chat/${encodeURIComponent(id)}`)} style={styles.quickAction}>
            <Ionicons name="chatbubble-outline" size={21} color={theme.pageText} />
            <Text style={styles.quickLabel}>Messages</Text>
          </Pressable>
          {canUseAutomations ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir les automatisations du groupe" onPress={() => router.push(`/schedule-message/${encodeURIComponent(id)}`)} style={styles.quickAction}>
              <Ionicons name="repeat-outline" size={21} color={theme.orange} />
              <Text style={styles.quickLabel}>Automatisations</Text>
            </Pressable>
          ) : null}
          {conversation.left ? <Pressable accessibilityRole="button" onPress={() => void rejoin()} style={[styles.quickAction, { backgroundColor: theme.successSoft }]}><Ionicons name="enter-outline" size={21} color={theme.success} /><Text style={[styles.quickLabel, { color: theme.success }]}>Rejoindre</Text></Pressable> : <Pressable accessibilityRole="button" onPress={leave} style={styles.quickAction}><Ionicons name="exit-outline" size={21} color={theme.danger} /><Text style={[styles.quickLabel, styles.dangerText]}>Quitter</Text></Pressable>}
        </View>

        <View style={styles.governanceNote}>
          <Ionicons name="shield-checkmark" size={18} color={theme.orange} />
          <Text style={styles.governanceText}>
            Les Visionnaires administrent tous les groupes. Les Amiraux et Capitaines nommés responsables peuvent gérer les membres et les automatisations de ce groupe.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Membres</Text>
        <View style={styles.panel}>
          {groupMembers.map((member, index) => (
            <SwipeableMemberRow
              key={member.id}
              member={member}
              isResponsible={responsibleIds.includes(member.id)}
              canManage={canManageMembers && member.id !== currentUser.id && !busyMemberId}
              isLast={index === groupMembers.length - 1}
              onOpen={() => router.push(`/profile/${encodeURIComponent(member.id)}`)}
              onToggleResponsible={() => void toggleResponsible(member)}
              onRemove={() => removeMember(member)}
            />
          ))}
          {groupMembers.length === 0 ? <Text style={styles.emptyMembers}>Aucun membre visible.</Text> : null}
        </View>

        {isAnnouncement && canEditSettings ? (
          <>
            <Text style={styles.sectionTitle}>Personnes autorisées à publier</Text>
            <Text style={styles.sectionHelp}>
              Les Visionnaires publient toujours. Vous pouvez autoriser des Amiraux ou Capitaines individuellement.
            </Text>
            <View style={styles.panel}>
              {eligiblePublishers.map((member, index) => {
                const selected = publisherIds.includes(member.id);
                return (
                  <Pressable
                    key={member.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: Boolean(busyMemberId) }}
                    disabled={Boolean(busyMemberId)}
                    onPress={() => void toggleAnnouncementPublisher(member)}
                    style={[styles.publisherRow, index < eligiblePublishers.length - 1 && styles.divider]}
                  >
                    <StatusAvatar user={member} size={44} accessible={false} />
                    <View style={styles.publisherContent}>
                      <Text style={styles.publisherName}>{member.name}</Text>
                      <MemberStatusBadge role={member.role} compact />
                    </View>
                    <View style={[styles.check, selected && styles.checkSelected]}>
                      {selected ? <Ionicons name="checkmark" size={17} color={colors.white} /> : null}
                    </View>
                  </Pressable>
                );
              })}
              {eligiblePublishers.length === 0 ? <Text style={styles.emptyMembers}>Aucun Amiral ou Capitaine visible.</Text> : null}
            </View>
          </>
        ) : null}

        {canEditSettings ? (
          <>
            <Text style={styles.sectionTitle}>Administration Visionnaire</Text>
            <View style={styles.panelForm}>
              <Text style={styles.fieldLabel}>Nom</Text>
              <TextInput value={name} onChangeText={(value) => { setName(value); setSavedAt(null); }} style={styles.input} placeholderTextColor={theme.pageTextMuted} maxLength={70} />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput value={description} onChangeText={(value) => { setDescription(value); setSavedAt(null); }} style={[styles.input, styles.multiline]} placeholder="Description du groupe" placeholderTextColor={theme.pageTextMuted} multiline maxLength={240} />

              <Text style={styles.fieldLabel}>Icône de remplacement</Text>
              <View style={styles.iconGrid}>
                {GROUP_ICONS.map((icon) => {
                  const selected = iconName === icon;
                  return (
                    <Pressable key={icon} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => { setIconName(icon); setSavedAt(null); }} style={[styles.iconChoice, selected && styles.iconChoiceSelected]}>
                      <Ionicons name={icon} size={22} color={selected ? theme.orange : theme.pageTextMuted} />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Statuts autorisés à voir le groupe</Text>
              <View style={styles.roles}>
                {GROUP_VISIBILITY_ROLES.map((role) => {
                  const selected = allowedRoles.includes(role);
                  const appearance = getRoleAppearance(role);
                  return (
                    <Pressable
                      key={role}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggleRole(role)}
                      style={[
                        styles.roleChip,
                        { borderColor: appearance.border, backgroundColor: selected ? appearance.background : theme.surfaceStrong }
                      ]}
                    >
                      <Text style={[styles.roleText, { color: selected ? appearance.foreground : theme.pageTextMuted }]}>{ROLE_LABELS[role]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchContent}>
                  <Text style={styles.switchTitle}>Découverte par les comptes Free</Text>
                  <Text style={styles.switchSubtitle}>Ils peuvent voir le groupe, mais doivent passer Triton pour le rejoindre.</Text>
                </View>
                <Switch accessibilityLabel="Autoriser la découverte du groupe aux comptes Free" value={allowFreeDiscovery} onValueChange={(value) => { setAllowFreeDiscovery(value); setSavedAt(null); }} trackColor={{ false: theme.surfaceMuted, true: colors.primary }} thumbColor={colors.white} />
              </View>

              {!isAnnouncement ? (
                <View style={styles.switchRow}>
                  <View style={styles.switchContent}>
                    <Text style={styles.switchTitle}>Les membres peuvent publier</Text>
                    <Text style={styles.switchSubtitle}>Sinon, l’écriture est limitée aux personnes autorisées par la gouvernance.</Text>
                  </View>
                  <Switch accessibilityLabel="Autoriser les membres à publier" value={membersCanPost} onValueChange={(value) => { setMembersCanPost(value); setSavedAt(null); }} trackColor={{ false: theme.surfaceMuted, true: colors.primary }} thumbColor={colors.white} />
                </View>
              ) : (
                <View style={styles.lockedRule}>
                  <Ionicons name="lock-closed" size={17} color={theme.orange} />
                  <Text style={styles.lockedRuleText}>Les membres ne peuvent jamais répondre dans Annonces. Ils peuvent uniquement réagir.</Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const createStyles = (theme: ConnexioTheme) => StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 58, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: theme.pageText, flex: 1, minWidth: 0, textAlign: "center" },
  saveButton: { minWidth: 88, minHeight: 48, alignItems: "center", justifyContent: "center" },
  saveDisabled: { opacity: 0.45 },
  saveText: { color: theme.orange, fontSize: 14, fontWeight: "900" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  title: { ...typography.heading2, color: theme.pageText, textAlign: "center" },
  mutedText: { ...typography.body, color: theme.pageTextMuted, textAlign: "center", maxWidth: 430 },
  primaryAction: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryActionText: { color: colors.white, fontWeight: "900" },
  savedBanner: { minHeight: 42, marginBottom: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: theme.successSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  savedText: { color: theme.success, fontSize: 11, fontWeight: "900" },
  identityCard: { paddingVertical: spacing.lg, alignItems: "center", gap: 8 },
  avatarShell: { width: 84, height: 84, borderRadius: 29, padding: 3 },
  avatarInner: { flex: 1, borderRadius: 26, overflow: "hidden", position: "relative", backgroundColor: theme.surfaceStrong, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.surface },
  cropBadge: { position: "absolute", right: 4, bottom: 4, width: 28, height: 28, borderRadius: 10, backgroundColor: "rgba(2,7,19,0.80)", alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  groupName: { ...typography.heading2, color: theme.pageText, textAlign: "center", marginTop: 6 },
  announcementBadge: { minHeight: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: "rgba(244,177,131,0.12)", borderWidth: 1, borderColor: "rgba(244,177,131,0.28)", flexDirection: "row", alignItems: "center", gap: 8 },
  announcementText: { color: theme.orange, fontSize: 11, fontWeight: "900" },
  groupMeta: { ...typography.caption, color: theme.pageTextMuted },
  description: { ...typography.bodySmall, color: theme.pageTextSecondary, textAlign: "center", marginTop: 5, maxWidth: 440 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  quickAction: { flexGrow: 1, flexBasis: 145, minHeight: 66, borderRadius: 18, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center", gap: 8 },
  quickLabel: { color: theme.pageTextSecondary, fontSize: 11, fontWeight: "800" },
  dangerText: { color: theme.danger },
  governanceNote: { minHeight: 58, padding: 12, borderRadius: 18, backgroundColor: "rgba(244,177,131,0.09)", borderWidth: 1, borderColor: "rgba(244,177,131,0.20)", flexDirection: "row", alignItems: "center", gap: 9 },
  governanceText: { flex: 1, color: theme.pageTextSecondary, fontSize: 11, lineHeight: 14, fontWeight: "700" },
  sectionTitle: { ...typography.heading3, color: theme.pageText, marginTop: spacing.lg, marginBottom: 8 },
  sectionHelp: { color: theme.pageTextMuted, fontSize: 11, lineHeight: 14, marginTop: -3, marginBottom: 8 },
  panel: { borderRadius: radii.xl, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, overflow: "hidden" },
  emptyMembers: { color: theme.pageTextMuted, textAlign: "center", padding: spacing.lg },
  publisherRow: { minHeight: 72, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.borderSoft },
  publisherAvatar: { width: 48, height: 48, borderRadius: 15, borderWidth: 2, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  publisherInitials: { fontSize: 11, fontWeight: "900" },
  publisherContent: { flex: 1, minWidth: 0, alignItems: "flex-start", gap: 8 },
  publisherName: { color: theme.pageText, fontSize: 14, fontWeight: "900" },
  check: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceStrong, alignItems: "center", justifyContent: "center" },
  checkSelected: { borderColor: theme.violet, backgroundColor: theme.violet },
  panelForm: { padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, marginBottom: spacing.lg },
  fieldLabel: { color: theme.pageTextSecondary, fontSize: 11, fontWeight: "900", marginTop: 10, marginBottom: 6 },
  input: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong, color: theme.pageText, ...typography.bodySmall },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconChoice: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong, alignItems: "center", justifyContent: "center" },
  iconChoiceSelected: { borderColor: theme.violet, backgroundColor: "rgba(107,79,234,0.2)" },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: { minHeight: 48, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  roleText: { fontSize: 11, fontWeight: "900" },
  switchRow: { minHeight: 76, marginTop: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  switchContent: { flex: 1, minWidth: 0 },
  switchTitle: { color: theme.pageText, fontSize: 14, fontWeight: "900" },
  switchSubtitle: { color: theme.pageTextMuted, fontSize: 11, lineHeight: 14, marginTop: 3 },
  lockedRule: { minHeight: 56, marginTop: spacing.md, padding: 11, borderRadius: 16, backgroundColor: "rgba(244,177,131,0.09)", flexDirection: "row", alignItems: "center", gap: 8 },
  lockedRuleText: { flex: 1, color: theme.pageTextSecondary, fontSize: 11, lineHeight: 14 }
});
