export const ACCESS_TOKEN_REFRESH_SKEW_MS = 60_000;

export function calculateAccessTokenExpiry(
  expiresInSeconds: number,
  now = Date.now()
): number {
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) return now;
  return now + Math.floor(expiresInSeconds * 1_000);
}

export function shouldRefreshAccessToken(
  accessToken: string | null,
  expiresAt: number | null,
  now = Date.now(),
  skewMs = ACCESS_TOKEN_REFRESH_SKEW_MS
): boolean {
  if (!accessToken || !expiresAt) return true;
  return expiresAt - Math.max(0, skewMs) <= now;
}
