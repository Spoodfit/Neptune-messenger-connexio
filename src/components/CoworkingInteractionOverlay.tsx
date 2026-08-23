import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "./LocalizedText";
import { StatusAvatar } from "./StatusAvatar";
import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { env } from "../config/env";
import { useCoworking } from "../providers/CoworkingProvider";
import { useExperience } from "../providers/ExperienceProvider";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { useActionSounds } from "../services/audio/actionSounds";
import { CoworkingMapApi } from "../services/api/coworkingMapApi";
import { NeptuneMessagingApi } from "../services/api/neptuneApi";
import { RealtimeClient, type RealtimeEvent } from "../services/realtime/RealtimeClient";

const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);

type HelloState = { fromUserId: string; nonce: number } | null;
type KnockState = { requestId: string; fromUserId: string; spaceId: string } | null;

function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] || value;
}

export function CoworkingInteractionOverlay() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { accessToken, currentUser } = useSession();
  const { members } = useExperience();
  const { joinSpace } = useCoworking();
  const { playKnock } = useActionSounds();
  const [hello, setHello] = useState<HelloState>(null);
  const [knock, setKnock] = useState<KnockState>(null);
  const [responding, setResponding] = useState(false);
  const realtimeRef = useRef<RealtimeClient | null>(null);
  const helloTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapApi = useMemo(
    () => (env.mockMode || !accessToken ? null : new CoworkingMapApi(accessToken)),
    [accessToken]
  );
  const messagingApi = useMemo(
    () => (env.mockMode || !accessToken ? null : new NeptuneMessagingApi(accessToken)),
    [accessToken]
  );

  const memberFor = (userId?: string) =>
    userId === currentUser.id ? currentUser : members.find((member) => member.id === userId);
  const helloMember = memberFor(hello?.fromUserId);
  const knockMember = memberFor(knock?.fromUserId);

  useEffect(() => () => {
    if (helloTimer.current) clearTimeout(helloTimer.current);
  }, []);

  useEffect(() => {
    if (!hello) return;
    if (helloTimer.current) clearTimeout(helloTimer.current);
    helloTimer.current = setTimeout(() => setHello(null), 3600);
    return () => {
      if (helloTimer.current) clearTimeout(helloTimer.current);
      helloTimer.current = null;
    };
  }, [hello]);

  useEffect(() => {
    if (
      env.mockMode ||
      !messagingApi ||
      !env.realtimeUrl ||
      !BACKEND_CAPABILITIES.realtime
    ) {
      return;
    }

    let disposed = false;
    const handleEvent = (event: RealtimeEvent) => {
      if (event.type === "coworking.hello") {
        if (event.payload.fromUserId === currentUser.id) return;
        setHello({ fromUserId: event.payload.fromUserId, nonce: Date.now() });
        return;
      }
      if (event.type === "coworking.knock") {
        if (event.payload.fromUserId === currentUser.id) return;
        setKnock(event.payload);
        void playKnock();
        return;
      }
      if (event.type === "coworking.knock.resolved" && event.payload.status === "accepted" && event.payload.spaceId) {
        void joinSpace(event.payload.spaceId)
          .then(() => router.push(`/coworking/${encodeURIComponent(event.payload.spaceId!)}`))
          .catch(() => undefined);
      }
    };

    const client = new RealtimeClient({
      url: env.realtimeUrl,
      ticketProvider: async () => (await messagingApi.requestRealtimeTicket()).ticket,
      onEvent: handleEvent
    });
    realtimeRef.current = client;
    if (AppState.currentState === "active") client.connect();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") client.connect();
      else client.disconnect();
    });

    return () => {
      disposed = true;
      subscription.remove();
      client.disconnect();
      if (!disposed && realtimeRef.current === client) realtimeRef.current = null;
      if (realtimeRef.current === client) realtimeRef.current = null;
    };
  }, [currentUser.id, joinSpace, messagingApi, playKnock]);

  const answerKnock = async (accepted: boolean) => {
    if (!knock || responding) return;
    setResponding(true);
    try {
      if (mapApi) await mapApi.respondToKnock(knock.requestId, accepted);
      setKnock(null);
    } finally {
      setResponding(false);
    }
  };

  if (!hello && !knock) return null;

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {hello && helloMember ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${helloMember.name} vous dit bonjour`}
          onPress={() => {
            setHello(null);
            router.push(`/profile/${encodeURIComponent(helloMember.id)}`);
          }}
          style={[
            styles.hello,
            {
              top: Math.max(insets.top, 8) + 8,
              backgroundColor: theme.shellBackground,
              borderColor: theme.borderSoft
            }
          ]}
        >
          <StatusAvatar user={helloMember} size={42} accessible={false} />
          <View style={styles.copy}>
            <Text style={[styles.eyebrow, { color: theme.violet }]}>UN SIGNE DU COWORKING</Text>
            <Text numberOfLines={1} style={[styles.helloText, { color: theme.pageText }]}>
              {firstName(helloMember.name)} vous dit bonjour 👋
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.pageTextMuted} />
        </Pressable>
      ) : null}

      {knock && knockMember ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.knock,
            {
              top: Math.max(insets.top, 8) + 8,
              backgroundColor: theme.shellBackground,
              borderColor: theme.violet
            }
          ]}
        >
          <View style={styles.knockHead}>
            <View style={[styles.doorIcon, { backgroundColor: theme.violetSoft }]}>
              <Ionicons name="notifications-outline" size={20} color={theme.violet} />
            </View>
            <StatusAvatar user={knockMember} size={46} accessible={false} />
            <View style={styles.copy}>
              <Text style={[styles.knockTitle, { color: theme.pageText }]}>{firstName(knockMember.name)} toque à votre bureau</Text>
              <Text numberOfLines={1} style={[styles.knockMeta, { color: theme.pageTextMuted }]}>
                Souhaite rejoindre votre échange
              </Text>
            </View>
          </View>
          <View style={styles.knockActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pas maintenant"
              disabled={responding}
              onPress={() => void answerKnock(false)}
              style={[styles.knockSecondary, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}
            >
              <Text style={[styles.knockSecondaryText, { color: theme.pageText }]}>Pas maintenant</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Accepter le toquement"
              disabled={responding}
              onPress={() => void answerKnock(true)}
              style={[styles.knockPrimary, { backgroundColor: theme.violet }]}
            >
              {responding ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="enter-outline" size={18} color="#FFFFFF" />}
              <Text style={styles.knockPrimaryText}>Accepter</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000 },
  hello: {
    position: "absolute",
    left: 10,
    right: 10,
    minHeight: 62,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 24
  },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 9, lineHeight: 12, fontWeight: "900", letterSpacing: 0.55 },
  helloText: { marginTop: 2, fontSize: 13, lineHeight: 17, fontWeight: "900" },
  knock: {
    position: "absolute",
    left: 10,
    right: 10,
    borderRadius: 23,
    borderWidth: 1.5,
    padding: 10,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    elevation: 28
  },
  knockHead: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 8 },
  doorIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  knockTitle: { fontSize: 13, lineHeight: 17, fontWeight: "900" },
  knockMeta: { marginTop: 2, fontSize: 10, lineHeight: 13, fontWeight: "700" },
  knockActions: { minHeight: 50, flexDirection: "row", gap: 8 },
  knockSecondary: { flex: 1, minHeight: 50, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  knockSecondaryText: { fontSize: 11, fontWeight: "900" },
  knockPrimary: { flex: 1, minHeight: 50, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  knockPrimaryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" }
});
