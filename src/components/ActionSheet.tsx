import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../theme";

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

export function ActionSheet({
  visible,
  title,
  subtitle,
  options,
  onClose
}: ActionSheetProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer les options"
        onPress={onClose}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityRole="menu"
          accessibilityLabel={title}
          onPress={() => undefined}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={styles.headingText}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={onClose}
              style={styles.close}
            >
              <Ionicons name="close" size={21} color={colors.textMuted} />
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
                onPress={() => {
                  onClose();
                  void option.onPress();
                }}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.pressed,
                  option.disabled && styles.disabled
                ]}
              >
                <View
                  style={[
                    styles.optionIcon,
                    option.destructive && styles.optionIconDanger
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={21}
                    color={option.destructive ? colors.danger : colors.text}
                  />
                </View>
                <Text
                  style={[
                    styles.optionLabel,
                    option.destructive && styles.optionLabelDanger
                  ]}
                >
                  {option.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.66)"
  },
  sheet: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 9,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
    backgroundColor: colors.textMuted
  },
  heading: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  headingText: { flex: 1, minWidth: 0 },
  title: { ...typography.heading3, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong
  },
  options: { marginTop: spacing.sm, gap: 7 },
  option: {
    minHeight: 58,
    paddingHorizontal: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  optionIconDanger: { backgroundColor: colors.dangerSoft },
  optionLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "850" },
  optionLabelDanger: { color: colors.danger },
  pressed: { opacity: 0.75, transform: [{ scale: 0.993 }] },
  disabled: { opacity: 0.42 }
});
