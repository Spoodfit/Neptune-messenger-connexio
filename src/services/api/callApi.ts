import type { CallMode, IntegratedCallSession } from "../calls/callRoom";
import { authenticatedRequest } from "./authenticatedRequest";

interface CallSessionWire {
  id?: unknown;
  call_id?: unknown;
  conversation_id?: unknown;
  thread_id?: unknown;
  mode?: unknown;
  type?: unknown;
  socket_url?: unknown;
  signaling_url?: unknown;
  socket_path?: unknown;
  client_script_url?: unknown;
  token?: unknown;
  call_token?: unknown;
  initiator?: unknown;
  ice_servers?: unknown;
  expires_at?: unknown;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Réponse d’appel invalide : ${label} manquant.`);
  }
  return value.trim();
}

function normalizeIceServers(value: unknown): RTCIceServer[] {
  if (!Array.isArray(value)) return [{ urls: "stun:stun.l.google.com:19302" }];
  const servers: RTCIceServer[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const urls = item.urls;
    const validUrls =
      typeof urls === "string" ||
      (Array.isArray(urls) && urls.every((url) => typeof url === "string"));
    if (!validUrls) continue;
    const server: RTCIceServer = { urls: urls as string | string[] };
    if (typeof item.username === "string") server.username = item.username;
    if (typeof item.credential === "string") server.credential = item.credential;
    servers.push(server);
  }
  return servers.length > 0
    ? servers
    : [{ urls: "stun:stun.l.google.com:19302" }];
}

export class NeptuneCallApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async createSession(
    conversationId: string,
    mode: CallMode
  ): Promise<IntegratedCallSession> {
    const payload = await authenticatedRequest<CallSessionWire>(
      "/v1/calls",
      {
        method: "POST",
        body: JSON.stringify({
          thread_id: conversationId,
          conversation_id: conversationId,
          type: mode
        })
      },
      this.fallbackAccessToken
    );

    const socketUrl = requiredString(
      payload.socket_url ?? payload.signaling_url,
      "socket_url"
    );
    return {
      id: requiredString(payload.id ?? payload.call_id, "call_id"),
      conversationId:
        typeof (payload.conversation_id ?? payload.thread_id) === "string"
          ? String(payload.conversation_id ?? payload.thread_id)
          : conversationId,
      mode:
        payload.mode === "audio" || payload.type === "audio" ? "audio" : "video",
      socketUrl,
      socketPath:
        typeof payload.socket_path === "string" && payload.socket_path.trim()
          ? payload.socket_path.trim()
          : "/socket.io",
      clientScriptUrl:
        typeof payload.client_script_url === "string"
          ? payload.client_script_url
          : undefined,
      token: requiredString(payload.token ?? payload.call_token, "call_token"),
      initiator: payload.initiator !== false,
      iceServers: normalizeIceServers(payload.ice_servers),
      expiresAt:
        typeof payload.expires_at === "string" ? payload.expires_at : undefined,
      mock: false
    };
  }

  async endCall(callId: string): Promise<void> {
    await authenticatedRequest(
      `/v1/calls/${encodeURIComponent(callId)}/end`,
      { method: "POST" },
      this.fallbackAccessToken
    );
  }
}
