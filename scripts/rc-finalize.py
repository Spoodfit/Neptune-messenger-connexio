from __future__ import annotations

import base64
import io
import re
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def patch(path: str, old: str, new: str, *, count: int = 1) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Motif introuvable dans {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new, count), encoding="utf-8")


def patch_all(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Motif introuvable dans {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new), encoding="utf-8")


# Reactions: no affordance on own messages, selector always expands left,
# and announcement messages can be centered without reply affordances.
patch(
    "src/components/MessageBubble.tsx",
    "  onVotePoll?: (message: ChatMessage, optionId: string) => void | Promise<void>;\n}",
    "  onVotePoll?: (message: ChatMessage, optionId: string) => void | Promise<void>;\n  centered?: boolean;\n}",
)
patch(
    "src/components/MessageBubble.tsx",
    "  onOpenProfile,\n  onVotePoll\n}: MessageBubbleProps)",
    "  onOpenProfile,\n  onVotePoll,\n  centered = false\n}: MessageBubbleProps)",
)
patch(
    "src/components/MessageBubble.tsx",
    "  const showDetachedReactionButton = Boolean(onReact);",
    "  const showDetachedReactionButton = Boolean(onReact) && !message.isMine;",
)
patch(
    "src/components/MessageBubble.tsx",
    "          Boolean(onReply) &&\n          gesture.dx > 8",
    "          Boolean(onReply) &&\n          !centered &&\n          gesture.dx > 8",
)
patch(
    "src/components/MessageBubble.tsx",
    "          styles.row,\n          message.isMine ? styles.mineRow : styles.otherRow,\n          { transform: [{ translateX }] }",
    "          styles.row,\n          message.isMine ? styles.mineRow : styles.otherRow,\n          centered && styles.centerRow,\n          { transform: [{ translateX }] }",
)
patch_all(
    "src/components/MessageBubble.tsx",
    "        {!message.isMine ? (",
    "        {!message.isMine && !centered ? (",
)
patch(
    "src/components/MessageBubble.tsx",
    "            message.isMine ? styles.mineWrapper : styles.otherWrapper\n          ]}",
    "            message.isMine ? styles.mineWrapper : styles.otherWrapper,\n            centered && styles.centerWrapper\n          ]}",
)
patch(
    "src/components/MessageBubble.tsx",
    "              onLongPress={() => setReactionOpen(true)}",
    "              onLongPress={\n                showDetachedReactionButton\n                  ? () => setReactionOpen(true)\n                  : undefined\n              }",
)
patch(
    "src/components/MessageBubble.tsx",
    "                  style={[styles.bubble, styles.other]}",
    "                  style={[\n                    styles.bubble,\n                    styles.other,\n                    centered && styles.centeredBubble\n                  ]}",
)
patch(
    "src/components/MessageBubble.tsx",
    "                      message.isMine\n                        ? styles.reactionPickerLeft\n                        : styles.reactionPickerRight,",
    "                      styles.reactionPickerLeft,",
)
patch(
    "src/components/MessageBubble.tsx",
    '  otherRow: { justifyContent: "flex-start" },',
    '  otherRow: { justifyContent: "flex-start" },\n  centerRow: { justifyContent: "center" },',
)
patch(
    "src/components/MessageBubble.tsx",
    '  otherWrapper: { alignItems: "flex-start" },',
    '  otherWrapper: { alignItems: "flex-start" },\n  centerWrapper: { alignItems: "center", maxWidth: "92%" },',
)
patch(
    "src/components/MessageBubble.tsx",
    '  other: {\n    borderWidth: 1,\n    borderColor: colors.borderSoft,\n    borderBottomLeftRadius: 5\n  },',
    '  other: {\n    borderWidth: 1,\n    borderColor: colors.borderSoft,\n    borderBottomLeftRadius: 5\n  },\n  centeredBubble: {\n    borderBottomLeftRadius: 17,\n    alignItems: "center"\n  },',
)

# Chat: announcement permissions and centered rendering; Free cannot initiate calls.
patch(
    "app/chat/[id].tsx",
    'import { isPrivateConversation } from "../../src/domain/conversationFilter";',
    'import { isPrivateConversation } from "../../src/domain/conversationFilter";\nimport {\n  canInitiatePrivateInteraction,\n  canPublishInConversation\n} from "../../src/domain/accessPolicy";',
)
patch(
    "app/chat/[id].tsx",
    "  const directMemberId = conversation?.memberIds?.find(\n    (memberId) => memberId !== currentUser.id\n  );",
    "  const directMemberId = conversation?.memberIds?.find(\n    (memberId) => memberId !== currentUser.id\n  );\n  const canPost = conversation\n    ? canPublishInConversation(currentUser, conversation)\n    : false;\n  const canInitiateCalls = canInitiatePrivateInteraction(currentUser.role);\n  const announcement = conversation?.type === \"announcement\";",
)
patch_all("app/chat/[id].tsx", "conversation?.canPost", "canPost")
patch_all("app/chat/[id].tsx", "conversation.canPost", "canPost")
patch(
    "app/chat/[id].tsx",
    '        {conversation.type === "direct" ? (',
    '        {conversation.type === "direct" && canInitiateCalls ? (',
)
patch(
    "app/chat/[id].tsx",
    "              onReact={(message, emoji) => toggleMessageReaction(message, emoji)}\n              onReply={setReplyingTo}",
    "              onReact={(message, emoji) => toggleMessageReaction(message, emoji)}\n              onReply={announcement ? undefined : setReplyingTo}\n              centered={announcement}",
)

# Free publication policy: Besoins only, with a direct Triton upgrade path.
patch(
    "app/new-highlight.tsx",
    "  Alert,\n  Animated,",
    "  Alert,\n  Animated,\n  Linking,",
)
patch(
    "app/new-highlight.tsx",
    'import { env } from "@/config/env";',
    'import { env } from "@/config/env";\nimport {\n  canPublishHighlightKind,\n  TRITON_CHECKOUT_URL\n} from "@/domain/accessPolicy";',
)
patch(
    "app/new-highlight.tsx",
    "  const { accessToken } = useSession();",
    "  const { accessToken, currentUser } = useSession();",
)
patch(
    "app/new-highlight.tsx",
    "  const publish = async () => {\n    if (publishing) return;",
    "  const chooseKind = (nextKind: HighlightKind) => {\n    if (!canPublishHighlightKind(currentUser.role, nextKind)) {\n      Alert.alert(\n        \"Passez Triton\",\n        \"Les comptes Free peuvent publier uniquement des Besoins. L’abonnement Triton débloque tous les formats.\",\n        [\n          { text: \"Plus tard\", style: \"cancel\" },\n          {\n            text: \"Passer Triton\",\n            onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL)\n          }\n        ]\n      );\n      return;\n    }\n    setKind(nextKind);\n  };\n\n  const publish = async () => {\n    if (publishing) return;\n    if (!canPublishHighlightKind(currentUser.role, kind)) {\n      await Linking.openURL(TRITON_CHECKOUT_URL);\n      return;\n    }",
)
patch(
    "app/new-highlight.tsx",
    "                onPress={() => setKind(item.value)}",
    "                onPress={() => chooseKind(item.value)}",
)

# Free private interactions: can receive, cannot initiate.
patch(
    "src/screens/NewConversationScreen.tsx",
    "  Image,\n  Pressable,",
    "  Image,\n  Linking,\n  Pressable,",
)
patch(
    "src/screens/NewConversationScreen.tsx",
    'import { env } from "../config/env";',
    'import { env } from "../config/env";\nimport {\n  canInitiatePrivateInteraction,\n  TRITON_CHECKOUT_URL\n} from "../domain/accessPolicy";',
)
patch(
    "src/screens/NewConversationScreen.tsx",
    "  const canCreateOfficialGroup = isVisionnaireRole(currentUser.role);",
    "  const canCreateOfficialGroup = isVisionnaireRole(currentUser.role);\n  const canInitiatePrivate = canInitiatePrivateInteraction(currentUser.role);",
)
patch(
    "src/screens/NewConversationScreen.tsx",
    "  const toggleMember = (memberId: string) => {\n    setSelectedIds",
    "  const toggleMember = (memberId: string) => {\n    if (!canInitiatePrivate) {\n      void Linking.openURL(TRITON_CHECKOUT_URL);\n      return;\n    }\n    setSelectedIds",
)
patch(
    "src/screens/NewConversationScreen.tsx",
    '    if (mode === "private") {\n      if (selectedIds.length === 0) {',
    '    if (mode === "private") {\n      if (!canInitiatePrivate) {\n        Alert.alert(\n          "Passez Triton",\n          "Un compte Free peut recevoir une invitation privée, mais doit passer Triton pour démarrer une conversation.",\n          [\n            { text: "Plus tard", style: "cancel" },\n            {\n              text: "Passer Triton",\n              onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL)\n            }\n          ]\n        );\n        return;\n      }\n      if (selectedIds.length === 0) {',
)

patch(
    "app/call/[id].tsx",
    "  Alert,\n  Pressable,",
    "  Alert,\n  Linking,\n  Pressable,",
)
patch(
    "app/call/[id].tsx",
    'import { env } from "@/config/env";',
    'import { env } from "@/config/env";\nimport {\n  canInitiatePrivateInteraction,\n  TRITON_CHECKOUT_URL\n} from "@/domain/accessPolicy";',
)
patch(
    "app/call/[id].tsx",
    "  const { accessToken } = useSession();",
    "  const { accessToken, currentUser } = useSession();",
)
patch(
    "app/call/[id].tsx",
    "  const startOutgoingCall = async () => {\n    if (preparing) return;",
    "  const startOutgoingCall = async () => {\n    if (preparing) return;\n    if (!canInitiatePrivateInteraction(currentUser.role)) {\n      Alert.alert(\n        \"Passez Triton\",\n        \"Un compte Free peut recevoir un appel, mais doit passer Triton pour appeler.\",\n        [\n          { text: \"Plus tard\", style: \"cancel\" },\n          {\n            text: \"Passer Triton\",\n            onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL)\n          }\n        ]\n      );\n      return;\n    }",
)

# Profile: use canonical status appearance and enforce the same initiation rule.
patch(
    "app/profile/[id].tsx",
    'import { ActionSheet, type ActionSheetOption } from "@/components/ActionSheet";',
    'import { ActionSheet, type ActionSheetOption } from "@/components/ActionSheet";\nimport { MemberStatusBadge } from "@/components/MemberStatusBadge";\nimport { StatusAvatar } from "@/components/StatusAvatar";',
)
patch(
    "app/profile/[id].tsx",
    'import { env } from "@/config/env";',
    'import { env } from "@/config/env";\nimport {\n  canInitiatePrivateInteraction,\n  TRITON_CHECKOUT_URL\n} from "@/domain/accessPolicy";',
)
patch(
    "app/profile/[id].tsx",
    "  const { accessToken } = useSession();",
    "  const { accessToken, currentUser } = useSession();",
)
patch(
    "app/profile/[id].tsx",
    "  const ensureConversation = async () => {\n    if (existingConversation) return existingConversation;",
    "  const ensureConversation = async () => {\n    if (!canInitiatePrivateInteraction(currentUser.role)) {\n      Alert.alert(\n        \"Passez Triton\",\n        \"Un compte Free peut être invité à discuter ou recevoir un appel, mais ne peut pas initier l’échange.\",\n        [\n          { text: \"Plus tard\", style: \"cancel\" },\n          {\n            text: \"Passer Triton\",\n            onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL)\n          }\n        ]\n      );\n      throw new Error(\"Interaction réservée aux membres Triton et supérieurs.\");\n    }\n    if (existingConversation) return existingConversation;",
)
patch(
    "app/profile/[id].tsx",
    "          <LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>\n            <View style={styles.avatarInner}>\n              {member.avatarUrl ? (\n                <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />\n              ) : (\n                <Text style={styles.initials}>{member.initials}</Text>\n              )}\n            </View>\n          </LinearGradient>",
    "          <StatusAvatar member={member} size={104} borderWidth={4} />",
)
patch(
    "app/profile/[id].tsx",
    "            <View style={styles.roleBadge}>\n              <Text style={styles.roleText}>{member.roleLabel}</Text>\n            </View>",
    "            <MemberStatusBadge role={member.role} compact />",
)

# Announcement group contract in the demonstration dataset.
patch(
    "src/data/mockData.ts",
    "    restricted: false,\n    activeMemberIds: [\"user-lea\", \"user-johan\", \"user-oceane\"]\n  },",
    "    restricted: false,\n    allowFreeDiscovery: true,\n    canPost: true,\n    ownerId: \"user-johan\",\n    adminIds: [\"user-johan\", \"user-lea\"],\n    announcementPublisherIds: [\"user-oceane\", \"user-nabiha\"],\n    memberIds: [\"user-johan\", \"user-lea\", \"user-oceane\", \"user-nabiha\"],\n    activeMemberIds: [\"user-lea\", \"user-johan\", \"user-oceane\"]\n  },",
)

# CI store gate includes all mandatory legal URLs.
patch(
    ".github/workflows/ci.yml",
    "          EXPO_PUBLIC_EAS_PROJECT_ID: 00000000-0000-0000-0000-000000000000\n          EXPO_PUBLIC_MOCK_MODE: \"false\"",
    "          EXPO_PUBLIC_EAS_PROJECT_ID: 00000000-0000-0000-0000-000000000000\n          EXPO_PUBLIC_PRIVACY_POLICY_URL: https://neptunebusiness.com/confidentialite\n          EXPO_PUBLIC_ACCOUNT_DELETION_URL: https://neptunebusiness.com/suppression-compte\n          EXPO_PUBLIC_SUPPORT_URL: https://neptunebusiness.com/contact\n          EXPO_PUBLIC_MOCK_MODE: \"false\"",
)

# Functional policy tests.
(ROOT / "tests/accessPolicy.test.ts").write_text(
    '''import assert from "node:assert/strict";\nimport test from "node:test";\n\nimport {\n  canInitiatePrivateInteraction,\n  canPublishHighlightKind,\n  canPublishInConversation,\n  getGroupJoinDecision\n} from "../src/domain/accessPolicy";\nimport type { Conversation } from "../src/types/messaging";\n\nconst group: Conversation = {\n  id: "group-test",\n  name: "Groupe test",\n  categoryLabel: "Test",\n  type: "topic",\n  memberCount: 10,\n  unreadCount: 0,\n  restricted: true,\n  allowFreeDiscovery: true,\n  allowedRoles: ["triton", "moussaillon", "capitaine", "amiral", "visionnaire"],\n  canPost: true\n};\n\ntest("Free reçoit mais ne peut pas initier une interaction privée", () => {\n  assert.equal(canInitiatePrivateInteraction("free"), false);\n  assert.equal(canInitiatePrivateInteraction("triton"), true);\n});\n\ntest("Free publie uniquement des Besoins", () => {\n  assert.equal(canPublishHighlightKind("free", "besoin"), true);\n  assert.equal(canPublishHighlightKind("free", "standard"), false);\n  assert.equal(canPublishHighlightKind("free", "offre"), false);\n  assert.equal(canPublishHighlightKind("triton", "offre"), true);\n});\n\ntest("un groupe visible aux Free exige néanmoins Triton pour être rejoint", () => {\n  assert.deepEqual(getGroupJoinDecision("free", group), {\n    visible: true,\n    canJoin: false,\n    requiresTriton: true\n  });\n});\n\ntest("les annonces sont publiables uniquement par les administrateurs et éditeurs", () => {\n  const announcement: Conversation = {\n    ...group,\n    id: "annonces",\n    type: "announcement",\n    adminIds: ["visionnaire-1"],\n    announcementPublisherIds: ["captain-1"]\n  };\n  assert.equal(\n    canPublishInConversation(\n      { id: "visionnaire-1", role: "visionnaire" },\n      announcement\n    ),\n    true\n  );\n  assert.equal(\n    canPublishInConversation({ id: "captain-1", role: "capitaine" }, announcement),\n    true\n  );\n  assert.equal(\n    canPublishInConversation({ id: "member-1", role: "triton" }, announcement),\n    false\n  );\n});\n''',
    encoding="utf-8",
)

# Store graphics generated from the official embedded Neptune mark.
logo_source = (ROOT / "src/assets/neptuneLogo.ts").read_text(encoding="utf-8")
match = re.search(r"data:image/png;base64,([A-Za-z0-9+/=]+)", logo_source)
if not match:
    raise RuntimeError("Logo Neptune embarqué introuvable")
logo = Image.open(io.BytesIO(base64.b64decode(match.group(1)))).convert("RGBA")
assets = ROOT / "assets"
assets.mkdir(exist_ok=True)


def contain(image: Image.Image, size: int) -> Image.Image:
    return ImageOps.contain(image, (size, size), Image.Resampling.LANCZOS)


def centered_canvas(size: int, mark_size: int, *, transparent: bool) -> Image.Image:
    background = (0, 0, 0, 0) if transparent else (2, 7, 19, 255)
    canvas = Image.new("RGBA", (size, size), background)
    mark = contain(logo, mark_size)
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas

centered_canvas(1024, 650, transparent=False).convert("RGB").save(assets / "icon.png", optimize=True)
centered_canvas(1024, 560, transparent=True).save(assets / "adaptive-icon.png", optimize=True)
centered_canvas(1024, 520, transparent=True).save(assets / "splash-icon.png", optimize=True)
centered_canvas(128, 94, transparent=False).convert("RGB").save(assets / "favicon.png", optimize=True)

notification = centered_canvas(96, 62, transparent=True)
alpha = notification.getchannel("A")
white = Image.new("RGBA", notification.size, (255, 255, 255, 0))
white.putalpha(alpha.point(lambda value: 255 if value > 20 else 0))
white.save(assets / "notification-icon.png", optimize=True)

print("Passe RC finale appliquée.")
