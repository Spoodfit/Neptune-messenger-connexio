function localDevelopmentHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "10.0.2.2";
}

export function browserOriginForTransport(value: string): string {
  const url = new URL(value);
  if (url.username || url.password) throw new Error("Origine WebView invalide.");
  if (url.protocol === "wss:") url.protocol = "https:";
  if (url.protocol === "ws:") url.protocol = "http:";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localDevelopmentHost(url.hostname))) {
    throw new Error("Origine WebView HTTPS requise.");
  }
  return url.origin;
}

export function mediaWebViewOrigins(signalingUrl: string, clientScriptUrl?: string): string[] {
  const origins = new Set([browserOriginForTransport(signalingUrl)]);
  if (clientScriptUrl) origins.add(browserOriginForTransport(clientScriptUrl));
  return [...origins];
}

export function allowsWebViewNavigation(url: string, allowedOrigins: readonly string[]): boolean {
  if (url === "about:blank" || url === "about:srcdoc") return true;
  try {
    const requested = new URL(url);
    return !requested.username && !requested.password && allowedOrigins.includes(requested.origin);
  } catch {
    return false;
  }
}

export interface AttachmentWebViewPolicy {
  originWhitelist: string[];
  allowFileAccess: boolean;
}

export function attachmentWebViewPolicy(value: string): AttachmentWebViewPolicy | null {
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol === "https:") {
      return { originWhitelist: [url.origin], allowFileAccess: false };
    }
    if (url.protocol === "file:") {
      return { originWhitelist: ["file://*"], allowFileAccess: true };
    }
    if (url.protocol === "data:") {
      return { originWhitelist: ["data:*"], allowFileAccess: false };
    }
    if (url.protocol === "blob:") {
      return { originWhitelist: ["blob:*"], allowFileAccess: false };
    }
    return null;
  } catch {
    return null;
  }
}

export function allowsAttachmentNavigation(initialUrl: string, requestedUrl: string): boolean {
  if (requestedUrl === "about:blank") return true;
  try {
    const initial = new URL(initialUrl);
    const requested = new URL(requestedUrl);
    if (initial.username || initial.password || requested.username || requested.password) return false;
    if (initial.protocol === "https:") {
      return requested.protocol === "https:" && requested.origin === initial.origin;
    }
    if (["file:", "data:", "blob:"].includes(initial.protocol)) {
      return requested.href === initial.href;
    }
    return false;
  } catch {
    return false;
  }
}
