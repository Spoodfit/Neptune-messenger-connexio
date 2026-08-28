interface IceServerLike {
  urls: string | readonly string[];
}

interface MediaTransportInput {
  signalingUrl: string;
  clientScriptUrl?: string;
  iceServers: readonly IceServerLike[];
  expiresAt?: string;
}

function secureUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "wss:") return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function sameNetworkAuthority(left: URL, right: URL): boolean {
  return left.hostname.toLocaleLowerCase() === right.hostname.toLocaleLowerCase() &&
    (left.port || (left.protocol === "https:" || left.protocol === "wss:" ? "443" : "")) ===
      (right.port || (right.protocol === "https:" || right.protocol === "wss:" ? "443" : ""));
}

export function isTrustedMediaClientScript(
  signalingUrl: string,
  clientScriptUrl: string,
  allowedClientOrigins: readonly string[] = []
): boolean {
  const signaling = secureUrl(signalingUrl);
  const client = secureUrl(clientScriptUrl);
  if (!signaling || !client || client.protocol !== "https:") return false;
  if (sameNetworkAuthority(signaling, client)) return true;
  return allowedClientOrigins.some((candidate) => {
    const allowed = secureUrl(candidate);
    return Boolean(allowed && allowed.protocol === "https:" && allowed.origin === client.origin);
  });
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
  return secureUrl(value) !== null;
}

export function assertCandidateMediaTransport(
  input: MediaTransportInput,
  required: boolean,
  now = Date.now(),
  allowedClientOrigins: readonly string[] = []
): void {
  if (!required) return;
  if (!isSecureMediaUrl(input.signalingUrl)) {
    throw new Error("Transport média refusé : signalisation HTTPS/WSS requise.");
  }
  if (input.clientScriptUrl && !isTrustedMediaClientScript(input.signalingUrl, input.clientScriptUrl, allowedClientOrigins)) {
    throw new Error("Transport média refusé : origine du client SFU non autorisée.");
  }
  if (!hasTurnServer(input.iceServers)) {
    throw new Error("Transport média refusé : serveur TURN manquant.");
  }
  const expiresAtMs = input.expiresAt ? Date.parse(input.expiresAt) : Number.NaN;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now + 30_000) {
    throw new Error("Transport média refusé : jeton absent, expiré ou trop court.");
  }
}
