import { doesNotThrow, match, ok } from "node:assert";
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
  events: [{
    id: "event:test",
    title: "Rencontre test",
    latitude: 43.22,
    longitude: 2.36,
    proximity: "within48h"
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
  match(html, /onload="this\.parentElement\.classList\.add\(&quot;avatar-ready&quot;\)"/);
  match(html, /onerror="this\.remove\(\)"/);
});

test("une caméra déclarée active ne masque jamais l’avatar sans flux vidéo", () => {
  match(html, /<video[^>]+onplaying="this\.classList\.add\(&quot;video-ready&quot;\)"/);
  match(html, /\.cw-face video\.video-ready\{opacity:1/);
  ok(!html.includes(".cw-face video{z-index:2;background:var(--surfaceStrong)}"));
});

test("chaque script injecté dans l’iframe reste du JavaScript syntaxiquement valide", () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .flatMap((matchResult) => typeof matchResult[1] === "string" && matchResult[1].trim().length > 0 ? [matchResult[1]] : []);

  ok(scripts.length > 0);
  for (const script of scripts) doesNotThrow(() => new Function(script));
});

test("les drapeaux restent ancrés à leurs coordonnées après un déplacement de carte", () => {
  ok(!html.includes("--event-offset-x"));
  ok(!html.includes("applyEventOffsets"));
  match(html, /L\.marker\(\[event\.latitude,event\.longitude\]/);
  match(html, /L\.markerClusterGroup\(\{/);
  match(html, /event-cluster-core/);
});

test("les événements et les membres superposés gardent chacun leur cible tactile", () => {
  match(html, /zIndexOffset:500/);
  match(html, /title:event\.title,zIndexOffset:750,keyboard:true/);
  match(html, /\.event-hit\{[^}]+left:2px;top:-2px;width:44px;height:44px[^}]+pointer-events:auto/);
});
