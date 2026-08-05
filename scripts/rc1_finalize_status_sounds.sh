#!/usr/bin/env bash
set -euo pipefail

cat scripts/bundle/part_* | base64 --decode > /tmp/connexio-status-sounds.tar.gz
echo "ca6ab288f0a1f3fdcd4789dad6453bad12de20b150387e0c5c71428e2d0d5072  /tmp/connexio-status-sounds.tar.gz" | sha256sum --check
tar -xzf /tmp/connexio-status-sounds.tar.gz

python - <<'PY'
from pathlib import Path

path = Path("scripts/rc1_status_sounds_patch.py")
text = path.read_text(encoding="utf-8")
old = 'text = replace_once(text, "    setSession(null);\\n    if (api && activeSession", "    setSession(null);\\n    if (activeSession) playCallEnd();\\n    if (api && activeSession", "call close sound")'
new = 'text = text.replace("    setSession(null);\\n    if (api && activeSession", "    setSession(null);\\n    if (activeSession) playCallEnd();\\n    if (api && activeSession", 1)'
if old not in text:
    raise SystemExit("Le correctif ciblé de fermeture d’appel est introuvable.")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
PY

python scripts/rc1_status_sounds_patch.py
python scripts/rc1_mobile_store_patch.py
rm -rf scripts/bundle
rm -f scripts/rc1_status_sounds_patch.py

npm ci --no-audit --no-fund
npm run verify:rc

python - <<'PY'
from pathlib import Path

for path in [
    "assets/audio/connexio_call_end.mp3",
    "assets/audio/connexio_message_sent.mp3",
    "assets/audio/connexio_mention.mp3",
]:
    item = Path(path)
    if not item.is_file() or item.stat().st_size < 1024:
        raise SystemExit(f"Audio invalide: {path}")

status_targets = [
    "app/(tabs)/calls.tsx",
    "app/(tabs)/contacts.tsx",
    "app/(tabs)/highlights.tsx",
    "app/(tabs)/settings.tsx",
    "app/account.tsx",
    "app/blocked-users.tsx",
    "app/call/[id].tsx",
    "app/chat/[id].tsx",
    "app/conversation/[id].tsx",
    "app/group/[id].tsx",
    "app/highlight/[id].tsx",
    "app/new-highlight.tsx",
    "src/components/ConversationRow.tsx",
    "src/components/HighlightCard.tsx",
    "src/components/MemberAvatarStack.tsx",
    "src/components/MessageBubble.tsx",
    "src/components/PollMessageCard.tsx",
    "src/screens/NewConversationScreen.tsx",
]
for path in status_targets:
    text = Path(path).read_text(encoding="utf-8")
    if "StatusAvatar" not in text and "MemberAvatarStack" not in text:
        raise SystemExit(f"Contouring de statut absent: {path}")

for path in ["src/components/NeptuneMap.native.tsx", "src/components/NeptuneMap.web.tsx"]:
    text = Path(path).read_text(encoding="utf-8")
    for token in ["getRoleAppearance", "roleColor", "roleBackground", "--role-color"]:
        if token not in text:
            raise SystemExit(f"Carte sans statut ({token}): {path}")
    if "avatarMarkup" not in text or "avatar is not defined" in text:
        raise SystemExit(f"Rendu d’avatar de carte invalide: {path}")

action_sounds = Path("src/services/audio/actionSounds.ts").read_text(encoding="utf-8")
provider = Path("src/providers/MessagingProvider.tsx").read_text(encoding="utf-8")
call = Path("app/call/[id].tsx").read_text(encoding="utf-8")
push = Path("src/services/notifications/pushNotifications.ts").read_text(encoding="utf-8")
config = Path("app.config.ts").read_text(encoding="utf-8")
account = Path("app/account.tsx").read_text(encoding="utf-8")
checks = [
    ("connexio_message_sent.mp3" in action_sounds and "playMessageSent" in provider, "Son de message envoyé non branché."),
    ("connexio_call_end.mp3" in action_sounds and "playCallEnd" in call, "Son de fin d’appel non branché."),
    ("connexio_mention.mp3" in action_sounds and "void playMention();" in provider, "Son de mention temps réel non branché."),
    ("mentionedUserIds?.includes(currentUser.id)" in provider, "Détection de mention nominative absente."),
    ("connexio_mention.mp3" in push and "connexio_mention.mp3" in config, "Son de notification de mention non configuré."),
    ('id: "replies"' in push, "Canal de réponse absent."),
    (all(token in account for token in ("requestAccountDeletion", "deleteAccount", "Supprimer mon compte")), "Suppression de compte native non accessible."),
    ("report" in Path("src/services/api/experienceApi.ts").read_text(encoding="utf-8").lower(), "Signalement de contenu absent."),
]
for valid, message in checks:
    if not valid:
        raise SystemExit(message)

for forbidden in [Path("scripts/rc1_status_sounds_patch.py"), Path("scripts/bundle")]:
    if forbidden.exists():
        raise SystemExit(f"Ressource temporaire restante: {forbidden}")
PY

export EXPO_PUBLIC_MOCK_MODE=true
export EXPO_PUBLIC_GITHUB_PAGES=false
export EXPO_PUBLIC_API_BASE_URL=https://api.example.invalid
export EXPO_PUBLIC_REALTIME_URL=wss://api.example.invalid/v1/realtime
export EXPO_PUBLIC_PRIVACY_POLICY_URL=https://neptunebusiness.com/confidentialite
export EXPO_PUBLIC_ACCOUNT_DELETION_URL=https://neptunebusiness.com/suppression-compte
export EXPO_PUBLIC_SUPPORT_URL=https://neptunebusiness.com/contact
npm run web:build

npm install --no-save --no-package-lock playwright@1.55.0 serve@14.2.4
npx playwright install --with-deps chromium
npx serve -s dist -l 4173 > /tmp/connexio-serve.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID || true' EXIT
for attempt in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:4173/ >/dev/null; then
    break
  fi
  sleep 1
done
node scripts/visual-audit.cjs
kill $SERVER_PID || true
trap - EXIT

export EAS_BUILD_PROFILE=release-candidate
export EXPO_PUBLIC_MOCK_MODE=false
export EXPO_PUBLIC_BUSINESS_WEB_BASE_URL=https://neptunebusiness.com
export EXPO_PUBLIC_EAS_PROJECT_ID=00000000-0000-0000-0000-000000000000
npx expo config --type public >/dev/null

cp package.json /tmp/connexio-package.json
cp package-lock.json /tmp/connexio-package-lock.json
npx expo prebuild --platform all --no-install --clean
test -d ios
test -d android
test -f android/app/src/main/AndroidManifest.xml
find android -type f -path '*res/raw/connexio_notification.*' -print -quit | grep -q .
find android -type f -path '*res/raw/connexio_mention.*' -print -quit | grep -q .
find ios -name PrivacyInfo.xcprivacy -print -quit | grep -q .

python - <<'PY'
from pathlib import Path
import plistlib

manifests = list(Path("ios").rglob("PrivacyInfo.xcprivacy"))
if not manifests:
    raise SystemExit("PrivacyInfo.xcprivacy absent du prébuild iOS.")
for manifest in manifests:
    with manifest.open("rb") as handle:
        plistlib.load(handle)
print(f"{len(manifests)} manifest(s) de confidentialité iOS valide(s).")
PY

grep -R "IPHONEOS_DEPLOYMENT_TARGET = 16.4" ios >/dev/null

(
  cd android
  ./gradlew :app:assembleDebug --no-daemon
)

APK_PATH=$(find android/app/build/outputs/apk/debug -name '*.apk' -print -quit)
test -n "$APK_PATH"
AAPT_PATH=$(find "$ANDROID_HOME/build-tools" -type f -name aapt | sort -V | tail -1)
ZIPALIGN_PATH=$(find "$ANDROID_HOME/build-tools" -type f -name zipalign | sort -V | tail -1)
test -x "$AAPT_PATH"
test -x "$ZIPALIGN_PATH"
"$AAPT_PATH" dump badging "$APK_PATH" | grep "targetSdkVersion:'36'"
"$ZIPALIGN_PATH" -c -P 16 -v 4 "$APK_PATH"

rm -rf ios android dist artifacts/visual-audit
cp /tmp/connexio-package.json package.json
cp /tmp/connexio-package-lock.json package-lock.json
rm -f scripts/rc1_mobile_store_patch.py
rm -f scripts/rc1_finalize_status_sounds.sh
rm -f .github/workflows/rc1-status-sounds-finalize.yml
rm -f .github/workflows/rc1-status-sounds-finalize-v2.yml

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A
if git diff --cached --quiet; then
  echo "Aucune correction applicative à enregistrer."
  exit 0
fi
git commit -m "fix: finalize store compliance, status contours and 48pt mobile UX"
git push origin HEAD:release/connexio-rc1
