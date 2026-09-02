import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { useAppTheme } from "../providers/ThemeProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
import { allowsWebViewNavigation } from "../domain/webViewSecurity";
import { buildCoworkingGeographicMapHtml } from "../services/coworking/geographicMapHtml";
import { MAP_DOCUMENT_ORIGIN } from "../services/maps/leafletAssets";
import type { CoworkingGeographicMapProps } from "./CoworkingGeographicMap.types";

export default function CoworkingGeographicMap({
  markers,
  events = [],
  mediaSession,
  focusLocation,
  controlsTop = 136,
  selectedMarkerId,
  selectedEventId,
  onSelectMarker,
  onSelectEvent,
  onSelectCluster,
  onInteraction,
  onLocationUnavailable
}: CoworkingGeographicMapProps) {
  const theme = useAppTheme();
  const { uiLanguage, t } = useAppLanguage();
  const webViewRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);
  const html = useMemo(
    () =>
      buildCoworkingGeographicMapHtml({
        markers,
        events,
        mediaSession,
        focusLocation,
        bridge: "native",
        language: uiLanguage,
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
    [events, focusLocation, markers, mediaSession, theme.border, theme.isLight, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.surface, theme.surfaceStrong, uiLanguage]
  );
  const accessibilityTargets = useMemo(() => [
    ...markers.map((marker, index) => ({
      name: `marker-${index}`,
      label: `${t("Sélectionner")} ${marker.members.map((member) => member.name).join(", ")} · ${t(marker.availability === "available" ? "Disponible" : marker.availability === "busy" ? "Occupé" : "Hors ligne")}`,
      id: marker.id,
      kind: "marker" as const
    })),
    ...events.map((event, index) => ({
      name: `event-${index}`,
      label: t(`Sélectionner l’évènement ${event.title}`),
      id: event.id,
      kind: "event" as const
    }))
  ], [events, markers, t]);

  const postSelection = () => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "selection",
        markerId: selectedMarkerId ?? null,
        eventId: selectedEventId ?? null
      })
    );
  };

  useEffect(() => {
    postSelection();
  }, [selectedEventId, selectedMarkerId]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (!allowsWebViewNavigation(event.nativeEvent.url, [MAP_DOCUMENT_ORIGIN])) return;
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        id?: string;
        markerIds?: unknown;
        eventIds?: unknown;
      };
      if (payload.type === "map-interaction") onInteraction?.();
      if (payload.type === "marker-selected" && payload.id) onSelectMarker(payload.id);
      if (payload.type === "event-selected" && payload.id) onSelectEvent?.(payload.id);
      if (payload.type === "cluster-selected") {
        const markerIds = Array.isArray(payload.markerIds)
          ? payload.markerIds.filter((id): id is string => typeof id === "string")
          : [];
        const eventIds = Array.isArray(payload.eventIds)
          ? payload.eventIds.filter((id): id is string => typeof id === "string")
          : [];
        if (markerIds.length || eventIds.length) onSelectCluster?.({ markerIds, eventIds });
      }
    } catch {}
  };

  const showCommunity = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "fit-all" }));
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
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t(`Carte du Coworking, ${markers.length} groupes ou personnes et ${events.length} évènements`)}
        accessibilityHint={t("Ouvrez les actions d’accessibilité pour sélectionner une personne, un groupe ou un évènement.")}
        accessibilityActions={accessibilityTargets.map(({ name, label }) => ({ name, label }))}
        onAccessibilityAction={(event) => {
          const target = accessibilityTargets.find((item) => item.name === event.nativeEvent.actionName);
          if (!target) return;
          if (target.kind === "marker") onSelectMarker(target.id);
          else onSelectEvent?.(target.id);
        }}
        style={styles.mapFrame}
      >
        <WebView
          ref={webViewRef}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          source={{ html, baseUrl: MAP_DOCUMENT_ORIGIN }}
          onMessage={handleMessage}
          onLoadEnd={postSelection}
          javaScriptEnabled
          domStorageEnabled={false}
          cacheEnabled={false}
          incognito
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows={false}
          originWhitelist={["about:blank", MAP_DOCUMENT_ORIGIN]}
          onShouldStartLoadWithRequest={(request) => allowsWebViewNavigation(request.url, [MAP_DOCUMENT_ORIGIN])}
          mixedContentMode="never"
          style={[styles.webView, { backgroundColor: theme.pageBackground }]}
        />
      </View>
      <View style={[styles.controls, { top: controlsTop }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Voir toute la communauté")}
          accessibilityHint={t("Affiche tous les membres et évènements visibles")}
          onPress={showCommunity}
          style={({ pressed }) => [
            styles.control,
            { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft },
            pressed && styles.pressed
          ]}
        >
          <Ionicons name="globe-outline" size={20} color={theme.pageText} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Me localiser")}
          onPress={() => void locate()}
          style={({ pressed }) => [
            styles.control,
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 420, position: "relative", overflow: "hidden" },
  mapFrame: { flex: 1, minHeight: 0 },
  webView: { flex: 1 },
  controls: {
    position: "absolute",
    right: 12,
    gap: 8
  },
  control: {
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
