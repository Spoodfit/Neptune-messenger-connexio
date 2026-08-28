import { strictEqual, throws } from "node:assert";
import test from "node:test";

import {
  assertCandidateMediaTransport,
  hasTurnServer,
  isSecureMediaUrl,
  isTrustedMediaClientScript
} from "../src/domain/mediaTransport";

const now = Date.parse("2026-08-24T20:00:00.000Z");

test("une candidate média exige WSS/HTTPS, TURN et un jeton encore valide", () => {
  assertCandidateMediaTransport(
    {
      signalingUrl: "https://api.neptunebusiness.com",
      clientScriptUrl: "https://api.neptunebusiness.com/sfu/client.js",
      iceServers: [
        { urls: "stun:stun.example.com:3478" },
        { urls: ["turn:turn.example.com:3478?transport=udp"] }
      ],
      expiresAt: "2026-08-24T20:05:00.000Z"
    },
    true,
    now
  );
});

test("refuse les sessions STUN seules et les scripts non chiffrés", () => {
  throws(() =>
    assertCandidateMediaTransport(
      {
        signalingUrl: "https://api.neptunebusiness.com",
        iceServers: [{ urls: "stun:stun.example.com:3478" }],
        expiresAt: "2026-08-24T20:05:00.000Z"
      },
      true,
      now
    )
  );
  throws(() =>
    assertCandidateMediaTransport(
      {
        signalingUrl: "https://api.neptunebusiness.com",
        clientScriptUrl: "http://cdn.example.com/client.js",
        iceServers: [{ urls: "turns:turn.example.com:5349" }],
        expiresAt: "2026-08-24T20:05:00.000Z"
      },
      true,
      now
    )
  );
});

test("les helpers détectent TURN et les transports chiffrés", () => {
  strictEqual(hasTurnServer([{ urls: "turns:turn.example.com:5349" }]), true);
  strictEqual(hasTurnServer([{ urls: "stun:stun.example.com:3478" }]), false);
  strictEqual(isSecureMediaUrl("wss://api.example.com/socket.io"), true);
  strictEqual(isSecureMediaUrl("ws://api.example.com/socket.io"), false);
});

test("le client SFU reste sur l’autorité de signalisation ou une origine explicitement autorisée", () => {
  strictEqual(
    isTrustedMediaClientScript("wss://api.example.com/realtime", "https://api.example.com/sfu/client.js"),
    true
  );
  strictEqual(
    isTrustedMediaClientScript("wss://api.example.com/realtime", "https://cdn.example.com/sfu/client.js"),
    false
  );
  strictEqual(
    isTrustedMediaClientScript(
      "wss://api.example.com/realtime",
      "https://cdn.example.com/sfu/client.js",
      ["https://cdn.example.com"]
    ),
    true
  );
});

test("la candidate production refuse un script cross-origin non déclaré", () => {
  throws(() =>
    assertCandidateMediaTransport(
      {
        signalingUrl: "wss://api.example.com/realtime",
        clientScriptUrl: "https://evil.example/client.js",
        iceServers: [{ urls: "turns:turn.example.com:5349" }],
        expiresAt: "2026-08-24T20:05:00.000Z"
      },
      true,
      now
    )
  );
});
