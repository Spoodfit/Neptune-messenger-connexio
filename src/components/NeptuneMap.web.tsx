import { createElement, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import type { NeptuneMapProps } from "./NeptuneMap.types";

export default function NeptuneMap({
  moments,
  selectedMemberId,
  onSelectMember
}: NeptuneMapProps) {
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.source !== "connexio-map") return;
      if (event.data?.type !== "member-selected") return;
      if (typeof event.data.memberId !== "string") return;
      onSelectMember(event.data.memberId);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onSelectMember]);

  const html = useMemo(() => {
    const markerData = moments.map((moment) => ({
      id: moment.member.id,
      name: moment.member.name,
      initials: moment.member.initials,
      latitude: moment.latitude,
      longitude: moment.longitude,
      pulse: moment.recentPostIds.length > 0,
      selected: moment.member.id === selectedMemberId
    }));
    const serialized = JSON.stringify(markerData).replaceAll("<", "\\u003c");
    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>
html,body,#map{height:100%;margin:0;background:#020713;font-family:Arial,sans-serif}
.leaflet-control-attribution{background:rgba(2,7,19,.78)!important;color:#aeb8d2!important;font-size:8px!important}
.leaflet-control-attribution a{color:#86b8ff!important}
.leaflet-bar a{background:#081226!important;color:#fff!important;border-color:rgba(255,255,255,.12)!important}
.member-marker{width:56px;height:56px;position:relative;display:grid;place-items:center}
.member-core{width:44px;height:44px;border-radius:17px;padding:2px;background:linear-gradient(135deg,#0048ba,#6b4fea,#f4b183);box-shadow:0 0 22px rgba(107,79,234,.45);position:relative;z-index:2}
.member-inner{height:100%;border-radius:15px;border:2px solid #081226;background:#101a31;color:#fff;display:grid;place-items:center;font-weight:900;font-size:11px}
.member-marker.pulse:before,.member-marker.pulse:after{content:"";position:absolute;inset:3px;border-radius:50%;border:2px solid rgba(0,114,255,.55);animation:pulse 4.8s ease-out infinite}
.member-marker.pulse:after{inset:-4px;border-color:rgba(244,177,131,.38);animation-delay:.2s}
.member-marker.selected .member-core{transform:scale(1.12);box-shadow:0 0 0 7px rgba(0,72,186,.14),0 0 34px rgba(107,79,234,.65)}
@keyframes pulse{0%,68%,100%{opacity:0;transform:scale(.84)}72%{opacity:.9}88%{opacity:0;transform:scale(1.38)}}
.custom-cluster{background:transparent!important;border:none!important}
.cluster-core{width:48px;height:48px;border-radius:18px;border:3px solid #fff;background:linear-gradient(135deg,#0048ba,#6b4fea,#a950d8);color:#fff;display:grid;place-items:center;font-weight:900;box-shadow:0 0 28px rgba(107,79,234,.55)}
.geo-btn{position:absolute;right:12px;top:12px;z-index:999;width:44px;height:44px;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:#081226;color:#fff;font-size:20px;cursor:pointer}
</style>
</head>
<body>
<div id="map"></div><button class="geo-btn" aria-label="Me localiser">◎</button>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
const members=${serialized};
const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const map=L.map('map',{zoomControl:true,minZoom:5,maxZoom:16,zoomSnap:.25});
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
const cluster=L.markerClusterGroup({maxClusterRadius:56,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[48,48]})});
const bounds=[];
members.forEach(member=>{
 const html='<div class="member-marker '+(member.pulse?'pulse ':'')+(member.selected?'selected':'')+'"><div class="member-core"><div class="member-inner">'+escapeText(member.initials)+'</div></div></div>';
 const marker=L.marker([member.latitude,member.longitude],{icon:L.divIcon({className:'',html,iconSize:[56,56],iconAnchor:[28,28]}),title:member.name});
 marker.on('click',()=>window.parent.postMessage({source:'connexio-map',type:'member-selected',memberId:member.id},'*'));
 marker.bindTooltip(escapeText(member.name),{direction:'bottom',offset:[0,22],opacity:.92});
 cluster.addLayer(marker);bounds.push([member.latitude,member.longitude]);
});
map.addLayer(cluster);
if(bounds.length){map.fitBounds(bounds,{padding:[54,54],maxZoom:9})}else{map.setView([43.45,2.6],7)}
document.querySelector('.geo-btn').addEventListener('click',()=>{
 if(!navigator.geolocation)return;
 navigator.geolocation.getCurrentPosition(position=>{
  const point=[position.coords.latitude,position.coords.longitude];
  map.flyTo(point,13,{duration:.8});
  L.circle(point,{radius:Math.max(180,position.coords.accuracy),color:'#f4b183',fillColor:'#0048ba',fillOpacity:.12,weight:2}).addTo(map);
 },()=>{}, {enableHighAccuracy:false,timeout:8000,maximumAge:60000});
});
</script>
</body></html>`;
  }, [moments, selectedMemberId]);

  return (
    <View style={styles.wrap}>
      {createElement("iframe", {
        title: "Carte Neptune",
        srcDoc: html,
        style: {
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
          background: "#020713"
        },
        allow: "geolocation"
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 420,
    overflow: "hidden",
    borderRadius: 24
  }
});
