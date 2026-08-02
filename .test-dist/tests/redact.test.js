"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const redact_1 = require("../src/utils/redact");
(0, node_test_1.default)("un bearer token n'apparait jamais dans les logs", () => {
    strict_1.default.equal((0, redact_1.redactString)("Authorization: Bearer abc.def.ghi"), "Authorization: Bearer [REDACTED]");
});
(0, node_test_1.default)("les contenus et secrets sont masqués récursivement", () => {
    const redacted = (0, redact_1.redactForLogs)({
        conversationId: "c-1",
        body: "message privé",
        nested: { refreshToken: "secret" }
    });
    strict_1.default.equal(redacted.conversationId, "c-1");
    strict_1.default.equal(redacted.body, "[REDACTED]");
    strict_1.default.deepEqual(redacted.nested, { refreshToken: "[REDACTED]" });
});
