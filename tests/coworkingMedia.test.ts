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
  gridLayout: true,
  participantLayout: {
    me: { x: 50, y: 25, width: 320, height: 260 },
    host: { x: 50, y: 75, width: 320, height: 260 }
  }
});

test("la visio privée utilise une seule grille où la vidéo remplace l’avatar", () => {
  match(html, /const freeLayout=\(\)=>Boolean\(cfg\.mapMode\|\|cfg\.spatialAudio\|\|cfg\.gridLayout\)/);
  match(html, /const positionLocal=\(\)=>\{\s+if\(!freeLayout\(\)\|\|cfg\.mapMode\)return/);
  match(html, /cfg\.gridLayout\?'22px':'24px'/);
  match(html, /positionNode\(node,participant\.id\)/);
  match(html, /video\.video-ready[^}]*opacity:1/);
  match(html, /videoTracks\.some\(track=>track\.readyState==='live'&&!track\.muted\)/);
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
  match(html, /post\('capabilities',\{screenShare:/);
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
