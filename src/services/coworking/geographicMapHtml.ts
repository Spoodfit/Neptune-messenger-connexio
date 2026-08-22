import type { CoworkingMapMarker } from "../../components/CoworkingGeographicMap.types";
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
  mediaSession?: CoworkingMediaSession;
  theme: GeographicMapTheme;
  bridge: "native" | "web";
}

function escapeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildCoworkingGeographicMapHtml({
  markers,
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
.cw-marker{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;filter:drop-shadow(0 8px 18px rgba(0,0,0,.28));transform-origin:50% 72%;transition:transform .18s ease,filter .18s ease}.cw-marker.selected{transform:scale(1.09);filter:drop-shadow(0 11px 24px rgba(0,0,0,.38))}.cw-media{position:relative;background:var(--surfaceStrong);border:3px solid var(--status);overflow:hidden;display:grid;box-shadow:0 0 0 3px color-mix(in srgb,var(--status) 18%,transparent),0 8px 20px rgba(0,0,0,.28)}.cw-media.single{width:58px;height:58px;border-radius:50%}.cw-media.group{width:82px;height:62px;border-radius:19px;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:1px}.cw-cell{position:relative;min-width:0;min-height:0;overflow:hidden;background:var(--surfaceStrong);display:grid;place-items:center;color:var(--text);font-size:11px;font-weight:900}.cw-cell img,.cw-cell video{width:100%;height:100%;object-fit:cover;display:block}.cw-cell video{position:absolute;inset:0;background:var(--surfaceStrong)}.cw-cell .fallback{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(145deg,var(--surfaceStrong),var(--surface));z-index:0}.cw-cell img{position:relative;z-index:1}.cw-cell video{z-index:2}.cw-camera{position:absolute;right:-4px;top:-5px;width:22px;height:22px;border-radius:11px;background:var(--shell);border:2px solid var(--status);display:grid;place-items:center;z-index:8;color:var(--text);font-size:11px}.cw-count{position:absolute;right:-6px;bottom:-5px;min-width:25px;height:25px;padding:0 6px;border-radius:13px;background:var(--shell);border:2px solid var(--status);display:grid;place-items:center;color:var(--text);font-size:10px;font-weight:900;z-index:8}.cw-status{margin-top:5px;height:22px;max-width:94px;padding:0 7px;border-radius:11px;background:var(--shell);border:1px solid color-mix(in srgb,var(--status) 72%,transparent);display:flex;align-items:center;gap:5px;color:var(--text);font-size:9px;font-weight:900;white-space:nowrap}.cw-dot{width:7px;height:7px;border-radius:50%;background:var(--status);box-shadow:0 0 10px color-mix(in srgb,var(--status) 75%,transparent)}.cw-pulse{position:absolute;inset:-7px;border-radius:28px;border:2px solid var(--status);opacity:0;animation:cwPulse 3s ease-out infinite;pointer-events:none}.cw-marker.busy .cw-pulse{animation:none;opacity:.16}.custom-cluster{background:transparent!important;border:none!important}.cluster-core{width:44px;height:44px;border-radius:22px;border:3px solid rgba(255,255,255,.92);background:var(--shell);color:var(--text);display:grid;place-items:center;font-weight:900;box-shadow:0 7px 18px rgba(0,0,0,.25)}@keyframes cwPulse{0%{opacity:.32;transform:scale(.82)}75%,100%{opacity:0;transform:scale(1.2)}}@media(prefers-reduced-motion:reduce){.cw-pulse{animation:none!important;opacity:.16}}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
${clientScript}
<script>
(() => {
  const markerData=${escapeJson(markers)};
  const session=${escapeJson(session)};
  const nodes=new Map();
  const videoNodes=new Map();
  const escapeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const post=payload=>{try{${postExpression}}catch{}};
  const map=L.map('map',{zoomControl:false,minZoom:4,maxZoom:18,zoomSnap:.25,attributionControl:true});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
  const cluster=L.markerClusterGroup({maxClusterRadius:60,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({className:'custom-cluster',html:'<div class="cluster-core">'+c.getChildCount()+'</div>',iconSize:[44,44]})});
  const bounds=[];
  const cellHtml=member=>{
    const fallback='<div class="fallback">'+escapeText(member.initials||'?')+'</div>';
    const avatar=member.avatarUrl?'<img src="'+escapeText(member.avatarUrl)+'" alt=""/>':'';
    const video=member.cameraOn?'<video data-user-id="'+escapeText(member.id)+'" autoplay playsinline muted></video>':'';
    return '<div class="cw-cell" data-member-id="'+escapeText(member.id)+'">'+fallback+avatar+video+'</div>';
  };
  markerData.forEach(item=>{
    const group=item.members.length>1;
    const status=item.availability==='busy'?'#FF5868':'#35D58B';
    const first=item.members[0];
    const anyCamera=item.members.some(member=>member.cameraOn);
    const media='<div class="cw-media '+(group?'group':'single')+'" style="--status:'+status+'">'+item.members.slice(0,4).map(cellHtml).join('')+'</div>';
    const camera=anyCamera?'<div class="cw-camera">●</div>':'';
    const count=group?'<div class="cw-count">'+item.members.length+'</div>':'';
    const label=item.availability==='busy'?'Occupé':'Disponible';
    const html='<div class="cw-marker '+(item.availability==='busy'?'busy':'available')+'" data-marker-id="'+escapeText(item.id)+'" style="--status:'+status+'"><div class="cw-pulse"></div>'+media+camera+count+'<div class="cw-status"><span class="cw-dot"></span>'+label+'</div></div>';
    const width=group?96:74;const height=group?102:96;
    const marker=L.marker([item.latitude,item.longitude],{icon:L.divIcon({className:'',html,iconSize:[width,height],iconAnchor:[width/2,height-19]}),title:group?item.members.map(m=>m.name).join(', '):first?.name||'Membre Connexio'});
    marker.on('add',()=>{
      const root=marker.getElement()?.querySelector('.cw-marker');
      if(root){nodes.set(item.id,root);root.querySelectorAll('video[data-user-id]').forEach(video=>videoNodes.set(video.dataset.userId,video));}
    });
    marker.on('click',()=>post({type:'marker-selected',id:item.id}));
    marker.bindTooltip(escapeText(group?item.members.map(member=>member.name.split(' ')[0]).join(' · '):(first?.name||'Membre Connexio')),{direction:'bottom',offset:[0,12],opacity:.96});
    cluster.addLayer(marker);bounds.push([item.latitude,item.longitude]);
  });
  map.addLayer(cluster);
  if(bounds.length){map.fitBounds(bounds,{padding:[52,52],maxZoom:9})}else{map.setView([46.5,2.2],5.6)}
  const updateSelection=id=>nodes.forEach((node,key)=>node.classList.toggle('selected',Boolean(id)&&key===id));
  const handle=raw=>{try{const data=typeof raw==='string'?JSON.parse(raw):raw;if(data?.type==='selection')updateSelection(data.id||null);if(data?.type==='locate'&&data.location){const point=[data.location.latitude,data.location.longitude];map.flyTo(point,11,{duration:.65});}}catch{}};
  window.addEventListener('message',event=>handle(event.data));document.addEventListener('message',event=>handle(event.data));

  async function connectMedia(){
    if(!session||session.mock)return;
    const adapter=window.ConnexioCoworkingClient;
    if(!adapter||typeof adapter.connect!=='function')return;
    let localStream=null;
    try{
      if(!session.observer&&navigator.mediaDevices?.getUserMedia){
        localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      }
      await adapter.connect({
        ...session,
        localStream,
        observer:Boolean(session.observer),
        mapMode:true,
        onParticipantStream:participant=>{
          const video=videoNodes.get(participant?.id);
          if(video&&participant?.stream){video.srcObject=participant.stream;video.play?.().catch(()=>{});}
        },
        onParticipantLeft:participantId=>{
          const video=videoNodes.get(participantId);if(video)video.srcObject=null;
        },
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
