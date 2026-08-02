export type CallMode = "audio" | "video";

export interface IntegratedCallSession {
  id: string;
  conversationId: string;
  mode: CallMode;
  socketUrl: string;
  socketPath: string;
  clientScriptUrl?: string;
  token: string;
  initiator: boolean;
  iceServers: RTCIceServer[];
  expiresAt?: string;
  mock?: boolean;
}

function escapeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function socketClientScriptUrl(session: IntegratedCallSession): string {
  if (session.clientScriptUrl) return session.clientScriptUrl;
  const origin = new URL(session.socketUrl).origin;
  const path = session.socketPath.replace(/\/$/, "");
  return `${origin}${path}/socket.io.js`;
}

export function buildIntegratedCallHtml(
  session: IntegratedCallSession,
  displayName: string
): string {
  const config = {
    callId: session.id,
    mode: session.mode,
    socketUrl: session.socketUrl,
    socketPath: session.socketPath,
    token: session.token,
    initiator: session.initiator,
    iceServers: session.iceServers,
    displayName,
    mock: session.mock === true
  };
  const scriptUrl = socketClientScriptUrl(session);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <meta name="color-scheme" content="dark" />
  <title>Appel Connexio</title>
  <style>
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#020713;color:#f4f7ff;font-family:Inter,system-ui,-apple-system,sans-serif}
    #stage{position:relative;width:100%;height:100%;background:radial-gradient(circle at 50% 10%,#17285b 0,#071328 35%,#020713 72%)}
    video{background:#071225;object-fit:cover}
    #remote{position:absolute;inset:0;width:100%;height:100%}
    #local{position:absolute;right:16px;top:16px;width:min(31vw,150px);aspect-ratio:3/4;border-radius:22px;border:2px solid rgba(244,177,131,.72);box-shadow:0 18px 42px rgba(0,0,0,.42);z-index:4}
    .audio #remote,.audio #local{opacity:0;pointer-events:none}
    #identity{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;pointer-events:none}
    #avatar{width:112px;height:112px;border-radius:38px;background:linear-gradient(135deg,#654bea,#8b5cf6 52%,#f4b183);display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900;border:4px solid rgba(255,255,255,.12);box-shadow:0 22px 60px rgba(82,64,220,.42)}
    #name{font-size:22px;font-weight:900;text-align:center;padding:0 24px}#status{font-size:13px;color:#aeb9d4;text-align:center;padding:0 24px}
    #network{position:absolute;left:16px;top:16px;z-index:5;min-height:34px;padding:0 12px;border-radius:13px;background:rgba(2,7,19,.68);display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800}
    #dot{width:8px;height:8px;border-radius:50%;background:#f4b183;box-shadow:0 0 12px #f4b183}.connected #dot{background:#42d392;box-shadow:0 0 12px #42d392}.error #dot{background:#ff6b7a;box-shadow:0 0 12px #ff6b7a}
    #controls{position:absolute;left:0;right:0;bottom:max(22px,env(safe-area-inset-bottom));z-index:6;display:flex;align-items:center;justify-content:center;gap:13px;padding:0 16px}
    button{width:58px;height:58px;border-radius:21px;border:1px solid rgba(255,255,255,.12);background:rgba(15,27,56,.92);color:#fff;font-size:23px;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 28px rgba(0,0,0,.28)}
    button.active{background:#f4f7ff;color:#071225}button.end{width:68px;background:#c4334c;border-color:#e55a70}button:active{transform:scale(.94)}
    #errorBox{display:none;position:absolute;left:18px;right:18px;bottom:102px;z-index:8;padding:13px 14px;border-radius:16px;background:rgba(140,24,47,.94);font-size:12px;line-height:17px;text-align:center}
  </style>
</head>
<body>
  <div id="stage" class="${session.mode === "audio" ? "audio" : "video"}">
    <video id="remote" autoplay playsinline></video>
    <video id="local" autoplay playsinline muted></video>
    <div id="network"><span id="dot"></span><span id="networkText">Initialisation…</span></div>
    <div id="identity"><div id="avatar"></div><div id="name"></div><div id="status">Préparation de l’appel sécurisé…</div></div>
    <div id="errorBox"></div>
    <div id="controls">
      <button id="mute" aria-label="Couper le microphone">🎙️</button>
      <button id="camera" aria-label="Couper la caméra">📹</button>
      <button id="flip" aria-label="Changer de caméra">🔄</button>
      <button id="end" class="end" aria-label="Raccrocher">☎</button>
    </div>
  </div>
  ${session.mock ? "" : `<script src="${scriptUrl}"></script>`}
  <script>
  (() => {
    const cfg = ${escapeJson(config)};
    const localVideo = document.getElementById('local');
    const remoteVideo = document.getElementById('remote');
    const stage = document.getElementById('stage');
    const status = document.getElementById('status');
    const network = document.getElementById('network');
    const networkText = document.getElementById('networkText');
    const errorBox = document.getElementById('errorBox');
    const muteButton = document.getElementById('mute');
    const cameraButton = document.getElementById('camera');
    const flipButton = document.getElementById('flip');
    const endButton = document.getElementById('end');
    const nameNode = document.getElementById('name');
    const avatar = document.getElementById('avatar');
    let stream = null;
    let peer = null;
    let socket = null;
    let muted = false;
    let cameraOff = cfg.mode === 'audio';
    let facingMode = 'user';
    let ended = false;

    nameNode.textContent = cfg.displayName || 'Membre Neptune';
    avatar.textContent = (cfg.displayName || 'N').split(/\\s+/).slice(0,2).map(v => v[0] || '').join('').toUpperCase();
    if (cfg.mode === 'audio') {
      cameraButton.style.display = 'none';
      flipButton.style.display = 'none';
    }

    const post = (type, payload = {}) => {
      const message = JSON.stringify({ type, ...payload });
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
      if (window.parent && window.parent !== window) window.parent.postMessage(message, '*');
    };
    const setNetwork = (label, state = '') => {
      network.className = state;
      networkText.textContent = label;
    };
    const fail = (message) => {
      errorBox.style.display = 'block';
      errorBox.textContent = message;
      status.textContent = 'Appel indisponible';
      setNetwork('Erreur', 'error');
      post('error', { message });
    };
    const stopTracks = () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (peer) { try { peer.close(); } catch {} }
      if (socket) { try { socket.disconnect(); } catch {} }
    };
    const endCall = (notify = true) => {
      if (ended) return;
      ended = true;
      if (notify && socket) socket.emit('call:end', { callId: cfg.callId });
      stopTracks();
      post('ended', { callId: cfg.callId });
    };

    async function createPeer() {
      if (peer) return peer;
      peer = new RTCPeerConnection({ iceServers: cfg.iceServers });
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) remoteVideo.srcObject = remoteStream;
        status.textContent = 'Appel en cours';
        setNetwork('Connecté', 'connected');
      };
      peer.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('call:signal', {
            callId: cfg.callId,
            signal: { type: 'ice', candidate: event.candidate }
          });
        }
      };
      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        if (state === 'connected') {
          status.textContent = 'Appel en cours';
          setNetwork('Connecté', 'connected');
        } else if (state === 'failed' || state === 'disconnected') {
          setNetwork('Reconnexion…');
        } else if (state === 'closed') {
          endCall(false);
        }
      };
      return peer;
    }

    async function createOffer() {
      const pc = await createPeer();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call:signal', {
        callId: cfg.callId,
        signal: { type: 'offer', sdp: offer.sdp }
      });
    }

    async function handleSignal(message) {
      const signal = message && (message.signal || message);
      if (!signal || !signal.type) return;
      const pc = await createPeer();
      if (signal.type === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:signal', {
          callId: cfg.callId,
          signal: { type: 'answer', sdp: answer.sdp }
        });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
      } else if (signal.type === 'ice' && signal.candidate) {
        await pc.addIceCandidate(signal.candidate);
      }
    }

    async function openMedia() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Cet appareil ne permet pas les appels audio/vidéo intégrés.');
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: cfg.mode === 'video' ? { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });
      localVideo.srcObject = stream;
      if (cfg.mode === 'video') localVideo.style.display = 'block';
      status.textContent = cfg.mock
        ? 'Prévisualisation locale — invitez un second appareil avec le backend Neptune.'
        : 'En attente du correspondant…';
    }

    async function connectSocket() {
      if (typeof window.io !== 'function') {
        throw new Error('Le client temps réel Neptune est indisponible.');
      }
      socket = window.io(cfg.socketUrl, {
        path: cfg.socketPath,
        transports: ['websocket'],
        auth: { callToken: cfg.token, callId: cfg.callId }
      });
      socket.on('connect', () => {
        setNetwork('En ligne', 'connected');
        socket.emit('call:join', {
          callId: cfg.callId,
          displayName: cfg.displayName,
          mode: cfg.mode
        });
      });
      socket.on('connect_error', () => setNetwork('Reconnexion…'));
      socket.on('call:participant-joined', async () => {
        status.textContent = 'Connexion au correspondant…';
        if (cfg.initiator) await createOffer();
      });
      socket.on('call:signal', (message) => void handleSignal(message).catch(error => fail(error.message)));
      socket.on('call:ended', () => endCall(false));
      socket.on('call:participant-left', () => {
        status.textContent = 'Le correspondant a quitté l’appel.';
        setNetwork('Terminé');
      });
    }

    muteButton.addEventListener('click', () => {
      muted = !muted;
      if (stream) stream.getAudioTracks().forEach(track => { track.enabled = !muted; });
      muteButton.classList.toggle('active', muted);
      muteButton.textContent = muted ? '🔇' : '🎙️';
    });
    cameraButton.addEventListener('click', () => {
      cameraOff = !cameraOff;
      if (stream) stream.getVideoTracks().forEach(track => { track.enabled = !cameraOff; });
      cameraButton.classList.toggle('active', cameraOff);
      cameraButton.textContent = cameraOff ? '🚫' : '📹';
    });
    flipButton.addEventListener('click', async () => {
      if (!stream || cfg.mode !== 'video') return;
      const oldTrack = stream.getVideoTracks()[0];
      facingMode = facingMode === 'user' ? 'environment' : 'user';
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      const nextTrack = nextStream.getVideoTracks()[0];
      if (peer && oldTrack && nextTrack) {
        const sender = peer.getSenders().find(item => item.track && item.track.kind === 'video');
        if (sender) await sender.replaceTrack(nextTrack);
      }
      if (oldTrack) oldTrack.stop();
      if (nextTrack) {
        stream.removeTrack(oldTrack);
        stream.addTrack(nextTrack);
        localVideo.srcObject = stream;
      }
    });
    endButton.addEventListener('click', () => endCall(true));
    window.addEventListener('beforeunload', () => endCall(true));

    openMedia()
      .then(() => cfg.mock ? setNetwork('Mode démonstration', 'connected') : connectSocket())
      .catch(error => fail(error && error.message ? error.message : 'Permissions caméra ou microphone refusées.'));
  })();
  </script>
</body>
</html>`;
}

export function createMockCallSession(
  conversationId: string,
  mode: CallMode
): IntegratedCallSession {
  return {
    id: `mock-call-${conversationId}`,
    conversationId,
    mode,
    socketUrl: "https://localhost",
    socketPath: "/socket.io",
    token: "mock-call-token",
    initiator: true,
    iceServers: [],
    mock: true
  };
}
