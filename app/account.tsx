import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusAvatar } from "@/components/StatusAvatar";
import { ThemeModeButton } from "@/components/ThemeModeButton";
import { capabilitiesForBackendContract } from "@/config/backendCapabilities";
import { env } from "@/config/env";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { NeptuneAccountApi, type AccountSession } from "@/services/api/accountApi";
import { radii, spacing, typography } from "@/theme";

const demoSessions: AccountSession[] = [{ id: "demo-current", deviceName: "Cet appareil", platform: "Connexio", createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), current: true, approximateLocation: "France" }];
const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentUser, accessToken, refreshAccessToken, signOut } = useSession();
  const api = useMemo(() => env.mockMode ? null : new NeptuneAccountApi(accessToken), [accessToken]);
  const [sessions, setSessions] = useState<AccountSession[]>(env.mockMode ? demoSessions : []);
  const [loading, setLoading] = useState(!env.mockMode);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [deletionPassword, setDeletionPassword] = useState("");

  const loadSessions = async () => {
    if (!api || !BACKEND_CAPABILITIES.accountSessions) { setLoading(false); return; }
    setLoading(true);
    try { setSessions(await api.listSessions()); }
    catch (error) { Alert.alert("Sessions indisponibles", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadSessions(); }, [api]);

  const exportData = async () => {
    if (busyAction) return;
    setBusyAction("export");
    try {
      if (!api) {
        await Share.share({ title: "Export Connexio", message: JSON.stringify({ exportedAt: new Date().toISOString(), profile: currentUser, note: "Export de démonstration local" }, null, 2) });
        return;
      }
      const result = await api.requestDataExport();
      if (!(await Linking.canOpenURL(result.downloadUrl))) throw new Error("Le lien sécurisé d’export ne peut pas être ouvert.");
      await Linking.openURL(result.downloadUrl);
    } catch (error) { Alert.alert("Export impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
    finally { setBusyAction(null); }
  };

  const resyncProfile = async () => {
    if (busyAction) return;
    setBusyAction("resync");
    try { if (api) { await api.resyncProfile(); await refreshAccessToken(); } Alert.alert("Profil synchronisé", "Les informations Neptune Business sont maintenant à jour."); }
    catch (error) { Alert.alert("Synchronisation impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
    finally { setBusyAction(null); }
  };

  const revokeSession = (session: AccountSession) => {
    if (session.current) { Alert.alert("Session actuelle", "Utilisez le bouton Déconnexion pour fermer cette session."); return; }
    Alert.alert("Révoquer cette session ?", `${session.deviceName} sera immédiatement déconnecté.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Révoquer", style: "destructive", onPress: () => {
        if (!api) { setSessions((previous) => previous.filter((item) => item.id !== session.id)); return; }
        setBusyAction(session.id);
        void api.revokeSession(session.id).then(() => setSessions((previous) => previous.filter((item) => item.id !== session.id))).catch((error: unknown) => Alert.alert("Révocation impossible", error instanceof Error ? error.message : "Réessayez ultérieurement.")).finally(() => setBusyAction(null));
      } }
    ]);
  };

  const deleteAccount = () => {
    if (!deletionPassword) { Alert.alert("Mot de passe requis", "Confirmez la suppression avec le mot de passe de votre compte Neptune."); return; }
    Alert.alert("Supprimer définitivement le compte ?", "Cette demande révoque les sessions et lance le traitement de suppression des données selon les obligations applicables.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer mon compte", style: "destructive", onPress: () => {
        setBusyAction("delete");
        void (async () => {
          try { if (api) await api.requestAccountDeletion(deletionPassword); await signOut(); router.replace("/sign-in"); }
          catch (error) { Alert.alert("Suppression impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
          finally { setBusyAction(null); }
        })();
      } }
    ]);
  };

  const menuItems = [
    { icon: "notifications-outline" as const, title: "Notifications", subtitle: "Messages, mentions, groupes, Temps forts et appels", route: "/notification-settings" as const },
    { icon: "shield-outline" as const, title: "Confidentialité", subtitle: "Map, présence, téléphone et visibilité du profil", route: "/privacy" as const },
    { icon: "person-remove-outline" as const, title: "Membres bloqués", subtitle: "Consulter et débloquer les membres", route: "/blocked-users" as const },
    { icon: "help-circle-outline" as const, title: "Aide à la connexion", subtitle: "Code à usage unique et assistance Neptune", route: "/access-help" as const }
  ].filter((item) => item.route !== "/notification-settings" || BACKEND_CAPABILITIES.notificationPreferences)
   .filter((item) => item.route !== "/blocked-users" || BACKEND_CAPABILITIES.blockedMembers);

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), backgroundColor: theme.shellBackground, borderBottomColor: theme.shellBorder }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.pageText }]}>Compte</Text>
        <ThemeModeButton />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <StatusAvatar user={currentUser} size={88} showBadge />
          <Text style={[styles.name, { color: theme.pageText }]}>{currentUser.name}</Text>
          <Text style={[styles.company, { color: theme.pageTextSecondary }]}>{currentUser.company}</Text>
          <Text style={[styles.meta, { color: theme.pageTextMuted }]}>{currentUser.roleLabel} · {currentUser.city}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ busy: busyAction === "resync" }} disabled={Boolean(busyAction)} onPress={() => void resyncProfile()} style={[styles.syncButton, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>{busyAction === "resync" ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="sync" size={17} color={theme.pageText} />}<Text style={[styles.syncText, { color: theme.pageTextSecondary }]}>Resynchroniser Neptune Business</Text></Pressable>
        </View>

        <View style={[styles.panel, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>{menuItems.map((item, index) => <Pressable key={item.title} accessibilityRole="button" onPress={() => router.push(item.route)} style={[styles.menuRow, index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.borderSoft }]}><View style={[styles.menuIcon, { backgroundColor: theme.surfaceStrong }]}><Ionicons name={item.icon} size={21} color={theme.orange} /></View><View style={styles.menuContent}><Text style={[styles.menuTitle, { color: theme.pageText }]}>{item.title}</Text><Text style={[styles.menuSubtitle, { color: theme.pageTextMuted }]}>{item.subtitle}</Text></View><Ionicons name="chevron-forward" size={19} color={theme.pageTextMuted} /></Pressable>)}</View>

        {BACKEND_CAPABILITIES.accountSessions ? <><Text style={[styles.sectionTitle, { color: theme.pageText }]}>Appareils et sessions</Text><View style={[styles.panel, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>{loading ? <View style={styles.loadingSessions}><ActivityIndicator color={theme.violet} /></View> : sessions.length > 0 ? sessions.map((session, index) => <Pressable key={session.id} accessibilityRole="button" onPress={() => revokeSession(session)} style={[styles.sessionRow, index < sessions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.borderSoft }]}><View style={[styles.menuIcon, { backgroundColor: theme.surfaceStrong }]}><Ionicons name={session.current ? "phone-portrait" : "desktop-outline"} size={21} color={session.current ? theme.success : theme.pageTextMuted} /></View><View style={styles.menuContent}><Text style={[styles.menuTitle, { color: theme.pageText }]}>{session.deviceName}{session.current ? " · actuel" : ""}</Text><Text style={[styles.menuSubtitle, { color: theme.pageTextMuted }]}>{session.platform} · {new Date(session.lastSeenAt).toLocaleString("fr-FR")}{session.approximateLocation ? ` · ${session.approximateLocation}` : ""}</Text></View>{busyAction === session.id ? <ActivityIndicator size="small" color={theme.violet} /> : <Ionicons name={session.current ? "checkmark-circle" : "close-circle-outline"} size={20} color={session.current ? theme.success : theme.danger} />}</Pressable>) : <Text style={[styles.emptyText, { color: theme.pageTextMuted }]}>Aucune session active trouvée.</Text>}</View></> : null}

        {BACKEND_CAPABILITIES.accountExport ? <Pressable accessibilityRole="button" accessibilityState={{ busy: busyAction === "export" }} disabled={Boolean(busyAction)} onPress={() => void exportData()} style={[styles.exportButton, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>{busyAction === "export" ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="download-outline" size={20} color={theme.pageText} />}<Text style={[styles.exportText, { color: theme.pageTextSecondary }]}>Télécharger mes données</Text></Pressable> : null}

        <View style={[styles.deletionField, { borderColor: theme.danger, backgroundColor: theme.surface }]}><Text style={[styles.deletionLabel, { color: theme.pageTextSecondary }]}>Confirmer avec votre mot de passe Neptune</Text><TextInput value={deletionPassword} onChangeText={setDeletionPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" accessibilityLabel="Mot de passe pour supprimer le compte" placeholder="Votre mot de passe" placeholderTextColor={theme.pageTextMuted} style={[styles.deletionInput, { borderColor: theme.borderSoft, backgroundColor: theme.inputBackground, color: theme.pageText }]} /></View>
        <Pressable accessibilityRole="button" disabled={Boolean(busyAction)} onPress={deleteAccount} style={[styles.deleteButton, { borderColor: theme.danger, backgroundColor: theme.dangerSoft }]}>{busyAction === "delete" ? <ActivityIndicator size="small" color={theme.danger} /> : <Ionicons name="trash-outline" size={20} color={theme.danger} />}<Text style={[styles.deleteText, { color: theme.danger }]}>Supprimer mon compte</Text></Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, headerTitle: { ...typography.heading3, flex: 1, textAlign: "center" }, content: { width: "100%", maxWidth: 660, alignSelf: "center", paddingHorizontal: spacing.md },
  profileCard: { paddingVertical: spacing.lg, alignItems: "center" }, name: { ...typography.heading2, marginTop: 12 }, company: { ...typography.bodySmall, marginTop: 3 }, meta: { fontSize: 11, marginTop: 4 }, syncButton: { minHeight: 48, marginTop: 12, paddingHorizontal: 13, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, syncText: { fontSize: 11, fontWeight: "900" },
  panel: { borderRadius: radii.xl, borderWidth: 1, overflow: "hidden" }, menuRow: { minHeight: 74, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: 11 }, sessionRow: { minHeight: 76, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: 11 }, menuIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, menuContent: { flex: 1, minWidth: 0 }, menuTitle: { fontSize: 14, fontWeight: "900" }, menuSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 3 }, sectionTitle: { ...typography.heading3, marginTop: spacing.lg, marginBottom: 8 }, loadingSessions: { minHeight: 90, alignItems: "center", justifyContent: "center" }, emptyText: { ...typography.bodySmall, textAlign: "center", padding: spacing.lg },
  exportButton: { minHeight: 52, marginTop: spacing.md, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, exportText: { fontSize: 14, fontWeight: "900" }, deletionField: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1 }, deletionLabel: { fontSize: 14, fontWeight: "800", marginBottom: 8 }, deletionInput: { minHeight: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, fontSize: 16 }, deleteButton: { minHeight: 52, marginTop: spacing.sm, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, deleteText: { fontSize: 14, fontWeight: "900" }
});
