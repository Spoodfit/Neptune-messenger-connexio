import { useAudioPlayer } from "expo-audio";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { buildIntegratedCallHtml } from "../services/calls/callRoom";
import { buildLiveCaptionBootstrapScript } from "../services/calls/liveCaptions";
import { colors } from "../theme";
import type { CallSurfaceProps } from "./CallSurface.types";

const NATIVE_CALL_BRIDGE = `
(() => {
  const send = (type) => {
    try { window.ReactNativeWebView?.postMessage(JSON.stringify({ type })); } catch {}
  };
  const wire = () => {
    const end = document.getElementById('end');
    if (end && !end.dataset.nativeBridge) {
      end.dataset.nativeBridge = '1';
      end.addEventListener('click', () => send('native-end'), { capture: true });
    }
    const networkText = document.getElementById('networkText');
    if (networkText && !networkText.dataset.nativeBridge) {
      networkText.dataset.nativeBridge = '1';
      let connected = false;
      const check = () => {
        if (!connected && /connecté/i.test(networkText.textContent || '')) {
          connected = true;
          send('connected');
        }
      };
      new MutationObserver(check).observe(networkText, { childList: true, subtree: true, characterData: true });
      check();
    }
  };
  document.addEventListener('DOMContentLoaded', wire, { once: true });
  setTimeout(wire, 120);
})();
true;
`;

export default function CallSurface({ session, displayName, onClose, onUnanswered }: CallSurfaceProps) {
  const html = useMemo(() => buildIntegratedCallHtml(session, displayName), [displayName, session]);
  const captionBootstrap = useMemo(() => buildLiveCaptionBootstrapScript(session, displayName), [displayName, session]);
  const injectedBootstrap = useMemo(() => `${captionBootstrap}\n${NATIVE_CALL_BRIDGE}`, [captionBootstrap]);
  const ringbackPlayer = useAudioPlayer(require("../../assets/audio/connexio-ringtone.mp3"));
  const [connected, setConnected] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    setConnected(false);
    closingRef.current = false;
  }, [session.id]);

  useEffect(() => {
    const shouldRing = session.initiator && !connected && !closingRef.current;
    ringbackPlayer.loop = true;
    ringbackPlayer.volume = 0.55;
    if (shouldRing) ringbackPlayer.play();
    else {
      ringbackPlayer.pause();
      void ringbackPlayer.seekTo(0);
    }
    return () => {
      ringbackPlayer.pause();
      void ringbackPlayer.seekTo(0);
    };
  }, [connected, ringbackPlayer, session.initiator]);

  const finish = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    ringbackPlayer.pause();
    void ringbackPlayer.seekTo(0);
    onClose();
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; callId?: string; conversationId?: string; reason?: string };
      if (payload.type === "connected") {
        setConnected(true);
        return;
      }
      if (payload.type === "ended" || payload.type === "native-end") {
        finish();
        return;
      }
      if (payload.type === "unanswered" && payload.callId && payload.conversationId) {
        ringbackPlayer.pause();
        void ringbackPlayer.seekTo(0);
        onUnanswered?.({ callId: payload.callId, conversationId: payload.conversationId, reason: payload.reason });
      }
    } catch {
      // Les messages invalides sont ignorés sans interrompre l’appel.
    }
  };

  return (
    <View style={styles.screen}>
      <WebView
        source={{ html, baseUrl: new URL(session.socketUrl).origin }}
        injectedJavaScriptBeforeContentLoaded={injectedBootstrap}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowFileAccess
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        originWhitelist={["https://*", "http://localhost*"]}
        onMessage={handleMessage}
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  webView: { flex: 1, backgroundColor: colors.background }
});