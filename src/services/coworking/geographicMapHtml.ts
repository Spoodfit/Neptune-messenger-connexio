import type {
  CoworkingMapEventMarker,
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
  theme: GeographicMapTheme;
  bridge: "native" | "web";
  language?: string;
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

  return `<!doctype html>
<html lang="${documentLanguage}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
${securityMeta}
${LEAFLET_STYLESHEETS}
<style>
:root{--bg:${theme.pageBackground};--surface:${theme.surface};--surfaceStrong:${theme.surfaceStrong};--text:${theme.pageText};--muted:${theme.pageTextMuted};--border:${theme.border};--shell:${theme.shellBackground};--available:#35D58B;--busy:#FF5868}
*{box-sizing:border-box}html,body,#map{height:100%;width:100%;margin:0;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}.leaflet-tile-pane{${theme.isLight ? "" : "filter:brightness(.56) invert(1) contrast(1.58) hue-rotate(180deg) saturate(.28);"}}.leaflet-control-attribution{background:rgba(0,0,0,.12)!important;color:var(--muted)!important;font-size:7px!important}.leaflet-control-attribution a{color:var(--muted)!important}.leaflet-pane.leaflet-marker-pane{z-index:620}.leaflet-tooltip{max-width:min(240px,calc(100vw - 24px));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--shell)!important;color:var(--text)!important;border:1px solid var(--border)!important;border-radius:11px!important;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.16)!important;padding:6px 9px!important}
.cw-marker{--offset-x:0px;--offset-y:0px;--core-size:42px;--sat-size:23px;position:relative;width:100%;height:100%;transform:translate(var(--offset-x),var(--offset-y)) scale(1);transform-origin:center;transition:transform .2s ease,filter .2s ease;filter:drop-shadow(0 7px 15px rgba(0,0,0,.25));pointer-events:none}.cw-marker.selected{transform:translate(var(--offset-x),var(--offset-y)) scale(1.08);filter:drop-shadow(0 10px 21px rgba(0,0,0,.36))}.cw-hit{position:absolute;left:50%;top:50%;width:52px;height:52px;transform:translate(-50%,-50%);border-radius:50%;pointer-events:auto;cursor:pointer}.cw-group .cw-hit{width:108px;height:96px}.cw-room-zone{position:absolute;left:50%;top:38%;width:100px;height:70px;transform:translate(-50%,-50%);border:1.5px solid color-mix(in srgb,var(--status) 76%,white);border-radius:999px;background:color-mix(in srgb,var(--status) 10%,rgba(2,7,19,.82));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--status) 16%,transparent),0 8px 22px rgba(0,0,0,.2);z-index:1;transition:width .22s ease,height .22s ease,top .22s ease}.cw-room-label{position:absolute;left:50%;bottom:4px;transform:translateX(-50%);padding:2px 6px;border-radius:999px;background:color-mix(in srgb,var(--status) 22%,var(--shell));color:var(--text);font-size:6px;line-height:8px;font-weight:950;letter-spacing:.55px;white-space:nowrap}.cw-core,.cw-satellite{position:absolute;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--surfaceStrong);color:var(--text);font-weight:900;border:3px solid var(--status);box-shadow:0 6px 15px rgba(0,0,0,.26);transition:left .22s ease,top .22s ease,width .22s ease,height .22s ease,border-width .22s ease}.cw-core{left:50%;top:50%;width:var(--core-size);height:var(--core-size);transform:translate(-50%,-50%);z-index:4;font-size:10px}.cw-group .cw-core{top:38%}.cw-satellite{width:var(--sat-size);height:var(--sat-size);transform:translate(-50%,-50%);z-index:5;border-width:2px;font-size:7px}.cw-group.zoom-split .cw-core{top:50%}.cw-group.zoom-split .cw-hit{width:166px;height:166px}.cw-group.zoom-split .cw-room-zone{top:50%;width:164px;height:164px}.cw-group.zoom-split .cw-room-label{bottom:9px;font-size:7px;line-height:9px}.cw-group.zoom-split .cw-satellite{z-index:8;border-width:3px}.cw-face{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(145deg,var(--surfaceStrong),var(--surface));overflow:hidden}.cw-fallback{position:relative;z-index:1;opacity:1;transition:opacity .16s ease}.cw-face img,.cw-face video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .16s ease}.cw-face img{z-index:2}.cw-face.avatar-ready img{opacity:1}.cw-face.avatar-ready .cw-fallback{opacity:0}.cw-face video{z-index:3;background:transparent}.cw-face video.video-ready{opacity:1;background:var(--surfaceStrong)}.cw-extra{position:absolute;display:grid;place-items:center;border-radius:50%;width:var(--sat-size);height:var(--sat-size);background:var(--shell);border:2px solid var(--status);color:var(--text);font-size:8px;font-weight:900;z-index:7;transform:translate(-50%,-50%);transition:left .22s ease,top .22s ease,width .22s ease,height .22s ease}.cw-marker.available .cw-core{animation:cwPulse 3.4s ease-out infinite}.cw-marker.busy .cw-room-zone{animation:roomGlow 3.8s ease-in-out infinite}
.event-leaflet-icon{background:transparent!important;border:none!important;pointer-events:none!important;overflow:visible!important}.event-marker{width:46px;height:50px;position:relative;--event:#3479aa;--wave:5.2s;--pulse:.12;--event-offset-x:0px;--event-offset-y:0px;pointer-events:none}.event-visual{position:absolute;inset:0;transform:translate(var(--event-offset-x),var(--event-offset-y));transform-origin:14px 42px;transition:transform .18s ease,filter .18s ease}.event-connector{position:absolute;left:12px;top:44px;height:2px;width:0;border-radius:2px;background:color-mix(in srgb,var(--event) 72%,white);opacity:.74;transform-origin:0 50%;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.24))}.event-marker.recent{--event:#6f9dbe;--wave:5.8s;--pulse:.1}.event-marker.voting{--event:#7657d6;--wave:4.8s;--pulse:.24}.event-marker.later{--event:#3479aa}.event-marker.within7d{--event:#248fc0;--wave:4.2s;--pulse:.2}.event-marker.within48h{--event:#12b9cc;--wave:2.9s;--pulse:.36}.event-marker.live{--event:#19e0c8;--wave:2s;--pulse:.55}.event-marker.selected .event-visual{transform:translate(var(--event-offset-x),calc(var(--event-offset-y) - 2px)) scale(1.12);filter:drop-shadow(0 7px 12px color-mix(in srgb,var(--event) 45%,transparent))}.event-hit{position:absolute;left:2px;top:-2px;width:44px;height:44px;border-radius:16px;pointer-events:auto;cursor:pointer;z-index:6}.event-pole{position:absolute;left:11px;top:7px;width:3px;height:38px;border-radius:3px;background:linear-gradient(180deg,#f8fbff,#8da9bb);box-shadow:0 2px 8px rgba(0,0,0,.24);z-index:2}.event-flag{position:absolute;left:14px;top:7px;width:28px;height:20px;background:linear-gradient(115deg,var(--event),color-mix(in srgb,var(--event) 70%,white));clip-path:polygon(0 0,100% 10%,86% 50%,100% 90%,0 100%);border-radius:2px 6px 6px 2px;transform-origin:0 50%;animation:flagWave var(--wave) ease-in-out infinite;box-shadow:0 4px 11px color-mix(in srgb,var(--event) 40%,transparent);z-index:3;pointer-events:none}.event-pulse{position:absolute;left:1px;bottom:0;width:28px;height:12px;border-radius:50%;border:2px solid var(--event);opacity:var(--pulse);animation:eventPulse calc(var(--wave) * .92) ease-out infinite}.custom-cluster{background:transparent!important;border:none!important}.cluster-core{position:relative;width:48px;height:48px;border-radius:50%;border:2px solid #54d8dc;background:#0b2438;color:#fff;display:grid;place-items:center;font-size:14px;font-weight:950;box-shadow:0 8px 20px rgba(0,0,0,.3);outline:0}.cluster-core::after{content:"";position:absolute;inset:5px;border-radius:50%;border:1px solid rgba(255,255,255,.16);pointer-events:none}
@keyframes cwPulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--available) 30%,transparent),0 6px 15px rgba(0,0,0,.26)}72%,100%{box-shadow:0 0 0 9px transparent,0 6px 15px rgba(0,0,0,.26)}}@keyframes roomGlow{0%,100%{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--status) 16%,transparent),0 8px 22px rgba(0,0,0,.2)}50%{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--status) 22%,transparent),0 0 20px color-mix(in srgb,var(--status) 22%,transparent)}}@keyframes flagWave{0%,100%{transform:perspective(70px) rotateY(0deg) skewY(-1deg)}50%{transform:perspective(70px) rotateY(-18deg) skewY(2deg)}}@keyframes eventPulse{0%{transform:scale(.72);opacity:var(--pulse)}78%,100%{transform:scale(1.7);opacity:0}}@media(prefers-reduced-motion:reduce){.cw-marker.available .cw-core,.cw-marker.busy .cw-room-zone,.event-flag,.event-pulse{animation:none!important}.cw-core,.cw-satellite,.cw-extra,.cw-room-zone{transition:none!important}}
</style>
</head>
<body>
<div id="map"></div>
${LEAFLET_SCRIPTS}
${clientScript}
<script>
(() => {
  const markerData=${escapeJson(markers)};
  const eventData=${escapeJson(events)};
  const session=${escapeJson(session)};
  const nativeBridge=${bridge === "native" ? "true" : "false"};
  const markerNodes=new Map();
  const eventNodes=new Map();
  const eventOffsets=new Map();
  const videoNodes=new Map();
  const markerEntries=[];
  const escapeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const parentOrigin=(()=>{try{const value=window.parent?.location?.origin;return value&&value!=='null'?value:null}catch{return null}})();
  const post=payload=>{try{${postExpression}}catch{}};
  const map=L.map('map',{zoomControl:false,minZoom:4,maxZoom:18,zoomSnap:.25,attributionControl:true});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const cluster=L.markerClusterGroup({
    maxClusterRadius:zoom=>zoom<7?58:zoom<10?46:32,
    disableClusteringAtZoom:12,
    spiderfyOnMaxZoom:false,
    showCoverageOnHover:false,
    removeOutsideVisibleBounds:true,
    iconCreateFunction:c=>{
      const counts=c.getAllChildMarkers().reduce((result,marker)=>({people:result.people+Number(marker.options.connexioPeopleCount||0),events:result.events+Number(marker.options.connexioEventCount||0)}),{people:0,events:0});
      const total=counts.people+counts.events;
      const label=[counts.people?counts.people+' personne'+(counts.people>1?'s':''):'',counts.events?counts.events+' évènement'+(counts.events>1?'s':''):''].filter(Boolean).join(' et ');
      return L.divIcon({className:'custom-cluster',html:'<div class="cluster-core" role="button" aria-label="'+escapeText(label)+'">'+total+'</div>',iconSize:[48,48],iconAnchor:[24,24]});
    }
  });
  const bounds=[];
  const faceHtml=member=>{
    const fallback='<span class="cw-fallback">'+escapeText(member.initials||'?')+'</span>';
    const avatar=member.avatarUrl?'<img src="'+escapeText(member.avatarUrl)+'" alt="" onload="this.parentElement.classList.add(&quot;avatar-ready&quot;)" onerror="this.remove()"/>':'';
    const video=member.cameraOn?'<video data-user-id="'+escapeText(member.id)+'" autoplay playsinline muted onplaying="this.classList.add(&quot;video-ready&quot;)" onpause="this.classList.remove(&quot;video-ready&quot;)" onemptied="this.classList.remove(&quot;video-ready&quot;)"></video>':'';
    return '<div class="cw-face" data-member-id="'+escapeText(member.id)+'">'+fallback+avatar+video+'</div>';
  };
  const satelliteAngles=[90,55,125,20,160,-15,195,235,305];
  const markerHtml=item=>{
    const group=item.members.length>1;
    const status=item.availability==='busy'?'#FF5868':'#35D58B';
    const host=item.members[0];
    let satellites='';
    if(group){
      const visibleGuests=item.members.slice(1,9);
      satellites=visibleGuests.map((member,index)=>{
        const angle=(satelliteAngles[index]??(90+index*47))*Math.PI/180;
        return '<div class="cw-satellite cw-person-marker" data-angle="'+angle+'">'+faceHtml(member)+'</div>';
      }).join('');
      if(item.members.length>9) satellites+='<div class="cw-extra" data-extra="1">+'+(item.members.length-9)+'</div>';
    }
    const roomZone=group?'<div class="cw-room-zone"><span class="cw-room-label"><span aria-hidden="true">●</span> '+item.members.length+'</span></div>':'';
    return '<div class="cw-marker '+(group?'cw-group ':'cw-single ')+(item.availability==='busy'?'busy':'available')+'" data-marker-id="'+escapeText(item.id)+'" style="--status:'+status+'"><div class="cw-hit"></div>'+roomZone+'<div class="cw-core">'+faceHtml(host)+'</div>'+satellites+'</div>';
  };
  markerData.forEach(item=>{
    const group=item.members.length>1;
    const width=group?116:72;
    const height=group?108:72;
    const marker=L.marker([item.latitude,item.longitude],{
      icon:L.divIcon({className:'',html:markerHtml(item),iconSize:[width,height],iconAnchor:[width/2,height/2]}),
      zIndexOffset:500,
      connexioPeopleCount:item.members.length,
      connexioEventCount:0,
      title:group?item.members.map(m=>m.name).join(', '):(item.members[0]?.name||'Membre Connexio'),
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
    marker.bindTooltip(escapeText(group?item.members.map(member=>member.name.split(' ')[0]).join(' · '):(item.members[0]?.name||'Membre Connexio')),{direction:'auto',offset:[0,10],opacity:.96});
    markerEntries.push({id:item.id,marker});
    cluster.addLayer(marker);
    bounds.push([item.latitude,item.longitude]);
  });
  map.addLayer(cluster);

  eventData.forEach(event=>{
    const html='<div class="event-marker '+escapeText(event.proximity)+'" data-event-id="'+escapeText(event.id)+'"><div class="event-connector"></div><div class="event-visual"><div class="event-hit"></div><div class="event-pulse"></div><div class="event-pole"></div><div class="event-flag"></div></div></div>';
    const marker=L.marker([event.latitude,event.longitude],{icon:L.divIcon({className:'event-leaflet-icon',html,iconSize:[46,50],iconAnchor:[12,44]}),title:event.title,zIndexOffset:750,keyboard:true,connexioPeopleCount:0,connexioEventCount:1});
    marker.on('add',()=>{const node=marker.getElement()?.querySelector('.event-marker');if(node){eventNodes.set(event.id,node);applyEventOffset(node,eventOffsets.get(event.id)||{x:0,y:0})}});
    marker.on('click',()=>post({type:'event-selected',id:event.id}));
    marker.bindTooltip(escapeText(event.title),{direction:'auto',offset:[0,10],opacity:.96});
    cluster.addLayer(marker);
    bounds.push([event.latitude,event.longitude]);
  });

  if(bounds.length){map.fitBounds(bounds,{padding:[48,48],maxZoom:9})}else{map.setView([46.5,2.2],5.6)}

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
    const core=visualCoreSize();
    const split=map.getZoom()>=12&&root.classList.contains('cw-group');
    const satellite=split
      ?Math.max(30,Math.min(42,Math.round(core*.9)))
      :Math.max(19,Math.min(27,Math.round(core*.56)));
    const radius=split
      ?Math.max(48,Math.round(core*1.34))
      :Math.max(27,Math.round(core*.76));
    const centerY=split?'50%':'38%';
    root.classList.toggle('zoom-split',split);
    root.style.setProperty('--core-size',core+'px');
    root.style.setProperty('--sat-size',satellite+'px');
    root.querySelectorAll('.cw-satellite[data-angle]').forEach(node=>{
      const angle=Number(node.dataset.angle||0);
      node.style.left='calc(50% + '+Math.cos(angle)*radius+'px)';
      node.style.top='calc('+centerY+' + '+Math.sin(angle)*radius+'px)';
    });
    const extra=root.querySelector('.cw-extra[data-extra]');
    if(extra){
      const angle=270*Math.PI/180;
      extra.style.left='calc(50% + '+Math.cos(angle)*radius+'px)';
      extra.style.top='calc('+centerY+' + '+Math.sin(angle)*radius+'px)';
    }
  }
  function setOffset(root,x,y){
    root.style.setProperty('--offset-x',Math.round(x)+'px');
    root.style.setProperty('--offset-y',Math.round(y)+'px');
  }
  function applyCollisionOffsets(){
    markerNodes.forEach(node=>{setOffset(node,0,0);updateMarkerVisual(node)});
    if(map.getZoom()>=10){
      const visible=markerEntries.map(entry=>({entry,node:entry.marker.getElement()?.querySelector('.cw-marker'),point:map.latLngToLayerPoint(entry.marker.getLatLng())})).filter(item=>item.node);
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
            if(Math.hypot(dx,dy)<56){visited.add(j);group.push(j)}
          }
        }
        if(group.length<2)continue;
        const first=visible[group[0]];setOffset(first.node,0,0);
        const around=group.slice(1);
        around.forEach((index,slot)=>{
          const ring=Math.floor(slot/7);
          const position=slot%7;
          const count=Math.min(7,around.length-ring*7);
          const radius=42+ring*30;
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
    connector.style.width=Math.max(0,distance-7)+'px';
    connector.style.opacity=distance>8?'.74':'0';
    connector.style.transform='rotate('+Math.atan2(y,x)+'rad)';
  }
  function computeEventOffsets(){
    const memberPoints=markerData.map(item=>({
      point:map.latLngToLayerPoint([item.latitude,item.longitude]),
      radius:item.members.length>1?58:42
    }));
    const placed=[];
    const candidates=[
      {x:74,y:-72},{x:-74,y:-72},{x:82,y:6},{x:-82,y:6},
      {x:68,y:76},{x:-68,y:76},{x:0,y:-88},{x:0,y:88},{x:104,y:-38},{x:-104,y:-38}
    ];
    eventData.forEach((event,eventIndex)=>{
      const anchor=map.latLngToLayerPoint([event.latitude,event.longitude]);
      const nearMember=memberPoints.some(item=>Math.hypot(anchor.x-item.point.x,anchor.y-item.point.y)<112);
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
      eventOffsets.set(event.id,best);
      placed.push({x:anchor.x+best.x,y:anchor.y+best.y});
      const node=eventNodes.get(event.id);if(node)applyEventOffset(node,best);
    });
  }
  const updateSelection=(markerId,eventId)=>{
    markerNodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(markerId)&&key===markerId));
    eventNodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(eventId)&&key===eventId));
  };
  const handle=raw=>{try{const data=typeof raw==='string'?JSON.parse(raw):raw;if(data?.type==='selection')updateSelection(data.markerId||null,data.eventId||null);if(data?.type==='locate'&&data.location){const point=[data.location.latitude,data.location.longitude];map.flyTo(point,12.5,{duration:.65});}}catch{}};
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
