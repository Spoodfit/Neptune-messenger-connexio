import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CoworkingGeographicMap from "../components/CoworkingGeographicMap";
import type { CoworkingMapMarker } from "../components/CoworkingGeographicMap.types";
import { StatusAvatar } from "../components/StatusAvatar";
import { env } from "../config/env";
import { useCoworking } from "../providers/CoworkingProvider";
import { useExperience } from "../providers/ExperienceProvider";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { CoworkingMapApi } from "../services/api/coworkingMapApi";
import { AppAlert } from "../services/ui/AppAlert";
import type { CoworkingMediaSession, CoworkingSpace } from "../types/coworking";
import type { AppUser } from "../types/messaging";

const AVAILABLE = "#35D58B";
const BUSY = "#FF5868";

type MarkerSelection = {
  marker: CoworkingMapMarker;
  member: AppUser;
  space?: CoworkingSpace;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function spaceForUser(userId: string, hub: CoworkingSpace, spaces: CoworkingSpace[]): CoworkingSpace | undefined {
  if (hub.participantIds.includes(userId)) return hub;
  return spaces.find((space) => space.participantIds.includes(userId));
}

export default function CoworkingMapScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentUser, accessToken } = useSession();
  const { members, mapMoments } = useExperience();
  const {
    serviceAvailable,
    snapshot,
    loading,
    refresh,
    joinSpace
  } = useCoworking();
  const mapApi = useMemo(() => (env.mockMode ? null : new CoworkingMapApi(accessToken)), [accessToken]);
  const [mapMedia, setMapMedia] = useState<CoworkingMediaSession | undefined>();
  const [mapCameraActive, setMapCameraActive] = useState(env.mockMode);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<"hello" | "knock" | "room" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!mapApi) {
      setMapCameraActive(true);
      return () => setMapCameraActive(false);
    }
    void mapApi
      .enterMap()
      .then(async ({ media }) => {
        if (!active) return;
        setMapMedia(media);
        setMapCameraActive(Boolean(media));
        await refresh().catch(() => undefined);
      })
      .catch(() => {
        if (active) setMapCameraActive(false);
      });
    return () => {
      active = false;
      setMapCameraActive(false);
      void mapApi.leaveMap().catch(() => undefined);
    };
  }, [mapApi, refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const allMembers = useMemo(() => {
    const byId = new Map<string, AppUser>();
    byId.set(currentUser.id, currentUser);
    for (const member of members) byId.set(member.id, member);
    return [...byId.values()];
  }, [currentUser, members]);

  const momentByUserId = useMemo(
    () => new Map(mapMoments.map((moment) => [moment.member.id, moment])),
    [mapMoments]
  );
  const presenceByUserId = useMemo(
    () => new Map(snapshot.participants.map((presence) => [presence.userId, presence])),
    [snapshot.participants]
  );

  const markers = useMemo<CoworkingMapMarker[]>(() => {
    const online = allMembers.filter((member) => member.online && momentByUserId.has(member.id));
    const grouped = new Map<string, AppUser[]>();
    const singles: AppUser[] = [];

    for (const member of online) {
      const space = spaceForUser(member.id, snapshot.hub, snapshot.spaces);
      if (!space) {
        singles.push(member);
        continue;
      }
      const list = grouped.get(space.id) ?? [];
      list.push(member);
      grouped.set(space.id, list);
    }

    const result: CoworkingMapMarker[] = [];
    for (const member of singles) {
      const moment = momentByUserId.get(member.id)!;
      const presence = presenceByUserId.get(member.id);
      result.push({
        id: `person:${member.id}`,
        latitude: moment.latitude,
        longitude: moment.longitude,
        city: member.city,
        availability: "available",
        members: [
          {
            id: member.id,
            name: member.name,
            initials: member.initials,
            avatarUrl: member.avatarUrl,
            cameraOn: member.id === currentUser.id ? mapCameraActive : Boolean(presence?.cameraOn)
          }
        ]
      });
    }

    for (const [spaceId, spaceMembers] of grouped) {
      const located = spaceMembers
        .map((member) => ({ member, moment: momentByUserId.get(member.id) }))
        .filter((item): item is { member: AppUser; moment: NonNullable<ReturnType<typeof momentByUserId.get>> } => Boolean(item.moment));
      if (located.length === 0) continue;
      const space = snapshot.hub.id === spaceId
        ? snapshot.hub
        : snapshot.spaces.find((candidate) => candidate.id === spaceId);
      const preferredAnchorId = space?.ownerId ?? space?.participantIds[0];
      const anchor = located.find(({ member }) => member.id === preferredAnchorId) ?? located[0];
      if (!anchor) continue;
      result.push({
        id: `space:${spaceId}`,
        latitude: anchor.moment.latitude,
        longitude: anchor.moment.longitude,
        city: anchor.member.city,
        availability: "busy",
        spaceId,
        members: located.map(({ member }) => {
          const presence = presenceByUserId.get(member.id);
          return {
            id: member.id,
            name: member.name,
            initials: member.initials,
            avatarUrl: member.avatarUrl,
            cameraOn: Boolean(presence?.cameraOn)
          };
        })
      });
    }

    return result;
  }, [allMembers, currentUser.id, mapCameraActive, momentByUserId, presenceByUserId, snapshot.hub, snapshot.spaces]);

  const selectedMarker = markers.find((marker) => marker.id === selectedMarkerId) ?? null;
  const selectedMember = selectedMarker
    ? allMembers.find((member) => member.id === (selectedMemberId ?? selectedMarker.members[0]?.id))
    : undefined;
  const selectedSpace = selectedMarker?.spaceId
    ? snapshot.hub.id === selectedMarker.spaceId
      ? snapshot.hub
      : snapshot.spaces.find((space) => space.id === selectedMarker.spaceId)
    : undefined;
  const selection: MarkerSelection | null = selectedMarker && selectedMember
    ? { marker: selectedMarker, member: selectedMember, space: selectedSpace }
    : null;

  const selectMarker = (markerId: string) => {
    const marker = markers.find((item) => item.id === markerId);
    setSelectedMarkerId(markerId);
    setSelectedMemberId(marker?.members[0]?.id ?? null);
  };

  const closeSelection = () => {
    setSelectedMarkerId(null);
    setSelectedMemberId(null);
  };

  const sayHello = async () => {
    if (!selection || actionBusy) return;
    setActionBusy("hello");
    try {
      if (mapApi) await mapApi.sayHello(selection.member.id);
      setNotice(`Bonjour envoyé à ${firstName(selection.member.name)} 👋`);
    } catch (error) {
      AppAlert.alert("Bonjour non envoyé", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    } finally {
      setActionBusy(null);
    }
  };

  const knock = async () => {
    if (!selection?.space || actionBusy) return;
    setActionBusy("knock");
    try {
      if (!mapApi) {
        setNotice(`Tu as toqué chez ${firstName(selection.member.name)} · en attente…`);
        return;
      }
      const result = await mapApi.knock({ userId: selection.member.id, spaceId: selection.space.id });
      if (result.status === "accepted") {
        await joinSpace(selection.space.id);
        closeSelection();
        router.push(`/coworking/${encodeURIComponent(selection.space.id)}`);
        return;
      }
      setNotice(
        result.status === "declined"
          ? `${firstName(selection.member.name)} n’est pas disponible maintenant.`
          : `Tu as toqué chez ${firstName(selection.member.name)} · demande envoyée.`
      );
    } catch (error) {
      AppAlert.alert("Impossible de toquer", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    } finally {
      setActionBusy(null);
    }
  };

  const openGeneralRoom = async () => {
    if (actionBusy) return;
    setActionBusy("room");
    try {
      await joinSpace(snapshot.hub.id);
      router.push(`/coworking/${encodeURIComponent(snapshot.hub.id)}`);
    } catch (error) {
      AppAlert.alert("Salle indisponible", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    } finally {
      setActionBusy(null);
    }
  };

  if (!serviceAvailable) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.pageBackground, paddingTop: insets.top + 24 }]}>
        <Ionicons name="map-outline" size={40} color={theme.violet} />
        <Text style={[styles.centeredTitle, { color: theme.pageText }]}>Coworking indisponible</Text>
        <Text style={[styles.centeredText, { color: theme.pageTextMuted }]}>La présence en ligne réapparaîtra dès que le service temps réel sera actif.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.returnButton, { backgroundColor: theme.surfaceStrong }]}>
          <Text style={[styles.returnButtonText, { color: theme.pageText }]}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const generalRoomCount = snapshot.hub.participantIds.length;
  const onlineCount = allMembers.filter((member) => member.online).length;

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <CoworkingGeographicMap
        markers={markers}
        mediaSession={mapMedia ?? snapshot.observerMedia}
        selectedMarkerId={selectedMarkerId}
        onSelectMarker={selectMarker}
        onLocationUnavailable={() => AppAlert.alert("Localisation indisponible", "Activez la localisation pour recentrer la carte autour de vous.")}
      />

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10), paddingHorizontal: 10 }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer le coworking"
          onPress={() => router.back()}
          style={[styles.circleButton, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}
        >
          <Ionicons name="close" size={21} color={theme.pageText} />
        </Pressable>
        <View style={[styles.titlePill, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <View style={styles.titleCopy}>
            <Text style={[styles.title, { color: theme.pageText }]}>Coworking</Text>
            <Text style={[styles.subtitle, { color: theme.pageTextMuted }]}>{loading ? "Actualisation…" : `${onlineCount} en ligne`}</Text>
          </View>
          <View
            accessibilityLabel={mapCameraActive ? "Caméra active sur la Map, micro coupé" : "Caméra inactive sur la Map"}
            style={[styles.cameraState, { backgroundColor: mapCameraActive ? theme.successSoft : theme.surfaceStrong }]}
          >
            <Ionicons name={mapCameraActive ? "videocam" : "videocam-off"} size={15} color={mapCameraActive ? theme.success : theme.pageTextMuted} />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualiser le coworking"
          onPress={() => void refresh()}
          style={[styles.circleButton, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}
        >
          {loading ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="refresh" size={19} color={theme.pageText} />}
        </Pressable>
      </View>

      <View style={[styles.legend, { top: Math.max(insets.top, 10) + 62, backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: AVAILABLE }]} /><Text style={[styles.legendText, { color: theme.pageText }]}>Disponible</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: BUSY }]} /><Text style={[styles.legendText, { color: theme.pageText }]}>Occupé</Text></View>
      </View>

      {selection ? (
        <View style={[styles.sheet, { bottom: Math.max(insets.bottom, 10) + 74, backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}> 
          <View style={styles.sheetTop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir le profil de ${selection.member.name}`}
              onPress={() => router.push(`/profile/${encodeURIComponent(selection.member.id)}`)}
              style={styles.identity}
            >
              <StatusAvatar user={selection.member} size={52} accessible={false} />
              <View style={styles.identityCopy}>
                <View style={styles.identityLine}>
                  <Text numberOfLines={1} style={[styles.memberName, { color: theme.pageText }]}>{selection.member.name}</Text>
                  <View style={[styles.availabilityPill, { borderColor: selection.marker.availability === "busy" ? BUSY : AVAILABLE }]}>
                    <View style={[styles.availabilityDot, { backgroundColor: selection.marker.availability === "busy" ? BUSY : AVAILABLE }]} />
                    <Text style={[styles.availabilityText, { color: theme.pageText }]}>{selection.marker.availability === "busy" ? "Occupé" : "Disponible"}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={[styles.memberMeta, { color: theme.pageTextMuted }]}>{selection.member.company}{selection.member.city ? ` · ${selection.member.city}` : ""}</Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fiche" onPress={closeSelection} style={styles.closeSheet}>
              <Ionicons name="close" size={20} color={theme.pageTextMuted} />
            </Pressable>
          </View>

          {selection.marker.members.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRail}>
              {selection.marker.members.map((cell) => {
                const member = allMembers.find((candidate) => candidate.id === cell.id);
                if (!member) return null;
                const active = member.id === selection.member.id;
                return (
                  <Pressable
                    key={member.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Sélectionner ${member.name}`}
                    onPress={() => setSelectedMemberId(member.id)}
                    style={[styles.groupMember, { borderColor: active ? theme.violet : theme.borderSoft, backgroundColor: theme.surfaceStrong }]}
                  >
                    <StatusAvatar user={member} size={34} accessible={false} />
                    <Text style={[styles.groupName, { color: theme.pageText }]}>{firstName(member.name)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Dire bonjour" disabled={Boolean(actionBusy)} onPress={() => void sayHello()} style={[styles.action, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
              <Ionicons name="hand-left-outline" size={20} color={theme.violet} />
              <Text style={[styles.actionText, { color: theme.pageText }]}>Dire bonjour</Text>
            </Pressable>
            {selection.space ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Toquer pour rejoindre la visio" disabled={Boolean(actionBusy)} onPress={() => void knock()} style={[styles.action, styles.primaryAction, { backgroundColor: theme.violet }]}>
                {actionBusy === "knock" ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />}
                <Text style={styles.primaryActionText}>Toquer</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Proposer un rendez-vous" onPress={() => router.push({ pathname: "/schedule-call", params: { memberId: selection.member.id, mode: "video" } })} style={[styles.iconAction, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.pageText} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rejoindre la salle générale"
        disabled={actionBusy === "room"}
        onPress={() => void openGeneralRoom()}
        style={({ pressed }) => [
          styles.generalRoom,
          {
            bottom: Math.max(insets.bottom, 10),
            backgroundColor: theme.shellBackground,
            borderColor: theme.borderSoft
          },
          pressed && styles.pressed
        ]}
      >
        <View style={[styles.roomIcon, { backgroundColor: theme.violetSoft }]}><Ionicons name="people" size={20} color={theme.violet} /></View>
        <View style={styles.roomCopy}>
          <Text style={[styles.roomTitle, { color: theme.pageText }]}>Salle générale</Text>
          <Text style={[styles.roomMeta, { color: theme.pageTextMuted }]}>{generalRoomCount > 0 ? `${generalRoomCount} personne${generalRoomCount > 1 ? "s" : ""} dedans · audio de proximité` : "Espace libre · audio de proximité"}</Text>
        </View>
        {actionBusy === "room" ? <ActivityIndicator size="small" color={theme.violet} /> : <Ionicons name="chevron-forward" size={20} color={theme.pageTextMuted} />}
      </Pressable>

      {notice ? (
        <View pointerEvents="none" style={[styles.notice, { bottom: Math.max(insets.bottom, 10) + 76, backgroundColor: theme.pageText }]}>
          <Text style={[styles.noticeText, { color: theme.pageBackground }]}>{notice}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, position: "relative", overflow: "hidden" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 10 },
  centeredTitle: { fontSize: 18, fontWeight: "900" },
  centeredText: { maxWidth: 360, textAlign: "center", fontSize: 13, lineHeight: 19 },
  returnButton: { minWidth: 110, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 8 },
  returnButtonText: { fontWeight: "900" },
  topBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  circleButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titlePill: { flex: 1, minHeight: 48, maxWidth: 244, paddingHorizontal: 12, borderRadius: 19, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9 },
  titleCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 18, fontWeight: "900" },
  subtitle: { marginTop: 1, fontSize: 10, lineHeight: 13, fontWeight: "700" },
  cameraState: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  legend: { position: "absolute", left: 12, minHeight: 34, paddingHorizontal: 9, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: "800" },
  sheet: { position: "absolute", left: 10, right: 10, borderRadius: 24, borderWidth: 1, padding: 11, gap: 10, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 15 },
  sheetTop: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 8 },
  identity: { flex: 1, minWidth: 0, minHeight: 54, flexDirection: "row", alignItems: "center", gap: 9 },
  identityCopy: { flex: 1, minWidth: 0 },
  identityLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  memberName: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  memberMeta: { marginTop: 2, fontSize: 11, lineHeight: 14, fontWeight: "700" },
  availabilityPill: { height: 24, borderRadius: 12, borderWidth: 1, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  availabilityDot: { width: 7, height: 7, borderRadius: 4 },
  availabilityText: { fontSize: 9, fontWeight: "900" },
  closeSheet: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  groupRail: { gap: 6, paddingVertical: 1 },
  groupMember: { minWidth: 72, minHeight: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  groupName: { maxWidth: 62, fontSize: 10, fontWeight: "800" },
  actions: { minHeight: 50, flexDirection: "row", gap: 7 },
  action: { flex: 1, minWidth: 0, minHeight: 50, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 10 },
  primaryAction: { borderWidth: 0 },
  actionText: { fontSize: 11, fontWeight: "900" },
  primaryActionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  iconAction: { width: 50, height: 50, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  generalRoom: { position: "absolute", left: 10, right: 10, minHeight: 62, borderRadius: 22, borderWidth: 1, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  roomIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  roomCopy: { flex: 1, minWidth: 0 },
  roomTitle: { fontSize: 13, lineHeight: 17, fontWeight: "900" },
  roomMeta: { marginTop: 1, fontSize: 10, lineHeight: 13, fontWeight: "700" },
  notice: { position: "absolute", left: 30, right: 30, minHeight: 44, borderRadius: 16, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 18 },
  noticeText: { textAlign: "center", fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] }
});
