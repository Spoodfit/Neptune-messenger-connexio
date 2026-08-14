import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { StatusAvatar } from "@/components/StatusAvatar";
import { ThemeModeButton } from "@/components/ThemeModeButton";
import { env } from "@/config/env";
import { useExperience } from "@/providers/ExperienceProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import { DeviceContactPermissionError, pickDeviceContact } from "@/services/contacts/deviceContactPicker";
import { restorePrivateConversation } from "@/state/conversationPresentation";
import { colors, spacing, typography } from "@/theme";
import type { AppUser } from "@/types/messaging";
import type { SelectedDeviceContact } from "@/types/deviceContacts";

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

type RecommendationSource = "connexio" | "phone";
type RecommendationSelection =
  | { kind: "member"; member: AppUser }
  | { kind: "device"; contact: SelectedDeviceContact };

export default function ContactActionsScreen() {
  const params = useLocalSearchParams<{ intent?: string | string[]; recipientId?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const intent = first(params.intent) === "recommend" ? "recommend" : "invite";
  const recipientId = first(params.recipientId);
  const { accessToken, currentUser } = useSession();
  const { members, localConversations, createPrivateConversation, sendLocalMessage } = useExperience();
  const { visibleConversations, refreshConversations, sendMessage } = useMessaging();
  const api = useMemo(() => env.mockMode ? null : new NeptuneExperienceApi(accessToken), [accessToken]);
  const recipient = members.find((member) => member.id === recipientId);
  const [source, setSource] = useState<RecommendationSource>("connexio");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<RecommendationSelection | null>(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsRequired, setSettingsRequired] = useState(false);

  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const memberResults = useMemo(() => {
    const candidates = members.filter((member) => member.id !== currentUser.id && member.id !== recipientId);
    if (!normalizedQuery) return candidates.slice(0, 12);
    return candidates.filter((member) => [member.name, member.company, member.city, member.roleLabel].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(normalizedQuery)).slice(0, 20);
  }, [currentUser.id, members, normalizedQuery, recipientId]);

  const pick = async () => {
    if (picking) return;
    setPicking(true);
    setError(null);
    setSettingsRequired(false);
    try {
      const contact = await pickDeviceContact();
      if (!contact && Platform.OS === "web") setError("La sélection de contacts du téléphone est disponible dans l’application Android et iOS.");
      else if (contact) setSelection({ kind: "device", contact });
    } catch (cause) {
      if (cause instanceof DeviceContactPermissionError) {
        setSettingsRequired(!cause.canAskAgain);
        setError(cause.canAskAgain
          ? "L’accès aux contacts a été refusé. Touchez à nouveau le bouton si vous souhaitez autoriser Connexio à ouvrir le sélecteur."
          : "L’accès aux contacts est bloqué pour Connexio. Réactivez l’autorisation Contacts dans les réglages du téléphone.");
      } else {
        setError("Connexio n’a pas pu ouvrir le sélecteur de contacts. Réessayez après avoir vérifié l’autorisation Contacts.");
      }
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

  const selectedDeviceContact = selection?.kind === "device" ? selection.contact : null;
  const selectedMember = selection?.kind === "member" ? selection.member : null;

  const shareInvite = async () => {
    if (!selectedDeviceContact) return;
    const message = `Bonjour ${selectedDeviceContact.displayName.split(" ")[0] || selectedDeviceContact.displayName}, je t’invite à découvrir Connexio by Neptune, l’app de mise en relation du réseau Neptune Business. ${env.businessWebBaseUrl}`;
    await Share.share({ title: "Invitation Connexio by Neptune", message });
  };

  const sendRecommendation = async () => {
    if (!selection || !recipient || sending) return;
    setSending(true);
    setConfirmOpen(false);
    setError(null);
    try {
      const body = selection.kind === "member"
        ? `Je te recommande ${selection.member.name} sur Connexio${selection.member.company ? ` — ${selection.member.company}` : ""}${selection.member.city ? ` · ${selection.member.city}` : ""}. Je pense que cette mise en relation pourrait être pertinente pour vous deux.`
        : (() => {
            const details = [selection.contact.phone ? `Tél. ${selection.contact.phone}` : "", selection.contact.email ? `Email ${selection.contact.email}` : ""].filter(Boolean).join(" · ");
            return `Je te recommande ${selection.contact.displayName}${details ? ` — ${details}` : ""}. Je pense que cette mise en relation pourrait être pertinente pour vous deux.`;
          })();
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
  const selectedLabel = selectedMember?.name ?? selectedDeviceContact?.displayName ?? "ce contact";

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), backgroundColor: theme.shellBackground, borderBottomColor: theme.shellBorder }]}>
        <Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: theme.pageText }]}>{title}</Text><Text style={[styles.headerSubtitle, { color: theme.pageTextMuted }]}>{intent === "recommend" ? "Membre Connexio ou contact du téléphone" : "Un seul contact, choisi explicitement"}</Text></View>
        <ThemeModeButton />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {intent === "recommend" && recipient ? <View style={[styles.recipientCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Text style={[styles.overline, { color: theme.orange }]}>RECOMMANDER À</Text><View style={styles.recipientRow}><StatusAvatar user={recipient} size={48} /><View style={styles.recipientCopy}><Text style={[styles.recipientName, { color: theme.pageText }]}>{recipient.name}</Text><Text style={[styles.recipientMeta, { color: theme.pageTextMuted }]}>{recipient.company}</Text></View></View></View> : null}

        {intent === "recommend" ? (
          <>
            <View style={[styles.sourceTabs, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
              {(["connexio", "phone"] as const).map((value) => {
                const active = source === value;
                return <Pressable key={value} onPress={() => { setSource(value); setSelection(null); setError(null); }} style={[styles.sourceTab, active && { backgroundColor: theme.accentSoft }]}><Ionicons name={value === "connexio" ? "people-outline" : "phone-portrait-outline"} size={18} color={active ? theme.accent : theme.pageTextMuted} /><Text style={[styles.sourceText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{value === "connexio" ? "Membre Connexio" : "Téléphone"}</Text></Pressable>;
              })}
            </View>

            {source === "connexio" ? <View style={styles.memberPicker}><View style={[styles.searchShell, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}><Ionicons name="search" size={19} color={theme.pageTextMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Nom, entreprise, ville…" placeholderTextColor={theme.pageTextMuted} style={[styles.searchInput, { color: theme.pageText }]} /></View><View style={styles.results}>{memberResults.map((member) => { const active = selectedMember?.id === member.id; return <Pressable key={member.id} onPress={() => setSelection({ kind: "member", member })} style={[styles.memberRow, { backgroundColor: active ? theme.accentSoft : theme.surface, borderColor: active ? theme.accent : theme.borderSoft }]}><StatusAvatar user={member} size={46} /><View style={styles.memberCopy}><Text style={[styles.memberName, { color: theme.pageText }]}>{member.name}</Text><Text numberOfLines={1} style={[styles.memberMeta, { color: theme.pageTextMuted }]}>{[member.company, member.city].filter(Boolean).join(" · ")}</Text></View><Ionicons name={active ? "checkmark-circle" : "chevron-forward"} size={22} color={active ? theme.accent : theme.pageTextMuted} /></Pressable>; })}{memberResults.length === 0 ? <Text style={[styles.empty, { color: theme.pageTextMuted }]}>Aucun profil ne correspond à cette recherche.</Text> : null}</View></View> : <PhonePickerCard theme={theme} selection={selectedDeviceContact} picking={picking} error={error} settingsRequired={settingsRequired} onPick={() => void pick()} />}
          </>
        ) : (
          <PhonePickerCard theme={theme} selection={selectedDeviceContact} picking={picking} error={error} settingsRequired={settingsRequired} onPick={() => void pick()} />
        )}

        {error && !(source === "phone" || intent === "invite") ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger, backgroundColor: theme.dangerSoft }]}>{error}</Text> : null}

        {selection ? <Pressable accessibilityRole="button" disabled={sending} onPress={() => intent === "recommend" ? setConfirmOpen(true) : void shareInvite()} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>{sending ? <ActivityIndicator color={colors.white} /> : <><Ionicons name={intent === "recommend" ? "paper-plane" : "share-social"} size={20} color={colors.white} /><Text style={styles.primaryText}>{intent === "recommend" ? `Recommander à ${recipient?.name.split(" ")[0] ?? "ce membre"}` : "Envoyer l’invitation"}</Text></>}</Pressable> : null}
      </ScrollView>

      <ConfirmationDialog
        visible={confirmOpen}
        icon="people-outline"
        title={`Recommander ${selectedLabel} ?`}
        message={selection?.kind === "device" ? `Seules les coordonnées affichées seront envoyées à ${recipient?.name ?? "ce membre"}.` : `${recipient?.name ?? "Ce membre"} recevra une recommandation vers ce profil Connexio.`}
        confirmLabel="Recommander"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void sendRecommendation()}
      />
    </LinearGradient>
  );
}

function PhonePickerCard({ theme, selection, picking, error, settingsRequired, onPick }: { theme: ReturnType<typeof useAppTheme>; selection: SelectedDeviceContact | null; picking: boolean; error: string | null; settingsRequired: boolean; onPick: () => void }) {
  return <View style={[styles.phoneSection, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><View style={styles.privacyRow}><View style={[styles.privacyIcon, { backgroundColor: theme.successSoft }]}><Ionicons name="shield-checkmark" size={24} color={theme.success} /></View><View style={styles.privacyCopy}><Text style={[styles.privacyTitle, { color: theme.pageText }]}>Votre carnet reste sur votre téléphone</Text><Text style={[styles.privacyText, { color: theme.pageTextMuted }]}>Connexio utilise uniquement la personne choisie. Aucun import automatique du carnet d’adresses.</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel="Choisir un contact du téléphone" disabled={picking} onPress={onPick} style={({ pressed }) => [styles.pickerButton, pressed && styles.pressed]}>{picking ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="person-add-outline" size={22} color={colors.white} /><Text style={styles.pickerText}>{selection ? "Choisir une autre personne" : "Choisir dans mes contacts"}</Text></>}</Pressable>{selection ? <View style={[styles.selectedCard, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}><View style={[styles.contactCircle, { backgroundColor: theme.accentSoft }]}><Text style={[styles.contactInitial, { color: theme.accent }]}>{selection.displayName.slice(0, 1).toLocaleUpperCase("fr")}</Text></View><View style={styles.selectedCopy}><Text style={[styles.selectedName, { color: theme.pageText }]}>{selection.displayName}</Text>{selection.phone ? <Text style={[styles.selectedMeta, { color: theme.pageTextMuted }]}>{selection.phone}</Text> : null}{selection.email ? <Text style={[styles.selectedMeta, { color: theme.pageTextMuted }]}>{selection.email}</Text> : null}</View><Ionicons name="checkmark-circle" size={24} color={theme.success} /></View> : null}{error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger, backgroundColor: theme.dangerSoft }]}>{error}</Text> : null}{settingsRequired ? <Pressable onPress={() => void Linking.openSettings()} style={[styles.settingsButton, { borderColor: theme.border, backgroundColor: theme.surfaceStrong }]}><Ionicons name="settings-outline" size={18} color={theme.pageText} /><Text style={[styles.settingsText, { color: theme.pageText }]}>Ouvrir les réglages de Connexio</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, gap: 4 }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "center", minWidth: 0 }, headerTitle: { ...typography.heading3 }, headerSubtitle: { fontSize: 11, marginTop: 2, textAlign: "center" },
  content: { width: "100%", maxWidth: 620, alignSelf: "center", padding: spacing.md, paddingBottom: 40 }, recipientCard: { padding: 12, borderRadius: 20, borderWidth: 1 }, overline: { fontSize: 10, fontWeight: "900", marginBottom: 8 }, recipientRow: { flexDirection: "row", alignItems: "center", gap: 10 }, recipientCopy: { flex: 1 }, recipientName: { fontSize: 15, fontWeight: "900" }, recipientMeta: { fontSize: 12, marginTop: 2 },
  sourceTabs: { minHeight: 56, marginTop: spacing.md, padding: 4, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 4 }, sourceTab: { flex: 1, minHeight: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 7 }, sourceText: { fontSize: 12, fontWeight: "900", textAlign: "center" }, memberPicker: { marginTop: 10 }, searchShell: { minHeight: 52, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 }, searchInput: { flex: 1, minHeight: 48, fontSize: 16 }, results: { marginTop: 9, gap: 8 }, memberRow: { minHeight: 68, padding: 10, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, memberCopy: { flex: 1, minWidth: 0 }, memberName: { fontSize: 14, fontWeight: "900" }, memberMeta: { fontSize: 12, marginTop: 3 }, empty: { paddingVertical: 24, textAlign: "center", fontSize: 13 },
  phoneSection: { marginTop: spacing.md, padding: 13, borderRadius: 22, borderWidth: 1 }, privacyRow: { minHeight: 74, flexDirection: "row", gap: 11, alignItems: "center" }, privacyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, privacyCopy: { flex: 1 }, privacyTitle: { fontSize: 14, fontWeight: "900" }, privacyText: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  pickerButton: { minHeight: 56, marginTop: 12, borderRadius: 19, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, pickerText: { color: colors.white, fontSize: 14, fontWeight: "900" }, selectedCard: { minHeight: 82, marginTop: 10, padding: 12, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 11 }, contactCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" }, contactInitial: { fontSize: 20, fontWeight: "900" }, selectedCopy: { flex: 1 }, selectedName: { fontSize: 15, fontWeight: "900" }, selectedMeta: { fontSize: 12, marginTop: 2 }, error: { marginTop: 10, padding: 11, borderRadius: 16, textAlign: "center", fontSize: 12, lineHeight: 18 }, settingsButton: { minHeight: 48, marginTop: 8, borderWidth: 1, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 }, settingsText: { fontSize: 12, fontWeight: "900" }, primary: { minHeight: 56, marginTop: spacing.lg, borderRadius: 19, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, primaryText: { color: colors.white, fontSize: 14, fontWeight: "900" }, pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] }
});
