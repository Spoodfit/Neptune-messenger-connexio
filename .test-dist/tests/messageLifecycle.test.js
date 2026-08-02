"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const messageLifecycle_1 = require("../src/domain/messageLifecycle");
const local = (0, messageLifecycle_1.createOptimisticMessage)({
    clientMessageId: "client-1",
    conversationId: "carcassonne",
    senderId: "user-1",
    senderName: "Johan",
    senderInitials: "JZ",
    body: "Bonjour",
    createdAt: "2026-07-30T10:00:00.000Z"
});
(0, node_test_1.default)("un message optimiste commence en file d'attente", () => {
    strict_1.default.equal(local.status, "queued");
    strict_1.default.equal(local.id, "local-client-1");
});
(0, node_test_1.default)("la réponse serveur réconcilie sans perdre l'identifiant client", () => {
    const reconciled = (0, messageLifecycle_1.reconcileServerMessage)(local, {
        ...local,
        id: "server-1",
        clientMessageId: "client-1",
        status: "sent"
    });
    strict_1.default.equal(reconciled.id, "server-1");
    strict_1.default.equal(reconciled.clientMessageId, "client-1");
    strict_1.default.equal(reconciled.status, "sent");
});
(0, node_test_1.default)("un échec est explicite et peut être remis en attente", () => {
    const failed = (0, messageLifecycle_1.markMessageFailed)(local, "network");
    strict_1.default.equal(failed.status, "failed");
    strict_1.default.equal(failed.retryCount, 1);
    const retried = (0, messageLifecycle_1.queueMessageForRetry)(failed);
    strict_1.default.equal(retried.status, "queued");
    strict_1.default.equal(retried.errorCode, undefined);
});
