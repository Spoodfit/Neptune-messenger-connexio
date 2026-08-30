import { Ionicons } from "@expo/vector-icons";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
import { buildCoworkingGeographicMapHtml } from "../services/coworking/geographicMapHtml";
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
  onLocationUnavailable
}: CoworkingGeographicMapProps) {
  const theme = useAppTheme();
  const { uiLanguage, t } = useAppLanguage();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [locating, setLocating] = useState(false);
  const onSelectMarkerRef = useRef(onSelectMarker);
  const onSelectEventRef = useRef(onSelectEvent);
  const onSelectClusterRef = useRef(onSelectCluster);

  useEffect(() => {
    onSelectMarkerRef.current = onSelectMarker;
    onSelectEventRef.current = onSelectEvent;
    onSelectClusterRef.current = onSelectCluster;
  }, [onSelectCluster, onSelectEvent, onSelectMarker]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== "connexio-coworking-map") return;
      if (event.data?.type === "marker-selected" && typeof event.data.id === "string") {
        onSelectMarkerRef.current(event.data.id);
      }
      if (event.data?.type === "event-selected" && typeof event.data.id === "string") {
        onSelectEventRef.current?.(event.data.id);
      }
      if (event.data?.type === "cluster-selected") {
        const markerIds = Array.isArray(event.data.markerIds)
          ? event.data.markerIds.filter((id: unknown): id is string => typeof id === "string")
          : [];
        const eventIds = Array.isArray(event.data.eventIds)
          ? event.data.eventIds.filter((id: unknown): id is string => typeof id === "string")
          : [];
        if (markerIds.length || eventIds.length) onSelectClusterRef.current?.({ markerIds, eventIds });
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const postSelection = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "selection", markerId: selectedMarkerId ?? null, eventId: selectedEventId ?? null },
      window.location.origin
    );
  };

  useEffect(() => {
    postSelection();
  }, [selectedEventId, selectedMarkerId]);

  const html = useMemo(
    () =>
      buildCoworkingGeographicMapHtml({
        markers,
        events,
        mediaSession,
        focusLocation,
        bridge: "web",
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

  const post = (payload: object) => {
    iframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
  };

  const locate = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      onLocationUnavailable?.();
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        post({
          type: "locate",
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        onLocationUnavailable?.();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.pageBackground }]}>
      {createElement("iframe", {
        ref: (node: HTMLIFrameElement | null) => {
          iframeRef.current = node;
        },
        title: "Carte géographique du Coworking Connexio",
        srcDoc: html,
        onLoad: postSelection,
        sandbox: "allow-scripts allow-same-origin",
        referrerPolicy: "no-referrer",
        style: {
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
          background: theme.pageBackground
        },
        allow: "camera; autoplay"
      })}
      <View style={[styles.controls, { top: controlsTop }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Voir toute la communauté")}
          accessibilityHint={t("Affiche tous les membres et évènements visibles")}
          onPress={() => post({ type: "fit-all" })}
          style={({ pressed }) => [styles.control, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }, pressed && styles.pressed]}
        >
          <Ionicons name="globe-outline" size={20} color={theme.pageText} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Me localiser")}
          onPress={locate}
          style={({ pressed }) => [styles.control, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }, pressed && styles.pressed]}
        >
          {locating ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="locate" size={20} color={theme.pageText} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 420, overflow: "hidden", position: "relative" },
  controls: { position: "absolute", right: 12, gap: 8 },
  control: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] }
});
