import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { useAppTheme } from "../providers/ThemeProvider";
import { buildCoworkingGeographicMapHtml } from "../services/coworking/geographicMapHtml";
import type { CoworkingGeographicMapProps } from "./CoworkingGeographicMap.types";

export default function CoworkingGeographicMap({
  markers,
  mediaSession,
  selectedMarkerId,
  onSelectMarker,
  onLocationUnavailable
}: CoworkingGeographicMapProps) {
  const theme = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);
  const html = useMemo(
    () =>
      buildCoworkingGeographicMapHtml({
        markers,
        mediaSession,
        bridge: "native",
        theme: {
          pageBackground: theme.pageBackground,
          surface: theme.surface,
          surfaceStrong: theme.surfaceStrong,
          pageText: theme.pageText,
          pageTextMuted: theme.pageTextMuted,
          border: theme.border,
          shellBackground: theme.shellBackground,
          isLight: theme.isLight
        }
      }),
    [markers, mediaSession, theme.border, theme.isLight, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.surface, theme.surfaceStrong]
  );

  useEffect(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "selection", id: selectedMarkerId ?? null }));
  }, [selectedMarkerId]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
      if (payload.type === "marker-selected" && payload.id) onSelectMarker(payload.id);
    } catch {}
  };

  const locate = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        onLocationUnavailable?.();
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: "locate",
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        })
      );
    } catch {
      onLocationUnavailable?.();
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.pageBackground }]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        onMessage={handleMessage}
        onLoadEnd={() => webViewRef.current?.postMessage(JSON.stringify({ type: "selection", id: selectedMarkerId ?? null }))}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        originWhitelist={["*"]}
        mixedContentMode="never"
        style={[styles.webView, { backgroundColor: theme.pageBackground }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Me localiser"
        onPress={() => void locate()}
        style={({ pressed }) => [
          styles.locate,
          { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft },
          pressed && styles.pressed
        ]}
      >
        {locating ? (
          <ActivityIndicator size="small" color={theme.pageText} />
        ) : (
          <Ionicons name="locate" size={20} color={theme.pageText} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 420, position: "relative", overflow: "hidden" },
  webView: { flex: 1 },
  locate: {
    position: "absolute",
    right: 12,
    top: 82,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] }
});
