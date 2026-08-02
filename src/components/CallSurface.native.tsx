import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { buildIntegratedCallHtml } from "../services/calls/callRoom";
import { colors } from "../theme";
import type { CallSurfaceProps } from "./CallSurface.types";

export default function CallSurface({
  session,
  displayName,
  onClose
}: CallSurfaceProps) {
  const html = useMemo(
    () => buildIntegratedCallHtml(session, displayName),
    [displayName, session]
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (payload.type === "ended") onClose();
    } catch {
      // Les messages invalides sont ignorés sans interrompre l’appel.
    }
  };

  return (
    <View style={styles.screen}>
      <WebView
        source={{ html, baseUrl: new URL(session.socketUrl).origin }}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
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
