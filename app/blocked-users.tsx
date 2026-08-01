import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { env } from "@/config/env";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneAccountApi } from "@/services/api/accountApi";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import type { AppUser } from "@/types/messaging";

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useSession();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneAccountApi(accessToken)),
    [accessToken]
  );
  const [blockedMembers, setBlockedMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(!env.mockMode);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    setLoading(true);
    void api
      .listBlockedMembers()
      .then((members) => {
        if (!cancelled) setBlockedMembers(members);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          Alert.alert(
            "Liste indisponible",
            error instanceof Error ? error.message : "Réessayez ultérieurement."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const unblock = (member: AppUser) => {
    Alert.alert(
      `Débloquer ${member.name} ?`,
      "Cette personne pourra de nouveau vous contacter, vous mentionner et vous inviter selon vos autres réglages.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Débloquer",
          onPress: () => {
            setUnblockingId(member.id);
            if (!api) {
              setBlockedMembers((previous) =>
                previous.filter((item) => item.id !== member.id)
              );
              setUnblockingId(null);
              return;
            }
            void api
              .unblockMember(member.id)
              .then(() =>
                setBlockedMembers((previous) =>
                  previous.filter((item) => item.id !== member.id)
                )
              )
              .catch((error: unknown) =>
                Alert.alert(
                  "Déblocage impossible",
                  error instanceof Error ? error.message : "Réessayez ultérieurement."
                )
              )
              .finally(() => setUnblockingId(null));
          }
        }
      ]
    );
  };

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
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Membres bloqués
        </Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.violet} />
            <Text style={styles.loadingText}>Chargement des blocages…</Text>
          </View>
        ) : blockedMembers.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="person-remove-outline"
                size={31}
                color={colors.textMuted}
              />
            </View>
            <Text style={styles.title}>Aucun membre bloqué</Text>
            <Text style={styles.subtitle}>
              Les blocages décidés depuis un profil apparaîtront ici et seront
              appliqués à la messagerie, aux appels, aux invitations et aux mentions.
            </Text>
          </View>
        ) : (
          <View style={styles.panel}>
            {blockedMembers.map((member, index) => (
              <View
                key={member.id}
                style={[
                  styles.memberRow,
                  index < blockedMembers.length - 1 && styles.divider
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir le profil de ${member.name}`}
                  onPress={() =>
                    router.push(`/profile/${encodeURIComponent(member.id)}`)
                  }
                  style={styles.identity}
                >
                  <View style={styles.avatar}>
                    {member.avatarUrl ? (
                      <Image
                        source={{ uri: member.avatarUrl }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.initials}>{member.initials}</Text>
                    )}
                  </View>
                  <View style={styles.memberContent}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.name}
                    </Text>
                    <Text style={styles.memberMeta} numberOfLines={1}>
                      {member.company} · {member.city}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Débloquer ${member.name}`}
                  accessibilityState={{ busy: unblockingId === member.id }}
                  disabled={Boolean(unblockingId)}
                  onPress={() => unblock(member)}
                  style={styles.unblockButton}
                >
                  {unblockingId === member.id ? (
                    <ActivityIndicator size="small" color={colors.orange} />
                  ) : (
                    <Text style={styles.unblockText}>Débloquer</Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.ruleCard}>
          <Text style={styles.ruleTitle}>Effets du blocage</Text>
          {[
            "Messages privés, appels, invitations et mentions ciblées sont bloqués.",
            "La personne bloquée n’est pas informée de cette action.",
            "Les groupes officiels restent soumis aux règles de modération Neptune.",
            "Le déblocage ne restaure pas les anciennes invitations ni les messages supprimés."
          ].map((rule) => (
            <View key={rule} style={styles.ruleRow}>
              <Ionicons name="checkmark-circle" size={17} color={colors.success} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 58,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center"
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.text,
    flex: 1,
    textAlign: "center"
  },
  content: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingHorizontal: spacing.md
  },
  loadingCard: {
    marginTop: spacing.lg,
    minHeight: 190,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  loadingText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  emptyCard: {
    marginTop: spacing.lg,
    minHeight: 240,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    ...typography.heading2,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.md
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 7
  },
  panel: {
    marginTop: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  memberRow: {
    minHeight: 78,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  identity: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: { width: "100%", height: "100%" },
  initials: { color: colors.text, fontSize: 10, fontWeight: "900" },
  memberContent: { flex: 1, minWidth: 0 },
  memberName: { color: colors.text, fontSize: 13, fontWeight: "900" },
  memberMeta: { color: colors.textMuted, fontSize: 9.5, marginTop: 3 },
  unblockButton: {
    minWidth: 84,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  unblockText: { color: colors.orange, fontSize: 10, fontWeight: "900" },
  ruleCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface
  },
  ruleTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10
  },
  ruleRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  ruleText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 }
});
