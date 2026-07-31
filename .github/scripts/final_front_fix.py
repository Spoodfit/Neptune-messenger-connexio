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
    "app/(tabs)/highlights.tsx",
    'item === "feed" ? "Afficher le Feed" : "Afficher la Map"',
    'item === "feed" ? "Afficher le Feed" : "Afficher la carte"',
)
changed |= replace_once(
    "app/(tabs)/messages.tsx",
    '            <View style={styles.sheetHandle} />\n',
    '''            <View style={styles.sheetHandle} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer les options de conversation"
              onPress={closeMenu}
              style={({ pressed }) => ({
                position: "absolute",
                top: 8,
                right: 10,
                width: 44,
                height: 44,
                zIndex: 2,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.62 : 1
              })}
            >
              <Ionicons name="close" size={21} color={colors.textMuted} />
            </Pressable>
''',
)
changed |= replace_once(
    "scripts/product-audit.cjs",
    '        await page.keyboard.press("Escape");\n',
    '''        const closeOptions = page.getByLabel("Fermer les options de conversation");
        await expectVisible(closeOptions, "fermeture du menu de conversation");
        if (await closeOptions.isVisible().catch(() => false)) {
          await closeOptions.click();
          await page.waitForTimeout(180);
        }
''',
)

print("Frontend corrigé." if changed else "Frontend déjà corrigé.")
