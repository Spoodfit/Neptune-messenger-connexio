import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useExperience } from "@/providers/ExperienceProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";

export default function ConversationInfoScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "");
  const { currentUser } = useSession();
  const { getConversation: getServerConversation } = useMessaging();
  const {
    members,
    getConversation: getLocalConversation,
    decorateConversation,
    toggleConversationMuted,
    leaveConversation
  } = useExperience();
  const raw = getServerConversation(id) ?? getLocalConversation(id);
  const conversation = raw ? decorateConversation(raw) : undefined;

  if (!conversation) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.missing}>
        <Text style={styles.title}>Conversation introuvable</Text>
        <Pressable onPress={() => router.replace("/(tabs)/messages")} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Retour aux messages</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const participants = (conversation.memberIds ?? [])
    .filter((memberId) => memberId !== currentUser.id)
    .map((memberId) => members.find((member) => member.id === memberId))
    .filter((member): member is (typeof members)[number] => Boolean(member));
  const directMember = conversation.type === "direct" ? participants[0] : undefined;

  const leave = () => {
    if (conversation.type === "direct") return;
    Alert.alert(
      "Quitter ce mini-groupe ?",
      "Il disparaîtra de vos discussions privées.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: () => {
            leaveConversation(id);
            router.replace("/(tabs)/messages");
          }
        }
      ]
    );
  };

  if (directMember) {
    router.replace(`/profile/${encodeURIComponent(directMember.id)}`);
    return null;
  }

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
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Informations</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
      >
        <LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>
          <View style={styles.avatarInner}>
            <Ionicons name="people" size={36} color={colors.text} />
          </View>
        </LinearGradient>
        <Text style={styles.title}>{conversation.name}</Text>
        <Text style={styles.subtitle}>
          Mini-groupe privé · {conversation.memberCount} membres maximum
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.replace(`/chat/${encodeURIComponent(id)}`)}
            style={styles.action}
          >
            <Ionicons name="chatbubble-outline" size={21} color={colors.text} />
            <Text style={styles.actionText}>Messages</Text>
          </Pressable>
          <Pressable
            onPress={() => toggleConversationMuted(id)}
            style={styles.action}
          >
            <Ionicons
              name={conversation.muted ? "notifications" : "notifications-off"}
              size={21}
              color={colors.text}
            />
            <Text style={styles.actionText}>
              {conversation.muted ? "Réactiver" : "Sourdine"}
            </Text>
          </Pressable>
          <Pressable onPress={leave} style={styles.action}>
            <Ionicons name="exit-outline" size={21} color={colors.danger} />
            <Text style={[styles.actionText, styles.danger]}>Quitter</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Membres</Text>
        <View style={styles.panel}>
          {participants.map((member, index) => (
            <Pressable
              key={member.id}
              onPress={() => router.push(`/profile/${encodeURIComponent(member.id)}`)}
              style={[
                styles.memberRow,
                index < participants.length - 1 && styles.divider
              ]}
            >
              <View style={styles.memberAvatar}>
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.image} />
                ) : (
                  <Text style={styles.initials}>{member.initials}</Text>
                )}
              </View>
              <View style={styles.memberContent}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberMeta} numberOfLines={1}>
                  {member.company} · {member.roleLabel}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={19} color={colors.success} />
          <Text style={styles.noteText}>
            La limite de quatre contacts, les invitations, les départs et les droits d’administration doivent être validés côté serveur.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 58, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: colors.text, flex: 1, textAlign: "center" },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", paddingHorizontal: spacing.md, alignItems: "center" },
  avatarShell: { width: 84, height: 84, borderRadius: 29, padding: 3, marginTop: spacing.md },
  avatarInner: { flex: 1, borderRadius: 26, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface },
  title: { ...typography.heading2, color: colors.text, textAlign: "center", marginTop: 12 },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 3, textAlign: "center" },
  actions: { width: "100%", marginTop: spacing.lg, flexDirection: "row", gap: 8 },
  action: { flex: 1, minHeight: 66, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 5 },
  actionText: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  danger: { color: colors.danger },
  sectionTitle: { ...typography.heading3, color: colors.text, alignSelf: "flex-start", marginTop: spacing.lg, marginBottom: 8 },
  panel: { width: "100%", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, overflow: "hidden" },
  memberRow: { minHeight: 68, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  memberAvatar: { width: 42, height: 42, borderRadius: 14, overflow: "hidden", backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  initials: { color: colors.text, fontWeight: "900" },
  memberContent: { flex: 1, minWidth: 0 },
  memberName: { color: colors.text, fontSize: 13, fontWeight: "900" },
  memberMeta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  note: { width: "100%", marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.successSoft, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noteText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  primaryButton: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.white, fontWeight: "900" }
});
