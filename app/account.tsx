import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { env } from "@/config/env";
import { useSession } from "@/providers/SessionProvider";
import {
  NeptuneAccountApi,
  type AccountSession
} from "@/services/api/accountApi";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import { StatusAvatar } from "@/components/StatusAvatar";

const demoSessions: AccountSession[] = [
  {
    id: "demo-current",
    deviceName: "Cet appareil",
    platform: "Connexio",
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    current: true,
    approximateLocation: "France"
  }
];

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    accessToken,
    refreshAccessToken,
    signOut
  } = useSession();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneAccountApi(accessToken)),
    [accessToken]
  );
  const [sessions, setSessions] = useState<AccountSession[]>(
    env.mockMode ? demoSessions : []
  );
  const [loading, setLoading] = useState(!env.mockMode);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadSessions = async () => {
    if (!api) return;
    setLoading(true);
    try {
      setSessions(await api.listSessions());
    } catch (error) {
      Alert.alert(
        "Sessions indisponibles",
        error instanceof Error ? error.message : "Réessayez ultérieurement."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, [api]);

  const exportData = async () => {
    if (busyAction) return;
    setBusyAction("export");
    try {
      if (!api) {
        await Share.share({
          title: "Export Connexio",
          message: JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              profile: currentUser,
              note: "Export de démonstration local"
            },
            null,
            2
          )
        });
        return;
      }
      const result = await api.requestDataExport();
      const supported = await Linking.canOpenURL(result.downloadUrl);
      if (!supported) {
        throw new Error("Le lien sécurisé d’export ne peut pas être ouvert.");
      }
      await Linking.openURL(result.downloadUrl);
    } catch (error) {
      Alert.alert(
        "Export impossible",
        error instanceof Error ? error.message : "Réessayez ultérieurement."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const resyncProfile = async () => {
    if (busyAction) return;
    setBusyAction("resync");
    try {
      if (api) {
        await api.resyncProfile();
        await refreshAccessToken();
      }
      Alert.alert(
        "Profil synchronisé",
        "Les informations Neptune Business sont maintenant à jour."
      );
    } catch (error) {
      Alert.alert(
        "Synchronisation impossible",
        error instanceof Error ? error.message : "Réessayez ultérieurement."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const revokeSession = (session: AccountSession) => {
    if (session.current) {
      Alert.alert(
        "Session actuelle",
        "Utilisez le bouton Déconnexion pour fermer cette session."
      );
      return;
    }
    Alert.alert(
      "Révoquer cette session ?",
      `${session.deviceName} sera immédiatement déconnecté.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Révoquer",
          style: "destructive",
          onPress: () => {
            if (!api) {
              setSessions((previous) =>
                previous.filter((item) => item.id !== session.id)
              );
              return;
            }
            setBusyAction(session.id);
            void api
              .revokeSession(session.id)
              .then(() =>
                setSessions((previous) =>
                  previous.filter((item) => item.id !== session.id)
                )
              )
              .catch((error: unknown) =>
                Alert.alert(
                  "Révocation impossible",
                  error instanceof Error ? error.message : "Réessayez ultérieurement."
                )
              )
              .finally(() => setBusyAction(null));
          }
        }
      ]
    );
  };

  const deleteAccount = () => {
    Alert.alert(
      "Supprimer définitivement le compte ?",
      "Cette demande révoque les sessions et lance le traitement de suppression des données selon les obligations applicables.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer mon compte",
          style: "destructive",
          onPress: () => {
            setBusyAction("delete");
            void (async () => {
              try {
                if (api) await api.requestAccountDeletion();
                await signOut();
                router.replace("/sign-in");
              } catch (error) {
                Alert.alert(
                  "Suppression impossible",
                  error instanceof Error ? error.message : "Réessayez ultérieurement."
                );
              } finally {
                setBusyAction(null);
              }
            })();
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      icon: "notifications-outline" as const,
      title: "Notifications",
      subtitle: "Messages, mentions, groupes, Temps forts et appels",
      route: "/notification-settings" as const
    },
    {
      icon: "shield-outline" as const,
      title: "Confidentialité",
      subtitle: "Map, présence, téléphone et visibilité du profil",
      route: "/privacy" as const
    },
    {
      icon: "person-remove-outline" as const,
      title: "Membres bloqués",
      subtitle: "Consulter et débloquer les membres",
      route: "/blocked-users" as const
    },
    {
      icon: "help-circle-outline" as const,
      title: "Aide à la connexion",
      subtitle: "Code à usage unique et assistance Neptune",
      route: "/access-help" as const
    }
  ];

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Compte</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <StatusAvatar user={currentUser} size={88} showBadge />
          <Text style={styles.name}>{currentUser.name}</Text>
          <Text style={styles.company}>{currentUser.company}</Text>
          <Text style={styles.meta}>
            {currentUser.roleLabel} · {currentUser.city}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: busyAction === "resync" }}
            disabled={Boolean(busyAction)}
            onPress={() => void resyncProfile()}
            style={styles.syncButton}
          >
            {busyAction === "resync" ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="sync" size={17} color={colors.text} />
            )}
            <Text style={styles.syncText}>Resynchroniser Neptune Business</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              onPress={() => router.push(item.route)}
              style={[
                styles.menuRow,
                index < menuItems.length - 1 && styles.divider
              ]}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={21} color={colors.orange} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Appareils et sessions</Text>
        <View style={styles.panel}>
          {loading ? (
            <View style={styles.loadingSessions}>
              <ActivityIndicator color={colors.violet} />
            </View>
          ) : sessions.length > 0 ? (
            sessions.map((session, index) => (
              <Pressable
                key={session.id}
                accessibilityRole="button"
                onPress={() => revokeSession(session)}
                style={[
                  styles.sessionRow,
                  index < sessions.length - 1 && styles.divider
                ]}
              >
                <View style={styles.menuIcon}>
                  <Ionicons
                    name={session.current ? "phone-portrait" : "desktop-outline"}
                    size={21}
                    color={session.current ? colors.success : colors.textMuted}
                  />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>
                    {session.deviceName}{session.current ? " · actuel" : ""}
                  </Text>
                  <Text style={styles.menuSubtitle}>
                    {session.platform} · {new Date(session.lastSeenAt).toLocaleString("fr-FR")}
                    {session.approximateLocation
                      ? ` · ${session.approximateLocation}`
                      : ""}
                  </Text>
                </View>
                {busyAction === session.id ? (
                  <ActivityIndicator size="small" color={colors.violet} />
                ) : (
                  <Ionicons
                    name={session.current ? "checkmark-circle" : "close-circle-outline"}
                    size={20}
                    color={session.current ? colors.success : colors.danger}
                  />
                )}
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucune session active trouvée.</Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: busyAction === "export" }}
          disabled={Boolean(busyAction)}
          onPress={() => void exportData()}
          style={styles.exportButton}
        >
          {busyAction === "export" ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="download-outline" size={20} color={colors.text} />
          )}
          <Text style={styles.exportText}>Télécharger mes données</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={Boolean(busyAction)}
          onPress={deleteAccount}
          style={styles.deleteButton}
        >
          {busyAction === "delete" ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          )}
          <Text style={styles.deleteText}>Supprimer mon compte</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 58, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: colors.text, flex: 1, textAlign: "center" },
  content: { width: "100%", maxWidth: 660, alignSelf: "center", paddingHorizontal: spacing.md },
  profileCard: { paddingVertical: spacing.lg, alignItems: "center" },
  avatarShell: { width: 88, height: 88, padding: 3, borderRadius: 30 },
  avatarInner: { flex: 1, borderRadius: 27, overflow: "hidden", backgroundColor: colors.surfaceStrong, borderWidth: 2, borderColor: colors.surface, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  initials: { color: colors.text, fontSize: 24, fontWeight: "900" },
  name: { ...typography.heading2, color: colors.text, marginTop: 12 },
  company: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 3 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  syncButton: { minHeight: 48, marginTop: 12, paddingHorizontal: 13, borderRadius: 15, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.borderSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  syncText: { color: colors.textSecondary, fontSize: 11, fontWeight: "900" },
  panel: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, overflow: "hidden" },
  menuRow: { minHeight: 74, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: 11 },
  sessionRow: { minHeight: 76, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: 11 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  menuIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  menuContent: { flex: 1, minWidth: 0 },
  menuTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  menuSubtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 3 },
  sectionTitle: { ...typography.heading3, color: colors.text, marginTop: spacing.lg, marginBottom: 8 },
  loadingSessions: { minHeight: 90, alignItems: "center", justifyContent: "center" },
  emptyText: { ...typography.bodySmall, color: colors.textMuted, textAlign: "center", padding: spacing.lg },
  exportButton: { minHeight: 52, marginTop: spacing.md, borderRadius: 17, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  exportText: { color: colors.textSecondary, fontSize: 14, fontWeight: "900" },
  deleteButton: { minHeight: 52, marginTop: spacing.sm, borderRadius: 17, borderWidth: 1, borderColor: "rgba(255,93,115,0.35)", backgroundColor: colors.dangerSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: "900" }
});
