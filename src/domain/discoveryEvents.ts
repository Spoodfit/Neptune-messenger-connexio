export type DiscoveryEventState = "voting" | "recent" | "live" | "upcoming" | "expired";
export type DiscoveryEventWindow = "all" | Exclude<DiscoveryEventState, "expired">;
export type DiscoveryEventProximity = "voting" | "recent" | "live" | "within48h" | "within7d" | "later" | "expired";

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
  publicationState?: "voting" | "published" | "cancelled";
  source: "neptune-business" | "connexio";
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DEFAULT_DURATION_MS = 2 * HOUR_MS;
export const RECENT_EVENT_VISIBILITY_MS = HOUR_MS;

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
  if (event.publicationState === "cancelled") return "expired";
  if (event.publicationState === "voting") return "voting";
  const start = timestamp(event.startsAt);
  if (start === null) return "expired";
  const explicitEnd = timestamp(event.endsAt);
  const end = explicitEnd ?? start + DEFAULT_DURATION_MS;

  if (current < start) return "upcoming";
  if (current <= end) return "live";
  if (current - end < RECENT_EVENT_VISIBILITY_MS) return "recent";
  return "expired";
}

export function getDiscoveryEventProximity(
  event: DiscoveryEvent,
  now: number | Date = Date.now()
): DiscoveryEventProximity {
  const current = typeof now === "number" ? now : now.getTime();
  if (event.publicationState === "cancelled") return "expired";
  if (event.publicationState === "voting") return "voting";
  const start = timestamp(event.startsAt);
  if (start === null) return "expired";
  const end = timestamp(event.endsAt) ?? start + DEFAULT_DURATION_MS;
  if (current >= start && current <= end) return "live";
  if (current > end) return current - end < RECENT_EVENT_VISIBILITY_MS ? "recent" : "expired";
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

export function nextDiscoveryEventTransitionAt(
  events: readonly DiscoveryEvent[],
  now: number | Date = Date.now()
): number | null {
  const current = typeof now === "number" ? now : now.getTime();
  let next: number | null = null;
  for (const event of events) {
    if (event.publicationState === "cancelled" || event.publicationState === "voting") continue;
    const start = timestamp(event.startsAt);
    if (start === null) continue;
    const end = timestamp(event.endsAt) ?? start + DEFAULT_DURATION_MS;
    for (const transition of [start, end + 1, end + RECENT_EVENT_VISIBILITY_MS]) {
      if (transition <= current) continue;
      if (next === null || transition < next) next = transition;
    }
  }
  return next;
}
