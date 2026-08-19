import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, SectionList, StyleSheet, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { ConversationRow } from "@/components/ConversationRow";
import { SwipeableConversationRow } from "@/components/SwipeableConversationRow";
import {
  conversationMatchesQuery,
  GROUP_SECTION_LABELS,
  groupSectionForConversation,
  isAnnouncementCollapsed,
  isAnnouncementConversation,
  isPrivateConversationKind,
  sortConversationsByPriority,
  type ConversationSectionKey
} from "@/domain/conversationOrganization";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { AppAlert } from "@/services/ui/AppAlert";
import {
  hidePrivateConversation,
  isConversationMentionSeen,
  isConversationPinned,
  isPrivateConversationPresented,
  markConversationMentionSeen,
  removePrivateConversation,
  restorePrivateConversation,
  toggleConversationPinned,
  useConversationPresentationRevision
} from "@/state/conversationPresentation";
import { gradients, spacing, typography } from "@/theme";
import type { ConversationFilter } from "@/types/experience";
import type { Conversation } from "@/types/messaging";

const MAX_CONTENT_WIDTH = 720;

type GroupSection = { key: ConversationSectionKey; title: string; data: Conversation[] };

function matchesMention(conversation: Conversation, aliases: string[]): boolean {
  if ((conversation.mentionCount ?? 0) > 0) return true;
  const text = conversation.lastMessage?.toLocaleLowerCase("fr") ?? "";
  return aliases.some((alias) => alias && text.includes(`@${alias}`));
}

export default function MessagesScreenV22() {
  const theme = useAppTheme();
  const { serviceAvailable, visibleConversations, getMessages, refreshConversations, loadingConversations, lastError } = useMessaging();
  const { members, localConversations, decorateConversation, isConversationVisible, toggleConversationMuted, leaveConversation, joinConversation } = useExperience();
  const { createdGroups, removeCreatedGroup } = useGroupAdmin();
  const { currentUser } = useSession();
  useConversationPresentationRevision();

  const [filter, setFilter] = useState<ConversationFilter>("groups");
  const [query, setQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Conversation | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<ConversationSectionKey>>(new Set());

  const mentionAliases = useMemo(() => {
    const [firstName = "", ...lastNameParts] = currentUser.name.toLocaleLowerCase("fr").split(/\s+/);
    return [firstName, lastNameParts.join(" "), currentUser.name.toLocaleLowerCase("fr"), currentUser.company.toLocaleLowerCase("fr")].filter(Boolean);
  }, [currentUser.company, currentUser.name]);

  const allConversations = useMemo(() => {
    const byId = new Map<string, Conversation>();
    for (const conversation of [...visibleConversations, ...localConversations, ...createdGroups]) byId.set(conversation.id, conversation);
    return [...byId.values()]
      .filter(isConversationVisible)
      .map((rawConversation) => {
        const conversation = decorateConversation(rawConversation);
        const localLatestMessage = getMessages(conversation.id)[0];
        if (!localLatestMessage) return conversation;
        const serverTimestamp = conversation.lastMessageAt ? Date.parse(conversation.lastMessageAt) : 0;
        const localTimestamp = Date.parse(localLatestMessage.createdAt);
        return Number.isFinite(localTimestamp) && localTimestamp > serverTimestamp
          ? { ...conversation, lastMessage: localLatestMessage.body, lastMessageAt: localLatestMessage.createdAt }
          : conversation;
      })
      .filter((conversation) => !isPrivateConversationKind(conversation) || isPrivateConversationPresented(conversation));
  }, [createdGroups, decorateConversation, getMessages, isConversationVisible, localConversations, visibleConversations]);

  const announcement = useMemo(
    () => allConversations.find((conversation) => !isPrivateConversationKind(conversation) && isAnnouncementConversation(conversation)),
    [allConversations]
  );

  const privateConversations = useMemo(
    () => sortConversationsByPriority(
      allConversations.filter(isPrivateConversationKind).filter((conversation) => conversationMatchesQuery(conversation, query)),
      isConversationPinned
    ),
    [allConversations, query]
  );

  const groupSections = useMemo<GroupSection[]>(() => {
    const groups = allConversations
      .filter((conversation) => !isPrivateConversationKind(conversation) && !isAnnouncementConversation(conversation))
      .filter((conversation) => conversationMatchesQuery(conversation, query));
    const pinned = sortConversationsByPriority(groups.filter((conversation) => isConversationPinned(conversation.id)), isConversationPinned);
    const unpinned = groups.filter((conversation) => !isConversationPinned(conversation.id));
    const section = (key: Exclude<ConversationSectionKey, "pinned">): Conversation[] =>
      sortConversationsByPriority(unpinned.filter((conversation) => groupSectionForConversation(conversation) === key), isConversationPinned);
    const sections: GroupSection[] = [
      { key: "pinned", title: GROUP_SECTION_LABELS.pinned, data: pinned },
      { key: "clubs", title: GROUP_SECTION_LABELS.clubs, data: section("clubs") },
      { key: "management", title: GROUP_SECTION_LABELS.management, data: section("management") },
      { key: "general", title: GROUP_SECTION_LABELS.general, data: section("general") }
    ];
    return sections.filter((item) => item.data.length > 0);
  }, [allConversations, query]);

  const visibleGroupCount = useMemo(
    () => allConversations.filter((conversation) => !isPrivateConversationKind(conversation)).length,
    [allConversations]
  );

  const closeMenu = () => setSelectedConversation(null);

  const openConversation = async (conversation: Conversation) => {
    try {
      if (conversation.left) {
        await joinConversation(conversation.id);
        await refreshConversations();
      }
      const mentioned = matchesMention(conversation, mentionAliases) && !isConversationMentionSeen(conversation);
      restorePrivateConversation(conversation.id);
      if (mentioned) markConversationMentionSeen(conversation);
      router.push({ pathname: "/chat/[id]", params: { id: conversation.id, ...(mentioned ? { focusMention: "1" } : {}) } });
    } catch (error) {
      AppAlert.alert("Impossible de rejoindre le groupe", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    }
  };

  const openDetails = () => {
    if (!selectedConversation) return;
    const route = isPrivateConversationKind(selectedConversation)
      ? `/conversation/${encodeURIComponent(selectedConversation.id)}`
      : `/group/${encodeURIComponent(selectedConversation.id)}`;
    closeMenu();
    router.push(route);
  };

  const toggleMute = () => {
    if (!selectedConversation) return;
    toggleConversationMuted(selectedConversation.id);
    setSelectedConversation({ ...selectedConversation, muted: !selectedConversation.muted });
  };

  const togglePin = () => {
    if (!selectedConversation || isAnnouncementConversation(selectedConversation)) return;
    toggleConversationPinned(selectedConversation.id);
    closeMenu();
  };

  const leaveSelectedGroup = () => {
    if (!selectedConversation) return;
    if (selectedConversation.id.startsWith("local-group-")) removeCreatedGroup(selectedConversation.id);
    else leaveConversation(selectedConversation.id);
    closeMenu();
  };

  const joinSelectedGroup = async () => {
    if (!selectedConversation) return;
    const id = selectedConversation.id;
    closeMenu();
    try {
      await joinConversation(id);
      await refreshConversations();
      router.push(`/chat/${encodeURIComponent(id)}`);
    } catch (error) {
      AppAlert.alert("Impossible de rejoindre le groupe", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    }
  };

  const deletePrivateConversation = () => {
    if (!deleteCandidate) return;
    removePrivateConversation(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  const toggleSection = (key: ConversationSectionKey) => {
    setCollapsedSections((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const renderConversation = (item: Conversation, compact = true) => {
    const privateConversation = isPrivateConversationKind(item);
    const mentioned = matchesMention(item, mentionAliases) && !isConversationMentionSeen(item);
    const row = (
      <ConversationRow
        conversation={item}
        members={members}
        mentioned={mentioned}
        muted={item.muted}
        pinned={isConversationPinned(item.id)}
        compact={compact}
        onPress={() => void openConversation(item)}
        onLongPress={() => setSelectedConversation(item)}
      />
    );
    return privateConversation
      ? <SwipeableConversationRow enabled onDelete={() => setDeleteCandidate(item)} onHide={() => hidePrivateConversation(item)}>{row}</SwipeableConversationRow>
      : row;
  };

  if (!serviceAvailable) return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <BrandHeader title="Messages" subtitle="Activation du backend sécurisé requise." />
      <View style={styles.feedbackWrap}>
        <LinearGradient colors={theme.isLight ? [theme.surface, theme.surfaceStrong] : gradients.glass} style={[styles.feedback, { borderColor: theme.borderSoft }]}>
          <Ionicons name="shield-checkmark-outline" size={36} color={theme.violet} />
          <Text style={[styles.feedbackTitle, { color: theme.pageText }]}>Messagerie temporairement protégée</Text>
          <Text style={[styles.feedbackText, { color: theme.pageTextMuted }]}>Les conversations resteront désactivées jusqu’à l’activation du backend sécurisé.</Text>
        </LinearGradient>
      </View>
    </LinearGradient>
  );

  const groupsEmpty = !announcement && groupSections.length === 0;

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <BrandHeader title="Messages" subtitle="Retrouvez rapidement la bonne conversation." />
      <View style={styles.toolbar}>
        <View accessibilityRole="tablist" style={[styles.segmented, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
          {(["groups", "private"] as const).map((value) => {
            const active = filter === value;
            return (
              <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setFilter(value)} style={styles.segmentButton}>
                {active ? <LinearGradient colors={theme.isLight ? [theme.accentSoft, theme.violetSoft] : gradients.activeTab} style={StyleSheet.absoluteFill} /> : null}
                <Ionicons name={value === "groups" ? "people" : "chatbubble-ellipses"} size={17} color={active ? theme.pageText : theme.pageTextMuted} />
                <Text style={[styles.segmentText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{value === "groups" ? "Groupes" : "Privées"}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.searchShell, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={18} color={theme.pageTextMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder={filter === "groups" ? "Rechercher un club ou un groupe…" : "Rechercher une conversation…"} placeholderTextColor={theme.pageTextMuted} style={[styles.searchInput, { color: theme.pageText }]} />
          {query ? <Pressable accessibilityLabel="Effacer la recherche" onPress={() => setQuery("")} style={styles.clearSearch}><Ionicons name="close-circle" size={19} color={theme.pageTextMuted} /></Pressable> : null}
        </View>
      </View>

      {lastError && allConversations.length === 0 ? (
        <View style={styles.feedbackWrap}>
          <LinearGradient colors={theme.isLight ? [theme.surface, theme.surfaceStrong] : gradients.glass} style={[styles.feedback, { borderColor: theme.borderSoft }]}>
            <Text style={[styles.feedbackTitle, { color: theme.pageText }]}>Discussions indisponibles</Text>
            <Text style={[styles.feedbackText, { color: theme.pageTextMuted }]}>{lastError}</Text>
            <Pressable onPress={() => void refreshConversations()} style={styles.retryButton}><Text style={styles.retryText}>Réessayer</Text></Pressable>
          </LinearGradient>
        </View>
      ) : loadingConversations && allConversations.length === 0 ? (
        <View style={styles.feedbackWrap}><ActivityIndicator size="large" color={theme.violet} /></View>
      ) : filter === "private" ? (
        <FlatList
          data={privateConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderConversation(item)}
          style={styles.listViewport}
          contentContainerStyle={[styles.list, privateConversations.length === 0 && styles.emptyList]}
          refreshing={loadingConversations}
          onRefresh={() => void refreshConversations()}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={privateConversations.some((item) => isConversationPinned(item.id)) ? <Text style={[styles.privateHint, { color: theme.pageTextMuted }]}>Les conversations épinglées restent en tête.</Text> : null}
          ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="chatbubbles-outline" size={34} color={theme.pageTextMuted} /><Text style={[styles.emptyHeading, { color: theme.pageText }]}>Aucune discussion privée</Text><Text style={[styles.emptyText, { color: theme.pageTextMuted }]}>Utilisez le bouton + pour démarrer une conversation.</Text></View>}
        />
      ) : (
        <SectionList
          sections={groupSections.map((section) => ({ ...section, data: collapsedSections.has(section.key) ? [] : section.data }))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderConversation(item, true)}
          renderSectionHeader={({ section }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${collapsedSections.has(section.key) ? "Déplier" : "Replier"} ${section.title}`} onPress={() => toggleSection(section.key)} style={[styles.sectionHeader, { backgroundColor: theme.pageBackground }]}>
              <View style={styles.sectionIdentity}>
                <Ionicons name={section.key === "pinned" ? "pin" : section.key === "clubs" ? "location" : section.key === "management" ? "shield-checkmark" : "grid"} size={16} color={section.key === "pinned" ? theme.violet : theme.pageTextMuted} />
                <Text style={[styles.sectionTitle, { color: theme.pageText }]}>{section.title}</Text>
                <View style={[styles.sectionCount, { backgroundColor: theme.surfaceStrong }]}><Text style={[styles.sectionCountText, { color: theme.pageTextMuted }]}>{section.data.length}</Text></View>
              </View>
              <Ionicons name={collapsedSections.has(section.key) ? "chevron-down" : "chevron-up"} size={18} color={theme.pageTextMuted} />
            </Pressable>
          )}
          ListHeaderComponent={announcement && conversationMatchesQuery(announcement, query) ? (
            <View style={styles.announcementWrap}>
              {isAnnouncementCollapsed(announcement) ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir Annonce" onPress={() => void openConversation(announcement)} onLongPress={() => setSelectedConversation(announcement)} style={[styles.announcementCollapsed, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
                  <View style={[styles.announcementIcon, { backgroundColor: theme.violetSoft }]}><Ionicons name="megaphone" size={19} color={theme.violet} /></View>
                  <View style={styles.announcementCopy}><Text style={[styles.announcementTitle, { color: theme.pageText }]}>Annonce</Text><Text numberOfLines={1} style={[styles.announcementPreview, { color: theme.pageTextMuted }]}>{announcement.lastMessage ?? "Consulter les annonces Neptune"}</Text></View>
                  <Ionicons name="chevron-forward" size={18} color={theme.pageTextMuted} />
                </Pressable>
              ) : renderConversation(announcement, true)}
            </View>
          ) : null}
          style={styles.listViewport}
          contentContainerStyle={[styles.list, groupsEmpty && styles.emptyList]}
          refreshing={loadingConversations}
          onRefresh={() => void refreshConversations()}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="people-outline" size={34} color={theme.pageTextMuted} /><Text style={[styles.emptyHeading, { color: theme.pageText }]}>Aucun groupe visible</Text><Text style={[styles.emptyText, { color: theme.pageTextMuted }]}>Les groupes apparaissent selon votre statut et vos clubs.</Text></View>}
          ListFooterComponent={<Text style={[styles.footerCount, { color: theme.pageTextMuted }]}>{visibleGroupCount} groupe{visibleGroupCount > 1 ? "s" : ""} visible{visibleGroupCount > 1 ? "s" : ""}</Text>}
        />
      )}

      <Modal transparent animationType="fade" visible={Boolean(selectedConversation)} onRequestClose={closeMenu}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]} onPress={closeMenu}>
          <Pressable style={[styles.sheet, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => undefined}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.pageTextMuted }]} />
            <Pressable accessibilityLabel="Fermer" onPress={closeMenu} style={[styles.closeButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="close" size={21} color={theme.pageTextMuted} /></Pressable>
            <Text style={[styles.sheetTitle, { color: theme.pageText }]}>{selectedConversation?.name}</Text>
            <Text style={[styles.sheetSubtitle, { color: theme.pageTextMuted }]}>{selectedConversation && isPrivateConversationKind(selectedConversation) ? "Conversation privée" : `${selectedConversation?.memberIds?.length ?? selectedConversation?.memberCount ?? 0} membres`}</Text>
            {selectedConversation && !isAnnouncementConversation(selectedConversation) ? <Pressable style={styles.sheetAction} onPress={togglePin}><Ionicons name={isConversationPinned(selectedConversation.id) ? "pin-outline" : "pin"} size={21} color={theme.pageText} /><Text style={[styles.sheetActionText, { color: theme.pageText }]}>{isConversationPinned(selectedConversation.id) ? "Désépingler" : "Épingler"}</Text></Pressable> : null}
            <Pressable style={styles.sheetAction} onPress={toggleMute}><Ionicons name={selectedConversation?.muted ? "notifications" : "notifications-off"} size={21} color={theme.pageText} /><Text style={[styles.sheetActionText, { color: theme.pageText }]}>{selectedConversation?.muted ? "Réactiver les notifications" : "Mettre en sourdine"}</Text></Pressable>
            <Pressable style={styles.sheetAction} onPress={openDetails}><Ionicons name="settings-outline" size={21} color={theme.pageText} /><Text style={[styles.sheetActionText, { color: theme.pageText }]}>{selectedConversation && isPrivateConversationKind(selectedConversation) ? "Informations de la conversation" : "Paramètres et membres du groupe"}</Text></Pressable>
            {selectedConversation && !isPrivateConversationKind(selectedConversation) && !isAnnouncementConversation(selectedConversation) ? (selectedConversation.left ? <Pressable style={[styles.sheetAction, { marginTop: 4, backgroundColor: theme.successSoft }]} onPress={() => void joinSelectedGroup()}><Ionicons name="enter-outline" size={21} color={theme.success} /><Text style={[styles.sheetActionText, { color: theme.success }]}>Rejoindre le groupe</Text></Pressable> : <Pressable style={[styles.sheetAction, { marginTop: 4, backgroundColor: theme.dangerSoft }]} onPress={leaveSelectedGroup}><Ionicons name="exit-outline" size={21} color={theme.danger} /><Text style={[styles.sheetActionText, { color: theme.danger }]}>Quitter le groupe</Text></Pressable>) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmationDialog visible={Boolean(deleteCandidate)} icon="trash-outline" destructive title={deleteCandidate ? `Supprimer « ${deleteCandidate.name} » ?` : "Supprimer la conversation ?"} message="La discussion disparaîtra de votre liste. Elle réapparaîtra si un nouveau message arrive ou si vous reprenez contact avec cette personne." confirmLabel="Supprimer" onCancel={() => setDeleteCandidate(null)} onConfirm={deletePrivateConversation} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 10, paddingTop: 8, gap: 8 },
  segmented: { minHeight: 56, padding: 4, borderRadius: 16, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  segmentButton: { flex: 1, minHeight: 48, borderRadius: 12, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  segmentText: { fontSize: 14, fontWeight: "800" },
  searchShell: { minHeight: 50, borderRadius: 16, borderWidth: 1, paddingLeft: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, fontSize: 16, paddingVertical: 9 },
  clearSearch: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  listViewport: { flex: 1, minHeight: 0, width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  list: { paddingHorizontal: 10, paddingBottom: 18 },
  emptyList: { flexGrow: 1 },
  announcementWrap: { paddingTop: 8, paddingBottom: 3 },
  announcementCollapsed: { minHeight: 58, borderRadius: 18, borderWidth: 1, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  announcementIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  announcementCopy: { flex: 1, minWidth: 0 },
  announcementTitle: { fontSize: 14, fontWeight: "900" },
  announcementPreview: { marginTop: 2, fontSize: 14, lineHeight: 18 },
  sectionHeader: { minHeight: 48, paddingHorizontal: 4, paddingVertical: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionIdentity: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { ...typography.heading3, fontSize: 15, fontWeight: "900" },
  sectionCount: { minWidth: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  sectionCountText: { fontSize: 11, fontWeight: "900" },
  privateHint: { minHeight: 40, paddingVertical: 9, fontSize: 14, lineHeight: 18, fontWeight: "700" },
  footerCount: { textAlign: "center", fontSize: 12, paddingVertical: 10 },
  feedbackWrap: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", flex: 1, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "center" },
  feedback: { width: "100%", maxWidth: 430, padding: spacing.lg, borderRadius: 24, borderWidth: 1, alignItems: "center", gap: spacing.sm },
  feedbackTitle: { ...typography.heading3, textAlign: "center" },
  feedbackText: { ...typography.body, textAlign: "center" },
  emptyState: { flex: 1, minHeight: 220, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: spacing.lg },
  emptyHeading: { ...typography.heading3, textAlign: "center" },
  emptyText: { ...typography.bodySmall, fontSize: 14, lineHeight: 19, textAlign: "center" },
  retryButton: { minWidth: 120, minHeight: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#5F52E8" },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", padding: 10 },
  sheet: { width: "100%", maxWidth: 520, alignSelf: "center", padding: 14, paddingTop: 18, borderRadius: 24, borderWidth: 1, gap: 5 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", opacity: 0.4, marginBottom: 4 },
  closeButton: { position: "absolute", right: 10, top: 10, width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  sheetTitle: { ...typography.heading2, paddingRight: 52, marginTop: 7 },
  sheetSubtitle: { fontSize: 14, marginBottom: 7 },
  sheetAction: { minHeight: 52, borderRadius: 15, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  sheetActionText: { fontSize: 14, fontWeight: "800", flex: 1 }
});
