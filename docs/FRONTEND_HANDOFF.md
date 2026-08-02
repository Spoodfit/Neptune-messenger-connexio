# Connexio V14 — contrat de remise backend

## Architecture

Connexio est un second client de Neptune Business. Le frontend Expo/React Native consomme le backend existant : **Express 5**, **Prisma 7**, **PostgreSQL 16**, **Redis**, JWT en cookies httpOnly et **Socket.IO**.

`EXPO_PUBLIC_API_BASE_URL` doit pointer vers la racine qui précède `/v1`. Avec une API exposée sous `/api/v1`, la valeur attendue est par exemple `https://neptunebusiness.com/api`.

## Authentification Neptune

| Méthode | Route | Usage |
|---|---|---|
| `POST` | `/v1/auth/login` | email/mot de passe et cookie JWT httpOnly |
| `GET` | `/v1/auth/me` | restauration de la session |
| `POST` | `/v1/auth/logout` | révocation de la session |

Toutes les requêtes utilisent `credentials: include`. Le mot de passe n’est jamais persisté dans Connexio.

Le backend normalise `role`, `special_role` et `statut`. La création et l’administration des groupes officiels sont autorisées **uniquement aux Visionnaires ou aux administrateurs serveur**. L’interface applique la même règle, mais le backend reste l’autorité.

## Conversations et messages

Routes utilisées :

- `GET /v1/conversations` ;
- `POST /v1/conversations/private` ;
- `POST /v1/groups` ;
- `PATCH /v1/groups/:threadId` ;
- `POST /v1/groups/:threadId/leave` ;
- `POST /v1/conversations/:threadId/mute` ;
- `GET /v1/conversations/:threadId/messages?cursor=` ;
- `POST /v1/conversations/:threadId/messages` ;
- `POST /v1/conversations/:threadId/read` ;
- `PUT` et `DELETE /v1/messages/:messageId/reactions/:emoji`.

Le serveur déduplique une conversation privée par ensemble exact de participants. Si elle existe, il la renvoie au lieu d’en créer une nouvelle.

Les threads renvoient notamment :

```json
{
  "id": "thread-id",
  "type": "group",
  "name": "Carcassonne",
  "member_ids": ["user-1", "user-2"],
  "member_count": 2,
  "active_member_ids": ["user-2", "user-1"],
  "visibility_roles": ["visionnaire", "moussaillon", "free"],
  "can_post": true,
  "event_vote_alert": null
}
```

`member_count` correspond toujours au nombre réel de participants. `active_member_ids` est ordonné par activité récente afin d’afficher les avatars superposés.

## Pièces jointes

Le client autorise au maximum **10 contenus et 120 Mo cumulés par message** : 15 Mo par photo, 80 Mo par vidéo et 50 Mo par document ou fichier.

Flux attendu :

1. `POST /v1/files/presign` ;
2. upload vers le stockage privé ;
3. `POST /v1/files/complete` ;
4. envoi du message avec l’identifiant fichier ;
5. génération de `download_url` et `thumbnail_url` temporaires.

Le backend revérifie le nombre, la taille, le MIME réel, les droits d’accès et l’analyse antivirus. Les médias sont regroupés dans une grille compacte, puis restent ouvrables et téléchargeables.

## Sondages

- `POST /v1/conversations/:threadId/polls` ;
- `POST /v1/messages/:messageId/poll-votes` ;
- `DELETE /v1/messages/:messageId/poll-votes/:optionId`.

Exemple de message :

```json
{
  "poll": {
    "id": "poll-id",
    "question": "Quel créneau préférez-vous ?",
    "allow_multiple": false,
    "anonymous": false,
    "total_votes": 31,
    "closes_at": "2026-08-08T21:59:00.000Z",
    "event_vote_id": "optional-event-id",
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

### Votes d’évènements

Lorsqu’un vote concerne un club, le thread officiel de sa ville reçoit :

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

La création, la modification et la clôture d’un vote dans Neptune Business mettent à jour le sondage et l’alerte dans une transaction Prisma. Le web et Connexio utilisent le même identifiant canonique et une contrainte unique de vote.

## Appels intégrés

Connexio n’utilise pas Jitsi. L’appel est intégré à l’application avec `getUserMedia`, `RTCPeerConnection` et une signalisation Socket.IO.

- `POST /v1/calls` ;
- `POST /v1/calls/:callId/end`.

Réponse de création :

```json
{
  "call_id": "call-id",
  "thread_id": "thread-id",
  "type": "video",
  "socket_url": "https://api.neptunebusiness.com",
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

Évènements Socket.IO :

- client → serveur : `call:join`, `call:signal`, `call:end` ;
- serveur → client : `call:participant-joined`, `call:signal`, `call:participant-left`, `call:ended`, `call:incoming`.

Le serveur vérifie l’appartenance au thread, émet l’appel entrant et délivre un token court. Un serveur TURN est obligatoire pour la fiabilité mobile.

## Profils et modération

- `GET /v1/members` ;
- `POST` et `DELETE /v1/members/:memberId/block` ;
- `POST /v1/moderation/reports`.

Le profil renvoie `web_profile_url`, `phone`, `video_call_enabled`, présence et règles de visibilité. Le menu `…` permet d’ouvrir le profil web, mettre la discussion en sourdine, signaler ou bloquer.

## Temps forts, besoins et offres

Routes :

- `GET` et `POST /v1/highlights` ;
- `GET /v1/highlights/:postId` ;
- `PUT` et `DELETE /v1/highlights/:postId/reactions/:emoji` ;
- `POST /v1/highlights/:postId/comments` ;
- `POST /v1/highlights/:postId/share` ;
- `GET /v1/places/search?query=`.

Un `BESOIN` envoie :

```json
"sync_targets": ["connexio", "business"]
```

Une `OFFRE` envoie :

```json
"sync_targets": ["connexio", "advantage_committee"]
```

Le backend utilise un identifiant canonique, une clé d’idempotence et une table de liaison pour synchroniser sans boucle : besoin ↔ application web, offre ↔ Comité Avantage. Un avantage publié sur le web crée ou met à jour son Temps fort Connexio.

La recherche de lieu s’effectue côté backend afin de ne jamais exposer la clé Google Places. Chaque résultat contient `id`, `label`, `address`, `city`, `latitude`, `longitude`.

## Socket.IO général

Évènements minimum :

- `message.created`, `message.updated`, `message.deleted` ;
- `message.reaction.updated` ;
- `poll.updated`, `poll.vote.updated` ;
- `thread.updated`, `thread.member.updated` ;
- `event.vote.updated` ;
- `highlight.created`, `highlight.updated`, `highlight.deleted` ;
- `highlight.reaction.updated`, `highlight.comment.created` ;
- `presence.updated` ;
- les évènements d’appel listés plus haut.

Chaque payload contient un `event_id` unique et un `updated_at` serveur.

## Gates de production

1. HTTPS et WSS ;
2. cookies CORS `Secure`, `HttpOnly` et `SameSite` ;
3. Socket.IO avec adaptateur Redis ;
4. stockage privé et antivirus ;
5. serveur TURN ;
6. APNs/FCM ;
7. migrations Prisma et contraintes d’unicité ;
8. tests de droits par rôle ;
9. tests sur au moins deux Android et un iPhone ;
10. appels testés entre Wi-Fi, 4G/5G et NAT restrictifs.
