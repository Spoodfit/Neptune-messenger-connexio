import type {
  CoworkingMapEventMarker,
  CoworkingMapMarker
} from "../../components/CoworkingGeographicMap.types";
import type { CoworkingMediaSession } from "../../types/coworking";

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
}

function escapeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildCoworkingGeographicMapHtml({
  markers,
  events = [],
  mediaSession,
  theme,
  bridge
}: GeographicMapHtmlOptions): string {
  const tileStyle = theme.isLight ? "light_all" : "dark_all";
  const clientScript = mediaSession?.clientScriptUrl
    ? `<script src="${mediaSession.clientScriptUrl}"></script>`
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
    : `window.parent.postMessage({source:'connexio-coworking-map',...payload},'*')`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>
:root{--bg:${theme.pageBackground};--surface:${theme.surface};--surfaceStrong:${theme.surfaceStrong};--text:${theme.pageText};--muted:${theme.pageTextMuted};--border:${theme.border};--shell:${theme.shellBackground};--available:#35D58B;--busy:#FF5868}
*{box-sizing:border-box}html,body,#map{height:100%;width:100%;margin:0;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}.leaflet-control-attribution{background:rgba(0,0,0,.12)!important;color:var(--muted)!important;font-size:7px!important}.leaflet-control-attribution a{color:var(--muted)!important}.leaflet-pane.leaflet-marker-pane{z-index:620}.leaflet-tooltip{background:var(--shell)!important;color:var(--text)!important;border:1px solid var(--border)!important;border-radius:11px!important;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.16)!important;padding:6px 9px!important}
.cw-marker{--offset-x:0px;--offset-y:0px;--core-size:42px;--sat-size:23px;position:relative;width:100%;height:100%;transform:translate(var(--offset-x),var(--offset-y)) scale(1);transform-origin:center;transition:transform .2s ease,filter .2s ease;filter:drop-shadow(0 7px 15px rgba(0,0,0,.25));pointer-events:none}.cw-marker.selected{transform:translate(var(--offset-x),var(--offset-y)) scale(1.12);filter:drop-shadow(0 10px 21px rgba(0,0,0,.36))}.cw-hit{position:absolute;left:50%;top:50%;width:52px;height:52px;transform:translate(-50%,-50%);border-radius:50%;pointer-events:auto;cursor:pointer}.cw-group .cw-hit{width:92px;height:88px}.cw-core,.cw-satellite{position:absolute;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--surfaceStrong);color:var(--text);font-weight:900;border:3px solid var(--status);box-shadow:0 0 0 2px color-mix(in srgb,var(--status) 14%,transparent),0 6px 15px rgba(0,0,0,.26)}.cw-core{left:50%;top:50%;width:var(--core-size);height:var(--core-size);transform:translate(-50%,-50%);z-index:4;font-size:10px}.cw-group .cw-core{top:38%}.cw-satellite{width:var(--sat-size);height:var(--sat-size);transform:translate(-50%,-50%);z-index:5;border-width:2px;font-size:7px}.cw-face{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(145deg,var(--surfaceStrong),var(--surface));overflow:hidden}.cw-face img,.cw-face video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}.cw-face img{z-index:1}.cw-face video{z-index:2;background:var(--surfaceStrong)}.cw-extra{position:absolute;display:grid;place-items:center;border-radius:50%;width:var(--sat-size);height:var(--sat-size);background:var(--shell);border:2px solid var(--status);color:var(--text);font-size:8px;font-weight:900;z-index:7;transform:translate(-50%,-50%)}.cw-marker.available .cw-core{animation:cwPulse 3.4s ease-out infinite}.cw-marker.busy .cw-core{box-shadow:0 0 0 3px color-mix(in srgb,var(--busy) 15%,transparent),0 7px 18px rgba(0,0,0,.28)}
.event-leaflet-icon{background:transparent!important;border:none!important;pointer-events:none!important}.event-marker{--event-offset-x:0px;--event-offset-y:0px;width:46px;height:50px;position:relative;--event:#3479aa;--wave:5.2s;--pulse:.12;transform:translate(var(--event-offset-x),var(--event-offset-y));transform-origin:14px 42px;transition:transform .18s ease,filter .18s ease;pointer-events:none}.event-marker.past24h{--event:#6f9dbe;--wave:5.8s;--pulse:.1}.event-marker.later{--event:#3479aa}.event-marker.within7d{--event:#248fc0;--wave:4.2s;--pulse:.2}.event-marker.within48h{--event:#12b9cc;--wave:2.9s;--pulse:.36}.event-marker.live{--event:#19e0c8;--wave:2s;--pulse:.55}.event-marker.selected{transform:translate(var(--event-offset-x),var(--event-offset-y)) translateY(-2px) scale(1.12);filter:drop-shadow(0 7px 12px color-mix(in srgb,var(--event) 45%,transparent))}.event-hit{position:absolute;left:0;top:1px;width:46px;height:48px;border-radius:16px;pointer-events:auto;cursor:pointer;z-index:6}.event-pole{position:absolute;left:11px;top:7px;width:3px;height:38px;border-radius:3px;background:linear-gradient(180deg,#f8fbff,#8da9bb);box-shadow:0 2px 8px rgba(0,0,0,.24);z-index:2}.event-flag{position:absolute;left:14px;top:7px;width:28px;height:20px;background:linear-gradient(115deg,var(--event),color-mix(in srgb,var(--event) 70%,white));clip-path:polygon(0 0,100% 10%,86% 50%,100% 90%,0 100%);border-radius:2px 6px 6px 2px;transform-origin:0 50%;animation:flagWave var(--wave) ease-in-out infinite;box-shadow:0 4px 11px color-mix(in srgb,var(--event) 40%,transparent);z-index:3;pointer-events:none}.event-pulse{position:absolute;left:1px;bottom:0;width:28px;height:12px;border-radius:50%;border:2px solid var(--event);opacity:var(--pulse);animation:eventPulse calc(var(--wave) * .92) ease-out infinite}.custom-cluster{background:transparent!important;border:none!important}.cluster-core{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.9);background:var(--shell);color:var(--text);display:grid;place-items:center;font-size:11px;font-weight:900;box-shadow:0 7px 17px rgba(0,0,0,.25)}
@keyframes cwPulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--available) 30%,transparent),0 6px 15px rgba(0,0,0,.26)}72%,100%{box-shadow:0 0 0 9px transparent,0 6px 15px rgba(0,0,0,.26)}}@keyframes flagWave{0%,100%{transform:perspective(70px) rotateY(0deg) skewY(-1deg)}50%{transform:perspective(70px) rotateY(-18deg) skewY(2deg)}}@keyframes eventPulse{0%{transform:scale(.72);opacity:var(--pulse)}78%,100%{transform:scale(1.7);opacity:0}}@media(prefers-reduced-motion:reduce){.cw-marker.available .cw-core,.event-flag,.event-pulse{animation:none!important}}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.js"></script>
${clientScript}
<script>
(() => {
  const markerData=${escapeJson(markers)};
  const eventData=${escapeJson(events)};
  const session=${escapeJson(session)};
  const markerNodes=new Map();
  const eventNodes=new Map();
  const videoNodes=new Map();
  const markerEntries=[];
  const eventEntries=[];
  const escapeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const post=payload=>{try{${postExpression}}catch{}};
  const map=L.map('map',{zoomControl:false,minZoom:4,maxZoom:18,zoomSnap:.25,attributionControl:true});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
  const cluster=L.markerClusterGroup({
    maxClusterRadius:zoom=>zoom<7?58:zoom<10?46:32,
    disableClusteringAtZoom:12,
    spiderfyOnMaxZoom:false,
    showCoverageOnHover:false,
    removeOutsideVisibleBounds:true,
    iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[40,40]})
  });
  const bounds=[];
  const faceHtml=member=>{
    const fallback='<span>'+escapeText(member.initials||'?')+'</span>';
    const avatar=member.avatarUrl?'<img src="'+escapeText(member.avatarUrl)+'" alt=""/>':'';
    const video=member.cameraOn?'<video data-user-id="'+escapeText(member.id)+'" autoplay playsinline muted></video>':'';
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
        return '<div class="cw-satellite" data-angle="'+angle+'">'+faceHtml(member)+'</div>';
      }).join('');
      if(item.members.length>9) satellites+='<div class="cw-extra" data-extra="1">+'+(item.members.length-9)+'</div>';
    }
    return '<div class="cw-marker '+(group?'cw-group ':'cw-single ')+(item.availability==='busy'?'busy':'available')+'" data-marker-id="'+escapeText(item.id)+'" style="--status:'+status+'"><div class="cw-hit"></div><div class="cw-core">'+faceHtml(host)+'</div>'+satellites+'</div>';
  };
  markerData.forEach(item=>{
    const group=item.members.length>1;
    const width=group?116:72;
    const height=group?108:72;
    const marker=L.marker([item.latitude,item.longitude],{
      icon:L.divIcon({className:'',html:markerHtml(item),iconSize:[width,height],iconAnchor:[width/2,height/2]}),
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
    marker.bindTooltip(escapeText(group?item.members.map(member=>member.name.split(' ')[0]).join(' · '):(item.members[0]?.name||'Membre Connexio')),{direction:'bottom',offset:[0,14],opacity:.96});
    markerEntries.push({id:item.id,marker});
    cluster.addLayer(marker);
    bounds.push([item.latitude,item.longitude]);
  });
  map.addLayer(cluster);

  const eventLayer=L.layerGroup().addTo(map);
  eventData.forEach(event=>{
    const html='<div class="event-marker '+escapeText(event.proximity)+'" data-event-id="'+escapeText(event.id)+'"><div class="event-hit"></div><div class="event-pulse"></div><div class="event-pole"></div><div class="event-flag"></div></div>';
    const marker=L.marker([event.latitude,event.longitude],{icon:L.divIcon({className:'event-leaflet-icon',html,iconSize:[46,50],iconAnchor:[12,44]}),title:event.title,zIndexOffset:120,keyboard:true});
    marker.on('add',()=>{const node=marker.getElement()?.querySelector('.event-marker');if(node)eventNodes.set(event.id,node)});
    marker.on('click',()=>post({type:'event-selected',id:event.id}));
    marker.bindTooltip(escapeText(event.title),{direction:'bottom',offset:[13,8],opacity:.96});
    eventEntries.push({id:event.id,marker});
    marker.addTo(eventLayer);
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
    const satellite=Math.max(19,Math.min(27,Math.round(core*.56)));
    const radius=Math.max(27,Math.round(core*.76));
    root.style.setProperty('--core-size',core+'px');
    root.style.setProperty('--sat-size',satellite+'px');
    root.querySelectorAll('.cw-satellite[data-angle]').forEach(node=>{
      const angle=Number(node.dataset.angle||0);
      node.style.left='calc(50% + '+Math.cos(angle)*radius+'px)';
      node.style.top='calc(38% + '+Math.sin(angle)*radius+'px)';
    });
    const extra=root.querySelector('.cw-extra[data-extra]');
    if(extra){
      const angle=270*Math.PI/180;
      extra.style.left='calc(50% + '+Math.cos(angle)*radius+'px)';
      extra.style.top='calc(38% + '+Math.sin(angle)*radius+'px)';
    }
  }
  function setOffset(root,x,y){
    root.style.setProperty('--offset-x',Math.round(x)+'px');
    root.style.setProperty('--offset-y',Math.round(y)+'px');
  }
  function setEventOffset(root,x,y){
    root.style.setProperty('--event-offset-x',Math.round(x)+'px');
    root.style.setProperty('--event-offset-y',Math.round(y)+'px');
  }
  function intersects(a,b,gap=5){
    return a.left-gap<b.right&&a.right+gap>b.left&&a.top-gap<b.bottom&&a.bottom+gap>b.top;
  }
  function shiftedRect(rect,x,y){
    return {left:rect.left+x,right:rect.right+x,top:rect.top+y,bottom:rect.bottom+y,width:rect.width,height:rect.height};
  }
  function visibleRect(node){
    if(!node||!node.isConnected)return null;
    const style=getComputedStyle(node);
    const rect=node.getBoundingClientRect();
    if(style.display==='none'||style.visibility==='hidden'||rect.width<=0||rect.height<=0)return null;
    return rect;
  }
  function applyEventOffsets(){
    eventNodes.forEach(node=>setEventOffset(node,0,0));
    const occupied=[];
    markerNodes.forEach(node=>{
      const rect=visibleRect(node);
      if(rect)occupied.push(rect);
    });
    const viewport={width:window.innerWidth,height:window.innerHeight};
    const candidates=[[0,0],[58,-34],[-58,-34],[58,34],[-58,34],[0,-68],[0,68],[78,0],[-78,0],[82,-48],[-82,-48]];
    eventEntries.forEach(entry=>{
      const node=eventNodes.get(entry.id);
      const raw=visibleRect(node);
      if(!node||!raw)return;
      let best=candidates[0];
      let bestScore=-Infinity;
      for(const candidate of candidates){
        const rect=shiftedRect(raw,candidate[0],candidate[1]);
        const inside=rect.left>=4&&rect.right<=viewport.width-4&&rect.top>=4&&rect.bottom<=viewport.height-4;
        const collisionCount=occupied.reduce((count,target)=>count+(intersects(rect,target,6)?1:0),0);
        const score=(inside?1000:0)-collisionCount*400-Math.hypot(candidate[0],candidate[1]);
        if(score>bestScore){bestScore=score;best=candidate;}
        if(inside&&collisionCount===0){best=candidate;break;}
      }
      setEventOffset(node,best[0],best[1]);
      occupied.push(shiftedRect(raw,best[0],best[1]));
    });
  }
  function applyCollisionOffsets(){
    markerNodes.forEach(node=>{setOffset(node,0,0);updateMarkerVisual(node)});
    if(map.getZoom()>=12){
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
            if(Math.hypot(dx,dy)<42){visited.add(j);group.push(j)}
          }
        }
        if(group.length<2)continue;
        const first=visible[group[0]];setOffset(first.node,0,0);
        const around=group.slice(1);
        around.forEach((index,slot)=>{
          const ring=Math.floor(slot/7);
          const position=slot%7;
          const count=Math.min(7,around.length-ring*7);
          const radius=31+ring*24;
          const angle=Math.PI/2+(position/count)*Math.PI*2;
          const item=visible[index];
          setOffset(item.node,Math.cos(angle)*radius,Math.sin(angle)*radius);
        });
      }
    }
    requestAnimationFrame(applyEventOffsets);
  }
  const updateSelection=(markerId,eventId)=>{
    markerNodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(markerId)&&key===markerId));
    eventNodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(eventId)&&key===eventId));
  };
  const handle=raw=>{try{const data=typeof raw==='string'?JSON.parse(raw):raw;if(data?.type==='selection')updateSelection(data.markerId||null,data.eventId||null);if(data?.type==='locate'&&data.location){const point=[data.location.latitude,data.location.longitude];map.flyTo(point,12.5,{duration:.65});}}catch{}};
  window.addEventListener('message',event=>handle(event.data));
  document.addEventListener('message',event=>handle(event.data));
  map.on('zoomend moveend',()=>requestAnimationFrame(applyCollisionOffsets));
  cluster.on('animationend',()=>requestAnimationFrame(applyCollisionOffsets));
  setTimeout(applyCollisionOffsets,80);

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
