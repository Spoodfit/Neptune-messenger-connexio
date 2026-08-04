# Connexio — matrice des connexions

Cette matrice sépare le code livré des dépendances externes. Le registre exécutable correspondant se trouve dans `src/config/integrationRegistry.ts`.

| Domaine | État du client | Propriétaire de la suite | Preuve avant publication publique |
|---|---|---|---|
| Authentification Neptune | Contrat prêt | Backend | Connexion, expiration, révocation et reprise sur préproduction |
| Conversations et messages | Contrat prêt | Backend | Tests multi-utilisateurs et matrice complète des statuts |
| Stockage des fichiers | Contrat prêt | Infrastructure | URLs signées, antivirus, miniatures et révocation |
| Socket.IO / Redis | Contrat prêt | Infrastructure | Ordre, déduplication, reconnexion et multi-instance |
| Appels WebRTC | Validation appareil requise | Infrastructure | TURN sur Wi-Fi, 4G, 5G et NAT restrictif |
| Notifications | Validation appareil requise | Stores / Infrastructure | APNs, FCM, sons, badges et deep links application fermée |
| Automatisations de groupe | Contrat prêt | Backend | Worker de planification, fuseaux horaires et idempotence |
| Confidentialité et suppression | URLs obligatoires | Juridique / Stores | Pages HTTPS publiques et traitement serveur effectif |
| IPA / AAB | Configuration prête | Comptes stores | Build signée, TestFlight et piste interne Google Play |

## Règle de communication

Une fonctionnalité est décrite comme **connectée** uniquement après une preuve sur l’environnement Neptune réel. Un écran local, un mock ou un contrat TypeScript ne doit jamais être présenté comme une validation backend ou appareil.
