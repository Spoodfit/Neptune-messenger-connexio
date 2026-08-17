export type DiscoveryEventState = "past24h" | "live" | "upcoming" | "expired";
export type DiscoveryEventWindow = "all" | Exclude<DiscoveryEventState, "expired">;
export type DiscoveryEventProximity = "past24h" | "live" | "within48h" | "within7d" | "later" | "expired";

export interface DiscoveryEvent {
  id: string;
  title: string;
  summary?: string;
  startsAt: string;
  endsAt?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  imageUrl?: string;
  webUrl?: string;
  organizer?: string;
  clubName?: string;
  source: "neptune-business" | "connexio";
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DEFAULT_DURATION_MS = 2 * HOUR_MS;

function timestamp(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getDiscoveryEventState(
  event: DiscoveryEvent,
  now: number | Date = Date.now()
): DiscoveryEventState {
  const current = typeof now === "number" ? now : now.getTime();
  const start = timestamp(event.startsAt);
  if (start === null) return "expired";
  const explicitEnd = timestamp(event.endsAt);
  const end = explicitEnd ?? start + DEFAULT_DURATION_MS;

  if (current < start) return "upcoming";
  if (current <= end) return "live";
  if (current - end <= DAY_MS) return "past24h";
  return "expired";
}

export function getDiscoveryEventProximity(
  event: DiscoveryEvent,
  now: number | Date = Date.now()
): DiscoveryEventProximity {
  const current = typeof now === "number" ? now : now.getTime();
  const start = timestamp(event.startsAt);
  if (start === null) return "expired";
  const end = timestamp(event.endsAt) ?? start + DEFAULT_DURATION_MS;
  if (current >= start && current <= end) return "live";
  if (current > end) return current - end <= DAY_MS ? "past24h" : "expired";
  const untilStart = start - current;
  if (untilStart <= 48 * HOUR_MS) return "within48h";
  if (untilStart <= 7 * DAY_MS) return "within7d";
  return "later";
}

export function visibleDiscoveryEvents(
  events: readonly DiscoveryEvent[],
  window: DiscoveryEventWindow = "all",
  now: number | Date = Date.now()
): DiscoveryEvent[] {
  return events
    .filter((event) => {
      const state = getDiscoveryEventState(event, now);
      return state !== "expired" && (window === "all" || state === window);
    })
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
}

export function isDiscoveryEventActive(event: DiscoveryEvent, now: number | Date = Date.now()): boolean {
  return getDiscoveryEventState(event, now) === "live";
}
