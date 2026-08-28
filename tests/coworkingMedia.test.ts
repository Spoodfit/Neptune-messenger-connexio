import { doesNotThrow, match, ok } from "node:assert";
import { test } from "node:test";

import { buildCoworkingMediaHtml } from "../src/services/coworking/coworkingMedia";

const html = buildCoworkingMediaHtml({
  spaceId: "space-test",
  socketUrl: "https://media.example.com",
  socketPath: "/socket.io",
  token: "short-lived-test-token",
  participantId: "me",
  iceServers: [],
  mock: false
}, "Moi", {
  cameraOn: true,
  microphoneOn: false,
  roomViewMode: "stage",
  focusParticipantId: "host"
});

test("la visio privée démarre avec une personne distante en scène et une vue d’ensemble circulaire", () => {
  match(html, /#remoteGrid\.room-stage \.remote\{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:26px/);
  match(html, /#remoteGrid\.room-overview \.remote\{[^}]*border-radius:50%/);
  match(html, /#remoteGrid\.room-stage \.remote \.name\{bottom:92px/);
  match(html, /video\.video-ready[^}]*opacity:1/);
  match(html, /videoTracks\.some\(track=>track\.readyState==='live'&&!track\.muted\)/);
  match(html, /command\.type==='room-view'/);
  match(html, /cfg\.focusParticipantId/);
  match(html, /#local\.room-stage\{bottom:92px\}/);
  match(html, /remoteNodes\.delete\(participantId\);applyRoomView\(\)/);
});

test("le document média injecté reste syntaxiquement valide", () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .flatMap((result) => typeof result[1] === "string" && result[1].trim() ? [result[1]] : []);
  ok(scripts.length > 0);
  for (const script of scripts) doesNotThrow(() => new Function(script));
});

test("le document média applique une CSP et la langue active", () => {
  const localizedHtml = buildCoworkingMediaHtml({
    spaceId: "space-test",
    socketUrl: "wss://media.example.com/realtime",
    socketPath: "/socket.io",
    token: "short-lived-test-token",
    participantId: "me",
    clientScriptUrl: "https://media.example.com/client.js",
    iceServers: [],
    mock: false
  }, "Moi", { cameraOn: true, microphoneOn: false }, "en");
  match(localizedHtml, /<html lang="en">/);
  match(localizedHtml, /Content-Security-Policy/);
  match(localizedHtml, /connect-src https:\/\/media\.example\.com wss:\/\/media\.example\.com/);
  match(localizedHtml, /client\.js" crossorigin="anonymous"/);
});

test("les niveaux audio pilotent un halo discret autour des participants", () => {
  match(html, /@keyframes audioHalo/);
  match(html, /monitorAudio=\(stream,node,key\)=>/);
  match(html, /node\.classList\.toggle\('speaking',level>/);
  match(html, /post\('audio-level'/);
});

test("le partage d’écran accepte un adaptateur natif ou getDisplayMedia", () => {
  match(html, /command\.type==='screen-share'/);
  match(html, /client\.startScreenShare/);
  match(html, /navigator\.mediaDevices\?\.getDisplayMedia/);
  match(html, /client\.replaceVideoTrack/);
  match(html, /screen-share-state/);
});

test("une session mock demande aussi la caméra locale sans exiger le SFU", () => {
  const mockHtml = buildCoworkingMediaHtml({
    spaceId: "space-test",
    socketUrl: "https://mock.connexio.local",
    socketPath: "/socket.io",
    token: "mock-token",
    participantId: "me",
    iceServers: [],
    mock: true
  }, "Moi", { cameraOn: true, microphoneOn: false });
  match(mockHtml, /await ensureLocalMedia\(\)/);
  match(mockHtml, /if\(cfg\.mock\)\{/);
  match(mockHtml, /post\('local-media-ready'\)/);
});
