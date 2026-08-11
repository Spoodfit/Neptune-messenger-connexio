# Connexio — matrice des connexions

État constaté le 11 août 2026 sur `https://api.neptunebusiness.com/api`, sans modification de Neptune Business. Le registre exécutable correspondant se trouve dans `src/config/integrationRegistry.ts`.

| Domaine | État réel | Ce que Connexio fait | Reste avant publication publique |
|---|---|---|---|
| Compte Neptune | Connecté, validation appareil requise | Login, session cookie, renouvellement et profil `/v1/auth` | Tester persistance, expiration et déconnexion sur iPhone et Android |
| Annuaire | Connecté | Lit `/v1/users` et normalise les rôles/profils Neptune | Valider avec un compte de chaque statut |
| Besoins et avantages | Connecté partiellement | Lit `/v1/needs` et `/v1/benefits`; publie uniquement un Besoin | Le serveur doit imposer l’auteur courant et fournir réactions/commentaires |
| Conversations et messages | Bloqué côté serveur | Écrans désactivés en mode `neptune-web-v1` | Créer les routes sécurisées `/v1/conversations` et vérifier l’appartenance à chaque lecture/écriture/socket |
| Médias privés | Bloqué côté serveur | Aucun envoi vers les routes historiques | Stockage privé, URLs signées, contrôle MIME, antivirus et autorisations |
| Temps réel | Bloqué côté serveur | Aucun branchement sur le Socket.IO historique | Ticket éphémère, contrôle d’appartenance, Redis et événements Connexio |
| Appels | Bloqué côté serveur | Onglet masqué | Signalisation autorisée, STUN/TURN et tests réseau réels |
| Notifications push | Bloqué côté serveur/stores | Aucun token envoyé au backend actuel | Routes device-token, APNs, FCM, credentials et tests appareil fermé |
| Confidentialité et suppression | Connecté | Documents Connexio et suppression avec mot de passe | Relecture juridique et test avec compte dédié |
| IPA / AAB | Bloqué volontairement | Le profil production refuse `neptune-web-v1` | Backend `connexio-v1`, accès EAS, certificats Apple et clé Google Play |

## Règle de communication

Une fonctionnalité est décrite comme **connectée** uniquement après une preuve sur l’environnement Neptune réel. Le profil `release-candidate` permet les essais internes des fonctions réellement disponibles. Le profil `production` reste bloqué tant que `EXPO_PUBLIC_BACKEND_CONTRACT` ne vaut pas `connexio-v1`.
