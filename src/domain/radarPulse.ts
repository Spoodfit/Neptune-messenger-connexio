import {
  getDiscoveryEventState,
  type DiscoveryEvent
} from "./discoveryEvents";

export const RADAR_PULSE_UPCOMING_WINDOW_MS = 24 * 60 * 60 * 1000;

export function selectRadarPulseEvent(
  events: readonly DiscoveryEvent[],
  now: number | Date = Date.now()
): DiscoveryEvent | undefined {
  const current = typeof now === "number" ? now : now.getTime();
  return events.find((event) => {
    const state = getDiscoveryEventState(event, current);
    if (state === "live" || state === "voting") return true;
    if (state !== "upcoming") return false;
    const startsAt = Date.parse(event.startsAt);
    return Number.isFinite(startsAt)
      && startsAt >= current
      && startsAt - current <= RADAR_PULSE_UPCOMING_WINDOW_MS;
  });
}

export function radarPulseItemCount(
  availableMemberCount: number,
  event?: DiscoveryEvent
): number {
  return (availableMemberCount > 0 ? 1 : 0) + (event ? 1 : 0);
}
