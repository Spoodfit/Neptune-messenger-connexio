import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { useAppTheme } from "../providers/ThemeProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
import { allowsWebViewNavigation, mediaWebViewOrigins } from "../domain/webViewSecurity";
import { buildCoworkingMediaHtml } from "../services/coworking/coworkingMedia";
import type { CoworkingMediaSurfaceProps } from "./CoworkingMediaSurface.types";

export default function CoworkingMediaSurface({
  session,
  displayName,
  cameraOn,
  microphoneOn,
  screenSharing = false,
  mapMode = false,
  spatialAudio = false,
  gridLayout = false,
  participantLayout,
  roomViewMode,
  focusParticipantId,
  onConnected,
  onLocalMediaReady,
  onScreenShareStateChange,
  onCapabilities,
  onAudioLevel,
  onError,
  onLocalMediaUnavailable
}: CoworkingMediaSurfaceProps) {
  const theme = useAppTheme();
  const { uiLanguage } = useAppLanguage();
  const webViewRef = useRef<WebView>(null);
  const latestMediaRef = useRef({ cameraOn, microphoneOn, screenSharing });
  const latestLayoutRef = useRef(participantLayout);
  const latestRoomViewRef = useRef({ roomViewMode, focusParticipantId });
  latestMediaRef.current = { cameraOn, microphoneOn, screenSharing };
  latestLayoutRef.current = participantLayout;
  latestRoomViewRef.current = { roomViewMode, focusParticipantId };
  const html = useMemo(
    () =>
      buildCoworkingMediaHtml(session, displayName, {
        cameraOn,
        microphoneOn,
        screenSharing,
        mapMode,
        spatialAudio,
        gridLayout,
        participantLayout,
        roomViewMode,
        focusParticipantId
      }, uiLanguage),
    // Les états média, la disposition et le mode de vue sont ensuite injectés
    // dans la WebView. Les ajouter aux dépendances reconnecterait le SFU à
    // chaque bascule de caméra ou de mosaïque.
    [displayName, gridLayout, mapMode, session, spatialAudio, uiLanguage]
  );
  const allowedOrigins = useMemo(() => mediaWebViewOrigins(session.socketUrl, session.clientScriptUrl), [session.clientScriptUrl, session.socketUrl]);

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
    webViewRef.current?.injectJavaScript(
      `window.__connexioCoworkingControl?.(${JSON.stringify({
        type: "screen-share",
        active: screenSharing
      })});true;`
    );
  }, [screenSharing]);

  useEffect(() => {
    if (!participantLayout) return;
    webViewRef.current?.injectJavaScript(
      `window.__connexioCoworkingControl?.(${JSON.stringify({
        type: "layout",
        participantLayout
      })});true;`
    );
  }, [participantLayout]);

  useEffect(() => {
    if (!roomViewMode) return;
    webViewRef.current?.injectJavaScript(
      `window.__connexioCoworkingControl?.(${JSON.stringify({
        type: "room-view",
        roomViewMode,
        focusParticipantId
      })});true;`
    );
  }, [focusParticipantId, roomViewMode]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (!allowsWebViewNavigation(event.nativeEvent.url, allowedOrigins)) return;
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        message?: string;
        active?: boolean;
        screenShare?: boolean;
        participantId?: string;
        level?: number;
      };
      if (payload.type === "connected" || payload.type === "media-ready") {
        onConnected?.();
      }
      if (payload.type === "local-media-ready") {
        onLocalMediaReady?.();
      }
      if (payload.type === "screen-share-state") {
        onScreenShareStateChange?.(payload.active === true);
      }
      if (payload.type === "capabilities") {
        onCapabilities?.({ screenShare: payload.screenShare === true });
      }
      if (payload.type === "audio-level" && payload.participantId && typeof payload.level === "number") {
        onAudioLevel?.(payload.participantId, Math.max(0, Math.min(1, payload.level)));
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

  const transparent = mapMode || spatialAudio || gridLayout || Boolean(roomViewMode);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: transparent ? "transparent" : theme.pageBackground }
      ]}
    >
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: allowedOrigins[0] }}
        javaScriptEnabled
        domStorageEnabled={false}
        cacheEnabled={false}
        incognito
        mediaPlaybackRequiresUserAction={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        allowsInlineMediaPlayback
        mixedContentMode="never"
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        originWhitelist={["about:blank", ...allowedOrigins]}
        onShouldStartLoadWithRequest={(request) => allowsWebViewNavigation(request.url, allowedOrigins)}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(
            `window.__connexioCoworkingControl?.(${JSON.stringify({ type: "media", ...latestMediaRef.current })});true;`
          );
          if (latestLayoutRef.current) {
            webViewRef.current?.injectJavaScript(
              `window.__connexioCoworkingControl?.(${JSON.stringify({ type: "layout", participantLayout: latestLayoutRef.current })});true;`
            );
          }
          if (latestRoomViewRef.current.roomViewMode) {
            webViewRef.current?.injectJavaScript(
              `window.__connexioCoworkingControl?.(${JSON.stringify({
                type: "room-view",
                ...latestRoomViewRef.current
              })});true;`
            );
          }
        }}
        onMessage={handleMessage}
        style={[
          styles.webView,
          { backgroundColor: transparent ? "transparent" : theme.pageBackground }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  webView: { flex: 1 }
});
