from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    content = read(path)
    if old not in content:
        raise RuntimeError(f"Motif introuvable dans {path}: {old[:120]!r}")
    write(path, content.replace(old, new, count))


def regex_replace(path: str, pattern: str, replacement: str, count: int = 1) -> None:
    content = read(path)
    updated, matches = re.subn(pattern, replacement, content, count=count, flags=re.S)
    if matches != count:
        raise RuntimeError(
            f"Remplacement regex inattendu dans {path}: {matches}/{count} pour {pattern[:120]!r}"
        )
    write(path, updated)


# ---------------------------------------------------------------------------
# Réactions et annonces centrées
# ---------------------------------------------------------------------------
replace(
    "src/components/MessageBubble.tsx",
    '  onVotePoll?: (message: ChatMessage, optionId: string) => void | Promise<void>;\n}',
    '  onVotePoll?: (message: ChatMessage, optionId: string) => void | Promise<void>;\n  centered?: boolean;\n}',
)
replace(
    "src/components/MessageBubble.tsx",
    '  onOpenProfile,\n  onVotePoll\n}: MessageBubbleProps) {',
    '  onOpenProfile,\n  onVotePoll,\n  centered = false\n}: MessageBubbleProps) {',
)
replace(
    "src/components/MessageBubble.tsx",
    '  const showDetachedReactionButton = Boolean(onReact);',
    '  const showDetachedReactionButton = Boolean(onReact && !message.isMine);',
)
replace(
    "src/components/MessageBubble.tsx",
    '        {!message.isMine ? (',
    '        {!message.isMine && !centered ? (',
    count=1,
)
replace(
    "src/components/MessageBubble.tsx",
    '          {!message.isMine ? (',
    '          {!message.isMine && !centered ? (',
    count=1,
)
replace(
    "src/components/MessageBubble.tsx",
    '          message.isMine ? styles.mineRow : styles.otherRow,\n          { transform: [{ translateX }] }',
    '          message.isMine ? styles.mineRow : styles.otherRow,\n          centered && styles.centeredRow,\n          { transform: [{ translateX }] }',
)
replace(
    "src/components/MessageBubble.tsx",
    '            message.isMine ? styles.mineWrapper : styles.otherWrapper\n          ]}',
    '            message.isMine ? styles.mineWrapper : styles.otherWrapper,\n            centered && styles.centeredWrapper\n          ]}',
)
replace(
    "src/components/MessageBubble.tsx",
    '              onLongPress={() => setReactionOpen(true)}',
    '              onLongPress={!message.isMine ? () => setReactionOpen(true) : undefined}',
)
replace(
    "src/components/MessageBubble.tsx",
    '                      message.isMine\n                        ? styles.reactionPickerLeft\n                        : styles.reactionPickerRight,',
    '                      styles.reactionPickerLeft,',
)
replace(
    "src/components/MessageBubble.tsx",
    '  mineRow: { justifyContent: "flex-end" },\n  otherRow: { justifyContent: "flex-start" },',
    '  mineRow: { justifyContent: "flex-end" },\n  otherRow: { justifyContent: "flex-start" },\n  centeredRow: { justifyContent: "center" },',
)
replace(
    "src/components/MessageBubble.tsx",
    '  mineWrapper: { alignItems: "flex-end" },\n  otherWrapper: { alignItems: "flex-start" },',
    '  mineWrapper: { alignItems: "flex-end" },\n  otherWrapper: { alignItems: "flex-start" },\n  centeredWrapper: { alignItems: "center" },',
)

# L’accès aux automatisations ne doit plus polluer chaque ligne de conversation.
replace(
    "src/components/ConversationRow.tsx",
    '  const canSchedule = Boolean(conversation.canManage && !privateConversation);\n',
    '',
)
regex_replace(
    "src/components/ConversationRow.tsx",
    r'\n\s*\{canSchedule \? \(\s*<Pressable[\s\S]*?accessibilityLabel=\{`Programmer un message dans \$\{conversation\.name\}`\}[\s\S]*?</Pressable>\s*\) : null\}',
    '',
)
regex_replace(
    "src/components/ConversationRow.tsx",
    r'\n  scheduleButton: \{[\s\S]*?\n  schedulePressed: \{ opacity: 0\.72, transform: \[\{ scale: 0\.96 \}\] \}',
    '',
)

# ---------------------------------------------------------------------------
# Chat : règles d’écriture, appels Free et centrage Annonces
# ---------------------------------------------------------------------------
replace(
    "app/chat/[id].tsx",
    'import { isPrivateConversation } from "../../src/domain/conversationFilter";\n',
    'import { isPrivateConversation } from "../../src/domain/conversationFilter";\nimport {\n  canInitiatePrivateInteraction,\n  canPublishInConversation\n} from "../../src/domain/accessPolicy";\n',
)
replace(
    "app/chat/[id].tsx",
    '  const directMemberId = conversation?.memberIds?.find(\n    (memberId) => memberId !== currentUser.id\n  );\n',
    '  const directMemberId = conversation?.memberIds?.find(\n    (memberId) => memberId !== currentUser.id\n  );\n  const canWrite = conversation\n    ? canPublishInConversation(currentUser, conversation)\n    : false;\n  const canInitiateCalls = canInitiatePrivateInteraction(currentUser.role);\n',
)
content = read("app/chat/[id].tsx").replace("conversation.canPost", "canWrite")
write("app/chat/[id].tsx", content)
replace(
    "app/chat/[id].tsx",
    '        {conversation.type === "direct" ? (',
    '        {conversation.type === "direct" && canInitiateCalls ? (',
)
replace(
    "app/chat/[id].tsx",
    '              onReply={setReplyingTo}\n              onOpenProfile={openMemberProfile}',
    '              centered={conversation.type === "announcement"}\n              onReply={conversation.type === "announcement" ? undefined : setReplyingTo}\n              onOpenProfile={openMemberProfile}',
)

# ---------------------------------------------------------------------------
# Restrictions Free : création privée, appels sortants et Temps forts
# ---------------------------------------------------------------------------
replace(
    "src/screens/NewConversationScreen.tsx",
    '  Image,\n  Pressable,',
    '  Image,\n  Linking,\n  Pressable,',
)
replace(
    "src/screens/NewConversationScreen.tsx",
    'import { env } from "../config/env";\n',
    'import { env } from "../config/env";\nimport {\n  canInitiatePrivateInteraction,\n  TRITON_CHECKOUT_URL\n} from "../domain/accessPolicy";\n',
)
replace(
    "src/screens/NewConversationScreen.tsx",
    'import { colors, gradients, radii, spacing, typography } from "../theme";\n',
    'import { colors, gradients, radii, spacing, typography } from "../theme";\nimport { MemberStatusBadge } from "../components/MemberStatusBadge";\n',
)
replace(
    "src/screens/NewConversationScreen.tsx",
    '  const canCreateOfficialGroup = isVisionnaireRole(currentUser.role);\n',
    '  const canCreateOfficialGroup = isVisionnaireRole(currentUser.role);\n  const canInitiatePrivate = canInitiatePrivateInteraction(currentUser.role);\n',
)
replace(
    "src/screens/NewConversationScreen.tsx",
    '    if (mode === "private") {\n      if (selectedIds.length === 0) {',
    '    if (mode === "private") {\n      if (!canInitiatePrivate) {\n        Alert.alert(\n          "Passez Triton pour démarrer une discussion",\n          "Un compte Free peut répondre à une invitation, mais ne peut pas initier une conversation privée.",\n          [\n            { text: "Plus tard", style: "cancel" },\n            {\n              text: "Passer Triton",\n              onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL)\n            }\n          ]\n        );\n        return;\n      }\n      if (selectedIds.length === 0) {',
)
replace(
    "src/screens/NewConversationScreen.tsx",
    '                      <Text style={styles.memberMeta} numberOfLines={1}>\n                        {member.company} · {member.city}\n                      </Text>\n                    </View>',
    '                      <Text style={styles.memberMeta} numberOfLines={1}>\n                        {member.company} · {member.city}\n                      </Text>\n                      <View style={{ marginTop: 5, alignSelf: "flex-start" }}>\n                        <MemberStatusBadge role={member.role} compact />\n                      </View>\n                    </View>',
)

replace(
    "app/new-highlight.tsx",
    '  Alert,\n  Animated,\n  Pressable,',
    '  Alert,\n  Animated,\n  Linking,\n  Pressable,',
)
replace(
    "app/new-highlight.tsx",
    'import { env } from "@/config/env";\n',
    'import { env } from "@/config/env";\nimport {\n  canPublishHighlightKind,\n  TRITON_CHECKOUT_URL\n} from "@/domain/accessPolicy";\n',
)
replace(
    "app/new-highlight.tsx",
    '  const { accessToken } = useSession();',
    '  const { currentUser, accessToken } = useSession();',
)
replace(
    "app/new-highlight.tsx",
    '  const insertMention = (name: string) => {',
    '  const selectKind = (nextKind: HighlightKind) => {\n    if (!canPublishHighlightKind(currentUser.role, nextKind)) {\n      Alert.alert(\n        "Passez Triton pour publier ce contenu",\n        "Les comptes Free peuvent publier uniquement des Besoins.",\n        [\n          { text: "Annuler", style: "cancel" },\n          { text: "Passer Triton", onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL) }\n        ]\n      );\n      return;\n    }\n    setKind(nextKind);\n  };\n\n  const insertMention = (name: string) => {',
)
replace(
    "app/new-highlight.tsx",
    '    const cleanBody = body.trim();\n    if (!cleanBody && !media) {',
    '    const cleanBody = body.trim();\n    if (!canPublishHighlightKind(currentUser.role, kind)) {\n      Alert.alert(\n        "Publication réservée aux adhérents",\n        "Passez Triton pour publier autre chose qu’un Besoin.",\n        [\n          { text: "Annuler", style: "cancel" },\n          { text: "Passer Triton", onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL) }\n        ]\n      );\n      return;\n    }\n    if (!cleanBody && !media) {',
)
content = read("app/new-highlight.tsx")
if 'onPress={() => setKind(item.value)}' not in content:
    raise RuntimeError("Sélecteur de type de Temps fort introuvable")
write("app/new-highlight.tsx", content.replace('onPress={() => setKind(item.value)}', 'onPress={() => selectKind(item.value)}'))

replace(
    "app/call/[id].tsx",
    '  Alert,\n  Pressable,',
    '  Alert,\n  Linking,\n  Pressable,',
)
replace(
    "app/call/[id].tsx",
    'import { env } from "@/config/env";\n',
    'import { env } from "@/config/env";\nimport {\n  canInitiatePrivateInteraction,\n  TRITON_CHECKOUT_URL\n} from "@/domain/accessPolicy";\n',
)
replace(
    "app/call/[id].tsx",
    '  const { accessToken } = useSession();',
    '  const { currentUser, accessToken } = useSession();',
)
replace(
    "app/call/[id].tsx",
    '  const startOutgoingCall = async () => {\n    if (preparing) return;\n    const cleanReason = reason.trim();',
    '  const startOutgoingCall = async () => {\n    if (preparing) return;\n    if (!canInitiatePrivateInteraction(currentUser.role)) {\n      Alert.alert(\n        "Passez Triton pour appeler",\n        "Un compte Free peut recevoir un appel, mais ne peut pas en initier.",\n        [\n          { text: "Annuler", style: "cancel" },\n          { text: "Passer Triton", onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL) }\n        ]\n      );\n      return;\n    }\n    const cleanReason = reason.trim();',
)

# ---------------------------------------------------------------------------
# Défense en profondeur côté providers locaux
# ---------------------------------------------------------------------------
replace(
    "src/providers/ExperienceProvider.tsx",
    'import { env } from "../config/env";\n',
    'import { env } from "../config/env";\nimport {\n  canInitiatePrivateInteraction,\n  canPublishHighlightKind,\n  canPublishInConversation\n} from "../domain/accessPolicy";\n',
)
replace(
    "src/providers/ExperienceProvider.tsx",
    '    (draft: PrivateConversationDraft): Conversation => {\n      const uniqueIds = [',
    '    (draft: PrivateConversationDraft): Conversation => {\n      if (!canInitiatePrivateInteraction(currentUser.role)) {\n        throw new Error("Un compte Free ne peut pas initier une conversation privée.");\n      }\n      const uniqueIds = [',
)
replace(
    "src/providers/ExperienceProvider.tsx",
    '        !conversation ||\n        (!cleanBody && attachments.length === 0) ||',
    '        !conversation ||\n        !canPublishInConversation(currentUser, conversation) ||\n        (!cleanBody && attachments.length === 0) ||',
)
replace(
    "src/providers/ExperienceProvider.tsx",
    '        restricted: true,\n        canPost: draft.canMembersPost\n      };',
    '        restricted: true,\n        canPost: draft.canMembersPost,\n        adminIds: draft.adminIds,\n        announcementPublisherIds: draft.announcementPublisherIds,\n        allowFreeDiscovery: draft.allowFreeDiscovery\n      };',
)
replace(
    "src/providers/ExperienceProvider.tsx",
    '    (input: CreatePostInput): HighlightPost => {\n      const post: HighlightPost = {',
    '    (input: CreatePostInput): HighlightPost => {\n      if (!canPublishHighlightKind(currentUser.role, input.kind)) {\n        throw new Error("Un compte Free peut publier uniquement un Besoin.");\n      }\n      const post: HighlightPost = {',
)

# API de gouvernance réelle des groupes.
replace(
    "src/services/api/experienceApi.ts",
    '          allowed_roles: draft.allowedRoles,\n          members_can_post: draft.canMembersPost',
    '          allowed_roles: draft.allowedRoles,\n          members_can_post: draft.canMembersPost,\n          responsible_ids: draft.adminIds ?? [],\n          announcement_publisher_ids: draft.announcementPublisherIds ?? [],\n          allow_free_discovery: draft.allowFreeDiscovery ?? false',
    count=2,
)
replace(
    "src/services/api/experienceApi.ts",
    '  async reactToMessage(\n',
    '  async joinGroup(conversationId: string): Promise<void> {\n    await authenticatedRequest(\n      `/v1/groups/${encodeURIComponent(conversationId)}/join`,\n      { method: "POST" },\n      this.fallbackAccessToken\n    );\n  }\n\n  async setGroupResponsible(\n    conversationId: string,\n    memberId: string,\n    responsible: boolean\n  ): Promise<void> {\n    await authenticatedRequest(\n      `/v1/groups/${encodeURIComponent(conversationId)}/responsibles/${encodeURIComponent(memberId)}`,\n      { method: responsible ? "PUT" : "DELETE" },\n      this.fallbackAccessToken\n    );\n  }\n\n  async removeGroupMember(\n    conversationId: string,\n    memberId: string\n  ): Promise<void> {\n    await authenticatedRequest(\n      `/v1/groups/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberId)}`,\n      { method: "DELETE" },\n      this.fallbackAccessToken\n    );\n  }\n\n  async setAnnouncementPublisher(\n    conversationId: string,\n    memberId: string,\n    allowed: boolean\n  ): Promise<void> {\n    await authenticatedRequest(\n      `/v1/groups/${encodeURIComponent(conversationId)}/announcement-publishers/${encodeURIComponent(memberId)}`,\n      { method: allowed ? "PUT" : "DELETE" },\n      this.fallbackAccessToken\n    );\n  }\n\n  async reactToMessage(\n',
)

# ---------------------------------------------------------------------------
# Données de démonstration couvrant tous les statuts et groupe Annonces
# ---------------------------------------------------------------------------
replace(
    "src/data/mockData.ts",
    '  {\n    id: "user-christelle",\n    name: "Christelle",\n    initials: "CH",\n    company: "Neptune Montpellier",\n    city: "Montpellier",\n    role: "captain",\n    roleLabel: "Capitaine",\n    online: true,\n    avatarUrl: "https://i.pravatar.cc/160?u=neptune-christelle",\n    webProfileUrl: "https://neptunebusiness.com/profile/user-christelle"\n  }\n];',
    '  {\n    id: "user-christelle",\n    name: "Christelle",\n    initials: "CH",\n    company: "Neptune Montpellier",\n    city: "Montpellier",\n    role: "captain",\n    roleLabel: "Capitaine",\n    online: true,\n    avatarUrl: "https://i.pravatar.cc/160?u=neptune-christelle",\n    webProfileUrl: "https://neptunebusiness.com/profile/user-christelle"\n  },\n  { id: "user-amiral", name: "Alexis Martin", initials: "AM", company: "Neptune Région", city: "Toulouse", role: "amiral", roleLabel: "Amiral", online: true },\n  { id: "user-allie", name: "Sarah Alliée", initials: "SA", company: "Partenaire Neptune", city: "Narbonne", role: "allie", roleLabel: "Allié", online: false },\n  { id: "user-legende", name: "Marc Légende", initials: "ML", company: "Entreprise Légende", city: "Montpellier", role: "legende", roleLabel: "Légende", online: false },\n  { id: "user-moussaillon", name: "Lina Moussaillon", initials: "LM", company: "Studio Lina", city: "Carcassonne", role: "moussaillon", roleLabel: "Moussaillon", online: true },\n  { id: "user-triton", name: "Thomas Triton", initials: "TT", company: "Triton Conseil", city: "Toulouse", role: "triton", roleLabel: "Triton", online: true },\n  { id: "user-free", name: "Fanny Free", initials: "FF", company: "Projet en création", city: "Carcassonne", role: "free", roleLabel: "Free", online: false }\n];',
)
replace(
    "src/data/mockData.ts",
    '    pinnedMessage: "Seuls les administrateurs publient dans cet espace.",\n    restricted: false,\n    activeMemberIds: ["user-lea", "user-johan", "user-oceane"]',
    '    pinnedMessage: "Les Visionnaires publient. Les membres peuvent réagir sans répondre.",\n    restricted: false,\n    canPost: false,\n    allowedRoles: ["free", "triton", "moussaillon", "legende", "capitaine", "amiral", "allie", "visionnaire"],\n    allowFreeDiscovery: true,\n    adminIds: [],\n    announcementPublisherIds: ["user-oceane", "user-amiral"],\n    memberIds: ["user-johan", "user-lea", "user-oceane", "user-nabiha", "user-christelle", "user-amiral", "user-allie", "user-legende", "user-moussaillon", "user-triton", "user-free"],\n    activeMemberIds: ["user-lea", "user-johan", "user-oceane", "user-amiral"]',
)

# ---------------------------------------------------------------------------
# Statuts visibles dans profil/compte
# ---------------------------------------------------------------------------
replace(
    "app/(tabs)/settings.tsx",
    'import { BrandHeader } from "@/components/BrandHeader";\n',
    'import { BrandHeader } from "@/components/BrandHeader";\nimport { MemberStatusBadge } from "@/components/MemberStatusBadge";\nimport { StatusAvatar } from "@/components/StatusAvatar";\n',
)
regex_replace(
    "app/(tabs)/settings.tsx",
    r'\s*<LinearGradient\s+colors=\{gradients\.primaryWarm\}\s+style=\{styles\.avatarShell\}[\s\S]*?</LinearGradient>\n\s*<View style=\{styles\.profileContent\}>',
    '\n              <StatusAvatar user={currentUser} size={62} />\n              <View style={styles.profileContent}>',
)
regex_replace(
    "app/(tabs)/settings.tsx",
    r'<View style=\{styles\.roleChip\}>\s*<View style=\{styles\.roleDot\} />\s*<Text style=\{styles\.roleChipText\}>\{currentUser\.roleLabel\}</Text>\s*</View>',
    '<MemberStatusBadge role={currentUser.role} />',
)

replace(
    "app/account.tsx",
    'import { env } from "@/config/env";\n',
    'import { env } from "@/config/env";\nimport { MemberStatusBadge } from "@/components/MemberStatusBadge";\n',
)
replace(
    "app/account.tsx",
    '          <Text style={styles.meta}>\n            {currentUser.roleLabel} · {currentUser.city}\n          </Text>',
    '          <Text style={styles.meta}>\n            {currentUser.city}\n          </Text>\n          <View style={{ marginTop: 8 }}>\n            <MemberStatusBadge role={currentUser.role} />\n          </View>',
)

# ---------------------------------------------------------------------------
# Confidentialité réellement actionnable
# ---------------------------------------------------------------------------
write(
    "app/privacy.tsx",
    r'''import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { env } from "@/config/env";
import { colors, gradients, radii, spacing, typography } from "@/theme";

const sections = [
  {
    icon: "location-outline" as const,
    title: "Localisation et Map",
    body: "La position est demandée uniquement lorsque vous utilisez la Map ou partagez un lieu. Le backend reçoit une précision limitée selon vos préférences."
  },
  {
    icon: "people-outline" as const,
    title: "Visibilité du profil",
    body: "Photo, entreprise, présence et moyens de contact respectent les droits de visibilité de votre compte Neptune."
  },
  {
    icon: "lock-closed-outline" as const,
    title: "Conversations privées",
    body: "Les messages et fichiers utilisent des routes authentifiées et un stockage privé. Les URLs de téléchargement sont temporaires."
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Blocage et signalement",
    body: "Le blocage interrompt les nouveaux messages, mentions et appels. Les signalements sont transmis à la modération Neptune."
  }
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  const openConfiguredUrl = async (label: string, url: string) => {
    if (!url) {
      Alert.alert(
        `${label} non configuré`,
        "Cette URL doit être renseignée dans la configuration de la build store."
      );
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Lien indisponible", "Ce lien sécurisé ne peut pas être ouvert.");
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Confidentialité</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <View style={styles.hero}>
          <Ionicons name="shield-checkmark" size={34} color={colors.success} />
          <Text style={styles.title}>Vos données restent sous votre contrôle</Text>
          <Text style={styles.intro}>
            Les paramètres, l’export et la suppression sont accessibles directement depuis Connexio.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.card}>
            <View style={styles.iconWrap}><Ionicons name={section.icon} size={21} color={colors.orange} /></View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardBody}>{section.body}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Documents et droits du compte</Text>
        <Pressable accessibilityRole="link" onPress={() => void openConfiguredUrl("Politique de confidentialité", env.privacyPolicyUrl)} style={styles.actionRow}>
          <View style={styles.actionIcon}><Ionicons name="document-text-outline" size={20} color={colors.orange} /></View>
          <View style={styles.actionContent}><Text style={styles.actionTitle}>Politique de confidentialité</Text><Text style={styles.actionSubtitle}>Consulter le document public applicable à Connexio.</Text></View>
          <Ionicons name="open-outline" size={19} color={colors.textMuted} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/account")} style={styles.actionRow}>
          <View style={styles.actionIcon}><Ionicons name="download-outline" size={20} color={colors.orange} /></View>
          <View style={styles.actionContent}><Text style={styles.actionTitle}>Exporter mes données</Text><Text style={styles.actionSubtitle}>Demander une archive sécurisée depuis l’écran Compte.</Text></View>
          <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/account")} style={styles.actionRow}>
          <View style={styles.actionIcon}><Ionicons name="trash-outline" size={20} color={colors.danger} /></View>
          <View style={styles.actionContent}><Text style={styles.actionTitle}>Supprimer mon compte dans l’application</Text><Text style={styles.actionSubtitle}>La demande révoque les sessions puis lance le traitement de suppression.</Text></View>
          <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => void openConfiguredUrl("Suppression de compte", env.accountDeletionUrl)} style={styles.actionRow}>
          <View style={styles.actionIcon}><Ionicons name="globe-outline" size={20} color={colors.danger} /></View>
          <View style={styles.actionContent}><Text style={styles.actionTitle}>Demande de suppression sur le web</Text><Text style={styles.actionSubtitle}>Accès public utilisable même sans l’application.</Text></View>
          <Ionicons name="open-outline" size={19} color={colors.textMuted} />
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
  content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: spacing.md },
  hero: { alignItems: "center", paddingVertical: spacing.lg },
  title: { ...typography.heading2, color: colors.text, textAlign: "center", marginTop: 10 },
  intro: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: 7 },
  card: { minHeight: 96, marginBottom: 9, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  cardBody: { ...typography.bodySmall, color: colors.textMuted, marginTop: 4 },
  sectionTitle: { ...typography.heading3, color: colors.text, marginTop: spacing.lg, marginBottom: 8 },
  actionRow: { minHeight: 78, marginBottom: 8, padding: 12, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 10 },
  actionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  actionContent: { flex: 1, minWidth: 0 },
  actionTitle: { color: colors.text, fontSize: 12, fontWeight: "900" },
  actionSubtitle: { color: colors.textMuted, fontSize: 9.5, lineHeight: 14, marginTop: 3 }
});
''',
)

# ---------------------------------------------------------------------------
# Tests métier RC
# ---------------------------------------------------------------------------
write(
    "tests/scheduledMessages.test.ts",
    r'''import assert from "node:assert/strict";
import test from "node:test";

import {
  canScheduleMessages,
  createScheduledMessage
} from "../src/domain/scheduledMessages";

test("les responsables autorisés peuvent créer une automatisation", () => {
  assert.equal(canScheduleMessages("capitaine", true), true);
  assert.equal(canScheduleMessages("admiral", true), true);
  assert.equal(canScheduleMessages("visionnaire", true), true);
  assert.equal(canScheduleMessages("moussaillon", true), false);
  assert.equal(canScheduleMessages("capitaine", false), false);
});

test("une automatisation valide est normalisée et nominative", () => {
  const scheduled = createScheduledMessage({
    id: "scheduled-1",
    conversationId: "group-1",
    name: "  Rappel atelier hebdomadaire  ",
    body: "  Rappel : atelier demain à 9 h.  ",
    scheduledFor: "2026-08-03T08:00:00.000Z",
    frequency: "weekly",
    enabled: true,
    createdByUserId: "captain-1",
    createdByName: "Capitaine Test",
    role: "capitaine",
    canManageConversation: true,
    now: new Date("2026-08-02T08:00:00.000Z")
  });
  assert.equal(scheduled.name, "Rappel atelier hebdomadaire");
  assert.equal(scheduled.body, "Rappel : atelier demain à 9 h.");
  assert.equal(scheduled.frequency, "weekly");
  assert.equal(scheduled.status, "scheduled");
});

test("la programmation immédiate est refusée", () => {
  assert.throws(
    () =>
      createScheduledMessage({
        id: "scheduled-2",
        conversationId: "group-1",
        name: "Message immédiat",
        body: "Message",
        scheduledFor: "2026-08-02T08:01:00.000Z",
        createdByUserId: "captain-1",
        role: "capitaine",
        canManageConversation: true,
        now: new Date("2026-08-02T08:00:00.000Z")
      }),
    /deux minutes/u
  );
});
''',
)
write(
    "tests/accessPolicy.test.ts",
    r'''import assert from "node:assert/strict";
import test from "node:test";

import {
  canBeGroupResponsible,
  canInitiatePrivateInteraction,
  canManageGroup,
  canPublishHighlightKind,
  canPublishInConversation,
  getGroupJoinDecision
} from "../src/domain/accessPolicy";
import type { AppUser, Conversation } from "../src/types/messaging";

const group: Conversation = {
  id: "group-1",
  name: "Groupe",
  categoryLabel: "Test",
  type: "topic",
  memberCount: 2,
  unreadCount: 0,
  restricted: true,
  allowedRoles: ["free", "triton"],
  allowFreeDiscovery: true,
  adminIds: ["captain-1"]
};

const captain: AppUser = {
  id: "captain-1",
  name: "Capitaine",
  initials: "CP",
  company: "Neptune",
  city: "Carcassonne",
  role: "capitaine",
  roleLabel: "Capitaine",
  online: true
};

test("les comptes Free reçoivent mais ne peuvent pas initier", () => {
  assert.equal(canInitiatePrivateInteraction("free"), false);
  assert.equal(canInitiatePrivateInteraction("triton"), true);
  assert.equal(canPublishHighlightKind("free", "besoin"), true);
  assert.equal(canPublishHighlightKind("free", "offre"), false);
});

test("la découverte Free impose la montée Triton", () => {
  assert.deepEqual(getGroupJoinDecision("free", group), {
    visible: true,
    canJoin: false,
    requiresTriton: true
  });
  assert.equal(getGroupJoinDecision("triton", group).canJoin, true);
});

test("les responsables sont uniquement Amiraux ou Capitaines", () => {
  assert.equal(canBeGroupResponsible("capitaine"), true);
  assert.equal(canBeGroupResponsible("amiral"), true);
  assert.equal(canBeGroupResponsible("moussaillon"), false);
  assert.equal(canManageGroup(captain, group), true);
});

test("Annonce autorise uniquement Visionnaires ou éditeurs nommés", () => {
  const announcement: Conversation = {
    ...group,
    type: "announcement",
    canPost: false,
    announcementPublisherIds: ["captain-1"]
  };
  assert.equal(canPublishInConversation(captain, announcement), true);
  assert.equal(
    canPublishInConversation({ ...captain, id: "other" }, announcement),
    false
  );
});
''',
)
write(
    "tests/roleAppearance.test.ts",
    r'''import assert from "node:assert/strict";
import test from "node:test";

import { ROLE_APPEARANCE } from "../src/domain/roleAppearance";

const expected = {
  free: ["#0F1126", "#2A2E42", "#99A1AF"],
  triton: ["#081333", "#133372", "#1E61FE"],
  moussaillon: ["#150D33", "#431E73", "#C27AFF"],
  legende: ["#1D1819", "#5C4612", "#FDC700"],
  capitaine: ["#1F1019", "#632A12", "#FF8904"],
  amiral: ["#0E0F33", "#272771", "#7C86FF"],
  allie: ["#051925", "#034A40", "#00D492"],
  visionnaire: ["#150D33", "#431E73", "#C27AFF"]
} as const;

test("la palette des statuts correspond à la référence Neptune", () => {
  for (const [role, colors] of Object.entries(expected)) {
    const appearance = ROLE_APPEARANCE[role as keyof typeof ROLE_APPEARANCE];
    assert.deepEqual(
      [appearance.background, appearance.border, appearance.foreground],
      colors
    );
  }
});
''',
)

# ---------------------------------------------------------------------------
# Audit statique RC et documentation de remise stores
# ---------------------------------------------------------------------------
write(
    "scripts/release-candidate-audit.cjs",
    r'''const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const requiredFiles = [
  "assets/icon.png",
  "assets/adaptive-icon.png",
  "assets/notification-icon.png",
  "assets/splash-icon.png",
  "assets/favicon.png",
  "assets/audio/connexio-ringtone.mp3",
  "assets/audio/connexio-notification.mp3",
  "src/domain/accessPolicy.ts",
  "src/domain/roleAppearance.ts",
  "src/components/MemberStatusBadge.tsx",
  "src/components/StatusAvatar.tsx",
  "src/components/SwipeableMemberRow.tsx",
  "docs/STORE_RELEASE_CHECKLIST.md",
  "docs/INTEGRATION_REGISTRY.md",
  "docs/DATA_SAFETY_DRAFT.md"
];
for (const file of requiredFiles) assert(exists(file), `Fichier RC manquant: ${file}`);

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});
const trackedSurface = walk(root).filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`) && !file.includes(`${path.sep}.git${path.sep}`));
assert(!trackedSurface.some((file) => path.basename(file).startsWith(".tmp_")), "Des fragments .tmp_ sont encore présents.");
assert(!exists(".github/workflows/v14-governance-pass.yml"), "Le workflow temporaire de gouvernance existe encore.");

const config = read("app.config.ts");
assert(config.includes('version: APP_VERSION'), "Version native non centralisée.");
assert(config.includes('orientation: "default"'), "Orientation tablette/paysage non autorisée.");
assert(config.includes('sounds: [NOTIFICATION_SOUND]'), "Son personnalisé non embarqué par expo-notifications.");
assert(config.includes("privacyManifests"), "Manifestes de confidentialité iOS absents.");
assert(config.includes("EXPO_PUBLIC_ACCOUNT_DELETION_URL"), "URL publique de suppression non exigée.");

const bubble = read("src/components/MessageBubble.tsx");
assert(bubble.includes("Boolean(onReact && !message.isMine)"), "Le bouton de réaction existe encore sur ses propres messages.");
assert(bubble.includes("styles.reactionPickerLeft"), "Le sélecteur de réactions n’est pas ancré vers la gauche.");
assert(bubble.includes("centered?: boolean"), "Le centrage du groupe Annonces est absent.");

const group = read("app/group/[id].tsx");
assert(group.includes("SwipeableMemberRow"), "Le swipe de gestion des membres est absent.");
assert(group.includes("setAnnouncementPublisher"), "La délégation de publication Annonces est absente.");
assert(group.includes("Automatisations"), "L’accès aux automatisations n’est pas dans les informations du groupe.");

const schedule = read("app/schedule-message/[id].tsx");
assert(schedule.includes("Automatisations du groupe"), "L’ancien écran de programmation est encore utilisé.");
assert(schedule.includes("createdByName"), "Les automatisations ne sont pas nominatives.");
assert(schedule.includes("updateScheduledMessage"), "La modification des automatisations est absente.");

const access = read("src/domain/accessPolicy.ts");
assert(access.includes("TRITON_CHECKOUT_URL"), "Le passage Triton n’est pas centralisé.");
assert(access.includes("canInitiatePrivateInteraction"), "La règle Free des interactions privées est absente.");
assert(access.includes("canPublishHighlightKind"), "La règle Free des publications est absente.");

const viewer = read("src/components/MessageAttachmentView.tsx");
assert(viewer.includes("InAppAttachmentViewer"), "Les fichiers ne sont pas lisibles dans l’application.");

const appearance = read("src/domain/roleAppearance.ts");
for (const color of ["#99A1AF", "#1E61FE", "#C27AFF", "#FDC700", "#FF8904", "#7C86FF", "#00D492"]) {
  assert(appearance.includes(color), `Couleur de statut manquante: ${color}`);
}

if (failures.length > 0) {
  console.error("Audit Release Candidate en échec:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`Audit Release Candidate validé (${requiredFiles.length} ressources et règles critiques).`);
''',
)

write(
    "docs/INTEGRATION_REGISTRY.md",
    r'''# Connexio RC1 — registre des intégrations

Ce registre distingue explicitement le code livré de la validation d’infrastructure.

| Domaine | État du client | Autorité de production | Preuve de fermeture |
|---|---|---|---|
| Authentification Neptune | Contrat prêt | API Express / sessions | Connexion, expiration et révocation en préproduction |
| Messages et groupes | Contrat prêt | PostgreSQL / Prisma | Matrice de droits par statut et tests multi-comptes |
| Temps réel | Contrat prêt | Socket.IO / Redis | Reconnexion, ordre et déduplication multi-instance |
| Médias privés | Lecteur et upload prêts | Stockage signé / antivirus | Upload, lecture, expiration et refus d’accès |
| Appels | WebRTC prêt | Signalisation / TURN | Appels Wi-Fi, 4G, 5G et NAT restrictif |
| Notifications | Client et sons prêts | Expo Push / APNs / FCM | App ouverte, arrière-plan et fermée |
| Automatisations | CRUD client prêt | Worker serveur | Exécution, récurrence, idempotence et audit |
| Modération | Contrat prêt | Service de modération | Sanctions persistantes et révision humaine |
| Suppression/export | Parcours prêt | Backend conformité | Export téléchargeable et preuve de suppression |
| Besoins/Offres | Contrats prêts | Neptune Business / Comité Avantage | Synchronisation bidirectionnelle sans boucle |

Les builds `release-candidate` et `production` refusent de démarrer leur configuration si les URL critiques ou le projet EAS ne sont pas fournis.
''',
)
write(
    "docs/DATA_SAFETY_DRAFT.md",
    r'''# Connexio RC1 — brouillon App Privacy / Data Safety

Ce document doit être validé par le responsable de traitement et aligné sur le backend réellement déployé avant soumission.

## Données potentiellement collectées

- identifiants de compte et informations de profil Neptune ;
- contenu utilisateur : messages, fichiers, vocaux, Temps forts et commentaires ;
- contacts choisis dans l’application, uniquement si la fonction est utilisée ;
- position approximative ou précise, uniquement à la demande ;
- jeton de notification, appareil, version et sessions actives ;
- diagnostics, signalements et décisions de modération ;
- métadonnées d’appels, sans enregistrer le contenu audio/vidéo par défaut.

## Finalités

- authentification et sécurité ;
- fonctionnement de la messagerie et des groupes ;
- envoi de notifications ;
- appels audio/vidéo ;
- modération, prévention des abus et support ;
- synchronisation explicite avec les services Neptune associés.

## Engagements à confirmer côté serveur

- chiffrement en transit ;
- contrôle d’accès par conversation ;
- stockage privé et URLs temporaires ;
- délais de conservation documentés ;
- export et suppression de compte effectifs ;
- absence de vente des données ;
- inventaire complet des sous-traitants et SDK.
''',
)
write(
    "docs/STORE_RELEASE_CHECKLIST.md",
    r'''# Connexio 1.0 RC1 — checklist de publication stores

## Validations automatisées du dépôt

- installation verrouillée avec `npm ci` ;
- TypeScript et tests métier ;
- audit des dépendances de production ;
- compatibilité Expo ;
- configuration publique Expo ;
- audit statique Release Candidate ;
- build web et audit responsive ;
- prébuild natif iOS/Android sans erreur ;
- ressources icône, splash et notification ;
- manifeste de confidentialité iOS ;
- son personnalisé Android/iOS ;
- absence de fichiers temporaires de staging.

## Validation externe obligatoire avant soumission

- renseigner les secrets EAS et URL HTTPS : API, temps réel, confidentialité et suppression ;
- déployer le backend de préproduction et les migrations ;
- valider APNs et FCM sur application fermée ;
- valider TURN sur Wi-Fi, 4G et 5G ;
- tester au minimum un iPhone compact, un iPhone récent, un iPad et deux Android ;
- tester VoiceOver et TalkBack ;
- tester réseau faible, perte de réseau, reprise et upload interrompu ;
- vérifier l’AAB pour les pages mémoire 16 Ko ;
- compléter App Privacy et Data Safety avec les traitements serveur réels ;
- publier la politique de confidentialité et la page publique de suppression ;
- fournir captures, description, support, catégorie, âge et coordonnées de revue ;
- distribuer la RC via TestFlight et piste interne Play avant promotion production.

Une RC est techniquement produisible lorsque tous les contrôles du dépôt sont verts. La soumission publique reste bloquée tant que les preuves externes ci-dessus ne sont pas jointes au dossier de release.
''',
)

# ---------------------------------------------------------------------------
# CI : branche RC, configuration store complète et prébuild natif
# ---------------------------------------------------------------------------
ci = read(".github/workflows/ci.yml")
ci = ci.replace('    branches:\n      - main', '    branches:\n      - main\n      - "release/**"')
ci = ci.replace(
    '          EXPO_PUBLIC_EAS_PROJECT_ID: 00000000-0000-0000-0000-000000000000\n          EXPO_PUBLIC_MOCK_MODE: "false"',
    '          EXPO_PUBLIC_EAS_PROJECT_ID: 00000000-0000-0000-0000-000000000000\n          EXPO_PUBLIC_PRIVACY_POLICY_URL: https://legal.example.invalid/privacy\n          EXPO_PUBLIC_ACCOUNT_DELETION_URL: https://legal.example.invalid/delete-account\n          EXPO_PUBLIC_MOCK_MODE: "false"',
)
ci = ci.replace(
    '        run: npx expo config --type public >/dev/null\n\n  responsive-audit:',
    '        run: npx expo config --type public >/dev/null\n      - name: Release candidate static audit\n        run: npm run audit:rc\n\n  native-config-audit:\n    runs-on: ubuntu-latest\n    timeout-minutes: 20\n    steps:\n      - name: Checkout\n        uses: actions/checkout@v4\n        with:\n          show-progress: false\n      - name: Setup Node\n        uses: actions/setup-node@v4\n        with:\n          node-version: "22.13"\n          cache: npm\n      - name: Install locked dependencies\n        run: npm ci --no-audit --no-fund\n      - name: Generate native projects\n        env:\n          EAS_BUILD_PROFILE: release-candidate\n          EXPO_PUBLIC_API_BASE_URL: https://api.example.invalid\n          EXPO_PUBLIC_REALTIME_URL: wss://api.example.invalid/v1/realtime\n          EXPO_PUBLIC_EAS_PROJECT_ID: 00000000-0000-0000-0000-000000000000\n          EXPO_PUBLIC_PRIVACY_POLICY_URL: https://legal.example.invalid/privacy\n          EXPO_PUBLIC_ACCOUNT_DELETION_URL: https://legal.example.invalid/delete-account\n          EXPO_PUBLIC_MOCK_MODE: "false"\n        run: npx expo prebuild --clean --no-install\n      - name: Inspect store-critical native output\n        run: |\n          test -f ios/ConnexiobyNeptune/PrivacyInfo.xcprivacy\n          test -f android/app/src/main/AndroidManifest.xml\n          grep -R "connexio-notification" android/app/src/main/res >/dev/null\n          grep -R "com.neptunebusiness.connexio" android/app/build.gradle ios >/dev/null\n\n  responsive-audit:',
)
write(".github/workflows/ci.yml", ci)

print("Passe RC1 appliquée.")
