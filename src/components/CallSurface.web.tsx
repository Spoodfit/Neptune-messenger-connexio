import { createElement, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { buildIntegratedCallHtml } from "../services/calls/callRoom";
import { colors } from "../theme";
import type { CallSurfaceProps } from "./CallSurface.types";

export default function CallSurface({
  session,
  displayName,
  onClose,
  onUnanswered
}: CallSurfaceProps) {
  const html = useMemo(
    () => buildIntegratedCallHtml(session, displayName),
    [displayName, session]
  );

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!event.data) return;
      try {
        const payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (payload?.type === "ended") onClose();
        if (
          payload?.type === "unanswered" &&
          typeof payload.callId === "string" &&
          typeof payload.conversationId === "string"
        ) {
          onUnanswered?.({
            callId: payload.callId,
            conversationId: payload.conversationId,
            reason:
              typeof payload.reason === "string" ? payload.reason : undefined
          });
        }
      } catch {
        // Les messages externes qui ne concernent pas l’appel sont ignorés.
      }
    };
    globalThis.addEventListener?.("message", listener as EventListener);
    return () =>
      globalThis.removeEventListener?.("message", listener as EventListener);
  }, [onClose, onUnanswered]);

  return (
    <View style={styles.screen}>
      {createElement("iframe", {
        title:
          session.mode === "audio"
            ? "Appel audio Connexio"
            : "Appel vidéo Connexio",
        srcDoc: html,
        allow:
          "camera; microphone; fullscreen; autoplay; speaker-selection; display-capture",
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
          background: colors.background
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, position: "relative" }
});
