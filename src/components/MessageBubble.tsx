import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type ComponentProps, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { env } from "../config/env";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { ContentEditApi } from "../services/api/contentEditApi";
import { AppAlert } from "../services/ui/AppAlert";
import { applyMessageEdit, rememberMessageEdit, useContentEditRevision } from "../state/contentEdits";
import { colors, gradients } from "../theme";
import { MessageBubble as TranslatedMessageBubble } from "./TranslatedMessageBubble";

type Props = ComponentProps<typeof TranslatedMessageBubble>;

export function MessageBubble(props: Props) {
  const theme = useAppTheme();
  const { accessToken } = useSession();
  useContentEditRevision();
  const message = applyMessageEdit(props.message);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [saving, setSaving] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const api = useMemo(() => new ContentEditApi(accessToken), [accessToken]);
  const editable = message.isMine && !message.deletedAt && Boolean(message.body.trim());

  const clearTimer = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    startPoint.current = null;
  };
  const beginLongPress = (event: { nativeEvent: { pageX: number; pageY: number } }) => {
    if (!editable) return;
    clearTimer();
    startPoint.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    longPressTimer.current = setTimeout(() => {
      setDraft(message.body);
      setEditorOpen(true);
      clearTimer();
    }, 520);
  };
  const moveLongPress = (event: { nativeEvent: { pageX: number; pageY: number } }) => {
    if (!startPoint.current) return;
    const dx = Math.abs(event.nativeEvent.pageX - startPoint.current.x);
    const dy = Math.abs(event.nativeEvent.pageY - startPoint.current.y);
    if (dx > 12 || dy > 12) clearTimer();
  };
  const save = async () => {
    const clean = draft.trim();
    if (!clean || clean === message.body.trim() || saving) {
      if (clean === message.body.trim()) setEditorOpen(false);
      return;
    }
    setSaving(true);
    try {
      if (!env.mockMode && env.backendContract === "connexio-v1" && !message.id.startsWith("local-") && !message.id.startsWith("mock-")) {
        await api.editMessage(message.id, clean);
      }
      rememberMessageEdit(message.id, clean);
      setEditorOpen(false);
    } catch (error) {
      AppAlert.alert("Modification impossible", error instanceof Error ? error.message : "Le message n’a pas pu être modifié.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View onTouchStart={beginLongPress} onTouchMove={moveLongPress} onTouchEnd={clearTimer} onTouchCancel={clearTimer}>
      <TranslatedMessageBubble {...props} message={message} />
      <Modal transparent animationType="fade" visible={editorOpen} onRequestClose={() => setEditorOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={() => setEditorOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => undefined}>
            <View style={styles.header}>
              <View style={[styles.icon, { backgroundColor: theme.violetSoft }]}><Ionicons name="create-outline" size={20} color={theme.violet} /></View>
              <View style={styles.headerCopy}><Text style={[styles.title, { color: theme.pageText }]}>Modifier le message</Text><Text style={[styles.subtitle, { color: theme.pageTextMuted }]}>Le libellé « modifié » sera affiché discrètement.</Text></View>
              <Pressable accessibilityLabel="Fermer" onPress={() => setEditorOpen(false)} style={styles.close}><Ionicons name="close" size={21} color={theme.pageTextMuted} /></Pressable>
            </View>
            <TextInput autoFocus multiline value={draft} onChangeText={setDraft} maxLength={4_000} placeholder="Modifier votre message…" placeholderTextColor={theme.pageTextMuted} style={[styles.input, { color: theme.pageText, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong }]} />
            <Pressable accessibilityRole="button" accessibilityLabel="Enregistrer la modification" disabled={saving || !draft.trim()} onPress={() => void save()} style={[styles.saveTarget, (saving || !draft.trim()) && styles.disabled]}>
              <LinearGradient colors={gradients.primary} style={styles.save}><Ionicons name="checkmark" size={19} color={colors.white} /><Text style={styles.saveText}>{saving ? "Enregistrement…" : "Enregistrer"}</Text></LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", padding: 10 },
  sheet: { width: "100%", maxWidth: 560, alignSelf: "center", borderRadius: 24, borderWidth: 1, padding: 14, gap: 12 },
  header: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "900" },
  subtitle: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 120, maxHeight: 240, borderWidth: 1, borderRadius: 18, padding: 13, fontSize: 16, lineHeight: 22, textAlignVertical: "top" },
  saveTarget: { minHeight: 50, borderRadius: 16, overflow: "hidden" },
  save: { flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.45 }
});
