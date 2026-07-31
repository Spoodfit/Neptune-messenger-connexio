# Connexio — contrat de remise frontend / backend

Ce document décrit le front Expo / React Native livré sur `feat/production-hardening` et les branchements obligatoires avant une remise en production.

Le frontend est une référence fonctionnelle et visuelle. Il ne constitue jamais la source de vérité des droits, appartenances, blocages, statuts, localisations ou messages.

## 1. Inventaire des écrans

### Authentification et cycle de compte

- `/sign-in` : code à usage unique et mode démonstration explicite.
- `/access-help` : procédure d’obtention d’un code Neptune.
- `/privacy` : centre de confidentialité et droits du compte.
- `/account` : sessions, appareils, export et suppression.
- `/notification-settings` : préférences par catégorie.
- `/blocked-users` : état vide et règles du blocage.
- `+not-found` : route invalide ou contenu devenu inaccessible.

### Messagerie

- `/(tabs)/messages` : deux filtres, **Groupes** et **Privées**.
- `/new-conversation` : conversation directe, mini-groupe privé, groupe officiel administré.
- `/chat/[id]` : messages, mentions, réponse, réactions, pièces jointes, lecture seule, appels privés.
- `/conversation/[id]` : informations d’une conversation privée / mini-groupe.
- `/group/[id]` : membres, sourdine, départ, identité, visibilité et permissions.
- `/profile/[id]` : profil contact, derniers Temps forts et actions rapides.

### Temps forts et Map

- `/(tabs)/highlights` : Feed et Map.
- `/new-highlight` : texte, photo, vidéo courte, mentions, catégorie, position approximative.
- `/highlight/[id]` : réactions, commentaires, réponses aux commentaires et partage.

### Appels et profil

- `/(tabs)/calls` : historique audio / vidéo.
- `/(tabs)/settings` : profil et accès à tous les réglages fonctionnels.

## 2. Rôles et permissions

Rôles canoniques :

- `visionnaire`
- `amiral`
- `capitaine`
- `legende`
- `moussaillon`
- `triton`
- `free`
- `admin`

Le mobile peut adapter l’affichage, mais le serveur doit autoriser chaque opération.

### Matrice minimale côté serveur

| Action | Contrôle obligatoire |
|---|---|
| Voir un groupe dans la liste | appartenance, rôle autorisé, blocage, état du groupe |
| Ouvrir un groupe par URL | même contrôle que la liste, sans confiance dans le client |
| Publier dans un groupe | membre actif + `can_post` calculé serveur |
| Créer / modifier un groupe | permission de gouvernance ou permission explicite |
| Modifier visibilité / statuts | permission administrateur + journal d’audit |
| Ajouter / retirer un membre | permission de gestion + règle du groupe |
| Quitter un groupe | règle du groupe officiel + transfert de propriété éventuel |
| Voir un profil / téléphone | préférences de confidentialité du membre |
| Appeler / visio | relation autorisée, blocage, disponibilité et ticket court |
| Voir une position | consentement, Ghost Mode, précision et durée de conservation |

Les contrôles doivent s’appliquer aux endpoints REST, WebSocket, notifications push, exports et liens profonds.

## 3. Authentification

### Endpoints attendus

- `POST /v1/session/exchange-code`
- `POST /v1/session/refresh`
- `POST /v1/session/revoke`
- `GET /v1/me`
- `GET /v1/me/sessions`
- `DELETE /v1/me/sessions/:sessionId`

### Exigences

- code court, à usage unique, lié à l’appareil et expirant rapidement ;
- access token uniquement en mémoire ;
- refresh token dans SecureStore ;
- rotation et révocation ;
- aucune build production avec `MOCK_MODE=true` ;
- aucun transport HTTP ou WebSocket non chiffré.

## 4. Conversations et groupes

### Endpoints attendus

- `GET /v1/conversations?type=group|private&cursor=`
- `POST /v1/conversations/direct`
- `POST /v1/conversations/private-group`
- `POST /v1/groups`
- `GET /v1/conversations/:id`
- `PATCH /v1/groups/:id`
- `DELETE /v1/groups/:id`
- `POST /v1/groups/:id/leave`
- `POST /v1/groups/:id/mute`
- `DELETE /v1/groups/:id/mute`
- `GET /v1/groups/:id/members?cursor=`
- `POST /v1/groups/:id/members`
- `DELETE /v1/groups/:id/members/:userId`

### Mini-groupes privés

La limite produit est de **quatre participants au total**, créateur compris. Le serveur doit refuser toute cinquième personne, y compris en concurrence.

### Groupe officiel

Champs minimaux :

```json
{
  "name": "string",
  "description": "string",
  "avatar_url": "https://...",
  "icon_name": "people",
  "allowed_roles": ["visionnaire", "amiral"],
  "members_can_post": true
}
```

Toute modification de visibilité ou de droit d’écriture doit créer une entrée d’audit.

## 5. Messages

### Endpoints attendus

- `GET /v1/conversations/:id/messages?cursor=`
- `POST /v1/conversations/:id/messages`
- `PATCH /v1/messages/:id`
- `DELETE /v1/messages/:id`
- `POST /v1/messages/:id/reactions`
- `DELETE /v1/messages/:id/reactions/:emoji`
- `POST /v1/conversations/:id/read`

### Envoi

Corps recommandé :

```json
{
  "client_message_id": "uuid",
  "body": "texte",
  "reply_to_message_id": "uuid|null",
  "mentioned_user_ids": ["uuid"],
  "attachment_ids": ["uuid"]
}
```

Le serveur doit garantir l’unicité de `(sender_id, client_message_id)` et renvoyer le message canonique. Une reconnexion, un retry ou un événement WebSocket rejoué ne doit jamais créer de doublon.

### Mentions

Le frontend suggère les membres lors de `@`. Le serveur doit :

1. résoudre les destinataires par identifiant, jamais par texte uniquement ;
2. vérifier qu’ils appartiennent à la conversation ;
3. stocker `mentioned_user_ids` ;
4. calculer `mention_count` par utilisateur ;
5. envoyer une notification dédiée selon les préférences ;
6. supprimer l’état visuel après lecture / acquittement.

## 6. Pièces jointes et médias

### Endpoints attendus

- `POST /v1/uploads/prepare`
- upload direct vers stockage objet privé ;
- `POST /v1/uploads/:id/complete`
- `DELETE /v1/uploads/:id`

### Exigences

- validation MIME réelle côté serveur ;
- taille maximale par type ;
- antivirus / analyse ;
- compression photo et vidéo ;
- vidéo Temps fort limitée à 60 secondes ;
- URL signée et courte ;
- progression, reprise et annulation ;
- suppression différée et journalisée ;
- aucune URL publique permanente contenant un contenu privé.

Types prévus : photo, vidéo, document, fichier, audio, localisation et contact.

## 7. Temps forts

### Endpoints attendus

- `GET /v1/highlights?cursor=`
- `POST /v1/highlights`
- `GET /v1/highlights/:id`
- `PATCH /v1/highlights/:id`
- `DELETE /v1/highlights/:id`
- `POST /v1/highlights/:id/reactions`
- `DELETE /v1/highlights/:id/reactions/:emoji`
- `POST /v1/highlights/:id/comments`
- `POST /v1/comments/:id/replies`
- `POST /v1/comments/:id/reactions`
- `POST /v1/highlights/:id/share`

### BESOIN — synchronisation Neptune Business

Le backend Neptune est la source de vérité. La synchronisation doit être bidirectionnelle et idempotente :

- identifiant global partagé entre les deux applications ;
- origine et version du contenu ;
- propagation création / modification / suppression ;
- traitement des conflits ;
- même politique de visibilité ;
- aucun doublon lors d’un retry ;
- journal d’erreur et reprise automatique.

## 8. Map et géolocalisation

### Web

Le composant `NeptuneMap.web.tsx` utilise Leaflet, CARTO / OpenStreetMap, géolocalisation navigateur et clustering automatique.

### Natif

`NeptuneMap.native.tsx` est un adaptateur visuel. Il doit être remplacé par `react-native-maps`, Expo Maps ou MapLibre sans changer le contrat `NeptuneMapProps`.

### Endpoints attendus

- `PUT /v1/me/location`
- `DELETE /v1/me/location`
- `GET /v1/map/moments?bounds=&zoom=`
- `PATCH /v1/me/location-preferences`

### Confidentialité obligatoire

- coordonnée exacte jamais renvoyée au client d’un autre membre ;
- obfuscation serveur avec rayon minimal ;
- expiration automatique ;
- Ghost Mode appliqué serveur ;
- fréquence limitée ;
- visibilité selon consentement et rôle ;
- pas de localisation en arrière-plan sans justification et permission dédiée.

### Clustering

Le backend peut renvoyer des points, mais le clustering visuel dépend du zoom et de la distance écran. Ne jamais empiler les avatars au même pixel.

## 9. Appels audio / vidéo

Le frontend expose les actions et l’historique. Restent à connecter :

- ticket de signalisation court ;
- WebRTC ;
- STUN / TURN ;
- appels entrants ;
- CallKit iOS / ConnectionService Android ;
- permissions micro / caméra uniquement au premier usage ;
- reprise réseau ;
- appel manqué ;
- blocage et confidentialité ;
- aucune action d’appel dans les groupes officiels.

## 10. Temps réel

Événements minimaux :

- `message.created`
- `message.updated`
- `message.deleted`
- `message.reaction.changed`
- `conversation.updated`
- `conversation.member.changed`
- `conversation.permission.changed`
- `conversation.mention.changed`
- `highlight.created`
- `highlight.updated`
- `highlight.deleted`
- `highlight.comment.changed`
- `highlight.reaction.changed`
- `profile.updated`
- `call.incoming`
- `call.updated`

Chaque événement doit posséder un identifiant, une version, une date serveur et un contrôle d’autorisation au moment de l’émission.

## 11. Notifications push

- APNs / FCM par appareil ;
- rotation et révocation du token ;
- préférences globales et par conversation ;
- priorité spécifique pour mentions et appels ;
- deep link vers le contenu ;
- revalidation d’accès après ouverture ;
- aperçu confidentiel sur écran verrouillé ;
- aucun contenu de message dans les logs serveur.

## 12. Modération et sécurité

Avant pilote :

- blocage ;
- signalement message, profil, groupe, publication et commentaire ;
- masquage ;
- rate limiting ;
- anti-spam ;
- suspension / bannissement ;
- journal d’administration ;
- export et suppression ;
- politique de conservation ;
- sauvegarde et restauration testées ;
- observabilité sans contenu privé.

## 13. Critères d’acceptation développeur

Le branchement n’est pas terminé tant que :

- aucune donnée fictive n’apparaît avec `MOCK_MODE=false` ;
- toutes les erreurs réseau possèdent un état visible et une nouvelle tentative ;
- les groupes sont filtrés côté serveur ;
- le mini-groupe refuse un cinquième participant ;
- les messages restent uniques après 20 retries ;
- les pièces jointes reprennent après coupure ;
- les mentions sont acquittées ;
- BESOIN est identique dans les deux applications ;
- Ghost Mode supprime immédiatement la visibilité serveur ;
- la déconnexion révoque session, push et données locales ;
- VoiceOver / TalkBack et les cibles tactiles sont validés sur appareils ;
- le pipeline CI est vert ;
- le pilote et le rollback sont documentés.
