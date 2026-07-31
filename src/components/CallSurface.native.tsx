import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { env } from "../config/env";
import { buildCallUrl } from "../services/calls/callRoom";
import { colors } from "../theme";
import type { CallSurfaceProps } from "./CallSurface.types";

export default function CallSurface({
  conversationId,
  mode,
  displayName,
  onClose
}: CallSurfaceProps) {
  const url = buildCallUrl(env.callBaseUrl, conversationId, mode, displayName);

  return (
    <View style={styles.screen}>
      <WebView
        source={{ uri: url }}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        originWhitelist={["https://*"]}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.violet} />
          </View>
        )}
        style={styles.webView}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitter l’appel"
        onPress={onClose}
        style={styles.closeButton}
      >
        <Ionicons name="close" size={24} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  webView: { flex: 1, backgroundColor: colors.background },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
  },
  closeButton: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(175,35,57,0.94)",
    alignItems: "center",
    justifyContent: "center"
  }
});
