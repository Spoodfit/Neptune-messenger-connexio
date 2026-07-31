import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { useExperience } from "@/providers/ExperienceProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";

function explainUnavailable(kind: "audio" | "video", name: string) {
  Alert.alert(
    kind === "audio" ? `Appeler ${name}` : `Visio avec ${name}`,
    "Le front, l’historique et les états sont prêts. Le développeur doit brancher WebRTC, la signalisation, TURN/STUN, les appels entrants et les notifications CallKit/ConnectionService."
  );
}

function directionLabel(direction: "incoming" | "outgoing" | "missed") {
  if (direction === "missed") return "Appel manqué";
  if (direction === "incoming") return "Appel entrant";
  return "Appel sortant";
}

export default function CallsScreen() {
  const { callHistory } = useExperience();

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <BrandHeader title="Appels" subtitle="Historique audio et visio Connexio." />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHead}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Récents
          </Text>
          <Text style={styles.sectionMeta}>{callHistory.length} appels</Text>
        </View>

        <View style={styles.list}>
          {callHistory.map((call) => (
            <LinearGradient
              key={call.id}
              colors={gradients.glass}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.row}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir le profil de ${call.member.name}`}
                onPress={() =>
                  router.push(`/profile/${encodeURIComponent(call.member.id)}`)
                }
                style={styles.identity}
              >
                <LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>
                  <View style={styles.avatar}>
                    {call.member.avatarUrl ? (
                      <Image source={{ uri: call.member.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{call.member.initials}</Text>
                    )}
                  </View>
                </LinearGradient>

                <View style={styles.rowContent}>
                  <Text style={styles.name} numberOfLines={1}>
                    {call.member.name}
                  </Text>
                  <View style={styles.callMetaLine}>
                    <Ionicons
                      name={
                        call.direction === "incoming"
                          ? "arrow-down-outline"
                          : call.direction === "outgoing"
                            ? "arrow-up-outline"
                            : "close-outline"
                      }
                      size={13}
                      color={
                        call.direction === "missed" ? colors.danger : colors.success
                      }
                    />
                    <Text
                      style={[
                        styles.callType,
                        call.direction === "missed" && styles.callTypeMissed
                      ]}
                      numberOfLines={1}
                    >
                      {call.type === "video" ? "Visio" : directionLabel(call.direction)}
                    </Text>
                  </View>
                  <Text style={styles.time}>
                    {new Date(call.occurredAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                    {call.durationSeconds
                      ? ` · ${Math.floor(call.durationSeconds / 60)} min`
                      : ""}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Appeler ${call.member.name}`}
                  onPress={() => explainUnavailable("audio", call.member.name)}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                >
                  <Ionicons name="call-outline" size={19} color={colors.text} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Démarrer une visio avec ${call.member.name}`}
                  onPress={() => explainUnavailable("video", call.member.name)}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                >
                  <Ionicons name="videocam-outline" size={20} color={colors.text} />
                </Pressable>
              </View>
            </LinearGradient>
          ))}
        </View>

        <View style={styles.backendNote}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
          <Text style={styles.backendText}>
            Les appels sont privés uniquement. Le backend devra vérifier l’identité, le blocage, les permissions et fournir un ticket de signalisation à durée courte.
          </Text>
        </View>
      </ScrollView>
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
    gap: 8
  },
  identity: { flex: 1, minWidth: 0, minHeight: 54, flexDirection: "row", alignItems: "center", gap: 11 },
  avatarShell: { width: 50, height: 50, padding: 2, borderRadius: 17, flexShrink: 0 },
  avatar: { flex: 1, borderRadius: 15, overflow: "hidden", borderWidth: 2, borderColor: colors.surface, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: colors.text, fontSize: 11, fontWeight: "900" },
  rowContent: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: "900" },
  callMetaLine: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  callType: { color: colors.textSecondary, fontSize: 10.5, lineHeight: 14, flexShrink: 1 },
  callTypeMissed: { color: colors.danger },
  time: { color: colors.textMuted, fontSize: 9, lineHeight: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: 5, flexShrink: 0 },
  actionButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.glass, alignItems: "center", justifyContent: "center" },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.8 },
  backendNote: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.successSoft, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  backendText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 }
});
