from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(path: str, replacements: list[tuple[str, str]]) -> None:
    file = ROOT / path
    text = file.read_text(encoding="utf-8")
    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)
    file.write_text(text, encoding="utf-8")


# Typography scale: long secondary text uses 14 px; body uses 16 px.
patch(
    "src/theme/index.ts",
    [
        ("fontSize: 12,\n    lineHeight: 16,\n    fontWeight: \"600\"", "fontSize: 14,\n    lineHeight: 20,\n    fontWeight: \"600\""),
    ],
)

patch(
    "src/components/MemberAvatarStack.tsx",
    [
        ("Math.max(6.5, size * 0.27)", "Math.max(11, size * 0.27)"),
        ("fontSize: 9.5,", "fontSize: 11,"),
    ],
)

patch(
    "app/(tabs)/contacts.tsx",
    [
        ("...typography.caption,\n    color: colors.textMuted,", "...typography.caption,\n    fontSize: 14,\n    lineHeight: 20,\n    color: colors.textMuted,"),
        ("width: 46,\n    height: 46,", "width: 48,\n    height: 48,"),
    ],
)

patch(
    "app/account.tsx",
    [
        ("fontSize: 10, marginTop: 4", "fontSize: 12, lineHeight: 16, marginTop: 4"),
        ("minHeight: 44, marginTop", "minHeight: 48, marginTop"),
        ("fontSize: 10, fontWeight: \"900\"", "fontSize: 14, fontWeight: \"900\""),
        ("fontSize: 13, fontWeight: \"900\"", "fontSize: 14, fontWeight: \"900\""),
        ("fontSize: 10, lineHeight: 14, marginTop: 3", "fontSize: 14, lineHeight: 20, marginTop: 3"),
        ("fontSize: 11, lineHeight: 14, marginTop: 3", "fontSize: 14, lineHeight: 20, marginTop: 3"),
        ("fontSize: 11, lineHeight: 16", "fontSize: 14, lineHeight: 20"),
        ("fontSize: 12, fontWeight: \"900\"", "fontSize: 14, fontWeight: \"900\""),
    ],
)

patch(
    "app/notification-settings.tsx",
    [
        ("fontSize: 10, fontWeight: \"800\"", "fontSize: 14, fontWeight: \"800\""),
        ("fontSize: 13, fontWeight: \"900\"", "fontSize: 14, fontWeight: \"900\""),
        ("fontSize: 10, marginTop: 3", "fontSize: 14, lineHeight: 20, marginTop: 3"),
        ("fontSize: 11, marginTop: 3", "fontSize: 14, lineHeight: 20, marginTop: 3"),
        ("fontSize: 10,\n    lineHeight: 14,", "fontSize: 14,\n    lineHeight: 20,"),
        ("fontSize: 11,\n    lineHeight: 14,", "fontSize: 14,\n    lineHeight: 20,"),
        ("height: 44,", "height: 48,"),
    ],
)

patch(
    "app/(tabs)/settings.tsx",
    [
        ("...typography.caption,\n    color: colors.textMuted,", "...typography.caption,\n    fontSize: 14,\n    lineHeight: 20,\n    color: colors.textMuted,"),
        ("fontSize: 15,\n    lineHeight: 20,", "fontSize: 16,\n    lineHeight: 24,"),
        ("gap: 7", "gap: 8"),
    ],
)

patch(
    "src/components/EventVoteBanner.tsx",
    [
        ("fontSize: 8,", "fontSize: 11,"),
        ("fontSize: 11.5,", "fontSize: 14,"),
        ("fontSize: 8.8, lineHeight: 12", "fontSize: 14, lineHeight: 20"),
        ("fontSize: 11, lineHeight: 12", "fontSize: 14, lineHeight: 20"),
        ("minHeight: 40,", "minHeight: 48,"),
        ("fontSize: 10, fontWeight: \"900\"", "fontSize: 14, fontWeight: \"900\""),
    ],
)

patch(
    "app/chat/[id].tsx",
    [
        ("callActions: { flexDirection: \"row\", gap: 3 }", "callActions: { flexDirection: \"row\", gap: 8 }"),
        ("width: 44,\n    height: 44,\n    borderRadius: 15,", "width: 48,\n    height: 48,\n    borderRadius: 16,"),
        ("avatarPressable: {\n    width: AVATAR_SIZE,\n    minHeight: 44,", "avatarPressable: {\n    width: 48,\n    minWidth: 48,\n    minHeight: 48,\n    alignItems: \"center\","),
        ("avatarPressable: {\n    width: AVATAR_SIZE,\n    minHeight: 48,", "avatarPressable: {\n    width: 48,\n    minWidth: 48,\n    minHeight: 48,\n    alignItems: \"center\","),
        ("smallButton: { width: 44, height: 44", "smallButton: { width: 48, height: 48"),
        ("minHeight: 46,\n    maxHeight: 122,", "minHeight: 48,\n    maxHeight: 122,"),
        ("...typography.bodySmall\n  },\n  sendButton", "...typography.bodySmall,\n    fontSize: 16,\n    lineHeight: 22\n  },\n  sendButton"),
        ("width: 46, height: 46", "width: 48, height: 48"),
        ("fontSize: 9.5", "fontSize: 11"),
    ],
)

patch(
    "src/components/MessageBubble.tsx",
    [
        ("width: AVATAR_SIZE,\n    minHeight: 44,", "width: 48,\n    minWidth: 48,\n    minHeight: 48,\n    alignItems: \"center\","),
        ("width: AVATAR_SIZE,\n    minHeight: 48,", "width: 48,\n    minWidth: 48,\n    minHeight: 48,\n    alignItems: \"center\","),
        ("senderPressable: { minWidth: 44, minHeight: 44", "senderPressable: { minWidth: 48, minHeight: 48"),
        ("fontSize: 8,\n    lineHeight: 11,", "fontSize: 11,\n    lineHeight: 14,"),
        ("fontSize: 10,\n    fontWeight: \"800\"", "fontSize: 14,\n    fontWeight: \"800\""),
    ],
)

patch(
    "app/new-highlight.tsx",
    [
        ("minHeight: 44,", "minHeight: 48,"),
        ("minHeight: 46,", "minHeight: 48,"),
        ("fontSize: 10, lineHeight: 15", "fontSize: 14, lineHeight: 20"),
        ("fontSize: 11, lineHeight: 15", "fontSize: 14, lineHeight: 20"),
        ("fontSize: 8.5,\n    lineHeight: 13,", "fontSize: 14,\n    lineHeight: 20,"),
        ("fontSize: 11,\n    lineHeight: 13,", "fontSize: 14,\n    lineHeight: 20,"),
        ("...typography.bodySmall\n  },\n  placeSuggestions", "...typography.bodySmall,\n    fontSize: 16,\n    lineHeight: 22\n  },\n  placeSuggestions"),
        ("fontSize: 9,\n    textAlign: \"right\"", "fontSize: 11,\n    textAlign: \"right\""),
    ],
)

patch(
    "src/components/HighlightCard.tsx",
    [
        ("minHeight: 46,", "minHeight: 48,"),
        ("authorPressable: {\n    flex: 1,\n    minWidth: 0,", "authorPressable: {\n    flex: 1,\n    minWidth: 48,"),
        ("moreButton: { width: 44, height: 44", "moreButton: { width: 48, height: 48"),
        ("compactBody: { fontSize: 11, lineHeight: 16 }", "compactBody: { fontSize: 14, lineHeight: 20 }"),
        ("reactionSummary: {\n    minHeight: 44,", "reactionSummary: {\n    minHeight: 48,"),
        ("gap: 2\n  },\n  reactionSummaryTarget", "gap: 8\n  },\n  reactionSummaryTarget"),
        ("minWidth: 44,\n    height: 44,", "minWidth: 48,\n    height: 48,"),
        ("actions: {\n    minHeight: 48,\n    marginTop: 2,", "actions: {\n    minHeight: 48,\n    marginTop: 8,"),
        ("flexDirection: \"row\",\n    alignItems: \"center\"\n  },\n  action:", "flexDirection: \"row\",\n    flexWrap: \"wrap\",\n    alignItems: \"center\",\n    gap: 8\n  },\n  action:"),
        ("minWidth: 44,\n    minHeight: 44,", "minWidth: 48,\n    minHeight: 48,"),
    ],
)

patch(
    "app/(tabs)/highlights.tsx",
    [
        ("modeButton: { flex: 1, minHeight: 44", "modeButton: { flex: 1, minHeight: 48"),
        ("createButton: { width: 44, height: 44", "createButton: { width: 48, height: 48"),
        ("mapHint: { position: \"absolute\", left: 22, right: 22, bottom: 24, minHeight: 44", "mapHint: { position: \"absolute\", left: 22, right: 22, bottom: 24, minHeight: 48"),
        ("mapHintText: { color: colors.textSecondary, fontSize: 10, fontWeight: \"800\" }", "mapHintText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontWeight: \"800\" }"),
        ("mapHintText: { color: colors.textSecondary, fontSize: 11, fontWeight: \"800\" }", "mapHintText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontWeight: \"800\" }"),
    ],
)

# The hidden checkbox/radio input used by React Native Web Switch has no visible
# label. It must not be treated as a text field requiring a 16 px font.
visual = ROOT / "scripts/visual-audit.cjs"
text = visual.read_text(encoding="utf-8")
needle = '        if (isInput) return fontSize < 16;'
replacement = '        if (isInput && ["checkbox", "radio"].includes(element.type)) return false;\n        if (isInput) return fontSize < 16;'
if needle in text and replacement not in text:
    text = text.replace(needle, replacement, 1)
visual.write_text(text, encoding="utf-8")
