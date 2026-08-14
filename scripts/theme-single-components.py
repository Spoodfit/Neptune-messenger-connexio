from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "app/+not-found.tsx",
    "app/sign-in.tsx",
    "app/membership-required.tsx",
    "app/(tabs)/communities.tsx",
    "src/components/BaseMessageBubble.tsx",
    "src/components/CallSurface.native.tsx",
    "src/components/CallSurface.web.tsx",
    "src/components/InAppAttachmentViewer.native.tsx",
    "src/components/InAppAttachmentViewer.web.tsx",
    "src/components/PollComposerModal.tsx",
    "src/components/TranslatedMessageBubble.tsx",
    "src/components/InlineVoiceRecorder.tsx",
    "src/components/SwipeableMemberRow.tsx",
    "src/components/EventVoteBanner.tsx",
    "src/components/HighlightShareButton.tsx",
    "src/components/VoiceRecorderModal.web.tsx",
]

TOKEN_MAP = [
    ("colors.textSecondary", "theme.pageTextSecondary"),
    ("colors.textMuted", "theme.pageTextMuted"),
    ("colors.text", "theme.pageText"),
    ("colors.surfaceStrong", "theme.surfaceStrong"),
    ("colors.surfaceMuted", "theme.surfaceMuted"),
    ("colors.surface", "theme.surface"),
    ("colors.background", "theme.pageBackground"),
    ("colors.borderSoft", "theme.borderSoft"),
    ("colors.border", "theme.border"),
    ("colors.orangeSoft", "theme.orangeSoft"),
    ("colors.violetSoft", "theme.violetSoft"),
    ("colors.dangerSoft", "theme.dangerSoft"),
    ("colors.successSoft", "theme.successSoft"),
    ("colors.warningSoft", "theme.warningSoft"),
    ("colors.orange", "theme.orange"),
    ("colors.violet", "theme.violet"),
    ("colors.danger", "theme.danger"),
    ("colors.success", "theme.success"),
    ("colors.warning", "theme.warning"),
    ("colors.primarySoft", "theme.accentSoft"),
    ("colors.navyLight", "theme.border"),
    ("gradients.screen", "theme.pageGradient"),
]


def migrate(path_str: str) -> None:
    path = ROOT / path_str
    if not path.exists():
        print(f"SKIP missing {path_str}")
        return
    text = path.read_text()
    if "const createStyles = (theme:" in text:
        print(f"SKIP already migrated {path_str}")
        return
    match = re.search(r"export\s+(?:default\s+)?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{", text, re.S)
    if not match:
        print(f"SKIP no exported function {path_str}")
        return
    styles_marker = "const styles = StyleSheet.create({"
    styles_index = text.rfind(styles_marker)
    if styles_index < 0 or styles_index < match.end():
        print(f"SKIP no trailing styles {path_str}")
        return
    before_component = text[:match.start()]
    if "styles." in before_component:
        print(f"SKIP helper uses styles before main component {path_str}")
        return

    if 'providers/ThemeProvider"' not in text:
        insert_at = match.start()
        text = text[:insert_at] + 'import { useAppTheme } from "@/providers/ThemeProvider";\n' + text[insert_at:]
        # exported function shifted; find again
        match = re.search(r"export\s+(?:default\s+)?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{", text, re.S)
        assert match

    if "useMemo" not in text[:match.start()]:
        text = 'import { useMemo } from "react";\n' + text
        match = re.search(r"export\s+(?:default\s+)?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{", text, re.S)
        assert match

    injection = "\n  const theme = useAppTheme();\n  const styles = useMemo(() => createStyles(theme), [theme]);"
    text = text[:match.end()] + injection + text[match.end():]

    styles_index = text.rfind(styles_marker)
    text = text[:styles_index] + 'const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({' + text[styles_index + len(styles_marker):]

    component_start = match.start()
    mutable = text[component_start:]
    for old, new in TOKEN_MAP:
        mutable = mutable.replace(old, new)
    text = text[:component_start] + mutable

    # Light mode should use a clear neutral surface for non-media utility panels.
    if path_str.endswith("BaseMessageBubble.tsx"):
        text = text.replace('colors={gradients.glass}', 'colors={theme.isLight ? [theme.surface, theme.surfaceStrong] as const : gradients.glass}')
        text = text.replace('backgroundColor: "rgba(2,7,19,0.28)"', 'backgroundColor: theme.isLight ? theme.surfaceMuted : "rgba(2,7,19,0.28)"')
        text = text.replace('backgroundColor: "rgba(8,18,38,0.98)"', 'backgroundColor: theme.shellBackground')
        text = text.replace('backgroundColor: "rgba(107,79,234,0.22)"', 'backgroundColor: theme.violetSoft')
        text = text.replace('backgroundColor: "rgba(8,18,38,0.96)"', 'backgroundColor: theme.shellBackground')
        text = text.replace('borderColor: "rgba(174,184,210,0.32)"', 'borderColor: theme.border')
    elif path_str.endswith("InlineVoiceRecorder.tsx"):
        text = text.replace('backgroundColor: "rgba(2,7,19,0.22)"', 'backgroundColor: theme.isLight ? theme.surfaceMuted : "rgba(2,7,19,0.22)"')
    elif path_str.endswith("PollComposerModal.tsx"):
        text = text.replace('backgroundColor: "rgba(0,0,0,0.72)"', 'backgroundColor: theme.overlay')
    elif "InAppAttachmentViewer" in path_str:
        text = text.replace('backgroundColor: "rgba(0,0,0,0.72)"', 'backgroundColor: theme.overlay')

    path.write_text(text)
    print(f"MIGRATED {path_str}")


for candidate in FILES:
    migrate(candidate)
