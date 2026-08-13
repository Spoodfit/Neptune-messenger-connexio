import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLiveCaptionBootstrapScript,
  getLiveCaptionSessionFields,
  injectLiveCaptionRuntime
} from "../src/services/calls/liveCaptions";
import type { IntegratedCallSession } from "../src/services/calls/callRoom";

function session(
  overrides: Partial<IntegratedCallSession> = {}
): IntegratedCallSession {
  return {
    id: "call-1",
    conversationId: "conversation-1",
    mode: "video",
    reason: "Test",
    socketUrl: "https://calls.example.test",
    socketPath: "/socket.io",
    token: "test-token",
    initiator: true,
    iceServers: [],
    mock: false,
    ...overrides
  };
}

test("les sous-titres restent inactifs si le backend ne les annonce pas", () => {
  const script = buildLiveCaptionBootstrapScript(session(), "Alice");
  assert.match(script, /"enabled":false/);
  assert.match(script, /if \(!cfg\.enabled\) return true/);
});

test("une session vidéo autorisée transporte la langue cible et les limites serveur", () => {
  const call = session() as IntegratedCallSession & {
    captioningEnabled?: boolean;
    captionTargetLanguage?: string;
    captionsDefaultOn?: boolean;
    captionAudioChunkMs?: number;
    captionMaxAudioBase64Length?: number;
  };
  call.captioningEnabled = true;
  call.captionTargetLanguage = "en";
  call.captionsDefaultOn = true;
  call.captionAudioChunkMs = 950;
  call.captionMaxAudioBase64Length = 300_000;

  const fields = getLiveCaptionSessionFields(call);
  assert.equal(fields.captioningEnabled, true);
  assert.equal(fields.captionTargetLanguage, "en");

  const script = buildLiveCaptionBootstrapScript(call, "Bob");
  assert.match(script, /"enabled":true/);
  assert.match(script, /"targetLanguage":"en"/);
  assert.match(script, /"audioChunkMs":950/);
  assert.match(script, /call:caption-audio/);
  assert.match(script, /call:caption/);
});

test("la couche CC est injectée avant la fermeture du head sans supprimer le moteur d'appel", () => {
  const call = session({ mock: true });
  const original = "<!doctype html><html><head><title>Call</title></head><body><div id=\"stage\"></div></body></html>";
  const enriched = injectLiveCaptionRuntime(original, call, "Charlie");

  assert.ok(enriched.includes("<title>Call</title>"));
  assert.ok(enriched.includes("connexioCaptionButton"));
  assert.ok(enriched.indexOf("connexioCaptionButton") < enriched.indexOf("</head>"));
  assert.ok(enriched.includes("<div id=\"stage\"></div>"));
});
