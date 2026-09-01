import type {
  CoworkingMapEventMarker,
  CoworkingMapFocusLocation,
  CoworkingMapMarker
} from "../../components/CoworkingGeographicMap.types";
import type { CoworkingMediaSession } from "../../types/coworking";
import { normalizeLanguageCode } from "../../i18n/languages";
import { LEAFLET_SCRIPTS, LEAFLET_STYLESHEETS, leafletSecurityMeta } from "../maps/leafletAssets";

interface GeographicMapTheme {
  pageBackground: string;
  surface: string;
  surfaceStrong: string;
  pageText: string;
  pageTextMuted: string;
  border: string;
  shellBackground: string;
  isLight: boolean;
}
interface GeographicMapHtmlOptions {
  markers: CoworkingMapMarker[];
  events?: CoworkingMapEventMarker[];
  mediaSession?: CoworkingMediaSession;
  focusLocation?: CoworkingMapFocusLocation;
  theme: GeographicMapTheme;
  bridge: "native" | "web";
  language?: string;
}

const MAX_HUB_FACES = 3;

type PreparedCoworkingMapMarker = Omit<CoworkingMapMarker, "members"> & {
  memberCount: number;
  members: CoworkingMapMarker["members"];
};

export function prepareCoworkingMapMarkers(markers: CoworkingMapMarker[]): PreparedCoworkingMapMarker[] {
  return markers.map((marker) => ({
    ...marker,
    memberCount: marker.members.length,
    members: marker.members.slice(0, marker.members.length > 1 ? MAX_HUB_FACES : 1)
  }));
}

function escapeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character] ?? character);
}

export function buildCoworkingGeographicMapHtml({
  markers,
  events = [],
  mediaSession,
  focusLocation,
  theme,
  bridge,
  language = "fr"
}: GeographicMapHtmlOptions): string {
  const clientScript = mediaSession?.clientScriptUrl
    ? `<script src="${escapeAttribute(mediaSession.clientScriptUrl)}" crossorigin="anonymous"></script>`
    : "";
  const session = mediaSession
    ? {
        spaceId: mediaSession.spaceId,
        socketUrl: mediaSession.socketUrl,
        socketPath: mediaSession.socketPath,
        token: mediaSession.token,
        participantId: mediaSession.participantId,
        iceServers: mediaSession.iceServers,
        observer: mediaSession.observer !== false,
        mock: mediaSession.mock === true
      }
    : null;
  const postExpression = bridge === "native"
    ? `window.ReactNativeWebView?.postMessage(JSON.stringify(payload))`
    : `parentOrigin&&window.parent.postMessage({source:'connexio-coworking-map',...payload},parentOrigin)`;
  const securityMeta = leafletSecurityMeta([
    ...(mediaSession?.socketUrl ? [mediaSession.socketUrl] : []),
    ...(mediaSession?.clientScriptUrl ? [mediaSession.clientScriptUrl] : [])
  ]);
  const documentLanguage = normalizeLanguageCode(language, "fr");
  const clusterCopy = ({
    fr: { member: "membre", members: "membres", event: "évènement", events: "évènements", eventShort: "év.", availableShort: "dispo", videoShort: "en visio" },
    en: { member: "member", members: "members", event: "event", events: "events", eventShort: "event", availableShort: "available", videoShort: "on video" },
    es: { member: "miembro", members: "miembros", event: "evento", events: "eventos", eventShort: "evento", availableShort: "disponibles", videoShort: "en vídeo" },
    de: { member: "Mitglied", members: "Mitglieder", event: "Veranstaltung", events: "Veranstaltungen", eventShort: "Event", availableShort: "verfügbar", videoShort: "im Video" },
    it: { member: "membro", members: "membri", event: "evento", events: "eventi", eventShort: "evento", availableShort: "disponibili", videoShort: "in video" },
    pt: { member: "membro", members: "membros", event: "evento", events: "eventos", eventShort: "evento", availableShort: "disponíveis", videoShort: "em vídeo" }
  } as const)[documentLanguage as "fr" | "en" | "es" | "de" | "it" | "pt"] ?? {
    member: "member", members: "members", event: "event", events: "events", eventShort: "event", availableShort: "available", videoShort: "on video"
  };
  const mapMarkers = prepareCoworkingMapMarkers(markers);

  return `<!doctype html>
<html lang="${documentLanguage}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
${securityMeta}
${LEAFLET_STYLESHEETS}
<style>
:root{--bg:${theme.pageBackground};--surface:${theme.surface};--surfaceStrong:${theme.surfaceStrong};--text:${theme.pageText};--muted:${theme.pageTextMuted};--border:${theme.border};--shell:${theme.shellBackground};--available:#35D58B;--busy:#FF5868;--offline:#8590A8}
*{box-sizing:border-box}html,body,#map{height:100%;width:100%;margin:0;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}.leaflet-tile-pane{${theme.isLight ? "" : "filter:brightness(.56) invert(1) contrast(1.58) hue-rotate(180deg) saturate(.28);"}}.leaflet-control-attribution{background:rgba(0,0,0,.12)!important;color:var(--muted)!important;font-size:7px!important}.leaflet-control-attribution a{color:var(--muted)!important}.leaflet-pane.leaflet-marker-pane{z-index:620}.leaflet-tooltip{max-width:min(240px,calc(100vw - 24px));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--shell)!important;color:var(--text)!important;border:1px solid var(--border)!important;border-radius:11px!important;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.16)!important;padding:6px 9px!important}
.cw-marker{--offset-x:0px;--offset-y:0px;--core-size:42px;position:relative;width:100%;height:100%;transform:translate(var(--offset-x),var(--offset-y)) scale(1);transform-origin:center;transition:transform .2s ease,filter .2s ease;filter:drop-shadow(0 7px 15px rgba(0,0,0,.25));pointer-events:none}.cw-marker.selected{transform:translate(var(--offset-x),var(--offset-y)) scale(1.06);filter:drop-shadow(0 10px 21px rgba(0,0,0,.36))}.cw-hit{position:absolute;left:50%;top:50%;width:52px;height:52px;transform:translate(-50%,-50%);border-radius:50%;pointer-events:auto;cursor:pointer}.cw-group .cw-hit{width:144px;height:62px;border-radius:31px}.cw-core{position:absolute;left:50%;top:50%;width:var(--core-size);height:var(--core-size);transform:translate(-50%,-50%);z-index:4;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--surfaceStrong);color:var(--text);font-size:10px;font-weight:900;border:3px solid var(--status);box-shadow:0 6px 15px rgba(0,0,0,.26)}.cw-hub{position:absolute;left:50%;top:50%;width:140px;height:58px;transform:translate(-50%,-50%);z-index:4;display:flex;align-items:center;gap:8px;padding:5px 10px 5px 7px;border:2px solid var(--status);border-radius:29px;background:color-mix(in srgb,var(--shell) 94%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--status) 14%,transparent),0 7px 18px rgba(0,0,0,.25);overflow:hidden}.cw-hub-faces{display:flex;align-items:center;flex:0 0 auto;min-width:48px}.cw-hub-face{position:relative;width:30px;height:30px;margin-left:-10px;border:2px solid var(--status);border-radius:50%;overflow:hidden;background:var(--surfaceStrong);box-shadow:0 2px 7px rgba(0,0,0,.25);font-size:7px}.cw-hub-face:first-child{margin-left:0}.cw-hub-copy{display:flex;min-width:0;flex:1;flex-direction:column;justify-content:center}.cw-hub-count{overflow:hidden;color:var(--text);font-size:11px;line-height:13px;font-weight:950;text-overflow:ellipsis;white-space:nowrap}.cw-hub-status{overflow:hidden;color:color-mix(in srgb,var(--status) 86%,white);font-size:8px;line-height:10px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.cw-face{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(145deg,var(--surfaceStrong),var(--surface));overflow:hidden}.cw-fallback{position:relative;z-index:1;opacity:1;transition:opacity .16s ease}.cw-face img,.cw-face video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .16s ease}.cw-face img{z-index:2}.cw-face.avatar-ready img{opacity:1}.cw-face.avatar-ready .cw-fallback{opacity:0}.cw-face video{z-index:3;background:transparent}.cw-face video.video-ready{opacity:1;background:var(--surfaceStrong)}.cw-marker.available .cw-core{animation:cwPulse 3.4s ease-out infinite}
.event-leaflet-icon{background:transparent!important;border:none!important;pointer-events:none!important;overflow:visible!important}.event-marker{width:56px;height:62px;position:relative;--event:#3479aa;--pulse:.12;--event-offset-x:0px;--event-offset-y:0px;pointer-events:none}.event-visual{position:absolute;inset:0;transform:translate(var(--event-offset-x),var(--event-offset-y));transform-origin:26px 54px;transition:transform .18s ease,filter .18s ease}.event-connector{position:absolute;left:27px;top:54px;height:2px;width:0;border-radius:2px;background:color-mix(in srgb,var(--event) 72%,white);opacity:0;transform-origin:0 50%;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.2))}.event-anchor{position:absolute;left:23px;top:50px;width:8px;height:8px;border-radius:50%;background:var(--event);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);z-index:1}.event-marker.recent{--event:#6f9dbe;--pulse:.1}.event-marker.voting{--event:#7657d6;--pulse:.24}.event-marker.later{--event:#3479aa}.event-marker.within7d{--event:#248fc0;--pulse:.2}.event-marker.within48h{--event:#12b9cc;--pulse:.36}.event-marker.live{--event:#19c99d;--pulse:.58}.event-marker.selected .event-visual{transform:translate(var(--event-offset-x),calc(var(--event-offset-y) - 3px)) scale(1.1);filter:drop-shadow(0 8px 14px color-mix(in srgb,var(--event) 44%,transparent))}.event-hit{position:absolute;left:3px;top:0;width:50px;height:52px;border-radius:16px;pointer-events:auto;cursor:pointer;z-index:8}.event-calendar{position:absolute;left:3px;top:0;width:50px;height:50px;border-radius:15px;background:var(--shell);border:2px solid var(--event);box-shadow:0 8px 18px rgba(0,0,0,.28);overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text);z-index:4}.event-calendar:before{content:"";position:absolute;left:0;right:0;top:0;height:7px;background:var(--event)}.event-day{font-size:17px;line-height:18px;font-weight:950;margin-top:5px;font-variant-numeric:tabular-nums}.event-month{font-size:8px;line-height:9px;font-weight:950;text-transform:uppercase;letter-spacing:.65px;color:var(--muted)}.event-live-label{position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);height:17px;padding:0 6px;border-radius:9px;background:var(--event);color:#fff;font-size:7px;line-height:17px;font-weight:950;letter-spacing:.6px;white-space:nowrap;z-index:7}.event-pulse{position:absolute;left:14px;top:40px;width:28px;height:15px;border-radius:50%;border:2px solid var(--event);opacity:var(--pulse);animation:eventPulse 2.6s ease-out infinite}.custom-cluster{background:transparent!important;border:none!important}.cluster-core{height:44px;display:flex;align-items:center;justify-content:center;gap:4px;padding:5px;border-radius:22px;border:2px solid #54d8dc;background:#0b2438;color:#fff;font-size:10px;font-weight:950;box-shadow:0 8px 20px rgba(0,0,0,.3);outline:0;white-space:nowrap}.cluster-part{height:30px;padding:0 8px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.09)}.cluster-available{color:#63e6ac}.cluster-events{color:#7ce6dc}
@keyframes cwPulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--available) 30%,transparent),0 6px 15px rgba(0,0,0,.26)}72%,100%{box-shadow:0 0 0 9px transparent,0 6px 15px rgba(0,0,0,.26)}}@keyframes eventPulse{0%{transform:scale(.72);opacity:var(--pulse)}78%,100%{transform:scale(1.7);opacity:0}}@media(prefers-reduced-motion:reduce){.cw-marker.available .cw-core,.event-pulse{animation:none!important}.cw-core,.cw-hub{transition:none!important}}
</style>
</head>
<body>
<div id="map"></div>
${LEAFLET_SCRIPTS}
${clientScript}
<script>
(() => {
  const markerData=${escapeJson(mapMarkers)};
  const eventData=${escapeJson(events)};
  const focusLocation=${escapeJson(focusLocation ?? null)};
  const clusterCopy=${escapeJson(clusterCopy)};
  const session=${escapeJson(session)};
  const nativeBridge=${bridge === "native" ? "true" : "false"};
  const markerNodes=new Map();
  const eventNodes=new Map();
  const eventOffsets=new Map();
  const videoNodes=new Map();
  const markerEntries=[];
  const eventEntries=[];
  const escapeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const parentOrigin=(()=>{try{const value=window.parent?.location?.origin;return value&&value!=='null'?value:null}catch{return null}})();
  const post=payload=>{try{${postExpression}}catch{}};
  const map=L.map('map',{zoomControl:false,minZoom:4,maxZoom:18,zoomSnap:.25,attributionControl:true});
  map.on('movestart zoomstart dragstart',()=>post({type:'map-interaction'}));
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const cluster=L.markerClusterGroup({
    maxClusterRadius:zoom=>zoom<7?58:zoom<10?46:32,
    disableClusteringAtZoom:19,
    zoomToBoundsOnClick:false,
    spiderfyOnMaxZoom:false,
    showCoverageOnHover:false,
    removeOutsideVisibleBounds:true,
    iconCreateFunction:c=>{
      const counts=c.getAllChildMarkers().reduce((result,marker)=>({people:result.people+Number(marker.options.connexioPeopleCount||0),available:result.available+Number(marker.options.connexioAvailableCount||0),events:result.events+Number(marker.options.connexioEventCount||0)}),{people:0,available:0,events:0});
      const label=[counts.people?counts.people+' '+(counts.people>1?clusterCopy.members:clusterCopy.member):'',counts.available?counts.available+' '+clusterCopy.availableShort:'',counts.events?counts.events+' '+(counts.events>1?clusterCopy.events:clusterCopy.event):''].filter(Boolean).join(' · ');
      const people=counts.people?'<span class="cluster-part" aria-hidden="true">'+counts.people+' '+(counts.people>1?clusterCopy.members:clusterCopy.member)+'</span>':'';
      const available=counts.available?'<span class="cluster-part cluster-available" aria-hidden="true">'+counts.available+' '+clusterCopy.availableShort+'</span>':'';
      const events=counts.events?'<span class="cluster-part cluster-events" aria-hidden="true">'+counts.events+' '+clusterCopy.eventShort+'</span>':'';
      const segmentCount=Number(Boolean(counts.people))+Number(Boolean(counts.available))+Number(Boolean(counts.events));
      const width=Math.min(206,Math.max(66,48+segmentCount*48+String(counts.people).length*6+String(counts.available).length*5+String(counts.events).length*5));
      return L.divIcon({className:'custom-cluster',html:'<div class="cluster-core" role="button" aria-label="'+escapeText(label)+'">'+people+available+events+'</div>',iconSize:[width,44],iconAnchor:[width/2,22]});
    }
  });
  cluster.on('clusterclick',event=>{
    const children=event.layer.getAllChildMarkers();
    const markerIds=[...new Set(children.map(marker=>marker.options.connexioMarkerId).filter(Boolean))];
    const eventIds=[...new Set(children.map(marker=>marker.options.connexioEventId).filter(Boolean))];
    post({type:'cluster-selected',markerIds,eventIds});
    const clusterBounds=event.layer.getBounds();
    const samePoint=clusterBounds.isValid()&&clusterBounds.getNorthEast().equals(clusterBounds.getSouthWest());
    if(!samePoint)map.fitBounds(clusterBounds,{padding:[72,72],maxZoom:Math.min(16,map.getZoom()+2)});
  });
  const bounds=[];
  const faceHtml=member=>{
    const fallback='<span class="cw-fallback">'+escapeText(member.initials||'?')+'</span>';
    const avatar=member.avatarUrl?'<img src="'+escapeText(member.avatarUrl)+'" alt="" onload="this.parentElement.classList.add(&quot;avatar-ready&quot;)" onerror="this.remove()"/>':'';
    const video=member.cameraOn?'<video data-user-id="'+escapeText(member.id)+'" autoplay playsinline muted onplaying="this.classList.add(&quot;video-ready&quot;)" onpause="this.classList.remove(&quot;video-ready&quot;)" onemptied="this.classList.remove(&quot;video-ready&quot;)"></video>':'';
    return '<div class="cw-face" data-member-id="'+escapeText(member.id)+'">'+fallback+avatar+video+'</div>';
  };
  const markerHtml=item=>{
    const group=item.memberCount>1;
    const status=item.availability==='busy'?'#FF5868':item.availability==='offline'?'#8590A8':'#35D58B';
    const host=item.members[0];
    if(group){
      const faces=item.members.map(member=>'<div class="cw-hub-face">'+faceHtml(member)+'</div>').join('');
      const countLabel=item.memberCount+' '+(item.memberCount>1?clusterCopy.members:clusterCopy.member);
      return '<div class="cw-marker cw-group '+escapeText(item.availability)+'" data-marker-id="'+escapeText(item.id)+'" style="--status:'+status+'"><div class="cw-hit"></div><div class="cw-hub"><div class="cw-hub-faces">'+faces+'</div><div class="cw-hub-copy"><span class="cw-hub-count">'+escapeText(countLabel)+'</span><span class="cw-hub-status">'+escapeText(clusterCopy.videoShort)+'</span></div></div></div>';
    }
    return '<div class="cw-marker cw-single '+escapeText(item.availability)+'" data-marker-id="'+escapeText(item.id)+'" style="--status:'+status+'"><div class="cw-hit"></div><div class="cw-core">'+faceHtml(host)+'</div></div>';
  };
  markerData.forEach(item=>{
    const group=item.memberCount>1;
    const width=group?152:72;
    const height=group?68:72;
    const marker=L.marker([item.latitude,item.longitude],{
      icon:L.divIcon({className:'',html:markerHtml(item),iconSize:[width,height],iconAnchor:[width/2,height/2]}),
      zIndexOffset:500,
      connexioPeopleCount:item.memberCount,
      connexioAvailableCount:item.availability==='available'?item.memberCount:0,
      connexioEventCount:0,
      connexioMarkerId:item.id,
      title:group?item.memberCount+' '+(item.memberCount>1?clusterCopy.members:clusterCopy.member)+' · '+clusterCopy.videoShort:(item.members[0]?.name||'Membre Connexio'),
      keyboard:true
    });
    marker.on('add',()=>{
      const root=marker.getElement()?.querySelector('.cw-marker');
      if(root){
        markerNodes.set(item.id,root);
        root.querySelectorAll('video[data-user-id]').forEach(video=>videoNodes.set(video.dataset.userId,video));
        updateMarkerVisual(root);
      }
    });
    marker.on('click',()=>post({type:'marker-selected',id:item.id}));
    marker.bindTooltip(escapeText(group?item.memberCount+' '+(item.memberCount>1?clusterCopy.members:clusterCopy.member)+' · '+clusterCopy.videoShort:(item.members[0]?.name||'Membre Connexio')),{direction:'auto',offset:[0,10],opacity:.96});
    markerEntries.push({id:item.id,marker});
    cluster.addLayer(marker);
    bounds.push([item.latitude,item.longitude]);
  });
  map.addLayer(cluster);

  const eventMonthFormatter=new Intl.DateTimeFormat('${documentLanguage}',{month:'short'});
  const eventTooltipFormatter=new Intl.DateTimeFormat('${documentLanguage}',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const eventBadge=event=>event.proximity==='live'?'LIVE':event.proximity==='voting'?'VOTE':'';
  eventData.forEach(event=>{
    const startsAt=new Date(event.startsAt);
    const day=Number.isFinite(startsAt.getTime())?String(startsAt.getDate()).padStart(2,'0'):'--';
    const month=Number.isFinite(startsAt.getTime())?eventMonthFormatter.format(startsAt).replace('.',''):'';
    const badge=eventBadge(event);
    const badgeHtml=badge?'<span class="event-live-label">'+escapeText(badge)+'</span>':'';
    const html='<div class="event-marker '+escapeText(event.proximity)+'" data-event-id="'+escapeText(event.id)+'"><div class="event-anchor"></div><div class="event-connector"></div><div class="event-visual"><div class="event-hit"></div><div class="event-pulse"></div><div class="event-calendar"><span class="event-day">'+escapeText(day)+'</span><span class="event-month">'+escapeText(month)+'</span></div>'+badgeHtml+'</div></div>';
    const marker=L.marker([event.latitude,event.longitude],{icon:L.divIcon({className:'event-leaflet-icon',html,iconSize:[56,62],iconAnchor:[27,54]}),title:event.title,zIndexOffset:750,keyboard:true,connexioPeopleCount:0,connexioEventCount:1,connexioEventId:event.id});
    marker.on('add',()=>{const node=marker.getElement()?.querySelector('.event-marker');if(node){eventNodes.set(event.id,node);applyEventOffset(node,eventOffsets.get(event.id)||{x:0,y:0})}});
    marker.on('click',()=>post({type:'event-selected',id:event.id}));
    const tooltipDate=Number.isFinite(startsAt.getTime())?eventTooltipFormatter.format(startsAt):'';
    marker.bindTooltip(escapeText(event.title+(tooltipDate?' · '+tooltipDate:'')),{direction:'auto',offset:[0,12],opacity:.96});
    eventEntries.push({id:event.id,marker});
    cluster.addLayer(marker);
    bounds.push([event.latitude,event.longitude]);
  });

  const allBounds=bounds.length?L.latLngBounds(bounds):null;
  function fitAll(){if(allBounds?.isValid())map.fitBounds(allBounds,{padding:[64,64],maxZoom:8.5});else map.setView([46.5,2.2],5.6)}
  function fitInitial(){
    if(!focusLocation||!Number.isFinite(focusLocation.latitude)||!Number.isFinite(focusLocation.longitude)){fitAll();return}
    const focus=[focusLocation.latitude,focusLocation.longitude];
    const nearby=bounds.filter(point=>map.distance(focus,point)<=230000);
    if(nearby.length>=2){map.fitBounds(nearby,{padding:[70,70],maxZoom:9.5});return}
    map.setView(focus,9.25);
  }
  fitInitial();

  function visualCoreSize(){
    const count=markerData.length;
    const zoom=map.getZoom();
    let size=count>120?28:count>70?31:count>38?34:count>20?38:42;
    if(zoom>=13)size+=4;
    if(zoom>=15)size+=3;
    if(zoom<=7)size-=3;
    return Math.max(27,Math.min(49,size));
  }
  function updateMarkerVisual(root){
    if(root.classList.contains('cw-group'))return;
    const core=visualCoreSize();
    root.style.setProperty('--core-size',core+'px');
  }
  function setOffset(root,x,y){
    root.style.setProperty('--offset-x',Math.round(x)+'px');
    root.style.setProperty('--offset-y',Math.round(y)+'px');
  }
  function applyCollisionOffsets(){
    markerNodes.forEach(node=>{setOffset(node,0,0);updateMarkerVisual(node)});
    if(map.getZoom()>=13){
      const visible=markerEntries.map(entry=>({entry,node:entry.marker.getElement()?.querySelector('.cw-marker'),point:map.latLngToLayerPoint(entry.marker.getLatLng()),radius:entry.marker.options.connexioPeopleCount>1?72:38})).filter(item=>item.node);
      const visited=new Set();
      for(let i=0;i<visible.length;i+=1){
        if(visited.has(i))continue;
        const group=[i];visited.add(i);
        for(let cursor=0;cursor<group.length;cursor+=1){
          const source=visible[group[cursor]];
          for(let j=0;j<visible.length;j+=1){
            if(visited.has(j))continue;
            const target=visible[j];
            const dx=source.point.x-target.point.x,dy=source.point.y-target.point.y;
            if(Math.hypot(dx,dy)<source.radius+target.radius){visited.add(j);group.push(j)}
          }
        }
        if(group.length<2)continue;
        const first=visible[group[0]];setOffset(first.node,0,0);
        const around=group.slice(1);
        around.forEach((index,slot)=>{
          const ring=Math.floor(slot/6);
          const position=slot%6;
          const count=Math.min(6,around.length-ring*6);
          const radius=first.radius+visible[index].radius+12+ring*36;
          const angle=Math.PI/2+(position/count)*Math.PI*2;
          const item=visible[index];
          setOffset(item.node,Math.cos(angle)*radius,Math.sin(angle)*radius);
        });
      }
    }
  }
  function applyEventOffset(node,offset){
    const x=Math.round(offset.x||0),y=Math.round(offset.y||0);
    node.style.setProperty('--event-offset-x',x+'px');
    node.style.setProperty('--event-offset-y',y+'px');
    const connector=node.querySelector('.event-connector');
    if(!connector)return;
    const distance=Math.hypot(x,y);
    connector.style.width=Math.min(56,Math.max(0,distance-8))+'px';
    connector.style.opacity=distance>10?'.66':'0';
    connector.style.transform='rotate('+Math.atan2(y,x)+'rad)';
  }
  function computeEventOffsets(){
    if(map.getZoom()<13){eventNodes.forEach(node=>applyEventOffset(node,{x:0,y:0}));return}
    const memberPoints=markerEntries.map(entry=>({
      node:entry.marker.getElement()?.querySelector('.cw-marker'),
      point:map.latLngToLayerPoint(entry.marker.getLatLng()),
      radius:entry.marker.options.connexioPeopleCount>1?74:42
    })).filter(item=>item.node);
    const placed=[];
    const candidates=[
      {x:54,y:-46},{x:-54,y:-46},{x:58,y:8},{x:-58,y:8},
      {x:48,y:52},{x:-48,y:52},{x:0,y:-58},{x:0,y:58}
    ];
    eventEntries.forEach((entry,eventIndex)=>{
      const node=entry.marker.getElement()?.querySelector('.event-marker');
      if(!node)return;
      const anchor=map.latLngToLayerPoint(entry.marker.getLatLng());
      const nearMember=memberPoints.some(item=>Math.hypot(anchor.x-item.point.x,anchor.y-item.point.y)<78);
      const baseCandidates=nearMember?candidates:[{x:0,y:0},...candidates];
      const ordered=baseCandidates.map((candidate,index,array)=>array[(index+eventIndex)%array.length]);
      let best=ordered[0],bestScore=-Infinity;
      for(const candidate of ordered){
        const visual={x:anchor.x+candidate.x,y:anchor.y+candidate.y};
        const memberClearance=Math.min(...memberPoints.map(item=>Math.hypot(visual.x-item.point.x,visual.y-item.point.y)-item.radius),Infinity);
        const eventClearance=Math.min(...placed.map(item=>Math.hypot(visual.x-item.x,visual.y-item.y)-50),Infinity);
        const score=Math.min(memberClearance,eventClearance)-Math.hypot(candidate.x,candidate.y)*.035;
        if(score>bestScore){bestScore=score;best=candidate}
        if(memberClearance>=38&&eventClearance>=28){best=candidate;break}
      }
      eventOffsets.set(entry.id,best);
      placed.push({x:anchor.x+best.x,y:anchor.y+best.y});
      applyEventOffset(node,best);
    });
  }
  const updateSelection=(markerId,eventId)=>{
    markerNodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(markerId)&&key===markerId));
    eventNodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(eventId)&&key===eventId));
  };
  const handle=raw=>{try{const data=typeof raw==='string'?JSON.parse(raw):raw;if(data?.type==='selection')updateSelection(data.markerId||null,data.eventId||null);if(data?.type==='locate'&&data.location){const point=[data.location.latitude,data.location.longitude];map.flyTo(point,12.5,{duration:.65});}if(data?.type==='fit-all')fitAll();}catch{}};
  window.addEventListener('message',event=>{if(nativeBridge||event.origin===parentOrigin)handle(event.data)});
  if(nativeBridge)document.addEventListener('message',event=>handle(event.data));
  map.on('zoomend moveend',()=>requestAnimationFrame(()=>{applyCollisionOffsets();computeEventOffsets()}));
  cluster.on('animationend',()=>requestAnimationFrame(()=>{applyCollisionOffsets();computeEventOffsets()}));
  setTimeout(()=>{applyCollisionOffsets();computeEventOffsets()},80);

  async function connectMedia(){
    if(!session||session.mock)return;
    const adapter=window.ConnexioCoworkingClient;
    if(!adapter||typeof adapter.connect!=='function')return;
    let localStream=null;
    try{
      if(!session.observer&&navigator.mediaDevices?.getUserMedia){localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});}
      await adapter.connect({
        ...session,
        localStream,
        observer:Boolean(session.observer),
        mapMode:true,
        onParticipantStream:participant=>{
          const video=videoNodes.get(participant?.id);
          if(video&&participant?.stream){video.srcObject=participant.stream;video.play?.().catch(()=>{});}
        },
        onParticipantLeft:participantId=>{const video=videoNodes.get(participantId);if(video)video.srcObject=null;},
        onConnected:()=>post({type:'media-connected'})
      });
    }catch{}
  }
  connectMedia();
})();
</script>
</body>
</html>`;
}
