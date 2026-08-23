import { createElement, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

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
  onSelectEvent
}: CoworkingGeographicMapProps) {
  const theme = useAppTheme();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.source !== "connexio-coworking-map") return;
      if (event.data?.type === "marker-selected" && typeof event.data.id === "string") onSelectMarker(event.data.id);
      if (event.data?.type === "event-selected" && typeof event.data.id === "string") onSelectEvent?.(event.data.id);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onSelectEvent, onSelectMarker]);

  const postSelection = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "selection", markerId: selectedMarkerId ?? null, eventId: selectedEventId ?? null },
      "*"
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
    [events, markers, mediaSession, theme.border, theme.isLight, theme.pageBackground, theme.pageText, theme.pageTextMuted, theme.shellBackground, theme.surface, theme.surfaceStrong]
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
        allow: "camera; autoplay"
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 420, overflow: "hidden" }
});
