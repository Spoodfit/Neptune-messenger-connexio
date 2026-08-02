import { Asset } from "expo-asset";

export type CallMode = "audio" | "video";

const CONNEXIO_RINGTONE_URI = Asset.fromModule(
  require("../../../assets/audio/connexio-ringtone.mp3")
).uri;

export interface IntegratedCallSession {
  id: string;
  conversationId: string;
  mode: CallMode;
  reason?: string;
  socketUrl: string;
  socketPath: string;
  clientScriptUrl?: string;
  token: string;
  initiator: boolean;
  iceServers: RTCIceServer[];
  expiresAt?: string;
  mock?: boolean;
}

const CALL_CONTROL_ICONS = {
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V5a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z"/><path d="M5.5 10.5v.5a6.5 6.5 0 0 0 13 0v-.5M12 17.5V21M9 21h6"/></svg>',
  micOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16M9 9v2a3 3 0 0 0 4.7 2.5M15.5 10.5V5a3.5 3.5 0 0 0-6.7-1.4M5.5 10.5v.5a6.5 6.5 0 0 0 10.9 4.8M18.5 10.5v.5a6.4 6.4 0 0 1-.7 2.9M12 17.5V21M9 21h6"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/></svg>',
  cameraOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16M3 9v6a3 3 0 0 0 3 3h8M16 14l5 3V7l-5 3V9a3 3 0 0 0-3-3H8"/></svg>',
  flip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7h-7l2.5-2.5M4 17h7l-2.5 2.5M19 7a8 8 0 0 1-1.4 9.1M5 17a8 8 0 0 1 1.4-9.1"/></svg>',
  end: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 15.8c4.3-3 9.3-3 13.6 0l1.2-2.2a2 2 0 0 0-.7-2.7c-4.7-2.8-9.9-2.8-14.6 0a2 2 0 0 0-.7 2.7l1.2 2.2Z"/><path d="M8 14.4 7.2 19M16 14.4l.8 4.6"/></svg>'
} as const;

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
    conversationId: session.conversationId,
    mode: session.mode,
    reason: session.reason ?? "Appel Neptune",
    socketUrl: session.socketUrl,
    socketPath: session.socketPath,
    token: session.token,
    initiator: session.initiator,
    iceServers: session.iceServers,
    displayName,
    mock: session.mock === true,
    icons: CALL_CONTROL_ICONS,
    ringtoneUrl: CONNEXIO_RINGTONE_URI
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
    #identity{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;pointer-events:none}
    #avatar{width:112px;height:112px;border-radius:38px;background:linear-gradient(135deg,#654bea,#8b5cf6 52%,#f4b183);display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900;border:4px solid rgba(255,255,255,.12);box-shadow:0 22px 60px rgba(82,64,220,.42)}
    #name{font-size:22px;font-weight:900;text-align:center;padding:0 24px}
    #reason{max-width:min(88vw,460px);padding:9px 13px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(8,18,38,.7);font-size:11px;color:#dce4f8;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #status{font-size:13px;color:#aeb9d4;text-align:center;padding:0 24px}
    #network{position:absolute;left:16px;top:16px;z-index:5;min-height:34px;padding:0 12px;border-radius:13px;background:rgba(2,7,19,.68);display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800}
    #dot{width:8px;height:8px;border-radius:50%;background:#f4b183;box-shadow:0 0 12px #f4b183}.connected #dot{background:#42d392;box-shadow:0 0 12px #42d392}.error #dot{background:#ff6b7a;box-shadow:0 0 12px #ff6b7a}
    #controls{position:absolute;left:0;right:0;bottom:max(22px,env(safe-area-inset-bottom));z-index:6;display:flex;align-items:center;justify-content:center;gap:13px;padding:0 16px}
    button{width:58px;height:58px;border-radius:21px;border:1px solid rgba(255,255,255,.12);background:rgba(15,27,56,.92);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 28px rgba(0,0,0,.28);cursor:pointer}
    button svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    button.active{background:#f4f7ff;color:#071225}button.end{width:68px;background:#c4334c;border-color:#e55a70}button:active{transform:scale(.94)}
    #errorBox{display:none;position:absolute;left:18px;right:18px;bottom:102px;z-index:8;padding:13px 14px;border-radius:16px;background:rgba(140,24,47,.94);font-size:12px;line-height:17px;text-align:center}
  </style>
</head>
<body>
  <div id="stage" class="${session.mode === "audio" ? "audio" : "video"}">
    <video id="remote" autoplay playsinline></video>
    <video id="local" autoplay playsinline muted></video>
    <div id="network"><span id="dot"></span><span id="networkText">Initialisation…</span></div>
    <div id="identity"><div id="avatar"></div><div id="name"></div><div id="reason"></div><div id="status">Préparation de l’appel sécurisé…</div></div>
    <div id="errorBox"></div>
    <div id="controls">
      <button id="mute" aria-label="Couper le microphone"></button>
      <button id="camera" aria-label="Couper la caméra"></button>
      <button id="flip" aria-label="Changer de caméra"></button>
      <button id="end" class="end" aria-label="Raccrocher"></button>
    </div>
  </div>
  ${session.mock ? "" : `<script src="${scriptUrl}"></script>`}
  <script>
  (() => {
    const cfg = ${escapeJson(config)};
    const localVideo = document.getElementById('local');
    const remoteVideo = document.getElementById('remote');
    const status = document.getElementById('status');
    const network = document.getElementById('network');
    const networkText = document.getElementById('networkText');
    const errorBox = document.getElementById('errorBox');
    const muteButton = document.getElementById('mute');
    const cameraButton = document.getElementById('camera');
    const flipButton = document.getElementById('flip');
    const endButton = document.getElementById('end');
    const nameNode = document.getElementById('name');
    const reasonNode = document.getElementById('reason');
    const avatar = document.getElementById('avatar');
    let stream = null;
    let peer = null;
    let socket = null;
    let muted = false;
    let cameraOff = cfg.mode === 'audio';
    let facingMode = 'user';
    let ended = false;
    let ringtone = null;
    let noAnswerTimer = null;

    muteButton.innerHTML = cfg.icons.mic;
    cameraButton.innerHTML = cfg.icons.camera;
    flipButton.innerHTML = cfg.icons.flip;
    endButton.innerHTML = cfg.icons.end;
    nameNode.textContent = cfg.displayName || 'Membre Neptune';
    reasonNode.textContent = 'Objet · ' + (cfg.reason || 'Appel Neptune');
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
    const stopRingback = () => {
      if (noAnswerTimer) clearTimeout(noAnswerTimer);
      noAnswerTimer = null;
      if (ringtone) {
        try {
          ringtone.pause();
          ringtone.currentTime = 0;
        } catch {}
      }
    };
    const startRingback = () => {
      if (!cfg.initiator || noAnswerTimer) return;
      try {
        ringtone = ringtone || new Audio(cfg.ringtoneUrl);
        ringtone.loop = true;
        ringtone.preload = 'auto';
        ringtone.volume = .64;
        ringtone.currentTime = 0;
        const playback = ringtone.play();
        if (playback && typeof playback.catch === 'function') {
          playback.catch(() => {});
        }
      } catch {}
      noAnswerTimer = setTimeout(() => {
        stopRingback();
        status.textContent = 'Aucune réponse. Vous pouvez laisser un message vocal.';
        setNetwork('Sans réponse');
        post('unanswered', {
          callId: cfg.callId,
          conversationId: cfg.conversationId,
          reason: cfg.reason
        });
      }, 30000);
    };
    const fail = (message) => {
      stopRingback();
      errorBox.style.display = 'block';
      errorBox.textContent = message;
      status.textContent = 'Appel indisponible';
      setNetwork('Erreur', 'error');
      post('error', { message });
    };
    const stopTracks = () => {
      stopRingback();
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
        stopRingback();
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
          stopRingback();
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
        stopRingback();
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:signal', {
          callId: cfg.callId,
          signal: { type: 'answer', sdp: answer.sdp }
        });
      } else if (signal.type === 'answer') {
        stopRingback();
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
        ? 'Mode démonstration — attente du correspondant.'
        : cfg.initiator
          ? 'Sonnerie en cours — attente du correspondant…'
          : 'Connexion à l’appel…';
      if (cfg.initiator) startRingback();
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
          mode: cfg.mode,
          reason: cfg.reason
        });
      });
      socket.on('connect_error', () => setNetwork('Reconnexion…'));
      socket.on('call:accepted', () => {
        stopRingback();
        status.textContent = 'Connexion au correspondant…';
      });
      socket.on('call:participant-joined', async () => {
        stopRingback();
        status.textContent = 'Connexion au correspondant…';
        if (cfg.initiator) await createOffer();
      });
      socket.on('call:signal', (message) => void handleSignal(message).catch(error => fail(error.message)));
      socket.on('call:ended', () => endCall(false));
      socket.on('call:participant-left', () => {
        stopRingback();
        status.textContent = 'Le correspondant a quitté l’appel.';
        setNetwork('Terminé');
      });
    }

    muteButton.addEventListener('click', () => {
      muted = !muted;
      if (stream) stream.getAudioTracks().forEach(track => { track.enabled = !muted; });
      muteButton.classList.toggle('active', muted);
      muteButton.innerHTML = muted ? cfg.icons.micOff : cfg.icons.mic;
      muteButton.setAttribute('aria-label', muted ? 'Réactiver le microphone' : 'Couper le microphone');
    });
    cameraButton.addEventListener('click', () => {
      cameraOff = !cameraOff;
      if (stream) stream.getVideoTracks().forEach(track => { track.enabled = !cameraOff; });
      cameraButton.classList.toggle('active', cameraOff);
      cameraButton.innerHTML = cameraOff ? cfg.icons.cameraOff : cfg.icons.camera;
      cameraButton.setAttribute('aria-label', cameraOff ? 'Réactiver la caméra' : 'Couper la caméra');
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
        if (oldTrack) stream.removeTrack(oldTrack);
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
  mode: CallMode,
  reason = "Appel Neptune",
  initiator = true
): IntegratedCallSession {
  return {
    id: `mock-call-${conversationId}`,
    conversationId,
    mode,
    reason,
    socketUrl: "https://localhost",
    socketPath: "/socket.io",
    token: "mock-call-token",
    initiator,
    iceServers: [],
    mock: true
  };
}
