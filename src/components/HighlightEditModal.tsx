import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import { colors, gradients } from "../theme";
import type { HighlightKind, HighlightPost } from "../types/experience";
import { HighlightKindSelector } from "./HighlightKindSelector";

interface Props {
  post: HighlightPost | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (body: string, kind: HighlightKind) => void | Promise<void>;
}

export function HighlightEditModal({ post, saving = false, onClose, onSave }: Props) {
  const theme = useAppTheme();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<HighlightKind>("standard");

  useEffect(() => {
    if (!post) return;
    setBody(post.body);
    setKind(post.kind);
  }, [post]);

  return (
    <Modal transparent animationType="fade" visible={Boolean(post)} onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => undefined}>
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: theme.violetSoft }]}><Ionicons name="create-outline" size={21} color={theme.violet} /></View>
            <View style={styles.copy}><Text style={[styles.title, { color: theme.pageText }]}>Modifier la publication</Text><Text style={[styles.subtitle, { color: theme.pageTextMuted }]}>Le contenu restera marqué « modifié » après l’enregistrement.</Text></View>
            <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.close}><Ionicons name="close" size={21} color={theme.pageTextMuted} /></Pressable>
          </View>
          <TextInput autoFocus multiline value={body} onChangeText={setBody} maxLength={2_000} placeholder="Modifier votre publication…" placeholderTextColor={theme.pageTextMuted} style={[styles.input, { color: theme.pageText, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong }]} />
          <HighlightKindSelector inferredKind={kind} manualKind={kind} onChange={(value) => value && setKind(value)} compact />
          <Pressable accessibilityRole="button" accessibilityLabel="Enregistrer la publication modifiée" disabled={saving || !body.trim()} onPress={() => void onSave(body.trim(), kind)} style={[styles.saveTarget, (saving || !body.trim()) && styles.disabled]}>
            <LinearGradient colors={gradients.primary} style={styles.save}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Ionicons name="checkmark" size={19} color={colors.white} />}
              <Text style={styles.saveText}>{saving ? "Enregistrement…" : "Enregistrer"}</Text>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", padding: 10 },
  sheet: { width: "100%", maxWidth: 600, alignSelf: "center", borderRadius: 24, borderWidth: 1, padding: 14, gap: 11 },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "900" },
  subtitle: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 140, maxHeight: 280, borderWidth: 1, borderRadius: 18, padding: 13, fontSize: 16, lineHeight: 22, textAlignVertical: "top" },
  saveTarget: { minHeight: 50, borderRadius: 16, overflow: "hidden" },
  save: { flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.45 }
});
