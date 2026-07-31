export type CallMode = "audio" | "video";

function sanitizeRoomPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

export function buildCallRoomName(conversationId: string): string {
  const safe = sanitizeRoomPart(conversationId);
  if (!safe) throw new Error("Identifiant de conversation invalide.");
  return `neptune-connexio-${safe}`;
}

export function buildCallUrl(
  callBaseUrl: string,
  conversationId: string,
  mode: CallMode,
  displayName?: string
): string {
  const base = callBaseUrl.replace(/\/$/, "");
  const roomName = buildCallRoomName(conversationId);
  const params = new URLSearchParams({
    "config.startWithAudioMuted": "false",
    "config.startWithVideoMuted": mode === "audio" ? "true" : "false",
    "config.prejoinPageEnabled": "true",
    "interfaceConfig.MOBILE_APP_PROMO": "false"
  });
  if (displayName) params.set("userInfo.displayName", displayName);
  return `${base}/${encodeURIComponent(roomName)}#${params.toString()}`;
}
