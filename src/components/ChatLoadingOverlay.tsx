import { usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useMessaging } from "../providers/MessagingProvider";
import { colors, radii, spacing } from "../theme";
import { LoadingSkeleton } from "./LoadingSkeleton";

export function ChatLoadingOverlay() {
  const pathname = usePathname();
  const encodedId = pathname.startsWith("/chat/") ? pathname.slice(6).split("/")[0] : "";
  const conversationId = encodedId ? decodeURIComponent(encodedId) : "";
  const { getMessages, loadingConversationIds } = useMessaging();
  const messages = conversationId ? getMessages(conversationId) : [];
  const visible =
    Boolean(conversationId) &&
    messages.length === 0 &&
    loadingConversationIds.has(conversationId);

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityLabel="Chargement des messages"
      accessibilityRole="progressbar"
      style={styles.overlay}
    >
      <View style={styles.header}>
        <LoadingSkeleton width={48} height={48} radius={16} />
        <LoadingSkeleton width={48} height={48} radius={16} />
        <View style={styles.headerText}>
          <LoadingSkeleton width={146} height={14} radius={7} />
          <LoadingSkeleton width={96} height={9} radius={5} />
        </View>
        <LoadingSkeleton width={48} height={48} radius={16} />
      </View>
      <View style={styles.messages}>
        {Array.from({ length: 7 }, (_, index) => {
          const mine = index % 3 === 1;
          return (
            <View
              key={`chat-loading-${index}`}
              style={[styles.row, mine ? styles.mine : styles.other]}
            >
              {!mine ? <LoadingSkeleton width={38} height={38} radius={12} /> : null}
              <View style={[styles.bubble, mine && styles.mineBubble]}>
                {!mine ? <LoadingSkeleton width={78} height={9} radius={5} /> : null}
                <LoadingSkeleton width="100%" height={11} radius={6} />
                <LoadingSkeleton width={`${54 + (index % 3) * 12}%`} height={11} radius={6} />
                <LoadingSkeleton width={44} height={8} radius={4} style={styles.time} />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.composer}>
        <LoadingSkeleton width={48} height={48} radius={16} />
        <LoadingSkeleton height={52} radius={20} style={styles.composerInput} />
        <LoadingSkeleton width={48} height={48} radius={16} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    backgroundColor: colors.background
  },
  header: {
    minHeight: 72,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft
  },
  headerText: { flex: 1, minWidth: 0, gap: 7 },
  messages: {
    flex: 1,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: spacing.md,
    gap: spacing.md
  },
  row: { width: "100%", flexDirection: "row", alignItems: "flex-end", gap: 8 },
  mine: { justifyContent: "flex-end" },
  other: { justifyContent: "flex-start" },
  bubble: {
    width: "64%",
    maxWidth: 430,
    minHeight: 76,
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 8
  },
  mineBubble: { width: "58%", backgroundColor: colors.primarySoft },
  time: { alignSelf: "flex-end" },
  composer: {
    minHeight: 70,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  composerInput: { flex: 1, minWidth: 0 }
});
