import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { colors, radii } from "../theme";
import type { NeptuneMapProps } from "./NeptuneMap.types";

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

function escapeForInlineJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export default function NeptuneMap({
  moments,
  selectedMemberId,
  onSelectMember
}: NeptuneMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const html = useMemo(() => {
    const markerData = moments.map((moment) => ({
      id: moment.member.id,
      name: moment.member.name,
      initials: moment.member.initials,
      avatarUrl: moment.member.avatarUrl ?? null,
      latitude: moment.latitude,
      longitude: moment.longitude,
      pulse: moment.recentPostIds.length > 0,
      selected: moment.member.id === selectedMemberId
    }));
    const serialized = escapeForInlineJson(markerData);
    const serializedLocation = escapeForInlineJson(userLocation);
    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>
html,body,#map{height:100%;margin:0;background:#020713;font-family:Arial,sans-serif}
.leaflet-control-attribution{background:rgba(2,7,19,.8)!important;color:#aeb8d2!important;font-size:8px!important}
.leaflet-control-attribution a{color:#86b8ff!important}.leaflet-bar a{background:#081226!important;color:#fff!important;border-color:rgba(255,255,255,.12)!important}
.member-marker{width:58px;height:58px;position:relative;display:grid;place-items:center}.member-core{width:46px;height:46px;border-radius:18px;padding:2px;background:linear-gradient(135deg,#0048ba,#6b4fea,#f4b183);box-shadow:0 0 22px rgba(107,79,234,.45);position:relative;z-index:2}.member-inner{height:100%;border-radius:16px;border:2px solid #081226;background:#101a31;color:#fff;display:grid;place-items:center;font-weight:900;font-size:11px;overflow:hidden}.member-inner img{width:100%;height:100%;object-fit:cover}.member-marker.pulse:before,.member-marker.pulse:after{content:"";position:absolute;inset:3px;border-radius:50%;border:2px solid rgba(0,114,255,.55);animation:pulse 4.8s ease-out infinite}.member-marker.pulse:after{inset:-4px;border-color:rgba(244,177,131,.38);animation-delay:.2s}.member-marker.selected .member-core{transform:scale(1.12);box-shadow:0 0 0 7px rgba(0,72,186,.14),0 0 34px rgba(107,79,234,.65)}@keyframes pulse{0%,68%,100%{opacity:0;transform:scale(.84)}72%{opacity:.9}88%{opacity:0;transform:scale(1.38)}}
.custom-cluster{background:transparent!important;border:none!important}.cluster-core{width:48px;height:48px;border-radius:18px;border:3px solid #fff;background:linear-gradient(135deg,#0048ba,#6b4fea,#a950d8);color:#fff;display:grid;place-items:center;font-weight:900;box-shadow:0 0 28px rgba(107,79,234,.55)}
</style>
</head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
const members=${serialized};const initialUserLocation=${serializedLocation};
const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const map=L.map('map',{zoomControl:true,minZoom:4,maxZoom:18,zoomSnap:.25});
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
const cluster=L.markerClusterGroup({maxClusterRadius:58,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[48,48]})});
const bounds=[];
members.forEach(member=>{const avatar=member.avatarUrl?'<img src="'+escapeText(member.avatarUrl)+'" alt="" />':escapeText(member.initials);const html='<div class="member-marker '+(member.pulse?'pulse ':'')+(member.selected?'selected':'')+'"><div class="member-core"><div class="member-inner">'+avatar+'</div></div></div>';const marker=L.marker([member.latitude,member.longitude],{icon:L.divIcon({className:'',html,iconSize:[58,58],iconAnchor:[29,29]}),title:member.name});marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'member-selected',memberId:member.id})));marker.bindTooltip(escapeText(member.name),{direction:'bottom',offset:[0,23],opacity:.92});cluster.addLayer(marker);bounds.push([member.latitude,member.longitude]);});
map.addLayer(cluster);if(bounds.length){map.fitBounds(bounds,{padding:[54,54],maxZoom:9})}else{map.setView([43.45,2.6],7)}
let userCircle=null,userMarker=null;
function showUserLocation(location){if(!location)return;const point=[location.latitude,location.longitude];if(userCircle)map.removeLayer(userCircle);if(userMarker)map.removeLayer(userMarker);userCircle=L.circle(point,{radius:Math.max(100,location.accuracy||100),color:'#f4b183',fillColor:'#0048ba',fillOpacity:.15,weight:2}).addTo(map);userMarker=L.circleMarker(point,{radius:7,color:'#ffffff',weight:3,fillColor:'#0072ff',fillOpacity:1}).addTo(map);map.flyTo(point,13,{duration:.8});}
showUserLocation(initialUserLocation);
window.addEventListener('message',event=>{try{const data=JSON.parse(event.data);if(data.type==='user-location')showUserLocation(data.location);}catch{}});document.addEventListener('message',event=>{try{const data=JSON.parse(event.data);if(data.type==='user-location')showUserLocation(data.location);}catch{}});
</script></body></html>`;
  }, [moments, selectedMemberId, userLocation]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        memberId?: string;
      };
      if (payload.type === "member-selected" && payload.memberId) {
        onSelectMember(payload.memberId);
      }
    } catch {
      // Les messages non structurés de la WebView sont ignorés.
    }
  };

  const locateUser = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Localisation refusée",
          "Autorisez la localisation dans les réglages de l’appareil pour vous positionner sur la carte."
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? 100
      };
      setUserLocation(nextLocation);
      webViewRef.current?.postMessage(
        JSON.stringify({ type: "user-location", location: nextLocation })
      );
    } catch {
      Alert.alert(
        "Localisation indisponible",
        "La position n’a pas pu être obtenue. Vérifiez le GPS et la connexion réseau."
      );
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="never"
        style={styles.webView}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Me localiser"
        onPress={() => void locateUser()}
        style={styles.locationButton}
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Ionicons name="locate" size={21} color={colors.text} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 420,
    overflow: "hidden",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    position: "relative"
  },
  webView: { flex: 1, backgroundColor: colors.background },
  locationButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  }
});
