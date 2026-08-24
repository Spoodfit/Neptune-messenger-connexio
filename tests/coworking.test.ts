import { deepStrictEqual, strictEqual } from "node:assert";
import { test } from "node:test";

import {
  canJoinCoworkingSpace,
  coworkingAvailability,
  coworkingPresentCount,
  coworkingPresentUserIds,
  coworkingSpaceHostId,
  orderedCoworkingSpaces,
  removeCoworkingParticipant,
  roomOccupancyLabel,
  spaceForUser
} from "../src/domain/coworking";
import type { CoworkingSnapshot, CoworkingSpace } from "../src/types/coworking";

const hub: CoworkingSpace = {
  id: "hub",
  name: "Hub Neptune",
  kind: "hub",
  access: "open",
  participantIds: ["u1", "u2"],
  mediaEnabled: true
};

const openRoom: CoworkingSpace = {
  id: "open",
  name: "Création contenu",
  kind: "open",
  access: "open",
  participantIds: ["u2", "u3"],
  maxParticipants: 5,
  mediaEnabled: true
};

const privateRoom: CoworkingSpace = {
  id: "private",
  name: "Direction",
  kind: "private",
  access: "invite",
  participantIds: ["u4"],
  invitedUserIds: ["u5"],
  maxParticipants: 2,
  mediaEnabled: true
};

const focusRoom: CoworkingSpace = {
  id: "focus",
  name: "Focus commercial",
  kind: "focus",
  access: "open",
  participantIds: [],
  maxParticipants: 6,
  mediaEnabled: true
};

const snapshot: CoworkingSnapshot = {
  hub,
  spaces: [privateRoom, openRoom, focusRoom],
  participants: [],
  updatedAt: new Date(0).toISOString()
};

test("le compteur Coworking déduplique un membre présent dans plusieurs snapshots", () => {
  deepStrictEqual(coworkingPresentUserIds(snapshot).sort(), ["u1", "u2", "u3", "u4"]);
  strictEqual(coworkingPresentCount(snapshot), 4);
});

test("un espace privé respecte invitation et capacité", () => {
  strictEqual(canJoinCoworkingSpace(privateRoom, "u5"), true);
  strictEqual(canJoinCoworkingSpace(privateRoom, "u6"), false);
  strictEqual(canJoinCoworkingSpace({ ...privateRoom, participantIds: ["u4", "u5"] }, "u5"), true);
  strictEqual(canJoinCoworkingSpace({ ...privateRoom, participantIds: ["u4", "u5"] }, "u6"), false);
});

test("les sessions Focus puis ouvertes remontent avant les espaces privés", () => {
  deepStrictEqual(orderedCoworkingSpaces([privateRoom, openRoom, focusRoom]).map((space) => space.id), ["focus", "open", "private"]);
});

test("la présence retrouve l’espace du membre et expose une occupation compacte", () => {
  strictEqual(spaceForUser(snapshot, "u3")?.id, "open");
  strictEqual(spaceForUser(snapshot, "u1")?.id, "hub");
  strictEqual(roomOccupancyLabel(openRoom), "2/5");
});

test("la Map sépare la disponibilité choisie de l’occupation d’une visio", () => {
  strictEqual(coworkingAvailability(undefined, undefined), "available");
  strictEqual(coworkingAvailability({ userId: "u", mode: "focus", cameraOn: false, microphoneOn: false, speaking: false, joinedAt: new Date(0).toISOString() }, undefined), "busy");
  strictEqual(coworkingAvailability({ userId: "u", mode: "talk", cameraOn: false, microphoneOn: true, speaking: true, joinedAt: new Date(0).toISOString() }, undefined), "busy");
  strictEqual(coworkingAvailability({ userId: "u", mode: "break", cameraOn: false, microphoneOn: false, speaking: false, joinedAt: new Date(0).toISOString() }, undefined), "busy");
  strictEqual(coworkingAvailability({ userId: "u", mode: "available", cameraOn: true, microphoneOn: false, speaking: false, joinedAt: new Date(0).toISOString() }, openRoom), "busy");
});

test("le départ de l’hôte transfère explicitement la visio au membre suivant", () => {
  const hosted = { ...openRoom, ownerId: "u2", participantIds: ["u2", "u3", "u4"] };
  strictEqual(coworkingSpaceHostId(hosted), "u2");
  const afterLeave = removeCoworkingParticipant(hosted, "u2");
  deepStrictEqual(afterLeave.participantIds, ["u3", "u4"]);
  strictEqual(afterLeave.ownerId, "u3");
  strictEqual(coworkingSpaceHostId(afterLeave), "u3");
});
