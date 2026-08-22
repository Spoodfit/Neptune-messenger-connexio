import { authenticatedRequest } from "./authenticatedRequest";
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
    if (typeof urls !== "string" && !(Array.isArray(urls) && urls.every((entry) => typeof entry === "string"))) {
      return [];
    }
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
  const explicitObserver = item.observer === true || item.listen_only === true || item.listenOnly === true;
  const explicitPublisher = item.observer === false || item.publish === true || item.publisher === true;
  return {
    spaceId: stringValue(item.space_id) || "coworking-map",
    socketUrl,
    socketPath: stringValue(item.socket_path) || "/socket.io",
    clientScriptUrl: stringValue(item.client_script_url) || undefined,
    token,
    participantId,
    iceServers: normalizeIceServers(item.ice_servers),
    expiresAt: stringValue(item.expires_at) || undefined,
    observer: explicitPublisher ? false : explicitObserver ? true : observerByDefault,
    mock: false
  };
}

export interface CoworkingKnockResult {
  requestId?: string;
  status: "sent" | "accepted" | "declined";
}

export class CoworkingMapApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async enterMap(): Promise<{ media?: CoworkingMediaSession }> {
    const payload = await authenticatedRequest<Record<string, unknown>>(
      "/v1/coworking/map/enter",
      {
        method: "POST",
        body: JSON.stringify({ camera_on: true, microphone_on: false })
      },
      this.fallbackAccessToken
    );
    return { media: normalizeMedia(payload.media ?? payload.map_media, false) };
  }

  async leaveMap(): Promise<void> {
    await authenticatedRequest(
      "/v1/coworking/map/leave",
      { method: "POST" },
      this.fallbackAccessToken
    );
  }

  async sayHello(userId: string): Promise<void> {
    await authenticatedRequest(
      "/v1/coworking/hello",
      {
        method: "POST",
        body: JSON.stringify({ user_id: userId })
      },
      this.fallbackAccessToken
    );
  }

  async knock(input: { userId?: string; spaceId?: string }): Promise<CoworkingKnockResult> {
    const payload = await authenticatedRequest<Record<string, unknown>>(
      "/v1/coworking/knock",
      {
        method: "POST",
        body: JSON.stringify({
          user_id: input.userId ?? null,
          space_id: input.spaceId ?? null
        })
      },
      this.fallbackAccessToken
    );
    const rawStatus = stringValue(payload.status);
    return {
      requestId: stringValue(payload.request_id ?? payload.id) || undefined,
      status: rawStatus === "accepted" || rawStatus === "declined" ? rawStatus : "sent"
    };
  }
}
