import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { getDiscoveryEventProximity } from "../domain/discoveryEvents";
import { getRoleAppearance } from "../domain/roleAppearance";
import { allowsWebViewNavigation } from "../domain/webViewSecurity";
import { useAppLanguage } from "../providers/LanguageProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { LEAFLET_SCRIPTS, LEAFLET_STYLESHEETS, MAP_DOCUMENT_ORIGIN, leafletSecurityMeta } from "../services/maps/leafletAssets";
import { AppAlert } from "../services/ui/AppAlert";
import type { DiscoveryMapProps } from "./DiscoveryMap.types";

interface UserLocation { latitude: number; longitude: number; accuracy: number; }

function escapeInline(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export default function DiscoveryMap({ moments, events, selectedEntity, onSelectEntity }: DiscoveryMapProps) {
  const theme = useAppTheme();
  const { uiLanguage } = useAppLanguage();
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
    return `<!doctype html><html lang="${uiLanguage}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
${leafletSecurityMeta()}
${LEAFLET_STYLESHEETS}
<style>:root{--bg:${theme.pageBackground};--surface:${theme.surface};--text:${theme.pageText};--muted:${theme.pageTextMuted};--border:${theme.border};--accent:${theme.accent};--shell:${theme.shellBackground}}html,body,#map{height:100%;margin:0;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.leaflet-control-attribution{background:rgba(0,0,0,.12)!important;color:var(--muted)!important;font-size:7px!important}.leaflet-control-attribution a{color:var(--muted)!important}.leaflet-tooltip{background:var(--shell)!important;color:var(--text)!important;border:1px solid var(--border)!important;border-radius:10px!important;font-weight:800;box-shadow:none!important}
.person-marker{width:54px;height:54px;position:relative;display:grid;place-items:center}.person-ring{width:44px;height:44px;border-radius:50%;border:3px solid var(--role);background:var(--surface);overflow:hidden;display:grid;place-items:center;color:var(--text);font-size:11px;font-weight:900;box-shadow:0 5px 13px rgba(8,28,55,.28);transition:transform .18s ease,box-shadow .18s ease;position:relative;z-index:2}.person-ring img{width:100%;height:100%;object-fit:cover}.person-marker.pulse:before{content:"";position:absolute;inset:1px;border-radius:50%;border:2px solid var(--role);opacity:.28;animation:personPulse 4.4s ease-out infinite}.person-marker.selected .person-ring{transform:scale(1.14);box-shadow:0 7px 18px rgba(8,28,55,.4)}
.event-marker{width:60px;height:62px;position:relative;--event:#356f9f;--wave:5.4s;--pulse:0}.event-marker.recent{--event:#6f9dbe;--wave:5.8s;--pulse:.12}.event-marker.voting{--event:#7657d6;--wave:4.8s;--pulse:.24}.event-marker.later{--event:#3479aa;--wave:5.2s;--pulse:.1}.event-marker.within7d{--event:#248fc0;--wave:4.2s;--pulse:.25}.event-marker.within48h{--event:#12b9cc;--wave:2.9s;--pulse:.42}.event-marker.live{--event:#19e0c8;--wave:2s;--pulse:.62}.event-pole{position:absolute;left:15px;top:7px;width:3px;height:45px;border-radius:3px;background:linear-gradient(180deg,#f8fbff,#8da9bb);box-shadow:0 2px 8px rgba(0,0,0,.24);z-index:2}.event-flag{position:absolute;left:18px;top:7px;width:32px;height:23px;background:linear-gradient(115deg,var(--event),color-mix(in srgb,var(--event) 70%,white));clip-path:polygon(0 0,100% 10%,86% 50%,100% 90%,0 100%);border-radius:2px 7px 7px 2px;transform-origin:0 50%;animation:flagWave var(--wave) ease-in-out infinite;box-shadow:0 4px 12px color-mix(in srgb,var(--event) 45%,transparent);z-index:3}.event-flag:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.18),transparent 46%,rgba(0,0,0,.08));}.event-pulse{position:absolute;left:3px;bottom:1px;width:30px;height:14px;border-radius:50%;border:2px solid var(--event);opacity:var(--pulse);animation:eventPulse calc(var(--wave) * .92) ease-out infinite}.event-marker.selected{transform:translateY(-2px) scale(1.12);filter:drop-shadow(0 7px 12px color-mix(in srgb,var(--event) 45%,transparent))}
.custom-cluster{background:transparent!important;border:none!important}.cluster-core{width:42px;height:42px;border-radius:50%;border:3px solid rgba(255,255,255,.92);background:#1a88c9;color:#fff;display:grid;place-items:center;font-weight:900;box-shadow:0 6px 16px rgba(20,60,100,.22)}@keyframes personPulse{0%{opacity:.28;transform:scale(.84)}80%,100%{opacity:0;transform:scale(1.28)}}@keyframes flagWave{0%,100%{transform:perspective(70px) rotateY(0deg) skewY(-1deg)}50%{transform:perspective(70px) rotateY(-18deg) skewY(2deg)}}@keyframes eventPulse{0%{transform:scale(.72);opacity:var(--pulse)}78%,100%{transform:scale(1.7);opacity:0}}@media (prefers-reduced-motion:reduce){.person-marker:before,.event-flag,.event-pulse{animation:none!important}}</style></head><body><div id="map"></div>${LEAFLET_SCRIPTS}<script>
const people=${escapeInline(people)};const events=${escapeInline(eventMarkers)};const nodes=new Map();const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));const map=L.map('map',{zoomControl:false,minZoom:4,maxZoom:18,zoomSnap:.25});L.tileLayer('https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);const cluster=L.markerClusterGroup({maxClusterRadius:54,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[42,42]})});const bounds=[];
people.forEach(person=>{const face=person.avatarUrl?'<img src="'+escapeText(person.avatarUrl)+'" alt=""/>':escapeText(person.initials);const html='<div class="person-marker '+(person.pulse?'pulse':'')+'" data-key="person:'+escapeText(person.id)+'" style="--role:'+escapeText(person.roleColor)+'"><div class="person-ring">'+face+'</div></div>';const marker=L.marker([person.latitude,person.longitude],{icon:L.divIcon({className:'',html,iconSize:[54,54],iconAnchor:[27,27]}),title:person.name});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.person-marker');if(node)nodes.set('person:'+person.id,node)});marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'entity-selected',kind:'person',id:person.id})));marker.bindTooltip(escapeText(person.name),{direction:'bottom',offset:[0,18],opacity:.96});cluster.addLayer(marker);bounds.push([person.latitude,person.longitude]);});
events.forEach(event=>{const html='<div class="event-marker '+escapeText(event.proximity)+'" data-key="event:'+escapeText(event.id)+'"><div class="event-pulse"></div><div class="event-pole"></div><div class="event-flag"></div></div>';const marker=L.marker([event.latitude,event.longitude],{icon:L.divIcon({className:'',html,iconSize:[60,62],iconAnchor:[15,52]}),title:event.title,zIndexOffset:180});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.event-marker');if(node)nodes.set('event:'+event.id,node)});marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'entity-selected',kind:'event',id:event.id})));marker.bindTooltip(escapeText(event.title),{direction:'bottom',offset:[13,8],opacity:.96});cluster.addLayer(marker);bounds.push([event.latitude,event.longitude]);});map.addLayer(cluster);if(bounds.length){map.fitBounds(bounds,{padding:[36,36],maxZoom:9})}else{map.setView([43.45,2.6],7)}let userCircle=null,userMarker=null;function showUserLocation(location){if(!location)return;const point=[location.latitude,location.longitude];if(userCircle)map.removeLayer(userCircle);if(userMarker)map.removeLayer(userMarker);userCircle=L.circle(point,{radius:Math.max(100,location.accuracy||100),color:'#18a7cc',fillColor:'#18a7cc',fillOpacity:.08,weight:2}).addTo(map);userMarker=L.circleMarker(point,{radius:6,color:'#fff',weight:3,fillColor:'#18a7cc',fillOpacity:1}).addTo(map);map.flyTo(point,13,{duration:.7});}function updateSelection(selection){nodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(selection)&&key===selection.kind+':'+selection.id));}function handle(raw){try{const data=typeof raw==='string'?JSON.parse(raw):raw;if(data.type==='selection')updateSelection(data.selection||null);if(data.type==='user-location')showUserLocation(data.location);}catch{}}window.addEventListener('message',event=>handle(event.data));document.addEventListener('message',event=>handle(event.data));</script></body></html>`;
  }, [events, moments, theme.isLight, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.surface, uiLanguage]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (!allowsWebViewNavigation(event.nativeEvent.url, [MAP_DOCUMENT_ORIGIN])) return;
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
    <WebView ref={webViewRef} source={{ html, baseUrl: MAP_DOCUMENT_ORIGIN }} onMessage={handleMessage} onLoadEnd={postState} javaScriptEnabled domStorageEnabled={false} cacheEnabled={false} incognito allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false} sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false} originWhitelist={["about:blank", MAP_DOCUMENT_ORIGIN]} onShouldStartLoadWithRequest={(request) => allowsWebViewNavigation(request.url, [MAP_DOCUMENT_ORIGIN])} mixedContentMode="never" style={[styles.webView, { backgroundColor: theme.pageBackground }]} />
    <Pressable accessibilityRole="button" accessibilityLabel="Me localiser" onPress={() => void locateUser()} style={({ pressed }) => [styles.locationButton, { backgroundColor: theme.shellBackground, shadowColor: theme.shadow }, pressed && styles.pressed]}>{locating ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="locate" size={20} color={theme.pageText} />}</Pressable>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 420, overflow: "hidden", borderRadius: 22, position: "relative" },
  webView: { flex: 1 },
  locationButton: { position: "absolute", top: 10, right: 10, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", elevation: 7, shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] }
});
