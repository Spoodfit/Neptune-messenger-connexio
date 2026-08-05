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

python - <<'PY'
from pathlib import Path
import json

# Le patch global remplace plusieurs blocs d'avatar. Cette garde restaure la
# résolution de statut du message si une variation du fichier source a retiré
# sa déclaration pendant la transformation.
message_bubble = Path('src/components/MessageBubble.tsx')
text = message_bubble.read_text(encoding='utf-8')
if 'senderRoleAppearance' in text and 'const senderRoleAppearance =' not in text:
    anchor = '  const canReactWithLongPress = Boolean(onReact) && !message.isMine;\n'
    if anchor not in text:
        raise SystemExit('Point d’insertion du statut expéditeur introuvable.')
    text = text.replace(
        anchor,
        anchor + '  const senderRoleAppearance = getRoleAppearance(message.senderRole ?? "triton");\n',
        1,
    )
message_bubble.write_text(text, encoding='utf-8')

# La règle produit Connexio est volontairement plus stricte que le minimum
# Apple : toute cible tactile visible doit mesurer au moins 48 x 48.
visual = Path('scripts/visual-audit.cjs')
text = visual.read_text(encoding='utf-8')
text = text.replace(
    '{ name: "messages-390x844", width: 390, height: 844, route: "/" },',
    '{ name: "messages-360x800", width: 360, height: 800, route: "/" },\n'
    '  { name: "messages-390x844", width: 390, height: 844, route: "/" },\n'
    '  { name: "messages-393x852", width: 393, height: 852, route: "/" },',
    1,
)
text = text.replace('rect.width < 44 || rect.height < 44', 'rect.width < 48 || rect.height < 48')
if 'rect.width < 48 || rect.height < 48' not in text:
    raise SystemExit('Seuil tactile 48 x 48 non appliqué à l’audit visuel.')
visual.write_text(text, encoding='utf-8')

# Fige l'image EAS adaptée au SDK 57 : Xcode 26.6 côté iOS et toolchain
# Android API 36 côté Android.
eas_path = Path('eas.json')
eas = json.loads(eas_path.read_text(encoding='utf-8'))
for profile_name in ('release-candidate', 'production'):
    profile = eas['build'][profile_name]
    profile.setdefault('ios', {})['image'] = 'sdk-57'
    profile.setdefault('android', {})['image'] = 'sdk-57'
eas_path.write_text(json.dumps(eas, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

store_checklist = Path('docs/STORE_RELEASE_CHECKLIST.md')
store_checklist.write_text('''# Connexio — contrôle de publication stores\n\n## Contrôles automatisés dans le dépôt\n\n- Expo SDK 57 : Android `compileSdkVersion` / `targetSdkVersion` 36 et image EAS `sdk-57`.\n- Image iOS EAS `sdk-57`, compatible Xcode 26 et SDK iOS 26.\n- Prébuild iOS et Android reproductible.\n- Manifest de confidentialité iOS généré et syntaxiquement valide.\n- Permissions caméra, microphone, reconnaissance vocale, photothèque et localisation documentées.\n- Politique de confidentialité, assistance et suppression de compte obligatoires pour les builds stores.\n- Sons natifs de notification et de mention embarqués.\n- APK de contrôle compilé, ciblant l’API 36 et vérifié pour l’alignement 16 Ko.\n- Audit visuel sur 360×800, 390×844 et 393×852 avec cibles tactiles minimales de 48×48.\n- Tests TypeScript, tests métier, audit des dépendances et audit responsive.\n\n## Éléments à renseigner dans les consoles\n\n### App Store Connect\n\n- Compte de démonstration actif et instructions de revue.\n- URL de confidentialité et réponses App Privacy cohérentes avec le backend et les SDK.\n- Questionnaire de classification d’âge à jour.\n- Captures iPhone et iPad si la prise en charge iPad est conservée.\n- Coordonnées d’assistance et notes de revue expliquant les appels, messages, contenus utilisateurs, signalements et blocages.\n\n### Google Play Console\n\n- Compte de démonstration actif dans « Accès à l’application ».\n- Formulaire « Sécurité des données » cohérent avec le backend et les SDK.\n- Politique de confidentialité, URL de suppression de compte et classification du contenu.\n- Déclarations relatives aux permissions sensibles utilisées.\n- Test fermé ou interne avant passage en production.\n\n## Contrôles externes indispensables avant soumission finale\n\n- Build signé réel avec les identifiants Apple et Google de Neptune.\n- Vérification APNs et FCM sur appareils physiques.\n- Appels audio/vidéo testés sur réseaux Wi-Fi, 4G/5G et avec TURN de production.\n- Backend de production disponible, sans données fictives et avec un compte reviewer stable.\n- Validation finale des déclarations de collecte avec le responsable juridique / RGPD.\n''', encoding='utf-8')
PY

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
    ('accountDeletionUrl' in Path('app/account.tsx').read_text(encoding='utf-8'), 'Suppression de compte non accessible dans l’app.'),
    ('report' in Path('src/services/api/experienceApi.ts').read_text(encoding='utf-8').lower(), 'Signalement de contenu absent.'),
]
for valid, message in checks:
    if not valid:
        raise SystemExit(message)

if Path('scripts/rc1_status_sounds_patch.py').exists() or Path('scripts/bundle').exists():
    raise SystemExit('Des ressources temporaires de patch subsistent.')
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
manifests = list(Path('ios').rglob('PrivacyInfo.xcprivacy'))
if not manifests:
    raise SystemExit('PrivacyInfo.xcprivacy absent du prébuild iOS.')
for manifest in manifests:
    with manifest.open('rb') as handle:
        plistlib.load(handle)
print(f'{len(manifests)} manifest(s) de confidentialité iOS valide(s).')
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

rm -rf ios android dist
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
git commit -m "fix: finalize store compliance, status contours and 48pt mobile UX"
git push origin HEAD:release/connexio-rc1
