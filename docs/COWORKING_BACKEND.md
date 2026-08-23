# Connexio Coworking — contrat backend V24

## Objectif

Le Coworking est une **carte géographique réelle**, distincte du moteur d'appel 1-to-1 existant. Ouvrir l'écran Coworking ouvre directement la Map et démarre la publication caméra si la permission est déjà accordée. Le microphone reste coupé par défaut. La position affichée est une ville ou une zone approximative, jamais une adresse précise.

## Invariants UX et confidentialité

1. `GET /v1/coworking` ne déclenche jamais de média et renvoie les présences, villes/zones approximatives et espaces actifs.
2. L'ouverture de la Map appelle `POST /v1/coworking/map/enter` avec `camera_on: true` et `microphone_on: false`, sauf si le membre est déjà dans une room active.
3. La Map n'affiche que deux états : `Disponible` (vert) et `Occupé` (rouge). Un groupe vidéo partagé produit un seul marqueur mosaïque.
4. Le microphone démarre **coupé** dans la Map comme dans chaque room. La Salle générale applique un audio spatial selon la distance entre membres.
5. `Toquer` est réservé aux marqueurs occupés et ne permet de rejoindre la room qu'après acceptation du destinataire. L'acceptation ajoute les deux membres au même flux SFU.
6. Revenir à la Map depuis une room ne doit pas créer une seconde publication caméra. Seule l'action `leave` retire la présence de la room.
7. Les règles d'accès privées sont contrôlées côté serveur. Les cadenas et invitations côté application ne constituent jamais une ACL de sécurité.

## API HTTP

Toutes les routes utilisent l'authentification Neptune/Connexio existante.

### `GET /v1/coworking`

Retourne un snapshot de présence :

```json
{
  "hub": {
    "id": "hub",
    "name": "Hub Neptune",
    "kind": "hub",
    "access": "open",
    "participant_ids": ["user-1", "user-2"],
    "media_enabled": true
  },
  "spaces": [],
  "participants": [
    {
      "user_id": "user-1",
      "mode": "focus",
      "status_text": "Préparation lancement Connexio",
      "camera_on": true,
      "microphone_on": false,
      "speaking": false,
      "joined_at": "2026-08-19T18:00:00Z"
    }
  ],
  "current_user_space_id": null,
  "updated_at": "2026-08-19T18:00:00Z"
}
```

Modes de présence : `focus`, `available`, `talk`, `break`.

Types d'espace : `hub`, `open`, `private`, `focus`.

Accès : `open`, `request`, `invite`.

### `POST /v1/coworking/map/enter`

Ouvre la présence média de la Map géographique. Le serveur doit renvoyer un jeton de publication limité à la Map et à l'utilisateur, sans demander de position précise.

```json
{
  "camera_on": true,
  "microphone_on": false
}
```

Retour attendu : un bloc `media` avec `observer: false`. Le refus de permission caméra côté client ne doit pas supprimer la présence : la Map conserve les avatars et l'état disponible/occupé.

### `POST /v1/coworking/map/leave`

Ferme la publication média de la Map sans quitter une room éventuellement active.

### `POST /v1/coworking/presence`

```json
{
  "mode": "focus",
  "status_text": "Préparation lancement Connexio"
}
```

Retour : snapshot Coworking à jour.

### `POST /v1/coworking/spaces`

```json
{
  "name": "Focus commercial",
  "kind": "focus",
  "access": "open",
  "invited_user_ids": [],
  "activity": "50 min de concentration",
  "focus_minutes": 50
}
```

Retour attendu : snapshot à jour, espace créé et session média.

### `POST /v1/coworking/spaces/:spaceId/join`

Le serveur doit :

- vérifier le rôle, le blocage éventuel, l'invitation et la capacité ;
- déplacer atomiquement le membre de son ancien espace vers le nouveau ;
- retourner le snapshot à jour ;
- créer un jeton média **court, révocable et limité à cet espace et cet utilisateur**.

Exemple de bloc `media` :

```json
{
  "space_id": "focus-commercial",
  "socket_url": "https://realtime.example.com",
  "socket_path": "/socket.io",
  "client_script_url": "https://realtime.example.com/coworking-client.js",
  "token": "short-lived-room-token",
  "participant_id": "user-1",
  "ice_servers": [
    { "urls": ["stun:stun.example.com:3478"] },
    {
      "urls": ["turn:turn.example.com:3478?transport=udp"],
      "username": "temporary-user",
      "credential": "temporary-credential"
    }
  ],
  "expires_at": "2026-08-19T19:00:00Z"
}
```

### `POST /v1/coworking/spaces/:spaceId/leave`

Retire la présence du membre de l'espace et ferme/révoque son jeton média. Retour : snapshot à jour.

## Contrat du client média SFU

Le moteur d'appel actuel de Connexio est 1-to-1 et **ne doit pas être étendu en mesh pour le Hub**. Le Hub et les rooms Coworking doivent utiliser un SFU (LiveKit, mediasoup, Janus, Jitsi Videobridge ou infrastructure équivalente).

Le `client_script_url` renvoyé par le backend expose :

```js
window.ConnexioCoworkingClient = {
  async connect(config) {
    // Retourne une connexion possédant disconnect() et setMediaState().
  }
}
```

`config` contient :

- `spaceId`
- `socketUrl`
- `socketPath`
- `token`
- `participantId`
- `displayName`
- `iceServers`
- `localStream`
- `onParticipantStream({ id, displayName, stream })`
- `onParticipantLeft(participantId)`
- `onConnected()`
- `onError(error)`

La connexion retournée doit exposer :

```ts
interface ConnexioCoworkingConnection {
  disconnect(): void;
  setMediaState(state: { cameraOn: boolean; microphoneOn: boolean }): void;
}
```

## Temps réel

Le frontend possède un polling de secours toutes les 15 secondes. En production, le backend doit pousser les changements via le canal realtime Connexio :

- `coworking:snapshot`
- `coworking:participant-joined`
- `coworking:participant-left`
- `coworking:presence-changed`
- `coworking:space-created`
- `coworking:space-updated`
- `coworking:space-closed`
- `coworking:join-requested`

Le snapshot serveur reste la source de vérité après reconnexion.

## Capacité et performance

- Hub : SFU obligatoire, présence visuelle de tous les membres mais abonnement vidéo adaptatif seulement aux flux utiles/visibles.
- Room privée/ouverte : cible UX 2 à 6 participants actifs.
- Simulcast/SVC recommandé.
- Suspendre les tracks vidéo non visibles et lors du passage de l'application en arrière-plan selon les règles iOS/Android.
- TURN avec credentials temporaires obligatoire pour les réseaux d'entreprise, CGNAT et Wi-Fi restrictifs.

## Pré-mortem technique

Les échecs les plus probables à prévenir avant lancement sont :

1. **Hub vide** : prévoir sessions Focus planifiées, présence visible depuis toute l'app et invitations légères, sans spam push.
2. **Cacophonie** : micro coupé à l'entrée ; le Hub ne doit pas auto-abonner l'audio de tout le monde.
3. **Batterie/data** : ne jamais recevoir simultanément toutes les vidéos HD du Hub.
4. **Fuite d'une room privée** : ACL, invitation et jeton d'accès sont validés exclusivement côté serveur.
5. **Session fantôme** : heartbeat + TTL + nettoyage serveur à la déconnexion et à l'expiration du token.
6. **Réseau instable** : reconnexion SFU, ICE restart, TURN et resynchronisation du snapshot.
7. **Double présence** : mutation atomique `oldSpace -> newSpace` côté serveur.
8. **Permissions rejetées** : conserver la présence et permettre audio/caméra désactivés plutôt que sortir brutalement du Coworking.
