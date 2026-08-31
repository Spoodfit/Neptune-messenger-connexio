import { authenticatedRequest } from "./authenticatedRequest";
import { env } from "../../config/env";
import { assertCandidateMediaTransport } from "../../domain/mediaTransport";
import type { CoworkingMediaSession } from "../../types/coworking";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIceServers(value: unknown): RTCIceServer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    const item = asRecord(raw);
    const urls = item.urls;
    if (typeof urls !== "string" && !(Array.isArray(urls) && urls.every((entry) => typeof entry === "string"))) return [];
    return [{
      urls: urls as string | string[],
      ...(typeof item.username === "string" ? { username: item.username } : {}),
      ...(typeof item.credential === "string" ? { credential: item.credential } : {})
    } satisfies RTCIceServer];
  });
}

function normalizeMedia(value: unknown, observerByDefault: boolean): CoworkingMediaSession | undefined {
  const item = asRecord(value);
  const socketUrl = stringValue(item.socket_url ?? item.signaling_url);
  const token = stringValue(item.token ?? item.room_token);
  const participantId = stringValue(item.participant_id ?? item.user_id);
  if (!socketUrl || !token || !participantId) return undefined;
  const clientScriptUrl = stringValue(item.client_script_url) || undefined;
  const iceServers = normalizeIceServers(item.ice_servers);
  const expiresAt = stringValue(item.expires_at) || undefined;
  assertCandidateMediaTransport(
    { signalingUrl: socketUrl, clientScriptUrl, iceServers, expiresAt },
    env.releaseStage === "release-candidate" || env.releaseStage === "production",
    Date.now(),
    env.mediaClientOrigins
  );
  const explicitObserver = item.observer === true || item.listen_only === true || item.listenOnly === true;
  const explicitPublisher = item.observer === false || item.publish === true || item.publisher === true;
  return {
    spaceId: stringValue(item.space_id) || "coworking-map",
    socketUrl,
    socketPath: stringValue(item.socket_path) || "/socket.io",
    clientScriptUrl,
    token,
    participantId,
    iceServers,
    expiresAt,
    observer: explicitPublisher ? false : explicitObserver ? true : observerByDefault,
    mock: false
  };
}

export interface CoworkingKnockResult {
  requestId?: string;
  status: "sent" | "accepted" | "declined";
  spaceId?: string;
}

export interface CoworkingKnockResponse {
  status: "accepted" | "declined";
  spaceId?: string;
  media?: CoworkingMediaSession;
}

function helloTargetBody(input: { userId?: string; spaceId?: string }): { user_id: string } | { space_id: string } {
  const userId = input.userId?.trim();
  const spaceId = input.spaceId?.trim();
  if (Boolean(userId) === Boolean(spaceId)) throw new Error("Choisissez un membre ou un espace Coworking, pas les deux.");
  return spaceId ? { space_id: spaceId } : { user_id: userId! };
}

function spaceTargetBody(spaceId: string): { space_id: string } {
  const normalized = spaceId.trim();
  if (!normalized) throw new Error("L’espace Coworking à rejoindre est requis.");
  return { space_id: normalized };
}

export class CoworkingMapApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async enterMap(): Promise<{ media?: CoworkingMediaSession }> {
    const payload = await authenticatedRequest<Record<string, unknown>>(
      "/v1/coworking/map/enter",
      { method: "POST", body: JSON.stringify({ camera_on: true, microphone_on: false }) },
      this.fallbackAccessToken
    );
    return { media: normalizeMedia(payload.media ?? payload.map_media, false) };
  }

  async leaveMap(): Promise<void> {
    await authenticatedRequest("/v1/coworking/map/leave", { method: "POST" }, this.fallbackAccessToken);
  }

  async sayHello(input: { userId?: string; spaceId?: string }): Promise<void> {
    await authenticatedRequest(
      "/v1/coworking/hello",
      {
        method: "POST",
        body: JSON.stringify(helloTargetBody(input))
      },
      this.fallbackAccessToken
    );
  }

  async knock(input: { spaceId: string }): Promise<CoworkingKnockResult> {
    const payload = await authenticatedRequest<Record<string, unknown>>(
      "/v1/coworking/knock",
      {
        method: "POST",
        body: JSON.stringify(spaceTargetBody(input.spaceId))
      },
      this.fallbackAccessToken
    );
    const rawStatus = stringValue(payload.status);
    return {
      requestId: stringValue(payload.request_id ?? payload.id) || undefined,
      status: rawStatus === "accepted" || rawStatus === "declined" ? rawStatus : "sent",
      spaceId: stringValue(payload.space_id ?? payload.spaceId) || undefined
    };
  }

  async respondToKnock(requestId: string, accepted: boolean): Promise<CoworkingKnockResponse> {
    const payload = await authenticatedRequest<Record<string, unknown>>(
      `/v1/coworking/knock/${encodeURIComponent(requestId)}/respond`,
      { method: "POST", body: JSON.stringify({ accepted }) },
      this.fallbackAccessToken
    );
    const status = accepted ? "accepted" : "declined";
    return {
      status,
      spaceId: stringValue(payload.space_id ?? payload.spaceId) || undefined,
      media: normalizeMedia(payload.media, false)
    };
  }
}
