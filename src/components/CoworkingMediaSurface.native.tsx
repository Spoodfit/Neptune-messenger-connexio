import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { useAppTheme } from "../providers/ThemeProvider";
import { buildCoworkingMediaHtml } from "../services/coworking/coworkingMedia";
import type { CoworkingMediaSurfaceProps } from "./CoworkingMediaSurface.types";

export default function CoworkingMediaSurface({
  session,
  displayName,
  cameraOn,
  microphoneOn,
  mapMode = false,
  participantLayout,
  onConnected,
  onError
}: CoworkingMediaSurfaceProps) {
  const theme = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const html = useMemo(
    () =>
      buildCoworkingMediaHtml(session, displayName, {
        cameraOn,
        microphoneOn,
        mapMode,
        participantLayout
      }),
    [cameraOn, displayName, mapMode, microphoneOn, participantLayout, session]
  );

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `window.__connexioCoworkingControl?.(${JSON.stringify({
        type: "media",
        cameraOn,
        microphoneOn
      })});true;`
    );
  }, [cameraOn, microphoneOn]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        message?: string;
      };
      if (payload.type === "connected" || payload.type === "media-ready") {
        onConnected?.();
      }
      if (payload.type === "error") {
        onError?.(payload.message ?? "Connexion média impossible.");
      }
    } catch {
      // Ignore malformed bridge messages without interrupting the room.
    }
  };

  // The standalone/mock profile has presence data but no actual SFU client.
  // In Map mode, keep the avatar/status layer visible instead of mounting an
  // empty WebView that would report a fake media error or cover the Map.
  if (mapMode && session.mock) return null;

  return (
    <View style={[styles.screen, { backgroundColor: mapMode ? "transparent" : theme.pageBackground }]}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: new URL(session.socketUrl).origin }}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowFileAccess
        allowsInlineMediaPlayback
        originWhitelist={["https://*", "http://localhost*"]}
        onMessage={handleMessage}
        style={[styles.webView, { backgroundColor: mapMode ? "transparent" : theme.pageBackground }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  webView: { flex: 1 }
});
