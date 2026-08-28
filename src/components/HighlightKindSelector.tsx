import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from "react-native-reanimated";

import { useAppTheme } from "../providers/ThemeProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
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
  const { t } = useAppLanguage();
  const effective = manualKind ?? inferredKind;
  const [expanded, setExpanded] = useState(false);
  const effectiveLabel = OPTIONS.find((option) => option.kind === effective)?.label ?? "Temps fort";
  return (
    <Animated.View layout={LinearTransition.duration(180)} style={styles.shell}>
      <View style={[styles.detectedLine, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
        <View style={[styles.detectedIcon, { backgroundColor: theme.violetSoft }]}>
          <Ionicons name="sparkles" size={15} color={theme.violet} />
        </View>
        <View style={styles.detectedCopy}>
          <Text style={[styles.detectedEyebrow, { color: theme.pageTextMuted }]}>{manualKind ? "Catégorie choisie" : "Catégorie détectée"}</Text>
          <Text numberOfLines={1} style={[styles.detectedText, { color: theme.pageText }]}>{effectiveLabel}</Text>
        </View>
        {manualKind ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Revenir à la détection automatique" onPress={() => { onChange(null); setExpanded(false); }} style={styles.autoButton}>
            <Text style={[styles.autoText, { color: theme.violet }]}>Auto</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Masquer les catégories" : "Modifier la catégorie"}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={styles.changeButton}
        >
          <Text style={[styles.changeText, { color: theme.violet }]}>{expanded ? "Fermer" : "Modifier"}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={15} color={theme.violet} />
        </Pressable>
      </View>
      {expanded ? (
        <Animated.View entering={FadeInDown.duration(160)} exiting={FadeOutUp.duration(140)} accessibilityRole="radiogroup" accessibilityLabel={t("Catégorie de la publication")} style={styles.options}>
          {OPTIONS.map((option) => {
            const active = effective === option.kind;
            return (
              <Pressable
                key={option.kind}
                accessibilityRole="radio"
                accessibilityLabel={`Classer comme ${option.label}`}
                accessibilityState={{ selected: active }}
                onPress={() => { onChange(option.kind); setExpanded(false); }}
                style={[styles.option, compact && styles.optionCompact, { borderColor: active ? theme.violet : theme.borderSoft, backgroundColor: active ? theme.violetSoft : theme.surfaceStrong }]}
              >
                <Ionicons name={option.icon} size={16} color={active ? theme.violet : theme.pageTextMuted} />
                <Text style={[styles.optionText, { color: active ? theme.pageText : theme.pageTextMuted }]} numberOfLines={1}>{option.label}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { width: "100%", gap: 8 },
  detectedLine: { minHeight: 52, borderRadius: 16, borderWidth: 1, paddingLeft: 7, flexDirection: "row", alignItems: "center", gap: 7 },
  detectedIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  detectedCopy: { flex: 1, minWidth: 0 },
  detectedEyebrow: { fontSize: 9, lineHeight: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.35 },
  detectedText: { fontSize: 13, lineHeight: 17, fontWeight: "900" },
  autoButton: { minWidth: 48, minHeight: 48, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  autoText: { fontSize: 12, fontWeight: "900" },
  changeButton: { minHeight: 48, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 },
  changeText: { fontSize: 11, fontWeight: "900" },
  options: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { flexBasis: "46%", flexGrow: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  optionCompact: { minHeight: 48, paddingHorizontal: 9 },
  optionText: { fontSize: 14, fontWeight: "900", flexShrink: 1 }
});
