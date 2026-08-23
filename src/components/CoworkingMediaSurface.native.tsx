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
  spatialAudio = false,
  participantLayout,
  onConnected,
  onError,
  onLocalMediaUnavailable
}: CoworkingMediaSurfaceProps) {
  const theme = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const latestMediaRef = useRef({ cameraOn, microphoneOn });
  const latestLayoutRef = useRef(participantLayout);
  latestMediaRef.current = { cameraOn, microphoneOn };
  latestLayoutRef.current = participantLayout;
  const html = useMemo(
    () =>
      buildCoworkingMediaHtml(session, displayName, {
        cameraOn,
        microphoneOn,
        mapMode,
        spatialAudio,
        participantLayout
      }),
    [cameraOn, displayName, mapMode, microphoneOn, participantLayout, session, spatialAudio]
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

  useEffect(() => {
    if (!participantLayout) return;
    webViewRef.current?.injectJavaScript(
      `window.__connexioCoworkingControl?.(${JSON.stringify({
        type: "layout",
        participantLayout
      })});true;`
    );
  }, [participantLayout]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        message?: string;
      };
      if (payload.type === "connected" || payload.type === "media-ready") {
        onConnected?.();
      }
      if (payload.type === "local-media-unavailable") {
        onLocalMediaUnavailable?.(payload.message ?? "Caméra ou microphone indisponible.");
      }
      if (payload.type === "error") {
        onError?.(payload.message ?? "Connexion média impossible.");
      }
    } catch {
      // Ignore malformed bridge messages without interrupting the room.
    }
  };

  if ((mapMode || spatialAudio) && session.mock) return null;

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: mapMode || spatialAudio ? "transparent" : theme.pageBackground }
      ]}
    >
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: new URL(session.socketUrl).origin }}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowFileAccess
        allowsInlineMediaPlayback
        originWhitelist={["https://*", "http://localhost*"]}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(
            `window.__connexioCoworkingControl?.(${JSON.stringify({ type: "media", ...latestMediaRef.current })});true;`
          );
          if (latestLayoutRef.current) {
            webViewRef.current?.injectJavaScript(
              `window.__connexioCoworkingControl?.(${JSON.stringify({ type: "layout", participantLayout: latestLayoutRef.current })});true;`
            );
          }
        }}
        onMessage={handleMessage}
        style={[
          styles.webView,
          { backgroundColor: mapMode || spatialAudio ? "transparent" : theme.pageBackground }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  webView: { flex: 1 }
});
