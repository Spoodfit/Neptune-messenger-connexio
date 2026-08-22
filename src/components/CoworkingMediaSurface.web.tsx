import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Text } from "./LocalizedText";
import { useAppTheme } from "../providers/ThemeProvider";
import type { CoworkingMediaSurfaceProps } from "./CoworkingMediaSurface.types";

export default function CoworkingMediaSurfaceWeb({ onError }: CoworkingMediaSurfaceProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.stage, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
      <Ionicons name="phone-portrait-outline" size={34} color={theme.violet} />
      <Text style={[styles.title, { color: theme.pageText }]}>Visio Coworking mobile</Text>
      <Text style={[styles.text, { color: theme.pageTextMuted }]}>La prévisualisation web conserve l’espace et la présence. Le flux caméra sécurisé s’ouvre dans l’application mobile.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, minHeight: 220, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 7 },
  title: { fontSize: 15, fontWeight: "900" },
  text: { maxWidth: 360, fontSize: 11, lineHeight: 16, textAlign: "center" }
});
