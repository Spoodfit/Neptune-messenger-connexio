import { strictEqual, throws } from "node:assert";
import test from "node:test";

import { normalizeRealtimeTicket } from "../src/services/api/realtimeTicketWire";
import { WireValidationError } from "../src/services/api/wire";

test("normalise un ticket temps réel snake_case", () => {
  const result = normalizeRealtimeTicket({
    ticket: "one-time-ticket",
    expires_at: "2099-07-30T18:00:00.000Z"
  });

  strictEqual(result.ticket, "one-time-ticket");
  strictEqual(result.expiresAt, "2099-07-30T18:00:00.000Z");
});

test("refuse un ticket vide, expiré ou sans expiration", () => {
  throws(
    () => normalizeRealtimeTicket({ ticket: "", expires_at: "2099-07-30T18:00:00.000Z" }),
    WireValidationError
  );
  throws(
    () => normalizeRealtimeTicket({ ticket: "ticket", expires_at: "2020-01-01T00:00:00.000Z" }),
    WireValidationError
  );
  throws(
    () => normalizeRealtimeTicket({ ticket: "ticket" }),
    WireValidationError
  );
});
