import assert from "node:assert/strict";
import test from "node:test";

import {
  radarPulseItemCount,
  selectRadarPulseEvent
} from "../src/domain/radarPulse";
import type { DiscoveryEvent } from "../src/domain/discoveryEvents";

const NOW = Date.parse("2026-08-31T12:00:00.000Z");

function event(
  id: string,
  startsAt: string,
  endsAt?: string,
  publicationState?: DiscoveryEvent["publicationState"]
): DiscoveryEvent {
  return {
    id,
    title: id,
    startsAt,
    endsAt,
    latitude: 43.2,
    longitude: 2.3,
    publicationState,
    source: "neptune-business"
  };
}

test("le Pulse retient uniquement un évènement immédiatement actionnable", () => {
  const recent = event("recent", "2026-08-31T09:00:00.000Z", "2026-08-31T11:30:00.000Z");
  const soon = event("soon", "2026-09-01T10:00:00.000Z");
  const later = event("later", "2026-09-03T12:00:00.000Z");
  assert.equal(selectRadarPulseEvent([recent, later, soon], NOW)?.id, "soon");
});

test("le Pulse priorise un évènement en cours ou en vote", () => {
  const live = event("live", "2026-08-31T11:00:00.000Z", "2026-08-31T13:00:00.000Z");
  const vote = event("vote", "2026-09-05T12:00:00.000Z", undefined, "voting");
  assert.equal(selectRadarPulseEvent([live, vote], NOW)?.id, "live");
  assert.equal(selectRadarPulseEvent([vote], NOW)?.id, "vote");
});

test("le Pulse disparaît sans signal utile et ne compte aucune ligne vide", () => {
  const later = event("later", "2026-09-03T12:00:00.000Z");
  assert.equal(selectRadarPulseEvent([later], NOW), undefined);
  assert.equal(radarPulseItemCount(0), 0);
  assert.equal(radarPulseItemCount(3), 1);
  assert.equal(radarPulseItemCount(0, later), 1);
  assert.equal(radarPulseItemCount(3, later), 2);
});
