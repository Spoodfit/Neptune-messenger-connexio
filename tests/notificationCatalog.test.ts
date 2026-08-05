import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNotificationCopy,
  NOTIFICATION_EVENT_TYPES,
  type NotificationEvent
} from "../src/services/notifications/notificationCatalog";

test("chaque évènement produit une notification exploitable et concise", () => {
  for (const type of NOTIFICATION_EVENT_TYPES) {
    const event: NotificationEvent = {
      type,
      actorName: "Océane",
      conversationName: "Club Carcassonne",
      groupName: "Club Carcassonne",
      eventName: "Afterwork Neptune",
      highlightTitle: "Une réussite du réseau",
      preview: "Une information utile et chaleureuse pour la communauté.",
      conversationId: "carcassonne",
      groupId: "carcassonne",
      eventId: "afterwork",
      highlightId: "highlight-1",
      callId: "call-1",
      automationName: "Rappel hebdomadaire",
      warningReason: "Merci de reformuler ce message avec un ton respectueux."
    };
    const copy = buildNotificationCopy(event);
    assert.ok(copy.title.trim().length > 0, type);
    assert.ok(copy.body.trim().length > 0, type);
    assert.ok(copy.title.length <= 70, `${type}: titre trop long`);
    assert.ok(copy.body.length <= 180, `${type}: corps trop long`);
    assert.equal(copy.data.type, type);
  }
});

test("les données absentes produisent une copie humaine sans placeholder technique", () => {
  const copy = buildNotificationCopy({ type: "direct_message" });
  assert.doesNotMatch(`${copy.title} ${copy.body}`, /undefined|null|\{\{/i);
});
