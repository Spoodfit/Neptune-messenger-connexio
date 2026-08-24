import assert from "node:assert/strict";
import test from "node:test";

import {
  getDiscoveryEventProximity,
  getDiscoveryEventState,
  nextDiscoveryEventTransitionAt,
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

test("conserve un évènement terminé depuis moins d’une heure", () => {
  const item = event("recent", "2026-08-17T08:00:00.000Z", "2026-08-17T09:15:00.000Z");
  assert.equal(getDiscoveryEventState(item, NOW), "recent");
  assert.equal(getDiscoveryEventProximity(item, NOW), "recent");
});

test("distingue les évènements dans 48 h, dans une semaine et plus tard", () => {
  assert.equal(getDiscoveryEventProximity(event("soon", "2026-08-19T08:00:00.000Z"), NOW), "within48h");
  assert.equal(getDiscoveryEventProximity(event("week", "2026-08-22T10:00:00.000Z"), NOW), "within7d");
  assert.equal(getDiscoveryEventProximity(event("later", "2026-08-30T10:00:00.000Z"), NOW), "later");
});

test("masque un évènement terminé depuis plus d’une heure", () => {
  const item = event("expired", "2026-08-17T07:00:00.000Z", "2026-08-17T08:59:59.000Z");
  assert.equal(getDiscoveryEventState(item, NOW), "expired");
  assert.equal(getDiscoveryEventProximity(item, NOW), "expired");
  assert.deepEqual(visibleDiscoveryEvents([item], "all", NOW), []);
});

test("retire un évènement dès que l’heure suivant sa fin est atteinte", () => {
  const item = event("boundary", "2026-08-17T07:00:00.000Z", "2026-08-17T09:00:00.000Z");
  assert.equal(getDiscoveryEventState(item, NOW - 1), "recent");
  assert.equal(getDiscoveryEventState(item, NOW), "expired");
});

test("conserve un évènement en cours de vote sans l’assimiler à un évènement daté", () => {
  const item = { ...event("vote", "2026-08-30T10:00:00.000Z"), publicationState: "voting" as const };
  assert.equal(getDiscoveryEventState(item, NOW), "voting");
  assert.equal(getDiscoveryEventProximity(item, NOW), "voting");
  assert.deepEqual(visibleDiscoveryEvents([item], "all", NOW).map((candidate) => candidate.id), ["vote"]);
});

test("programme le prochain retrait automatique à fin plus une heure", () => {
  const item = event("recent", "2026-08-17T08:00:00.000Z", "2026-08-17T09:15:00.000Z");
  assert.equal(nextDiscoveryEventTransitionAt([item], NOW), Date.parse("2026-08-17T10:15:00.000Z"));
});

test("sépare les évènements à venir des évènements en cours", () => {
  const live = event("live", "2026-08-17T09:00:00.000Z", "2026-08-17T11:00:00.000Z");
  const upcoming = event("upcoming", "2026-08-18T09:00:00.000Z", "2026-08-18T11:00:00.000Z");
  assert.deepEqual(visibleDiscoveryEvents([live, upcoming], "live", NOW).map((item) => item.id), ["live"]);
  assert.deepEqual(visibleDiscoveryEvents([live, upcoming], "upcoming", NOW).map((item) => item.id), ["upcoming"]);
});
