import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { ConversationRow } from "@/components/ConversationRow";
import { SwipeableConversationRow } from "@/components/SwipeableConversationRow";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { hidePrivateConversation, isConversationMentionSeen, isPrivateConversationPresented, markConversationMentionSeen, removePrivateConversation, restorePrivateConversation, useConversationPresentationRevision } from "@/state/conversationPresentation";
import { AppAlert } from "@/services/ui/AppAlert";
import { colors, gradients, spacing, typography } from "@/theme";
import type { ConversationFilter } from "@/types/experience";
import type { Conversation } from "@/types/messaging";

const MAX_CONTENT_WIDTH = 720;
const isPrivateConversation = (conversation: Conversation) => conversation.type === "direct" || conversation.type === "small_group";

function matchesMention(conversation: Conversation, aliases: string[]): boolean {
  if ((conversation.mentionCount ?? 0) > 0) return true;
  const text = conversation.lastMessage?.toLocaleLowerCase("fr") ?? "";
  return aliases.some((alias) => alias && text.includes(`@${alias}`));
}

export default function MessagesScreen() {
  const theme = useAppTheme();
  const { serviceAvailable, visibleConversations, getMessages, refreshConversations, loadingConversations, lastError } = useMessaging();
  const { members, localConversations, decorateConversation, isConversationVisible, toggleConversationMuted, leaveConversation, joinConversation } = useExperience();
  const { createdGroups, removeCreatedGroup } = useGroupAdmin();
  const { currentUser } = useSession();
  const presentationRevision = useConversationPresentationRevision();
  const [filter, setFilter] = useState<ConversationFilter>("groups");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Conversation | null>(null);

  const mentionAliases = useMemo(() => {
    const [firstName = "", ...lastNameParts] = currentUser.name.toLocaleLowerCase("fr").split(/\s+/);
    return [firstName, lastNameParts.join(" "), currentUser.name.toLocaleLowerCase("fr"), currentUser.company.toLocaleLowerCase("fr")].filter(Boolean);
  }, [currentUser.company, currentUser.name]);

  const sortedConversations = useMemo(() => {
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
      .filter((conversation) => !isPrivateConversation(conversation) || isPrivateConversationPresented(conversation))
      .filter((conversation) => filter === "private" ? isPrivateConversation(conversation) : !isPrivateConversation(conversation))
      .sort((a, b) => (Date.parse(b.lastMessageAt ?? "") || 0) - (Date.parse(a.lastMessageAt ?? "") || 0));
  }, [createdGroups, decorateConversation, filter, getMessages, isConversationVisible, localConversations, presentationRevision, visibleConversations]);

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
    const route = isPrivateConversation(selectedConversation) ? `/conversation/${encodeURIComponent(selectedConversation.id)}` : `/group/${encodeURIComponent(selectedConversation.id)}`;
    closeMenu();
    router.push(route);
  };
  const toggleMute = () => {
    if (!selectedConversation) return;
    toggleConversationMuted(selectedConversation.id);
    setSelectedConversation({ ...selectedConversation, muted: !selectedConversation.muted });
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

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <BrandHeader title="Messages" subtitle="Groupes et échanges privés Neptune." />
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
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.pageText }]}>{filter === "groups" ? "Discussions de groupe" : "Discussions privées"}</Text>
        <View style={[styles.sectionCountShell, { borderColor: theme.borderSoft, backgroundColor: theme.violetSoft }]}><Text style={[styles.sectionCount, { color: theme.pageText }]}>{sortedConversations.length}</Text></View>
      </View>

      {lastError && sortedConversations.length === 0 ? (
        <View style={styles.feedbackWrap}>
          <LinearGradient colors={theme.isLight ? [theme.surface, theme.surfaceStrong] : gradients.glass} style={[styles.feedback, { borderColor: theme.borderSoft }]}>
            <Text style={[styles.feedbackTitle, { color: theme.pageText }]}>Discussions indisponibles</Text>
            <Text style={[styles.feedbackText, { color: theme.pageTextMuted }]}>{lastError}</Text>
            <Pressable onPress={() => void refreshConversations()} style={styles.retryButton}><Text style={styles.retryText}>Réessayer</Text></Pressable>
          </LinearGradient>
        </View>
      ) : loadingConversations && sortedConversations.length === 0 ? (
        <View style={styles.feedbackWrap}><ActivityIndicator size="large" color={theme.violet} /></View>
      ) : (
        <FlatList
          data={sortedConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const privateConversation = isPrivateConversation(item);
            const mentioned = matchesMention(item, mentionAliases) && !isConversationMentionSeen(item);
            const row = <ConversationRow conversation={item} members={members} mentioned={mentioned} muted={item.muted} onPress={() => void openConversation(item)} onLongPress={() => setSelectedConversation(item)} />;
            return privateConversation ? <SwipeableConversationRow enabled onDelete={() => setDeleteCandidate(item)} onHide={() => hidePrivateConversation(item)}>{row}</SwipeableConversationRow> : row;
          }}
          style={styles.listViewport}
          contentContainerStyle={[styles.list, sortedConversations.length === 0 && styles.emptyList]}
          refreshing={loadingConversations}
          onRefresh={() => void refreshConversations()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.emptyState}><Ionicons name={filter === "groups" ? "people-outline" : "chatbubbles-outline"} size={34} color={theme.pageTextMuted} /><Text style={[styles.emptyHeading, { color: theme.pageText }]}>{filter === "groups" ? "Aucun groupe visible" : "Aucune discussion privée"}</Text><Text style={[styles.emptyText, { color: theme.pageTextMuted }]}>{filter === "groups" ? "Les groupes apparaissent selon votre statut." : "Utilisez le bouton + au centre de la barre pour démarrer une conversation."}</Text></View>}
        />
      )}

      <Modal transparent animationType="fade" visible={Boolean(selectedConversation)} onRequestClose={closeMenu}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]} onPress={closeMenu}>
          <Pressable style={[styles.sheet, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => undefined}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.pageTextMuted }]} />
            <Pressable onPress={closeMenu} style={[styles.closeButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="close" size={21} color={theme.pageTextMuted} /></Pressable>
            <Text style={[styles.sheetTitle, { color: theme.pageText }]}>{selectedConversation?.name}</Text>
            <Text style={[styles.sheetSubtitle, { color: theme.pageTextMuted }]}>{selectedConversation?.type === "direct" ? "Conversation privée" : `${selectedConversation?.memberIds?.length ?? selectedConversation?.memberCount ?? 0} membres`}</Text>
            <Pressable style={styles.sheetAction} onPress={toggleMute}><Ionicons name={selectedConversation?.muted ? "notifications" : "notifications-off"} size={21} color={theme.pageText} /><Text style={[styles.sheetActionText, { color: theme.pageText }]}>{selectedConversation?.muted ? "Réactiver les notifications" : "Mettre en sourdine"}</Text></Pressable>
            <Pressable style={styles.sheetAction} onPress={openDetails}><Ionicons name="settings-outline" size={21} color={theme.pageText} /><Text style={[styles.sheetActionText, { color: theme.pageText }]}>{selectedConversation && isPrivateConversation(selectedConversation) ? "Informations de la conversation" : "Paramètres et membres du groupe"}</Text></Pressable>
            {selectedConversation && selectedConversation.type !== "direct" && selectedConversation.type !== "announcement" ? (selectedConversation.left ? <Pressable style={[styles.sheetAction, { marginTop: 4, backgroundColor: theme.successSoft }]} onPress={() => void joinSelectedGroup()}><Ionicons name="enter-outline" size={21} color={theme.success} /><Text style={[styles.sheetActionText, { color: theme.success }]}>Rejoindre le groupe</Text></Pressable> : <Pressable style={[styles.sheetAction, { marginTop: 4, backgroundColor: theme.dangerSoft }]} onPress={leaveSelectedGroup}><Ionicons name="exit-outline" size={21} color={theme.danger} /><Text style={[styles.sheetActionText, { color: theme.danger }]}>Quitter le groupe</Text></Pressable>) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmationDialog visible={Boolean(deleteCandidate)} icon="trash-outline" destructive title={deleteCandidate ? `Supprimer « ${deleteCandidate.name} » ?` : "Supprimer la conversation ?"} message="La discussion disparaîtra de votre liste. Elle réapparaîtra si un nouveau message arrive ou si vous reprenez contact avec cette personne." confirmLabel="Supprimer" onCancel={() => setDeleteCandidate(null)} onConfirm={deletePrivateConversation} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 10, paddingTop: 10 },
  segmented: { height: 56, padding: 3, borderRadius: 16, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  segmentButton: { flex: 1, height: 48, borderRadius: 12, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  segmentText: { fontSize: 14, fontWeight: "800" },
  sectionHeader: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: spacing.md, paddingTop: 14, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionTitle: { ...typography.heading3, flex: 1, fontWeight: "900" },
  sectionCountShell: { minWidth: 28, height: 28, paddingHorizontal: 7, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sectionCount: { fontSize: 11, fontWeight: "900" },
  listViewport: { flex: 1, minHeight: 0, width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  list: { paddingHorizontal: 10, paddingBottom: 22 },
  emptyList: { flexGrow: 1 },
  feedbackWrap: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", flex: 1, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "center" },
  feedback: { width: "100%", maxWidth: 430, padding: spacing.lg, borderRadius: 24, borderWidth: 1, alignItems: "center", gap: spacing.sm },
  feedbackTitle: { ...typography.heading3, textAlign: "center" },
  feedbackText: { ...typography.body, textAlign: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg, gap: spacing.sm },
  emptyHeading: { ...typography.heading3, textAlign: "center" },
  emptyText: { ...typography.body, textAlign: "center" },
  retryButton: { minHeight: 48, minWidth: 124, marginTop: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  retryText: { color: colors.white, fontWeight: "900" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 640, alignSelf: "center", paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.md },
  closeButton: { position: "absolute", top: 8, right: 10, width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sheetTitle: { ...typography.heading2, textAlign: "center" },
  sheetSubtitle: { ...typography.caption, textAlign: "center", marginTop: 3, marginBottom: spacing.md },
  sheetAction: { minHeight: 52, borderRadius: 16, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: 12 },
  sheetActionText: { ...typography.body, flex: 1, fontWeight: "700" }
});
