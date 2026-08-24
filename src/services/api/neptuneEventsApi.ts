import type { DiscoveryEvent } from "../../domain/discoveryEvents";
import { authenticatedRequest } from "./authenticatedRequest";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(...values: unknown[]): string | undefined {
  const found = values.find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof found === "string" ? found.trim() : undefined;
}

function numberValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function eventItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = record(payload);
  if (!root) return [];
  for (const key of ["items", "events", "data", "results"]) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }
  return [];
}

function publicationState(value: unknown): DiscoveryEvent["publicationState"] {
  if (typeof value !== "string") return "published";
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (["voting", "vote", "poll", "polling", "invote"].includes(normalized)) return "voting";
  if (["cancelled", "canceled", "annule", "annulé", "expired", "archived"].includes(normalized)) return "cancelled";
  return "published";
}

export function normalizeBusinessEvent(value: unknown): DiscoveryEvent | null {
  const source = record(value);
  if (!source) return null;
  const location = record(source.location) ?? record(source.venue) ?? {};
  const coordinates = record(source.coordinates) ?? record(location.coordinates) ?? {};

  const id = stringValue(source.id, source.uuid, source.slug);
  const title = stringValue(source.title, source.name, source.nom);
  const startsAt = stringValue(
    source.starts_at,
    source.startsAt,
    source.start_at,
    source.startAt,
    source.date_start,
    source.start_date,
    source.date
  );
  const latitude = numberValue(
    source.latitude,
    source.lat,
    location.latitude,
    location.lat,
    coordinates.latitude,
    coordinates.lat
  );
  const longitude = numberValue(
    source.longitude,
    source.lng,
    source.lon,
    location.longitude,
    location.lng,
    location.lon,
    coordinates.longitude,
    coordinates.lng,
    coordinates.lon
  );

  if (!id || !title || !startsAt || latitude === undefined || longitude === undefined) {
    return null;
  }

  return {
    id,
    title,
    summary: stringValue(source.summary, source.description, source.details),
    startsAt,
    endsAt: stringValue(
      source.ends_at,
      source.endsAt,
      source.end_at,
      source.endAt,
      source.date_end,
      source.end_date
    ),
    latitude,
    longitude,
    address: stringValue(source.address, location.address, location.label),
    city: stringValue(source.city, source.ville, location.city, location.ville),
    imageUrl: stringValue(source.image_url, source.imageUrl, source.cover_url, source.coverUrl),
    webUrl: stringValue(source.web_url, source.webUrl, source.url, source.public_url),
    organizer: stringValue(source.organizer, source.organizer_name, source.host_name),
    clubName: stringValue(source.club_name, source.clubName, source.club),
    publicationState: publicationState(source.publication_state ?? source.publicationState ?? source.status ?? source.state),
    source: "neptune-business"
  };
}

export class NeptuneEventsApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async listDiscoveryEvents(): Promise<DiscoveryEvent[]> {
    const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    const query = new URLSearchParams({ from, to, limit: "250", visible: "true" });
    const payload = await authenticatedRequest<unknown>(
      `/v1/events?${query.toString()}`,
      {},
      this.fallbackAccessToken
    );
    return eventItems(payload)
      .map(normalizeBusinessEvent)
      .filter((event): event is DiscoveryEvent => Boolean(event));
  }
}
