import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Text } from "@/components/LocalizedText";
import { useCoworking } from "@/providers/CoworkingProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import CoworkingRoomScreen from "@/screens/CoworkingRoomScreen";

function first(value?: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function CoworkingRoomRoute() {
  const params = useLocalSearchParams<{ spaceId?: string | string[] }>();
  const spaceId = first(params.spaceId);
  const theme = useAppTheme();
  const { currentUser } = useSession();
  const { snapshot, currentSpace, joinSpace } = useCoworking();
  const attemptedRef = useRef<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinFailed, setJoinFailed] = useState(false);

  const space = useMemo(() => {
    if (!spaceId) return undefined;
    if (snapshot.hub.id === spaceId) return snapshot.hub;
    return snapshot.spaces.find((item) => item.id === spaceId);
  }, [snapshot.hub, snapshot.spaces, spaceId]);
  const joined = Boolean(
    space &&
      (currentSpace?.id === space.id ||
        space.participantIds.includes(currentUser.id) ||
        snapshot.currentUserSpaceId === space.id)
  );

  useEffect(() => {
    if (!space || joined || joining || attemptedRef.current === space.id) return;
    attemptedRef.current = space.id;
    setJoining(true);
    setJoinFailed(false);
    void joinSpace(space.id)
      .catch(() => setJoinFailed(true))
      .finally(() => setJoining(false));
  }, [joinSpace, joined, joining, space]);

  if (!space || joinFailed) return <CoworkingRoomScreen />;
  if (!joined) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.pageBackground }]} accessibilityLabel="Connexion à la salle">
        <ActivityIndicator size="large" color={theme.violet} />
        <Text style={[styles.loadingText, { color: theme.pageTextMuted }]}>Connexion à la salle…</Text>
      </View>
    );
  }

  return <CoworkingRoomScreen />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loadingText: { fontSize: 13, lineHeight: 18, fontWeight: "800" }
});