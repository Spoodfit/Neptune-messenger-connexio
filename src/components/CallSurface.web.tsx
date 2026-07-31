import { createElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
      {createElement("iframe", {
        title: mode === "audio" ? "Appel audio Connexio" : "Appel vidéo Connexio",
        src: url,
        allow:
          "camera; microphone; fullscreen; display-capture; autoplay; clipboard-write",
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
          background: "#020713"
        }
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitter l’appel"
        onPress={onClose}
        style={styles.closeButton}
      >
        <Text style={styles.closeText}>Quitter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, position: "relative" },
  closeButton: {
    position: "absolute",
    top: 18,
    right: 18,
    minWidth: 82,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(175,35,57,0.94)",
    alignItems: "center",
    justifyContent: "center"
  },
  closeText: { color: colors.white, fontWeight: "900" }
});
