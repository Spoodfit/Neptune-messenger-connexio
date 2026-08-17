import { createElement, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { getDiscoveryEventState } from "../domain/discoveryEvents";
import { getRoleAppearance } from "../domain/roleAppearance";
import { useAppTheme } from "../providers/ThemeProvider";
import type { DiscoveryMapProps } from "./DiscoveryMap.types";

function escapeInline(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export default function DiscoveryMap({ moments, events, selectedEntity, onSelectEntity }: DiscoveryMapProps) {
  const theme = useAppTheme();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.source !== "connexio-discovery-map" || event.data?.type !== "entity-selected") return;
      if ((event.data.kind !== "person" && event.data.kind !== "event") || typeof event.data.id !== "string") return;
      onSelectEntity({ kind: event.data.kind, id: event.data.id });
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onSelectEntity]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: "connexio-discovery-parent", type: "selection", selection: selectedEntity ?? null },
      "*"
    );
  }, [selectedEntity]);

  const html = useMemo(() => {
    const people = moments.map((moment) => {
      const role = getRoleAppearance(moment.member.role);
      return {
        id: moment.member.id,
        name: moment.member.name,
        initials: moment.member.initials,
        avatarUrl: moment.member.avatarUrl ?? null,
        roleColor: role.border,
        latitude: moment.latitude,
        longitude: moment.longitude,
        pulse: moment.recentPostIds.length > 0
      };
    });
    const eventMarkers = events.map((event) => ({
      id: event.id,
      title: event.title,
      latitude: event.latitude,
      longitude: event.longitude,
      state: getDiscoveryEventState(event)
    }));
    const tileStyle = theme.isLight ? "light_all" : "dark_all";
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/><link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/><link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"/>
<style>
:root{--bg:${theme.pageBackground};--surface:${theme.surface};--strong:${theme.surfaceStrong};--text:${theme.pageText};--muted:${theme.pageTextMuted};--border:${theme.border};--accent:${theme.accent};--violet:${theme.violet};--orange:${theme.orange};--success:${theme.success};--warning:${theme.warning};--shell:${theme.shellBackground}}
html,body,#map{height:100%;margin:0;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.leaflet-control-attribution{background:var(--shell)!important;color:var(--muted)!important;font-size:8px!important}.leaflet-control-attribution a{color:var(--accent)!important}.leaflet-bar{border:1px solid var(--border)!important;border-radius:14px!important;overflow:hidden;box-shadow:0 8px 24px rgba(16,38,68,.16)!important}.leaflet-bar a{background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important}.leaflet-tooltip{background:var(--shell)!important;color:var(--text)!important;border:1px solid var(--border)!important;border-radius:10px!important;box-shadow:0 8px 22px rgba(10,30,58,.18)!important;font-weight:700}
.person-marker,.event-marker{width:60px;height:60px;position:relative;display:grid;place-items:center;will-change:transform}.person-core{width:48px;height:48px;border-radius:18px;padding:2px;border:3px solid var(--role);background:var(--surface);box-shadow:0 8px 22px rgba(20,45,78,.25);position:relative;z-index:2;transition:transform .18s ease,box-shadow .18s ease}.person-inner{height:100%;border-radius:15px;border:2px solid var(--surface);background:var(--strong);color:var(--text);display:grid;place-items:center;font-weight:900;font-size:11px;overflow:hidden}.person-inner img{width:100%;height:100%;object-fit:cover}.person-marker.pulse:before{content:"";position:absolute;inset:2px;border-radius:50%;border:2px solid var(--accent);opacity:.5;animation:pulse 3.6s ease-out infinite}.person-marker.selected .person-core{transform:scale(1.12);box-shadow:0 0 0 7px rgba(10,88,196,.16),0 10px 30px rgba(30,50,80,.28)}
.event-core{width:46px;height:46px;border-radius:15px;transform:rotate(45deg);display:grid;place-items:center;border:3px solid var(--surface);box-shadow:0 9px 24px rgba(20,45,78,.26);position:relative;z-index:2;transition:transform .18s ease,box-shadow .18s ease}.event-icon{transform:rotate(-45deg);font-size:20px;color:#fff;line-height:1}.event-marker.live .event-core{background:var(--success)}.event-marker.upcoming .event-core{background:var(--accent)}.event-marker.past24h .event-core{background:var(--warning)}.event-marker.live:before,.event-marker.live:after{content:"";position:absolute;inset:1px;border-radius:20px;border:2px solid var(--success);animation:eventPulse 2.6s ease-out infinite}.event-marker.live:after{animation-delay:.65s}.event-marker.selected .event-core{transform:rotate(45deg) scale(1.14);box-shadow:0 0 0 8px rgba(10,88,196,.15),0 12px 30px rgba(30,50,80,.3)}
.custom-cluster{background:transparent!important;border:none!important}.cluster-core{width:48px;height:48px;border-radius:18px;border:3px solid var(--surface);background:linear-gradient(135deg,var(--accent),var(--violet),var(--orange));color:#fff;display:grid;place-items:center;font-weight:900;box-shadow:0 8px 24px rgba(37,54,84,.28)}.geo-btn{position:absolute;right:12px;top:12px;z-index:999;width:48px;height:48px;border:1px solid var(--border);border-radius:15px;background:var(--surface);color:var(--text);font-size:20px;cursor:pointer;box-shadow:0 5px 16px rgba(30,50,75,.18)}
@keyframes pulse{0%{opacity:.55;transform:scale(.85)}80%,100%{opacity:0;transform:scale(1.42)}}@keyframes eventPulse{0%{opacity:.75;transform:scale(.75)}75%,100%{opacity:0;transform:scale(1.28)}}
</style></head><body><div id="map"></div><button class="geo-btn" aria-label="Me localiser">◎</button>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script><script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script><script>
const people=${escapeInline(people)};const events=${escapeInline(eventMarkers)};const nodes=new Map();const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const map=L.map('map',{zoomControl:true,minZoom:5,maxZoom:17,zoomSnap:.25});L.tileLayer('https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);const cluster=L.markerClusterGroup({maxClusterRadius:58,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[48,48]})});const bounds=[];
people.forEach(person=>{const avatar=person.avatarUrl?'<img src="'+escapeText(person.avatarUrl)+'" alt=""/>':escapeText(person.initials);const html='<div class="person-marker '+(person.pulse?'pulse':'')+'" data-key="person:'+escapeText(person.id)+'" style="--role:'+escapeText(person.roleColor)+'"><div class="person-core"><div class="person-inner">'+avatar+'</div></div></div>';const marker=L.marker([person.latitude,person.longitude],{icon:L.divIcon({className:'',html,iconSize:[60,60],iconAnchor:[30,30]}),title:person.name});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.person-marker');if(node)nodes.set('person:'+person.id,node)});marker.on('click',()=>window.parent.postMessage({source:'connexio-discovery-map',type:'entity-selected',kind:'person',id:person.id},'*'));marker.bindTooltip(escapeText(person.name),{direction:'bottom',offset:[0,24],opacity:.96});cluster.addLayer(marker);bounds.push([person.latitude,person.longitude]);});
events.forEach(event=>{const html='<div class="event-marker '+escapeText(event.state)+'" data-key="event:'+escapeText(event.id)+'"><div class="event-core"><div class="event-icon">✦</div></div></div>';const marker=L.marker([event.latitude,event.longitude],{icon:L.divIcon({className:'',html,iconSize:[60,60],iconAnchor:[30,30]}),title:event.title,zIndexOffset:180});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.event-marker');if(node)nodes.set('event:'+event.id,node)});marker.on('click',()=>window.parent.postMessage({source:'connexio-discovery-map',type:'entity-selected',kind:'event',id:event.id},'*'));marker.bindTooltip(escapeText(event.title),{direction:'bottom',offset:[0,24],opacity:.96});cluster.addLayer(marker);bounds.push([event.latitude,event.longitude]);});
map.addLayer(cluster);if(bounds.length){map.fitBounds(bounds,{padding:[58,58],maxZoom:9})}else{map.setView([43.45,2.6],7)}
function updateSelection(selection){nodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(selection)&&key===selection.kind+':'+selection.id));}window.addEventListener('message',event=>{const data=event.data;if(data?.source==='connexio-discovery-parent'&&data?.type==='selection')updateSelection(data.selection||null)});document.querySelector('.geo-btn').addEventListener('click',()=>{if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(position=>{const point=[position.coords.latitude,position.coords.longitude];map.flyTo(point,13,{duration:.8});L.circle(point,{radius:Math.max(180,position.coords.accuracy),color:'${theme.orange}',fillColor:'${theme.accent}',fillOpacity:.12,weight:2}).addTo(map);},()=>{}, {enableHighAccuracy:false,timeout:8000,maximumAge:60000});});
</script></body></html>`;
  }, [events, moments, theme.accent, theme.border, theme.isLight, theme.orange, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.success, theme.surface, theme.surfaceStrong, theme.violet, theme.warning]);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.pageBackground, borderColor: theme.border }]}>
      {createElement("iframe", {
        ref: (node: HTMLIFrameElement | null) => { iframeRef.current = node; },
        title: "Carte de découverte Neptune",
        srcDoc: html,
        onLoad: () => iframeRef.current?.contentWindow?.postMessage({ source: "connexio-discovery-parent", type: "selection", selection: selectedEntity ?? null }, "*"),
        style: { width: "100%", height: "100%", border: 0, display: "block", background: theme.pageBackground },
        allow: "geolocation"
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 420, overflow: "hidden", borderRadius: 26, borderWidth: 1 }
});
