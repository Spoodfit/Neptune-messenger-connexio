# Connexio V14 — matrice d’acceptation fonctionnelle

Cette matrice reprend les exigences produit validées pour la remise frontend. **Opérationnelle côté client** signifie que l’écran, l’interaction, les états de chargement/erreur et le contrat API existent. Les fonctions multi-utilisateurs exigent naturellement le déploiement des routes Express, modèles Prisma, stockage et évènements Socket.IO documentés dans `FRONTEND_HANDOFF.md`.

## Messagerie

| Exigence | Statut | Implémentation |
|---|---|---|
| Onglets Groupes / Privées | Opérationnelle | Segmentation accessible et listes indépendantes. |
| Maintien long sur un groupe | Opérationnelle | Sourdine, informations, administration et départ. |
| Visibilité par statuts Neptune | Opérationnelle | Visionnaire, Amiral, Capitaine, Légende, Moussaillon, Triton et Free. Le backend reste l’autorité. |
| Création et administration des groupes officiels | Opérationnelle | Interface exposée uniquement aux Visionnaires. Nom, description, image, icône, rôles et droit de publier. |
| Image de groupe recadrée | Opérationnelle | Picker système avec recadrage carré, agrandissement/rognage, upload privé et fallback icône. |
| Bouton Enregistrer du groupe | Opérationnelle | Validation, état occupé, `PATCH`, rafraîchissement et message d’erreur. |
| Mentions visibles | Opérationnelle | Prénom, nom ou entreprise, compteur et contour animé. |
| Conversation individuelle | Opérationnelle | Création ou réutilisation automatique du thread existant. |
| Mini-groupe privé | Opérationnelle | Quatre participants maximum au total. |
| Avatars et membres actifs | Opérationnelle | Photos avec fallback initiales, nombre serveur exact et pile des membres les plus actifs. |
| Pièces jointes | Opérationnelle | Photos, vidéos, documents, fichiers et localisation. Jusqu’à 10 contenus et 120 Mo cumulés. |
| Prévisualisation multiple | Opérationnelle | Grille compacte de médias, compteur `+N`, lecteur vidéo, documents lisibles et téléchargement/ouverture. |
| Réactions aux messages | Opérationnelle | Barre animée attachée au message, maintien long, bouton `+`, réaction actuelle visible et changement possible. |
| Réponse par glissement | Opérationnelle | Swipe droite, aperçu et identifiant de réponse. |
| Sondages | Opérationnelle | Création, choix simple/multiple, anonymat, vote, retrait et totaux. |
| Votes d’évènements | Opérationnelle côté client | Alerte dans le groupe de ville, sondage synchronisé et bouton vers les votes Neptune Business. |
| Profil membre `…` | Opérationnelle | Profil Neptune Business, sourdine, signalement et blocage. |
| Appels audio/vidéo | Opérationnelle côté client | WebRTC intégré à Connexio, contrôles internes et signalisation Socket.IO. Aucun Jitsi. |
| Temps réel | Opérationnelle côté client | Engine.IO/Socket.IO, ticket éphémère, heartbeat, reconnexion et compatibilité JSON direct. |
| Hors-ligne | Opérationnelle | Outbox chiffrée, idempotence, retry et réconciliation REST/Socket.IO. |

## Temps forts

| Exigence | Statut | Implémentation |
|---|---|---|
| Publication texte/photo/vidéo | Opérationnelle | Upload privé, vidéo de 60 secondes maximum et aperçu réel. |
| Mentions | Opérationnelle | Suggestions par prénom, nom ou entreprise. |
| Localisation | Opérationnelle côté client | Position approximative ou recherche de lieu via backend, sans exposer la clé Google Places. |
| Réactions compactes | Opérationnelle | Rectangles discrets, cibles tactiles de 44 px et état sélectionné. |
| Menu `…` | Opérationnelle | Profil, partage et signalement. |
| Commentaires et réponses | Opérationnelle | Commentaires, réponses imbriquées et réactions. |
| Partage | Opérationnelle | URL serveur et feuille de partage native. |
| Synchronisation Besoin | Opérationnelle côté client | Cibles Connexio + besoins Neptune Business, identifiant canonique et idempotence côté serveur. |
| Synchronisation Offre | Opérationnelle côté client | Cibles Connexio + Comité Avantage ; création inverse attendue depuis le web. |
| Animation après publication | Opérationnelle | Retour immédiat au Feed, apparition avec translation, fondu et ressort. |
| Feed deux colonnes | Opérationnelle | Seuls les contenus compacts sont appariés ; actions par icônes ; absence de trou. |
| Publicité Comité Avantage | Opérationnelle | Remplace la deuxième case lorsqu’un contenu compact reste isolé. |

## Map et appels

| Exigence | Statut | Implémentation |
|---|---|---|
| Vraie carte web/mobile | Opérationnelle | Leaflet web et WebView native. |
| Géolocalisation, zoom et déplacement | Opérationnelle | Permissions Expo et contrôles tactiles. |
| Anti-chevauchement | Opérationnelle | Cluster et spiderfy. |
| Avatars pulsants | Opérationnelle | Photo/initiales et contour animé pour publication récente. |
| Bulles flottantes | Opérationnelle | Publications récentes, réactions et accès au détail. |
| Actions rapides | Opérationnelle | Message, appel audio, visio et profil. |
| Appel intégré | Opérationnelle côté client | `getUserMedia`, `RTCPeerConnection`, ICE/TURN, Socket.IO et écran Connexio. |

## Authentification, compte et sécurité

| Exigence | Statut | Implémentation |
|---|---|---|
| Se connecter avec Neptune | Opérationnelle | Email/mot de passe Neptune, cookie httpOnly et restauration `/auth/me`. |
| Créer un compte | Opérationnelle | Redirection vers `neptunebusiness.com/register`. |
| Déconnexion | Opérationnelle | Révocation serveur, purge locale et retour à `/sign-in`; texte centré. |
| Sessions et appareils | Opérationnelle côté client | Liste et révocation. |
| Export et suppression | Opérationnelle côté client | Demandes serveur et états de confirmation. |
| Notifications et confidentialité | Opérationnelle côté client | Préférences synchronisées. |
| Blocage et signalement | Opérationnelle côté client | Membres, groupes, messages, commentaires et Temps forts. |
| Responsive/accessibilité | Opérationnelle | Petits écrans, tablette, paysage, zoom 140 %, cibles tactiles et libellés. |

## Critères de fermeture

Le frontend est accepté lorsque ces contrôles passent sur le même commit :

- `CI / verify` : TypeScript, tests métier, audit de dépendances, Expo et configuration production ;
- `CI / responsive-audit` : 280×568 à tablette/paysage, zoom 140 %, chat faible hauteur et navigation ;
- `Product Audit` : parcours Groupes/Privées, chat, Feed, Map, appels, profil et authentification ;
- aucun placeholder Jitsi ou bouton sans action dans les parcours livrés.

La publication multi-utilisateur reste conditionnée aux routes Express/Prisma, à Socket.IO/Redis, au stockage privé, à TURN, APNs/FCM et aux essais sur appareils physiques. Ces éléments sont des branchements backend/infrastructure ; les écrans et interactions frontend sont fournis.
