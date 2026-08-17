import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { getDiscoveryEventProximity } from "../domain/discoveryEvents";
import { getRoleAppearance } from "../domain/roleAppearance";
import { useAppTheme } from "../providers/ThemeProvider";
import { AppAlert } from "../services/ui/AppAlert";
import type { DiscoveryMapProps } from "./DiscoveryMap.types";

interface UserLocation { latitude: number; longitude: number; accuracy: number; }

function escapeInline(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export default function DiscoveryMap({ moments, events, selectedEntity, onSelectEntity }: DiscoveryMapProps) {
  const theme = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const postState = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "selection", selection: selectedEntity ?? null }));
    if (userLocation) webViewRef.current?.postMessage(JSON.stringify({ type: "user-location", location: userLocation }));
  };

  useEffect(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "selection", selection: selectedEntity ?? null }));
  }, [selectedEntity]);

  const html = useMemo(() => {
    const people = moments.map((moment) => {
      const role = getRoleAppearance(moment.member.role);
      return { id: moment.member.id, name: moment.member.name, initials: moment.member.initials, avatarUrl: moment.member.avatarUrl ?? null, roleColor: role.border, latitude: moment.latitude, longitude: moment.longitude, pulse: moment.recentPostIds.length > 0 };
    });
    const eventMarkers = events.map((event) => ({ id: event.id, title: event.title, latitude: event.latitude, longitude: event.longitude, proximity: getDiscoveryEventProximity(event) }));
    const tileStyle = theme.isLight ? "light_all" : "dark_all";
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/><link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"/>
<style>:root{--bg:${theme.pageBackground};--surface:${theme.surface};--text:${theme.pageText};--muted:${theme.pageTextMuted};--border:${theme.border};--accent:${theme.accent};--shell:${theme.shellBackground}}html,body,#map{height:100%;margin:0;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.leaflet-control-attribution{background:rgba(0,0,0,.12)!important;color:var(--muted)!important;font-size:7px!important}.leaflet-control-attribution a{color:var(--muted)!important}.leaflet-tooltip{background:var(--shell)!important;color:var(--text)!important;border:1px solid var(--border)!important;border-radius:10px!important;font-weight:800;box-shadow:none!important}.person-marker{width:62px;height:74px;position:relative;display:flex;align-items:flex-start;justify-content:center}.person-character{position:relative;width:42px;height:67px;filter:drop-shadow(0 5px 8px rgba(10,35,65,.25));transition:transform .2s ease}.person-head{position:absolute;top:0;left:4px;width:34px;height:34px;border-radius:15px;border:3px solid var(--role);background:var(--surface);overflow:hidden;display:grid;place-items:center;color:var(--text);font-size:10px;font-weight:900;z-index:3}.person-head img{width:100%;height:100%;object-fit:cover}.person-body{position:absolute;top:29px;left:7px;width:28px;height:31px;border-radius:14px 14px 10px 10px;background:linear-gradient(160deg,var(--role),#0b4f8f);border:2px solid var(--surface);z-index:2}.person-body:after{content:"";position:absolute;left:5px;right:5px;bottom:-7px;height:12px;border-radius:8px;background:var(--role);transform:skewX(-10deg)}.person-marker.pulse:before{content:"";position:absolute;top:-2px;width:48px;height:48px;border-radius:50%;border:2px solid var(--role);opacity:.35;animation:personPulse 4s ease-out infinite}.person-marker.selected .person-character{transform:translateY(-3px) scale(1.12)}.event-marker{width:52px;height:52px;position:relative;display:grid;place-items:center;--ping:#2686d6}.event-marker.live{--ping:#00cdb8}.event-marker.within48h{--ping:#16b4d3}.event-marker.within7d{--ping:#2b93d1}.event-marker.later{--ping:#316cb2}.event-marker.past24h{--ping:#69aee1}.event-core{width:22px;height:22px;border-radius:50%;background:var(--ping);border:4px solid rgba(255,255,255,.94);box-shadow:0 5px 14px rgba(15,70,120,.25);position:relative;z-index:2;transition:transform .18s ease}.event-core:after{content:"";position:absolute;left:50%;top:17px;width:10px;height:10px;background:var(--ping);transform:translateX(-50%) rotate(45deg);border-radius:2px}.event-marker.live:before,.event-marker.within48h:before,.event-marker.within7d:before,.event-marker.past24h:before{content:"";position:absolute;inset:7px;border-radius:50%;border:2px solid var(--ping);animation:eventPulse 3.4s ease-out infinite}.event-marker.live:before{animation-duration:1.8s}.event-marker.within48h:before{animation-duration:2.4s}.event-marker.within7d:before{animation-duration:3.6s}.event-marker.past24h:before{animation-duration:4.6s;opacity:.5}.event-marker.selected .event-core{transform:scale(1.28)}.custom-cluster{background:transparent!important;border:none!important}.cluster-core{width:42px;height:42px;border-radius:50%;border:3px solid rgba(255,255,255,.92);background:#1a88c9;color:#fff;display:grid;place-items:center;font-weight:900;box-shadow:0 6px 16px rgba(20,60,100,.22)}@keyframes personPulse{0%{opacity:.35;transform:scale(.82)}80%,100%{opacity:0;transform:scale(1.3)}}@keyframes eventPulse{0%{opacity:.62;transform:scale(.72)}78%,100%{opacity:0;transform:scale(1.55)}}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script><script>
const people=${escapeInline(people)};const events=${escapeInline(eventMarkers)};const nodes=new Map();const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));const map=L.map('map',{zoomControl:false,minZoom:4,maxZoom:18,zoomSnap:.25});L.tileLayer('https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);const cluster=L.markerClusterGroup({maxClusterRadius:54,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[42,42]})});const bounds=[];
people.forEach(person=>{const face=person.avatarUrl?'<img src="'+escapeText(person.avatarUrl)+'" alt=""/>':escapeText(person.initials);const html='<div class="person-marker '+(person.pulse?'pulse':'')+'" data-key="person:'+escapeText(person.id)+'" style="--role:'+escapeText(person.roleColor)+'"><div class="person-character"><div class="person-head">'+face+'</div><div class="person-body"></div></div></div>';const marker=L.marker([person.latitude,person.longitude],{icon:L.divIcon({className:'',html,iconSize:[62,74],iconAnchor:[31,64]}),title:person.name});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.person-marker');if(node)nodes.set('person:'+person.id,node)});marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'entity-selected',kind:'person',id:person.id})));marker.bindTooltip(escapeText(person.name),{direction:'bottom',offset:[0,8],opacity:.96});cluster.addLayer(marker);bounds.push([person.latitude,person.longitude]);});
events.forEach(event=>{const html='<div class="event-marker '+escapeText(event.proximity)+'" data-key="event:'+escapeText(event.id)+'"><div class="event-core"></div></div>';const marker=L.marker([event.latitude,event.longitude],{icon:L.divIcon({className:'',html,iconSize:[52,52],iconAnchor:[26,40]}),title:event.title,zIndexOffset:160});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.event-marker');if(node)nodes.set('event:'+event.id,node)});marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'entity-selected',kind:'event',id:event.id})));marker.bindTooltip(escapeText(event.title),{direction:'bottom',offset:[0,10],opacity:.96});cluster.addLayer(marker);bounds.push([event.latitude,event.longitude]);});map.addLayer(cluster);if(bounds.length){map.fitBounds(bounds,{padding:[36,36],maxZoom:9})}else{map.setView([43.45,2.6],7)}let userCircle=null,userMarker=null;function showUserLocation(location){if(!location)return;const point=[location.latitude,location.longitude];if(userCircle)map.removeLayer(userCircle);if(userMarker)map.removeLayer(userMarker);userCircle=L.circle(point,{radius:Math.max(100,location.accuracy||100),color:'#18a7cc',fillColor:'#18a7cc',fillOpacity:.08,weight:2}).addTo(map);userMarker=L.circleMarker(point,{radius:6,color:'#fff',weight:3,fillColor:'#18a7cc',fillOpacity:1}).addTo(map);map.flyTo(point,13,{duration:.7});}function updateSelection(selection){nodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(selection)&&key===selection.kind+':'+selection.id));}function handle(raw){try{const data=typeof raw==='string'?JSON.parse(raw):raw;if(data.type==='selection')updateSelection(data.selection||null);if(data.type==='user-location')showUserLocation(data.location);}catch{}}window.addEventListener('message',event=>handle(event.data));document.addEventListener('message',event=>handle(event.data));</script></body></html>`;
  }, [events, moments, theme.isLight, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.surface]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; kind?: "person" | "event"; id?: string };
      if (payload.type === "entity-selected" && payload.id && (payload.kind === "person" || payload.kind === "event")) onSelectEntity({ kind: payload.kind, id: payload.id });
    } catch {}
  };

  const locateUser = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        AppAlert.alert("Localisation refusée", "Autorisez la localisation dans les réglages de l’appareil pour vous positionner sur la carte.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy ?? 100 };
      setUserLocation(nextLocation);
      webViewRef.current?.postMessage(JSON.stringify({ type: "user-location", location: nextLocation }));
    } catch {
      AppAlert.alert("Localisation indisponible", "La position n’a pas pu être obtenue. Vérifiez le GPS et la connexion réseau.");
    } finally { setLocating(false); }
  };

  return <View style={[styles.wrap, { backgroundColor: theme.pageBackground }]}>
    <WebView ref={webViewRef} source={{ html }} onMessage={handleMessage} onLoadEnd={postState} javaScriptEnabled domStorageEnabled originWhitelist={["*"]} mixedContentMode="never" style={[styles.webView, { backgroundColor: theme.pageBackground }]} />
    <Pressable accessibilityRole="button" accessibilityLabel="Me localiser" onPress={() => void locateUser()} style={({ pressed }) => [styles.locationButton, { backgroundColor: theme.shellBackground, shadowColor: theme.shadow }, pressed && styles.pressed]}>{locating ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="locate" size={20} color={theme.pageText} />}</Pressable>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 420, overflow: "hidden", borderRadius: 22, position: "relative" },
  webView: { flex: 1 },
  locationButton: { position: "absolute", top: 10, right: 10, width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", elevation: 7, shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] }
});