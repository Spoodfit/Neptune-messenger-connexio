# Connexio V14 — statut de validation

## Règle de lecture

- **Validé frontend** : interaction, état local, contrat API et contrôle automatisé présents.
- **À valider en intégration** : nécessite le backend Neptune, un service externe ou un appareil physique.
- **Bloquant publication** : aucune mise en production multi-utilisateur avant preuve.

## Frontend validé

| Domaine | Statut | Preuve |
|---|---|---|
| Installation reproductible | Validé frontend | `package-lock.json`, `npm ci` et compatibilité Expo |
| TypeScript et tests métier | Validé frontend | `CI / verify` |
| Responsive et accessibilité | Validé frontend | `CI / responsive-audit`, 280 px à tablette/paysage, zoom 140 % |
| Parcours produit web | Validé frontend | `Product Audit` |
| Connexion Neptune | Validé frontend | email/mot de passe, cookie httpOnly, `/auth/me`, inscription web |
| Déconnexion | Validé frontend | révocation, purge et redirection connexion |
| Groupes/Privées | Validé frontend | onglets et listes dédiées |
| Groupes officiels | Validé frontend | création/administration uniquement Visionnaires |
| Image de groupe | Validé frontend | sélection, recadrage carré, upload et fallback icône |
| Paramètres du groupe | Validé frontend | sauvegarde, rôles, droit d’écriture, sourdine, départ |
| Messages | Validé frontend | texte, mentions, réponses, réactions et hors-ligne |
| Médias multiples | Validé frontend | 10 contenus, plafond global, grille, lecture et téléchargement |
| Sondages | Validé frontend | création, vote, retrait, choix multiples et anonymat |
| Votes d’évènements | Validé frontend | bannière de ville, sondage synchronisé et redirection web |
| Membres actifs | Validé frontend | nombre réel et pile d’avatars actifs |
| Profils et modération | Validé frontend | profil web, sourdine, signalement et blocage |
| Temps réel | Validé frontend | Engine.IO 4 / Socket.IO, ticket, heartbeat et reconnexion |
| Appels intégrés | Validé frontend | WebRTC, contrôles internes et signalisation Socket.IO, sans Jitsi |
| Temps forts | Validé frontend | texte, photo, vidéo, mentions, localisation, réactions et commentaires |
| Besoins et Offres | Validé frontend | contrats de synchronisation Neptune Business / Comité Avantage |
| Feed deux colonnes | Validé frontend | appariement sans trou et publicité Comité Avantage en case orpheline |
| Map | Validé frontend | Leaflet, géolocalisation, clusters, avatars pulsants et actions rapides |

## À valider en intégration Neptune

| Domaine | Preuve attendue |
|---|---|
| Routes Express/Prisma | Tests sur préproduction avec le schéma PostgreSQL réel |
| Autorisations | Matrice `role`, `special_role`, `statut` et Visionnaire |
| Idempotence | Contraintes uniques messages, conversations, votes et synchronisations |
| Socket.IO/Redis | Reconnexion, multi-instance, ordre et déduplication des évènements |
| Stockage privé | URLs signées, antivirus, miniatures et contrôle d’accès |
| Appels | TURN réel, appels entrants et réseaux NAT restrictifs |
| Push | APNs/FCM, arrière-plan, application fermée et deep links |
| Synchronisation web | Besoin ↔ application web et Offre ↔ Comité Avantage dans les deux sens |
| Google Places | Recherche serveur sans clé exposée dans le client |
| SQLCipher | Build natif et extraction locale contrôlée |

## Bloquants publication

Aucune publication store ou ouverture multi-utilisateur avant :

1. environnement de préproduction Neptune connecté ;
2. migrations Prisma et rollback testés ;
3. tests de droits par statut ;
4. TURN et appels Wi-Fi/4G/5G validés ;
5. APNs/FCM validés ;
6. test sur un iPhone et deux Android ;
7. VoiceOver et TalkBack ;
8. réseau faible, hors-ligne prolongé et reprise ;
9. observabilité, sauvegardes et politique de conservation ;
10. Product Audit et CI verts sur le commit livré.
