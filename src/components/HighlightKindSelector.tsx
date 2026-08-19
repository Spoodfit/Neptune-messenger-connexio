import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import type { HighlightKind } from "../types/experience";

const OPTIONS: Array<{ kind: HighlightKind; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { kind: "standard", label: "Temps fort", icon: "sparkles-outline" },
  { kind: "besoin", label: "Besoin", icon: "hand-left-outline" },
  { kind: "reussite", label: "Réussite", icon: "trophy-outline" },
  { kind: "offre", label: "Offre", icon: "pricetag-outline" }
];

interface Props {
  inferredKind: HighlightKind;
  manualKind: HighlightKind | null;
  onChange: (kind: HighlightKind | null) => void;
  compact?: boolean;
}

export function HighlightKindSelector({ inferredKind, manualKind, onChange, compact = false }: Props) {
  const theme = useAppTheme();
  const effective = manualKind ?? inferredKind;
  return (
    <View style={styles.shell}>
      <View style={styles.detectedLine}>
        <Ionicons name="sparkles" size={14} color={theme.violet} />
        <Text style={[styles.detectedText, { color: theme.pageTextMuted }]}>
          {manualKind ? "Catégorie choisie" : `Détecté automatiquement : ${OPTIONS.find((option) => option.kind === effective)?.label ?? "Temps fort"}`}
        </Text>
        {manualKind ? <Pressable accessibilityRole="button" accessibilityLabel="Revenir à la détection automatique" onPress={() => onChange(null)} style={styles.autoButton}><Text style={[styles.autoText, { color: theme.violet }]}>Auto</Text></Pressable> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.options}>
        {OPTIONS.map((option) => {
          const active = effective === option.kind;
          return (
            <Pressable
              key={option.kind}
              accessibilityRole="button"
              accessibilityLabel={`Classer comme ${option.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.kind)}
              style={[styles.option, compact && styles.optionCompact, { borderColor: active ? theme.violet : theme.borderSoft, backgroundColor: active ? theme.violetSoft : theme.surfaceStrong }]}
            >
              <Ionicons name={option.icon} size={15} color={active ? theme.violet : theme.pageTextMuted} />
              <Text style={[styles.optionText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { width: "100%", gap: 5 },
  detectedLine: { minHeight: 28, flexDirection: "row", alignItems: "center", gap: 6 },
  detectedText: { flex: 1, fontSize: 12, fontWeight: "700" },
  autoButton: { minWidth: 48, minHeight: 32, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  autoText: { fontSize: 12, fontWeight: "900" },
  options: { gap: 6, paddingRight: 4 },
  option: { minHeight: 42, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  optionCompact: { minHeight: 38, paddingHorizontal: 9 },
  optionText: { fontSize: 12, fontWeight: "900" }
});
