import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";

import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { env } from "../config/env";
import { coworkingPresentCount, spaceForUser } from "../domain/coworking";
import { useExperience } from "./ExperienceProvider";
import { useSession } from "./SessionProvider";
import { NeptuneCoworkingApi } from "../services/api/coworkingApi";
import type {
  CoworkingMediaSession,
  CoworkingParticipantPresence,
  CoworkingPresenceMode,
  CoworkingSnapshot,
  CoworkingSpace,
  CreateCoworkingSpaceInput
} from "../types/coworking";

const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);
const COWORKING_AVAILABLE =
  env.mockMode ||
  (env.coworkingEnabled && BACKEND_CAPABILITIES.calls && BACKEND_CAPABILITIES.realtime);

interface CoworkingContextValue {
  serviceAvailable: boolean;
  snapshot: CoworkingSnapshot;
  activeCount: number;
  currentSpace?: CoworkingSpace;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  joinSpace: (spaceId: string) => Promise<CoworkingMediaSession | undefined>;
  leaveCurrentSpace: () => Promise<void>;
  updatePresence: (mode: CoworkingPresenceMode, statusText?: string) => Promise<void>;
  createSpace: (input: CreateCoworkingSpaceInput) => Promise<{ spaceId: string; media?: CoworkingMediaSession }>;
  mediaForSpace: (spaceId: string) => CoworkingMediaSession | undefined;
}

const EMPTY_SNAPSHOT: CoworkingSnapshot = {
  hub: {
    id: "hub",
    name: "Hub Neptune",
    kind: "hub",
    access: "open",
    participantIds: [],
    mediaEnabled: true
  },
  spaces: [],
  participants: [],
  updatedAt: new Date(0).toISOString()
};

function removeUserFromSpaces(snapshot: CoworkingSnapshot, userId: string): CoworkingSnapshot {
  return {
    ...snapshot,
    hub: { ...snapshot.hub, participantIds: snapshot.hub.participantIds.filter((id) => id !== userId) },
    spaces: snapshot.spaces.map((space) => ({ ...space, participantIds: space.participantIds.filter((id) => id !== userId) }))
  };
}

function ensurePresence(
  participants: CoworkingParticipantPresence[],
  userId: string,
  patch: Partial<CoworkingParticipantPresence> = {}
): CoworkingParticipantPresence[] {
  const existing = participants.find((participant) => participant.userId === userId);
  const next: CoworkingParticipantPresence = {
    userId,
    mode: patch.mode ?? existing?.mode ?? "available",
    statusText: patch.statusText ?? existing?.statusText,
    cameraOn: patch.cameraOn ?? existing?.cameraOn ?? true,
    microphoneOn: patch.microphoneOn ?? existing?.microphoneOn ?? false,
    speaking: patch.speaking ?? false,
    joinedAt: existing?.joinedAt ?? new Date().toISOString()
  };
  return [...participants.filter((participant) => participant.userId !== userId), next];
}

function mockMediaSession(spaceId: string, userId: string): CoworkingMediaSession {
  return {
    spaceId,
    socketUrl: "https://mock.connexio.local",
    socketPath: "/socket.io",
    token: `mock-${spaceId}-${userId}`,
    participantId: userId,
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    mock: true
  };
}

function buildMockSnapshot(
  memberIds: string[]
): CoworkingSnapshot {
  const ids = memberIds.slice(0, 9);
  const now = new Date();
  const joinedAt = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  const presenceModes: CoworkingPresenceMode[] = ["focus", "available", "focus", "talk", "available", "focus", "break", "available", "talk"];
  const participants = ids.map<CoworkingParticipantPresence>((userId, index) => ({
    userId,
    mode: presenceModes[index] ?? "available",
    statusText: index === 0 ? "Préparation lancement Connexio" : index === 1 ? "Disponible" : index === 2 ? "Prospection" : undefined,
    cameraOn: index < 6,
    microphoneOn: index === 3 || index === 8,
    speaking: index === 3,
    joinedAt: joinedAt(8 + index * 7)
  }));
  const focusEnd = new Date(now.getTime() + 38 * 60_000).toISOString();
  return {
    hub: {
      id: "hub",
      name: "Hub Neptune",
      kind: "hub",
      access: "open",
      participantIds: ids.slice(0, Math.min(4, ids.length)),
      activity: "Coworking ouvert",
      mediaEnabled: true
    },
    spaces: [
      {
        id: "focus-commercial",
        name: "Focus commercial",
        kind: "focus",
        access: "open",
        participantIds: ids.slice(4, 6),
        maxParticipants: 6,
        activity: "50 min de concentration",
        focusEndsAt: focusEnd,
        mediaEnabled: true
      },
      {
        id: "creation-contenu",
        name: "Création contenu",
        kind: "open",
        access: "open",
        participantIds: ids.slice(6, 8),
        maxParticipants: 5,
        activity: "On avance ensemble",
        mediaEnabled: true
      },
      {
        id: "direction",
        name: "Direction",
        kind: "private",
        access: "invite",
        participantIds: ids.slice(8, 9),
        invitedUserIds: [],
        maxParticipants: 5,
        mediaEnabled: true
      }
    ],
    participants,
    updatedAt: now.toISOString()
  };
}

const CoworkingContext = createContext<CoworkingContextValue | null>(null);

export function CoworkingProvider({ children }: PropsWithChildren) {
  const { accessToken, currentUser } = useSession();
  const { members } = useExperience();
  const api = useMemo(() => env.mockMode ? null : new NeptuneCoworkingApi(accessToken), [accessToken]);
  const mockInitializedRef = useRef(false);
  const [snapshot, setSnapshot] = useState<CoworkingSnapshot>(EMPTY_SNAPSHOT);
  const [mediaSessions, setMediaSessions] = useState<Record<string, CoworkingMediaSession>>({});
  const [loading, setLoading] = useState(!env.mockMode && COWORKING_AVAILABLE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!env.mockMode || mockInitializedRef.current || members.length === 0) return;
    mockInitializedRef.current = true;
    const candidates = members.filter((member) => member.id !== currentUser.id);
    const online = candidates.filter((member) => member.online);
    setSnapshot(buildMockSnapshot((online.length >= 5 ? online : candidates).map((member) => member.id)));
    setLoading(false);
  }, [currentUser.id, members]);

  const refresh = useCallback(async () => {
    if (!COWORKING_AVAILABLE || env.mockMode || !api) return;
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await api.getSnapshot());
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Le Coworking est momentanément indisponible.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (env.mockMode || !COWORKING_AVAILABLE) return;
    void refresh();
    const interval = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const joinSpace = useCallback(async (spaceId: string) => {
    setError(null);
    if (env.mockMode) {
      let nextMedia: CoworkingMediaSession | undefined;
      setSnapshot((previous) => {
        const stripped = removeUserFromSpaces(previous, currentUser.id);
        const targetIsHub = spaceId === stripped.hub.id;
        const target = targetIsHub ? stripped.hub : stripped.spaces.find((space) => space.id === spaceId);
        if (!target) return previous;
        const nextParticipants = ensurePresence(stripped.participants, currentUser.id, {
          cameraOn: true,
          microphoneOn: false,
          mode: target.kind === "focus" ? "focus" : "available"
        });
        nextMedia = mockMediaSession(spaceId, currentUser.id);
        return {
          ...stripped,
          hub: targetIsHub ? { ...stripped.hub, participantIds: [...stripped.hub.participantIds, currentUser.id] } : stripped.hub,
          spaces: targetIsHub ? stripped.spaces : stripped.spaces.map((space) => space.id === spaceId ? { ...space, participantIds: [...space.participantIds, currentUser.id] } : space),
          participants: nextParticipants,
          currentUserSpaceId: spaceId,
          updatedAt: new Date().toISOString()
        };
      });
      const media = nextMedia ?? mockMediaSession(spaceId, currentUser.id);
      setMediaSessions((previous) => ({ ...previous, [spaceId]: media }));
      return media;
    }
    if (!COWORKING_AVAILABLE || !api) return undefined;
    try {
      const result = await api.joinSpace(spaceId);
      setSnapshot(result.snapshot);
      if (result.media) setMediaSessions((previous) => ({ ...previous, [spaceId]: result.media! }));
      return result.media;
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Impossible de rejoindre cet espace.");
      throw joinError;
    }
  }, [api, currentUser.id]);

  const leaveCurrentSpace = useCallback(async () => {
    const activeSpaceId = snapshot.currentUserSpaceId;
    if (!activeSpaceId) return;
    setError(null);
    if (env.mockMode) {
      setSnapshot((previous) => {
        const stripped = removeUserFromSpaces(previous, currentUser.id);
        return {
          ...stripped,
          participants: stripped.participants.filter((participant) => participant.userId !== currentUser.id),
          currentUserSpaceId: undefined,
          updatedAt: new Date().toISOString()
        };
      });
      setMediaSessions((previous) => {
        const next = { ...previous };
        delete next[activeSpaceId];
        return next;
      });
      return;
    }
    if (!COWORKING_AVAILABLE || !api) return;
    try {
      setSnapshot(await api.leaveSpace(activeSpaceId));
      setMediaSessions((previous) => {
        const next = { ...previous };
        delete next[activeSpaceId];
        return next;
      });
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : "Impossible de quitter le Coworking.");
      throw leaveError;
    }
  }, [api, currentUser.id, snapshot.currentUserSpaceId]);

  const updatePresence = useCallback(async (mode: CoworkingPresenceMode, statusText?: string) => {
    setError(null);
    if (env.mockMode) {
      setSnapshot((previous) => ({
        ...previous,
        participants: ensurePresence(previous.participants, currentUser.id, { mode, statusText }),
        updatedAt: new Date().toISOString()
      }));
      return;
    }
    if (!COWORKING_AVAILABLE || !api) return;
    try {
      setSnapshot(await api.updatePresence(mode, statusText));
    } catch (presenceError) {
      setError(presenceError instanceof Error ? presenceError.message : "Votre disponibilité n’a pas pu être mise à jour.");
      throw presenceError;
    }
  }, [api, currentUser.id]);

  const createSpace = useCallback(async (input: CreateCoworkingSpaceInput) => {
    setError(null);
    if (env.mockMode) {
      const spaceId = `local-coworking-${Date.now()}`;
      const focusEndsAt = input.kind === "focus" && input.focusMinutes
        ? new Date(Date.now() + input.focusMinutes * 60_000).toISOString()
        : undefined;
      const space: CoworkingSpace = {
        id: spaceId,
        name: input.name.trim() || "Mon espace",
        kind: input.kind,
        access: input.access,
        ownerId: currentUser.id,
        participantIds: [currentUser.id],
        invitedUserIds: input.invitedUserIds ?? [],
        maxParticipants: input.kind === "focus" ? 6 : 5,
        activity: input.activity?.trim() || undefined,
        focusEndsAt,
        mediaEnabled: true
      };
      const media = mockMediaSession(spaceId, currentUser.id);
      setSnapshot((previous) => {
        const stripped = removeUserFromSpaces(previous, currentUser.id);
        return {
          ...stripped,
          spaces: [...stripped.spaces, space],
          participants: ensurePresence(stripped.participants, currentUser.id, {
            mode: input.kind === "focus" ? "focus" : "available",
            cameraOn: true,
            microphoneOn: false
          }),
          currentUserSpaceId: spaceId,
          updatedAt: new Date().toISOString()
        };
      });
      setMediaSessions((previous) => ({ ...previous, [spaceId]: media }));
      return { spaceId, media };
    }
    if (!COWORKING_AVAILABLE || !api) throw new Error("Le Coworking n’est pas disponible.");
    const result = await api.createSpace(input);
    setSnapshot(result.snapshot);
    const spaceId = result.snapshot.currentUserSpaceId;
    if (!spaceId) throw new Error("L’espace a été créé mais n’a pas pu être rejoint.");
    if (result.media) setMediaSessions((previous) => ({ ...previous, [spaceId]: result.media! }));
    return { spaceId, media: result.media };
  }, [api, currentUser.id]);

  const currentSpace = useMemo(() => spaceForUser(snapshot, currentUser.id), [currentUser.id, snapshot]);
  const activeCount = useMemo(() => coworkingPresentCount(snapshot), [snapshot]);
  const mediaForSpace = useCallback((spaceId: string) => mediaSessions[spaceId], [mediaSessions]);

  const value = useMemo<CoworkingContextValue>(() => ({
    serviceAvailable: COWORKING_AVAILABLE,
    snapshot,
    activeCount,
    currentSpace,
    loading,
    error,
    refresh,
    joinSpace,
    leaveCurrentSpace,
    updatePresence,
    createSpace,
    mediaForSpace
  }), [activeCount, createSpace, currentSpace, error, joinSpace, leaveCurrentSpace, loading, mediaForSpace, refresh, snapshot, updatePresence]);

  return <CoworkingContext.Provider value={value}>{children}</CoworkingContext.Provider>;
}

export function useCoworking(): CoworkingContextValue {
  const value = useContext(CoworkingContext);
  if (!value) throw new Error("useCoworking doit être utilisé dans CoworkingProvider.");
  return value;
}
