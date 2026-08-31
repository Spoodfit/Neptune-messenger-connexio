# Contrat backend minimal

Les chemins sont indicatifs. Le développeur peut conserver ses endpoints actuels et adapter uniquement `src/services/api/neptuneApi.ts`.

## Authentification

### `POST /v1/mobile/session/exchange`

Entrée :

```json
{
  "one_time_code": "abc123",
  "device_id": "device-uuid"
}
```

Sortie :

```json
{
  "access_token": "jwt",
  "refresh_token": "opaque-token",
  "expires_in": 900,
  "user": {
    "id": "user-123",
    "name": "Prénom Nom",
    "role": "member"
  }
}
```

Le code doit être à usage unique, expirer rapidement et être lié au compte Neptune.

## Conversations

### `GET /v1/conversations`

Retourne uniquement les conversations visibles par l’utilisateur authentifié.

```json
[
  {
    "id": "carcassonne",
    "name": "Club Carcassonne",
    "type": "city",
    "memberCount": 68,
    "unreadCount": 5,
    "lastMessage": "Qui sera présent ?",
    "lastMessageAt": "2026-07-24T12:08:00.000Z",
    "restricted": false
  }
]
```

### `GET /v1/conversations/:id/messages?cursor=...`

```json
{
  "items": [],
  "nextCursor": null
}
```

Pagination par curseur, jamais par numéro de page.

### `POST /v1/conversations/:id/messages`

```json
{
  "client_message_id": "uuid",
  "body": "Bonjour",
  "reply_to_message_id": null
}
```

`client_message_id` est obligatoire pour rendre l’envoi idempotent et éviter les doublons lors d’une reconnexion.

### `POST /v1/conversations/:id/read`

```json
{
  "last_read_message_id": "message-456"
}
```

## Appareils et push

### `POST /v1/devices/push-tokens`

```json
{
  "token": "ExponentPushToken[...]",
  "provider": "expo",
  "platform": "ios",
  "appVersion": "0.1.0",
  "deviceName": "iPhone"
}
```

Le backend doit désactiver les tokens invalides et permettre plusieurs appareils par utilisateur.

### Payload push

```json
{
  "title": "Club Carcassonne",
  "body": "Océane : Qui sera présent ?",
  "data": {
    "conversationId": "carcassonne",
    "messageId": "message-456"
  }
}
```

Ne jamais mettre de données sensibles dans le push : elles peuvent apparaître sur un écran verrouillé.

## Temps réel

### `GET wss://api.../v1/realtime?token=...`

Événement :

```json
{
  "type": "message.created",
  "payload": {
    "id": "message-456",
    "conversationId": "carcassonne",
    "senderId": "user-123",
    "body": "Bonjour",
    "createdAt": "2026-07-24T12:08:00.000Z"
  }
}
```

En production, le ticket temps réel est court, à usage unique et transmis dans la trame d'authentification Socket.IO. Aucun JWT ni ticket ne doit apparaître dans l'URL ou la query string WebSocket.

## Règles d’accès

Le serveur doit contrôler au minimum :

- adhésion active ;
- club rattaché ;
- rôle effectif ;
- droit de lecture ;
- droit de publication ;
- suspension ou exclusion ;
- blocage entre utilisateurs ;
- limitation de débit ;
- taille et type de pièce jointe.

## Codes d’erreur attendus

- `401` : session invalide ;
- `403` : accès refusé ;
- `404` : conversation inexistante ou invisible ;
- `409` : message déjà reçu avec le même identifiant ;
- `413` : pièce jointe trop lourde ;
- `429` : limitation de débit.
