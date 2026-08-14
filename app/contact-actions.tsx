import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { StatusAvatar } from "@/components/StatusAvatar";
import { env } from "@/config/env";
import { useExperience } from "@/providers/ExperienceProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import { pickDeviceContact } from "@/services/contacts/deviceContactPicker";
import { restorePrivateConversation } from "@/state/conversationPresentation";
import { colors, gradients, spacing, typography } from "@/theme";
import type { SelectedDeviceContact } from "@/types/deviceContacts";

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function ContactActionsScreen() {
  const params = useLocalSearchParams<{ intent?: string | string[]; recipientId?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const intent = first(params.intent) === "recommend" ? "recommend" : "invite";
  const recipientId = first(params.recipientId);
  const { accessToken } = useSession();
  const { members, localConversations, createPrivateConversation, sendLocalMessage } = useExperience();
  const { visibleConversations, refreshConversations, sendMessage } = useMessaging();
  const api = useMemo(() => env.mockMode ? null : new NeptuneExperienceApi(accessToken), [accessToken]);
  const recipient = members.find((member) => member.id === recipientId);
  const [selected, setSelected] = useState<SelectedDeviceContact | null>(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    if (picking) return;
    setPicking(true);
    setError(null);
    try {
      const contact = await pickDeviceContact();
      if (!contact && Platform.OS === "web") setError("La sélection de contacts du téléphone est disponible dans l’application Android et iOS.");
      else if (contact) setSelected(contact);
    } catch {
      setError("Connexio n’a pas pu ouvrir le sélecteur de contacts. Vérifiez l’autorisation Contacts du téléphone.");
    } finally {
      setPicking(false);
    }
  };

  const ensureConversation = async () => {
    if (!recipient) throw new Error("Le membre destinataire n’est plus disponible.");
    const existing = [...visibleConversations, ...localConversations].find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(recipient.id));
    if (existing) return existing;
    if (api) {
      const conversation = await api.createPrivateConversation([recipient.id]);
      await refreshConversations();
      return conversation;
    }
    return createPrivateConversation({ memberIds: [recipient.id] });
  };

  const shareInvite = async () => {
    if (!selected) return;
    const message = `Bonjour ${selected.displayName.split(" ")[0] || selected.displayName}, je t’invite à découvrir Connexio by Neptune, l’app de mise en relation du réseau Neptune Business. ${env.businessWebBaseUrl}`;
    await Share.share({ title: "Invitation Connexio by Neptune", message });
  };

  const sendRecommendation = async () => {
    if (!selected || !recipient || sending) return;
    setSending(true);
    setConfirmOpen(false);
    setError(null);
    try {
      const details = [selected.phone ? `Tél. ${selected.phone}` : "", selected.email ? `Email ${selected.email}` : ""].filter(Boolean).join(" · ");
      const body = `Je te recommande ${selected.displayName}${details ? ` — ${details}` : ""}. Je pense que cette mise en relation pourrait être pertinente pour vous deux.`;
      const conversation = await ensureConversation();
      restorePrivateConversation(conversation.id);
      const accepted = conversation.id.startsWith("local-")
        ? await sendLocalMessage(conversation.id, body)
        : await sendMessage(conversation.id, body);
      if (!accepted) throw new Error("La recommandation n’a pas été envoyée.");
      router.replace(`/chat/${encodeURIComponent(conversation.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La recommandation n’a pas pu être envoyée.");
    } finally {
      setSending(false);
    }
  };

  const title = intent === "recommend" ? "Recommander un contact" : "Inviter un contact";
  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={colors.text} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.headerTitle}>{title}</Text><Text style={styles.headerSubtitle}>Un seul contact, choisi explicitement</Text></View>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        {intent === "recommend" && recipient ? <View style={styles.recipientCard}><Text style={styles.overline}>RECOMMANDER À</Text><View style={styles.recipientRow}><StatusAvatar user={recipient} size={48} /><View style={styles.recipientCopy}><Text style={styles.recipientName}>{recipient.name}</Text><Text style={styles.recipientMeta}>{recipient.company}</Text></View></View></View> : null}

        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}><Ionicons name="shield-checkmark" size={24} color={colors.success} /></View>
          <View style={styles.privacyCopy}><Text style={styles.privacyTitle}>Votre carnet reste sur votre téléphone</Text><Text style={styles.privacyText}>Connexio ouvre le sélecteur natif et utilise uniquement la personne que vous choisissez. Aucun import automatique de vos contacts.</Text></View>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Choisir un contact du téléphone" disabled={picking} onPress={() => void pick()} style={({ pressed }) => [styles.pickerButton, pressed && styles.pressed]}>
          {picking ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="person-add-outline" size={22} color={colors.white} /><Text style={styles.pickerText}>{selected ? "Choisir une autre personne" : "Choisir dans mes contacts"}</Text></>}
        </Pressable>

        {selected ? <View style={styles.selectedCard}><View style={styles.contactCircle}><Text style={styles.contactInitial}>{selected.displayName.slice(0, 1).toLocaleUpperCase("fr")}</Text></View><View style={styles.selectedCopy}><Text style={styles.selectedName}>{selected.displayName}</Text>{selected.phone ? <Text style={styles.selectedMeta}>{selected.phone}</Text> : null}{selected.email ? <Text style={styles.selectedMeta}>{selected.email}</Text> : null}</View><Ionicons name="checkmark-circle" size={24} color={colors.success} /></View> : null}

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {selected ? <Pressable accessibilityRole="button" disabled={sending} onPress={() => intent === "recommend" ? setConfirmOpen(true) : void shareInvite()} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>{sending ? <ActivityIndicator color={colors.white} /> : <><Ionicons name={intent === "recommend" ? "paper-plane" : "share-social"} size={20} color={colors.white} /><Text style={styles.primaryText}>{intent === "recommend" ? `Recommander à ${recipient?.name.split(" ")[0] ?? "ce membre"}` : "Envoyer l’invitation"}</Text></>}</Pressable> : null}
      </View>

      <ConfirmationDialog
        visible={confirmOpen}
        icon="people-outline"
        title={`Partager les coordonnées de ${selected?.displayName ?? "ce contact"} ?`}
        message={`Seules les informations affichées sur cet écran seront envoyées à ${recipient?.name ?? "ce membre"}.`}
        confirmLabel="Partager"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void sendRecommendation()}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.borderSoft }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "center" }, headerTitle: { ...typography.heading3, color: colors.text }, headerSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  content: { flex: 1, width: "100%", maxWidth: 620, alignSelf: "center", padding: spacing.md }, recipientCard: { padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface }, overline: { color: colors.orange, fontSize: 9, fontWeight: "900", marginBottom: 8 }, recipientRow: { flexDirection: "row", alignItems: "center", gap: 10 }, recipientCopy: { flex: 1 }, recipientName: { color: colors.text, fontSize: 15, fontWeight: "900" }, recipientMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  privacyCard: { minHeight: 100, marginTop: spacing.md, padding: 13, borderRadius: 22, borderWidth: 1, borderColor: "rgba(56,248,180,0.18)", backgroundColor: "rgba(56,248,180,0.06)", flexDirection: "row", gap: 11, alignItems: "center" }, privacyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(56,248,180,0.09)", alignItems: "center", justifyContent: "center" }, privacyCopy: { flex: 1 }, privacyTitle: { color: colors.text, fontSize: 14, fontWeight: "900" }, privacyText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  pickerButton: { minHeight: 56, marginTop: spacing.lg, borderRadius: 19, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, pickerText: { color: colors.white, fontSize: 14, fontWeight: "900" }, selectedCard: { minHeight: 82, marginTop: 10, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 11 }, contactCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }, contactInitial: { color: colors.white, fontSize: 20, fontWeight: "900" }, selectedCopy: { flex: 1 }, selectedName: { color: colors.text, fontSize: 15, fontWeight: "900" }, selectedMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 }, error: { marginTop: 10, padding: 11, borderRadius: 16, color: colors.danger, backgroundColor: colors.dangerSoft, textAlign: "center" }, primary: { minHeight: 56, marginTop: spacing.lg, borderRadius: 19, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, primaryText: { color: colors.white, fontSize: 14, fontWeight: "900" }, pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] }
});
