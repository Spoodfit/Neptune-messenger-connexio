"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const messageCollections_1 = require("../src/domain/messageCollections");
const message = (overrides = {}) => ({
    id: "message-1",
    conversationId: "conversation-1",
    senderId: "user-1",
    senderName: "Membre Neptune",
    senderInitials: "MN",
    body: "Bonjour",
    createdAt: "2026-07-30T10:00:00.000Z",
    status: "sent",
    isMine: false,
    ...overrides
});
(0, node_test_1.default)("conserve un message optimiste absent de la page serveur", () => {
    const optimistic = message({
        id: "local-client-1",
        clientMessageId: "client-1",
        status: "sending",
        isMine: true,
        createdAt: "2026-07-30T10:02:00.000Z"
    });
    const result = (0, messageCollections_1.mergeMessagesNewestFirst)([optimistic], [message()]);
    strict_1.default.deepEqual(result.map((item) => item.id), ["local-client-1", "message-1"]);
});
(0, node_test_1.default)("réconcilie un accusé serveur par clientMessageId", () => {
    const optimistic = message({
        id: "local-client-1",
        clientMessageId: "client-1",
        status: "sending",
        isMine: true
    });
    const server = message({
        id: "server-1",
        clientMessageId: "client-1",
        status: "sent",
        isMine: false
    });
    const result = (0, messageCollections_1.mergeMessagesNewestFirst)([optimistic], [server]);
    strict_1.default.equal(result.length, 1);
    strict_1.default.equal(result[0]?.id, "server-1");
    strict_1.default.equal(result[0]?.isMine, true);
    strict_1.default.equal(result[0]?.status, "sent");
});
(0, node_test_1.default)("déduplique les pages et trie du plus récent au plus ancien", () => {
    const result = (0, messageCollections_1.mergeMessagesNewestFirst)([message({ id: "m2", createdAt: "2026-07-30T10:02:00.000Z" })], [
        message({ id: "m1", createdAt: "2026-07-30T10:01:00.000Z" }),
        message({ id: "m2", createdAt: "2026-07-30T10:02:00.000Z" })
    ]);
    strict_1.default.deepEqual(result.map((item) => item.id), ["m2", "m1"]);
});
(0, node_test_1.default)("ignore les messages locaux lors du calcul de l'accusé de lecture", () => {
    const messages = [
        message({ id: "failed-local", status: "failed" }),
        message({ id: "sending-local", status: "sending" }),
        message({ id: "queued-local", status: "queued" }),
        message({ id: "server-delivered", status: "delivered" })
    ];
    strict_1.default.equal((0, messageCollections_1.latestPersistedMessageId)(messages), "server-delivered");
    strict_1.default.equal((0, messageCollections_1.latestPersistedMessageId)(messages.slice(0, 3)), null);
});
(0, node_test_1.default)("fusionne 500 messages paginés sans perte ni doublon", () => {
    const allMessages = Array.from({ length: 500 }, (_, index) => message({
        id: `message-${index}`,
        body: `Message ${index}`,
        createdAt: new Date(Date.UTC(2026, 6, 30, 10, 0, index)).toISOString()
    }));
    let state = [];
    for (let offset = 0; offset < allMessages.length; offset += 50) {
        const page = allMessages.slice(offset, offset + 50);
        const overlap = offset === 0 ? [] : allMessages.slice(offset - 5, offset);
        state = (0, messageCollections_1.mergeMessagesNewestFirst)(state, [...overlap, ...page]);
    }
    strict_1.default.equal(state.length, 500);
    strict_1.default.equal(new Set(state.map((item) => item.id)).size, 500);
    strict_1.default.equal(state[0]?.id, "message-499");
    strict_1.default.equal(state.at(-1)?.id, "message-0");
});
