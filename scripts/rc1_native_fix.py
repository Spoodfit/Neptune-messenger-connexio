from __future__ import annotations

from pathlib import Path

ROOT = Path.cwd()
old_sound = ROOT / "assets/audio/connexio-notification.mp3"
new_sound = ROOT / "assets/audio/connexio_notification.mp3"

if old_sound.exists():
    if new_sound.exists():
        new_sound.unlink()
    old_sound.rename(new_sound)
elif not new_sound.exists():
    raise RuntimeError("Le son de notification Connexio est introuvable.")

for relative in (
    "app.config.ts",
    "src/services/notifications/pushNotifications.ts",
    "docs/PUSH_NOTIFICATION_MATRIX.md",
):
    path = ROOT / relative
    if not path.exists():
        continue
    content = path.read_text(encoding="utf-8")
    content = content.replace(
        "connexio-notification.mp3",
        "connexio_notification.mp3",
    )
    path.write_text(content, encoding="utf-8")

# This helper is staging-only and must never remain in the release branch.
Path(__file__).unlink(missing_ok=True)
print("Nom natif du son Android corrigé.")
