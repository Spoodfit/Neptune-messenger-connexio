import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { useAppTheme } from "../providers/ThemeProvider";
import { radii, spacing, typography } from "../theme";

export interface ActionSheetOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

export function ActionSheet({ visible, title, subtitle, options, onClose }: ActionSheetProps) {
  const reducedMotion = useReducedMotion();
  const theme = useAppTheme();
  return (
    <Modal transparent visible={visible} animationType={reducedMotion ? "none" : "slide"} onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer les options" onPress={onClose} style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Pressable accessibilityRole="menu" accessibilityLabel={title} onPress={() => undefined} style={[styles.sheet, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={[styles.handle, { backgroundColor: theme.pageTextMuted }]} />
          <View style={styles.heading}>
            <View style={styles.headingText}>
              <Text style={[styles.title, { color: theme.pageText }]}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { color: theme.pageTextMuted }]}>{subtitle}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={[styles.close, { backgroundColor: theme.surfaceStrong }]}>
              <Ionicons name="close" size={21} color={theme.pageTextMuted} />
            </Pressable>
          </View>
          <View style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="menuitem"
                accessibilityLabel={option.label}
                accessibilityState={{ disabled: option.disabled }}
                disabled={option.disabled}
                onPress={() => { onClose(); void option.onPress(); }}
                style={({ pressed }) => [styles.option, { borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong }, pressed && styles.pressed, option.disabled && styles.disabled]}
              >
                <View style={[styles.optionIcon, { backgroundColor: option.destructive ? theme.dangerSoft : theme.accentSoft }]}>
                  <Ionicons name={option.icon} size={21} color={option.destructive ? theme.danger : theme.pageText} />
                </View>
                <Text style={[styles.optionLabel, { color: option.destructive ? theme.danger : theme.pageText }]}>{option.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.pageTextMuted} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: spacing.md, paddingTop: 9, paddingBottom: spacing.xl, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0 },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  heading: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headingText: { flex: 1, minWidth: 0 },
  title: { ...typography.heading3 },
  subtitle: { ...typography.caption, marginTop: 3 },
  close: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  options: { marginTop: spacing.sm, gap: 8 },
  option: { minHeight: 58, paddingHorizontal: 10, borderRadius: radii.lg, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  optionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.993 }] },
  disabled: { opacity: 0.42 }
});
