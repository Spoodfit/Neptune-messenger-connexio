"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = __importDefault(require("node:test"));
const messageIdentity_1 = require("../src/domain/messageIdentity");
(0, node_test_1.default)("reconnaît un rejeu par identifiant serveur", () => {
    const known = new Set();
    (0, messageIdentity_1.rememberMessage)(known, { id: "server-1" });
    (0, node_assert_1.strictEqual)((0, messageIdentity_1.hasKnownMessage)(known, { id: "server-1" }), true);
    (0, node_assert_1.strictEqual)((0, messageIdentity_1.hasKnownMessage)(known, { id: "server-2" }), false);
});
(0, node_test_1.default)("réconcilie le message optimiste avec la réponse serveur par clientMessageId", () => {
    const known = new Set();
    (0, messageIdentity_1.rememberMessage)(known, { id: "local-1", clientMessageId: "client-1" });
    (0, node_assert_1.strictEqual)((0, messageIdentity_1.hasKnownMessage)(known, { id: "server-1", clientMessageId: "client-1" }), true);
});
(0, node_test_1.default)("mémorise un lot REST sans perdre les deux identités", () => {
    const known = new Set();
    (0, messageIdentity_1.rememberMessages)(known, [
        { id: "server-1", clientMessageId: "client-1" },
        { id: "server-2" }
    ]);
    (0, node_assert_1.strictEqual)(known.has("id:server-1"), true);
    (0, node_assert_1.strictEqual)(known.has("client:client-1"), true);
    (0, node_assert_1.strictEqual)(known.has("id:server-2"), true);
});
(0, node_test_1.default)("borne la mémoire et conserve les identités les plus récentes", () => {
    const known = new Set();
    for (let index = 0; index < messageIdentity_1.MAX_MESSAGE_IDENTITY_KEYS + 25; index += 1) {
        (0, messageIdentity_1.rememberMessage)(known, { id: `server-${index}` });
    }
    (0, node_assert_1.strictEqual)(known.size, messageIdentity_1.MAX_MESSAGE_IDENTITY_KEYS);
    (0, node_assert_1.strictEqual)(known.has("id:server-0"), false);
    (0, node_assert_1.strictEqual)(known.has(`id:server-${messageIdentity_1.MAX_MESSAGE_IDENTITY_KEYS + 24}`), true);
});
