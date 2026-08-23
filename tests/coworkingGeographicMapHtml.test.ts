import { match, ok } from "node:assert";
import { test } from "node:test";

import { buildCoworkingGeographicMapHtml } from "../src/services/coworking/geographicMapHtml";

const html = buildCoworkingGeographicMapHtml({
  bridge: "web",
  markers: [{
    id: "space:test",
    latitude: 43.21,
    longitude: 2.35,
    availability: "busy",
    spaceId: "test",
    members: [{
      id: "member:test",
      name: "Ava Business",
      initials: "AB",
      avatarUrl: "https://example.com/avatar.jpg",
      cameraOn: true
    }]
  }],
  mediaSession: {
    spaceId: "test",
    socketUrl: "wss://example.com",
    socketPath: "/v1/realtime",
    token: "test-token",
    participantId: "member:test",
    iceServers: [],
    mock: true
  },
  theme: {
    pageBackground: "#020713",
    surface: "#091226",
    surfaceStrong: "#101B33",
    pageText: "#FFFFFF",
    pageTextMuted: "#A6B1C8",
    border: "#24304A",
    shellBackground: "#071127",
    isLight: false
  }
});

test("la Map garde les initiales tant que l’avatar distant n’est pas prêt", () => {
  match(html, /const fallback='<span class="cw-fallback">'\+escapeText\(member\.initials\|\|'\?'\)\+'<\/span>';/);
  match(html, /\.cw-face img,[^}]+opacity:0/);
  match(html, /onload="this\.parentElement\.classList\.add\('avatar-ready'\)"/);
  match(html, /onerror="this\.remove\(\)"/);
});

test("une caméra déclarée active ne masque jamais l’avatar sans flux vidéo", () => {
  match(html, /<video[^>]+onplaying="this\.classList\.add\('video-ready'\)"/);
  match(html, /\.cw-face video\.video-ready\{opacity:1/);
  ok(!html.includes(".cw-face video{z-index:2;background:var(--surfaceStrong)}"));
});
