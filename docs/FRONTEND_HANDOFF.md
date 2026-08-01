# Connexio V13 — remise frontend / backend

## 1. Statut de la livraison

Le client Expo / React Native de Connexio est livré comme application fonctionnelle web, iOS et Android.

Les fonctions utilisateur sont implémentées côté client : sélection et lecture des médias, documents, localisation, carte, appels audio/vidéo, partage natif, réactions, commentaires, gestion des groupes, préférences, blocage, export et suppression de compte.

Le backend Neptune reste la source de vérité pour les identités, statuts, droits, contenus, fichiers, synchronisation, appels entrants, notifications et modération. L’intégrateur doit exposer les contrats ci-dessous ; il ne doit pas reconstruire les écrans ni les interactions.

Le mode `EXPO_PUBLIC_MOCK_MODE=true` fournit une démonstration autonome. Il est interdit dans un build de production.

## 2. Écrans livrés

### Authentification et compte

- `/sign-in` : code à usage unique et mode démonstration explicite ;
- `/access-help` : aide à l’obtention du code ;
- `/account` : profil synchronisé, appareils, révocation de sessions, export et suppression ;
- `/notification-settings` : préférences synchronisées ;
- `/privacy` : Map, profil, présence, téléphone et localisation approximative ;
- `/blocked-users` : liste et déblocage ;
- `+not-found` : route ou contenu inaccessible.

### Messagerie

- `/(tabs)/messages` : onglets Groupes / Privées, mentions animées, maintien long ;
- `/new-conversation` : conversation directe, mini-groupe de quatre personnes au total ou groupe officiel ;
- `/chat/[id]` : texte, mentions, médias, documents, fichiers, localisation, réactions, réponse par glissement, hors-ligne et reprise ;
- `/conversation/[id]` : membres d’une conversation privée ;
- `/group/[id]` : membres, image, icône, visibilité par statut, publication, sourdine, départ et signalement ;
- `/profile/[id]` : message, téléphone, appel audio, visio, blocage et signalement.

### Temps forts, Map et appels

- `/(tabs)/highlights` : Feed, Map réelle, clustering, géolocalisation, bulles et actions rapides ;
- `/new-highlight` : texte, photo, vidéo de 60 secondes maximum, mentions, position approximative et tag `BESOIN` ;
- `/highlight/[id]` : réactions, commentaires, réponses et partage natif ;
- `/(tabs)/calls` : historique et relance audio/vidéo ;
- `/call/[id]` : salle Jitsi configurable via `EXPO_PUBLIC_CALL_BASE_URL`.

## 3. Configuration de production

Variables obligatoires :

```text
EAS_BUILD_PROFILE=production
EXPO_PUBLIC_MOCK_MODE=false
EXPO_PUBLIC_API_BASE_URL=https://api.neptune.example
EXPO_PUBLIC_REALTIME_URL=wss://api.neptune.example/v1/realtime
EXPO_PUBLIC_EAS_PROJECT_ID=<uuid EAS>
```

Variable d’appel facultative :

```text
EXPO_PUBLIC_CALL_BASE_URL=https://meet.jit.si
```

Une instance Jitsi dédiée peut remplacer l’URL publique sans modification d’écran.

Le build refuse : mode mock, API HTTP, WebSocket non chiffré ou configuration EAS absente.

## 4. Authentification

| Méthode | Route |
|---|---|
| Échanger un code à usage unique | `POST /v1/auth/exchange-code` |
| Rafraîchir la session | `POST /v1/auth/refresh` |
| Révoquer la session | `POST /v1/auth/revoke` |

Le refresh token est conservé dans SecureStore. Le client gère le rafraîchissement single-flight et rejoue une requête après un `401`.

## 5. Messagerie et temps réel

| Fonction | Route |
|---|---|
| Conversations visibles | `GET /v1/conversations` |
| Messages paginés | `GET /v1/conversations/:id/messages?cursor=` |
| Envoyer un message | `POST /v1/conversations/:id/messages` |
| Marquer comme lu | `POST /v1/conversations/:id/read` |
| Ticket WebSocket court | `POST /v1/realtime/ticket` |
| Enregistrer un appareil push | `POST /v1/devices/push-tokens` |
| Révoquer un appareil push | `POST /v1/devices/push-tokens/revoke` |

L’envoi contient :

```json
{
  "client_message_id": "uuid",
  "body": "message",
  "reply_to_message_id": null,
  "mentioned_user_ids": ["user-id"],
  "attachments": [
    {
      "id": "media-id",
      "kind": "photo",
      "name": "photo.jpg",
      "uri": "https://cdn/...",
      "mime_type": "image/jpeg",
      "size_bytes": 123456,
      "duration_seconds": null,
      "width": 1600,
      "height": 1200
    }
  ]
}
```

`Idempotency-Key` correspond au `client_message_id`.

Événements temps réel pris en charge :

- `message.created` ;
- `message.updated` ;
- `message.deleted` ;
- `conversation.read` ;
- `conversation.membership.changed`.

Le client réconcilie REST, temps réel et état optimiste. L’outbox native est chiffrée par SQLCipher et conserve texte, réponse, mentions et pièces jointes.

## 6. Médias et fichiers

Cycle d’upload :

| Étape | Route |
|---|---|
| Préparer un upload de message | `POST /v1/uploads/prepare` |
| Préparer un média de Temps fort | `POST /v1/highlights/uploads/prepare` |
| Préparer une image de groupe | `POST /v1/groups/avatar/uploads/prepare` |
| Envoyer les octets | URL pré-signée retournée par le serveur |
| Finaliser l’upload | `POST /v1/uploads/:id/complete` |

Le client gère :

- picker système photo/vidéo/document/fichier ;
- contrôle de taille ;
- limite vidéo de 60 secondes pour un Temps fort ;
- progression ;
- erreur et reprise ;
- affichage photo ;
- lecture vidéo avec contrôles natifs ;
- ouverture des documents et localisations.

Le serveur doit renvoyer une URL privée ou signée lisible par l’utilisateur autorisé.

## 7. Conversations privées et groupes

| Fonction | Route |
|---|---|
| Membres visibles | `GET /v1/members?visible=true&query=` |
| Conversation directe | `POST /v1/conversations/direct` |
| Mini-groupe privé | `POST /v1/conversations/private-group` |
| Créer un groupe officiel | `POST /v1/groups` |
| Modifier un groupe | `PATCH /v1/groups/:id` |
| Mettre en sourdine | `POST /v1/groups/:id/mute` |
| Retirer la sourdine | `DELETE /v1/groups/:id/mute` |
| Quitter | `POST /v1/groups/:id/leave` |

Le serveur valide impérativement :

- quatre participants maximum au total dans un mini-groupe privé ;
- unicité d’une conversation directe entre deux personnes ;
- rôles autorisés : Visionnaire, Amiral, Capitaine, Légende, Moussaillon, Triton et Free ;
- droits de création, administration, lecture et écriture ;
- filtrage de tous les groupes avant réponse au client.

## 8. Réactions, Temps forts et synchronisation `BESOIN`

| Fonction | Route |
|---|---|
| Réagir à un message | `POST /v1/messages/:id/reactions` |
| Retirer une réaction message | `DELETE /v1/messages/:id/reactions/:emoji` |
| Feed paginé | `GET /v1/highlights?cursor=` |
| Créer un Temps fort | `POST /v1/highlights` |
| Réagir à un Temps fort | `POST /v1/highlights/:id/reactions` |
| Retirer une réaction | `DELETE /v1/highlights/:id/reactions/:emoji` |
| Commenter | `POST /v1/highlights/:id/comments` |
| Répondre | `POST /v1/comments/:id/replies` |
| Réagir à un commentaire | `POST /v1/comments/:id/reactions` |
| Retirer une réaction commentaire | `DELETE /v1/comments/:id/reactions/:emoji` |
| Créer un lien de partage | `POST /v1/highlights/:id/share` |

Un `BESOIN` est envoyé avec :

```json
{
  "kind": "besoin",
  "sync_targets": ["connexio", "business"]
}
```

Le serveur doit attribuer un identifiant canonique commun, publier l’événement dans les deux applications et appliquer la même règle aux modifications et suppressions. L’idempotence empêche les doublons. Un changement reçu depuis Neptune Business doit être renvoyé dans le Feed et le WebSocket Connexio.

## 9. Map et localisation

| Fonction | Route |
|---|---|
| Moments visibles | `GET /v1/map/moments?bounds=&zoom=` |
| Mettre à jour la position | `PUT /v1/me/location` |
| Effacer la position | `DELETE /v1/me/location` |

Le client web et natif utilise Leaflet, MarkerCluster, zoom, déplacement, géolocalisation, avatars, fallback initiales et contours pulsants.

Le serveur ne doit jamais renvoyer l’adresse ou les coordonnées exactes non consenties. Le rayon de confidentialité attendu est compris entre 1 et 3 km.

## 10. Appels

Les salles audio et vidéo sont opérationnelles via Jitsi et un nom de salle déterministe dérivé de la conversation.

Pour les appels entrants, l’historique et la signalisation métier, le contrat prévoit :

```text
POST /v1/calls
```

avec `member_id` et `type`. Le backend peut renvoyer une `joinUrl` dédiée. APNs/FCM doit réveiller le client et ouvrir `/call/:conversationId?mode=audio|video`.

Une infrastructure Jitsi privée, TURN/STUN, journalisation et politiques de conservation restent des opérations d’infrastructure, sans reprise des écrans.

## 11. Compte, notifications et confidentialité

| Fonction | Route |
|---|---|
| Sessions | `GET /v1/account/sessions` |
| Révoquer une session | `DELETE /v1/account/sessions/:id` |
| Export des données | `POST /v1/account/export` |
| Resynchroniser le profil | `POST /v1/account/resync` |
| Demander la suppression | `POST /v1/account/deletion` |
| Lire les notifications | `GET /v1/me/notification-preferences` |
| Modifier les notifications | `PUT /v1/me/notification-preferences` |
| Lire la confidentialité | `GET /v1/me/privacy-preferences` |
| Modifier la confidentialité | `PUT /v1/me/privacy-preferences` |
| Membres bloqués | `GET /v1/me/blocked-users` |
| Bloquer | `PUT /v1/me/blocked-users/:id` |
| Débloquer | `DELETE /v1/me/blocked-users/:id` |
| Signaler un contenu | `POST /v1/reports` |

Les réglages doivent être appliqués côté serveur avant l’envoi d’une notification, d’un profil, d’une position ou d’une action rapide.

## 12. Validation avant publication

Gates logiciels :

```text
npm ci
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run test:domain
npx expo install --check
npx expo config --type public
npm run web:build
```

Les workflows contrôlent également :

- formats 280×568, 320×568, 390×844, 430×720, tablette et paysage ;
- zoom navigateur à 140 % ;
- chat faible hauteur ;
- conversation en lecture seule ;
- double envoi ;
- déconnexion et reconnexion ;
- Feed, Map, Appels, Profil, création et administration.

Avant mise en ligne publique, l’équipe backend/infrastructure doit encore valider les endpoints sur l’environnement réel, APNs/FCM, Jitsi/TURN, CDN privé, politiques de conservation, observabilité, sauvegardes, rollback et appareils physiques. Ces validations ne nécessitent pas de reconstruction du frontend.
