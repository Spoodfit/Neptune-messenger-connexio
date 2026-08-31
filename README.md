# Connexio by Neptune

Application mobile iOS et Android dédiée à la messagerie de l’écosystème Neptune Business.

## Règle d’architecture

Connexio remplace progressivement la communauté WhatsApp par un client mobile synchronisé avec Neptune Business Point App. Les deux interfaces utilisent les mêmes utilisateurs, identifiants, rôles, groupes, messages et règles d’accès.

Connexio ne crée ni backend, ni base utilisateurs, ni système de permissions parallèle.

## État technique

Le dépôt contient un noyau mobile Expo / React Native / TypeScript durci pour la préproduction :

- connexion Neptune par email/mot de passe sans persistance du mot de passe, avec échange mobile par code à usage unique également pris en charge ;
- access token court et refresh token stocké dans SecureStore ;
- rafraîchissement proactif et nouvelle tentative unique après HTTP 401 ;
- client API authentifié avec erreurs structurées ;
- validation stricte des réponses REST et événements WebSocket ;
- file d’envoi SQLite chiffrée, idempotence et retry borné ;
- fusion dédupliquée REST / temps réel / messages optimistes ;
- pagination par curseur de l’historique ;
- notifications Expo, deep links et rotation des tokens push ;
- révocation locale, serveur et push lors de la déconnexion ;
- états hors ligne, échec et nouvelle tentative visibles ;
- tests de domaine, dont une fusion de 500 messages sans perte ni doublon ;
- configuration production fail-closed : mock interdit, HTTPS et WSS obligatoires.

Les données de démonstration ne sont utilisées que lorsque `EXPO_PUBLIC_MOCK_MODE=true` est explicitement défini. Une build mal configurée ne bascule pas silencieusement sur de faux membres.

## Démarrage reproductible

Prérequis : Node.js 22.13 ou supérieur.

```bash
npm ci
cp .env.example .env
npm run start
```

Vérification locale :

```bash
npm run verify
npm run doctor
npx expo config --type public
```

Les notifications push distantes nécessitent un development build ou une build EAS. Elles ne fonctionnent pas dans Expo Go.

```bash
npx eas login
npx eas-cli@21.7.1 project:info
npm run build:preview
```

Le dépôt est déjà relié au projet EAS Connexio canonique : ne pas relancer `eas init`.

## Modes d’exécution

### Démonstration explicite

```env
EXPO_PUBLIC_MOCK_MODE=true
```

L’application utilise alors les données locales de `src/data/mockData.ts`.

### Backend Neptune

```env
EXPO_PUBLIC_MOCK_MODE=false
EXPO_PUBLIC_BACKEND_CONTRACT=connexio-v1
EXPO_PUBLIC_API_BASE_URL=https://api.neptunebusiness.com/api
EXPO_PUBLIC_REALTIME_URL=https://api.neptunebusiness.com
EXPO_PUBLIC_COWORKING_ENABLED=true
EXPO_PUBLIC_EAS_PROJECT_ID=1e85dc3a-4114-4387-8e15-2463a82e68fd
```

Une build EAS `release-candidate` ou `production` échoue si une de ces valeurs manque, si le mock est actif, si le contrat n’est pas `connexio-v1` ou si les transports ne sont pas chiffrés. Le profil `backend-smoke` conserve séparément le périmètre réduit du backend Neptune historique.

Avant de déclencher un build natif connecté :

```bash
npm run verify:rc
npm run smoke:production
```

Le second contrôle exige l’attestation serveur décrite dans [`docs/PRODUCTION_BACKEND_READINESS.md`](docs/PRODUCTION_BACKEND_READINESS.md) et refuse le build avant toute consommation de quota EAS.

## Architecture

```text
app/                         Routes mobiles Expo Router
src/components/              Composants UI
src/config/                  Configuration fail-closed
src/data/                    Données de démonstration uniquement
src/domain/                  Règles testables sans dépendance UI
src/providers/               Session et état de messagerie
src/services/api/            HTTP, contrat et normalisation réseau
src/services/auth/           Runtime de session authentifiée
src/services/notifications/  Notifications et cycle de vie du token
src/services/realtime/       WebSocket, validation et reconnexion
src/storage/                 Outbox SQLite / SQLCipher
src/theme/                   Design system Neptune
src/types/                   Modèles métier
tests/                       Tests Node du domaine et des contrats
docs/                        Architecture, sécurité et release gates
```

## Gates encore externes au dépôt

Le code ne suffit pas à valider ces points :

1. endpoints réels Neptune et autorisations serveur par rôle ;
2. contrainte d’idempotence et pagination prouvées sur la base de préproduction ;
3. WebSocket et ticket court testés sur réseau faible ;
4. APNs / FCM, certificats EAS et token push testés sur appareils physiques ;
5. identifiants Apple et Google définitifs ;
6. icônes, splash screen et captures stores définitives ;
7. blocage, signalement, modération, export et suppression de compte ;
8. VoiceOver, TalkBack, iPhone et deux Android réels ;
9. pilote mesuré avec crash-free sessions ≥ 99,5 % ;
10. restauration backend et procédure de rollback exercées.

Les pièces jointes, vocaux, appels, Map et Temps forts sont inclus dans le candidat, mais leur activation publique reste bloquée tant que stockage privé, TURN, notifications, modération et tests physiques n’ont pas fourni les preuves listées ci-dessus.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Contrat backend](docs/BACKEND_CONTRACT.md)
- [Stratégie de synchronisation](docs/SYNC_STRATEGY.md)
- [Modèle de menace](docs/THREAT_MODEL.md)
- [Critères de production](docs/PRODUCTION_READINESS.md)
- [Attestation backend de production](docs/PRODUCTION_BACKEND_READINESS.md)
- [Publication iOS et Android](docs/STORE_RELEASE.md)
