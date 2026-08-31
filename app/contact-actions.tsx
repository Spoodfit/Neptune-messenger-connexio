import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import {
  Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import { router,
  useLocalSearchParams } from "expo-router";
import { useMemo,
  useState } from "react";
import { ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
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
import type { AppUser, Conversation, MessageAttachment } from "@/types/messaging";
import type { SelectedDeviceContact } from "@/types/deviceContacts";

function first(value?: string | string[]) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
type ContactIntent = "invite" | "recommend" | "message";
type RecommendationSource = "connexio" | "phone";
type RecommendationSelection = { kind: "member"; member: AppUser } | { kind: "device"; contact: SelectedDeviceContact };

function recommendationBody(selection: RecommendationSelection): string {
  if (selection.kind === "member") {
    const meta = [selection.member.company, selection.member.city].filter(Boolean).join(" · ");
    return `Je te recommande ${selection.member.name} sur Connexio${meta ? ` — ${meta}` : ""}. Je pense que cette mise en relation pourrait être pertinente.`;
  }
  const details = [selection.contact.phone ? `Tél. ${selection.contact.phone}` : "", selection.contact.email ? `Email ${selection.contact.email}` : ""].filter(Boolean).join(" · ");
  return `Je te recommande ${selection.contact.displayName}${details ? ` — ${details}` : ""}. Je pense que cette mise en relation pourrait être pertinente.`;
}

function recommendationAttachment(selection: RecommendationSelection): MessageAttachment {
  if (selection.kind === "member") {
    const uri = selection.member.webProfileUrl ?? `${env.businessWebBaseUrl.replace(/\/$/, "")}/profile/${encodeURIComponent(selection.member.id)}`;
    return { id: `contact-${Crypto.randomUUID()}`, kind: "contact", name: selection.member.name, uri, downloadUrl: uri, mimeType: "Profil Connexio", transcript: [selection.member.company, selection.member.city].filter(Boolean).join(" · "), status: "ready" };
  }
  const uri = selection.contact.phone ? `tel:${selection.contact.phone.replace(/\s+/g, "")}` : selection.contact.email ? `mailto:${selection.contact.email}` : undefined;
  return { id: `contact-${Crypto.randomUUID()}`, kind: "contact", name: selection.contact.displayName, uri, downloadUrl: uri, mimeType: "Contact du téléphone", transcript: [selection.contact.phone, selection.contact.email].filter(Boolean).join(" · "), status: "ready" };
}

export default function ContactActionsScreen() {
  const params = useLocalSearchParams<{ intent?: string | string[]; recipientId?: string | string[]; conversationId?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const rawIntent = first(params.intent);
  const intent: ContactIntent = rawIntent === "recommend" ? "recommend" : rawIntent === "message" ? "message" : "invite";
  const recipientId = first(params.recipientId);
  const conversationId = first(params.conversationId);
  const { accessToken, currentUser } = useSession();
  const { members, localConversations, createPrivateConversation, sendLocalMessage } = useExperience();
  const { visibleConversations, refreshConversations, sendMessage } = useMessaging();
  const api = useMemo(() => env.mockMode ? null : new NeptuneExperienceApi(accessToken), [accessToken]);
  const recipient = members.find((member) => member.id === recipientId);
  const targetConversation = [...visibleConversations, ...localConversations].find((conversation) => conversation.id === conversationId);
  const [source, setSource] = useState<RecommendationSource>("connexio");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<RecommendationSelection | null>(null);
  const [inviteContacts, setInviteContacts] = useState<SelectedDeviceContact[]>([]);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsRequired, setSettingsRequired] = useState(false);

  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const memberResults = useMemo(() => {
    const candidates = members.filter((member) => member.id !== currentUser.id && member.id !== recipientId);
    if (!normalizedQuery) return candidates.slice(0, 14);
    return candidates.filter((member) => [member.name, member.company, member.city, member.roleLabel].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(normalizedQuery)).slice(0, 24);
  }, [currentUser.id, members, normalizedQuery, recipientId]);

  const pick = async () => {
    if (picking) return;
    setPicking(true); setError(null); setSettingsRequired(false);
    try {
      const contact = await pickDeviceContact();
      if (!contact && Platform.OS === "web") setError("La sélection de contacts du téléphone est disponible dans l’application Android et iOS.");
      else if (contact && intent === "invite") setInviteContacts((previous) => previous.some((item) => item.id === contact.id) ? previous : [...previous, contact]);
      else if (contact) setSelection({ kind: "device", contact });
    } catch (cause) {
      if (cause instanceof DeviceContactPermissionError) {
        setSettingsRequired(!cause.canAskAgain);
        setError(cause.canAskAgain ? "L’accès aux contacts a été refusé. Touchez à nouveau le bouton pour autoriser Connexio." : "L’accès aux contacts est bloqué. Réactivez l’autorisation Contacts dans les réglages du téléphone.");
      } else setError("Connexio n’a pas pu ouvrir le sélecteur de contacts. Vérifiez l’autorisation Contacts.");
    } finally { setPicking(false); }
  };

  const ensureRecipientConversation = async (): Promise<Conversation> => {
    if (!recipient) throw new Error("Le membre destinataire n’est plus disponible.");
    const existing = [...visibleConversations, ...localConversations].find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(recipient.id));
    if (existing) return existing;
    if (api) { const conversation = await api.createPrivateConversation([recipient.id]); await refreshConversations(); return conversation; }
    return createPrivateConversation({ memberIds: [recipient.id] });
  };

  const selectedDeviceContact = selection?.kind === "device" ? selection.contact : null;
  const selectedMember = selection?.kind === "member" ? selection.member : null;

  const openSmsInvitation = async () => {
    const valid = inviteContacts.filter((contact) => contact.phone?.trim());
    if (valid.length === 0) { setError("Sélectionnez au moins un contact disposant d’un numéro de téléphone."); return; }
    const primary = valid[0]!;
    const firstName = valid.length === 1 ? primary.displayName.split(" ")[0] : "";
    const body = valid.length === 1
      ? `Bonjour ${firstName || primary.displayName}, je t’invite à découvrir Connexio by Neptune, l’app de mise en relation du réseau Neptune Business. ${env.businessWebBaseUrl}`
      : `Je vous invite à découvrir Connexio by Neptune, l’app de mise en relation du réseau Neptune Business. ${env.businessWebBaseUrl}`;
    const recipients = valid.map((contact) => contact.phone!.replace(/[\s().-]/g, "")).join(",");
    const separator = Platform.OS === "ios" ? "&" : "?";
    const url = `sms:${recipients}${separator}body=${encodeURIComponent(body)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error();
      await Linking.openURL(url);
    } catch { setError("L’application SMS n’a pas pu être ouverte. Vérifiez qu’une application de messagerie SMS est disponible."); }
  };

  const sendRecommendation = async () => {
    if (!selection || sending) return;
    setSending(true); setConfirmOpen(false); setError(null);
    try {
      const body = recommendationBody(selection);
      const attachment = recommendationAttachment(selection);
      const conversation = intent === "message" ? targetConversation : await ensureRecipientConversation();
      if (!conversation) throw new Error("La conversation n’est plus disponible.");
      restorePrivateConversation(conversation.id);
      const accepted = conversation.id.startsWith("local-")
        ? await sendLocalMessage(conversation.id, body, undefined, [attachment])
        : await sendMessage(conversation.id, body, undefined, [attachment]);
      if (!accepted) throw new Error("La recommandation n’a pas été envoyée.");
      router.replace(`/chat/${encodeURIComponent(conversation.id)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "La recommandation n’a pas pu être envoyée."); }
    finally { setSending(false); }
  };

  const recommendationMode = intent !== "invite";
  const title = intent === "recommend" ? "Recommander un contact" : intent === "message" ? "Ajouter une recommandation" : "Inviter par SMS";
  const subtitle = intent === "message" ? `Dans ${targetConversation?.name ?? "la conversation"}` : recommendationMode ? "Membre Connexio ou contact du téléphone" : "Choisissez un ou plusieurs contacts";
  const selectedLabel = selectedMember?.name ?? selectedDeviceContact?.displayName ?? "ce contact";
  const confirmTarget = intent === "message" ? targetConversation?.name ?? "la conversation" : recipient?.name ?? "ce membre";

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), backgroundColor: theme.shellBackground, borderBottomColor: theme.shellBorder }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: theme.pageText }]}>{title}</Text><Text style={[styles.headerSubtitle, { color: theme.pageTextMuted }]} numberOfLines={1}>{subtitle}</Text></View>
        <ThemeModeButton />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 30, 42) }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {intent === "recommend" && recipient ? <View style={[styles.recipientCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Text style={[styles.overline, { color: theme.orange }]}>RECOMMANDER À</Text><View style={styles.recipientRow}><StatusAvatar user={recipient} size={48} /><View style={styles.recipientCopy}><Text style={[styles.recipientName, { color: theme.pageText }]}>{recipient.name}</Text><Text style={[styles.recipientMeta, { color: theme.pageTextMuted }]}>{recipient.company}</Text></View></View></View> : null}

        {recommendationMode ? (
          <>
            <View style={[styles.sourceTabs, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
              {(["connexio", "phone"] as const).map((value) => { const active = source === value; return <Pressable key={value} onPress={() => { setSource(value); setSelection(null); setError(null); }} style={[styles.sourceTab, active && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}><Ionicons name={value === "connexio" ? "people-outline" : "phone-portrait-outline"} size={18} color={active ? theme.accent : theme.pageTextMuted} /><Text style={[styles.sourceText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{value === "connexio" ? "Connexio" : "Téléphone"}</Text></Pressable>; })}
            </View>
            {source === "connexio" ? <View style={styles.memberPicker}><View style={[styles.searchShell, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}><Ionicons name="search" size={19} color={theme.pageTextMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Nom, entreprise, ville…" placeholderTextColor={theme.pageTextMuted} style={[styles.searchInput, { color: theme.pageText }]} /></View><View style={styles.results}>{memberResults.map((member) => { const active = selectedMember?.id === member.id; return <Pressable key={member.id} onPress={() => setSelection({ kind: "member", member })} style={[styles.memberRow, { backgroundColor: active ? theme.accentSoft : theme.surface, borderColor: active ? theme.accent : theme.borderSoft }]}><StatusAvatar user={member} size={46} /><View style={styles.memberCopy}><Text style={[styles.memberName, { color: theme.pageText }]}>{member.name}</Text><Text numberOfLines={1} style={[styles.memberMeta, { color: theme.pageTextMuted }]}>{[member.company, member.city].filter(Boolean).join(" · ")}</Text></View><Ionicons name={active ? "checkmark-circle" : "chevron-forward"} size={22} color={active ? theme.accent : theme.pageTextMuted} /></Pressable>; })}{memberResults.length === 0 ? <Text style={[styles.empty, { color: theme.pageTextMuted }]}>Aucun profil ne correspond à cette recherche.</Text> : null}</View></View> : <PhonePickerCard theme={theme} contacts={selectedDeviceContact ? [selectedDeviceContact] : []} picking={picking} error={error} settingsRequired={settingsRequired} onPick={() => void pick()} onRemove={() => setSelection(null)} />}
          </>
        ) : <PhonePickerCard theme={theme} contacts={inviteContacts} picking={picking} error={error} settingsRequired={settingsRequired} onPick={() => void pick()} onRemove={(id) => setInviteContacts((previous) => previous.filter((item) => item.id !== id))} multi />}

        {error && source !== "phone" && recommendationMode ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger, backgroundColor: theme.dangerSoft }]}>{error}</Text> : null}
        {recommendationMode && selection ? <Pressable accessibilityRole="button" disabled={sending} onPress={() => setConfirmOpen(true)} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>{sending ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="paper-plane" size={20} color={colors.white} /><Text style={styles.primaryText}>Envoyer la recommandation</Text></>}</Pressable> : null}
        {intent === "invite" && inviteContacts.length > 0 ? <Pressable accessibilityRole="button" onPress={() => void openSmsInvitation()} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Ionicons name="chatbubble-ellipses" size={21} color={colors.white} /><Text style={styles.primaryText}>{inviteContacts.length > 1 ? `Préparer ${inviteContacts.length} invitations SMS` : "Préparer l’invitation SMS"}</Text></Pressable> : null}
        {intent === "invite" ? <Text style={[styles.smsNote, { color: theme.pageTextMuted }]}>Connexio prépare le SMS avec le destinataire et le texte déjà renseignés. Android/iOS demandent ensuite la validation finale dans l’application SMS du téléphone.</Text> : null}
      </ScrollView>

      <ConfirmationDialog visible={confirmOpen} icon="people-outline" title={`Recommander ${selectedLabel} ?`} message={`${confirmTarget} recevra une carte contact directement dans la conversation.`} confirmLabel="Envoyer" onCancel={() => setConfirmOpen(false)} onConfirm={() => void sendRecommendation()} />
    </LinearGradient>
  );
}

function PhonePickerCard({ theme, contacts, picking, error, settingsRequired, onPick, onRemove, multi = false }: { theme: ReturnType<typeof useAppTheme>; contacts: SelectedDeviceContact[]; picking: boolean; error: string | null; settingsRequired: boolean; onPick: () => void; onRemove: (id?: string) => void; multi?: boolean }) {
  return <View style={[styles.phoneSection, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><View style={styles.privacyRow}><View style={[styles.privacyIcon, { backgroundColor: theme.successSoft }]}><Ionicons name="shield-checkmark" size={24} color={theme.success} /></View><View style={styles.privacyCopy}><Text style={[styles.privacyTitle, { color: theme.pageText }]}>Votre carnet reste sur votre téléphone</Text><Text style={[styles.privacyText, { color: theme.pageTextMuted }]}>Seuls les contacts choisis sont utilisés. Aucun import automatique du carnet.</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel="Choisir un contact du téléphone" disabled={picking} onPress={onPick} style={({ pressed }) => [styles.pickerButton, pressed && styles.pressed]}>{picking ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="person-add-outline" size={22} color={colors.white} /><Text style={styles.pickerText}>{contacts.length ? (multi ? "Ajouter un autre contact" : "Choisir une autre personne") : "Choisir dans mes contacts"}</Text></>}</Pressable><View style={styles.selectedList}>{contacts.map((contact) => <View key={contact.id} style={[styles.selectedCard, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}><View style={[styles.contactCircle, { backgroundColor: theme.accentSoft }]}><Text style={[styles.contactInitial, { color: theme.accent }]}>{contact.displayName.slice(0, 1).toLocaleUpperCase("fr")}</Text></View><View style={styles.selectedCopy}><Text style={[styles.selectedName, { color: theme.pageText }]}>{contact.displayName}</Text>{contact.phone ? <Text style={[styles.selectedMeta, { color: theme.pageTextMuted }]}>{contact.phone}</Text> : <Text style={[styles.selectedMeta, { color: theme.warning }]}>Aucun numéro SMS</Text>}</View><Pressable accessibilityLabel={`Retirer ${contact.displayName}`} onPress={() => onRemove(contact.id)} style={styles.removeButton}><Ionicons name="close" size={19} color={theme.pageTextMuted} /></Pressable></View>)}</View>{error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger, backgroundColor: theme.dangerSoft }]}>{error}</Text> : null}{settingsRequired ? <Pressable onPress={() => void Linking.openSettings()} style={[styles.settingsButton, { borderColor: theme.border, backgroundColor: theme.surfaceStrong }]}><Ionicons name="settings-outline" size={18} color={theme.pageText} /><Text style={[styles.settingsText, { color: theme.pageText }]}>Ouvrir les réglages de Connexio</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, gap: 4 }, headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "center", minWidth: 0 }, headerTitle: { ...typography.heading3, textAlign: "center" }, headerSubtitle: { fontSize: 11, marginTop: 2, textAlign: "center" },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", padding: spacing.md, gap: 12 }, recipientCard: { borderWidth: 1, borderRadius: 20, padding: 13 }, overline: { fontSize: 10, fontWeight: "900", letterSpacing: 1 }, recipientRow: { marginTop: 9, flexDirection: "row", alignItems: "center", gap: 10 }, recipientCopy: { flex: 1, minWidth: 0 }, recipientName: { fontSize: 15, fontWeight: "900" }, recipientMeta: { fontSize: 12, marginTop: 2 },
  sourceTabs: { height: 56, padding: 3, borderRadius: 17, borderWidth: 1, flexDirection: "row", overflow: "hidden", gap: 3 }, sourceTab: { flex: 1, height: 48, borderRadius: 13, borderWidth: 1, borderColor: "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, sourceText: { fontSize: 12, fontWeight: "900" },
  memberPicker: { gap: 10 }, searchShell: { minHeight: 52, paddingHorizontal: 13, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 }, searchInput: { flex: 1, minHeight: 48, fontSize: 14 }, results: { gap: 7 }, memberRow: { minHeight: 66, padding: 9, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, memberCopy: { flex: 1, minWidth: 0 }, memberName: { fontSize: 14, fontWeight: "900" }, memberMeta: { fontSize: 11, marginTop: 3 }, empty: { textAlign: "center", paddingVertical: 28, fontSize: 13 },
  phoneSection: { borderWidth: 1, borderRadius: 22, padding: 13, gap: 12 }, privacyRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" }, privacyIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" }, privacyCopy: { flex: 1, minWidth: 0 }, privacyTitle: { fontSize: 14, fontWeight: "900" }, privacyText: { fontSize: 12, lineHeight: 17, marginTop: 3 }, pickerButton: { minHeight: 50, borderRadius: 17, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 }, pickerText: { color: colors.white, fontSize: 13, fontWeight: "900" }, selectedList: { gap: 7 }, selectedCard: { minHeight: 62, padding: 8, borderWidth: 1, borderRadius: 17, flexDirection: "row", alignItems: "center", gap: 9 }, contactCircle: { width: 43, height: 43, borderRadius: 15, alignItems: "center", justifyContent: "center" }, contactInitial: { fontSize: 16, fontWeight: "900" }, selectedCopy: { flex: 1, minWidth: 0 }, selectedName: { fontSize: 13, fontWeight: "900" }, selectedMeta: { fontSize: 11, marginTop: 2 }, removeButton: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  primary: { minHeight: 54, borderRadius: 18, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 }, primaryText: { color: colors.white, fontSize: 14, fontWeight: "900", textAlign: "center" }, smsNote: { fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 10 }, error: { padding: 10, borderRadius: 14, fontSize: 12, lineHeight: 17, fontWeight: "700" }, settingsButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 }, settingsText: { fontSize: 12, fontWeight: "900" }, pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] }
});
