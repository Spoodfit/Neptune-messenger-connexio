import assert from "node:assert/strict";
import test from "node:test";

import {
  canScheduleMessages,
  createScheduledMessage
} from "../src/domain/scheduledMessages";

test("les responsables autorisés peuvent programmer dans leurs groupes", () => {
  assert.equal(canScheduleMessages("capitaine", true), true);
  assert.equal(canScheduleMessages("admiral", true), true);
  assert.equal(canScheduleMessages("visionnaire", true), true);
  assert.equal(canScheduleMessages("moussaillon", true), false);
  assert.equal(canScheduleMessages("capitaine", false), false);
});

test("une automatisation valide est normalisée", () => {
  const scheduled = createScheduledMessage({
    id: "scheduled-1",
    conversationId: "group-1",
    name: "Rappel atelier",
    body: "  Rappel : atelier demain à 9 h.  ",
    scheduledFor: "2026-08-03T08:00:00.000Z",
    createdByUserId: "captain-1",
    createdByName: "Capitaine Neptune",
    frequency: "daily",
    role: "capitaine",
    canManageConversation: true,
    now: new Date("2026-08-02T08:00:00.000Z")
  });
  assert.equal(scheduled.name, "Rappel atelier");
  assert.equal(scheduled.body, "Rappel : atelier demain à 9 h.");
  assert.equal(scheduled.createdByName, "Capitaine Neptune");
  assert.equal(scheduled.frequency, "daily");
  assert.equal(scheduled.enabled, true);
  assert.equal(scheduled.status, "scheduled");
});

test("la programmation immédiate est refusée", () => {
  assert.throws(
    () =>
      createScheduledMessage({
        id: "scheduled-2",
        conversationId: "group-1",
        name: "Message immédiat",
        body: "Message",
        scheduledFor: "2026-08-02T08:01:00.000Z",
        createdByUserId: "captain-1",
        role: "capitaine",
        canManageConversation: true,
        now: new Date("2026-08-02T08:00:00.000Z")
      }),
    /deux minutes/u
  );
});

test("le nom de l’automatisation est obligatoire", () => {
  assert.throws(
    () =>
      createScheduledMessage({
        id: "scheduled-3",
        conversationId: "group-1",
        name: "   ",
        body: "Message valide",
        scheduledFor: "2026-08-03T08:00:00.000Z",
        createdByUserId: "captain-1",
        role: "capitaine",
        canManageConversation: true,
        now: new Date("2026-08-02T08:00:00.000Z")
      }),
    /nom/u
  );
});
