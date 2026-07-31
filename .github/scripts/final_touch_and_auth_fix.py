from pathlib import Path

path = Path("app/(tabs)/settings.tsx")
content = path.read_text(encoding="utf-8")
old = '''      await signOut();
      router.replace("/sign-in");'''
new = '''      await signOut();'''

if old in content:
    path.write_text(content.replace(old, new, 1), encoding="utf-8")
    print("Redirection de logout doublonnée supprimée.")
elif 'router.replace("/sign-in");' not in content:
    print("Correction déjà présente.")
else:
    raise SystemExit("Motif de logout ambigu : correction refusée.")
