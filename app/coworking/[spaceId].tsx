import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Text } from "@/components/LocalizedText";
import { useCoworking } from "@/providers/CoworkingProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import CoworkingRoomScreen from "@/screens/CoworkingRoomScreen";

function first(value?: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const MAX_JOIN_ATTEMPTS = 3;

export default function CoworkingRoomRoute() {
  const params = useLocalSearchParams<{ spaceId?: string | string[] }>();
  const spaceId = first(params.spaceId);
  const theme = useAppTheme();
  const { currentUser } = useSession();
  const { snapshot, currentSpace, joinSpace } = useCoworking();
  const [joining, setJoining] = useState(false);
  const [joinFailed, setJoinFailed] = useState(false);
  const [joinAttempt, setJoinAttempt] = useState(0);

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
    if (!space || joined || joining || joinFailed) return;
    if (joinAttempt >= MAX_JOIN_ATTEMPTS) {
      setJoinFailed(true);
      return;
    }

    let active = true;
    setJoining(true);
    setJoinFailed(false);
    void (async () => {
      try {
        await joinSpace(space.id);
        // React peut grouper l'update du provider et la navigation. Ce court
        // passage au prochain frame laisse la présence Coworking se commiter
        // avant de décider qu'une nouvelle tentative est nécessaire.
        await new Promise<void>((resolve) => setTimeout(resolve, 48));
      } catch {
        if (active && joinAttempt + 1 >= MAX_JOIN_ATTEMPTS) setJoinFailed(true);
      } finally {
        if (!active) return;
        setJoining(false);
        setJoinAttempt((value) => value + 1);
      }
    })();

    return () => {
      active = false;
    };
  }, [joinAttempt, joinFailed, joinSpace, joined, joining, space]);

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
