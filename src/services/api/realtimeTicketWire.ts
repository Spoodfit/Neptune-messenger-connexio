import type { RealtimeTicket } from "../../types/messaging";
import { WireValidationError } from "./wire";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(
  record: Record<string, unknown>,
  label: string,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  throw new WireValidationError(`${label} manquant ou invalide.`);
}

export function normalizeRealtimeTicket(value: unknown): RealtimeTicket {
  if (!isRecord(value)) {
    throw new WireValidationError("Ticket temps réel invalide.");
  }

  const ticket = requiredString(value, "Ticket temps réel", "ticket");
  const expiresAt = requiredString(
    value,
    "Expiration du ticket temps réel",
    "expiresAt",
    "expires_at"
  );
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new WireValidationError("Expiration du ticket temps réel invalide.");
  }

  return { ticket, expiresAt };
}
