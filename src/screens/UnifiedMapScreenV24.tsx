import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CoworkingGeographicMap from "../components/CoworkingGeographicMap";
import { CoworkingActionMotion } from "../components/CoworkingActionMotion";
import type {
  CoworkingMapClusterSelection,
  CoworkingMapEventMarker,
  CoworkingMapMarker
} from "../components/CoworkingGeographicMap.types";
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
import { coworkingAvailability, coworkingMapPrimaryAction, coworkingSpaceHostId, participantPresence } from "../domain/coworking";
import { isFreeRole } from "../domain/accessPolicy";
import { useCoworking } from "../providers/CoworkingProvider";
import { useExperience } from "../providers/ExperienceProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { CoworkingMapApi } from "../services/api/coworkingMapApi";
import { ApiError } from "../services/api/httpClient";
import { NeptuneEventsApi } from "../services/api/neptuneEventsApi";
import { emitCoworkingActionFeedback, type CoworkingActionFeedback } from "../services/coworking/coworkingActionFeedback";
import {
  interactionCooldownRemaining,
  releaseCoworkingInteraction,
  reserveCoworkingInteraction
} from "../services/coworking/coworkingInteractionGuard";
import { AppAlert } from "../services/ui/AppAlert";
import type { CoworkingMediaSession, CoworkingSpace } from "../types/coworking";
import type { AppUser } from "../types/messaging";

const AVAILABLE = "#35D58B";
const BUSY = "#FF5868";
const OFFLINE = "#8590A8";

const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  carcassonne: { latitude: 43.213, longitude: 2.351 },
  toulouse: { latitude: 43.6045, longitude: 1.444 },
  montpellier: { latitude: 43.611, longitude: 3.877 },
  narbonne: { latitude: 43.1843, longitude: 3.0031 },
  limoux: { latitude: 43.0549, longitude: 2.218 },
  limoges: { latitude: 45.8336, longitude: 1.2611 },
  eaubonne: { latitude: 48.9971, longitude: 2.2825 },
  cambrai: { latitude: 50.1767, longitude: 3.2356 }
};

function normalizedCity(value: string): string {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

function cityLocation(member: AppUser): { latitude: number; longitude: number } | undefined {
  const base = CITY_COORDINATES[normalizedCity(member.city)];
  if (!base) return undefined;
  const seed = [...member.id].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 997, 17);
  const angle = (seed / 997) * Math.PI * 2;
  const radius = 0.006 + (seed % 7) * 0.0012;
  return { latitude: base.latitude + Math.sin(angle) * radius, longitude: base.longitude + Math.cos(angle) * radius };
}

type MarkerSelection = {
  marker: CoworkingMapMarker;
  member: AppUser;
  space?: CoworkingSpace;
};

type RadarMode = "all" | "available" | "events";

const RADAR_MODES: Array<{
  value: RadarMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "all", label: "Tout", icon: "layers-outline" },
  { value: "available", label: "Disponibles", icon: "videocam-outline" },
  { value: "events", label: "Évènements", icon: "calendar-outline" }
];

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

function eventStatusLabel(event: DiscoveryEvent, now: number): string {
  const state = getDiscoveryEventState(event, now);
  if (state === "live") return "En cours maintenant";
  if (state === "recent") return "Terminé récemment";
  if (state === "voting") return "Vote en cours";
  return "À venir";
}

function eventActionLabel(event: DiscoveryEvent, now: number): string {
  const state = getDiscoveryEventState(event, now);
  if (state === "voting") return "Voter pour cet évènement";
  if (state === "live") return "Participer maintenant";
  return "S’inscrire à l’évènement";
}

export default function UnifiedMapScreenV24() {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const theme = useAppTheme();
  const { localeTag, t } = useAppLanguage();
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
  const [selectedCluster, setSelectedCluster] = useState<CoworkingMapClusterSelection | null>(null);
  const [radarMode, setRadarMode] = useState<RadarMode>("all");
  const [actionBusy, setActionBusy] = useState<"hello" | "invite" | "knock" | "presence" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [localMotion, setLocalMotion] = useState<CoworkingActionFeedback | null>(null);
  const [interactionClock, setInteractionClock] = useState(() => Date.now());
  const tabBarClearance = 92;

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

  useEffect(() => {
    if (!selectedMarkerId) return;
    const timer = setInterval(() => setInteractionClock(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [selectedMarkerId]);

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
    const eligible = allMembers.filter((member) => !isFreeRole(member.role) && (momentByUserId.has(member.id) || cityLocation(member)));
    const grouped = new Map<string, AppUser[]>();
    const singles: AppUser[] = [];

    for (const member of eligible) {
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
      const moment = momentByUserId.get(member.id) ?? cityLocation(member)!;
      const presence = presenceByUserId.get(member.id);
      result.push({
        id: `person:${member.id}`,
        latitude: moment.latitude,
        longitude: moment.longitude,
        city: member.city,
        availability: member.online ? coworkingAvailability(presence, undefined) : "offline",
        members: [{
          id: member.id,
          name: member.name,
          initials: member.initials,
          avatarUrl: member.avatarUrl,
          cameraOn: member.id === currentUser.id ? mapCameraActive : Boolean(presence?.cameraOn),
          isCurrentUser: member.id === currentUser.id
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
        .map((member) => ({ member, moment: momentByUserId.get(member.id) ?? cityLocation(member) }))
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
            cameraOn: member.id === currentUser.id ? mapCameraActive : Boolean(presence?.cameraOn),
            isCurrentUser: member.id === currentUser.id
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
      proximity: getDiscoveryEventProximity(event, eventClock),
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      city: event.city,
      publicationState: event.publicationState
    })),
    [eventClock, visibleEvents]
  );

  const displayedMarkers = useMemo(
    () => radarMode === "events"
      ? []
      : radarMode === "available"
        ? markers.filter((marker) => marker.availability === "available")
        : markers,
    [markers, radarMode]
  );
  const displayedEventMarkers = radarMode === "available" ? [] : eventMarkers;
  const focusLocation = momentByUserId.get(currentUser.id) ?? cityLocation(currentUser);
  const availableMembers = useMemo(() => {
    const ids = new Set<string>();
    for (const marker of markers) {
      if (marker.availability !== "available") continue;
      for (const member of marker.members) {
        if (member.id !== currentUser.id) ids.add(member.id);
      }
    }
    return [...ids].map((id) => allMembers.find((member) => member.id === id)).filter((member): member is AppUser => Boolean(member));
  }, [allMembers, currentUser.id, markers]);
  const nextEvent = visibleEvents.find((event) => getDiscoveryEventState(event, eventClock) !== "recent");
  const clusterMarkers = selectedCluster
    ? markers.filter((marker) => selectedCluster.markerIds.includes(marker.id))
    : [];
  const clusterEvents = selectedCluster
    ? visibleEvents.filter((event) => selectedCluster.eventIds.includes(event.id))
    : [];

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
  const interactionTargetKey = selection?.space
    ? `space:${selection.space.id}`
    : selection ? `user:${selection.member.id}` : "none";
  const helloCooldownSeconds = Math.ceil(interactionCooldownRemaining("hello", interactionTargetKey, interactionClock) / 1_000);
  const knockCooldownSeconds = Math.ceil(interactionCooldownRemaining("knock", interactionTargetKey, interactionClock) / 1_000);
  const selectedEvent = selectedEventId ? visibleEvents.find((event) => event.id === selectedEventId) : undefined;

  const selectMarker = (markerId: string) => {
    const marker = markers.find((item) => item.id === markerId);
    setSelectedCluster(null);
    setSelectedEventId(null);
    setSelectedMarkerId(markerId);
    setSelectedMemberId(marker?.members[0]?.id ?? null);
  };

  const selectEvent = (eventId: string) => {
    setSelectedCluster(null);
    setSelectedMarkerId(null);
    setSelectedMemberId(null);
    setSelectedEventId(eventId);
  };

  const closeSelection = () => {
    setSelectedCluster(null);
    setSelectedMarkerId(null);
    setSelectedMemberId(null);
    setSelectedEventId(null);
  };

  const selectCluster = (clusterSelection: CoworkingMapClusterSelection) => {
    setSelectedMarkerId(null);
    setSelectedMemberId(null);
    setSelectedEventId(null);
    setSelectedCluster(clusterSelection);
  };

  const changeRadarMode = (mode: RadarMode) => {
    closeSelection();
    setRadarMode(mode);
  };

  const sayHello = async () => {
    if (!selection || actionBusy || selection.member.id === currentUser.id) return;
    const reservation = reserveCoworkingInteraction("hello", interactionTargetKey);
    if (!reservation.allowed) {
      setNotice(`Bonjour déjà envoyé · réessayez dans ${Math.ceil(reservation.remainingMs / 1_000)} s`);
      return;
    }
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
      const message = selection.space ? "Bonjour envoyé à tout l’espace" : `Bonjour envoyé à ${recipients}`;
      setLocalMotion({ id: Date.now(), type: "hello", message });
      setInteractionClock(Date.now());
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 429)) {
        releaseCoworkingInteraction("hello", interactionTargetKey);
      }
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

  const runPrimaryAction = async () => {
    if (!selection || actionBusy || selection.member.id === currentUser.id) return;
    const primaryAction = coworkingMapPrimaryAction(selection.marker.availability, selection.space);
    if (primaryAction === "none") return;
    if (primaryAction === "knock-space") {
      const reservation = reserveCoworkingInteraction("knock", interactionTargetKey);
      if (!reservation.allowed) {
        setNotice(`Toquement déjà envoyé · réessayez dans ${Math.ceil(reservation.remainingMs / 1_000)} s`);
        return;
      }
    }
    setActionBusy(primaryAction === "invite-video" ? "invite" : "knock");
    try {
      if (primaryAction === "invite-video") {
        await createDirectSpace(selection.member);
        return;
      }

      const targetSpace = selection.space;
      if (!targetSpace) return;
      if (!mapApi) {
        const hostId = coworkingSpaceHostId(targetSpace);
        const host = hostId ? allMembers.find((member) => member.id === hostId) : undefined;
        emitCoworkingActionFeedback({ type: "knock", message: `Demande envoyée à ${host ? firstName(host.name) : "l’hôte"}` });
        setInteractionClock(Date.now());
        return;
      }

      const result = await mapApi.knock({ spaceId: targetSpace.id });
      emitCoworkingActionFeedback({
        type: "knock",
        message: "Vous avez toqué à l’espace"
      });

      if (result.status === "declined") {
        setNotice(`${firstName(selection.member.name)} n’est pas disponible maintenant.`);
        return;
      }

      if (result.status === "accepted") {
        const destination = result.spaceId ?? targetSpace.id;
        if (destination) {
          await enterSpace(destination);
          return;
        }
      }

      setInteractionClock(Date.now());
    } catch (error) {
      if (primaryAction === "knock-space" && !(error instanceof ApiError && error.status === 429)) {
        releaseCoworkingInteraction("knock", interactionTargetKey);
      }
      AppAlert.alert("Impossible de toquer", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    } finally {
      setActionBusy(null);
    }
  };

  const refreshAll = async () => {
    await Promise.all([refresh().catch(() => undefined), loadEvents().catch(() => undefined)]);
  };

  const eligibleMemberCount = allMembers.filter((member) => !isFreeRole(member.role)).length;
  const refreshing = loading || eventsLoading;
  const compactHeader = viewportWidth < 360;
  const ownPresence = participantPresence(snapshot, currentUser.id);
  const ownAvailability = coworkingAvailability(ownPresence, currentSpace);
  const selectionPrimaryAction = selection
    ? coworkingMapPrimaryAction(selection.marker.availability, selection.space)
    : "none";
  const radarSummary = radarMode === "available"
    ? `${availableMembers.length} disponibles maintenant`
    : radarMode === "events"
      ? `${visibleEvents.length} évènements à découvrir`
      : `${eligibleMemberCount} membres · ${visibleEvents.length} évènements`;
  const controlsTop = Math.max(insets.top, 10) + 120;

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
        markers={displayedMarkers}
        events={displayedEventMarkers}
        mediaSession={mapMedia ?? snapshot.observerMedia}
        focusLocation={focusLocation}
        controlsTop={controlsTop}
        selectedMarkerId={selectedMarkerId}
        selectedEventId={selectedEventId}
        onSelectMarker={selectMarker}
        onSelectEvent={selectEvent}
        onSelectCluster={selectCluster}
        onLocationUnavailable={() => AppAlert.alert("Localisation indisponible", "Activez la localisation pour recentrer la carte autour de vous.")}
      />

      {localMotion ? <CoworkingActionMotion feedback={localMotion} onFinished={() => setLocalMotion(null)} /> : null}

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10), paddingHorizontal: 10 }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer la Map" onPress={() => router.back()} style={[styles.circleButton, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <Ionicons name="close" size={21} color={theme.pageText} />
        </Pressable>
        <View style={[styles.titlePill, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <View style={styles.titleCopy}>
            <Text style={[styles.title, { color: theme.pageText }]}>Radar Connexio</Text>
            <Text numberOfLines={1} style={[styles.subtitle, { color: theme.pageTextMuted }]}>{radarSummary}</Text>
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
            <Text numberOfLines={1} style={[styles.ownStatusText, { color: theme.pageText }]}>
              {ownAvailability === "available" ? (compactHeader ? "Ouvert" : "Moi · ouvert") : (compactHeader ? "Occupé" : "Moi · occupé")}
            </Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Actualiser la Map" onPress={() => void refreshAll()} style={[styles.circleButton, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          {refreshing ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="refresh" size={19} color={theme.pageText} />}
        </Pressable>
      </View>

      <View
        accessibilityRole="tablist"
        style={[styles.modeRail, { top: Math.max(insets.top, 10) + 62, backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}
      >
        {RADAR_MODES.map((mode) => {
          const active = radarMode === mode.value;
          return (
            <Pressable
              key={mode.value}
              accessibilityRole="tab"
              accessibilityLabel={t(mode.value === "all" ? "Afficher tous les membres et évènements" : mode.value === "available" ? "Afficher les membres disponibles" : "Afficher les évènements")}
              accessibilityState={{ selected: active }}
              onPress={() => changeRadarMode(mode.value)}
              style={({ pressed }) => [
                styles.modeButton,
                active && { backgroundColor: mode.value === "available" ? theme.success : theme.violet },
                pressed && styles.pressed
              ]}
            >
              {!compactHeader ? <Ionicons name={mode.icon} size={16} color={active ? "#FFFFFF" : theme.pageTextMuted} /> : null}
              <Text numberOfLines={1} style={[styles.modeLabel, { color: active ? "#FFFFFF" : theme.pageText }]}>{mode.label}</Text>
              {mode.value !== "all" && !compactHeader ? (
                <Text style={[styles.modeCount, { color: active ? "#FFFFFF" : theme.pageTextMuted }]}>
                  {mode.value === "available" ? availableMembers.length : visibleEvents.length}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {selection ? (
        <View style={[styles.sheet, { bottom: tabBarClearance, backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <View style={styles.sheetTop}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir le profil de ${selection.member.name}`} onPress={() => router.push(`/profile/${encodeURIComponent(selection.member.id)}`)} style={styles.identity}>
              <StatusAvatar user={selection.member} size={54} accessible={false} />
              <View style={styles.identityCopy}>
                <Text numberOfLines={1} style={[styles.memberName, { color: theme.pageText }]}>{selection.member.name}</Text>
                <Text numberOfLines={1} style={[styles.memberMeta, { color: theme.pageTextMuted }]}>{selection.member.company}{selection.member.city ? ` · ${selection.member.city}` : ""}</Text>
                <View style={styles.statusLine}>
                  <View style={[styles.statusDot, { backgroundColor: selection.marker.availability === "busy" ? BUSY : selection.marker.availability === "offline" ? OFFLINE : AVAILABLE }]} />
                  <Text style={[styles.availabilityText, { color: selection.marker.availability === "busy" ? BUSY : selection.marker.availability === "offline" ? OFFLINE : AVAILABLE }]}>
                    {selection.space ? `Visio en cours · ${selection.marker.members.length} personnes` : selection.marker.availability === "offline" ? "Hors ligne" : selection.marker.availability === "busy" ? "Occupé maintenant" : "Disponible maintenant"}
                  </Text>
                </View>
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
                    <Text numberOfLines={1} style={[styles.groupName, { color: theme.pageText }]}>{firstName(member.name)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {selection.member.id !== currentUser.id ? (
            <>
              <View style={styles.supportActions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Écrire un message" onPress={() => router.push({ pathname: "/new-conversation", params: { memberId: selection.member.id } })} style={[styles.supportAction, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={19} color={theme.pageText} />
                  <Text style={[styles.supportActionText, { color: theme.pageText }]}>Message</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={selection.space ? "Dire bonjour au groupe" : "Dire bonjour"} disabled={Boolean(actionBusy)} onPress={() => void sayHello()} style={[styles.supportAction, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
                  <Ionicons name="hand-left-outline" size={19} color={theme.violet} />
                  <Text style={[styles.supportActionText, { color: theme.pageText }]}>{helloCooldownSeconds > 0 ? `${helloCooldownSeconds}s` : "Bonjour"}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Proposer un rendez-vous" onPress={() => router.push({ pathname: "/schedule-call", params: { memberId: selection.member.id, mode: "video" } })} style={[styles.supportAction, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
                  <Ionicons name="calendar-outline" size={19} color={theme.pageText} />
                  <Text style={[styles.supportActionText, { color: theme.pageText }]}>Rendez-vous</Text>
                </Pressable>
              </View>
              {selectionPrimaryAction !== "none" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={selectionPrimaryAction === "knock-space" ? "Toquer à l’espace et demander l’autorisation d’entrer" : "Inviter en visio"}
                  disabled={Boolean(actionBusy)}
                  onPress={() => void runPrimaryAction()}
                  style={[styles.primaryCta, { backgroundColor: selectionPrimaryAction === "knock-space" ? BUSY : theme.success }]}
                >
                  {actionBusy === "knock" || actionBusy === "invite" ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name={selectionPrimaryAction === "knock-space" ? "notifications-outline" : "videocam-outline"} size={20} color="#FFFFFF" />}
                  <Text style={styles.primaryActionText}>{selectionPrimaryAction === "knock-space" && knockCooldownSeconds > 0 ? `Patientez ${knockCooldownSeconds}s` : selectionPrimaryAction === "knock-space" ? "Toquer pour rejoindre la visio" : `Démarrer une visio avec ${firstName(selection.member.name)}`}</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir mon profil" onPress={() => router.push(`/profile/${encodeURIComponent(currentUser.id)}`)} style={[styles.profileCta, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
              <Text style={[styles.profileCtaText, { color: theme.pageText }]}>Ouvrir mon profil</Text><Ionicons name="arrow-forward" size={17} color={theme.pageText} />
            </Pressable>
          )}
        </View>
      ) : null}

      {selectedCluster && (clusterMarkers.length || clusterEvents.length) ? (
        <View style={[styles.sheet, { bottom: tabBarClearance, backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <View style={styles.clusterHeader}>
            <View style={[styles.clusterIcon, { backgroundColor: theme.violetSoft }]}><Ionicons name="scan-outline" size={20} color={theme.violet} /></View>
            <View style={styles.identityCopy}>
              <Text style={[styles.eventTitle, { color: theme.pageText }]}>Dans cette zone</Text>
              <Text style={[styles.memberMeta, { color: theme.pageTextMuted }]}>{`${clusterMarkers.reduce((count, marker) => count + marker.members.length, 0)} membres · ${clusterEvents.length} évènements`}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fiche" onPress={closeSelection} style={styles.closeSheet}><Ionicons name="close" size={20} color={theme.pageTextMuted} /></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clusterRail}>
            {clusterMarkers.map((marker) => {
              const first = marker.members[0];
              const member = first ? allMembers.find((candidate) => candidate.id === first.id) : undefined;
              if (!first || !member) return null;
              return (
                <Pressable key={marker.id} accessibilityRole="button" accessibilityLabel={`Sélectionner ${marker.members.map((item) => item.name).join(", ")}`} onPress={() => selectMarker(marker.id)} style={[styles.clusterCard, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
                  <StatusAvatar user={member} size={38} accessible={false} />
                  <View style={styles.clusterCardCopy}>
                    <Text numberOfLines={1} style={[styles.clusterCardTitle, { color: theme.pageText }]}>{marker.members.length > 1 ? `${marker.members.length} en visio` : firstName(member.name)}</Text>
                    <Text numberOfLines={1} style={[styles.clusterCardMeta, { color: marker.availability === "available" ? AVAILABLE : marker.availability === "busy" ? BUSY : OFFLINE }]}>{marker.availability === "available" ? "Disponible" : marker.availability === "busy" ? "Visio en cours" : "Hors ligne"}</Text>
                  </View>
                </Pressable>
              );
            })}
            {clusterEvents.map((event) => {
              const eventDate = new Date(event.startsAt);
              return (
                <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`Sélectionner l’évènement ${event.title}`} onPress={() => selectEvent(event.id)} style={[styles.clusterCard, styles.clusterEventCard, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
                  <View style={[styles.dateTile, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                    <Text style={[styles.dateDay, { color: theme.pageText }]}>{eventDate.getDate().toString().padStart(2, "0")}</Text>
                    <Text style={[styles.dateMonth, { color: theme.pageTextMuted }]}>{eventDate.toLocaleString(localeTag, { month: "short" }).replace(".", "")}</Text>
                  </View>
                  <View style={styles.clusterCardCopy}>
                    <Text numberOfLines={2} style={[styles.clusterCardTitle, { color: theme.pageText }]}>{event.title}</Text>
                    <Text numberOfLines={1} style={[styles.clusterCardMeta, { color: theme.pageTextMuted }]}>{event.city ?? eventStatusLabel(event, eventClock)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {selectedEvent ? (
        <View style={[styles.sheet, { bottom: tabBarClearance, backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <View style={styles.sheetTop}>
            <View style={[styles.eventDateTile, { backgroundColor: theme.accentSoft, borderColor: getDiscoveryEventState(selectedEvent, eventClock) === "live" ? theme.success : theme.accent }]}>
              <Text style={[styles.eventDateDay, { color: theme.pageText }]}>{new Date(selectedEvent.startsAt).getDate().toString().padStart(2, "0")}</Text>
              <Text style={[styles.eventDateMonth, { color: theme.pageTextMuted }]}>{new Date(selectedEvent.startsAt).toLocaleString(localeTag, { month: "short" }).replace(".", "")}</Text>
            </View>
            <View style={styles.identityCopy}>
              <View style={styles.eventStateLine}><View style={[styles.statusDot, { backgroundColor: getDiscoveryEventState(selectedEvent, eventClock) === "live" ? theme.success : theme.violet }]} /><Text style={[styles.eventStateText, { color: getDiscoveryEventState(selectedEvent, eventClock) === "live" ? theme.success : theme.violet }]}>{eventStatusLabel(selectedEvent, eventClock)}</Text></View>
              <Text numberOfLines={2} style={[styles.eventTitle, { color: theme.pageText }]}>{selectedEvent.title}</Text>
              <Text numberOfLines={1} style={[styles.memberMeta, { color: theme.pageTextMuted }]}>{new Date(selectedEvent.startsAt).toLocaleString(localeTag, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{selectedEvent.city ? ` · ${selectedEvent.city}` : ""}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fiche" onPress={closeSelection} style={styles.closeSheet}><Ionicons name="close" size={20} color={theme.pageTextMuted} /></Pressable>
          </View>
          {selectedEvent.summary ? <Text numberOfLines={3} style={[styles.eventSummary, { color: theme.pageTextSecondary }]}>{selectedEvent.summary}</Text> : null}
          {selectedEvent.address ? <View style={styles.eventLocation}><Ionicons name="location-outline" size={16} color={theme.pageTextMuted} /><Text numberOfLines={1} style={[styles.eventLocationText, { color: theme.pageTextMuted }]}>{selectedEvent.address}</Text></View> : null}
          <View style={styles.eventActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voir les membres disponibles" onPress={() => changeRadarMode("available")} style={[styles.eventSecondaryCta, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
              <Ionicons name="people-outline" size={18} color={theme.pageText} /><Text style={[styles.eventSecondaryText, { color: theme.pageText }]}>Membres disponibles</Text>
            </Pressable>
            {selectedEvent.webUrl ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Voir l’évènement" onPress={() => void Linking.openURL(selectedEvent.webUrl!)} style={[styles.eventCta, { backgroundColor: getDiscoveryEventState(selectedEvent, eventClock) === "live" ? theme.success : theme.accent }]}>
                <Text numberOfLines={2} style={styles.eventCtaText}>{eventActionLabel(selectedEvent, eventClock)}</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {!selection && !selectedEvent && !selectedCluster ? (
        <View style={[styles.opportunityDock, { bottom: tabBarClearance, backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <View style={styles.dockHeader}>
            <View style={styles.dockTitleLine}><View style={[styles.liveDot, { backgroundColor: theme.success }]} /><Text style={[styles.dockTitle, { color: theme.pageText }]}>À saisir maintenant</Text></View>
            <Text style={[styles.dockMeta, { color: theme.pageTextMuted }]}>{`${availableMembers.length + visibleEvents.length} opportunités`}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opportunityRail}>
            <Pressable accessibilityRole="button" accessibilityLabel="Afficher les membres disponibles" onPress={() => changeRadarMode("available")} style={[styles.opportunityCard, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
              <View style={styles.avatarPreview}>
                {availableMembers.slice(0, 3).map((member, index) => <View key={member.id} style={index > 0 ? styles.stackedAvatar : undefined}><StatusAvatar user={member} size={32} accessible={false} /></View>)}
                {availableMembers.length === 0 ? <View style={[styles.emptyPreview, { backgroundColor: theme.successSoft }]}><Ionicons name="people-outline" size={19} color={theme.success} /></View> : null}
              </View>
              <View style={styles.opportunityCopy}>
                <Text numberOfLines={1} style={[styles.opportunityTitle, { color: theme.pageText }]}>{`${availableMembers.length} disponibles`}</Text>
                <Text numberOfLines={1} style={[styles.opportunityMeta, { color: theme.success }]}>Échanger maintenant</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={theme.pageTextMuted} />
            </Pressable>
            {nextEvent ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Sélectionner l’évènement ${nextEvent.title}`} onPress={() => selectEvent(nextEvent.id)} style={[styles.opportunityCard, styles.eventOpportunityCard, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
                <View style={[styles.dateTile, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                  <Text style={[styles.dateDay, { color: theme.pageText }]}>{new Date(nextEvent.startsAt).getDate().toString().padStart(2, "0")}</Text>
                  <Text style={[styles.dateMonth, { color: theme.pageTextMuted }]}>{new Date(nextEvent.startsAt).toLocaleString(localeTag, { month: "short" }).replace(".", "")}</Text>
                </View>
                <View style={styles.opportunityCopy}>
                  <Text numberOfLines={1} style={[styles.opportunityTitle, { color: theme.pageText }]}>{nextEvent.title}</Text>
                  <Text numberOfLines={1} style={[styles.opportunityMeta, { color: theme.pageTextMuted }]}>{eventStatusLabel(nextEvent, eventClock)}{nextEvent.city ? ` · ${nextEvent.city}` : ""}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={theme.pageTextMuted} />
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {notice ? (
        <View pointerEvents="none" style={[styles.notice, { bottom: tabBarClearance + 76, backgroundColor: theme.pageText }]}>
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
  titlePill: { flex: 1, minHeight: 52, maxWidth: 264, paddingLeft: 12, paddingRight: 4, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 5 },
  titleCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 18, fontWeight: "900" },
  subtitle: { marginTop: 1, fontSize: 9, lineHeight: 12, fontWeight: "700" },
  ownStatus: { minWidth: 70, minHeight: 46, borderRadius: 17, borderWidth: 1, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  ownStatusDot: { width: 8, height: 8, borderRadius: 4 },
  ownStatusText: { maxWidth: 62, fontSize: 8, lineHeight: 11, fontWeight: "900" },
  modeRail: { position: "absolute", left: 12, right: 12, minHeight: 48, borderRadius: 20, borderWidth: 1, padding: 3, flexDirection: "row", alignItems: "center", gap: 3 },
  modeButton: { flex: 1, minWidth: 0, minHeight: 42, borderRadius: 16, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  modeLabel: { flexShrink: 1, fontSize: 10, lineHeight: 13, fontWeight: "900" },
  modeCount: { fontSize: 9, lineHeight: 12, fontWeight: "900", fontVariant: ["tabular-nums"] },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  sheet: { position: "absolute", left: 10, right: 10, borderRadius: 24, borderWidth: 1, padding: 11, gap: 10, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 15 },
  sheetTop: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 8 },
  identity: { flex: 1, minWidth: 0, minHeight: 54, flexDirection: "row", alignItems: "center", gap: 9 },
  identityCopy: { flex: 1, minWidth: 0 },
  memberName: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  memberMeta: { marginTop: 2, fontSize: 11, lineHeight: 14, fontWeight: "700" },
  statusLine: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  availabilityText: { fontSize: 10, lineHeight: 13, fontWeight: "900" },
  closeSheet: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  groupRail: { gap: 6, paddingVertical: 1 },
  groupMember: { minWidth: 72, minHeight: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  groupName: { maxWidth: 62, fontSize: 10, fontWeight: "800" },
  supportActions: { minHeight: 54, flexDirection: "row", gap: 7 },
  supportAction: { flex: 1, minWidth: 0, minHeight: 54, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 5 },
  supportActionText: { fontSize: 9, lineHeight: 12, fontWeight: "900", textAlign: "center" },
  primaryCta: { minHeight: 52, borderRadius: 17, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryActionText: { flexShrink: 1, color: "#FFFFFF", fontSize: 11, lineHeight: 14, fontWeight: "900", textAlign: "center" },
  profileCta: { minHeight: 50, borderRadius: 17, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  profileCtaText: { fontSize: 11, fontWeight: "900" },
  clusterHeader: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 8 },
  clusterIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  clusterRail: { gap: 8, paddingRight: 4 },
  clusterCard: { width: 154, minHeight: 64, borderRadius: 18, borderWidth: 1, padding: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  clusterEventCard: { width: 190 },
  clusterCardCopy: { flex: 1, minWidth: 0 },
  clusterCardTitle: { fontSize: 11, lineHeight: 14, fontWeight: "900" },
  clusterCardMeta: { marginTop: 3, fontSize: 9, lineHeight: 12, fontWeight: "800" },
  eventDateTile: { width: 56, height: 58, borderRadius: 17, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  eventDateDay: { fontSize: 20, lineHeight: 21, fontWeight: "900", fontVariant: ["tabular-nums"] },
  eventDateMonth: { fontSize: 9, lineHeight: 11, fontWeight: "900", textTransform: "uppercase" },
  eventStateLine: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  eventStateText: { fontSize: 9, lineHeight: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.35 },
  eventTitle: { fontSize: 14, lineHeight: 18, fontWeight: "900" },
  eventSummary: { fontSize: 11, lineHeight: 16, fontWeight: "700" },
  eventLocation: { flexDirection: "row", alignItems: "center", gap: 6 },
  eventLocationText: { flex: 1, minWidth: 0, fontSize: 10, lineHeight: 13, fontWeight: "700" },
  eventActions: { minHeight: 52, flexDirection: "row", gap: 7 },
  eventSecondaryCta: { flex: 0.9, minWidth: 0, minHeight: 52, borderRadius: 17, borderWidth: 1, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  eventSecondaryText: { flexShrink: 1, fontSize: 9, lineHeight: 12, fontWeight: "900", textAlign: "center" },
  eventCta: { flex: 1.1, minWidth: 0, minHeight: 52, borderRadius: 17, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  eventCtaText: { flexShrink: 1, color: "#FFFFFF", fontSize: 10, lineHeight: 13, fontWeight: "900", textAlign: "center" },
  opportunityDock: { position: "absolute", left: 10, right: 10, borderRadius: 23, borderWidth: 1, padding: 10, gap: 8, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 14 },
  dockHeader: { minHeight: 20, paddingHorizontal: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  dockTitleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  dockTitle: { fontSize: 11, lineHeight: 14, fontWeight: "900" },
  dockMeta: { fontSize: 9, lineHeight: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },
  opportunityRail: { gap: 8, paddingRight: 4 },
  opportunityCard: { width: 214, minHeight: 66, borderRadius: 18, borderWidth: 1, padding: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  eventOpportunityCard: { width: 258 },
  avatarPreview: { minWidth: 48, flexDirection: "row", alignItems: "center" },
  stackedAvatar: { marginLeft: -14 },
  emptyPreview: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  opportunityCopy: { flex: 1, minWidth: 0 },
  opportunityTitle: { fontSize: 11, lineHeight: 14, fontWeight: "900" },
  opportunityMeta: { marginTop: 3, fontSize: 9, lineHeight: 12, fontWeight: "800" },
  dateTile: { width: 44, height: 48, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  dateDay: { fontSize: 16, lineHeight: 18, fontWeight: "900", fontVariant: ["tabular-nums"] },
  dateMonth: { fontSize: 8, lineHeight: 10, fontWeight: "900", textTransform: "uppercase" },
  notice: { position: "absolute", left: 30, right: 30, minHeight: 44, borderRadius: 16, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 18 },
  noticeText: { textAlign: "center", fontSize: 11, fontWeight: "900" }
});
