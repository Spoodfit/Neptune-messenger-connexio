import type { CoworkingMediaSession } from "../../types/coworking";
import { normalizeLanguageCode } from "../../i18n/languages";

export interface CoworkingMediaBridgeConfig {
  cameraOn: boolean;
  microphoneOn: boolean;
  screenSharing?: boolean;
  mapMode?: boolean;
  spatialAudio?: boolean;
  gridLayout?: boolean;
  participantLayout?: Record<
    string,
    { x: number; y: number; width: number; height: number }
  >;
  roomViewMode?: "stage" | "overview";
  focusParticipantId?: string;
}

function escapeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character] ?? character);
}

/**
 * Coworking is intentionally separate from the 1-to-1 call stack. The backend
 * supplies a short-lived room client that connects this surface to the Neptune
 * SFU. Map preview streams and General Room streams stay SFU-based; no mesh is
 * created between members.
 */
export function buildCoworkingMediaHtml(
  session: CoworkingMediaSession,
  displayName: string,
  initial: CoworkingMediaBridgeConfig,
  language = "fr"
): string {
  const config = {
    spaceId: session.spaceId,
    socketUrl: session.socketUrl,
    socketPath: session.socketPath,
    token: session.token,
    participantId: session.participantId,
    displayName,
    iceServers: session.iceServers,
    cameraOn: initial.cameraOn,
    microphoneOn: initial.microphoneOn,
    screenSharing: initial.screenSharing === true,
    mapMode: initial.mapMode === true,
    spatialAudio: initial.spatialAudio === true,
    participantLayout: initial.participantLayout ?? {},
    roomViewMode: initial.roomViewMode,
    focusParticipantId: initial.focusParticipantId,
    observer: session.observer === true,
    mock: session.mock === true
  };
  const clientScript = session.clientScriptUrl
    ? `<script src="${escapeAttribute(session.clientScriptUrl)}" crossorigin="anonymous"></script>`
    : "";
  const signalingUrl = new URL(session.socketUrl);
  const signalingAuthority = `${signalingUrl.hostname}${signalingUrl.port ? `:${signalingUrl.port}` : ""}`;
  const signalingOrigins = `https://${signalingAuthority} wss://${signalingAuthority}`;
  const clientOrigin = session.clientScriptUrl ? new URL(session.clientScriptUrl).origin : `https://${signalingAuthority}`;
  const documentLanguage = normalizeLanguageCode(language, "fr");
  const contentSecurityPolicy = `default-src 'none'; script-src 'unsafe-inline' ${clientOrigin}; style-src 'unsafe-inline'; connect-src ${signalingOrigins} ${clientOrigin}; media-src 'self' blob:; img-src data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none';`;

  return `<!doctype html>
<html lang="${documentLanguage}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <meta name="color-scheme" content="dark" />
  <meta http-equiv="Content-Security-Policy" content="${escapeAttribute(contentSecurityPolicy)}" />
  <meta name="referrer" content="no-referrer" />
  <style>
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;color:#f4f7ff;font-family:Inter,system-ui,-apple-system,sans-serif}
    #stage{position:absolute;inset:0;overflow:hidden;background:transparent}
    #remoteGrid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:8px;padding:8px;background:transparent}
    .remote{position:relative;overflow:hidden;border-radius:26px;background:#071127;border:1px solid rgba(255,255,255,.1);transition:left .18s ease,top .18s ease,opacity .18s ease,box-shadow .16s ease}
    .remote video{width:100%;height:100%;object-fit:cover;background:#071127}
    .remote .name{position:absolute;left:10px;bottom:10px;max-width:75%;padding:5px 8px;border-radius:999px;background:rgba(2,7,19,.72);font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #local{position:absolute;right:14px;bottom:14px;width:92px;height:118px;border-radius:24px;object-fit:cover;background:#071127;border:2px solid rgba(107,79,234,.75);box-shadow:0 14px 36px rgba(0,0,0,.35);z-index:5;transition:left .18s ease,top .18s ease,opacity .18s ease,box-shadow .16s ease}
    .remote.speaking,#local.speaking{animation:audioHalo 1.35s ease-out infinite;border-color:#35d58b;box-shadow:0 0 0 3px rgba(53,213,139,.24),0 0 24px rgba(53,213,139,.28)}
    #shareBadge{display:none;position:absolute;left:14px;top:14px;z-index:9;min-height:32px;padding:7px 10px;border-radius:999px;background:rgba(2,7,19,.82);border:1px solid rgba(84,216,220,.72);color:#f4f7ff;font-size:10px;font-weight:900;align-items:center;gap:6px}#shareBadge.active{display:flex}
    #empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#aeb8d2;text-align:center;padding:24px}
    #remoteGrid.room-stage{display:block;padding:0}
    #remoteGrid.room-stage .remote{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:26px}
    #remoteGrid.room-stage .remote:not(.focused){display:none}
    #remoteGrid.room-stage .remote .name{bottom:92px;max-width:calc(100% - 118px)}
    #remoteGrid.room-overview{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,112px));grid-auto-rows:112px;place-content:center;gap:18px;padding:24px 18px 116px}
    #remoteGrid.room-overview .remote{width:100%;height:100%;border-radius:50%;border:3px solid rgba(255,255,255,.72);box-shadow:0 12px 28px rgba(0,0,0,.28)}
    #remoteGrid.room-overview .remote .name{left:8px;right:8px;bottom:6px;max-width:none;text-align:center;padding:4px 6px;font-size:10px}
    #local.room-stage{bottom:92px}
    #local.room-overview{width:92px;height:92px;bottom:92px;border-radius:50%}
    #remoteGrid.room-stage .remote,#remoteGrid.room-overview .remote{background:transparent}
    #remoteGrid.room-stage .remote video,#remoteGrid.room-overview .remote video{opacity:0;background:transparent;transition:opacity .16s ease}
    #remoteGrid.room-stage .remote video.video-ready,#remoteGrid.room-overview .remote video.video-ready{opacity:1;background:#071127}
    @keyframes audioHalo{0%{box-shadow:0 0 0 0 rgba(53,213,139,.38),0 0 12px rgba(53,213,139,.2)}75%,100%{box-shadow:0 0 0 11px rgba(53,213,139,0),0 0 26px rgba(53,213,139,.26)}}
    @media(prefers-reduced-motion:reduce){.remote.speaking,#local.speaking{animation:none}}
  </style>
</head>
<body>
  <div id="stage"><div id="remoteGrid"></div><div id="empty">Connexion à l’espace…</div><div id="shareBadge">Écran partagé</div><video id="local" autoplay playsinline muted></video></div>
  ${clientScript}
  <script>
  (() => {
    const cfg=${escapeJson(config)};
    const grid=document.getElementById('remoteGrid');
    const local=document.getElementById('local');
    const empty=document.getElementById('empty');
    const shareBadge=document.getElementById('shareBadge');
    const remoteNodes=new Map();
    const audioMeters=new Map();
    let localStream=null;
    let screenStream=null;
    let client=null;

    const spatial=()=>Boolean(cfg.spatialAudio);
    const freeLayout=()=>Boolean(cfg.mapMode||cfg.spatialAudio||cfg.gridLayout);
    const roomView=()=>cfg.roomViewMode==='stage'||cfg.roomViewMode==='overview';
    if(freeLayout()){
      grid.style.display='block';
      grid.style.padding='0';
      grid.style.pointerEvents='none';
      empty.style.display='none';
      if(cfg.mapMode)local.style.display='none';
    }

    const post=(type,payload={})=>{try{window.ReactNativeWebView?.postMessage(JSON.stringify({type,...payload}))}catch{}};
    const stopMeter=(key)=>{const stopMeterForKey=audioMeters.get(key);if(stopMeterForKey)stopMeterForKey();audioMeters.delete(key)};
    const monitorAudio=(stream,node,key)=>{
      stopMeter(key);
      if(!stream?.getAudioTracks?.().some(track=>track.readyState==='live'))return;
      const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextCtor)return;
      try{
        const context=new AudioContextCtor();
        const source=context.createMediaStreamSource(stream);
        const analyser=context.createAnalyser();
        analyser.fftSize=128;analyser.smoothingTimeConstant=.72;source.connect(analyser);
        const samples=new Uint8Array(analyser.fftSize);let frame=0,stopped=false;
        const sample=()=>{
          if(stopped)return;
          analyser.getByteTimeDomainData(samples);
          let energy=0;for(const value of samples){const centered=(value-128)/128;energy+=centered*centered}
          const level=Math.sqrt(energy/samples.length);
          node.classList.toggle('speaking',level>.055);
          if(frame%8===0)post('audio-level',{participantId:key,level:Math.min(1,level*5)});
          frame+=1;requestAnimationFrame(sample);
        };
        sample();
        audioMeters.set(key,()=>{stopped=true;node.classList.remove('speaking');source.disconnect();void context.close?.()});
      }catch{}
    };
    const updateEmpty=()=>{empty.style.display=freeLayout()||roomView()?'none':remoteNodes.size?'none':'flex'};
    const applyRoomView=()=>{
      const mode=cfg.roomViewMode;
      grid.classList.toggle('room-stage',mode==='stage');
      grid.classList.toggle('room-overview',mode==='overview');
      local.classList.toggle('room-stage',mode==='stage');
      local.classList.toggle('room-overview',mode==='overview');
      if(!roomView())return;
      const requested=cfg.focusParticipantId?remoteNodes.get(cfg.focusParticipantId):null;
      const focused=requested||remoteNodes.values().next().value||null;
      remoteNodes.forEach(node=>{
        node.classList.toggle('focused',mode==='stage'&&node===focused);
        node.style.display=mode==='stage'&&node!==focused?'none':'';
      });
      updateEmpty();
    };
    const positionNode=(node,participantId)=>{
      if(!freeLayout())return;
      const pos=cfg.participantLayout?.[participantId];
      if(!pos){node.style.display='none';return;}
      node.style.display='block';
      node.style.position='absolute';
      node.style.left=(cfg.gridLayout?pos.x-pos.width/2:pos.x)+'%';
      node.style.top=(cfg.gridLayout?pos.y-pos.height/2:pos.y)+'%';
      node.style.width=pos.width+(cfg.gridLayout?'%':'px');
      node.style.height=pos.height+(cfg.gridLayout?'%':'px');
      node.style.transform=cfg.gridLayout?'none':'translate(-50%,-50%)';
      node.style.borderRadius=cfg.spatialAudio?'24px':'22px';
      node.style.border='0';
    };
    const positionLocal=()=>{
      if(!freeLayout()||cfg.mapMode)return;
      const pos=cfg.participantLayout?.[cfg.participantId];
      if(!pos){local.style.display='none';return;}
      local.style.display='block';
      local.style.right='auto';
      local.style.bottom='auto';
      local.style.left=(cfg.gridLayout?pos.x-pos.width/2:pos.x)+'%';
      local.style.top=(cfg.gridLayout?pos.y-pos.height/2:pos.y)+'%';
      local.style.width=pos.width+(cfg.gridLayout?'%':'px');
      local.style.height=pos.height+(cfg.gridLayout?'%':'px');
      local.style.transform=cfg.gridLayout?'none':'translate(-50%,-50%)';
      local.style.borderRadius=cfg.gridLayout?'22px':'24px';
    };
    const spatialGain=(participantId)=>{
      if(!spatial())return 1;
      const me=cfg.participantLayout?.[cfg.participantId];
      const them=cfg.participantLayout?.[participantId];
      if(!me||!them)return .28;
      const dx=me.x-them.x;
      const dy=me.y-them.y;
      const distance=Math.sqrt(dx*dx+dy*dy);
      if(distance<=10)return 1;
      if(distance>=46)return 0;
      const linear=1-(distance-10)/36;
      return Math.max(0,Math.min(1,Math.pow(linear,1.35)));
    };
    const updateSpatialAudio=()=>{
      if(!spatial())return;
      remoteNodes.forEach((node,participantId)=>{
        const video=node.querySelector('video');
        if(!video)return;
        const gain=spatialGain(participantId);
        video.muted=false;
        video.volume=gain;
      });
    };
    const applyLayout=()=>{
      remoteNodes.forEach((node,participantId)=>positionNode(node,participantId));
      positionLocal();
      updateSpatialAudio();
      applyRoomView();
    };
    const applyTrackState=()=>{
      if(localStream){
        localStream.getVideoTracks().forEach(track=>track.enabled=cfg.cameraOn);
        localStream.getAudioTracks().forEach(track=>track.enabled=cfg.microphoneOn);
      }
      if(!cfg.mapMode&&!cfg.screenSharing)local.style.opacity=cfg.cameraOn?'1':'0';
      if(client&&typeof client.setMediaState==='function')client.setMediaState({cameraOn:cfg.cameraOn,microphoneOn:cfg.microphoneOn});
    };
    const ensureLocalMedia=async()=>{
      if(cfg.observer||localStream)return localStream;
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Caméra et microphone non pris en charge sur cet appareil.');
      post('local-media-requested');
      localStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      local.srcObject=localStream;local.muted=true;await local.play?.().catch(()=>{});
      monitorAudio(localStream,local,'local');
      applyTrackState();positionLocal();post('local-media-ready');
      return localStream;
    };
    const setTracks=async(cameraOn,microphoneOn)=>{
      cfg.cameraOn=Boolean(cameraOn);cfg.microphoneOn=Boolean(microphoneOn);
      if(!localStream&&(cfg.cameraOn||cfg.microphoneOn)){
        try{await ensureLocalMedia()}catch(mediaError){post('local-media-unavailable',{message:mediaError?.message||'Caméra ou microphone indisponible.'})}
      }
      applyTrackState();
    };
    const setScreenSharing=async(active)=>{
      const requested=Boolean(active);
      if(requested===Boolean(cfg.screenSharing)&&(!requested||screenStream))return;
      try{
        if(!requested){
          if(client&&typeof client.stopScreenShare==='function')await client.stopScreenShare();
          else if(client&&typeof client.setScreenShare==='function')await client.setScreenShare({enabled:false});
          else if(client&&typeof client.replaceVideoTrack==='function')await client.replaceVideoTrack(localStream?.getVideoTracks?.()[0]||null);
          if(screenStream)screenStream.getTracks().forEach(track=>track.stop());screenStream=null;cfg.screenSharing=false;
          local.srcObject=localStream;applyTrackState();shareBadge.classList.remove('active');post('screen-share-state',{active:false});return;
        }
        let adapterHandled=false;let result=null;
        if(client&&typeof client.startScreenShare==='function'){result=await client.startScreenShare();adapterHandled=true}
        if(result?.stream)result=result.stream;
        if(result?.getVideoTracks)screenStream=result;
        if(!screenStream&&navigator.mediaDevices?.getDisplayMedia)screenStream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
        if(!screenStream&&!adapterHandled)throw new Error('Le partage d’écran n’est pas pris en charge sur cet appareil.');
        if(screenStream&&!adapterHandled&&client&&typeof client.setScreenShare==='function'){await client.setScreenShare({enabled:true,stream:screenStream});adapterHandled=true}
        if(screenStream&&!adapterHandled&&client&&typeof client.replaceVideoTrack==='function'){await client.replaceVideoTrack(screenStream.getVideoTracks()[0]);adapterHandled=true}
        if(!cfg.mock&&!adapterHandled)throw new Error('Le serveur média ne prend pas encore en charge le partage d’écran.');
        cfg.screenSharing=true;shareBadge.classList.add('active');
        if(screenStream){local.srcObject=screenStream;local.style.opacity='1';const track=screenStream.getVideoTracks()[0];if(track)track.addEventListener('ended',()=>{void setScreenSharing(false)},{once:true})}
        post('screen-share-state',{active:true});
      }catch(error){
        if(screenStream)screenStream.getTracks().forEach(track=>track.stop());screenStream=null;cfg.screenSharing=false;shareBadge.classList.remove('active');post('screen-share-state',{active:false});post('error',{message:error?.message||'Partage d’écran impossible.'});
      }
    };
    const addRemote=(participant)=>{
      if(!participant||!participant.id||!participant.stream)return;
      let node=remoteNodes.get(participant.id);
      if(!node){
        node=document.createElement('div');node.className='remote';
        const video=document.createElement('video');video.autoplay=true;video.playsInline=true;
        const name=document.createElement('div');name.className='name';
        node.append(video,name);grid.appendChild(node);remoteNodes.set(participant.id,node);
      }
      if(freeLayout()){
        positionNode(node,participant.id);
        node.querySelector('.name').style.display='none';
      }
      const video=node.querySelector('video');
      video.srcObject=participant.stream;
      const videoTracks=participant.stream.getVideoTracks?.()||[];
      const refreshVideo=()=>video.classList.toggle('video-ready',videoTracks.some(track=>track.readyState==='live'&&!track.muted));
      videoTracks.forEach(track=>{track.addEventListener?.('mute',refreshVideo);track.addEventListener?.('unmute',refreshVideo);track.addEventListener?.('ended',refreshVideo)});
      video.onplaying=refreshVideo;
      video.onemptied=()=>video.classList.remove('video-ready');
      refreshVideo();
      video.muted=!spatial();
      if(spatial())video.volume=spatialGain(participant.id);
      video.play?.().catch(()=>{});
      monitorAudio(participant.stream,node,participant.id);
      node.querySelector('.name').textContent=participant.displayName||'Membre Neptune';
      applyRoomView();
      updateEmpty();
    };
    const removeRemote=(participantId)=>{
      stopMeter(participantId);const node=remoteNodes.get(participantId);if(node)node.remove();remoteNodes.delete(participantId);applyRoomView();updateEmpty();updateSpatialAudio();
    };
    const stop=()=>{
      try{client?.disconnect?.()}catch{}
      stopMeter('local');audioMeters.forEach(stopMeterForKey=>stopMeterForKey());audioMeters.clear();
      if(screenStream)screenStream.getTracks().forEach(track=>track.stop());screenStream=null;
      if(localStream)localStream.getTracks().forEach(track=>track.stop());
      remoteNodes.forEach(node=>node.remove());remoteNodes.clear();updateEmpty();
    };

    window.__connexioCoworkingControl=(command)=>{
      if(!command)return;
      if(command.type==='media')void setTracks(command.cameraOn,command.microphoneOn);
      if(command.type==='screen-share')void setScreenSharing(command.active);
      if(command.type==='layout'){
        cfg.participantLayout=command.participantLayout||{};
        applyLayout();
        if(client&&typeof client.setSpatialLayout==='function')client.setSpatialLayout(cfg.participantLayout);
      }
      if(command.type==='room-view'){
        cfg.roomViewMode=command.roomViewMode;
        cfg.focusParticipantId=command.focusParticipantId;
        applyRoomView();
      }
      if(command.type==='leave'){stop();post('left')}
    };

    async function start(){
      try{
        if(!cfg.observer){
          try{await ensureLocalMedia()}catch(mediaError){localStream=null;post('local-media-unavailable',{message:mediaError?.message||'Caméra ou microphone indisponible.'})}
        }
        if(cfg.mock){
          applyLayout();applyRoomView();post('capabilities',{screenShare:Boolean(navigator.mediaDevices?.getDisplayMedia)});post('connected');post('media-ready');
          if(cfg.screenSharing)void setScreenSharing(true);
          return;
        }
        const adapter=window.ConnexioCoworkingClient;
        if(!adapter||typeof adapter.connect!=='function'){
          throw new Error('Client média Coworking indisponible.');
        }
        client=await adapter.connect({
          ...cfg,
          localStream,
          observer:Boolean(cfg.observer),
          mapMode:Boolean(cfg.mapMode),
          spatialAudio:Boolean(cfg.spatialAudio),
          participantLayout:cfg.participantLayout,
          onParticipantStream:addRemote,
          onParticipantLeft:removeRemote,
          onConnected:()=>post('connected'),
          onError:(error)=>post('error',{message:error?.message||String(error||'Connexion média impossible')})
        });
        post('capabilities',{screenShare:Boolean(client&&typeof client.startScreenShare==='function'||navigator.mediaDevices?.getDisplayMedia)});
        applyLayout();
        applyRoomView();
        if(cfg.screenSharing)void setScreenSharing(true);
        post('media-ready');
      }catch(error){
        stop();
        post('error',{message:error?.message||'Connexion média impossible.'});
      }
    }
    window.addEventListener('beforeunload',stop);
    start();
  })();
  </script>
</body>
</html>`;
}
