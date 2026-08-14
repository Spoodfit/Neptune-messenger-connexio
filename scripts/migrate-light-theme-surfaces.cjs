const fs = require("node:fs");

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Missing migration anchor: ${label}`);
  return source.replace(from, to);
}

const tokenReplacements = [
  ["colors.textSecondary", "theme.pageTextSecondary"],
  ["colors.textMuted", "theme.pageTextMuted"],
  ["colors.surfaceStrong", "theme.surfaceStrong"],
  ["colors.surfaceMuted", "theme.surfaceMuted"],
  ["colors.primarySoft", "theme.accentSoft"],
  ["colors.successSoft", "theme.successSoft"],
  ["colors.warningSoft", "theme.warningSoft"],
  ["colors.dangerSoft", "theme.dangerSoft"],
  ["colors.borderSoft", "theme.borderSoft"],
  ["colors.background", "theme.pageBackground"],
  ["colors.surface", "theme.surface"],
  ["colors.border", "theme.border"],
  ["colors.violet", "theme.violet"],
  ["colors.orange", "theme.orange"],
  ["colors.success", "theme.success"],
  ["colors.warning", "theme.warning"],
  ["colors.danger", "theme.danger"],
  ["colors.text", "theme.pageText"]
];

function semanticize(source) {
  let next = source;
  for (const [from, to] of tokenReplacements) next = next.split(from).join(to);
  next = next.split("gradients.screen").join("theme.pageGradient");
  next = next.split("colors={gradients.activeTab}").join("colors={theme.isLight ? [theme.accentSoft, theme.violetSoft] : gradients.activeTab}");
  return next;
}

function migrateNewHighlight() {
  const path = "app/new-highlight.tsx";
  let source = fs.readFileSync(path, "utf8");
  source = replaceRequired(source, 'import { StatusAvatar } from "@/components/StatusAvatar";', 'import { StatusAvatar } from "@/components/StatusAvatar";\nimport { ThemeModeButton } from "@/components/ThemeModeButton";\nimport { type ConnexioTheme, useAppTheme } from "@/providers/ThemeProvider";', "new-highlight theme imports");
  source = replaceRequired(source, "export default function NewHighlightScreen() {\n  const insets = useSafeAreaInsets();", "export default function NewHighlightScreen() {\n  const insets = useSafeAreaInsets();\n  const theme = useAppTheme();\n  const styles = useMemo(() => createStyles(theme), [theme]);", "new-highlight theme state");
  source = replaceRequired(source, '        <Pressable\n          accessibilityRole="button"\n          accessibilityLabel="Publier"', '        <ThemeModeButton />\n        <Pressable\n          accessibilityRole="button"\n          accessibilityLabel="Publier"', "new-highlight topbar theme button");
  source = replaceRequired(source, "const styles = StyleSheet.create({", "const createStyles = (theme: ConnexioTheme) => StyleSheet.create({", "new-highlight style factory");
  source = semanticize(source);
  fs.writeFileSync(path, source);
}

function migrateChat() {
  const path = "src/screens/ChatConversationScreen.tsx";
  let source = fs.readFileSync(path, "utf8");
  source = replaceRequired(source, 'import { StatusAvatar } from "../../src/components/StatusAvatar";', 'import { StatusAvatar } from "../../src/components/StatusAvatar";\nimport { ThemeModeButton } from "../../src/components/ThemeModeButton";', "chat theme button import");
  source = replaceRequired(source, 'import { useSession } from "../../src/providers/SessionProvider";', 'import { useSession } from "../../src/providers/SessionProvider";\nimport { type ConnexioTheme, useAppTheme } from "../../src/providers/ThemeProvider";', "chat theme import");
  source = replaceRequired(source, "export default function ChatScreen() {\n  const params = useLocalSearchParams<{ id: string }>();\n  const insets = useSafeAreaInsets();", "export default function ChatScreen() {\n  const params = useLocalSearchParams<{ id: string }>();\n  const insets = useSafeAreaInsets();\n  const theme = useAppTheme();\n  const styles = useMemo(() => createStyles(theme), [theme]);", "chat theme state");
  source = replaceRequired(source, "        {conversation.type === \"direct\" ? (", "        <ThemeModeButton />\n        {conversation.type === \"direct\" ? (", "chat topbar theme button");
  source = replaceRequired(source, '<Ionicons name="chevron-back" size={25} color={colors.white} />', '<Ionicons name="chevron-back" size={25} color={theme.pageText} />', "chat back button contrast");
  source = replaceRequired(source, "const styles = StyleSheet.create({", "const createStyles = (theme: ConnexioTheme) => StyleSheet.create({", "chat style factory");
  source = source.split("colors={[colors.navyLight, colors.background]}").join("colors={theme.pageGradient}");
  source = semanticize(source);
  fs.writeFileSync(path, source);
}

function migrateNewConversation() {
  const path = "src/screens/NewConversationScreen.tsx";
  let source = fs.readFileSync(path, "utf8");
  source = replaceRequired(source, 'import { Ionicons } from "@expo/vector-icons";', 'import { Ionicons } from "@expo/vector-icons";\nimport { ThemeModeButton } from "../components/ThemeModeButton";', "new conversation theme button import");
  source = replaceRequired(source, 'import { useSession } from "../providers/SessionProvider";', 'import { useSession } from "../providers/SessionProvider";\nimport { type ConnexioTheme, useAppTheme } from "../providers/ThemeProvider";', "new conversation theme import");
  source = replaceRequired(source, "export default function NewConversationScreen() {\n  const insets = useSafeAreaInsets();", "export default function NewConversationScreen() {\n  const insets = useSafeAreaInsets();\n  const theme = useAppTheme();\n  const styles = createStyles(theme);", "new conversation theme state");
  source = replaceRequired(source, '        <Pressable\n          accessibilityRole="button"\n          accessibilityLabel="Créer"', '        <ThemeModeButton />\n        <Pressable\n          accessibilityRole="button"\n          accessibilityLabel="Créer"', "new conversation topbar theme button");
  source = replaceRequired(source, "const styles = StyleSheet.create({", "const createStyles = (theme: ConnexioTheme) => StyleSheet.create({", "new conversation style factory");
  source = semanticize(source);
  fs.writeFileSync(path, source);
}

function migrateConversationInfo() {
  const path = "app/conversation/[id].tsx";
  let source = fs.readFileSync(path, "utf8");
  source = replaceRequired(source, 'import { StatusAvatar } from "@/components/StatusAvatar";', 'import { StatusAvatar } from "@/components/StatusAvatar";\nimport { ThemeModeButton } from "@/components/ThemeModeButton";\nimport { type ConnexioTheme, useAppTheme } from "@/providers/ThemeProvider";', "conversation info theme imports");
  source = replaceRequired(source, "export default function ConversationInfoScreen() {\n  const params = useLocalSearchParams<{ id: string }>();\n  const insets = useSafeAreaInsets();", "export default function ConversationInfoScreen() {\n  const params = useLocalSearchParams<{ id: string }>();\n  const insets = useSafeAreaInsets();\n  const theme = useAppTheme();\n  const styles = createStyles(theme);", "conversation info theme state");
  source = replaceRequired(source, '        <View style={styles.headerButton} />', '        <ThemeModeButton />', "conversation info topbar theme button");
  source = replaceRequired(source, "const styles = StyleSheet.create({", "const createStyles = (theme: ConnexioTheme) => StyleSheet.create({", "conversation info style factory");
  source = semanticize(source);
  fs.writeFileSync(path, source);
}

function migrateHighlightDetail() {
  const path = "app/highlight/[id].tsx";
  let source = fs.readFileSync(path, "utf8");
  source = replaceRequired(source, 'import { StatusAvatar } from "@/components/StatusAvatar";', 'import { StatusAvatar } from "@/components/StatusAvatar";\nimport { ThemeModeButton } from "@/components/ThemeModeButton";\nimport { type ConnexioTheme, useAppTheme } from "@/providers/ThemeProvider";', "highlight detail theme imports");
  source = replaceRequired(source, "export default function HighlightDetailScreen() {\n  const params = useLocalSearchParams<{ id: string }>();\n  const insets = useSafeAreaInsets();", "export default function HighlightDetailScreen() {\n  const params = useLocalSearchParams<{ id: string }>();\n  const insets = useSafeAreaInsets();\n  const theme = useAppTheme();\n  const styles = createStyles(theme);", "highlight detail theme state");
  source = replaceRequired(source, '        <HighlightShareButton post={post} />', '        <View style={styles.headerActions}><ThemeModeButton /><HighlightShareButton post={post} /></View>', "highlight detail topbar theme button");
  source = replaceRequired(source, "const styles = StyleSheet.create({", "const createStyles = (theme: ConnexioTheme) => StyleSheet.create({", "highlight detail style factory");
  source = semanticize(source);
  source = source.replace("headerButton: {", "headerActions: { flexDirection: \"row\", alignItems: \"center\", gap: 2 },\n  headerButton: {");
  fs.writeFileSync(path, source);
}

migrateNewHighlight();
migrateChat();
migrateNewConversation();
migrateConversationInfo();
migrateHighlightDetail();
console.log("Light theme surface migration generated.");
