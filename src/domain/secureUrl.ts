export function requireHttpsUrl(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} manquante.`);
  }
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") {
      throw new Error(`${label} doit utiliser HTTPS.`);
    }
    if (url.username || url.password) {
      throw new Error(`${label} ne doit contenir aucun identifiant.`);
    }
    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message === `${label} doit utiliser HTTPS.`) {
      throw error;
    }
    throw new Error(`${label} invalide.`);
  }
}

export function requireFutureIsoDate(
  value: unknown,
  label: string,
  now = Date.now(),
  minimumRemainingMs = 30_000
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} manquante.`);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= now + minimumRemainingMs) {
    throw new Error(`${label} invalide ou expirée.`);
  }
  return value;
}
