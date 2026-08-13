import type { MessageTranslation, MessageTranslationStatus } from "../../types/messaging";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function translationStatus(value: unknown, body?: string): MessageTranslationStatus {
  if (value === "ready" || value === "pending" || value === "failed") return value;
  return body ? "ready" : "pending";
}

export function normalizeMessageTranslation(
  payload: unknown,
  requestedTargetLanguage: string
): MessageTranslation {
  const outer = asRecord(payload) ?? {};
  const nested = asRecord(outer.translation);
  const record = nested ?? outer;
  const body = readString(record, ["body", "translated_body", "translatedBody", "text"]);
  const targetLanguage =
    readString(record, ["target_language", "targetLanguage", "language"]) ??
    requestedTargetLanguage;

  return {
    targetLanguage,
    sourceLanguage: readString(record, [
      "source_language",
      "sourceLanguage",
      "detected_language"
    ]),
    body,
    status: translationStatus(record.status, body),
    generatedAt: readString(record, ["generated_at", "generatedAt", "updated_at"])
  };
}
