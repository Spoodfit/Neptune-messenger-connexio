import assert from "node:assert/strict";
import test from "node:test";

import { redactForLogs, redactString } from "../src/utils/redact";

test("un bearer token n'apparait jamais dans les logs", () => {
  assert.equal(
    redactString("Authorization: Bearer abc.def.ghi"),
    "Authorization: Bearer [REDACTED]"
  );
});

test("les contenus et secrets sont masqués récursivement", () => {
  const redacted = redactForLogs({
    conversationId: "c-1",
    body: "message privé",
    nested: { refreshToken: "secret" }
  }) as Record<string, unknown>;
  assert.equal(redacted.conversationId, "c-1");
  assert.equal(redacted.body, "[REDACTED]");
  assert.deepEqual(redacted.nested, { refreshToken: "[REDACTED]" });
});
