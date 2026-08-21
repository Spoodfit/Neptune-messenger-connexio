import { authenticatedRequest } from "./authenticatedRequest";
import type {
  CoworkingMediaSession,
  CoworkingParticipantPresence,
  CoworkingSnapshot,
  CoworkingSpace,
  CoworkingSpaceAccess,
  CoworkingSpaceKind,
  CreateCoworkingSpaceInput,
  JoinCoworkingResult
} from "../../types/coworking";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
        .map((item) => item.trim())
    : [];
}

function optionalPercent(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : undefined;
}

function normalizeSpaceKind(
  value: unknown,
  fallback: CoworkingSpaceKind = "open"
): CoworkingSpaceKind {
  return value === "hub" || value === "open" || value === "private" || value === "focus"
    ? value
    : fallback;
}

function normalizeAccess(value: unknown): CoworkingSpaceAccess {
  return value === "request" || value === "invite" ? value : "open";
}

function normalizeSpace(
  value: unknown,
  fallbackKind: CoworkingSpaceKind = "open"
): CoworkingSpace {
  const item = asRecord(value);
  const id = stringValue(
    item.id ?? item.space_id,
    fallbackKind === "hub" ? "hub" : ""
  );
  if (!id) throw new Error("Réponse Coworking invalide : identifiant d’espace manquant.");
  const participantIds = stringArray(item.participant_ids ?? item.participants);
  const rawMax = item.max_participants ?? item.capacity;
  const maxParticipants =
    typeof rawMax === "number" && Number.isFinite(rawMax) && rawMax > 0
      ? Math.trunc(rawMax)
      : undefined;
  return {
    id,
    name: stringValue(
      item.name ?? item.title,
      fallbackKind === "hub" ? "Hub Neptune" : "Espace Coworking"
    ),
    kind: normalizeSpaceKind(item.kind ?? item.type, fallbackKind),
    access: normalizeAccess(item.access ?? item.visibility),
    ownerId: stringValue(item.owner_id ?? item.ownerId) || undefined,
    participantIds,
    invitedUserIds: stringArray(item.invited_user_ids ?? item.invitedUserIds),
    maxParticipants,
    activity: stringValue(item.activity ?? item.topic) || undefined,
    focusEndsAt: stringValue(item.focus_ends_at ?? item.focusEndsAt) || undefined,
    mediaEnabled: item.media_enabled !== false
  };
}

function normalizePresence(value: unknown): CoworkingParticipantPresence | null {
  const item = asRecord(value);
  const userId = stringValue(item.user_id ?? item.userId ?? item.id);
  if (!userId) return null;
  const rawMode = item.mode ?? item.presence_mode;
  const mode =
    rawMode === "focus" || rawMode === "talk" || rawMode === "break"
      ? rawMode
      : "available";
  return {
    userId,
    mode,
    statusText: stringValue(item.status_text ?? item.statusText ?? item.activity) || undefined,
    cameraOn: item.camera_on === true || item.cameraOn === true,
    microphoneOn: item.microphone_on === true || item.microphoneOn === true,
    speaking: item.speaking === true,
    joinedAt: stringValue(item.joined_at ?? item.joinedAt, new Date().toISOString()),
    mapX: optionalPercent(item.map_x ?? item.mapX),
    mapY: optionalPercent(item.map_y ?? item.mapY)
  };
}

function normalizeIceServers(value: unknown): RTCIceServer[] {
  if (!Array.isArray(value)) return [{ urls: "stun:stun.l.google.com:19302" }];
  const servers: RTCIceServer[] = [];
  for (const raw of value) {
    const item = asRecord(raw);
    const urls = item.urls;
    if (
      typeof urls !== "string" &&
      !(Array.isArray(urls) && urls.every((url) => typeof url === "string"))
    ) {
      continue;
    }
    const server: RTCIceServer = { urls: urls as string | string[] };
    if (typeof item.username === "string") server.username = item.username;
    if (typeof item.credential === "string") server.credential = item.credential;
    servers.push(server);
  }
  return servers.length > 0
    ? servers
    : [{ urls: "stun:stun.l.google.com:19302" }];
}

function normalizeMedia(
  value: unknown,
  fallbackSpaceId: string
): CoworkingMediaSession | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = asRecord(value);
  const socketUrl = stringValue(item.socket_url ?? item.signaling_url);
  const token = stringValue(item.token ?? item.room_token);
  const participantId = stringValue(item.participant_id ?? item.user_id);
  if (!socketUrl || !token || !participantId) return undefined;
  return {
    spaceId: stringValue(item.space_id, fallbackSpaceId),
    socketUrl,
    socketPath: stringValue(item.socket_path, "/socket.io"),
    clientScriptUrl: stringValue(item.client_script_url) || undefined,
    token,
    participantId,
    iceServers: normalizeIceServers(item.ice_servers),
    expiresAt: stringValue(item.expires_at) || undefined,
    mock: false,
    observer:
      item.observer === true || item.listen_only === true || item.listenOnly === true
  };
}

export function normalizeCoworkingSnapshot(value: unknown): CoworkingSnapshot {
  const payload = asRecord(value);
  const root = asRecord(payload.snapshot ?? payload);
  const hub = normalizeSpace(
    root.hub ?? {
      id: "hub",
      name: "Hub Neptune",
      kind: "hub",
      participant_ids: []
    },
    "hub"
  );
  const spaces = Array.isArray(root.spaces)
    ? root.spaces
        .map((item) => normalizeSpace(item))
        .filter((space) => space.id !== hub.id)
    : [];
  const participants = Array.isArray(root.participants)
    ? root.participants
        .map(normalizePresence)
        .filter((item): item is CoworkingParticipantPresence => Boolean(item))
    : [];
  return {
    hub: { ...hub, kind: "hub", access: "open" },
    spaces,
    participants,
    currentUserSpaceId:
      stringValue(root.current_user_space_id ?? root.currentUserSpaceId) || undefined,
    observerMedia: normalizeMedia(
      root.observer_media ?? root.observerMedia,
      "coworking-map"
    ),
    updatedAt: stringValue(root.updated_at ?? root.updatedAt, new Date().toISOString())
  };
}

export class NeptuneCoworkingApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async getSnapshot(): Promise<CoworkingSnapshot> {
    const payload = await authenticatedRequest(
      "/v1/coworking",
      { method: "GET" },
      this.fallbackAccessToken
    );
    return normalizeCoworkingSnapshot(payload);
  }

  async updatePresence(
    mode: CoworkingParticipantPresence["mode"],
    statusText?: string
  ): Promise<CoworkingSnapshot> {
    const payload = await authenticatedRequest(
      "/v1/coworking/presence",
      {
        method: "POST",
        body: JSON.stringify({ mode, status_text: statusText?.trim() || null })
      },
      this.fallbackAccessToken
    );
    return normalizeCoworkingSnapshot(payload);
  }

  async createSpace(input: CreateCoworkingSpaceInput): Promise<JoinCoworkingResult> {
    const payload = await authenticatedRequest<Record<string, unknown>>(
      "/v1/coworking/spaces",
      {
        method: "POST",
        body: JSON.stringify({
          name: input.name.trim(),
          kind: input.kind,
          access: input.access,
          invited_user_ids: input.invitedUserIds ?? [],
          activity: input.activity?.trim() || null,
          focus_minutes: input.focusMinutes ?? null
        })
      },
      this.fallbackAccessToken
    );
    const snapshot = normalizeCoworkingSnapshot(payload);
    const created = asRecord(payload.space);
    const spaceId = stringValue(
      created.id ?? created.space_id,
      snapshot.currentUserSpaceId ?? ""
    );
    return { snapshot, media: normalizeMedia(payload.media, spaceId) };
  }

  async joinSpace(spaceId: string): Promise<JoinCoworkingResult> {
    const payload = await authenticatedRequest<Record<string, unknown>>(
      `/v1/coworking/spaces/${encodeURIComponent(spaceId)}/join`,
      { method: "POST" },
      this.fallbackAccessToken
    );
    return {
      snapshot: normalizeCoworkingSnapshot(payload),
      media: normalizeMedia(payload.media, spaceId)
    };
  }

  async leaveSpace(spaceId: string): Promise<CoworkingSnapshot> {
    const payload = await authenticatedRequest(
      `/v1/coworking/spaces/${encodeURIComponent(spaceId)}/leave`,
      { method: "POST" },
      this.fallbackAccessToken
    );
    return normalizeCoworkingSnapshot(payload);
  }
}
