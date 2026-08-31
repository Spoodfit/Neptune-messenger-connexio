# Connexio V26 — contrat de remise backend

## État réel du backend Neptune (11 août 2026)

Connexio utilise le même compte et la même base métier que Neptune Business via :

```text
EXPO_PUBLIC_API_BASE_URL=https://api.neptunebusiness.com/api
EXPO_PUBLIC_BACKEND_CONTRACT=neptune-web-v1
EXPO_PUBLIC_BUSINESS_WEB_BASE_URL=https://neptunebusiness.com
EXPO_PUBLIC_MOCK_MODE=false
```

Ce mode connecte `/v1/auth`, `/v1/users`, `/v1/needs`, `/v1/benefits` et la suppression de compte. Il désactive volontairement messagerie, appels, push et fonctions communautaires non protégées. Les routes historiques `/message-threads` et `/messages` ne doivent pas être utilisées : elles ne garantissent pas actuellement l’appartenance du demandeur au thread.

Le profil EAS `production` refuse ce contrat. Il ne devient constructible qu’après déploiement et déclaration explicite du contrat `connexio-v1` décrit ci-dessous.

## Architecture cible `connexio-v1`

Connexio est le client de messagerie de Neptune Business. Le frontend Expo/React Native consomme le backend existant : **Node.js / Express 5**, **Prisma 7**, **PostgreSQL 16**, **Redis**, authentification Neptune et **Socket.IO**.

`EXPO_PUBLIC_API_BASE_URL` pointe vers la racine précédant `/v1`. Pour une API publique sous `/api/v1`, utiliser par exemple :

```text
EXPO_PUBLIC_API_BASE_URL=https://api.neptunebusiness.com/api
EXPO_PUBLIC_REALTIME_URL=https://api.neptunebusiness.com
EXPO_PUBLIC_BACKEND_CONTRACT=connexio-v1
EXPO_PUBLIC_BUSINESS_WEB_BASE_URL=https://neptunebusiness.com
EXPO_PUBLIC_MOCK_MODE=false
```

## Authentification Neptune

| Méthode | Route | Usage |
|---|---|---|
| `POST` | `/v1/auth/login` | email et mot de passe Neptune |
| `GET` | `/v1/auth/me` | restauration de la session cookie |
| `POST` | `/v1/auth/refresh` | renouvellement des cookies HttpOnly |
| `POST` | `/v1/auth/logout` | révocation de la session |

Les requêtes d’authentification utilisent `credentials: include`. Le mot de passe n’est jamais persisté dans Connexio. Le backend normalise `role`, `special_role` et `statut`.

## Droits des groupes officiels

L’interface de création et d’administration des groupes officiels est réservée aux **Visionnaires**. Les routes serveur doivent appliquer la même règle en utilisant les champs de rôle Neptune et ne jamais se fier uniquement au client.

Un thread renvoie au minimum :

```json
{
  "id": "thread-id",
  "type": "group",
  "name": "Club Carcassonne",
  "member_ids": ["user-1", "user-2"],
  "member_count": 2,
  "active_member_ids": ["user-2", "user-1"],
  "visibility_roles": ["visionnaire", "moussaillon", "free"],
  "can_post": true,
  "event_vote_alert": null
}
```

`member_count` est le nombre réel de participants. `active_member_ids` est ordonné par activité récente.

## Conversations et messages

Routes consommées par le client :

- `GET /v1/conversations` ;
- `POST /v1/conversations/direct` ;
- `POST /v1/conversations/private-group` ;
- `POST /v1/groups` ;
- `PATCH /v1/groups/:threadId` ;
- `POST /v1/groups/:threadId/leave` ;
- `POST` et `DELETE /v1/conversations/:threadId/mute` ;
- `GET /v1/conversations/:threadId/messages?cursor=` ;
- `POST /v1/conversations/:threadId/messages` ;
- `POST /v1/conversations/:threadId/read` ;
- `POST /v1/messages/:messageId/reactions` ;
- `DELETE /v1/messages/:messageId/reactions/:emoji`.

Le serveur déduplique les conversations privées par ensemble exact de participants. Une demande identique renvoie le thread existant.

## Médias et fichiers

Le client autorise au maximum **10 contenus** et **120 Mo cumulés** par message :

- photo : 15 Mo maximum ;
- vidéo : 80 Mo maximum ;
- document ou fichier : 50 Mo maximum.

Flux attendu : préparation d’upload, URL pré-signée, envoi vers le stockage privé, finalisation, puis message contenant les identifiants de fichiers. La préparation fournit `expires_at`. La finalisation fournit `download_url`, `download_expires_at` et, pour les médias, `thumbnail_url` temporaires. Le client RC/production refuse les URLs non HTTPS, avec identifiants intégrés, sans expiration ou déjà proches de l’expiration.

Le serveur revérifie nombre, taille, MIME réel, droits d’accès et antivirus.

## Sondages et votes d’évènements

Routes :

- `POST /v1/conversations/:threadId/polls` ;
- `POST /v1/messages/:messageId/poll-votes` ;
- `DELETE /v1/messages/:messageId/poll-votes/:optionId`.

Exemple :

```json
{
  "poll": {
    "id": "poll-id",
    "question": "Quel créneau préférez-vous ?",
    "allow_multiple": false,
    "anonymous": false,
    "total_votes": 31,
    "closes_at": "2026-08-08T21:59:00.000Z",
    "event_vote_id": "event-id",
    "event_vote_url": "https://neptunebusiness.com/events/votes/...",
    "options": [
      {
        "id": "option-id",
        "label": "Jeudi 20 août",
        "vote_count": 18,
        "voted_by_current_user": true
      }
    ]
  }
}
```

Le groupe officiel de la ville reçoit également :

```json
{
  "event_vote_alert": {
    "id": "alert-id",
    "title": "2 évènements attendent votre vote",
    "club_name": "Club Carcassonne",
    "city": "Carcassonne",
    "pending_count": 2,
    "web_url": "https://neptunebusiness.com/events/votes?club=carcassonne",
    "closes_at": "2026-08-09T21:59:00.000Z"
  }
}
```

Les votes web et Connexio partagent le même identifiant canonique et une contrainte d’unicité Prisma.

## Temps réel Socket.IO

Le client utilise Engine.IO 4 / Socket.IO avec ticket éphémère :

- `POST /v1/realtime/ticket` ;
- handshake Socket.IO avec `ticket` ;
- heartbeat, reconnexion exponentielle et déduplication côté client.

Évènements minimum :

- `message.created`, `message.updated`, `message.deleted` ;
- `message.reaction.updated` ;
- `poll.updated`, `poll.vote.updated` ;
- `thread.updated`, `thread.member.updated` ;
- `event.vote.updated` ;
- `highlight.created`, `highlight.updated`, `highlight.deleted` ;
- `highlight.reaction.updated`, `highlight.comment.created` ;
- `presence.updated` ;
- évènements d’appel listés ci-dessous.

Chaque évènement doit contenir un `event_id` unique et un `updated_at` serveur.

## Appels audio et vidéo intégrés

Connexio **n’utilise pas Jitsi**. L’appel utilise `getUserMedia`, `RTCPeerConnection`, ICE/STUN/TURN et une signalisation Socket.IO dans l’écran Connexio.

Routes :

- `POST /v1/calls` ;
- `POST /v1/calls/:callId/end`.

Réponse attendue :

```json
{
  "call_id": "call-id",
  "thread_id": "thread-id",
  "type": "video",
  "socket_url": "https://neptunebusiness.com",
  "socket_path": "/socket.io",
  "call_token": "jwt-court",
  "initiator": true,
  "ice_servers": [
    { "urls": "stun:stun.example.com:3478" },
    {
      "urls": ["turn:turn.example.com:3478?transport=udp"],
      "username": "temporary-user",
      "credential": "temporary-password"
    }
  ],
  "expires_at": "2026-08-02T13:30:00.000Z"
}
```

Évènements : `call:join`, `call:signal`, `call:end`, `call:participant-joined`, `call:participant-left`, `call:ended`, `call:incoming`.

Le serveur contrôle l’appartenance au thread et génère des identifiants TURN temporaires.

## Profils et modération

Le profil membre renvoie `web_profile_url`, téléphone, présence, autorisation visio et règles de visibilité.

Routes nécessaires :

- `GET /v1/members?visible=true&query=` ;
- `PUT /v1/me/blocked-users/:memberId` ;
- `DELETE /v1/me/blocked-users/:memberId` ;
- `POST /v1/reports`.

Le menu `…` permet d’ouvrir le profil Neptune Business, mettre la conversation en sourdine, signaler ou bloquer.

## Temps forts, Besoins et Offres

Routes :

- `GET` et `POST /v1/highlights` ;
- réactions, commentaires, réponses et partage sous `/v1/highlights` et `/v1/comments` ;
- `GET /v1/places/search?query=`.

Cibles de synchronisation envoyées par le client :

```json
{ "kind": "besoin", "sync_targets": ["connexio", "business-needs"] }
```

```json
{ "kind": "offre", "sync_targets": ["connexio", "advantages-committee"] }
```

Le backend utilise un identifiant canonique et une clé d’idempotence pour synchroniser sans boucle. Un avantage créé ou modifié dans le Comité Avantage crée ou met à jour le Temps fort `offre` correspondant.

La recherche de lieu est exécutée côté backend afin de ne jamais exposer la clé Google Places. Chaque résultat fournit `id`, `label`, `address`, `latitude` et `longitude`.

## Gates de production

1. HTTPS et WSS ;
2. CORS et cookies `Secure`, `HttpOnly`, `SameSite` adaptés aux clients ;
3. Socket.IO avec adaptateur Redis ;
4. stockage privé, miniatures et antivirus ;
5. serveur TURN ;
6. APNs/FCM ;
7. migrations Prisma et contraintes d’unicité ;
8. tests d’autorisation par statut ;
9. tests sur au moins deux Android et un iPhone ;
10. appels entre Wi-Fi, 4G/5G et NAT restrictifs.

### Attestation consommée par la CI

Le backend expose également `GET /v1/connexio/readiness`. Cette route publique ne contient aucun secret : elle atteste le SHA déployé, l’environnement, les capacités, les dépendances critiques et les contrôles d’exploitation. Son schéma exact et les règles bloquantes figurent dans `PRODUCTION_BACKEND_READINESS.md`.

Les workflows natifs interrogent cette route puis vérifient qu’une requête anonyme reçoit `401`/`403` (ou `429` sous limitation anti-abus) sur `/v1/auth/me`, `/v1/conversations`, `/v1/realtime/ticket`, `/v1/coworking` et `/v1/devices/push-tokens`. Une validation `400`/`422` ne suffit pas : elle pourrait être exécutée avant le contrôle d’accès. Un simple changement de variable vers `connexio-v1` ne suffit donc plus à déclencher un build.
