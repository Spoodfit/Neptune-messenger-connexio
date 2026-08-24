import { strictEqual, throws } from "node:assert";
import test from "node:test";

import {
  requireFutureIsoDate,
  requireHttpsUrl
} from "../src/domain/secureUrl";

test("accepte uniquement les URL HTTPS sans identifiants intégrés", () => {
  strictEqual(
    requireHttpsUrl("https://cdn.example.com/file.pdf", "URL"),
    "https://cdn.example.com/file.pdf"
  );
  throws(() =>
    requireHttpsUrl("https://user:password@cdn.example.com/file.pdf", "URL")
  );
  throws(() => requireHttpsUrl("http://cdn.example.com/file.pdf", "URL"));
  throws(() => requireHttpsUrl("file:///private/file.pdf", "URL"));
});

test("refuse une expiration absente, passée ou imminente", () => {
  const now = Date.parse("2026-08-24T20:00:00.000Z");
  strictEqual(
    requireFutureIsoDate("2026-08-24T20:05:00.000Z", "Expiration", now),
    "2026-08-24T20:05:00.000Z"
  );
  throws(() => requireFutureIsoDate(undefined, "Expiration", now));
  throws(() =>
    requireFutureIsoDate("2026-08-24T20:00:20.000Z", "Expiration", now)
  );
});
