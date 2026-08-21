import type { CoworkingMediaSession } from "../../types/coworking";

export interface CoworkingMediaBridgeConfig {
  cameraOn: boolean;
  microphoneOn: boolean;
  mapMode?: boolean;
  participantLayout?: Record<
    string,
    { x: number; y: number; width: number; height: number }
  >;
}

function escapeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Coworking is intentionally separate from the 1-to-1 call stack. The backend
 * supplies a short-lived room client that connects this surface to the Neptune
 * SFU. Opening the map in observer mode never calls getUserMedia; local media
 * starts only after an explicit join action.
 */
export function buildCoworkingMediaHtml(
  session: CoworkingMediaSession,
  displayName: string,
  initial: CoworkingMediaBridgeConfig
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
    mapMode: initial.mapMode === true,
    participantLayout: initial.participantLayout ?? {},
    observer: session.observer === true
  };
  const clientScript = session.clientScriptUrl
    ? `<script src="${session.clientScriptUrl}"></script>`
    : "";

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <meta name="color-scheme" content="dark" />
  <style>
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;color:#f4f7ff;font-family:Inter,system-ui,-apple-system,sans-serif}
    #stage{position:absolute;inset:0;overflow:hidden;background:transparent}
    #remoteGrid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:8px;padding:8px;background:transparent}
    .remote{position:relative;overflow:hidden;border-radius:26px;background:#071127;border:1px solid rgba(255,255,255,.1)}
    .remote video{width:100%;height:100%;object-fit:cover;background:#071127}
    .remote .name{position:absolute;left:10px;bottom:10px;max-width:75%;padding:5px 8px;border-radius:999px;background:rgba(2,7,19,.72);font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #local{position:absolute;right:14px;bottom:14px;width:92px;height:118px;border-radius:24px;object-fit:cover;background:#071127;border:2px solid rgba(107,79,234,.75);box-shadow:0 14px 36px rgba(0,0,0,.35);z-index:5}
    #empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#aeb8d2;text-align:center;padding:24px}
  </style>
</head>
<body>
  <div id="stage"><div id="remoteGrid"></div><div id="empty">Connexion à l’espace…</div><video id="local" autoplay playsinline muted></video></div>
  ${clientScript}
  <script>
  (() => {
    const cfg=${escapeJson(config)};
    const grid=document.getElementById('remoteGrid');
    const local=document.getElementById('local');
    const empty=document.getElementById('empty');
    const remoteNodes=new Map();
    let localStream=null;
    let client=null;

    if(cfg.mapMode){
      grid.style.display='block';
      grid.style.padding='0';
      grid.style.pointerEvents='none';
      local.style.display='none';
      empty.style.display='none';
    }

    const post=(type,payload={})=>{try{window.ReactNativeWebView?.postMessage(JSON.stringify({type,...payload}))}catch{}};
    const updateEmpty=()=>{empty.style.display=cfg.mapMode?'none':remoteNodes.size?'none':'flex'};
    const setTracks=(cameraOn,microphoneOn)=>{
      if(!localStream)return;
      localStream.getVideoTracks().forEach(track=>track.enabled=Boolean(cameraOn));
      localStream.getAudioTracks().forEach(track=>track.enabled=Boolean(microphoneOn));
      if(!cfg.mapMode)local.style.opacity=cameraOn?'1':'0';
      if(client&&typeof client.setMediaState==='function')client.setMediaState({cameraOn:Boolean(cameraOn),microphoneOn:Boolean(microphoneOn)});
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
      if(cfg.mapMode){
        const pos=cfg.participantLayout?.[participant.id];
        if(pos){
          node.style.position='absolute';
          node.style.left=pos.x+'%';
          node.style.top=pos.y+'%';
          node.style.width=pos.width+'px';
          node.style.height=pos.height+'px';
          node.style.transform='translate(-50%,-50%)';
          node.style.borderRadius='22px';
          node.style.border='0';
        }else{
          node.style.display='none';
        }
        node.querySelector('.name').style.display='none';
      }
      node.querySelector('video').srcObject=participant.stream;
      node.querySelector('.name').textContent=participant.displayName||'Membre Neptune';
      updateEmpty();
    };
    const removeRemote=(participantId)=>{
      const node=remoteNodes.get(participantId);if(node)node.remove();remoteNodes.delete(participantId);updateEmpty();
    };
    const stop=()=>{
      try{client?.disconnect?.()}catch{}
      if(localStream)localStream.getTracks().forEach(track=>track.stop());
      remoteNodes.forEach(node=>node.remove());remoteNodes.clear();updateEmpty();
    };

    window.__connexioCoworkingControl=(command)=>{
      if(!command)return;
      if(command.type==='media')setTracks(command.cameraOn,command.microphoneOn);
      if(command.type==='leave'){stop();post('left')}
    };

    async function start(){
      try{
        if(!cfg.observer){
          localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
          local.srcObject=localStream;
          setTracks(cfg.cameraOn,cfg.microphoneOn);
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
          onParticipantStream:addRemote,
          onParticipantLeft:removeRemote,
          onConnected:()=>post('connected'),
          onError:(error)=>post('error',{message:error?.message||String(error||'Connexion média impossible')})
        });
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
