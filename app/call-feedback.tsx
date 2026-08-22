import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { env } from "@/config/env";
import { useExperience } from "@/providers/ExperienceProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { CallFeedbackApi } from "@/services/api/callFeedbackApi";
import { AppAlert } from "@/services/ui/AppAlert";
import { colors, gradients, spacing, typography } from "@/theme";
import { StatusAvatar } from "@/components/StatusAvatar";

const TAGS = ["Échange utile", "Très réactif", "Bonne mise en relation", "À recontacter"] as const;

function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function CallFeedbackScreen() {
  const params = useLocalSearchParams<{ callId?: string; memberId?: string; memberName?: string; reason?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { accessToken } = useSession();
  const { members } = useExperience();
  const callId = first(params.callId) ?? "";
  const memberId = first(params.memberId);
  const memberName = first(params.memberName) ?? "ce membre";
  const reason = first(params.reason) ?? "";
  const member = memberId ? members.find((item) => item.id === memberId) : undefined;
  const api = useMemo(() => new CallFeedbackApi(accessToken), [accessToken]);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const finish = () => router.replace("/(tabs)/calls");
  const toggleTag = (tag: string) => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);

  const submit = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      if (!env.mockMode && env.backendContract === "connexio-v1" && callId) {
        await api.submit(callId, { memberId, rating, note, tags });
      }
      finish();
    } catch (error) {
      AppAlert.alert("Avis non enregistré", error instanceof Error ? error.message : "Votre avis n’a pas pu être enregistré.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 18, 34), paddingBottom: Math.max(insets.bottom + 18, 28) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          {member ? <StatusAvatar user={member} size={72} /> : <View style={[styles.fallbackAvatar, { backgroundColor: theme.violetSoft }]}><Ionicons name="person" size={31} color={theme.violet} /></View>}
          <View style={styles.successIcon}><Ionicons name="checkmark" size={18} color={colors.white} /></View>
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.pageText }]}>Comment s’est passé l’échange ?</Text>
        <Text style={[styles.subtitle, { color: theme.pageTextMuted }]}>Votre retour sur {memberName} contribue à la réputation professionnelle Neptune.</Text>
        {reason ? <View style={[styles.reason, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><Text style={[styles.reasonLabel, { color: theme.pageTextMuted }]}>OBJET DE L’ÉCHANGE</Text><Text style={[styles.reasonText, { color: theme.pageTextSecondary }]}>{reason}</Text></View> : null}

        <View accessible accessibilityLabel={rating ? `Note ${rating} sur 5` : "Choisir une note sur 5"} style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} étoile${value > 1 ? "s" : ""}`} accessibilityState={{ selected: rating === value }} onPress={() => setRating(value)} style={styles.starTarget}>
              <Ionicons name={value <= rating ? "star" : "star-outline"} size={35} color={value <= rating ? theme.orange : theme.pageTextMuted} />
            </Pressable>
          ))}
        </View>
        <Text style={[styles.ratingHint, { color: theme.pageTextMuted }]}>{rating === 0 ? "Touchez les étoiles pour noter l’échange" : rating <= 2 ? "Qu’est-ce qui pourrait être amélioré ?" : rating === 3 ? "Un échange correct" : rating === 4 ? "Très bon échange" : "Excellent échange"}</Text>

        <View style={styles.tags}>{TAGS.map((tag) => {
          const active = tags.includes(tag);
          return <Pressable key={tag} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => toggleTag(tag)} style={[styles.tag, { borderColor: active ? theme.violet : theme.borderSoft, backgroundColor: active ? theme.violetSoft : theme.surface }]}><Text style={[styles.tagText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{tag}</Text></Pressable>;
        })}</View>

        <TextInput value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Ajouter un commentaire facultatif…" placeholderTextColor={theme.pageTextMuted} style={[styles.note, { color: theme.pageText, borderColor: theme.borderSoft, backgroundColor: theme.surface }]} />

        <Pressable accessibilityRole="button" accessibilityLabel="Envoyer l’avis" accessibilityState={{ disabled: rating === 0, busy: submitting }} disabled={rating === 0 || submitting} onPress={() => void submit()} style={[styles.primaryTarget, (rating === 0 || submitting) && styles.disabled]}>
          <LinearGradient colors={gradients.primary} style={styles.primary}>{submitting ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={18} color={colors.white} />}<Text style={styles.primaryText}>{submitting ? "Envoi…" : "Envoyer l’avis"}</Text></LinearGradient>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Passer l’avis" disabled={submitting} onPress={finish} style={styles.skip}><Text style={[styles.skipText, { color: theme.pageTextMuted }]}>Passer</Text></Pressable>
        <Text style={[styles.syncHint, { color: theme.pageTextMuted }]}><Ionicons name="sync-outline" size={13} color={theme.pageTextMuted} />  Cet avis est destiné à la réputation du membre dans Neptune Business lorsque la synchronisation backend est activée.</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: "100%", maxWidth: 600, alignSelf: "center", flexGrow: 1, paddingHorizontal: 18, alignItems: "center" },
  identity: { width: 82, height: 82, position: "relative", alignItems: "center", justifyContent: "center" },
  fallbackAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  successIcon: { position: "absolute", right: 0, bottom: 0, width: 29, height: 29, borderRadius: 15, backgroundColor: "#20C997", borderWidth: 3, borderColor: "#020A1A", alignItems: "center", justifyContent: "center" },
  title: { ...typography.heading2, textAlign: "center", marginTop: 14 },
  subtitle: { ...typography.body, maxWidth: 470, textAlign: "center", marginTop: 7 },
  reason: { width: "100%", marginTop: 18, borderWidth: 1, borderRadius: 18, padding: 12 },
  reasonLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  reasonText: { marginTop: 5, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  stars: { minHeight: 64, marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  starTarget: { width: 52, height: 56, alignItems: "center", justifyContent: "center" },
  ratingHint: { minHeight: 28, fontSize: 13, fontWeight: "700", textAlign: "center" },
  tags: { width: "100%", marginTop: 10, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  tag: { minHeight: 44, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  tagText: { fontSize: 12, fontWeight: "800" },
  note: { width: "100%", minHeight: 100, maxHeight: 180, marginTop: 15, borderRadius: 18, borderWidth: 1, padding: 13, fontSize: 16, lineHeight: 22, textAlignVertical: "top" },
  primaryTarget: { width: "100%", minHeight: 52, marginTop: 14, borderRadius: 17, overflow: "hidden" },
  primary: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  skip: { minWidth: 120, minHeight: 48, alignItems: "center", justifyContent: "center" },
  skipText: { fontSize: 14, fontWeight: "800" },
  syncHint: { maxWidth: 470, marginTop: 4, fontSize: 11, lineHeight: 16, textAlign: "center" },
  disabled: { opacity: 0.42 }
});
