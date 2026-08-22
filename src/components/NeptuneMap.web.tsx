import {
  createElement,
  useEffect,
  useMemo,
  useRef } from "react";
import { StyleSheet,
  View
} from "react-native";

import { getRoleAppearance } from "../domain/roleAppearance";
import { useAppTheme } from "../providers/ThemeProvider";
import type { NeptuneMapProps } from "./NeptuneMap.types";

export default function NeptuneMap({ moments, selectedMemberId, onSelectMember }: NeptuneMapProps) {
  const theme = useAppTheme();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.source !== "connexio-map" || event.data?.type !== "member-selected" || typeof event.data.memberId !== "string") return;
      onSelectMember(event.data.memberId);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onSelectMember]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ source: "connexio-map-parent", type: "selected-member", memberId: selectedMemberId }, "*");
  }, [selectedMemberId]);

  const html = useMemo(() => {
    const markerData = moments.map((moment) => {
      const roleAppearance = getRoleAppearance(moment.member.role);
      return { id: moment.member.id, name: moment.member.name, initials: moment.member.initials, avatarUrl: moment.member.avatarUrl ?? null, roleColor: roleAppearance.border, latitude: moment.latitude, longitude: moment.longitude, pulse: moment.recentPostIds.length > 0 };
    });
    const serialized = JSON.stringify(markerData).replaceAll("<", "\\u003c");
    const tileStyle = theme.isLight ? "light_all" : "dark_all";
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" /><link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" /><link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>
:root{--bg:${theme.pageBackground};--surface:${theme.surface};--surface-strong:${theme.surfaceStrong};--text:${theme.pageText};--muted:${theme.pageTextMuted};--border:${theme.border};--accent:${theme.accent};--violet:${theme.violet};--orange:${theme.orange};--shell:${theme.shellBackground}}
html,body,#map{height:100%;margin:0;background:var(--bg);font-family:Arial,sans-serif}.leaflet-control-attribution{background:var(--shell)!important;color:var(--muted)!important;font-size:8px!important}.leaflet-control-attribution a{color:var(--accent)!important}.leaflet-bar{border:1px solid var(--border)!important;border-radius:12px!important;overflow:hidden}.leaflet-bar a{background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important}.leaflet-tooltip{background:var(--shell)!important;color:var(--text)!important;border:1px solid var(--border)!important}
.member-marker{width:56px;height:56px;position:relative;display:grid;place-items:center;will-change:transform}.member-core{width:48px;height:48px;border-radius:17px;padding:2px;border:3px solid var(--role-color);background:var(--surface);box-shadow:0 7px 22px rgba(27,54,82,.24);position:relative;z-index:2;transition:transform .18s ease,box-shadow .18s ease}.member-inner{height:100%;border-radius:15px;border:2px solid var(--surface);background:var(--surface-strong);color:var(--text);display:grid;place-items:center;font-weight:900;font-size:11px;overflow:hidden}.member-inner img{width:100%;height:100%;object-fit:cover}.member-marker.pulse:before,.member-marker.pulse:after{content:"";position:absolute;inset:3px;border-radius:50%;border:2px solid color-mix(in srgb,var(--accent) 62%,transparent);animation:pulse 4.8s ease-out infinite}.member-marker.pulse:after{inset:-4px;border-color:color-mix(in srgb,var(--orange) 52%,transparent);animation-delay:.2s}.member-marker.selected .member-core{transform:scale(1.12);box-shadow:0 0 0 7px color-mix(in srgb,var(--accent) 17%,transparent),0 0 28px color-mix(in srgb,var(--violet) 48%,transparent)}@keyframes pulse{0%,68%,100%{opacity:0;transform:scale(.84)}72%{opacity:.9}88%{opacity:0;transform:scale(1.38)}}.custom-cluster{background:transparent!important;border:none!important}.cluster-core{width:48px;height:48px;border-radius:18px;border:3px solid var(--surface);background:linear-gradient(135deg,var(--accent),var(--violet),var(--orange));color:#fff;display:grid;place-items:center;font-weight:900;box-shadow:0 8px 24px rgba(37,54,84,.28)}.geo-btn{position:absolute;right:12px;top:12px;z-index:999;width:48px;height:48px;border:1px solid var(--border);border-radius:15px;background:var(--surface);color:var(--text);font-size:20px;cursor:pointer;box-shadow:0 5px 16px rgba(30,50,75,.18)}
</style></head><body><div id="map"></div><button class="geo-btn" aria-label="Me localiser">◎</button>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script><script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script><script>
const members=${serialized};const markerNodes=new Map();const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));const map=L.map('map',{zoomControl:true,minZoom:5,maxZoom:16,zoomSnap:.25});L.tileLayer('https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);const cluster=L.markerClusterGroup({maxClusterRadius:56,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[48,48]})});const bounds=[];members.forEach(member=>{const avatarMarkup=member.avatarUrl?'<img src="'+escapeText(member.avatarUrl)+'" alt="" />':escapeText(member.initials);const html='<div class="member-marker '+(member.pulse?'pulse':'')+'" data-member-id="'+escapeText(member.id)+'" style="--role-color:'+escapeText(member.roleColor)+'"><div class="member-core"><div class="member-inner">'+avatarMarkup+'</div></div></div>';const marker=L.marker([member.latitude,member.longitude],{icon:L.divIcon({className:'',html,iconSize:[58,58],iconAnchor:[29,29]}),title:member.name});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.member-marker');if(node)markerNodes.set(member.id,node)});marker.on('click',()=>window.parent.postMessage({source:'connexio-map',type:'member-selected',memberId:member.id},'*'));marker.bindTooltip(escapeText(member.name),{direction:'bottom',offset:[0,23],opacity:.96});cluster.addLayer(marker);bounds.push([member.latitude,member.longitude]);});map.addLayer(cluster);if(bounds.length){map.fitBounds(bounds,{padding:[54,54],maxZoom:9})}else{map.setView([43.45,2.6],7)}const updateSelection=memberId=>markerNodes.forEach((node,id)=>node.classList.toggle('selected',Boolean(memberId)&&id===memberId));window.addEventListener('message',event=>{const data=event.data;if(data?.source==='connexio-map-parent'&&data?.type==='selected-member')updateSelection(data.memberId||null)});document.querySelector('.geo-btn').addEventListener('click',()=>{if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(position=>{const point=[position.coords.latitude,position.coords.longitude];map.flyTo(point,13,{duration:.8});L.circle(point,{radius:Math.max(180,position.coords.accuracy),color:'${theme.orange}',fillColor:'${theme.accent}',fillOpacity:.12,weight:2}).addTo(map);},()=>{}, {enableHighAccuracy:false,timeout:8000,maximumAge:60000});});
</script></body></html>`;
  }, [moments, theme.accent, theme.border, theme.isLight, theme.orange, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.surface, theme.surfaceStrong, theme.violet]);

  return <View style={[styles.wrap, { backgroundColor: theme.pageBackground, borderColor: theme.border }]}>{createElement("iframe", { ref: (node: HTMLIFrameElement | null) => { iframeRef.current = node; }, title: "Carte Neptune", srcDoc: html, onLoad: () => iframeRef.current?.contentWindow?.postMessage({ source: "connexio-map-parent", type: "selected-member", memberId: selectedMemberId }, "*"), style: { width: "100%", height: "100%", border: 0, display: "block", background: theme.pageBackground }, allow: "geolocation" })}</View>;
}

const styles = StyleSheet.create({ wrap: { flex: 1, minHeight: 420, overflow: "hidden", borderRadius: 24, borderWidth: 1 } });
