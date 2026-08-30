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
    }, {
      id: "member:guest",
      name: "Noé Réseau",
      initials: "NR",
      cameraOn: false
    }]
  }],
  events: [{
    id: "event:test",
    title: "Rencontre test",
    latitude: 43.22,
    longitude: 2.36,
    proximity: "within48h",
    startsAt: "2026-09-03T18:00:00.000Z",
    city: "Carcassonne"
  }],
  focusLocation: { latitude: 43.213, longitude: 2.351 },
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

test("les dépendances cartographiques distantes sont verrouillées et le document est cloisonné", () => {
  match(html, /Content-Security-Policy/);
  match(html, /leaflet@1\.9\.4[^>]+integrity="sha384-/);
  match(html, /leaflet\.markercluster@1\.5\.3[^>]+integrity="sha384-/);
  match(html, /crossorigin="anonymous"/);
  ok(!html.includes("postMessage({source:'connexio-coworking-map',...payload},'*')"));
});

test("le fond cartographique ne dépend plus de CARTO ni d’une clé API", () => {
  match(html, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  ok(!html.includes("basemaps.cartocdn.com"));
  ok(!html.includes("API KEY REQUIRED"));
});

test("les personnes réunies en visio partagent une zone discrète identifiable", () => {
  match(html, /cw-room-zone/);
  match(html, /cw-room-label.*item\.members\.length/);
  match(html, /cw-marker\.busy \.cw-room-zone/);
});

test("les dates d’évènement restent géographiquement ancrées et explicites", () => {
  match(html, /L\.marker\(\[event\.latitude,event\.longitude\]/);
  match(html, /L\.markerClusterGroup\(\{/);
  match(html, /connexioEventCount:1/);
  match(html, /event-calendar/);
  match(html, /event-day/);
  match(html, /event-month/);
  ok(!html.includes("event-flag"));
  ok(!html.includes("event-pole"));
  match(html, /function computeEventOffsets\(\)/);
  match(html, /map\.on\('zoomend moveend'/);
  match(html, /event-connector/);
});

test("les événements et les membres superposés sont visuellement séparés et gardent chacun leur cible tactile", () => {
  match(html, /zIndexOffset:500/);
  match(html, /title:event\.title,zIndexOffset:750,keyboard:true,connexioPeopleCount:0,connexioEventCount:1,connexioEventId:event\.id/);
  match(html, /\.event-hit\{[^}]+left:3px;top:0;width:50px;height:52px[^}]+pointer-events:auto/);
  match(html, /memberClearance>=38&&eventClearance>=28/);
  match(html, /nearMember\?candidates:\[\{x:0,y:0\},\.\.\.candidates\]/);
  match(html, /--event-offset-x/);
  match(html, /if\(map\.getZoom\(\)<13\)/);
  ok(!html.includes("{x:104,y:-38}"));
});

test("le regroupement régional nomme les contenus et ouvre la sélection de zone", () => {
  match(html, /getAllChildMarkers\(\)/);
  match(html, /cluster-part/);
  match(html, /cluster-events/);
  match(html, /clusterCopy\.members/);
  match(html, /clusterCopy\.eventShort/);
  match(html, /zoomToBoundsOnClick:false/);
  match(html, /type:'cluster-selected',markerIds,eventIds/);
  match(html, /connexioMarkerId:item\.id/);
  ok(!html.includes("const total=counts.people+counts.events"));
});

test("le Radar s’ouvre sur le bassin local avant de proposer toute la communauté", () => {
  match(html, /const focusLocation=/);
  match(html, /map\.distance\(focus,point\)<=230000/);
  match(html, /function fitInitial\(\)/);
  match(html, /if\(data\?\.type==='fit-all'\)fitAll\(\)/);
});
