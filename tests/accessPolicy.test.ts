import assert from "node:assert/strict";
import test from "node:test";

import {
  canInitiatePrivateInteraction,
  canPublishHighlightKind,
  canPublishInConversation,
  getGroupJoinDecision
} from "../src/domain/accessPolicy";
import type { Conversation } from "../src/types/messaging";

const group: Conversation = {
  id: "group-test",
  name: "Groupe test",
  categoryLabel: "Test",
  type: "topic",
  memberCount: 10,
  unreadCount: 0,
  restricted: true,
  allowFreeDiscovery: true,
  allowedRoles: ["triton", "moussaillon", "capitaine", "amiral", "visionnaire"],
  canPost: true
};

test("Free reçoit mais ne peut pas initier une interaction privée", () => {
  assert.equal(canInitiatePrivateInteraction("free"), false);
  assert.equal(canInitiatePrivateInteraction("triton"), true);
});

test("Free publie uniquement des Besoins", () => {
  assert.equal(canPublishHighlightKind("free", "besoin"), true);
  assert.equal(canPublishHighlightKind("free", "standard"), false);
  assert.equal(canPublishHighlightKind("free", "offre"), false);
  assert.equal(canPublishHighlightKind("triton", "offre"), true);
});

test("un groupe visible aux Free exige néanmoins Triton pour être rejoint", () => {
  assert.deepEqual(getGroupJoinDecision("free", group), {
    visible: true,
    canJoin: false,
    requiresTriton: true
  });
});

test("les annonces sont publiables uniquement par les administrateurs et éditeurs", () => {
  const announcement: Conversation = {
    ...group,
    id: "annonces",
    type: "announcement",
    adminIds: ["visionnaire-1"],
    announcementPublisherIds: ["captain-1"]
  };
  assert.equal(
    canPublishInConversation(
      { id: "visionnaire-1", role: "visionnaire" },
      announcement
    ),
    true
  );
  assert.equal(
    canPublishInConversation({ id: "captain-1", role: "capitaine" }, announcement),
    true
  );
  assert.equal(
    canPublishInConversation({ id: "member-1", role: "triton" }, announcement),
    false
  );
});
