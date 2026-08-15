import type {
  ContentTranslation,
  MessageTranslation,
  MessageTranslationStatus,
  PollTranslation
} from "../../types/messaging";

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

function translationStatus(value: unknown, hasContent: boolean): MessageTranslationStatus {
  if (value === "ready" || value === "pending" || value === "failed") return value;
  return hasContent ? "ready" : "pending";
}

function collectFields(record: Record<string, unknown>): Record<string, string> {
  const fields: Record<string, string> = {};
  const nested = asRecord(record.fields);
  if (nested) {
    for (const [key, value] of Object.entries(nested)) {
      if (typeof value === "string" && value.trim()) fields[key] = value.trim();
    }
  }

  const aliases: Array<[string, string[]]> = [
    ["body", ["body", "translated_body", "translatedBody", "text"]],
    ["question", ["question", "translated_question", "translatedQuestion"]],
    ["title", ["title", "translated_title", "translatedTitle"]],
    ["description", ["description", "translated_description", "translatedDescription"]],
    ["lastMessage", ["last_message", "lastMessage", "translated_last_message", "translatedLastMessage"]],
    ["pinnedMessage", ["pinned_message", "pinnedMessage", "translated_pinned_message", "translatedPinnedMessage"]],
    ["transcript", ["transcript", "translated_transcript", "translatedTranscript"]]
  ];
  for (const [field, keys] of aliases) {
    const value = readString(record, keys);
    if (value) fields[field] = value;
  }

  const rawOptions = record.options ?? record.translated_options ?? record.translatedOptions ?? record.option_translations;
  if (Array.isArray(rawOptions)) {
    rawOptions.forEach((item, index) => {
      if (typeof item === "string" && item.trim()) {
        fields[`option-index:${index}`] = item.trim();
        return;
      }
      const option = asRecord(item);
      if (!option) return;
      const label = readString(option, ["label", "text", "value", "translated_label", "translatedLabel"]);
      const id = readString(option, ["id", "option_id", "optionId"]);
      if (label) {
        fields[`option-index:${index}`] = label;
        if (id) fields[`option:${id}`] = label;
      }
    });
  } else {
    const optionMap = asRecord(rawOptions);
    if (optionMap) {
      for (const [id, value] of Object.entries(optionMap)) {
        if (typeof value === "string" && value.trim()) fields[`option:${id}`] = value.trim();
      }
    }
  }

  return fields;
}

export function normalizeContentTranslation(
  payload: unknown,
  requestedTargetLanguage: string
): ContentTranslation {
  const outer = asRecord(payload) ?? {};
  const nested = asRecord(outer.translation);
  const record = nested ?? outer;
  const fields = collectFields(record);
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
    status: translationStatus(record.status, Object.keys(fields).length > 0),
    generatedAt: readString(record, ["generated_at", "generatedAt", "updated_at"]),
    fields: Object.keys(fields).length ? fields : undefined
  };
}

export function normalizeMessageTranslation(
  payload: unknown,
  requestedTargetLanguage: string
): MessageTranslation {
  const translation = normalizeContentTranslation(payload, requestedTargetLanguage);
  return {
    ...translation,
    body: translation.fields?.body
  };
}

export function normalizePollTranslation(
  payload: unknown,
  requestedTargetLanguage: string
): PollTranslation {
  const translation = normalizeContentTranslation(payload, requestedTargetLanguage);
  const options: Record<string, string> = {};
  for (const [key, value] of Object.entries(translation.fields ?? {})) {
    if (key.startsWith("option:")) options[key.slice("option:".length)] = value;
  }
  return {
    ...translation,
    question: translation.fields?.question,
    options: Object.keys(options).length ? options : undefined
  };
}
