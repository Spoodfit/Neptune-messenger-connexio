from pathlib import Path

# [highlight-share] déclenchement contrôlé.
path = Path("app/highlight/[id].tsx")
text = path.read_text()

old_import = 'import { HighlightCard } from "@/components/HighlightCard";'
new_import = old_import + '\nimport { HighlightShareButton } from "@/components/HighlightShareButton";'
if text.count(old_import) != 1:
    raise SystemExit("HighlightCard import mismatch")
text = text.replace(old_import, new_import, 1)

old = '''        <Pressable
          onPress={() =>
            Alert.alert(
              "Partager",
              "Le lien sécurisé et la feuille de partage native seront branchés ici."
            )
          }
          style={styles.headerButton}
        >
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </Pressable>'''
new = '''        <HighlightShareButton post={post} />'''
if text.count(old) != 1:
    raise SystemExit("Share block mismatch")
text = text.replace(old, new, 1)
path.write_text(text)
