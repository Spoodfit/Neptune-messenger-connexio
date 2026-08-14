import * as Crypto from "expo-crypto";
import { useMemo } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { AppAlert } from "@/services/ui/AppAlert";

import { colors } from "../theme";
import type {
  RecordedVoicePayload,
  VoiceRecorderModalProps
} from "./VoiceRecorderModal.types";

function recorderHtml(maxDurationSeconds: number, maxSizeBytes: number): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<meta name="color-scheme" content="dark" />
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#020713;color:#f4f7ff;font-family:Inter,system-ui,-apple-system,sans-serif}body{display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.72)}
.sheet{width:100%;max-width:680px;padding:18px 18px max(24px,env(safe-area-inset-bottom));border-radius:28px 28px 0 0;border:1px solid rgba(255,255,255,.12);border-bottom:0;background:linear-gradient(155deg,#101a31,#071225 62%,#050a17);box-shadow:0 -22px 60px rgba(0,0,0,.45)}
.handle{width:42px;height:4px;margin:0 auto 15px;border-radius:4px;background:#687694}.head{display:flex;align-items:center;gap:12px}.icon{width:48px;height:48px;border-radius:17px;display:grid;place-items:center;background:rgba(244,177,131,.14);color:#f4b183}.icon svg,.record svg,.close svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.title{font-size:17px;font-weight:900}.subtitle{margin-top:3px;color:#aeb8d2;font-size:11px;line-height:16px}.close{margin-left:auto;width:44px;height:44px;border:0;border-radius:15px;background:#111d37;color:#aeb8d2;display:grid;place-items:center}
.visual{height:126px;margin-top:18px;border-radius:22px;border:1px solid rgba(255,255,255,.1);background:rgba(2,7,19,.42);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px}.timer{font-size:34px;font-weight:900;letter-spacing:1px}.status{color:#aeb8d2;font-size:11px;font-weight:800}.waves{height:30px;display:flex;align-items:center;gap:3px}.waves i{display:block;width:3px;border-radius:3px;background:linear-gradient(#f4b183,#6b4fea);animation:wave 1.15s ease-in-out infinite;animation-play-state:paused}.recording .waves i{animation-play-state:running}.waves i:nth-child(2n){animation-delay:.12s}.waves i:nth-child(3n){animation-delay:.24s}@keyframes wave{0%,100%{height:7px;opacity:.55}50%{height:27px;opacity:1}}
.actions{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:18px}.record{width:72px;height:72px;border:0;border-radius:25px;background:linear-gradient(135deg,#0048ba,#6b4fea,#f4b183);color:#fff;display:grid;place-items:center;box-shadow:0 15px 32px rgba(79,67,213,.38)}.record.recording{background:#c4334c}.hint{text-align:center;color:#7f8ba8;font-size:9px;line-height:14px;margin-top:14px}.error{display:none;margin-top:12px;padding:10px;border-radius:14px;background:rgba(196,51,76,.18);color:#ff98a6;font-size:11px;line-height:16px;text-align:center}
</style>
</head>
<body>
<section class="sheet">
  <div class="handle"></div>
  <div class="head">
    <div class="icon"><svg viewBox="0 0 24 24"><path d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V5a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z"/><path d="M5.5 10.5v.5a6.5 6.5 0 0 0 13 0v-.5M12 17.5V21M9 21h6"/></svg></div>
    <div><div class="title">Message vocal</div><div class="subtitle">Enregistrez, vérifiez la durée, puis envoyez-le dans la conversation.</div></div>
    <button class="close" aria-label="Fermer"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
  </div>
  <div class="visual">
    <div class="timer">0:00</div>
    <div class="waves">${Array.from({ length: 19 }, (_, index) => `<i style="height:${7 + (index % 5) * 4}px"></i>`).join("")}</div>
    <div class="status">Appuyez pour commencer</div>
  </div>
  <div class="actions"><button class="record" aria-label="Commencer l’enregistrement"><svg viewBox="0 0 24 24"><path d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V5a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z"/><path d="M5.5 10.5v.5a6.5 6.5 0 0 0 13 0v-.5M12 17.5V21M9 21h6"/></svg></button></div>
  <div class="error"></div>
  <div class="hint">Durée maximale : ${Math.round(maxDurationSeconds / 60)} min · Taille maximale : ${Math.round(maxSizeBytes / 1024 / 1024)} Mo · Une transcription pourra être générée après l’envoi.</div>
</section>
<script>
(() => {
  const MAX_DURATION=${maxDurationSeconds};
  const MAX_SIZE=${maxSizeBytes};
  const sheet=document.querySelector('.sheet');
  const timerNode=document.querySelector('.timer');
  const statusNode=document.querySelector('.status');
  const recordButton=document.querySelector('.record');
  const closeButton=document.querySelector('.close');
  const errorNode=document.querySelector('.error');
  let recorder=null,stream=null,chunks=[],startedAt=0,timer=null,totalSize=0,stopping=false;
  const post=(payload)=>window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  const setError=(message)=>{errorNode.style.display='block';errorNode.textContent=message;statusNode.textContent='Enregistrement indisponible';};
  const format=(seconds)=>Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  const cleanup=()=>{if(timer)clearInterval(timer);timer=null;if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;sheet.classList.remove('recording');recordButton.classList.remove('recording');};
  const chooseMime=()=>['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>window.MediaRecorder&&MediaRecorder.isTypeSupported(type))||'';
  const stop=()=>{if(!recorder||recorder.state==='inactive'||stopping)return;stopping=true;statusNode.textContent='Préparation du vocal…';recorder.stop();};
  const start=async()=>{
    errorNode.style.display='none';
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setError('Cet appareil ne prend pas en charge l’enregistrement vocal intégré.');return;}
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      const mimeType=chooseMime();
      recorder=new MediaRecorder(stream,mimeType?{mimeType,audioBitsPerSecond:64000}:{audioBitsPerSecond:64000});
      chunks=[];totalSize=0;stopping=false;startedAt=Date.now();
      recorder.ondataavailable=(event)=>{if(event.data&&event.data.size){chunks.push(event.data);totalSize+=event.data.size;if(totalSize>MAX_SIZE)stop();}};
      recorder.onerror=()=>{cleanup();setError('Le microphone a interrompu l’enregistrement.');};
      recorder.onstop=()=>{
        const duration=Math.max(1,Math.round((Date.now()-startedAt)/1000));
        const blob=new Blob(chunks,{type:recorder.mimeType||mimeType||'audio/webm'});
        cleanup();
        if(blob.size>MAX_SIZE){setError('Le vocal est trop volumineux. Enregistrez un message plus court.');return;}
        const reader=new FileReader();
        reader.onerror=()=>setError('Le vocal n’a pas pu être préparé.');
        reader.onload=()=>post({type:'recorded',payload:{dataUrl:String(reader.result),mimeType:blob.type||'audio/webm',sizeBytes:blob.size,durationSeconds:duration}});
        reader.readAsDataURL(blob);
      };
      recorder.start(500);sheet.classList.add('recording');recordButton.classList.add('recording');recordButton.setAttribute('aria-label','Terminer l’enregistrement');statusNode.textContent='Enregistrement en cours — appuyez pour terminer';
      timer=setInterval(()=>{const elapsed=Math.floor((Date.now()-startedAt)/1000);timerNode.textContent=format(elapsed);if(elapsed>=MAX_DURATION)stop();},250);
    }catch(error){cleanup();setError(error?.name==='NotAllowedError'?'Autorisez le microphone pour enregistrer un vocal.':'Le microphone est indisponible.');}
  };
  recordButton.addEventListener('click',()=>recorder&&recorder.state==='recording'?stop():start());
  closeButton.addEventListener('click',()=>{cleanup();post({type:'close'});});
  window.addEventListener('beforeunload',cleanup);
})();
</script>
</body></html>`;
}

export default function VoiceRecorderModal({
  visible,
  onClose,
  onRecorded,
  maxDurationSeconds = 300,
  maxSizeBytes = 12 * 1024 * 1024
}: VoiceRecorderModalProps) {
  const html = useMemo(
    () => recorderHtml(maxDurationSeconds, maxSizeBytes),
    [maxDurationSeconds, maxSizeBytes]
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        payload?: RecordedVoicePayload;
      };
      if (message.type === "close") {
        onClose();
        return;
      }
      if (message.type !== "recorded" || !message.payload) return;
      const extension = message.payload.mimeType.includes("mp4") ? "m4a" : "webm";
      onRecorded({
        id: `local-voice-${Crypto.randomUUID()}`,
        kind: "audio",
        name: `vocal-${Date.now()}.${extension}`,
        uri: message.payload.dataUrl,
        mimeType: message.payload.mimeType,
        sizeBytes: message.payload.sizeBytes,
        durationSeconds: message.payload.durationSeconds,
        status: "local",
        uploadProgress: 0,
        transcriptStatus: "pending"
      });
      onClose();
    } catch {
      AppAlert.alert(
        "Vocal indisponible",
        "Le message vocal n’a pas pu être récupéré depuis le microphone."
      );
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <WebView
          source={{ html, baseUrl: "https://localhost" }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={["https://localhost", "about:blank"]}
          onMessage={handleMessage}
          style={styles.webView}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)" },
  webView: { flex: 1, backgroundColor: colors.transparent }
});
