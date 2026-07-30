import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { env } from "@/config/env";
import { colors, gradients, radii, spacing, typography } from "@/theme";

const MOCK_CALLS = [
  {
    id: "lea",
    name: "Léa Despoulins",
    initials: "LD",
    type: "Appel audio",
    time: "Aujourd’hui · 18:42",
    incoming: true,
    missed: false
  },
  {
    id: "oceane",
    name: "Océane",
    initials: "OC",
    type: "Visio",
    time: "Aujourd’hui · 15:18",
    incoming: false,
    missed: false
  },
  {
    id: "nabiha",
    name: "Nabiha",
    initials: "NA",
    type: "Appel manqué",
    time: "Hier · 17:06",
    incoming: true,
    missed: true
  },
  {
    id: "christelle",
    name: "Christelle",
    initials: "CH",
    type: "Appel audio",
    time: "Hier · 11:24",
    incoming: false,
    missed: false
  }
] as const;

function explainUnavailable(kind: "audio" | "video") {
  Alert.alert(
    kind === "audio" ? "Appel audio" : "Visio",
    "L’interface V13 est prête. La signalisation WebRTC et le serveur TURN doivent encore être connectés avant un appel réel."
  );
}

export default function CallsScreen() {
  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <BrandHeader title="Appels" subtitle="Historique audio et visio Connexio." />

      {!env.mockMode ? (
        <View style={styles.unavailableWrap}>
          <LinearGradient colors={gradients.glass} style={styles.unavailable}>
            <Ionicons name="call-outline" size={28} color={colors.violet} />
            <Text style={styles.unavailableTitle}>Appels à connecter</Text>
            <Text style={styles.unavailableText}>
              L’historique, les appels entrants et la visio seront activés après la mise en place de WebRTC, du serveur de signalisation et de TURN.
            </Text>
          </LinearGradient>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHead}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Récents
            </Text>
            <Text style={styles.sectionMeta}>{MOCK_CALLS.length} appels</Text>
          </View>

          <View style={styles.list}>
            {MOCK_CALLS.map((call) => (
              <LinearGradient
                key={call.id}
                colors={gradients.glass}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.row}
              >
                <LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{call.initials}</Text>
                  </View>
                </LinearGradient>

                <View style={styles.rowContent}>
                  <Text style={styles.name} numberOfLines={1}>{call.name}</Text>
                  <View style={styles.callMetaLine}>
                    <Ionicons
                      name={call.incoming ? "arrow-down-outline" : "arrow-up-outline"}
                      size={13}
                      color={call.missed ? colors.danger : colors.success}
                    />
                    <Text
                      style={[styles.callType, call.missed && styles.callTypeMissed]}
                      numberOfLines={1}
                    >
                      {call.type}
                    </Text>
                  </View>
                  <Text style={styles.time}>{call.time}</Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Appeler ${call.name}`}
                    onPress={() => explainUnavailable("audio")}
                    style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="call-outline" size={19} color={colors.text} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Démarrer une visio avec ${call.name}`}
                    onPress={() => explainUnavailable("video")}
                    style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="videocam-outline" size={20} color={colors.text} />
                  </Pressable>
                </View>
              </LinearGradient>
            ))}
          </View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 26
  },
  sectionHead: {
    paddingHorizontal: 4,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  sectionTitle: { ...typography.heading3, color: colors.text, fontWeight: "900" },
  sectionMeta: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  list: { gap: spacing.sm },
  row: {
    width: "100%",
    minHeight: 80,
    paddingHorizontal: 11,
    paddingVertical: 12,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  avatarShell: { width: 50, height: 50, padding: 2, borderRadius: 17, flexShrink: 0 },
  avatar: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { color: colors.text, fontSize: 11, fontWeight: "900" },
  rowContent: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: "900" },
  callMetaLine: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  callType: { color: colors.textSecondary, fontSize: 10.5, lineHeight: 14, flexShrink: 1 },
  callTypeMissed: { color: colors.danger },
  time: { color: colors.textMuted, fontSize: 9, lineHeight: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: 6, flexShrink: 0 },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.glass,
    alignItems: "center",
    justifyContent: "center"
  },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.8 },
  unavailableWrap: { flex: 1, padding: spacing.md, alignItems: "center", justifyContent: "center" },
  unavailable: {
    width: "100%",
    maxWidth: 430,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    gap: spacing.sm
  },
  unavailableTitle: { ...typography.heading3, color: colors.text, textAlign: "center" },
  unavailableText: { ...typography.bodySmall, color: colors.textMuted, textAlign: "center" }
});
