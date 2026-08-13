import { getTranslationRequestLanguage } from "../../i18n/translationLocale";
import type { IntegratedCallSession } from "./callRoom";

export interface LiveCaptionSessionFields {
  captioningEnabled?: boolean;
  captionTargetLanguage?: string;
  captionsDefaultOn?: boolean;
  captionAudioChunkMs?: number;
  captionMaxAudioBase64Length?: number;
}

interface LiveCaptionConfig {
  callId: string;
  conversationId: string;
  mode: "audio" | "video";
  socketUrl: string;
  socketPath: string;
  token: string;
  displayName: string;
  targetLanguage: string;
  enabled: boolean;
  defaultOn: boolean;
  audioChunkMs: number;
  maxAudioBase64Length: number;
  mock: boolean;
}

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

export function getLiveCaptionSessionFields(
  session: IntegratedCallSession
): LiveCaptionSessionFields {
  return session as IntegratedCallSession & LiveCaptionSessionFields;
}

function buildConfig(
  session: IntegratedCallSession,
  displayName: string
): LiveCaptionConfig {
  const captionSession = getLiveCaptionSessionFields(session);
  return {
    callId: session.id,
    conversationId: session.conversationId,
    mode: session.mode,
    socketUrl: session.socketUrl,
    socketPath: session.socketPath,
    token: session.token,
    displayName,
    targetLanguage:
      typeof captionSession.captionTargetLanguage === "string" &&
      captionSession.captionTargetLanguage.trim()
        ? captionSession.captionTargetLanguage.trim().toLowerCase()
        : getTranslationRequestLanguage(),
    enabled:
      session.mode === "video" &&
      (captionSession.captioningEnabled === true || session.mock === true),
    defaultOn:
      session.mode === "video" &&
      (captionSession.captionsDefaultOn === true || session.mock === true),
    audioChunkMs: boundedInteger(
      captionSession.captionAudioChunkMs,
      1_200,
      800,
      3_000
    ),
    maxAudioBase64Length: boundedInteger(
      captionSession.captionMaxAudioBase64Length,
      524_288,
      64_000,
      1_000_000
    ),
    mock: session.mock === true
  };
}

function escapeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildLiveCaptionBootstrapScript(
  session: IntegratedCallSession,
  displayName: string
): string {
  const cfg = buildConfig(session, displayName);
  return `
(() => {
  if (window.__connexioCaptionsBootstrapped) return true;
  window.__connexioCaptionsBootstrapped = true;
  const cfg = ${escapeForInlineScript(cfg)};
  if (!cfg.enabled) return true;

  const originalGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    : null;
  if (originalGetUserMedia) {
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const media = await originalGetUserMedia(constraints);
      if (constraints && constraints.audio) {
        window.__connexioCaptionStream = media;
      }
      return media;
    };
  }

  let captionSocket = null;
  let recorder = null;
  let captionsOn = cfg.defaultOn;
  let sequence = 0;
  let destroyed = false;
  let lastCaptionTimer = null;

  const safeText = (value, fallback = '') =>
    typeof value === 'string' && value.trim() ? value.trim() : fallback;

  const baseLanguage = (value) => safeText(value).toLowerCase().replace('_', '-').split('-')[0] || '';

  const languageLabels = {
    fr: 'français', en: 'anglais', es: 'espagnol', de: 'allemand', it: 'italien',
    pt: 'portugais', nl: 'néerlandais', pl: 'polonais', ro: 'roumain', sv: 'suédois',
    da: 'danois', no: 'norvégien', tr: 'turc', ru: 'russe', ar: 'arabe', hi: 'hindi',
    zh: 'chinois', ja: 'japonais', ko: 'coréen'
  };

  const installUi = () => {
    const stage = document.getElementById('stage');
    const controls = document.getElementById('controls');
    const endButton = document.getElementById('end');
    if (!stage || !controls || document.getElementById('connexioCaptions')) return;

    const style = document.createElement('style');
    style.textContent = [
      '#connexioCaptions{position:absolute;left:50%;bottom:100px;transform:translateX(-50%);z-index:12;width:min(88vw,720px);display:none;pointer-events:none;text-align:center}',
      '#connexioCaptions.visible{display:block}',
      '#connexioCaptionCard{display:inline-block;max-width:100%;padding:10px 14px 11px;border-radius:17px;background:rgba(2,7,19,.86);border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 36px rgba(0,0,0,.32);backdrop-filter:blur(14px)}',
      '#connexioCaptionSpeaker{font-size:11px;line-height:14px;font-weight:900;color:#f4b183;margin-bottom:3px}',
      '#connexioCaptionText{font-size:16px;line-height:21px;font-weight:800;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.35)}',
      '#connexioCaptionMeta{margin-top:4px;font-size:10px;line-height:13px;font-weight:700;color:#aeb9d4}',
      '#connexioCaptionButton{font-size:15px;font-weight:950;letter-spacing:-.4px}',
      '#connexioCaptionButton.unavailable{opacity:.42;pointer-events:none}',
      '@media (max-width:420px){#connexioCaptionText{font-size:14px;line-height:19px}#connexioCaptions{bottom:94px;width:92vw}}'
    ].join('');
    document.head.appendChild(style);

    const captions = document.createElement('div');
    captions.id = 'connexioCaptions';
    captions.setAttribute('aria-live', 'polite');
    captions.innerHTML = '<div id="connexioCaptionCard"><div id="connexioCaptionSpeaker"></div><div id="connexioCaptionText"></div><div id="connexioCaptionMeta"></div></div>';
    stage.appendChild(captions);

    const button = document.createElement('button');
    button.id = 'connexioCaptionButton';
    button.type = 'button';
    button.textContent = 'CC';
    button.setAttribute('aria-label', captionsOn ? 'Désactiver les sous-titres traduits' : 'Activer les sous-titres traduits');
    button.setAttribute('aria-pressed', captionsOn ? 'true' : 'false');
    button.classList.toggle('active', captionsOn);
    button.addEventListener('click', () => setCaptionsEnabled(!captionsOn, true));
    controls.insertBefore(button, endButton || null);
  };

  const renderCaption = (payload) => {
    if (!captionsOn || !payload || safeText(payload.callId) !== cfg.callId) return;
    const text = safeText(payload.text || payload.translatedText || payload.translated_text);
    if (!text) return;
    const captions = document.getElementById('connexioCaptions');
    const speaker = document.getElementById('connexioCaptionSpeaker');
    const textNode = document.getElementById('connexioCaptionText');
    const meta = document.getElementById('connexioCaptionMeta');
    if (!captions || !speaker || !textNode || !meta) return;

    const speakerName = safeText(payload.speakerName || payload.speaker_name, 'Correspondant');
    const sourceLanguage = baseLanguage(payload.sourceLanguage || payload.source_language);
    const targetLanguage = baseLanguage(payload.targetLanguage || payload.target_language || cfg.targetLanguage);
    const translated = Boolean(sourceLanguage && targetLanguage && sourceLanguage !== targetLanguage);
    speaker.textContent = speakerName;
    textNode.textContent = text;
    meta.textContent = translated
      ? 'Traduit de ' + (languageLabels[sourceLanguage] || sourceLanguage.toUpperCase())
      : 'Sous-titre en direct';
    captions.classList.add('visible');
    if (lastCaptionTimer) clearTimeout(lastCaptionTimer);
    lastCaptionTimer = setTimeout(() => captions.classList.remove('visible'), payload.final === false ? 4500 : 6500);
  };

  const showCaptionStatus = (text, warning = false) => {
    if (!captionsOn) return;
    renderCaption({
      callId: cfg.callId,
      speakerName: warning ? 'Sous-titres' : 'Connexio',
      text,
      sourceLanguage: cfg.targetLanguage,
      targetLanguage: cfg.targetLanguage,
      final: true
    });
  };

  const chooseMimeType = () => {
    if (typeof MediaRecorder !== 'function') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/webm',
      'audio/mp4'
    ];
    return candidates.find((candidate) => {
      try { return MediaRecorder.isTypeSupported(candidate); } catch { return false; }
    }) || '';
  };

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture audio impossible'));
    reader.onloadend = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value);
    };
    reader.readAsDataURL(blob);
  });

  const stopRecorder = () => {
    if (!recorder) return;
    try {
      recorder.ondataavailable = null;
      if (recorder.state !== 'inactive') recorder.stop();
    } catch {}
    recorder = null;
  };

  const startRecorder = () => {
    if (!captionsOn || destroyed || cfg.mock || recorder || !captionSocket || !captionSocket.connected) return;
    const media = window.__connexioCaptionStream;
    const track = media && media.getAudioTracks ? media.getAudioTracks()[0] : null;
    if (!track || track.readyState !== 'live') return;
    if (typeof MediaRecorder !== 'function') {
      showCaptionStatus('Sous-titrage audio non pris en charge sur cet appareil.', true);
      return;
    }
    try {
      const audioStream = new MediaStream([track]);
      const mimeType = chooseMimeType();
      recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = async (event) => {
        if (!captionsOn || !captionSocket || !captionSocket.connected || !event.data || event.data.size === 0) return;
        try {
          const audioBase64 = await blobToBase64(event.data);
          if (!audioBase64 || audioBase64.length > cfg.maxAudioBase64Length) return;
          sequence += 1;
          captionSocket.emit('call:caption-audio', {
            callId: cfg.callId,
            conversationId: cfg.conversationId,
            sequence,
            mimeType: event.data.type || mimeType || 'audio/webm',
            audioBase64,
            targetLanguage: cfg.targetLanguage
          });
        } catch {}
      };
      recorder.start(cfg.audioChunkMs);
    } catch {
      recorder = null;
      showCaptionStatus('Impossible de démarrer les sous-titres sur cet appareil.', true);
    }
  };

  const syncPreference = () => {
    const button = document.getElementById('connexioCaptionButton');
    if (button) {
      button.classList.toggle('active', captionsOn);
      button.setAttribute('aria-pressed', captionsOn ? 'true' : 'false');
      button.setAttribute('aria-label', captionsOn ? 'Désactiver les sous-titres traduits' : 'Activer les sous-titres traduits');
    }
    if (captionSocket && captionSocket.connected) {
      captionSocket.emit('call:captions:preference', {
        callId: cfg.callId,
        enabled: captionsOn,
        targetLanguage: cfg.targetLanguage
      });
    }
  };

  function setCaptionsEnabled(enabled, userInitiated = false) {
    captionsOn = Boolean(enabled);
    syncPreference();
    if (captionsOn) {
      startRecorder();
      if (userInitiated) showCaptionStatus('Sous-titres traduits activés.');
    } else {
      stopRecorder();
      const captions = document.getElementById('connexioCaptions');
      if (captions) captions.classList.remove('visible');
    }
  }

  const connectCaptionSocket = () => {
    if (destroyed || cfg.mock || captionSocket || typeof window.io !== 'function') return;
    captionSocket = window.io(cfg.socketUrl, {
      path: cfg.socketPath,
      transports: ['websocket'],
      auth: { callToken: cfg.token, callId: cfg.callId, scope: 'captions' }
    });
    captionSocket.on('connect', () => {
      captionSocket.emit('call:captions:join', {
        callId: cfg.callId,
        conversationId: cfg.conversationId,
        displayName: cfg.displayName,
        targetLanguage: cfg.targetLanguage,
        enabled: captionsOn
      });
      if (captionsOn) startRecorder();
    });
    captionSocket.on('call:captions:ready', () => {
      if (captionsOn) startRecorder();
    });
    captionSocket.on('call:caption', renderCaption);
    captionSocket.on('call:captions:unavailable', () => {
      stopRecorder();
      const button = document.getElementById('connexioCaptionButton');
      if (button) button.classList.add('unavailable');
      showCaptionStatus('Sous-titres temporairement indisponibles.', true);
    });
    captionSocket.on('disconnect', () => stopRecorder());
  };

  const waitForCallRuntime = () => {
    if (destroyed) return;
    if (cfg.mock) {
      if (captionsOn) {
        setTimeout(() => renderCaption({
          callId: cfg.callId,
          speakerName: cfg.displayName || 'Correspondant',
          text: 'Bonjour, ravi de pouvoir échanger avec vous.',
          sourceLanguage: 'en',
          targetLanguage: cfg.targetLanguage,
          final: true
        }), 1700);
      }
      return;
    }
    if (typeof window.io === 'function') connectCaptionSocket();
    else setTimeout(waitForCallRuntime, 180);
  };

  const boot = () => {
    installUi();
    syncPreference();
    waitForCallRuntime();
    const streamPoll = setInterval(() => {
      if (destroyed) return clearInterval(streamPoll);
      if (captionsOn && window.__connexioCaptionStream) startRecorder();
    }, 500);
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    stopRecorder();
    if (lastCaptionTimer) clearTimeout(lastCaptionTimer);
    if (captionSocket) {
      try { captionSocket.disconnect(); } catch {}
      captionSocket = null;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('beforeunload', destroy, { once: true });
  return true;
})();
`;
}

export function injectLiveCaptionRuntime(
  html: string,
  session: IntegratedCallSession,
  displayName: string
): string {
  const script = buildLiveCaptionBootstrapScript(session, displayName);
  const tag = `<script>${script.replace(/<\/script/gi, "<\\/script")}</script>`;
  const headIndex = html.indexOf("</head>");
  if (headIndex >= 0) {
    return `${html.slice(0, headIndex)}${tag}${html.slice(headIndex)}`;
  }
  return `${tag}${html}`;
}
