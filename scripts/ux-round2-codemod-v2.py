from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path: str) -> str:
    return (ROOT / path).read_text()

def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)

def replace(path: str, old: str, new: str, expected: int = 1) -> None:
    text = read(path)
    actual = text.count(old)
    if actual != expected:
        raise SystemExit(f"{path}: expected {expected} occurrence(s), found {actual}: {old[:120]!r}")
    write(path, text.replace(old, new, expected))

def replace_native_alerts() -> None:
    candidates = [*ROOT.joinpath("app").rglob("*.tsx"), *ROOT.joinpath("src").rglob("*.tsx")]
    for path in candidates:
        text = path.read_text()
        if "Alert.alert" not in text:
            continue
        text = text.replace("Alert.alert", "AppAlert.alert")

        def clean_react_native_import(match: re.Match[str]) -> str:
            body = match.group(1)
            tokens = [token.strip() for token in body.split(",") if token.strip() and token.strip() != "Alert"]
            if not tokens:
                return ""
            if "\n" in body:
                return 'import {\n  ' + ',\n  '.join(tokens) + '\n} from "react-native";'
            return 'import { ' + ', '.join(tokens) + ' } from "react-native";'

        text = re.sub(
            r'import\s*\{([^{}]*)\}\s*from\s*"react-native";',
            clean_react_native_import,
            text,
            flags=re.S,
        )

        if "AppAlert }" not in text and 'services/ui/AppAlert"' not in text:
            lines = text.splitlines()
            index = 0
            while index < len(lines):
                line = lines[index]
                if line.startswith("import ") or (index > 0 and lines[index - 1].startswith("import ") and not lines[index - 1].rstrip().endswith(";")):
                    index += 1
                    continue
                if index > 0 and not lines[index - 1].rstrip().endswith(";"):
                    index += 1
                    continue
                break
            lines.insert(index, 'import { AppAlert } from "@/services/ui/AppAlert";')
            text = "\n".join(lines) + ("\n" if text.endswith("\n") else "")
        path.write_text(text)

replace_native_alerts()

# Segmented controls: a 48dp target must fit inside the rounded track.
replace(
    "app/(tabs)/messages.tsx",
    'segmented: { height: 52, padding: 3, borderRadius: 16, borderWidth: 1, flexDirection: "row", overflow: "hidden" },',
    'segmented: { height: 56, padding: 3, borderRadius: 16, borderWidth: 1, flexDirection: "row", overflow: "hidden" },',
)
replace(
    "app/(tabs)/messages.tsx",
    'segmentButton: { flex: 1, minHeight: 48, borderRadius: 13, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },',
    'segmentButton: { flex: 1, height: 48, borderRadius: 12, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },',
)
replace(
    "app/(tabs)/highlights.tsx",
    'modeBar: { height: 52, padding: 3, borderRadius: 16, borderWidth: 1, flexDirection: "row", overflow: "hidden" }, modeButton: { flex: 1, minHeight: 48, overflow: "hidden", borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },',
    'modeBar: { height: 56, padding: 3, borderRadius: 16, borderWidth: 1, flexDirection: "row", overflow: "hidden" }, modeButton: { flex: 1, height: 48, overflow: "hidden", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },',
)

# Group avatar stack should fall back to all member ids when "active" ids are absent.
replace(
    "app/group/[id].tsx",
    'const activeMemberIds = (conversation?.activeMemberIds ?? []).filter(\n    (memberId) => !removedMemberIds.includes(memberId)\n  );',
    'const activeMemberIds = (conversation?.activeMemberIds?.length ? conversation.activeMemberIds : conversation?.memberIds ?? []).filter(\n    (memberId) => !removedMemberIds.includes(memberId)\n  );',
)

# Ending a call must stay inside Connexio and return to the conversation.
replace(
    "app/call/[id].tsx",
    '    if (router.canGoBack()) router.back();\n    else router.replace("/(tabs)/calls");',
    '    router.replace(conversationId ? `/chat/${encodeURIComponent(conversationId)}` : "/(tabs)/calls");',
)

# Chat: consume notification/mention target, move to it, and pulse the exact message.
replace(
    "src/screens/ChatConversationScreen.tsx",
    '  ActivityIndicator,\n  FlatList,',
    '  ActivityIndicator,\n  Animated,\n  FlatList,',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    '  const params = useLocalSearchParams<{ id: string }>();',
    '  const params = useLocalSearchParams<{ id: string; focusMention?: string; focusMessageId?: string }>();',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    '  const conversationId = Array.isArray(params.id)\n    ? (params.id[0] ?? "")\n    : (params.id ?? "");',
    '  const conversationId = Array.isArray(params.id)\n    ? (params.id[0] ?? "")\n    : (params.id ?? "");\n  const focusMention = (Array.isArray(params.focusMention) ? params.focusMention[0] : params.focusMention) === "1";\n  const requestedFocusMessageId = Array.isArray(params.focusMessageId) ? params.focusMessageId[0] : params.focusMessageId;',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    '  const lastMarkedReadMessageId = useRef<string | null>(null);',
    '  const lastMarkedReadMessageId = useRef<string | null>(null);\n  const messageListRef = useRef<FlatList<ChatMessage>>(null);\n  const spotlightProgress = useRef(new Animated.Value(0)).current;\n  const [spotlightMessageId, setSpotlightMessageId] = useState<string | null>(null);',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    '  const latestIncomingMessage = messages.find((message) => !message.isMine);',
    '  const mentionAliases = useMemo(() => {\n    const parts = currentUser.name.toLocaleLowerCase("fr").split(/\\s+/).filter(Boolean);\n    return [parts[0] ?? "", currentUser.name.toLocaleLowerCase("fr"), currentUser.company.toLocaleLowerCase("fr")].filter(Boolean);\n  }, [currentUser.company, currentUser.name]);\n  const latestIncomingMessage = messages.find((message) => !message.isMine);',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    '  useEffect(() => {\n    if (!conversationId || !latestMessageId || localOnly) return;\n    if (lastMarkedReadMessageId.current === latestMessageId) return;\n    lastMarkedReadMessageId.current = latestMessageId;\n    void markConversationRead(conversationId);\n  }, [conversationId, latestMessageId, localOnly, markConversationRead]);',
    '  useEffect(() => {\n    if (!conversationId || !latestMessageId || localOnly) return;\n    if (lastMarkedReadMessageId.current === latestMessageId) return;\n    lastMarkedReadMessageId.current = latestMessageId;\n    void markConversationRead(conversationId);\n  }, [conversationId, latestMessageId, localOnly, markConversationRead]);\n\n  useEffect(() => {\n    if (!focusMention && !requestedFocusMessageId) return;\n    const targetId = requestedFocusMessageId && messages.some((message) => message.id === requestedFocusMessageId)\n      ? requestedFocusMessageId\n      : messages.find((message) => message.mentionedUserIds?.includes(currentUser.id) || (!message.isMine && mentionAliases.some((alias) => alias && message.body.toLocaleLowerCase("fr").includes(`@${alias}`))))?.id;\n    if (!targetId) return;\n    const index = messages.findIndex((message) => message.id === targetId);\n    if (index < 0) return;\n    setSpotlightMessageId(targetId);\n    spotlightProgress.stopAnimation();\n    spotlightProgress.setValue(0);\n    requestAnimationFrame(() => messageListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }));\n    Animated.sequence([\n      Animated.timing(spotlightProgress, { toValue: 1, duration: 280, useNativeDriver: true }),\n      Animated.timing(spotlightProgress, { toValue: 0.35, duration: 520, useNativeDriver: true }),\n      Animated.timing(spotlightProgress, { toValue: 1, duration: 520, useNativeDriver: true }),\n      Animated.timing(spotlightProgress, { toValue: 0, duration: 900, useNativeDriver: true })\n    ]).start(({ finished }) => { if (finished) setSpotlightMessageId(null); });\n  }, [currentUser.id, focusMention, mentionAliases, messages, requestedFocusMessageId, spotlightProgress]);',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    '        <FlatList\n          accessibilityLabel={`Messages de ${conversation.name}`}',
    '        <FlatList\n          ref={messageListRef}\n          accessibilityLabel={`Messages de ${conversation.name}`}',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    '          renderItem={({ item }) => (\n            <MessageBubble\n              message={item}\n              reactions={getMessageReactions(item)}\n              onRetry={(clientMessageId) => void retryMessage(clientMessageId)}\n              onReact={(message, emoji) => toggleMessageReaction(message, emoji)}\n              onReply={announcement ? undefined : setReplyingTo}\n              centered={announcement}\n              onOpenProfile={openMemberProfile}\n              onVotePoll={votePoll}\n            />\n          )}',
    '          renderItem={({ item }) => {\n            const spotlight = item.id === spotlightMessageId;\n            return (\n              <Animated.View style={[styles.messageSpotlight, spotlight && { borderColor: theme.orange, borderWidth: 2, backgroundColor: theme.orangeSoft, shadowColor: theme.violet, opacity: spotlightProgress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 0.96, 1] }), transform: [{ scale: spotlightProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }) }] }]}>\n                <MessageBubble message={item} reactions={getMessageReactions(item)} onRetry={(clientMessageId) => void retryMessage(clientMessageId)} onReact={(message, emoji) => toggleMessageReaction(message, emoji)} onReply={announcement ? undefined : setReplyingTo} centered={announcement} onOpenProfile={openMemberProfile} onVotePoll={votePoll} />\n              </Animated.View>\n            );\n          }}\n          onScrollToIndexFailed={({ index }) => setTimeout(() => messageListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }), 180)}',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    '              <Pressable\n                accessibilityRole="button"\n                accessibilityLabel="Créer un sondage"',
    '              <Pressable\n                accessibilityRole="button"\n                accessibilityLabel="Recommander un contact"\n                onPress={() => {\n                  setAttachmentMenuOpen(false);\n                  router.push({ pathname: "/contact-actions", params: { intent: "message", conversationId: conversation.id } });\n                }}\n                style={styles.attachmentChoice}\n              >\n                <LinearGradient colors={theme.isLight ? [theme.accentSoft, theme.violetSoft] : gradients.activeTab} style={styles.attachmentChoiceIcon}>\n                  <Ionicons name="person-add-outline" size={23} color={theme.pageText} />\n                </LinearGradient>\n                <Text style={styles.attachmentChoiceText}>Recommander</Text>\n              </Pressable>\n              <Pressable\n                accessibilityRole="button"\n                accessibilityLabel="Créer un sondage"',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    '  historyLoader: { minHeight: 52, alignItems: "center", justifyContent: "center" },',
    '  messageSpotlight: { borderRadius: 20, padding: 0, shadowOpacity: 0.82, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 5 },\n  historyLoader: { minHeight: 52, alignItems: "center", justifyContent: "center" },',
)

# Settings: surface the preferred application/translation language.
replace(
    "app/(tabs)/settings.tsx",
    'import { BrandHeader } from "@/components/BrandHeader";',
    'import { BrandHeader } from "@/components/BrandHeader";\nimport { LanguagePickerModal } from "@/components/LanguagePickerModal";',
)
replace(
    "app/(tabs)/settings.tsx",
    'import { useExperience } from "@/providers/ExperienceProvider";',
    'import { useExperience } from "@/providers/ExperienceProvider";\nimport { useAppLanguage } from "@/providers/LanguageProvider";',
)
replace(
    "app/(tabs)/settings.tsx",
    'import { colors, gradients, spacing, typography } from "@/theme";',
    'import { colors, gradients, spacing, typography } from "@/theme";\nimport { SUPPORTED_LANGUAGES } from "@/i18n/languages";',
)
replace(
    "app/(tabs)/settings.tsx",
    '  const theme = useAppTheme();\n  const [signingOut, setSigningOut] = useState(false);',
    '  const theme = useAppTheme();\n  const { mode: languageMode, language } = useAppLanguage();\n  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);\n  const [signingOut, setSigningOut] = useState(false);',
)
replace(
    "app/(tabs)/settings.tsx",
    '          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>Réglages</Text>',
    '          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>Langue</Text><Text style={[styles.sectionSubtitle, { color: theme.pageTextMuted }]}>Choisissez la langue par défaut de Connexio et des traductions automatiques.</Text></View>\n          <Pressable accessibilityRole="button" accessibilityLabel="Changer la langue de Connexio" onPress={() => setLanguagePickerOpen(true)} style={({ pressed }) => [styles.languageCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}><Ionicons name="language-outline" size={22} color={theme.accent} /></View><View style={styles.rowContent}><Text style={[styles.rowTitle, { color: theme.pageText }]}>{languageMode === "system" ? "Langue du téléphone" : SUPPORTED_LANGUAGES.find((item) => item.code === language)?.nativeName ?? language.toLocaleUpperCase()}</Text><Text style={[styles.rowSubtitle, { color: theme.pageTextMuted }]}>Langue active : {SUPPORTED_LANGUAGES.find((item) => item.code === language)?.frenchName ?? language.toLocaleUpperCase()}</Text></View><Ionicons name="chevron-forward" size={19} color={theme.pageTextMuted} /></Pressable>\n\n          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>Réglages</Text>',
)
replace(
    "app/(tabs)/settings.tsx",
    '      </ScrollView>\n    </LinearGradient>',
    '      </ScrollView>\n      <LanguagePickerModal visible={languagePickerOpen} onClose={() => setLanguagePickerOpen(false)} />\n    </LinearGradient>',
)
replace(
    "app/(tabs)/settings.tsx",
    '  settingsList: { marginHorizontal: spacing',
    '  languageCard: { minHeight: 70, marginHorizontal: spacing.md, padding: 10, borderRadius: 19, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },\n  settingsList: { marginHorizontal: spacing',
)

print("ux-round2 codemod v2 applied")
