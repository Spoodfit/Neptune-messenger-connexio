"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = __importDefault(require("node:test"));
const realtimeTicketWire_1 = require("../src/services/api/realtimeTicketWire");
const wire_1 = require("../src/services/api/wire");
(0, node_test_1.default)("normalise un ticket temps réel snake_case", () => {
    const result = (0, realtimeTicketWire_1.normalizeRealtimeTicket)({
        ticket: "one-time-ticket",
        expires_at: "2099-07-30T18:00:00.000Z"
    });
    (0, node_assert_1.strictEqual)(result.ticket, "one-time-ticket");
    (0, node_assert_1.strictEqual)(result.expiresAt, "2099-07-30T18:00:00.000Z");
});
(0, node_test_1.default)("refuse un ticket vide, expiré ou sans expiration", () => {
    (0, node_assert_1.throws)(() => (0, realtimeTicketWire_1.normalizeRealtimeTicket)({ ticket: "", expires_at: "2099-07-30T18:00:00.000Z" }), wire_1.WireValidationError);
    (0, node_assert_1.throws)(() => (0, realtimeTicketWire_1.normalizeRealtimeTicket)({ ticket: "ticket", expires_at: "2020-01-01T00:00:00.000Z" }), wire_1.WireValidationError);
    (0, node_assert_1.throws)(() => (0, realtimeTicketWire_1.normalizeRealtimeTicket)({ ticket: "ticket" }), wire_1.WireValidationError);
});
