import { Ionicons } from "@expo/vector-icons";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import { buildCoworkingGeographicMapHtml } from "../services/coworking/geographicMapHtml";
import type { CoworkingGeographicMapProps } from "./CoworkingGeographicMap.types";

export default function CoworkingGeographicMap({
  markers,
  events = [],
  mediaSession,
  selectedMarkerId,
  selectedEventId,
  onSelectMarker,
  onSelectEvent,
  onLocationUnavailable,
  onMediaUnavailable
}: CoworkingGeographicMapProps) {
  const theme = useAppTheme();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [locating, setLocating] = useState(false);
  const markersKey = JSON.stringify(markers);
  const eventsKey = JSON.stringify(events);
  const mediaKey = JSON.stringify(mediaSession ?? null);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.source !== "connexio-coworking-map") return;
      if (event.data?.type === "marker-selected" && typeof event.data.id === "string") onSelectMarker(event.data.id);
      if (event.data?.type === "event-selected" && typeof event.data.id === "string") onSelectEvent?.(event.data.id);
      if (event.data?.type === "media-unavailable") {
        onMediaUnavailable?.(
          typeof event.data.message === "string" ? event.data.message : "La caméra n’a pas pu être activée."
        );
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onMediaUnavailable, onSelectEvent, onSelectMarker]);

  const postSelection = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "selection", markerId: selectedMarkerId ?? null, eventId: selectedEventId ?? null },
      "*"
    );
  };

  useEffect(() => {
    postSelection();
  }, [selectedEventId, selectedMarkerId]);

  const locate = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      onLocationUnavailable?.();
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "locate",
            location: { latitude: position.coords.latitude, longitude: position.coords.longitude }
          },
          "*"
        );
        setLocating(false);
      },
      () => {
        setLocating(false);
        onLocationUnavailable?.();
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 }
    );
  };

  const html = useMemo(
    () =>
      buildCoworkingGeographicMapHtml({
        markers,
        events,
        mediaSession,
        bridge: "web",
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
    [eventsKey, markersKey, mediaKey, theme.border, theme.isLight, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.surface, theme.surfaceStrong]
  );

  return (
    <View style={[styles.wrap, { backgroundColor: theme.pageBackground }]}> 
      {createElement("iframe", {
        ref: (node: HTMLIFrameElement | null) => {
          iframeRef.current = node;
        },
        title: "Carte géographique du Coworking Connexio",
        srcDoc: html,
        onLoad: postSelection,
        style: {
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
          background: theme.pageBackground
        },
        allow: "camera; autoplay; geolocation"
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Me localiser"
        onPress={locate}
        style={({ pressed }) => [
          styles.locate,
          { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft },
          pressed && styles.pressed
        ]}
      >
        {locating ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="locate" size={20} color={theme.pageText} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 420, position: "relative", overflow: "hidden" },
  locate: { position: "absolute", right: 12, top: 82, width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center", elevation: 8 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] }
});
