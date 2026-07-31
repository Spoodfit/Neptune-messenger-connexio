from pathlib import Path


def replace_once(path: str, old: str, new: str) -> bool:
    file = Path(path)
    content = file.read_text(encoding="utf-8")
    if new in content:
        return False
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{path}: motif source introuvable ou ambigu ({count})")
    file.write_text(content.replace(old, new, 1), encoding="utf-8")
    return True


changed = False

changed |= replace_once(
    "app/(tabs)/messages.tsx",
    'segmented: { flex: 1, height: 44, padding: 3,',
    'segmented: { flex: 1, height: 52, padding: 3,',
)
changed |= replace_once(
    "app/(tabs)/messages.tsx",
    'segmentButton: { flex: 1, minHeight: 36,',
    'segmentButton: { flex: 1, minHeight: 44,',
)

changed |= replace_once(
    "app/(tabs)/highlights.tsx",
    'paddingHorizontal: 10, paddingTop: 10, flexDirection: "row", gap: 8 },',
    'paddingHorizontal: 10, paddingTop: 10, flexDirection: "row", alignItems: "center", gap: 8 },',
)
changed |= replace_once(
    "app/(tabs)/highlights.tsx",
    'modeBar: { flex: 1, height: 44, padding: 3,',
    'modeBar: { flex: 1, height: 52, padding: 3,',
)
changed |= replace_once(
    "app/(tabs)/highlights.tsx",
    'modeButton: { flex: 1, minHeight: 36,',
    'modeButton: { flex: 1, minHeight: 44,',
)

changed |= replace_once(
    "src/components/HighlightCard.tsx",
    'reactionChoice: { width: 42, height: 42,',
    'reactionChoice: { width: 44, height: 44,',
)
changed |= replace_once(
    "src/components/HighlightCard.tsx",
    'action: { flex: 1, minHeight: 42,',
    'action: { flex: 1, minHeight: 44,',
)

changed |= replace_once(
    "app/chat/[id].tsx",
    'headerContent: { flex: 1, minWidth: 0, justifyContent: "center" },',
    'headerContent: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: "center" },',
)
changed |= replace_once(
    "app/chat/[id].tsx",
    'smallButton: { width: 38, height: 38,',
    'smallButton: { width: 44, height: 44,',
)

changed |= replace_once(
    "src/components/MessageBubble.tsx",
    'const AVATAR_SIZE = 34;',
    'const AVATAR_SIZE = 44;',
)
changed |= replace_once(
    "src/components/MessageBubble.tsx",
    '''              onPress={() => onOpenProfile?.(message.senderId)}
              hitSlop={6}
            >''',
    '''              onPress={() => onOpenProfile?.(message.senderId)}
              hitSlop={6}
              style={styles.senderPressable}
            >''',
)
changed |= replace_once(
    "src/components/MessageBubble.tsx",
    '  sender: {\n',
    '  senderPressable: { minWidth: 44, minHeight: 44, justifyContent: "flex-end" },\n  sender: {\n',
)

changed |= replace_once(
    "app/(tabs)/settings.tsx",
    '''      await signOut();
      router.replace("/sign-in");''',
    '''      await signOut();''',
)

changed |= replace_once(
    "scripts/product-audit.cjs",
    '''      await expectVisible(page.getByText("Entrer en démonstration", { exact: true }), "retour à la connexion");
      await checkGeometry(page, "Connexion après déconnexion");
      await page.getByText("Entrer en démonstration", { exact: true }).click();''',
    '''      const demoEntry = page.getByLabel("Entrer dans la démonstration Connexio");
      await expectVisible(demoEntry, "retour à la connexion");
      await checkGeometry(page, "Connexion après déconnexion");
      await demoEntry.click();''',
)

print("Corrections appliquées." if changed else "Corrections déjà présentes.")
