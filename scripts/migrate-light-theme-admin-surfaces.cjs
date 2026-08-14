const fs = require("node:fs");

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Missing migration anchor: ${label}`);
  return source.replace(from, to);
}

const replacements = [
  ["colors.textSecondary", "theme.pageTextSecondary"], ["colors.textMuted", "theme.pageTextMuted"],
  ["colors.surfaceStrong", "theme.surfaceStrong"], ["colors.surfaceMuted", "theme.surfaceMuted"],
  ["colors.primarySoft", "theme.accentSoft"], ["colors.successSoft", "theme.successSoft"],
  ["colors.warningSoft", "theme.warningSoft"], ["colors.dangerSoft", "theme.dangerSoft"],
  ["colors.borderSoft", "theme.borderSoft"], ["colors.background", "theme.pageBackground"],
  ["colors.surface", "theme.surface"], ["colors.border", "theme.border"],
  ["colors.violet", "theme.violet"], ["colors.orange", "theme.orange"],
  ["colors.success", "theme.success"], ["colors.warning", "theme.warning"],
  ["colors.danger", "theme.danger"], ["colors.text", "theme.pageText"]
];
function semanticize(source) {
  let next = source;
  for (const [from, to] of replacements) next = next.split(from).join(to);
  return next.split("gradients.screen").join("theme.pageGradient");
}

function migrateGroup() {
  const path = "app/group/[id].tsx";
  let source = fs.readFileSync(path, "utf8");
  source = replaceRequired(source, 'import { StatusAvatar } from "@/components/StatusAvatar";', 'import { StatusAvatar } from "@/components/StatusAvatar";\nimport { ThemeModeButton } from "@/components/ThemeModeButton";\nimport { type ConnexioTheme, useAppTheme } from "@/providers/ThemeProvider";', "group theme imports");
  source = replaceRequired(source, "export default function GroupSettingsScreen() {\n  const params = useLocalSearchParams<{ id: string }>();\n  const insets = useSafeAreaInsets();", "export default function GroupSettingsScreen() {\n  const params = useLocalSearchParams<{ id: string }>();\n  const insets = useSafeAreaInsets();\n  const theme = useAppTheme();\n  const styles = useMemo(() => createStyles(theme), [theme]);", "group theme state");
  source = replaceRequired(source, "        {canEditSettings ? (", "        <ThemeModeButton />\n        {canEditSettings ? (", "group topbar theme button");
  source = replaceRequired(source, "const styles = StyleSheet.create({", "const createStyles = (theme: ConnexioTheme) => StyleSheet.create({", "group style factory");
  source = semanticize(source);
  fs.writeFileSync(path, source);
}

function migrateScheduleMessage() {
  const path = "app/schedule-message/[id].tsx";
  let source = fs.readFileSync(path, "utf8");
  source = replaceRequired(source, 'import { env } from "@/config/env";', 'import { ThemeModeButton } from "@/components/ThemeModeButton";\nimport { env } from "@/config/env";', "schedule theme button import");
  source = replaceRequired(source, 'import { useSession } from "@/providers/SessionProvider";', 'import { useSession } from "@/providers/SessionProvider";\nimport { type ConnexioTheme, useAppTheme } from "@/providers/ThemeProvider";', "schedule theme import");
  source = replaceRequired(source, "export default function GroupAutomationsScreen() {\n  const params = useLocalSearchParams<{ id: string }>();\n  const insets = useSafeAreaInsets();", "export default function GroupAutomationsScreen() {\n  const params = useLocalSearchParams<{ id: string }>();\n  const insets = useSafeAreaInsets();\n  const theme = useAppTheme();\n  const styles = createStyles(theme);", "schedule theme state");
  source = replaceRequired(source, '<View style={styles.roleBadge}><Ionicons name="shield-checkmark-outline" size={17} color={colors.success} /></View>', '<View style={styles.headerActions}><View style={styles.roleBadge}><Ionicons name="shield-checkmark-outline" size={17} color={theme.success} /></View><ThemeModeButton /></View>', "schedule topbar theme button");
  source = replaceRequired(source, "const styles = StyleSheet.create({", "const createStyles = (theme: ConnexioTheme) => StyleSheet.create({", "schedule style factory");
  source = semanticize(source);
  source = source.replace("headerButton: {", "headerActions: { flexDirection: \"row\", alignItems: \"center\", gap: 2 },\n  headerButton: {");
  fs.writeFileSync(path, source);
}

migrateGroup();
migrateScheduleMessage();
console.log("Admin light theme migrations generated.");
