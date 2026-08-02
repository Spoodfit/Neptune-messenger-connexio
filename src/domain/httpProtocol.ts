export interface AbortClassification {
  message: string;
  status: number;
  code: "timeout" | "client-aborted";
}

export function isJsonMediaType(contentType: string): boolean {
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mediaType === "application/json" || mediaType.endsWith("+json");
}

export function parseRetryAfterMs(
  value: string | null,
  now: number = Date.now()
): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1_000);
  }
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return undefined;
  return Math.max(0, date - now);
}

export function classifyAbort(
  timedOut: boolean,
  externalSignalAborted: boolean
): AbortClassification {
  if (!timedOut && externalSignalAborted) {
    return {
      message: "Requête annulée.",
      status: 499,
      code: "client-aborted"
    };
  }
  return {
    message: "Requête expirée.",
    status: 408,
    code: "timeout"
  };
}
