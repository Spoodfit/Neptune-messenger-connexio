#!/usr/bin/env bash
set -euo pipefail

cat scripts/bundle/part_* | base64 --decode > /tmp/connexio-status-sounds.tar.gz
echo "ca6ab288f0a1f3fdcd4789dad6453bad12de20b150387e0c5c71428e2d0d5072  /tmp/connexio-status-sounds.tar.gz" | sha256sum --check
tar -xzf /tmp/connexio-status-sounds.tar.gz

python - <<'PY'
from pathlib import Path
path = Path('scripts/rc1_status_sounds_patch.py')
text = path.read_text(encoding='utf-8')
old = 'text = replace_once(text, "    setSession(null);\\n    if (api && activeSession", "    setSession(null);\\n    if (activeSession) playCallEnd();\\n    if (api && activeSession", "call close sound")'
new = 'text = text.replace("    setSession(null);\\n    if (api && activeSession", "    setSession(null);\\n    if (activeSession) playCallEnd();\\n    if (api && activeSession", 1)'
if old not in text:
    raise SystemExit('Le correctif ciblé de fermeture d’appel est introuvable.')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
PY

rm -rf scripts/bundle
python scripts/rc1_status_sounds_patch.py

npm ci --no-audit --no-fund
npm run verify:rc

python - <<'PY'
from pathlib import Path

for path in [
    'assets/audio/connexio_call_end.mp3',
    'assets/audio/connexio_message_sent.mp3',
    'assets/audio/connexio_mention.mp3',
]:
    item = Path(path)
    if not item.is_file() or item.stat().st_size < 1024:
        raise SystemExit(f'Audio invalide: {path}')

status_targets = [
    'app/(tabs)/calls.tsx',
    'app/(tabs)/contacts.tsx',
    'app/(tabs)/highlights.tsx',
    'app/(tabs)/settings.tsx',
    'app/account.tsx',
    'app/blocked-users.tsx',
    'app/call/[id].tsx',
    'app/chat/[id].tsx',
    'app/conversation/[id].tsx',
    'app/group/[id].tsx',
    'app/highlight/[id].tsx',
    'app/new-highlight.tsx',
    'src/components/ConversationRow.tsx',
    'src/components/HighlightCard.tsx',
    'src/components/MemberAvatarStack.tsx',
    'src/components/MessageBubble.tsx',
    'src/components/PollMessageCard.tsx',
    'src/screens/NewConversationScreen.tsx',
]
for path in status_targets:
    text = Path(path).read_text(encoding='utf-8')
    if 'StatusAvatar' not in text and 'MemberAvatarStack' not in text:
        raise SystemExit(f'Contouring de statut absent: {path}')

for path in ['src/components/NeptuneMap.native.tsx', 'src/components/NeptuneMap.web.tsx']:
    text = Path(path).read_text(encoding='utf-8')
    for token in ['getRoleAppearance', 'roleColor', 'roleBackground', '--role-color']:
        if token not in text:
            raise SystemExit(f'Carte sans statut ({token}): {path}')

action_sounds = Path('src/services/audio/actionSounds.ts').read_text(encoding='utf-8')
provider = Path('src/providers/MessagingProvider.tsx').read_text(encoding='utf-8')
call = Path('app/call/[id].tsx').read_text(encoding='utf-8')
push = Path('src/services/notifications/pushNotifications.ts').read_text(encoding='utf-8')
config = Path('app.config.ts').read_text(encoding='utf-8')
checks = [
    ('connexio_message_sent.mp3' in action_sounds and 'playMessageSent' in provider, 'Son de message envoyé non branché.'),
    ('connexio_call_end.mp3' in action_sounds and 'playCallEnd' in call, 'Son de fin d’appel non branché.'),
    ('connexio_mention.mp3' in action_sounds and 'playMention' in provider, 'Son de mention temps réel non branché.'),
    ('connexio_mention.mp3' in push and 'connexio_mention.mp3' in config, 'Son de notification de mention non configuré.'),
    ('id: "replies"' in push, 'Canal de réponse absent.'),
]
for valid, message in checks:
    if not valid:
        raise SystemExit(message)

if Path('scripts/rc1_status_sounds_patch.py').exists() or Path('scripts/bundle').exists():
    raise SystemExit('Des ressources temporaires de patch subsistent.')
PY

export EXPO_PUBLIC_MOCK_MODE=true
export EXPO_PUBLIC_GITHUB_PAGES=true
export EXPO_PUBLIC_API_BASE_URL=https://api.example.invalid
export EXPO_PUBLIC_REALTIME_URL=wss://api.example.invalid/v1/realtime
export EXPO_PUBLIC_PRIVACY_POLICY_URL=https://neptunebusiness.com/confidentialite
export EXPO_PUBLIC_ACCOUNT_DELETION_URL=https://neptunebusiness.com/suppression-compte
export EXPO_PUBLIC_SUPPORT_URL=https://neptunebusiness.com/contact
npm run web:build

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
rm -rf ios android
cp /tmp/connexio-package.json package.json
cp /tmp/connexio-package-lock.json package-lock.json

rm -f scripts/rc1_finalize_status_sounds.sh

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A
if git diff --cached --quiet; then
  echo "Aucune correction applicative à enregistrer."
  exit 0
fi
git commit -m "fix: apply member status contours and contextual action sounds app-wide"
git push origin HEAD:release/connexio-rc1
