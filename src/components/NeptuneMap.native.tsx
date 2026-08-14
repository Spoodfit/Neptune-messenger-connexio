import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { getRoleAppearance } from "../domain/roleAppearance";
import { useAppTheme } from "../providers/ThemeProvider";
import { AppAlert } from "../services/ui/AppAlert";
import { radii } from "../theme";
import type { NeptuneMapProps } from "./NeptuneMap.types";

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

function escapeForInlineJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export default function NeptuneMap({ moments, selectedMemberId, onSelectMember }: NeptuneMapProps) {
  const theme = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const postMapState = (selection = selectedMemberId, location = userLocation) => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "selected-member", memberId: selection }));
    if (location) webViewRef.current?.postMessage(JSON.stringify({ type: "user-location", location }));
  };

  useEffect(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "selected-member", memberId: selectedMemberId }));
  }, [selectedMemberId]);

  const html = useMemo(() => {
    const markerData = moments.map((moment) => {
      const roleAppearance = getRoleAppearance(moment.member.role);
      return {
        id: moment.member.id,
        name: moment.member.name,
        initials: moment.member.initials,
        avatarUrl: moment.member.avatarUrl ?? null,
        roleColor: roleAppearance.border,
        latitude: moment.latitude,
        longitude: moment.longitude,
        pulse: moment.recentPostIds.length > 0
      };
    });
    const serialized = escapeForInlineJson(markerData);
    const tileStyle = theme.isLight ? "light_all" : "dark_all";
    const css = {
      background: theme.pageBackground,
      surface: theme.surface,
      surfaceStrong: theme.surfaceStrong,
      text: theme.pageText,
      muted: theme.pageTextMuted,
      border: theme.border,
      accent: theme.accent,
      violet: theme.violet,
      orange: theme.orange,
      shell: theme.shellBackground
    };
    const vars = escapeForInlineJson(css);
    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>
:root{--bg:${css.background};--surface:${css.surface};--surface-strong:${css.surfaceStrong};--text:${css.text};--muted:${css.muted};--border:${css.border};--accent:${css.accent};--violet:${css.violet};--orange:${css.orange};--shell:${css.shell}}
html,body,#map{height:100%;margin:0;background:var(--bg);font-family:Arial,sans-serif}
.leaflet-control-attribution{background:var(--shell)!important;color:var(--muted)!important;font-size:8px!important;border-radius:8px 0 0 0}.leaflet-control-attribution a{color:var(--accent)!important}.leaflet-bar{border:1px solid var(--border)!important;border-radius:12px!important;overflow:hidden;box-shadow:0 5px 18px rgba(19,43,69,.18)!important}.leaflet-bar a{background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important}.leaflet-bar a:hover{background:var(--surface-strong)!important}.leaflet-tooltip{background:var(--shell)!important;color:var(--text)!important;border:1px solid var(--border)!important;box-shadow:0 8px 22px rgba(19,43,69,.18)!important}.leaflet-tooltip-bottom:before{border-bottom-color:var(--border)!important}
.member-marker{width:58px;height:58px;position:relative;display:grid;place-items:center;will-change:transform}.member-core{width:48px;height:48px;border-radius:18px;padding:2px;border:3px solid var(--role-color);background:var(--surface);box-shadow:0 7px 22px rgba(27,54,82,.24);position:relative;z-index:2;transition:transform .18s ease,box-shadow .18s ease}.member-inner{height:100%;border-radius:15px;border:2px solid var(--surface);background:var(--surface-strong);color:var(--text);display:grid;place-items:center;font-weight:900;font-size:11px;overflow:hidden}.member-inner img{width:100%;height:100%;object-fit:cover}.member-marker.pulse:before,.member-marker.pulse:after{content:"";position:absolute;inset:3px;border-radius:50%;border:2px solid color-mix(in srgb,var(--accent) 62%,transparent);animation:pulse 4.8s ease-out infinite}.member-marker.pulse:after{inset:-4px;border-color:color-mix(in srgb,var(--orange) 52%,transparent);animation-delay:.2s}.member-marker.selected .member-core{transform:scale(1.12);box-shadow:0 0 0 7px color-mix(in srgb,var(--accent) 17%,transparent),0 0 28px color-mix(in srgb,var(--violet) 48%,transparent)}@keyframes pulse{0%,68%,100%{opacity:0;transform:scale(.84)}72%{opacity:.9}88%{opacity:0;transform:scale(1.38)}}
.custom-cluster{background:transparent!important;border:none!important}.cluster-core{width:48px;height:48px;border-radius:18px;border:3px solid var(--surface);background:linear-gradient(135deg,var(--accent),var(--violet),var(--orange));color:#fff;display:grid;place-items:center;font-weight:900;box-shadow:0 8px 24px rgba(37,54,84,.28)}
</style>
</head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
const members=${serialized};const palette=${vars};
const markerNodes=new Map();
const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const map=L.map('map',{zoomControl:true,minZoom:4,maxZoom:18,zoomSnap:.25});
L.tileLayer('https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
const cluster=L.markerClusterGroup({maxClusterRadius:58,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[48,48]})});
const bounds=[];
members.forEach(member=>{const avatarMarkup=member.avatarUrl?'<img src="'+escapeText(member.avatarUrl)+'" alt="" />':escapeText(member.initials);const roleColor=escapeText(member.roleColor||palette.violet);const html='<div class="member-marker '+(member.pulse?'pulse':'')+'" data-member-id="'+escapeText(member.id)+'" style="--role-color:'+roleColor+'"><div class="member-core"><div class="member-inner">'+avatarMarkup+'</div></div></div>';const marker=L.marker([member.latitude,member.longitude],{icon:L.divIcon({className:'',html,iconSize:[58,58],iconAnchor:[29,29]}),title:member.name});marker.on('add',()=>{const node=marker.getElement()?.querySelector('.member-marker');if(node)markerNodes.set(member.id,node)});marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'member-selected',memberId:member.id})));marker.bindTooltip(escapeText(member.name),{direction:'bottom',offset:[0,23],opacity:.96});cluster.addLayer(marker);bounds.push([member.latitude,member.longitude]);});
map.addLayer(cluster);if(bounds.length){map.fitBounds(bounds,{padding:[54,54],maxZoom:9})}else{map.setView([43.45,2.6],7)}
let userCircle=null,userMarker=null;function showUserLocation(location){if(!location)return;const point=[location.latitude,location.longitude];if(userCircle)map.removeLayer(userCircle);if(userMarker)map.removeLayer(userMarker);userCircle=L.circle(point,{radius:Math.max(100,location.accuracy||100),color:palette.orange,fillColor:palette.accent,fillOpacity:.13,weight:2}).addTo(map);userMarker=L.circleMarker(point,{radius:7,color:palette.surface,weight:3,fillColor:palette.accent,fillOpacity:1}).addTo(map);map.flyTo(point,13,{duration:.8});}
function updateSelection(memberId){markerNodes.forEach((node,id)=>node.classList.toggle('selected',Boolean(memberId)&&id===memberId));}function handleParentMessage(raw){try{const data=typeof raw==='string'?JSON.parse(raw):raw;if(data.type==='user-location')showUserLocation(data.location);if(data.type==='selected-member')updateSelection(data.memberId||null);}catch{}}window.addEventListener('message',event=>handleParentMessage(event.data));document.addEventListener('message',event=>handleParentMessage(event.data));
</script></body></html>`;
  }, [moments, theme.accent, theme.border, theme.isLight, theme.orange, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.surface, theme.surfaceStrong, theme.violet]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; memberId?: string };
      if (payload.type === "member-selected" && payload.memberId) onSelectMember(payload.memberId);
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

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.pageBackground }]}>
      <WebView ref={webViewRef} source={{ html }} onMessage={handleMessage} onLoadEnd={() => postMapState()} javaScriptEnabled domStorageEnabled originWhitelist={["*"]} mixedContentMode="never" style={[styles.webView, { backgroundColor: theme.pageBackground }]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Me localiser" onPress={() => void locateUser()} style={({ pressed }) => [styles.locationButton, { borderColor: theme.border, backgroundColor: theme.surface, shadowColor: theme.shadow }, pressed && styles.pressed]}>
        {locating ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="locate" size={21} color={theme.pageText} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 420, overflow: "hidden", borderRadius: radii.xl, borderWidth: 1, position: "relative" },
  webView: { flex: 1 },
  locationButton: { position: "absolute", top: 12, right: 12, width: 48, height: 48, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center", elevation: 8, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] }
});
