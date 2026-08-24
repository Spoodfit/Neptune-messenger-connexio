interface IceServerLike {
  urls: string | readonly string[];
}

interface MediaTransportInput {
  signalingUrl: string;
  clientScriptUrl?: string;
  iceServers: readonly IceServerLike[];
  expiresAt?: string;
}

function urlsFor(server: IceServerLike): readonly string[] {
  return typeof server.urls === "string" ? [server.urls] : server.urls;
}

export function hasTurnServer(iceServers: readonly IceServerLike[]): boolean {
  return iceServers.some((server) =>
    urlsFor(server).some((url) => /^turns?:/i.test(url.trim()))
  );
}

export function isSecureMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "wss:";
  } catch {
    return false;
  }
}

export function assertCandidateMediaTransport(
  input: MediaTransportInput,
  required: boolean,
  now = Date.now()
): void {
  if (!required) return;
  if (!isSecureMediaUrl(input.signalingUrl)) {
    throw new Error("Transport média refusé : signalisation HTTPS/WSS requise.");
  }
  if (input.clientScriptUrl && !isSecureMediaUrl(input.clientScriptUrl)) {
    throw new Error("Transport média refusé : client SFU HTTPS requis.");
  }
  if (!hasTurnServer(input.iceServers)) {
    throw new Error("Transport média refusé : serveur TURN manquant.");
  }
  const expiresAtMs = input.expiresAt ? Date.parse(input.expiresAt) : Number.NaN;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now + 30_000) {
    throw new Error("Transport média refusé : jeton absent, expiré ou trop court.");
  }
}
