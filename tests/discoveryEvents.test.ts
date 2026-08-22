import assert from "node:assert/strict";
import test from "node:test";

import {
  getDiscoveryEventProximity,
  getDiscoveryEventState,
  visibleDiscoveryEvents,
  type DiscoveryEvent
} from "../src/domain/discoveryEvents";

const NOW = Date.parse("2026-08-17T10:00:00.000Z");

function event(id: string, startsAt: string, endsAt?: string): DiscoveryEvent {
  return {
    id,
    title: id,
    startsAt,
    endsAt,
    latitude: 43.2,
    longitude: 2.3,
    source: "neptune-business"
  };
}

test("classifie un évènement en cours", () => {
  const item = event("live", "2026-08-17T09:00:00.000Z", "2026-08-17T11:00:00.000Z");
  assert.equal(getDiscoveryEventState(item, NOW), "live");
  assert.equal(getDiscoveryEventProximity(item, NOW), "live");
});

test("conserve un évènement terminé depuis moins de 24 heures", () => {
  const item = event("recent", "2026-08-16T18:00:00.000Z", "2026-08-16T20:00:00.000Z");
  assert.equal(getDiscoveryEventState(item, NOW), "past24h");
  assert.equal(getDiscoveryEventProximity(item, NOW), "past24h");
});

test("distingue les évènements dans 48 h, dans une semaine et plus tard", () => {
  assert.equal(getDiscoveryEventProximity(event("soon", "2026-08-19T08:00:00.000Z"), NOW), "within48h");
  assert.equal(getDiscoveryEventProximity(event("week", "2026-08-22T10:00:00.000Z"), NOW), "within7d");
  assert.equal(getDiscoveryEventProximity(event("later", "2026-08-30T10:00:00.000Z"), NOW), "later");
});

test("masque un évènement terminé depuis plus de 24 heures", () => {
  const item = event("expired", "2026-08-15T06:00:00.000Z", "2026-08-15T08:00:00.000Z");
  assert.equal(getDiscoveryEventState(item, NOW), "expired");
  assert.equal(getDiscoveryEventProximity(item, NOW), "expired");
  assert.deepEqual(visibleDiscoveryEvents([item], "all", NOW), []);
});

test("sépare les évènements à venir des évènements en cours", () => {
  const live = event("live", "2026-08-17T09:00:00.000Z", "2026-08-17T11:00:00.000Z");
  const upcoming = event("upcoming", "2026-08-18T09:00:00.000Z", "2026-08-18T11:00:00.000Z");
  assert.deepEqual(visibleDiscoveryEvents([live, upcoming], "live", NOW).map((item) => item.id), ["live"]);
  assert.deepEqual(visibleDiscoveryEvents([live, upcoming], "upcoming", NOW).map((item) => item.id), ["upcoming"]);
});
