import { createElement, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { getDiscoveryEventProximity } from "../domain/discoveryEvents";
import { getRoleAppearance } from "../domain/roleAppearance";
import { useAppLanguage } from "../providers/LanguageProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { LEAFLET_SCRIPTS, LEAFLET_STYLESHEETS, leafletSecurityMeta } from "../services/maps/leafletAssets";
import type { DiscoveryMapProps } from "./DiscoveryMap.types";

function escapeInline(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export default function DiscoveryMap({ moments, events, selectedEntity, onSelectEntity }: DiscoveryMapProps) {
  const theme = useAppTheme();
  const { uiLanguage } = useAppLanguage();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow || event.origin !== window.location.origin) return;
      if (event.data?.source !== "connexio-discovery-map" || event.data?.type !== "entity-selected") return;
      if ((event.data.kind !== "person" && event.data.kind !== "event") || typeof event.data.id !== "string") return;
      onSelectEntity({ kind: event.data.kind, id: event.data.id });
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onSelectEntity]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ source: "connexio-discovery-parent", type: "selection", selection: selectedEntity ?? null }, window.location.origin);
  }, [selectedEntity]);

  const html = useMemo(() => {
    const people = moments.map((moment) => {
      const role = getRoleAppearance(moment.member.role);
      return { id: moment.member.id, name: moment.member.name, initials: moment.member.initials, avatarUrl: moment.member.avatarUrl ?? null, roleColor: role.border, latitude: moment.latitude, longitude: moment.longitude, pulse: moment.recentPostIds.length > 0 };
    });
    const eventMarkers = events.map((event) => ({ id: event.id, title: event.title, latitude: event.latitude, longitude: event.longitude, proximity: getDiscoveryEventProximity(event) }));
    const tileStyle = theme.isLight ? "light_all" : "dark_all";
    return `<!doctype html><html lang="${uiLanguage}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>${leafletSecurityMeta()}${LEAFLET_STYLESHEETS}<style>
:root{--bg:${theme.pageBackground};--surface:${theme.surface};--text:${theme.pageText};--muted:${theme.pageTextMuted};--border:${theme.border};--shell:${theme.shellBackground}}html,body,#map{height:100%;margin:0;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.leaflet-control-attribution{background:rgba(0,0,0,.1)!important;color:var(--muted)!important;font-size:7px!important}.leaflet-control-attribution a{color:var(--muted)!important}.leaflet-tooltip{background:var(--shell)!important;color:var(--text)!important;border:1px solid var(--border)!important;border-radius:10px!important;font-weight:800;box-shadow:none!important}
.person-marker{width:54px;height:54px;position:relative;display:grid;place-items:center}.person-ring{width:44px;height:44px;border-radius:50%;border:3px solid var(--role);background:var(--surface);overflow:hidden;display:grid;place-items:center;color:var(--text);font-size:11px;font-weight:900;box-shadow:0 5px 13px rgba(8,28,55,.28);transition:transform .18s ease,box-shadow .18s ease;position:relative;z-index:2}.person-ring img{width:100%;height:100%;object-fit:cover}.person-marker.pulse:before{content:"";position:absolute;inset:1px;border-radius:50%;border:2px solid var(--role);opacity:.28;animation:personPulse 4.4s ease-out infinite}.person-marker.selected .person-ring{transform:scale(1.14);box-shadow:0 7px 18px rgba(8,28,55,.4)}
.event-marker{width:60px;height:62px;position:relative;--event:#356f9f;--wave:5.4s;--pulse:0}.event-marker.recent{--event:#6f9dbe;--wave:5.8s;--pulse:.12}.event-marker.voting{--event:#7657d6;--wave:4.8s;--pulse:.24}.event-marker.later{--event:#3479aa;--wave:5.2s;--pulse:.1}.event-marker.within7d{--event:#248fc0;--wave:4.2s;--pulse:.25}.event-marker.within48h{--event:#12b9cc;--wave:2.9s;--pulse:.42}.event-marker.live{--event:#19e0c8;--wave:2s;--pulse:.62}.event-pole{position:absolute;left:15px;top:7px;width:3px;height:45px;border-radius:3px;background:linear-gradient(180deg,#f8fbff,#8da9bb);box-shadow:0 2px 8px rgba(0,0,0,.24);z-index:2}.event-flag{position:absolute;left:18px;top:7px;width:32px;height:23px;background:linear-gradient(115deg,var(--event),rgba(255,255,255,.14));clip-path:polygon(0 0,100% 10%,86% 50%,100% 90%,0 100%);border-radius:2px 7px 7px 2px;transform-origin:0 50%;animation:flagWave var(--wave) ease-in-out infinite;box-shadow:0 4px 12px rgba(15,95,145,.3);z-index:3}.event-flag:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.18),transparent 46%,rgba(0,0,0,.08))}.event-pulse{position:absolute;left:3px;bottom:1px;width:30px;height:14px;border-radius:50%;border:2px solid var(--event);opacity:var(--pulse);animation:eventPulse calc(var(--wave) * .92) ease-out infinite}.event-marker.selected{transform:translateY(-2px) scale(1.12);filter:drop-shadow(0 7px 12px rgba(20,120,165,.32))}
.custom-cluster{background:transparent!important;border:none!important}.cluster-core{width:42px;height:42px;border-radius:50%;border:3px solid rgba(255,255,255,.92);background:#1a88c9;color:#fff;display:grid;place-items:center;font-weight:900;box-shadow:0 6px 16px rgba(20,60,100,.22)}.geo-btn{position:absolute;right:10px;top:10px;z-index:999;width:48px;height:48px;border:0;border-radius:24px;background:var(--shell);color:var(--text);font-size:20px;cursor:pointer;box-shadow:0 5px 16px rgba(30,50,75,.16)}@keyframes personPulse{0%{opacity:.28;transform:scale(.84)}80%,100%{opacity:0;transform:scale(1.28)}}@keyframes flagWave{0%,100%{transform:perspective(70px) rotateY(0deg) skewY(-1deg)}50%{transform:perspective(70px) rotateY(-18deg) skewY(2deg)}}@keyframes eventPulse{0%{transform:scale(.72);opacity:var(--pulse)}78%,100%{transform:scale(1.7);opacity:0}}@media (prefers-reduced-motion:reduce){.person-marker:before,.event-flag,.event-pulse{animation:none!important}}</style></head><body><div id="map"></div><button class="geo-btn" aria-label="Me localiser">◎</button>${LEAFLET_SCRIPTS}<script>
const parentOrigin=(()=>{try{const value=window.parent.location.origin;return value&&value!=='null'?value:null}catch{return null}})();const postToParent=payload=>{if(parentOrigin)window.parent.postMessage(payload,parentOrigin)};const people=${escapeInline(people)};const events=${escapeInline(eventMarkers)};const nodes=new Map();const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));const map=L.map('map',{zoomControl:false,minZoom:5,maxZoom:17,zoomSnap:.25});L.tileLayer('https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);const cluster=L.markerClusterGroup({maxClusterRadius:54,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[42,42]})});const bounds=[];
people.forEach(person=>{const face=person.avatarUrl?'<img src="'+escapeText(person.avatarUrl)+'" alt=""/>':escapeText(person.initials);const html='<div class="person-marker '+(person.pulse?'pulse':'')+'" data-key="person:'+escapeText(person.id)+'" style="--role:'+escapeText(person.roleColor)+'"><div class="person-ring">'+face+'</div></div>';const marker=L.marker([person.latitude,person.longitude],{icon:L.divIcon({className:'',html,iconSize:[54,54],iconAnchor:[27,27]}),title:person.name});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.person-marker');if(node)nodes.set('person:'+person.id,node)});marker.on('click',()=>postToParent({source:'connexio-discovery-map',type:'entity-selected',kind:'person',id:person.id}));marker.bindTooltip(escapeText(person.name),{direction:'bottom',offset:[0,18],opacity:.96});cluster.addLayer(marker);bounds.push([person.latitude,person.longitude]);});
events.forEach(event=>{const html='<div class="event-marker '+escapeText(event.proximity)+'" data-key="event:'+escapeText(event.id)+'"><div class="event-pulse"></div><div class="event-pole"></div><div class="event-flag"></div></div>';const marker=L.marker([event.latitude,event.longitude],{icon:L.divIcon({className:'',html,iconSize:[60,62],iconAnchor:[15,52]}),title:event.title,zIndexOffset:180});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.event-marker');if(node)nodes.set('event:'+event.id,node)});marker.on('click',()=>postToParent({source:'connexio-discovery-map',type:'entity-selected',kind:'event',id:event.id}));marker.bindTooltip(escapeText(event.title),{direction:'bottom',offset:[13,8],opacity:.96});cluster.addLayer(marker);bounds.push([event.latitude,event.longitude]);});map.addLayer(cluster);if(bounds.length){map.fitBounds(bounds,{padding:[36,36],maxZoom:9})}else{map.setView([43.45,2.6],7)}function updateSelection(selection){nodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(selection)&&key===selection.kind+':'+selection.id));}window.addEventListener('message',event=>{if(event.origin!==parentOrigin)return;const data=event.data;if(data?.source==='connexio-discovery-parent'&&data?.type==='selection')updateSelection(data.selection||null)});document.querySelector('.geo-btn').addEventListener('click',()=>{if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(position=>{const point=[position.coords.latitude,position.coords.longitude];map.flyTo(point,13,{duration:.7});L.circle(point,{radius:Math.max(180,position.coords.accuracy),color:'#18a7cc',fillColor:'#18a7cc',fillOpacity:.08,weight:2}).addTo(map);},()=>{}, {enableHighAccuracy:false,timeout:8000,maximumAge:60000});});</script></body></html>`;
  }, [events, moments, theme.isLight, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.surface, uiLanguage]);

  return <View style={[styles.wrap, { backgroundColor: theme.pageBackground }]}>{createElement("iframe", {
    ref: (node: HTMLIFrameElement | null) => { iframeRef.current = node; },
    title: "Carte de découverte Neptune",
    srcDoc: html,
    onLoad: () => iframeRef.current?.contentWindow?.postMessage({ source: "connexio-discovery-parent", type: "selection", selection: selectedEntity ?? null }, window.location.origin),
    sandbox: "allow-scripts allow-same-origin",
    referrerPolicy: "no-referrer",
    style: { width: "100%", height: "100%", border: 0, display: "block", background: theme.pageBackground },
    allow: "geolocation"
  })}</View>;
}

const styles = StyleSheet.create({ wrap: { flex: 1, minHeight: 420, overflow: "hidden", borderRadius: 22 } });
