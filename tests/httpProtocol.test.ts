import { deepStrictEqual, strictEqual } from "node:assert";
import test from "node:test";

import {
  classifyAbort,
  isJsonMediaType,
  parseRetryAfterMs
} from "../src/domain/httpProtocol";

test("reconnaît JSON standard, problem+json et types vendor", () => {
  strictEqual(isJsonMediaType("application/json"), true);
  strictEqual(isJsonMediaType("application/problem+json; charset=utf-8"), true);
  strictEqual(isJsonMediaType("application/vnd.neptune+json"), true);
  strictEqual(isJsonMediaType("text/plain"), false);
});

test("interprète Retry-After en secondes ou en date", () => {
  strictEqual(parseRetryAfterMs("2"), 2_000);
  strictEqual(
    parseRetryAfterMs("Wed, 30 Jul 2026 18:00:02 GMT", Date.parse("2026-07-30T18:00:00Z")),
    2_000
  );
  strictEqual(parseRetryAfterMs("invalide"), undefined);
});

test("distingue annulation explicite et timeout", () => {
  deepStrictEqual(classifyAbort(false, true), {
    message: "Requête annulée.",
    status: 499,
    code: "client-aborted"
  });
  deepStrictEqual(classifyAbort(true, true), {
    message: "Requête expirée.",
    status: 408,
    code: "timeout"
  });
  deepStrictEqual(classifyAbort(true, false), {
    message: "Requête expirée.",
    status: 408,
    code: "timeout"
  });
});
