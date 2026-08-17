import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { getDiscoveryEventState } from "../domain/discoveryEvents";
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
    const eventMarkers = events.map((event) => ({ id: event.id, title: event.title, latitude: event.latitude, longitude: event.longitude, state: getDiscoveryEventState(event) }));
    const tileStyle = theme.isLight ? "light_all" : "dark_all";
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/><link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"/>
<style>:root{--bg:${theme.pageBackground};--surface:${theme.surface};--strong:${theme.surfaceStrong};--text:${theme.pageText};--muted:${theme.pageTextMuted};--border:${theme.border};--accent:${theme.accent};--violet:${theme.violet};--orange:${theme.orange};--success:${theme.success};--warning:${theme.warning};--shell:${theme.shellBackground}}html,body,#map{height:100%;margin:0;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.leaflet-control-attribution{background:var(--shell)!important;color:var(--muted)!important;font-size:8px!important}.leaflet-control-attribution a{color:var(--accent)!important}.leaflet-bar{border:1px solid var(--border)!important;border-radius:14px!important;overflow:hidden;box-shadow:0 8px 24px rgba(16,38,68,.16)!important}.leaflet-bar a{background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important}.leaflet-tooltip{background:var(--shell)!important;color:var(--text)!important;border:1px solid var(--border)!important;border-radius:10px!important;font-weight:700}.person-marker,.event-marker{width:60px;height:60px;position:relative;display:grid;place-items:center}.person-core{width:48px;height:48px;border-radius:18px;padding:2px;border:3px solid var(--role);background:var(--surface);box-shadow:0 8px 22px rgba(20,45,78,.25);position:relative;z-index:2;transition:transform .18s ease,box-shadow .18s ease}.person-inner{height:100%;border-radius:15px;border:2px solid var(--surface);background:var(--strong);color:var(--text);display:grid;place-items:center;font-weight:900;font-size:11px;overflow:hidden}.person-inner img{width:100%;height:100%;object-fit:cover}.person-marker.pulse:before{content:"";position:absolute;inset:2px;border-radius:50%;border:2px solid var(--accent);opacity:.5;animation:pulse 3.6s ease-out infinite}.person-marker.selected .person-core{transform:scale(1.12);box-shadow:0 0 0 7px rgba(10,88,196,.16),0 10px 30px rgba(30,50,80,.28)}.event-core{width:46px;height:46px;border-radius:15px;transform:rotate(45deg);display:grid;place-items:center;border:3px solid var(--surface);box-shadow:0 9px 24px rgba(20,45,78,.26);position:relative;z-index:2;transition:transform .18s ease,box-shadow .18s ease}.event-icon{transform:rotate(-45deg);font-size:20px;color:#fff;line-height:1}.event-marker.live .event-core{background:var(--success)}.event-marker.upcoming .event-core{background:var(--accent)}.event-marker.past24h .event-core{background:var(--warning)}.event-marker.live:before,.event-marker.live:after{content:"";position:absolute;inset:1px;border-radius:20px;border:2px solid var(--success);animation:eventPulse 2.6s ease-out infinite}.event-marker.live:after{animation-delay:.65s}.event-marker.selected .event-core{transform:rotate(45deg) scale(1.14);box-shadow:0 0 0 8px rgba(10,88,196,.15),0 12px 30px rgba(30,50,80,.3)}.custom-cluster{background:transparent!important;border:none!important}.cluster-core{width:48px;height:48px;border-radius:18px;border:3px solid var(--surface);background:linear-gradient(135deg,var(--accent),var(--violet),var(--orange));color:#fff;display:grid;place-items:center;font-weight:900;box-shadow:0 8px 24px rgba(37,54,84,.28)}@keyframes pulse{0%{opacity:.55;transform:scale(.85)}80%,100%{opacity:0;transform:scale(1.42)}}@keyframes eventPulse{0%{opacity:.75;transform:scale(.75)}75%,100%{opacity:0;transform:scale(1.28)}}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script><script>
const people=${escapeInline(people)};const events=${escapeInline(eventMarkers)};const nodes=new Map();const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));const map=L.map('map',{zoomControl:true,minZoom:4,maxZoom:18,zoomSnap:.25});L.tileLayer('https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);const cluster=L.markerClusterGroup({maxClusterRadius:58,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[48,48]})});const bounds=[];
people.forEach(person=>{const avatar=person.avatarUrl?'<img src="'+escapeText(person.avatarUrl)+'" alt=""/>':escapeText(person.initials);const html='<div class="person-marker '+(person.pulse?'pulse':'')+'" data-key="person:'+escapeText(person.id)+'" style="--role:'+escapeText(person.roleColor)+'"><div class="person-core"><div class="person-inner">'+avatar+'</div></div></div>';const marker=L.marker([person.latitude,person.longitude],{icon:L.divIcon({className:'',html,iconSize:[60,60],iconAnchor:[30,30]}),title:person.name});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.person-marker');if(node)nodes.set('person:'+person.id,node)});marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'entity-selected',kind:'person',id:person.id})));marker.bindTooltip(escapeText(person.name),{direction:'bottom',offset:[0,24],opacity:.96});cluster.addLayer(marker);bounds.push([person.latitude,person.longitude]);});
events.forEach(event=>{const html='<div class="event-marker '+escapeText(event.state)+'" data-key="event:'+escapeText(event.id)+'"><div class="event-core"><div class="event-icon">✦</div></div></div>';const marker=L.marker([event.latitude,event.longitude],{icon:L.divIcon({className:'',html,iconSize:[60,60],iconAnchor:[30,30]}),title:event.title,zIndexOffset:180});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.event-marker');if(node)nodes.set('event:'+event.id,node)});marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'entity-selected',kind:'event',id:event.id})));marker.bindTooltip(escapeText(event.title),{direction:'bottom',offset:[0,24],opacity:.96});cluster.addLayer(marker);bounds.push([event.latitude,event.longitude]);});map.addLayer(cluster);if(bounds.length){map.fitBounds(bounds,{padding:[58,58],maxZoom:9})}else{map.setView([43.45,2.6],7)}let userCircle=null,userMarker=null;function showUserLocation(location){if(!location)return;const point=[location.latitude,location.longitude];if(userCircle)map.removeLayer(userCircle);if(userMarker)map.removeLayer(userMarker);userCircle=L.circle(point,{radius:Math.max(100,location.accuracy||100),color:'${theme.orange}',fillColor:'${theme.accent}',fillOpacity:.13,weight:2}).addTo(map);userMarker=L.circleMarker(point,{radius:7,color:'${theme.surface}',weight:3,fillColor:'${theme.accent}',fillOpacity:1}).addTo(map);map.flyTo(point,13,{duration:.8});}function updateSelection(selection){nodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(selection)&&key===selection.kind+':'+selection.id));}function handle(raw){try{const data=typeof raw==='string'?JSON.parse(raw):raw;if(data.type==='selection')updateSelection(data.selection||null);if(data.type==='user-location')showUserLocation(data.location);}catch{}}window.addEventListener('message',event=>handle(event.data));document.addEventListener('message',event=>handle(event.data));</script></body></html>`;
  }, [events, moments, theme.accent, theme.border, theme.isLight, theme.orange, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.success, theme.surface, theme.surfaceStrong, theme.violet, theme.warning]);

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

  return <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.pageBackground }]}>
    <WebView ref={webViewRef} source={{ html }} onMessage={handleMessage} onLoadEnd={postState} javaScriptEnabled domStorageEnabled originWhitelist={["*"]} mixedContentMode="never" style={[styles.webView, { backgroundColor: theme.pageBackground }]} />
    <Pressable accessibilityRole="button" accessibilityLabel="Me localiser" onPress={() => void locateUser()} style={({ pressed }) => [styles.locationButton, { borderColor: theme.border, backgroundColor: theme.surface, shadowColor: theme.shadow }, pressed && styles.pressed]}>{locating ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="locate" size={21} color={theme.pageText} />}</Pressable>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 420, overflow: "hidden", borderRadius: 26, borderWidth: 1, position: "relative" },
  webView: { flex: 1 },
  locationButton: { position: "absolute", top: 12, right: 12, width: 48, height: 48, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center", elevation: 8, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] }
});
