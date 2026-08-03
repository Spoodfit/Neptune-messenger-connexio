from __future__ import annotations

from pathlib import Path

script_path = Path(__file__).with_name("rc1_apply.py")
source = script_path.read_text(encoding="utf-8")

start_marker = "# API de gouvernance réelle des groupes."
end_marker = "# Données de démonstration couvrant tous les statuts et groupe Annonces"
start = source.find(start_marker)
end = source.find(end_marker, start)
if start < 0 or end < 0:
    raise RuntimeError("Bloc API obsolète introuvable dans rc1_apply.py")

# The governance API is now maintained directly in source. Removing this
# one-time rewrite prevents the staging script from reapplying obsolete
# string patches to an already hardened service.
source = source[:start] + source[end:]
exec(compile(source, str(script_path), "exec"), {"__name__": "__main__"})
