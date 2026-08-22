import type { HighlightPost } from "../../types/experience";
import type { AppUser } from "../../types/messaging";

type WireRecord = Record<string, unknown>;

function isRecord(value: unknown): value is WireRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(record: WireRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function number(record: WireRecord, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function date(record: WireRecord, key: string): string {
  const value = text(record, key);
  return value && Number.isFinite(Date.parse(value))
    ? value
    : new Date(0).toISOString();
}

function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase("fr") ?? "")
      .join("") || "NB"
  );
}

function fallbackAuthor(record: WireRecord): AppUser {
  const name = text(record, "auteur_nom") ?? "Membre Neptune";
  return {
    id: text(record, "auteur_id") ?? "neptune-member",
    name,
    initials: initials(name),
    company: text(record, "auteur_entreprise") ?? "",
    city: text(record, "ville") ?? "",
    role: "triton",
    roleLabel: "Triton",
    online: false
  };
}

function authorFor(
  record: WireRecord,
  membersById: ReadonlyMap<string, AppUser>
): AppUser {
  const authorId = text(record, "auteur_id");
  return (authorId ? membersById.get(authorId) : undefined) ?? fallbackAuthor(record);
}

function joinedBody(record: WireRecord): string {
  const title = text(record, "titre");
  const description = text(record, "description");
  if (title && description && title !== description) return `${title}\n\n${description}`;
  return title ?? description ?? "Publication Neptune";
}

export function normalizeNeptuneNeed(
  value: unknown,
  membersById: ReadonlyMap<string, AppUser>
): HighlightPost {
  if (!isRecord(value) || !text(value, "id")) {
    throw new Error("Besoin Neptune invalide.");
  }
  return {
    id: text(value, "id")!,
    author: authorFor(value, membersById),
    kind: "besoin",
    body: joinedBody(value),
    createdAt: date(value, "created_date"),
    mentionedUserIds: Array.isArray(value.mentions)
      ? value.mentions.filter((item): item is string => typeof item === "string")
      : undefined,
    reactions: [],
    comments: [],
    shareCount: Math.max(0, Math.trunc(number(value, "shares_count"))),
    locationLabel: text(value, "ville"),
    syncedWithBusinessApp: true,
    syncState: "synced"
  };
}

export function normalizeNeptuneBenefit(
  value: unknown,
  membersById: ReadonlyMap<string, AppUser>
): HighlightPost {
  if (!isRecord(value) || !text(value, "id")) {
    throw new Error("Avantage Neptune invalide.");
  }
  const imageUrl = safeHttpsUrl(value.image);
  return {
    id: text(value, "id")!,
    author: authorFor(value, membersById),
    kind: "offre",
    body: joinedBody(value),
    createdAt: date(value, "created_date"),
    media: imageUrl
      ? {
          id: `benefit-image-${text(value, "id")}`,
          kind: "photo",
          uri: imageUrl,
          name: text(value, "titre") ?? "Avantage Neptune",
          status: "ready"
        }
      : undefined,
    reactions: [],
    comments: [],
    shareCount: Math.max(0, Math.trunc(number(value, "partages_count"))),
    locationLabel: text(value, "ville"),
    syncedWithBusinessApp: true,
    syncedWithAdvantagesCommittee: value.is_comite_entreprise === true,
    syncState: "synced"
  };
}

export function normalizeNeptuneWebFeed(
  needs: unknown,
  benefits: unknown,
  members: readonly AppUser[]
): HighlightPost[] {
  if (!Array.isArray(needs) || !Array.isArray(benefits)) {
    throw new Error("Feed Neptune invalide.");
  }
  const membersById = new Map(members.map((member) => [member.id, member]));
  return [
    ...needs.map((item) => normalizeNeptuneNeed(item, membersById)),
    ...benefits.map((item) => normalizeNeptuneBenefit(item, membersById))
  ].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

export function needPayloadFromHighlight(
  body: string,
  author: AppUser,
  mentionedUserIds: readonly string[] = []
): WireRecord {
  const cleanBody = body.trim();
  const firstLine = cleanBody.split(/\n+/)[0]?.trim() ?? cleanBody;
  const title = firstLine.length > 255 ? `${firstLine.slice(0, 252)}…` : firstLine;
  return {
    auteur_id: author.id,
    created_by_id: author.id,
    titre: title || "Besoin Neptune",
    description: cleanBody || title,
    type: "besoin",
    statut: "actif",
    ville: author.city || null,
    mentions: [...new Set(mentionedUserIds)]
  };
}
