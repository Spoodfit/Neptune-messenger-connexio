import { useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { env } from "../config/env";
import { useExperience } from "../providers/ExperienceProvider";
import { useMessaging } from "../providers/MessagingProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { radii, spacing } from "../theme";
import { LoadingSkeleton } from "./LoadingSkeleton";

export function TabsLoadingOverlay() {
  const segments = useSegments();
  const theme = useAppTheme();
  const tab = (segments as readonly string[])[1];
  const { visibleConversations, loadingConversations } = useMessaging();
  const { posts, refreshExperience } = useExperience();
  const [experienceLoading, setExperienceLoading] = useState(false);

  useEffect(() => {
    if (tab !== "highlights" || env.mockMode || posts.length > 0) {
      setExperienceLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setExperienceLoading(true);
      void refreshExperience().finally(() => { if (!cancelled) setExperienceLoading(false); });
    }, 120);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [posts.length, refreshExperience, tab]);

  const conversationsLoading = (tab === "messages" || tab === "communities") && loadingConversations && visibleConversations.length === 0;
  const feedLoading = tab === "highlights" && experienceLoading;
  if (!conversationsLoading && !feedLoading) return null;

  return (
    <View pointerEvents="none" accessibilityLabel={feedLoading ? "Chargement des Temps forts" : "Chargement des discussions"} accessibilityRole="progressbar" style={[styles.overlay, { backgroundColor: theme.pageBackground }]}>
      <View style={styles.header}>
        <LoadingSkeleton width={156} height={22} radius={8} />
        <LoadingSkeleton width={238} height={10} radius={5} />
      </View>
      {feedLoading ? <FeedRows /> : <ConversationRows />}
    </View>
  );
}

function ConversationRows() {
  const theme = useAppTheme();
  return (
    <View style={styles.list}>
      {Array.from({ length: 6 }, (_, index) => (
        <View key={`conversation-loading-${index}`} style={[styles.row, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
          <LoadingSkeleton width={50} height={50} radius={17} />
          <View style={styles.flex}>
            <LoadingSkeleton width={`${56 + (index % 3) * 8}%`} height={14} radius={7} />
            <LoadingSkeleton width={`${72 - (index % 2) * 10}%`} height={10} radius={5} />
            <LoadingSkeleton width="42%" height={9} radius={5} />
          </View>
        </View>
      ))}
    </View>
  );
}

function FeedRows() {
  const theme = useAppTheme();
  return (
    <View style={styles.list}>
      {Array.from({ length: 3 }, (_, index) => (
        <View key={`feed-loading-${index}`} style={[styles.card, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
          <View style={styles.rowHead}>
            <LoadingSkeleton width={42} height={42} radius={14} />
            <View style={styles.flex}>
              <LoadingSkeleton width="48%" height={13} radius={7} />
              <LoadingSkeleton width="34%" height={9} radius={5} />
            </View>
          </View>
          {index !== 1 ? <LoadingSkeleton height={138} radius={16} /> : null}
          <LoadingSkeleton width="94%" height={11} radius={6} />
          <LoadingSkeleton width="68%" height={11} radius={6} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, bottom: 76, paddingTop: 24 },
  header: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 8 },
  list: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 10, gap: spacing.sm },
  row: { minHeight: 82, padding: 12, borderRadius: radii.xl, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1, minWidth: 0, gap: 8 },
  card: { padding: 12, borderRadius: 22, borderWidth: 1, gap: 10 },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 9 }
});
