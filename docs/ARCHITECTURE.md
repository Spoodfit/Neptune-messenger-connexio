# Architecture de Connexio

## Décision principale

Connexio doit être un **client mobile supplémentaire** du système Neptune, pas une plateforme séparée.

```text
Neptune Business Point App (web)
             │
             │ API REST + WebSocket
             ▼
        Backend Neptune
        ├── identité
        ├── rôles
        ├── clubs
        ├── conversations
        ├── messages
        ├── lecture
        └── tokens push
             ▲
             │
             │ API REST + WebSocket
             │
       Connexio iOS/Android
```

## Pourquoi Expo/React Native

- un seul code TypeScript pour iOS et Android ;
- interface réellement mobile et distribuable sur les stores ;
- notifications APNs et FCM via `expo-notifications` ;
- développement plus rapide qu’une double base Swift/Kotlin ;
- possibilité de passer plus tard sur du natif spécifique sans réécrire le backend ;
- mises à jour JavaScript possibles entre deux publications, dans les limites des règles Apple et Google.

## Source de vérité

Le backend Neptune est la seule source de vérité.

L’application mobile ne décide jamais seule :

- qui peut voir un groupe ;
- qui peut publier ;
- qui peut administrer ;
- quels messages existent ;
- si une personne appartient encore à un club.

Les restrictions présentes dans le MVP ne servent qu’à simuler l’expérience.

## Modules

### Session

À terme, Connexio doit utiliser le même compte que Neptune Business Point App. Le scénario recommandé est un échange de jeton à durée courte :

1. l’utilisateur se connecte sur le web ou ouvre un lien universel ;
2. le backend crée un code à usage unique ;
3. Connexio échange ce code contre un access token et un refresh token ;
4. le refresh token est stocké dans SecureStore ;
5. toute révocation côté Neptune coupe aussi Connexio.

### Conversations

Les conversations doivent être générées depuis les données existantes :

- un club ouvert et attribué à un capitaine crée ou active son groupe ;
- un membre voit les groupes des clubs auxquels il appartient ;
- les rôles donnent accès aux groupes Capitaines, Amiraux ou Visionnaires ;
- le groupe Annonces autorise seulement certains rôles à publier ;
- la fermeture d’un club archive le groupe sans supprimer l’historique.

### Temps réel

WebSocket recommandé avec événements :

- `message.created`
- `message.updated`
- `message.deleted`
- `conversation.read`
- `presence.changed`
- `conversation.membership.changed`

Une reconnexion exponentielle est déjà prévue dans `RealtimeClient`.

### Push

Lorsqu’un message est créé :

1. le backend enregistre le message ;
2. il diffuse l’événement temps réel aux utilisateurs connectés ;
3. il calcule les destinataires hors ligne ;
4. il envoie un push avec `conversationId` ;
5. Connexio ouvre directement la conversation.

### Pièces jointes

Ne pas stocker les fichiers dans la base principale. Utiliser un stockage objet compatible S3 avec URL signée, antivirus et durée d’expiration.

## Évolutions prévues

### V1

- texte ;
- annonces ;
- groupes par ville et par rôle ;
- notifications push ;
- lecture/non-lu ;
- recherche de membres ;
- signalement et modération basiques.

### V1.1

- images et documents ;
- réponses à un message ;
- mentions ;
- réactions ;
- messages épinglés ;
- mode hors ligne minimal.

### V2

- messages vocaux ;
- sondages Neptune ;
- événements directement dans une conversation ;
- création automatique de groupes temporaires ;
- appels ou visio seulement si le besoin est prouvé.

## Non-objectifs

- reproduire intégralement WhatsApp ;
- importer silencieusement les historiques WhatsApp ;
- créer une seconde base d’utilisateurs ;
- gérer les droits uniquement dans l’application ;
- stocker des secrets dans le code mobile.
