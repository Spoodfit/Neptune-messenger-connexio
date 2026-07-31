import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useExperience } from "@/providers/ExperienceProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";

export default function MemberProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "");
  const {
    getMember,
    posts,
    localConversations,
    createPrivateConversation
  } = useExperience();
  const member = getMember(id);

  if (!member) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.missing}>
        <Text style={styles.title}>Profil introuvable</Text>
        <Text style={styles.mutedText}>
          Le membre n’est plus visible ou son profil n’a pas encore été synchronisé.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Retour</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const memberPosts = posts.filter((post) => post.author.id === member.id).slice(0, 4);
  const existingConversation = localConversations.find(
    (conversation) =>
      conversation.type === "direct" && conversation.memberIds?.includes(member.id)
  );

  const openMessage = () => {
    const conversation =
      existingConversation ?? createPrivateConversation({ memberIds: [member.id] });
    router.push(`/chat/${encodeURIComponent(conversation.id)}`);
  };

  const callPhone = () => {
    if (!member.phone) {
      Alert.alert(
        "Téléphone non partagé",
        "Le membre n’a pas rendu son numéro disponible dans son profil Neptune."
      );
      return;
    }
    void Linking.openURL(`tel:${member.phone}`);
  };

  const startVideo = () => {
    Alert.alert(
      "Appel vidéo",
      "L’écran et l’action sont prêts. Le développeur devra brancher WebRTC ou le fournisseur retenu, avec signalisation, TURN/STUN et appels entrants."
    );
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, spacing.sm),
            paddingLeft: spacing.sm + insets.left,
            paddingRight: spacing.sm + insets.right
          }
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Profil membre
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Plus d’options"
          onPress={() =>
            Alert.alert(
              "Actions de sécurité",
              "Le blocage et le signalement seront connectés aux règles de modération Neptune."
            )
          }
          style={styles.headerButton}
        >
          <Ionicons name="ellipsis-horizontal" size={23} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingLeft: spacing.md + insets.left,
            paddingRight: spacing.md + insets.right,
            paddingBottom: Math.max(insets.bottom, spacing.xl)
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>
            <View style={styles.avatarInner}>
              {member.avatarUrl ? (
                <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.initials}>{member.initials}</Text>
              )}
            </View>
          </LinearGradient>
          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, !member.online && styles.offlineDot]} />
            <Text style={styles.onlineText}>
              {member.online ? "Disponible" : member.lastSeenAt ? "Vu récemment" : "Hors ligne"}
            </Text>
          </View>
          <Text style={styles.name}>{member.name}</Text>
          <Text style={styles.company}>{member.company}</Text>
          <View style={styles.metaRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{member.roleLabel}</Text>
            </View>
            <View style={styles.cityBadge}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.cityText}>{member.city}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={openMessage} style={styles.action}>
            <LinearGradient colors={gradients.activeTab} style={styles.actionIcon}>
              <Ionicons name="chatbubble-ellipses" size={22} color={colors.text} />
            </LinearGradient>
            <Text style={styles.actionText}>Message</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={callPhone} style={styles.action}>
            <View style={styles.actionIconPlain}>
              <Ionicons name="call-outline" size={22} color={colors.text} />
            </View>
            <Text style={styles.actionText}>Téléphone</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={startVideo} style={styles.action}>
            <View style={styles.actionIconPlain}>
              <Ionicons name="videocam-outline" size={23} color={colors.text} />
            </View>
            <Text style={styles.actionText}>Visio</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Derniers Temps forts</Text>
        {memberPosts.length > 0 ? (
          <View style={styles.posts}>
            {memberPosts.map((post) => (
              <Pressable
                key={post.id}
                onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)}
                style={({ pressed }) => [styles.postCard, pressed && styles.pressed]}
              >
                <View style={styles.postTop}>
                  <View style={styles.kindBadge}>
                    <Text style={styles.kindText}>{post.kind.toLocaleUpperCase("fr")}</Text>
                  </View>
                  <Text style={styles.postDate}>
                    {new Date(post.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short"
                    })}
                  </Text>
                </View>
                <Text style={styles.postBody} numberOfLines={4}>
                  {post.body}
                </Text>
                <View style={styles.postStats}>
                  <Text style={styles.statText}>
                    {post.reactions.reduce((sum, reaction) => sum + reaction.count, 0)} réactions
                  </Text>
                  <Text style={styles.statText}>{post.comments.length} commentaires</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPosts}>
            <Ionicons name="sparkles-outline" size={25} color={colors.textMuted} />
            <Text style={styles.emptyText}>Aucun Temps fort partagé récemment.</Text>
          </View>
        )}

        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
          <Text style={styles.privacyText}>
            Le téléphone, la présence, la localisation et les actions rapides doivent respecter les choix de confidentialité synchronisés depuis Neptune Business.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 58, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: colors.text, flex: 1, textAlign: "center" },
  content: { width: "100%", maxWidth: 680, alignSelf: "center" },
  identity: { alignItems: "center", paddingVertical: spacing.md },
  avatarShell: { width: 104, height: 104, borderRadius: 36, padding: 3 },
  avatarInner: { flex: 1, borderRadius: 33, overflow: "hidden", backgroundColor: colors.surfaceStrong, borderWidth: 2, borderColor: colors.surface, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  initials: { color: colors.text, fontSize: 28, fontWeight: "900" },
  onlineRow: { marginTop: -11, minHeight: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.borderSoft, flexDirection: "row", alignItems: "center", gap: 5, zIndex: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  offlineDot: { backgroundColor: colors.textMuted },
  onlineText: { color: colors.textSecondary, fontSize: 9, fontWeight: "800" },
  name: { ...typography.heading2, color: colors.text, marginTop: 12, textAlign: "center" },
  company: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 3, textAlign: "center" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 7, marginTop: 10 },
  roleBadge: { minHeight: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: "rgba(107,79,234,0.22)", borderWidth: 1, borderColor: "rgba(107,79,234,0.45)", alignItems: "center", justifyContent: "center" },
  roleText: { color: colors.textSecondary, fontSize: 10, fontWeight: "900" },
  cityBadge: { minHeight: 28, paddingHorizontal: 9, borderRadius: 14, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.borderSoft, flexDirection: "row", alignItems: "center", gap: 4 },
  cityText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 8, marginTop: spacing.sm },
  action: { flex: 1, minHeight: 82, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 6 },
  actionIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  actionIconPlain: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  actionText: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  sectionTitle: { ...typography.heading3, color: colors.text, marginTop: spacing.lg, marginBottom: 9 },
  posts: { gap: 9 },
  postCard: { padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  pressed: { opacity: 0.8, transform: [{ scale: 0.992 }] },
  postTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kindBadge: { minHeight: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  kindText: { color: colors.orange, fontSize: 9, fontWeight: "900" },
  postDate: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  postBody: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 10 },
  postStats: { flexDirection: "row", gap: 12, marginTop: 10 },
  statText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  emptyPosts: { minHeight: 110, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
  privacyNote: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.successSoft, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  privacyText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  title: { ...typography.heading2, color: colors.text, textAlign: "center" },
  mutedText: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 430 },
  primaryButton: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.white, fontWeight: "900" }
});
