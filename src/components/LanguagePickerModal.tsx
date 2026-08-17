import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { InteractionManager, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { SUPPORTED_UI_LANGUAGES } from "../i18n/uiTranslations";
import { useAppLanguage } from "../providers/LanguageProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { spacing, typography } from "../theme";

interface LanguagePickerModalProps { visible: boolean; onClose: () => void; }

export function LanguagePickerModal({ visible, onClose }: LanguagePickerModalProps) {
  const theme = useAppTheme();
  const { mode, setLanguageMode } = useAppLanguage();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase();
    if (!clean) return SUPPORTED_UI_LANGUAGES;
    return SUPPORTED_UI_LANGUAGES.filter((item) => `${item.nativeName} ${item.frenchName} ${item.code}`.toLocaleLowerCase().includes(clean));
  }, [query]);

  const select = (next: "system" | (typeof SUPPORTED_UI_LANGUAGES)[number]["code"]) => {
    if (next === mode) {
      onClose();
      return;
    }
    // Android peut fermer brutalement l'activité si toute l'arborescence localisée
    // est remontée pendant l'animation native de fermeture du Modal. On ferme
    // d'abord le portail natif, puis on applique la nouvelle locale une fois les
    // interactions terminées.
    onClose();
    setQuery("");
    InteractionManager.runAfterInteractions(() => setLanguageMode(next));
  };

  return (
    <Modal transparent animationType="slide" visible={visible} statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: theme.pageTextMuted }]} />
          <View style={styles.heading}><View style={styles.headingCopy}><Text style={[styles.title, { color: theme.pageText }]}>Langue de Connexio</Text><Text style={[styles.subtitle, { color: theme.pageTextMuted }]}>Définit aussi la langue de lecture automatique des messages traduits.</Text></View><Pressable accessibilityLabel="Fermer" onPress={onClose} style={[styles.close, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="close" size={21} color={theme.pageTextMuted} /></Pressable></View>
          <View style={[styles.search, { backgroundColor: theme.inputBackground, borderColor: theme.borderSoft }]}><Ionicons name="search" size={19} color={theme.pageTextMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Rechercher une langue…" placeholderTextColor={theme.pageTextMuted} style={[styles.input, { color: theme.pageText }]} /></View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <LanguageRow active={mode === "system"} label="Langue du téléphone" detail="Automatique" icon="phone-portrait-outline" onPress={() => select("system")} />
            {results.map((language) => <LanguageRow key={language.code} active={mode === language.code} label={language.nativeName} detail={language.frenchName === language.nativeName ? language.code.toLocaleUpperCase() : language.frenchName} icon="language-outline" onPress={() => select(language.code)} />)}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LanguageRow({ active, label, detail, icon, onPress }: { active: boolean; label: string; detail: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const theme = useAppTheme();
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: active ? theme.accentSoft : theme.surfaceStrong, borderColor: active ? theme.accent : theme.borderSoft }, pressed && styles.pressed]}><View style={[styles.icon, { backgroundColor: active ? theme.surface : theme.surfaceMuted }]}><Ionicons name={icon} size={20} color={active ? theme.accent : theme.pageTextMuted} /></View><View style={styles.copy}><Text style={[styles.label, { color: theme.pageText }]}>{label}</Text><Text style={[styles.detail, { color: theme.pageTextMuted }]}>{detail}</Text></View>{active ? <Ionicons name="checkmark-circle" size={22} color={theme.accent} /> : <Ionicons name="chevron-forward" size={19} color={theme.pageTextMuted} />}</Pressable>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 680, maxHeight: "88%", alignSelf: "center", paddingHorizontal: spacing.md, paddingTop: 9, paddingBottom: spacing.lg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0 },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  heading: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10 }, headingCopy: { flex: 1, minWidth: 0 }, title: { ...typography.heading2 }, subtitle: { fontSize: 12, lineHeight: 17, marginTop: 3 }, close: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  search: { minHeight: 50, marginTop: 10, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 }, input: { flex: 1, minHeight: 48, fontSize: 14 },
  list: { marginTop: 10 }, listContent: { gap: 7, paddingBottom: 8 }, row: { minHeight: 62, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, copy: { flex: 1, minWidth: 0 }, label: { fontSize: 14, fontWeight: "900" }, detail: { fontSize: 11, marginTop: 2 }, pressed: { opacity: 0.76, transform: [{ scale: 0.993 }] }
});