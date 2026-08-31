import { getTranslationRequestLanguage } from "../../i18n/translationLocale";
import { normalizeLanguageCode } from "../../i18n/languages";
import { env } from "../../config/env";
import { assertCandidateMediaTransport } from "../../domain/mediaTransport";
import type { CallMode, IntegratedCallSession } from "../calls/callRoom";
import { authenticatedRequest } from "./authenticatedRequest";

interface CallSessionWire {
  id?: unknown;
  call_id?: unknown;
  conversation_id?: unknown;
  thread_id?: unknown;
  mode?: unknown;
  type?: unknown;
  reason?: unknown;
  subject?: unknown;
  socket_url?: unknown;
  signaling_url?: unknown;
  socket_path?: unknown;
  client_script_url?: unknown;
  token?: unknown;
  call_token?: unknown;
  initiator?: unknown;
  ice_servers?: unknown;
  expires_at?: unknown;
  captioning_enabled?: unknown;
  captions_enabled?: unknown;
  caption_target_language?: unknown;
  captions_target_language?: unknown;
  captions_default_on?: unknown;
  caption_audio_chunk_ms?: unknown;
  caption_max_audio_base64_length?: unknown;
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

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

function normalizeSession(
  payload: CallSessionWire,
  fallbackConversationId: string,
  fallbackMode: CallMode,
  fallbackReason?: string
): IntegratedCallSession {
  const socketUrl = requiredString(
    payload.socket_url ?? payload.signaling_url,
    "socket_url"
  );
  const clientScriptUrl =
    typeof payload.client_script_url === "string"
      ? payload.client_script_url
      : undefined;
  const iceServers = normalizeIceServers(payload.ice_servers);
  const expiresAt =
    typeof payload.expires_at === "string" ? payload.expires_at : undefined;
  assertCandidateMediaTransport(
    { signalingUrl: socketUrl, clientScriptUrl, iceServers, expiresAt },
    env.releaseStage === "release-candidate" || env.releaseStage === "production",
    Date.now(),
    env.mediaClientOrigins
  );
  const requestedLanguage = getTranslationRequestLanguage();
  return {
    id: requiredString(payload.id ?? payload.call_id, "call_id"),
    conversationId:
      typeof (payload.conversation_id ?? payload.thread_id) === "string"
        ? String(payload.conversation_id ?? payload.thread_id)
        : fallbackConversationId,
    mode:
      payload.mode === "audio" || payload.type === "audio"
        ? "audio"
        : fallbackMode,
    reason:
      typeof (payload.reason ?? payload.subject) === "string"
        ? String(payload.reason ?? payload.subject)
        : fallbackReason,
    socketUrl,
    socketPath:
      typeof payload.socket_path === "string" && payload.socket_path.trim()
        ? payload.socket_path.trim()
        : "/socket.io",
    clientScriptUrl,
    token: requiredString(payload.token ?? payload.call_token, "call_token"),
    initiator: payload.initiator !== false,
    iceServers,
    expiresAt,
    captioningEnabled:
      payload.captioning_enabled === true || payload.captions_enabled === true,
    captionTargetLanguage: normalizeLanguageCode(
      payload.caption_target_language ?? payload.captions_target_language,
      requestedLanguage
    ),
    captionsDefaultOn: payload.captions_default_on === true,
    captionAudioChunkMs: boundedInteger(
      payload.caption_audio_chunk_ms,
      1_200,
      800,
      3_000
    ),
    captionMaxAudioBase64Length: boundedInteger(
      payload.caption_max_audio_base64_length,
      524_288,
      64_000,
      1_000_000
    ),
    mock: false
  };
}

export class NeptuneCallApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async createSession(
    conversationId: string,
    mode: CallMode,
    reason: string
  ): Promise<IntegratedCallSession> {
    const cleanReason = reason.trim();
    if (cleanReason.length < 3) {
      throw new Error("Indiquez brièvement la raison de l’appel.");
    }
    const captionLanguage = getTranslationRequestLanguage();
    const payload = await authenticatedRequest<CallSessionWire>(
      "/v1/calls",
      {
        method: "POST",
        body: JSON.stringify({
          thread_id: conversationId,
          conversation_id: conversationId,
          type: mode,
          reason: cleanReason,
          subject: cleanReason,
          captions_requested: mode === "video",
          caption_target_language: captionLanguage
        })
      },
      this.fallbackAccessToken
    );
    return normalizeSession(payload, conversationId, mode, cleanReason);
  }

  async joinSession(
    callId: string,
    conversationId: string,
    mode: CallMode
  ): Promise<IntegratedCallSession> {
    const payload = await authenticatedRequest<CallSessionWire>(
      `/v1/calls/${encodeURIComponent(callId)}/accept`,
      {
        method: "POST",
        body: JSON.stringify({
          captions_requested: mode === "video",
          caption_target_language: getTranslationRequestLanguage()
        })
      },
      this.fallbackAccessToken
    );
    return normalizeSession(payload, conversationId, mode);
  }

  async declineCall(
    callId: string,
    response: "callback_10m" | "message_available"
  ): Promise<void> {
    await authenticatedRequest(
      `/v1/calls/${encodeURIComponent(callId)}/decline`,
      {
        method: "POST",
        body: JSON.stringify({ response })
      },
      this.fallbackAccessToken
    );
  }

  async endCall(callId: string): Promise<void> {
    await authenticatedRequest(
      `/v1/calls/${encodeURIComponent(callId)}/end`,
      { method: "POST" },
      this.fallbackAccessToken
    );
  }
}
