# Connexio V13 — matrice d’acceptation fonctionnelle

Cette matrice reprend les exigences produit ayant conduit à la V13. Une fonction marquée **opérationnelle** possède son interaction frontend réelle. Lorsqu’elle dépend de données partagées, le client appelle un contrat backend explicite ; aucun écran n’est à reconstruire.

## Messagerie

| Exigence | Statut | Implémentation |
|---|---|---|
| Séparer groupes et conversations privées | Opérationnelle | Onglets accessibles Groupes / Privées dans la liste des messages. |
| Maintien long sur un groupe | Opérationnelle | Feuille d’actions : sourdine, paramètres, administration, quitter. |
| Visibilité par statut Neptune | Opérationnelle | Filtrage client et contrats serveur pour Visionnaire, Amiral, Capitaine, Légende, Moussaillon, Triton et Free. |
| Création et modification selon les droits | Opérationnelle | Création, nom, description, image, icône, rôles visibles et droit de publication. |
| Signal visuel d’une mention | Opérationnelle | Détection par prénom, nom complet ou entreprise et contour animé dans la liste. |
| Conversation privée individuelle | Opérationnelle | Création ou réutilisation d’une conversation directe existante. |
| Mini-groupe privé limité à quatre personnes | Opérationnelle | Trois contacts maximum plus le créateur, contrôle client et contrat serveur. |
| Photos de profil et fallback initiales | Opérationnelle | Avatars distants avec repli automatique sur les initiales. |
| Photo, vidéo, document, fichier et localisation | Opérationnelle | Pickers système, limites de taille, upload privé, progression, affichage et ouverture. |
| Réactions emoji aux messages | Opérationnelle | Ajout et retrait optimistes, persistance API. |
| Réponse par glissement | Opérationnelle | Swipe vers la droite, aperçu et `reply_to_message_id`. |
| Profil depuis un message | Opérationnelle | Avatar/nom cliquable vers le profil membre. |
| Actions message, téléphone, audio et visio | Opérationnelle | Conversation serveur, lien téléphonique et salles Jitsi. |
| Membres et paramètres depuis le nom du groupe | Opérationnelle | En-tête cliquable vers l’écran du groupe. |
| Hors-ligne et reprise | Opérationnelle | Outbox chiffrée, idempotence, retry, pagination et réconciliation temps réel. |

## Temps forts

| Exigence | Statut | Implémentation |
|---|---|---|
| Publication texte | Opérationnelle | Éditeur limité et création API. |
| Publication photo | Opérationnelle | Sélection appareil, upload privé et rendu réel. |
| Vidéo courte de moins d’une minute | Opérationnelle | Sélection vidéo, contrôle 60 secondes, upload et lecture native. |
| Mentions | Opérationnelle | Suggestions et résolution prénom, nom ou entreprise. |
| Réactions | Opérationnelle | Ajout/retrait API et état optimiste. |
| Commentaires et réponses | Opérationnelle | Commentaire, réponse imbriquée et réactions. |
| Partage | Opérationnelle | Lien serveur et feuille de partage native. |
| Tag `BESOIN` synchronisé avec Neptune Business | Opérationnelle côté client | Création avec identifiant/idempotence et `sync_targets=[connexio,business]`. Le backend propage les événements entre les deux applications. |
| Signalement et modération | Opérationnelle | Création d’un signalement serveur depuis la publication ou le profil. |

## Map

| Exigence | Statut | Implémentation |
|---|---|---|
| Vraie carte web et mobile | Opérationnelle | Leaflet dans le navigateur et WebView native. |
| Géolocalisation | Opérationnelle | Permission Expo, centrage, précision et rayon de confidentialité. |
| Zoom et déplacement | Opérationnelle | Contrôles Leaflet tactiles. |
| Éviter les chevauchements | Opérationnelle | MarkerCluster et spiderfy au zoom maximal. |
| Avatar des membres | Opérationnelle | Photo de profil ou initiales. |
| Contour pulsant après publication | Opérationnelle | Anneau animé sur les marqueurs concernés. |
| Bulles flottantes des publications | Opérationnelle | Jusqu’à trois Temps forts avec réactions et accès au détail. |
| Actions rapides | Opérationnelle | Message, appel audio, visio et profil. |
| Mode fantôme | Opérationnelle | Préférence serveur et suppression de la position connue. |

## Compte, sécurité et écrans indispensables

| Exigence | Statut | Implémentation |
|---|---|---|
| Déconnexion vers la connexion | Opérationnelle | Purge de session, providers protégés et redirection `/sign-in`. |
| Connexion par code | Opérationnelle | Échange du code, refresh token et session sécurisée. |
| Sessions et appareils | Opérationnelle | Liste et révocation des sessions. |
| Export des données | Opérationnelle | Génération serveur et ouverture du téléchargement sécurisé. |
| Suppression du compte | Opérationnelle | Demande serveur, révocation et déconnexion. |
| Notifications | Opérationnelle | Messages, mentions, groupes, Temps forts, appels et aperçu confidentiel. |
| Confidentialité | Opérationnelle | Map, profil, présence, téléphone et position approximative. |
| Blocage et déblocage | Opérationnelle | Blocage depuis le profil, liste et déblocage. |
| Route introuvable et contenu supprimé | Opérationnelle | États d’erreur et retour vers un écran sûr. |
| Responsive et accessibilité | Opérationnelle | Cibles tactiles, libellés, petits écrans, tablette, paysage et zoom 140 %. |

## Critères de fermeture

La livraison frontend est acceptée lorsque les contrôles suivants réussissent sur le même commit :

- `CI / verify` ;
- `CI / responsive-audit` ;
- `Product Audit` ;
- `npm audit --omit=dev --audit-level=high` ;
- `npx expo install --check` ;
- gate de configuration production HTTPS/WSS ;
- aucun workflow temporaire avec permission d’écriture.

La publication publique reste conditionnée au déploiement des endpoints documentés, aux clés EAS, à APNs/FCM, au stockage privé, à l’infrastructure d’appel et aux tests sur appareils physiques. Ces travaux sont des branchements backend/infrastructure ; ils ne requièrent pas de reprise fonctionnelle du frontend.
