import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CoworkingGeographicMap from "../components/CoworkingGeographicMap";
import type { CoworkingMapEventMarker, CoworkingMapMarker } from "../components/CoworkingGeographicMap.types";
import { StatusAvatar } from "../components/StatusAvatar";
import { env } from "../config/env";
import { discoveryEventsMock } from "../data/discoveryEventsMock";
import {
  getDiscoveryEventProximity,
  getDiscoveryEventState,
  nextDiscoveryEventTransitionAt,
  visibleDiscoveryEvents,
  type DiscoveryEvent
} from "../domain/discoveryEvents";
import { coworkingAvailability, coworkingSpaceHostId, participantPresence } from "../domain/coworking";
import { useCoworking } from "../providers/CoworkingProvider";
import { useExperience } from "../providers/ExperienceProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { CoworkingMapApi } from "../services/api/coworkingMapApi";
import { NeptuneEventsApi } from "../services/api/neptuneEventsApi";
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

function firstNameList(names: string[]): string {
  const unique = [...new Set(names.map(firstName).filter(Boolean))];
  if (unique.length <= 1) return unique[0] ?? "le groupe";
  if (unique.length === 2) return `${unique[0]} et ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")} et ${unique.at(-1)}`;
}

function activeSpaceForUser(userId: string, spaces: CoworkingSpace[]): CoworkingSpace | undefined {
  return spaces.find((space) => space.participantIds.includes(userId));
}

export default function UnifiedMapScreenV24() {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const theme = useAppTheme();
  const { localeTag } = useAppLanguage();
  const { currentUser, accessToken } = useSession();
  const { members, mapMoments } = useExperience();
  const {
    serviceAvailable,
    snapshot,
    loading,
    refresh,
    joinSpace,
    createSpace,
    currentSpace,
    updatePresence,
    leaveCurrentSpace
  } = useCoworking();
  const mapApi = useMemo(
    () => (!env.mockMode && serviceAvailable ? new CoworkingMapApi(accessToken) : null),
    [accessToken, serviceAvailable]
  );
  const eventsApi = useMemo(() => (env.mockMode ? null : new NeptuneEventsApi(accessToken)), [accessToken]);
  const [events, setEvents] = useState<DiscoveryEvent[]>(env.mockMode ? discoveryEventsMock : []);
  const [eventClock, setEventClock] = useState(() => Date.now());
  const [eventsLoading, setEventsLoading] = useState(false);
  const [mapMedia, setMapMedia] = useState<CoworkingMediaSession | undefined>();
  const [mapCameraActive, setMapCameraActive] = useState(env.mockMode);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<"hello" | "knock" | "presence" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadEvents = async () => {
    if (!eventsApi) return;
    setEventsLoading(true);
    try {
      setEvents(await eventsApi.listDiscoveryEvents());
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, [eventsApi]);

  useEffect(() => {
    const next = nextDiscoveryEventTransitionAt(events, eventClock);
    const delay = next === null
      ? 60_000
      : Math.max(250, Math.min(60_000, next - Date.now() + 25));
    const timer = setTimeout(() => setEventClock(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [eventClock, events]);

  useEffect(() => {
    let active = true;
    if (!mapApi) {
      setMapCameraActive(env.mockMode);
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
      const space = activeSpaceForUser(member.id, snapshot.spaces);
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
        availability: coworkingAvailability(presence, undefined),
        members: [{
          id: member.id,
          name: member.name,
          initials: member.initials,
          avatarUrl: member.avatarUrl,
          cameraOn: member.id === currentUser.id ? mapCameraActive : Boolean(presence?.cameraOn)
        }]
      });
    }

    for (const [spaceId, rawMembers] of grouped) {
      const space = snapshot.spaces.find((item) => item.id === spaceId);
      if (!space) continue;
      const orderedMembers = [...rawMembers].sort((left, right) => {
        if (left.id === space.ownerId) return -1;
        if (right.id === space.ownerId) return 1;
        return left.name.localeCompare(right.name);
      });
      const located = orderedMembers
        .map((member) => ({ member, moment: momentByUserId.get(member.id) }))
        .filter((item): item is { member: AppUser; moment: NonNullable<ReturnType<typeof momentByUserId.get>> } => Boolean(item.moment));
      if (located.length === 0) continue;
      const host = located.find((item) => item.member.id === space.ownerId) ?? located[0]!;
      result.push({
        id: `space:${spaceId}`,
        latitude: host.moment.latitude,
        longitude: host.moment.longitude,
        city: host.member.city,
        availability: "busy",
        spaceId,
        members: located.map(({ member }) => {
          const presence = presenceByUserId.get(member.id);
          return {
            id: member.id,
            name: member.name,
            initials: member.initials,
            avatarUrl: member.avatarUrl,
            cameraOn: member.id === currentUser.id ? mapCameraActive : Boolean(presence?.cameraOn)
          };
        })
      });
    }
    return result;
  }, [allMembers, currentUser.id, mapCameraActive, momentByUserId, presenceByUserId, snapshot.spaces]);

  const visibleEvents = useMemo(() => visibleDiscoveryEvents(events, "all", eventClock), [eventClock, events]);
  const eventMarkers = useMemo<CoworkingMapEventMarker[]>(
    () => visibleEvents.map((event) => ({
      id: event.id,
      title: event.title,
      latitude: event.latitude,
      longitude: event.longitude,
      proximity: getDiscoveryEventProximity(event, eventClock)
    })),
    [eventClock, visibleEvents]
  );

  const selectedMarker = markers.find((marker) => marker.id === selectedMarkerId) ?? null;
  const selectedMember = selectedMarker
    ? allMembers.find((member) => member.id === (selectedMemberId ?? selectedMarker.members[0]?.id))
    : undefined;
  const selectedSpace = selectedMarker?.spaceId
    ? snapshot.spaces.find((space) => space.id === selectedMarker.spaceId)
    : undefined;
  const selection: MarkerSelection | null = selectedMarker && selectedMember
    ? { marker: selectedMarker, member: selectedMember, space: selectedSpace }
    : null;
  const selectedEvent = selectedEventId ? visibleEvents.find((event) => event.id === selectedEventId) : undefined;

  const selectMarker = (markerId: string) => {
    const marker = markers.find((item) => item.id === markerId);
    setSelectedEventId(null);
    setSelectedMarkerId(markerId);
    setSelectedMemberId(marker?.members[0]?.id ?? null);
  };

  const selectEvent = (eventId: string) => {
    setSelectedMarkerId(null);
    setSelectedMemberId(null);
    setSelectedEventId(eventId);
  };

  const closeSelection = () => {
    setSelectedMarkerId(null);
    setSelectedMemberId(null);
    setSelectedEventId(null);
  };

  const sayHello = async () => {
    if (!selection || actionBusy || selection.member.id === currentUser.id) return;
    setActionBusy("hello");
    try {
      if (mapApi) {
        await mapApi.sayHello(selection.space
          ? { spaceId: selection.space.id }
          : { userId: selection.member.id });
      }
      const recipients = selection.space
        ? firstNameList(selection.marker.members.map((member) => member.name))
        : firstName(selection.member.name);
      setNotice(`Bonjour envoyé à ${recipients} 👋`);
    } catch (error) {
      AppAlert.alert("Bonjour non envoyé", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    } finally {
      setActionBusy(null);
    }
  };

  const enterSpace = async (spaceId: string) => {
    await joinSpace(spaceId);
    closeSelection();
    router.push(`/coworking/${encodeURIComponent(spaceId)}`);
  };

  const createDirectSpace = async (member: AppUser) => {
    const created = await createSpace({
      name: `Échange avec ${firstName(member.name)}`,
      kind: "private",
      access: "invite",
      invitedUserIds: [member.id],
      activity: "Échange spontané"
    });
    closeSelection();
    router.push(`/coworking/${encodeURIComponent(created.spaceId)}`);
  };

  const knock = async () => {
    if (!selection || actionBusy || selection.member.id === currentUser.id) return;
    const busy = Boolean(selection.space);
    setActionBusy("knock");
    try {
      if (!busy && !mapApi) {
        await createDirectSpace(selection.member);
        return;
      }
      if (busy && !mapApi) {
        const hostId = selection.space ? coworkingSpaceHostId(selection.space) : undefined;
        const host = hostId ? allMembers.find((member) => member.id === hostId) : undefined;
        setNotice(`Demande envoyée à ${host ? firstName(host.name) : "l’hôte"} · en attente d’autorisation…`);
        return;
      }

      const result = await mapApi!.knock(selection.space
        ? { spaceId: selection.space.id }
        : { userId: selection.member.id });

      if (result.status === "declined") {
        setNotice(`${firstName(selection.member.name)} n’est pas disponible maintenant.`);
        return;
      }

      if (result.status === "accepted") {
        const destination = result.spaceId ?? selection.space?.id;
        if (destination) {
          await enterSpace(destination);
          return;
        }
        await createDirectSpace(selection.member);
        return;
      }

      setNotice(
        busy
          ? `Tu as toqué à l’espace · autorisation de l’hôte demandée.`
          : `Tu as toqué chez ${firstName(selection.member.name)} · connexion en cours…`
      );
    } catch (error) {
      AppAlert.alert("Impossible de toquer", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    } finally {
      setActionBusy(null);
    }
  };

  const refreshAll = async () => {
    await Promise.all([refresh().catch(() => undefined), loadEvents().catch(() => undefined)]);
  };

  const onlineCount = allMembers.filter((member) => member.online && momentByUserId.has(member.id)).length;
  const refreshing = loading || eventsLoading;
  const compactHeader = viewportWidth < 340;
  const ownPresence = participantPresence(snapshot, currentUser.id);
  const ownAvailability = coworkingAvailability(ownPresence, currentSpace);

  const applyAvailability = async (next: "available" | "busy") => {
    if (actionBusy) return;
    setActionBusy("presence");
    try {
      await updatePresence(next === "available" ? "available" : "focus", next === "available" ? "Disponible" : "Occupé");
      setNotice(next === "available" ? "Vous êtes maintenant disponible" : "Vous êtes maintenant occupé");
    } catch (error) {
      AppAlert.alert("Disponibilité non modifiée", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    } finally {
      setActionBusy(null);
    }
  };

  const toggleAvailability = () => {
    if (!currentSpace) {
      void applyAvailability(ownAvailability === "available" ? "busy" : "available");
      return;
    }
    AppAlert.alert(
      "Quitter l’échange pour devenir disponible ?",
      "Vous ne pouvez pas apparaître disponible tout en restant dans une visio active.",
      [
        { text: "Rester dans l’échange", style: "cancel" },
        {
          text: "Quitter et passer disponible",
          style: "destructive",
          onPress: () => {
            setActionBusy("presence");
            void leaveCurrentSpace()
              .then(() => updatePresence("available", "Disponible"))
              .then(() => setNotice("Vous êtes maintenant disponible"))
              .catch((error: unknown) => AppAlert.alert("Disponibilité non modifiée", error instanceof Error ? error.message : "Réessayez dans quelques instants."))
              .finally(() => setActionBusy(null));
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <CoworkingGeographicMap
        markers={markers}
        events={eventMarkers}
        mediaSession={mapMedia ?? snapshot.observerMedia}
        selectedMarkerId={selectedMarkerId}
        selectedEventId={selectedEventId}
        onSelectMarker={selectMarker}
        onSelectEvent={selectEvent}
        onLocationUnavailable={() => AppAlert.alert("Localisation indisponible", "Activez la localisation pour recentrer la carte autour de vous.")}
      />

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10), paddingHorizontal: 10 }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer la Map" onPress={() => router.back()} style={[styles.circleButton, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <Ionicons name="close" size={21} color={theme.pageText} />
        </Pressable>
        <View style={[styles.titlePill, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <View style={styles.titleCopy}>
            <Text style={[styles.title, { color: theme.pageText }]}>Map</Text>
            {!compactHeader ? <Text style={[styles.subtitle, { color: theme.pageTextMuted }]}>{`${onlineCount} en ligne · ${visibleEvents.length} évènement${visibleEvents.length > 1 ? "s" : ""}`}</Text> : null}
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={`Ma disponibilité : ${ownAvailability === "available" ? "Disponible" : "Occupé"}`}
            accessibilityHint="Touchez pour modifier votre disponibilité"
            accessibilityState={{ checked: ownAvailability === "available", disabled: Boolean(actionBusy) }}
            disabled={Boolean(actionBusy)}
            onPress={toggleAvailability}
            style={[styles.ownStatus, { backgroundColor: theme.surfaceStrong, borderColor: ownAvailability === "available" ? AVAILABLE : BUSY }]}
          >
            {actionBusy === "presence" ? <ActivityIndicator size="small" color={theme.pageText} /> : <View style={[styles.ownStatusDot, { backgroundColor: ownAvailability === "available" ? AVAILABLE : BUSY }]} />}
            <Text numberOfLines={1} style={[styles.ownStatusText, { color: theme.pageText }]}>{ownAvailability === "available" ? "Dispo" : "Occupé"}</Text>
            {mapCameraActive && !compactHeader ? <Ionicons name="videocam" size={12} color={theme.success} /> : null}
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Actualiser la Map" onPress={() => void refreshAll()} style={[styles.circleButton, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          {refreshing ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="refresh" size={19} color={theme.pageText} />}
        </Pressable>
      </View>

      <View style={[styles.legend, { top: Math.max(insets.top, 10) + 62, backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: AVAILABLE }]} /><Text style={[styles.legendText, { color: theme.pageText }]}>Disponible</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: BUSY }]} /><Text style={[styles.legendText, { color: theme.pageText }]}>Occupé</Text></View>
        <View style={styles.legendItem}><Ionicons name="flag" size={13} color={theme.accent} /><Text style={[styles.legendText, { color: theme.pageText }]}>Évènement</Text></View>
      </View>

      {selection ? (
        <View style={[styles.sheet, { bottom: Math.max(insets.bottom, 10), backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}> 
          <View style={styles.sheetTop}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir le profil de ${selection.member.name}`} onPress={() => router.push(`/profile/${encodeURIComponent(selection.member.id)}`)} style={styles.identity}>
              <StatusAvatar user={selection.member} size={52} accessible={false} />
              <View style={styles.identityCopy}>
                <View style={styles.identityLine}>
                  <Text numberOfLines={1} style={[styles.memberName, { color: theme.pageText }]}>{selection.member.name}</Text>
                  <Text style={[styles.availabilityText, { color: selection.space ? BUSY : AVAILABLE }]}>{selection.space ? "Occupé" : "Disponible"}</Text>
                </View>
                <Text numberOfLines={1} style={[styles.memberMeta, { color: theme.pageTextMuted }]}>{selection.member.company}{selection.member.city ? ` · ${selection.member.city}` : ""}</Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fiche" onPress={closeSelection} style={styles.closeSheet}><Ionicons name="close" size={20} color={theme.pageTextMuted} /></Pressable>
          </View>

          {selection.marker.members.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRail}>
              {selection.marker.members.map((cell) => {
                const member = allMembers.find((candidate) => candidate.id === cell.id);
                if (!member) return null;
                const active = member.id === selection.member.id;
                return (
                  <Pressable key={member.id} accessibilityRole="button" accessibilityLabel={`Sélectionner ${member.name}`} onPress={() => setSelectedMemberId(member.id)} style={[styles.groupMember, { borderColor: active ? theme.violet : theme.borderSoft, backgroundColor: theme.surfaceStrong }]}>
                    <StatusAvatar user={member} size={34} accessible={false} />
                    <Text style={[styles.groupName, { color: theme.pageText }]}>{firstName(member.name)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {selection.member.id !== currentUser.id ? (
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={selection.space ? "Dire bonjour au groupe" : "Dire bonjour"} disabled={Boolean(actionBusy)} onPress={() => void sayHello()} style={[styles.action, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
                <Ionicons name="hand-left-outline" size={19} color={theme.violet} />
                <Text style={[styles.actionText, { color: theme.pageText }]}>{selection.space ? "Bonjour au groupe" : "Bonjour"}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={selection.space ? "Toquer à l’espace et demander l’autorisation d’entrer" : "Toquer et entrer"} disabled={Boolean(actionBusy)} onPress={() => void knock()} style={[styles.action, styles.primaryAction, { backgroundColor: selection.space ? BUSY : AVAILABLE }]}>
                {actionBusy === "knock" ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name={selection.space ? "notifications-outline" : "enter-outline"} size={19} color="#FFFFFF" />}
                <Text style={styles.primaryActionText}>{selection.space ? "Toquer à l’espace" : "Toquer & entrer"}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Proposer un rendez-vous" onPress={() => router.push({ pathname: "/schedule-call", params: { memberId: selection.member.id, mode: "video" } })} style={[styles.iconAction, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
                <Ionicons name="calendar-outline" size={20} color={theme.pageText} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {selectedEvent ? (
        <View style={[styles.sheet, { bottom: Math.max(insets.bottom, 10), backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}> 
          <View style={styles.sheetTop}>
            <View style={[styles.eventIcon, { backgroundColor: theme.accentSoft }]}><Ionicons name="flag" size={22} color={theme.accent} /></View>
            <View style={styles.identityCopy}>
              <Text numberOfLines={2} style={[styles.eventTitle, { color: theme.pageText }]}>{selectedEvent.title}</Text>
              <Text numberOfLines={1} style={[styles.memberMeta, { color: theme.pageTextMuted }]}>
                {getDiscoveryEventState(selectedEvent, eventClock) === "live"
                  ? "En cours"
                  : getDiscoveryEventState(selectedEvent, eventClock) === "recent"
                    ? "Terminé récemment"
                    : getDiscoveryEventState(selectedEvent, eventClock) === "voting"
                      ? "Vote en cours"
                      : new Date(selectedEvent.startsAt).toLocaleString(localeTag, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{selectedEvent.city ? ` · ${selectedEvent.city}` : ""}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fiche" onPress={closeSelection} style={styles.closeSheet}><Ionicons name="close" size={20} color={theme.pageTextMuted} /></Pressable>
          </View>
          {selectedEvent.summary ? <Text numberOfLines={3} style={[styles.eventSummary, { color: theme.pageTextSecondary }]}>{selectedEvent.summary}</Text> : null}
          {selectedEvent.webUrl ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Voir l’évènement" onPress={() => void Linking.openURL(selectedEvent.webUrl!)} style={[styles.eventCta, { backgroundColor: theme.accent }]}>
              <Text style={styles.eventCtaText}>Voir l’évènement</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

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
  topBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  circleButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titlePill: { flex: 1, minHeight: 52, maxWidth: 252, paddingLeft: 12, paddingRight: 4, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  titleCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 18, fontWeight: "900" },
  subtitle: { marginTop: 1, fontSize: 10, lineHeight: 13, fontWeight: "700" },
  ownStatus: { minWidth: 68, minHeight: 48, borderRadius: 18, borderWidth: 1, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  ownStatusDot: { width: 8, height: 8, borderRadius: 4 },
  ownStatusText: { maxWidth: 44, fontSize: 9, lineHeight: 12, fontWeight: "900" },
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
  availabilityText: { fontSize: 10, lineHeight: 13, fontWeight: "900" },
  closeSheet: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  groupRail: { gap: 6, paddingVertical: 1 },
  groupMember: { minWidth: 72, minHeight: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  groupName: { maxWidth: 62, fontSize: 10, fontWeight: "800" },
  actions: { minHeight: 50, flexDirection: "row", gap: 7 },
  action: { flex: 1, minWidth: 0, minHeight: 50, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8 },
  primaryAction: { borderWidth: 0 },
  actionText: { fontSize: 10, fontWeight: "900" },
  primaryActionText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  iconAction: { width: 50, height: 50, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  eventIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  eventTitle: { fontSize: 14, lineHeight: 18, fontWeight: "900" },
  eventSummary: { fontSize: 11, lineHeight: 16, fontWeight: "700" },
  eventCta: { minHeight: 48, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  eventCtaText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  notice: { position: "absolute", left: 30, right: 30, minHeight: 44, borderRadius: 16, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 18 },
  noticeText: { textAlign: "center", fontSize: 11, fontWeight: "900" }
});
