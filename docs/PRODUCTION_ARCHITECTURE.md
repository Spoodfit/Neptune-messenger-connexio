# Connexio — Architecture de production

## Décision technique

Connexio sera une application mobile **React Native + TypeScript**, construite avec un **development build Expo** pour conserver l’accès aux modules natifs, aux notifications, à la caméra, au micro, au stockage sécurisé et aux builds iOS/Android.

Le prototype `Connexio_Neptune_FINAL_AUDITED.html` est conservé comme **référence UX/UI uniquement**. Il ne doit pas être importé tel quel dans l’application de production.

## Architecture cible

```text
apps/mobile
  app/                    navigation et écrans
  src/components          composants Neptune réutilisables
  src/features            messaging, feed, map, calls, profiles
  src/services            API, realtime, push, media, analytics
  src/store               état local et cache
  src/theme               tokens, rôles, typographie, animations
  src/accessibility       focus, annonces, reduced motion

packages/domain           types métier et règles communes
packages/api-client       client backend typé
packages/realtime         événements temps réel et présence
packages/ui               design system Neptune
packages/testing          mocks, fixtures et utilitaires
```

## Backend recommandé

- **PostgreSQL** comme source de vérité.
- **Supabase Auth** ou SSO Neptune existant si le backend Neptune Business expose déjà une authentification compatible.
- **Row Level Security** sur toutes les tables exposées.
- **Supabase Realtime Broadcast/Presence** pour les messages, réactions, saisie en cours et présence.
- **Storage objet** pour photos, vidéos, vocaux et pièces jointes.
- **Edge Functions / API serveur** pour les opérations sensibles, les notifications et la modération.
- **FCM + APNs** pour les notifications push.

## Principes non négociables

1. **Un seul identifiant utilisateur immuable** partagé avec Neptune Business Point App.
2. **Aucune donnée de rôle pilotée par le client**. Le rôle Neptune vient du backend.
3. **Aucun message marqué “lu” sans accusé réel du destinataire**.
4. **Aucune position exacte stockée ou exposée par défaut**.
5. **Toutes les écritures sont idempotentes** grâce à un `client_id` UUID.
6. **Le fonctionnement hors ligne est explicite** : file d’attente, échec, retry, résolution de conflit.
7. **Les notifications n’embarquent jamais de données sensibles inutiles**.
8. **Les médias sont validés côté serveur** : type MIME, taille, durée, antivirus et autorisation.

## Flux d’un message

```text
Utilisateur saisit
→ création locale avec client_id
→ état pending
→ envoi API
→ persistance PostgreSQL
→ événement realtime
→ état sent
→ push si destinataire absent
→ delivery receipt
→ read receipt
```

États autorisés :

```text
pending | sent | delivered | read | failed | deleted
```

## Navigation

- Navigation native avec historique.
- Support du bouton retour Android.
- Deep links vers conversation, message, post et profil.
- Restauration de l’écran après fermeture ou crash.
- Chaque modal est un vrai dialogue accessible avec gestion du focus.

## Carte

- Le client ne reçoit qu’une **position obfusquée** déjà calculée côté serveur.
- Clustering calculé selon la distance à l’écran.
- Les marqueurs animés correspondent uniquement aux publications récentes non consultées.
- Ghost Mode désactive réellement l’exposition de la position au backend.
- Les tuiles et Leaflet/MapLibre sont embarqués ou fournis par un prestataire maîtrisé.

## Appels audio/vidéo

À construire après la messagerie stable :

- WebRTC.
- Serveur de signalisation.
- STUN/TURN.
- écran d’appel entrant.
- permissions micro/caméra.
- reconnexion réseau.
- historique d’appels.

## Observabilité

- logs structurés sans contenu sensible ;
- crash reporting ;
- métriques de latence message/push ;
- taux d’échec upload ;
- taux d’ouverture des notifications ;
- traces de modération ;
- alertes sur erreurs realtime et backlog d’envoi.

## Ordre de construction

1. Fondations mobile, navigation, thème et CI.
2. Authentification et synchronisation profil/rôle.
3. Conversations, messages texte et persistance.
4. Realtime, accusés et hors ligne.
5. Notifications push.
6. Médias, vocaux et sondages.
7. Feed, commentaires et réactions.
8. Map et confidentialité.
9. Modération.
10. Appels audio/vidéo.
11. Store hardening, sécurité et publication.
