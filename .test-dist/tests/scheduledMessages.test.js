"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const scheduledMessages_1 = require("../src/domain/scheduledMessages");
(0, node_test_1.default)("les responsables autorisés peuvent programmer dans leurs groupes", () => {
    strict_1.default.equal((0, scheduledMessages_1.canScheduleMessages)("capitaine", true), true);
    strict_1.default.equal((0, scheduledMessages_1.canScheduleMessages)("admiral", true), true);
    strict_1.default.equal((0, scheduledMessages_1.canScheduleMessages)("visionnaire", true), true);
    strict_1.default.equal((0, scheduledMessages_1.canScheduleMessages)("moussaillon", true), false);
    strict_1.default.equal((0, scheduledMessages_1.canScheduleMessages)("capitaine", false), false);
});
(0, node_test_1.default)("un message valide est normalisé", () => {
    const scheduled = (0, scheduledMessages_1.createScheduledMessage)({
        id: "scheduled-1",
        conversationId: "group-1",
        body: "  Rappel : atelier demain à 9 h.  ",
        scheduledFor: "2026-08-03T08:00:00.000Z",
        createdByUserId: "captain-1",
        role: "capitaine",
        canManageConversation: true,
        now: new Date("2026-08-02T08:00:00.000Z")
    });
    strict_1.default.equal(scheduled.body, "Rappel : atelier demain à 9 h.");
    strict_1.default.equal(scheduled.status, "scheduled");
});
(0, node_test_1.default)("la programmation immédiate est refusée", () => {
    strict_1.default.throws(() => (0, scheduledMessages_1.createScheduledMessage)({
        id: "scheduled-2",
        conversationId: "group-1",
        body: "Message",
        scheduledFor: "2026-08-02T08:01:00.000Z",
        createdByUserId: "captain-1",
        role: "capitaine",
        canManageConversation: true,
        now: new Date("2026-08-02T08:00:00.000Z")
    }), /deux minutes/u);
});
