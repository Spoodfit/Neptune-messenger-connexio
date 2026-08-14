import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../../providers/ThemeProvider";
import { colors, spacing, typography } from "../../theme";

export interface AppAlertButton {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AppAlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
}

type Listener = (request: AppAlertRequest) => void;
const listeners = new Set<Listener>();
let nextId = 1;

export const AppAlert = {
  alert(title: string, message?: string, buttons?: AppAlertButton[]) {
    const request: AppAlertRequest = { id: nextId++, title, message, buttons };
    listeners.forEach((listener) => listener(request));
  }
};

export function AppAlertHost() {
  const theme = useAppTheme();
  const [request, setRequest] = useState<AppAlertRequest | null>(null);

  useEffect(() => {
    const listener: Listener = (next) => setRequest(next);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  if (!request) return null;
  const actions = request.buttons?.length ? request.buttons : [{ text: "OK" }];
  const close = () => setRequest(null);
  const cancel = actions.find((button) => button.style === "cancel");
  const primaryActions = actions.filter((button) => button.style !== "cancel");
  const destructive = primaryActions.some((button) => button.style === "destructive");

  const run = (button: AppAlertButton) => {
    close();
    requestAnimationFrame(() => button.onPress?.());
  };

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent onRequestClose={() => cancel ? run(cancel) : close()}>
      <Pressable accessibilityRole="none" onPress={() => cancel ? run(cancel) : close()} style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Pressable accessibilityRole="alert" onPress={(event) => event.stopPropagation()} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
          <View style={[styles.icon, { backgroundColor: destructive ? theme.dangerSoft : theme.violetSoft, borderColor: destructive ? theme.danger : theme.violet }]}>
            <Ionicons name={destructive ? "alert-circle-outline" : "information-circle-outline"} size={27} color={destructive ? theme.danger : theme.violet} />
          </View>
          <Text style={[styles.title, { color: theme.pageText }]}>{request.title}</Text>
          {request.message ? <Text style={[styles.message, { color: theme.pageTextMuted }]}>{request.message}</Text> : null}
          <View style={styles.actions}>
            {cancel ? <Pressable accessibilityRole="button" onPress={() => run(cancel)} style={({ pressed }) => [styles.button, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }, pressed && styles.pressed]}><Text style={[styles.secondaryText, { color: theme.pageTextSecondary }]}>{cancel.text ?? "Annuler"}</Text></Pressable> : null}
            {primaryActions.map((button, index) => {
              const danger = button.style === "destructive";
              return <Pressable key={`${button.text ?? "OK"}-${index}`} accessibilityRole="button" onPress={() => run(button)} style={({ pressed }) => [styles.button, { backgroundColor: danger ? theme.danger : colors.primary, borderColor: danger ? theme.danger : colors.primary }, pressed && styles.pressed]}><Text style={styles.primaryText}>{button.text ?? "OK"}</Text></Pressable>;
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: spacing.lg, alignItems: "center", justifyContent: "center" },
  card: { width: "100%", maxWidth: 420, padding: spacing.lg, borderRadius: 28, borderWidth: 1, shadowOpacity: 0.2, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 28 },
  icon: { width: 54, height: 54, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { ...typography.heading2, marginTop: spacing.md },
  message: { ...typography.body, marginTop: 8, lineHeight: 21 },
  actions: { marginTop: spacing.lg, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  button: { flexGrow: 1, minWidth: 118, minHeight: 50, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 14, fontWeight: "900" },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: "900", textAlign: "center" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] }
});
