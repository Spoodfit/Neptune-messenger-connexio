import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { ConversationRow } from "@/components/ConversationRow";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { colors, gradients, spacing, typography } from "@/theme";
import type { ConversationFilter } from "@/types/experience";
import type { Conversation } from "@/types/messaging";

const MAX_CONTENT_WIDTH = 720;

function isPrivateConversation(conversation: Conversation): boolean {
  return conversation.type === "direct" || conversation.type === "small_group";
}

function matchesMention(conversation: Conversation, aliases: string[]): boolean {
  if ((conversation.mentionCount ?? 0) > 0) return true;
  const text = conversation.lastMessage?.toLocaleLowerCase("fr") ?? "";
  return aliases.some((alias) => alias && text.includes(`@${alias}`));
}

export default function MessagesScreen() {
  const {
    visibleConversations,
    getMessages,
    refreshConversations,
    loadingConversations,
    lastError
  } = useMessaging();
  const {
    members,
    localConversations,
    decorateConversation,
    isConversationVisible,
    toggleConversationMuted,
    leaveConversation
  } = useExperience();
  const { createdGroups, removeCreatedGroup } = useGroupAdmin();
  const { currentUser } = useSession();
  const [filter, setFilter] = useState<ConversationFilter>("groups");
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const mentionAliases = useMemo(() => {
    const [firstName = "", ...lastNameParts] = currentUser.name
      .toLocaleLowerCase("fr")
      .split(/\s+/);
    const lastName = lastNameParts.join(" ");
    return [
      firstName,
      lastName,
      currentUser.name.toLocaleLowerCase("fr"),
      currentUser.company.toLocaleLowerCase("fr")
    ].filter(Boolean);
  }, [currentUser.company, currentUser.name]);

  const sortedConversations = useMemo(() => {
    const byId = new Map<string, Conversation>();
    for (const conversation of [
      ...visibleConversations,
      ...localConversations,
      ...createdGroups
    ]) {
      byId.set(conversation.id, conversation);
    }

    return [...byId.values()]
      .filter(isConversationVisible)
      .map((rawConversation) => {
        const conversation = decorateConversation(rawConversation);
        const localLatestMessage = getMessages(conversation.id)[0];
        if (!localLatestMessage) return conversation;

        const serverTimestamp = conversation.lastMessageAt
          ? Date.parse(conversation.lastMessageAt)
          : 0;
        const localTimestamp = Date.parse(localLatestMessage.createdAt);
        if (!Number.isFinite(localTimestamp) || localTimestamp <= serverTimestamp) {
          return conversation;
        }

        return {
          ...conversation,
          lastMessage: localLatestMessage.body,
          lastMessageAt: localLatestMessage.createdAt
        };
      })
      .filter((conversation) =>
        filter === "private"
          ? isPrivateConversation(conversation)
          : !isPrivateConversation(conversation)
      )
      .sort((first, second) => {
        const firstTime = first.lastMessageAt
          ? Date.parse(first.lastMessageAt)
          : 0;
        const secondTime = second.lastMessageAt
          ? Date.parse(second.lastMessageAt)
          : 0;
        return secondTime - firstTime;
      });
  }, [
    createdGroups,
    decorateConversation,
    filter,
    getMessages,
    isConversationVisible,
    localConversations,
    visibleConversations
  ]);

  const openConversationSettings = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const closeMenu = () => setSelectedConversation(null);

  const openDetails = () => {
    if (!selectedConversation) return;
    const route = isPrivateConversation(selectedConversation)
      ? `/conversation/${encodeURIComponent(selectedConversation.id)}`
      : `/group/${encodeURIComponent(selectedConversation.id)}`;
    closeMenu();
    router.push(route);
  };

  const toggleMute = () => {
    if (!selectedConversation) return;
    toggleConversationMuted(selectedConversation.id);
    setSelectedConversation({
      ...selectedConversation,
      muted: !selectedConversation.muted
    });
  };

  const leaveSelectedGroup = () => {
    if (!selectedConversation) return;
    if (selectedConversation.id.startsWith("local-group-")) {
      removeCreatedGroup(selectedConversation.id);
    } else {
      leaveConversation(selectedConversation.id);
    }
    closeMenu();
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <BrandHeader title="Messages" subtitle="Groupes et échanges privés Neptune." />

      <View style={styles.toolbar}>
        <View
          accessibilityRole="tablist"
          accessibilityLabel="Type de discussions"
          style={styles.segmented}
        >
          {(["groups", "private"] as const).map((value) => {
            const active = filter === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={
                  value === "groups" ? "Discussions de groupe" : "Discussions privées"
                }
                onPress={() => setFilter(value)}
                style={styles.segmentButton}
              >
                {active ? (
                  <LinearGradient
                    colors={gradients.activeTab}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Ionicons
                  name={value === "groups" ? "people" : "chatbubble-ellipses"}
                  size={17}
                  color={active ? colors.text : colors.textMuted}
                />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {value === "groups" ? "Groupes" : "Privées"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Créer une nouvelle conversation"
          accessibilityHint="Permet de créer une discussion privée ou, pour les Visionnaires, un groupe officiel"
          onPress={() => router.push("/new-conversation")}
          style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
        >
          <LinearGradient colors={gradients.primary} style={styles.createGradient}>
            <Ionicons name="add" size={23} color={colors.white} />
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {filter === "groups" ? "Discussions de groupe" : "Discussions privées"}
        </Text>
        <View style={styles.sectionCountShell}>
          <Text
            accessibilityLabel={`${sortedConversations.length} discussions visibles`}
            style={styles.sectionCount}
          >
            {sortedConversations.length}
          </Text>
        </View>
      </View>

      {lastError && sortedConversations.length === 0 ? (
        <View style={styles.feedbackWrap}>
          <LinearGradient colors={gradients.glass} style={styles.feedback}>
            <Text accessibilityRole="alert" style={styles.feedbackTitle}>
              Discussions indisponibles
            </Text>
            <Text style={styles.feedbackText}>{lastError}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Réessayer de charger les discussions"
              onPress={() => void refreshConversations()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryPressed
              ]}
            >
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </LinearGradient>
        </View>
      ) : loadingConversations && sortedConversations.length === 0 ? (
        <View
          style={styles.feedbackWrap}
          accessibilityLabel="Chargement des discussions"
        >
          <ActivityIndicator size="large" color={colors.violet} />
        </View>
      ) : (
        <FlatList
          accessibilityLabel={
            filter === "groups"
              ? "Liste des groupes Neptune"
              : "Liste des conversations privées"
          }
          data={sortedConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              members={members}
              mentioned={matchesMention(item, mentionAliases)}
              muted={item.muted}
              onLongPress={() => openConversationSettings(item)}
            />
          )}
          style={styles.listViewport}
          contentContainerStyle={[
            styles.list,
            sortedConversations.length === 0 && styles.emptyList
          ]}
          refreshing={loadingConversations}
          onRefresh={() => void refreshConversations()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name={filter === "groups" ? "people-outline" : "chatbubbles-outline"}
                size={34}
                color={colors.textMuted}
              />
              <Text style={styles.feedbackTitle}>
                {filter === "groups" ? "Aucun groupe visible" : "Aucune discussion privée"}
              </Text>
              <Text style={styles.feedbackText}>
                {filter === "groups"
                  ? "Les groupes apparaissent selon votre statut et les règles définies par les Visionnaires."
                  : "Créez une conversation individuelle ou un mini-groupe de quatre participants maximum."}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(selectedConversation)}
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer les options de conversation"
              onPress={closeMenu}
              style={({ pressed }) => ({
                position: "absolute",
                top: 8,
                right: 10,
                width: 48,
                height: 48,
                zIndex: 2,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.62 : 1
              })}
            >
              <Ionicons name="close" size={21} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {selectedConversation?.name}
            </Text>
            <Text style={styles.sheetSubtitle}>
              {selectedConversation?.type === "direct"
                ? "Conversation privée"
                : `${selectedConversation?.memberIds?.length ?? selectedConversation?.memberCount ?? 0} membres`}
            </Text>

            <Pressable style={styles.sheetAction} onPress={toggleMute}>
              <Ionicons
                name={selectedConversation?.muted ? "notifications" : "notifications-off"}
                size={21}
                color={colors.text}
              />
              <Text style={styles.sheetActionText}>
                {selectedConversation?.muted ? "Réactiver les notifications" : "Mettre en sourdine"}
              </Text>
            </Pressable>

            <Pressable style={styles.sheetAction} onPress={openDetails}>
              <Ionicons name="settings-outline" size={21} color={colors.text} />
              <Text style={styles.sheetActionText}>
                {selectedConversation && isPrivateConversation(selectedConversation)
                  ? "Informations de la conversation"
                  : "Paramètres et membres du groupe"}
              </Text>
            </Pressable>

            {selectedConversation &&
            selectedConversation.type !== "direct" &&
            selectedConversation.type !== "announcement" ? (
              <Pressable
                style={[styles.sheetAction, styles.dangerAction]}
                onPress={leaveSelectedGroup}
              >
                <Ionicons name="exit-outline" size={21} color={colors.danger} />
                <Text style={[styles.sheetActionText, styles.dangerText]}>
                  Quitter le groupe
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 10, paddingTop: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  segmented: { flex: 1, height: 52, padding: 3, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", overflow: "hidden" },
  segmentButton: { flex: 1, minHeight: 48, borderRadius: 13, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  segmentText: { color: colors.textMuted, fontSize: 14, fontWeight: "800" },
  segmentTextActive: { color: colors.text },
  createButton: { width: 48, height: 48, borderRadius: 15 },
  createGradient: { flex: 1, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.86 },
  sectionHeader: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: spacing.md, paddingTop: 14, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionTitle: { ...typography.heading3, color: colors.text, flex: 1, flexShrink: 1, fontWeight: "900" },
  sectionCountShell: { minWidth: 28, height: 28, paddingHorizontal: 7, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(107,79,234,0.18)", alignItems: "center", justifyContent: "center" },
  sectionCount: { color: colors.text, fontSize: 11, fontWeight: "900" },
  listViewport: { flex: 1, minHeight: 0, width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  list: { paddingHorizontal: 10, paddingBottom: 22 },
  emptyList: { flexGrow: 1 },
  feedbackWrap: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", flex: 1, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "center" },
  feedback: { width: "100%", maxWidth: 430, padding: spacing.lg, borderRadius: 24, borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", gap: spacing.sm },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg, gap: spacing.sm },
  feedbackTitle: { ...typography.heading3, color: colors.text, textAlign: "center" },
  feedbackText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  retryButton: { minHeight: 48, minWidth: 124, marginTop: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  retryPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  retryText: { color: colors.white, fontWeight: "900" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 640, alignSelf: "center", paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.md, backgroundColor: colors.border },
  sheetTitle: { ...typography.heading2, color: colors.text, textAlign: "center" },
  sheetSubtitle: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: 3, marginBottom: spacing.md },
  sheetAction: { minHeight: 52, borderRadius: 16, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: 12 },
  sheetActionText: { ...typography.body, color: colors.text, flex: 1, fontWeight: "700" },
  dangerAction: { marginTop: 4, backgroundColor: colors.dangerSoft },
  dangerText: { color: colors.danger }
});
