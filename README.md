# Connexio by Neptune

Application mobile iOS et Android dédiée à la messagerie de l’écosystème Neptune Business.

## Objectif

Connexio remplace progressivement la communauté WhatsApp par une application mobile synchronisée avec Neptune Business Point App. Les deux interfaces doivent utiliser les mêmes utilisateurs, les mêmes rôles, les mêmes groupes, les mêmes messages et les mêmes règles d’accès.

La V1 ne crée pas un second écosystème. Elle agit comme un **client mobile du backend Neptune existant**.

## État actuel

Le dépôt contient un MVP fonctionnel en mode démonstration :

- interface mobile inspirée de l’identité Neptune ;
- liste des conversations et groupes métiers ;
- groupes par ville : Carcassonne, Toulouse, Montpellier, Narbonne et Limoux ;
- espaces Visionnaires, Amiraux, Capitaines, SAV, Boost réseaux sociaux, réussites, besoins, publicité, rencontres et membres online ;
- écran de conversation avec envoi local de messages ;
- rôles et restrictions d’accès visibles ;
- architecture API et temps réel prête à raccorder ;
- inscription aux notifications push Expo ;
- deep links vers une conversation ;
- documentation technique, contrat backend et checklist de publication.

## Démarrage

Prérequis : Node.js 22.13 ou supérieur.

```bash
npm install
cp .env.example .env
npm run start
```

Les notifications push distantes nécessitent un **development build** ou une build EAS. Elles ne fonctionnent pas dans Expo Go.

```bash
npx eas login
npx eas init
npm run build:preview
```

## Modes d’exécution

### Démonstration

```env
EXPO_PUBLIC_MOCK_MODE=true
```

L’application utilise les données locales de `src/data/mockData.ts`.

### Backend Neptune

```env
EXPO_PUBLIC_MOCK_MODE=false
EXPO_PUBLIC_API_BASE_URL=https://api.votre-domaine.fr
EXPO_PUBLIC_REALTIME_URL=wss://api.votre-domaine.fr/v1/realtime
```

L’intégration se concentre dans :

- `src/services/api/neptuneApi.ts`
- `src/services/realtime/RealtimeClient.ts`
- `src/services/notifications/pushNotifications.ts`

## Architecture

```text
app/                         Routes mobiles Expo Router
src/components/              Composants UI
src/config/                  Variables d’environnement
src/data/                    Données de démonstration
src/providers/               Session et état de messagerie
src/services/api/            Contrat et client API
src/services/notifications/  Notifications push
src/services/realtime/       WebSocket et reconnexion
src/theme/                   Design system Neptune
src/types/                   Modèles métier
docs/                        Documentation d’intégration
```

## Ce qui reste à brancher

1. échange de session entre Neptune Business Point App et Connexio ;
2. endpoints réels de conversations, messages, membres et lecture ;
3. WebSocket ou service temps réel ;
4. endpoint d’enregistrement des tokens push ;
5. identifiants Apple, Google et EAS ;
6. icônes, splash screen et captures App Store définitives ;
7. politique de confidentialité, CGU et procédure de suppression de compte ;
8. tests de charge et audit de sécurité.

## Limite volontaire

Ce MVP ne prétend pas reproduire tout WhatsApp. Les appels, statuts, stories, chiffrement de bout en bout, sauvegardes cloud et import de l’historique WhatsApp sont hors périmètre. Les ajouter dès la V1 serait coûteux, lent et risqué.

Voir :

- [Architecture](docs/ARCHITECTURE.md)
- [Contrat backend](docs/BACKEND_CONTRACT.md)
- [Stratégie de synchronisation](docs/SYNC_STRATEGY.md)
- [Publication iOS et Android](docs/STORE_RELEASE.md)
