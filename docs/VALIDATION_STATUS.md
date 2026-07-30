# Connexio — statut de validation

Date de revue : 30 juillet 2026.

## Règle de lecture

- **Validé dépôt** : prouvé par le code, les tests et la CI.
- **Validé partiellement** : le client est prêt, mais une preuve backend ou appareil manque.
- **Non validé** : aucune publication publique autorisée.

## Noyau mobile

| Domaine | Statut | Preuve / limite |
|---|---|---|
| TypeScript strict | Validé dépôt | Typecheck Expo séparé du projet de tests Node |
| Tests de domaine | Validé dépôt | Tests compilés avec les types Node officiels et exécutés dans la CI |
| Installation reproductible | Validé dépôt | `package-lock.json` synchronisé et gate `npm ci` verte |
| Configuration Expo publique | Validé dépôt | `npx expo config --type public` |
| Compatibilité Expo | Validé dépôt | `npx expo install --check` vert |
| Mode mock | Validé dépôt | Actif uniquement si explicitement demandé |
| Configuration production | Validé dépôt | API/EAS obligatoires, mock interdit, HTTPS/WSS exigés |
| Cibles tactiles principales | Validé dépôt | Actions principales de 48 dp ou plus |
| Erreurs et états vides | Validé dépôt | Discussions, chat, annuaire et réglages |
| État hors authentification | Validé dépôt | Le provider de messagerie est démonté et aucun transport ne tourne sur l’écran de connexion |
| VoiceOver / TalkBack | Non validé | Test physique obligatoire |

## Identité et session

| Domaine | Statut | Preuve / limite |
|---|---|---|
| Code mobile à usage unique | Validé partiellement | Client anti-double soumission ; expiration/non-rejeu à prouver côté Neptune |
| Refresh token | Validé dépôt | SecureStore, révocation locale et serveur |
| Refresh proactif | Validé dépôt | Expiration, marge et single-flight testés |
| Retry après HTTP 401 | Validé dépôt | Une seule tentative après rafraîchissement |
| Panne backend temporaire | Validé dépôt | La session locale n’est pas détruite sur réseau/5xx |
| Changement de compte | Validé dépôt | État de messagerie démonté et outbox chiffrée purgée avant une nouvelle session |
| Autorisations par rôle | Non validé | Le serveur Neptune doit rester source de vérité |

## Messages

| Domaine | Statut | Preuve / limite |
|---|---|---|
| Envoi optimiste | Validé dépôt | L’entrée d’outbox est persistée avant l’apparition optimiste |
| Outbox persistante | Validé dépôt | SQLite / SQLCipher et reprise après relance |
| Échec du stockage local | Validé dépôt | Erreur capturée, aucun envoi fantôme sans outbox |
| Idempotence client | Validé dépôt | `client_message_id` + `Idempotency-Key` |
| Idempotence serveur | Non validé | Contrainte unique et replay à tester sur préproduction |
| Retry borné | Validé dépôt | Backoff, `Retry-After` et échec non réessayable |
| Pagination curseur | Validé dépôt | Curseur conservé et chargement incrémental |
| Fusion/déduplication | Validé dépôt | REST, temps réel et optimiste |
| Test 500 messages | Validé dépôt | Aucun doublon ni perte dans le test de domaine |
| Permission locale d’envoi | Validé dépôt | Le provider refuse toute conversation absente ou en lecture seule |
| Livraison / lecture réelle | Validé partiellement | Client prêt ; accusés serveur à prouver |
| Édition/suppression/réactions | Non validé | Endpoints et autorisations serveur absents |
| Pièces jointes / vocaux | Non validé | Feature flag obligatoire |

## Temps réel

| Domaine | Statut | Preuve / limite |
|---|---|---|
| Validation des événements | Validé dépôt | Payloads camelCase/snake_case normalisés, événements invalides ignorés |
| Validation du ticket | Validé dépôt | Ticket, expiration camelCase/snake_case et date future obligatoires |
| Reconnexion | Validé dépôt | Backoff exponentiel borné avec jitter |
| Connexions parallèles | Validé dépôt | Ouverture concurrente bloquée |
| Cycle premier plan / arrière-plan | Validé dépôt | WebSocket coupé hors premier plan puis reconnecté au retour actif |
| Ticket WebSocket court | Validé partiellement | Client prêt ; durée, usage unique et révocation à tester côté serveur |
| Réseau faible / changement Wi-Fi-4G | Non validé | Test physique et préproduction obligatoire |

## Notifications

| Domaine | Statut | Preuve / limite |
|---|---|---|
| Demande d’autorisation | Validé dépôt | Gérée sans bloquer la messagerie |
| Enregistrement par appareil | Validé dépôt | Token envoyé au backend et mémorisé dans SecureStore |
| Rotation du token | Validé dépôt | Listener Expo, nouvel enregistrement et révocation de l’ancien |
| Déconnexion | Validé dépôt | Révocation backend, native et locale |
| Deep link conversation | Validé dépôt | App ouverte ou authentification différée |
| APNs / FCM réels | Non validé | Certificats, EAS et appareils physiques requis |
| Confidentialité écran verrouillé | Validé partiellement | Canal Android privé ; payload serveur à auditer |

## Sécurité et confidentialité

| Domaine | Statut | Preuve / limite |
|---|---|---|
| Transport production | Validé dépôt | HTTPS/WSS obligatoires |
| Validation des réponses réseau | Validé dépôt | Sessions, conversations, messages, tickets et événements WebSocket |
| Principe du moindre privilège | Validé dépôt | Rôle inconnu normalisé vers Triton, publication refusée sans permission explicite |
| Base locale chiffrée | Validé partiellement | SQLCipher configuré ; build natif et extraction à tester |
| Logs sensibles | Validé partiellement | Redaction présente ; audit runtime à effectuer |
| Blocage / signalement / modération | Non validé | Backend et UI à construire |
| Export / suppression de compte | Non validé | Parcours Neptune global requis |
| Map / localisation / Ghost Mode | Non validé | Ne pas activer en production |

## Release gates externes

Aucune fusion de la branche mobile vers `main` et aucune soumission store avant preuve des éléments suivants :

1. API Neptune de préproduction conforme au contrat ;
2. permissions serveur testées pour les six statuts ;
3. idempotence, pagination et révocation testées avec concurrence réelle ;
4. APNs/FCM et deep links testés app ouverte, arrière-plan et fermée ;
5. test VoiceOver et TalkBack ;
6. test sur un iPhone et deux Android dont un milieu de gamme ;
7. test réseau faible, offline prolongé et reconnexion ;
8. blocage, signalement, modération, export et suppression opérationnels ;
9. crash-free sessions pilote supérieur ou égal à 99,5 % ;
10. rollback et restauration backend exercés.
