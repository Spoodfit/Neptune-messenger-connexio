import { Text } from "@/components/LocalizedText";
import {
  Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect,
  useMemo,
  useState } from "react";
import { ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppAlert } from "@/services/ui/AppAlert";

import { StatusAvatar } from "@/components/StatusAvatar";
import { ThemeModeButton } from "@/components/ThemeModeButton";
import { env } from "@/config/env";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { NeptuneAccountApi } from "@/services/api/accountApi";
import { radii, spacing, typography } from "@/theme";
import type { AppUser } from "@/types/messaging";

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { accessToken } = useSession();
  const api = useMemo(() => env.mockMode ? null : new NeptuneAccountApi(accessToken), [accessToken]);
  const [blockedMembers, setBlockedMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(!env.mockMode);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    setLoading(true);
    void api.listBlockedMembers().then((members) => { if (!cancelled) setBlockedMembers(members); }).catch((error: unknown) => { if (!cancelled) AppAlert.alert("Liste indisponible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api]);

  const unblock = (member: AppUser) => {
    AppAlert.alert(`Débloquer ${member.name} ?`, "Cette personne pourra de nouveau vous contacter, vous mentionner et vous inviter selon vos autres réglages.", [
      { text: "Annuler", style: "cancel" },
      { text: "Débloquer", onPress: () => {
        setUnblockingId(member.id);
        if (!api) { setBlockedMembers((previous) => previous.filter((item) => item.id !== member.id)); setUnblockingId(null); return; }
        void api.unblockMember(member.id).then(() => setBlockedMembers((previous) => previous.filter((item) => item.id !== member.id))).catch((error: unknown) => AppAlert.alert("Déblocage impossible", error instanceof Error ? error.message : "Réessayez ultérieurement.")).finally(() => setUnblockingId(null));
      } }
    ]);
  };

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), backgroundColor: theme.shellBackground, borderBottomColor: theme.shellBorder }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.pageText }]}>Membres bloqués</Text>
        <ThemeModeButton />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
        {loading ? <View style={[styles.loadingCard, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><ActivityIndicator size="large" color={theme.violet} /><Text style={[styles.loadingText, { color: theme.pageTextMuted }]}>Chargement des blocages…</Text></View> : blockedMembers.length === 0 ? <View style={[styles.emptyCard, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><View style={[styles.iconWrap, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="person-remove-outline" size={31} color={theme.pageTextMuted} /></View><Text style={[styles.title, { color: theme.pageText }]}>Aucun membre bloqué</Text><Text style={[styles.subtitle, { color: theme.pageTextMuted }]}>Les blocages décidés depuis un profil apparaîtront ici et seront appliqués à la messagerie, aux appels, aux invitations et aux mentions.</Text></View> : (
          <View style={[styles.panel, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>{blockedMembers.map((member, index) => <View key={member.id} style={[styles.memberRow, index < blockedMembers.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.borderSoft }]}><Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir le profil de ${member.name}`} onPress={() => router.push(`/profile/${encodeURIComponent(member.id)}`)} style={styles.identity}><StatusAvatar user={member} size={44} accessible={false} /><View style={styles.memberContent}><Text style={[styles.memberName, { color: theme.pageText }]} numberOfLines={1}>{member.name}</Text><Text style={[styles.memberMeta, { color: theme.pageTextMuted }]} numberOfLines={1}>{member.company} · {member.city}</Text></View></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Débloquer ${member.name}`} accessibilityState={{ busy: unblockingId === member.id }} disabled={Boolean(unblockingId)} onPress={() => unblock(member)} style={[styles.unblockButton, { borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong }]}>{unblockingId === member.id ? <ActivityIndicator size="small" color={theme.orange} /> : <Text style={[styles.unblockText, { color: theme.orange }]}>Débloquer</Text>}</Pressable></View>)}</View>
        )}
        <View style={[styles.ruleCard, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><Text style={[styles.ruleTitle, { color: theme.pageText }]}>Effets du blocage</Text>{[
          "Messages privés, appels, invitations et mentions ciblées sont bloqués.",
          "La personne bloquée n’est pas informée de cette action.",
          "Les groupes officiels restent soumis aux règles de modération Neptune.",
          "Le déblocage ne restaure pas les anciennes invitations ni les messages supprimés."
        ].map((rule) => <View key={rule} style={styles.ruleRow}><Ionicons name="checkmark-circle" size={17} color={theme.success} /><Text style={[styles.ruleText, { color: theme.pageTextSecondary }]}>{rule}</Text></View>)}</View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, headerTitle: { ...typography.heading3, flex: 1, textAlign: "center" }, content: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: spacing.md },
  loadingCard: { marginTop: spacing.lg, minHeight: 190, borderRadius: radii.xl, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 10 }, loadingText: { fontSize: 11, fontWeight: "800" }, emptyCard: { marginTop: spacing.lg, minHeight: 240, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, alignItems: "center", justifyContent: "center" }, iconWrap: { width: 68, height: 68, borderRadius: 24, alignItems: "center", justifyContent: "center" }, title: { ...typography.heading2, textAlign: "center", marginTop: spacing.md }, subtitle: { ...typography.body, textAlign: "center", marginTop: 7 },
  panel: { marginTop: spacing.lg, borderRadius: radii.xl, borderWidth: 1, overflow: "hidden" }, memberRow: { minHeight: 78, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 8 }, identity: { flex: 1, minWidth: 0, minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10 }, memberContent: { flex: 1, minWidth: 0 }, memberName: { fontSize: 14, fontWeight: "900" }, memberMeta: { fontSize: 11, marginTop: 3 }, unblockButton: { minWidth: 84, minHeight: 48, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" }, unblockText: { fontSize: 11, fontWeight: "900" },
  ruleCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1 }, ruleTitle: { fontSize: 14, fontWeight: "900", marginBottom: 10 }, ruleRow: { minHeight: 42, flexDirection: "row", alignItems: "flex-start", gap: 8 }, ruleText: { ...typography.bodySmall, flex: 1 }
});
