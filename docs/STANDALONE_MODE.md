# Connexio — mode standalone avant branchement backend

## Objectif

Le profil `standalone` permet d'installer et d'utiliser Connexio pour les tests produit, démonstrations et validations sur appareils avant que le backend `connexio-v1` soit disponible.

Ce profil ne constitue pas un backend alternatif. Il conserve les mêmes types, providers, routes et méthodes publiques que la version connectée. Lorsque le backend sera disponible, la bascule consiste à désactiver le mode local et à renseigner les URL API/temps réel ; les écrans n'ont pas à être réécrits.

## Construction

Android :

```bash
eas build --profile standalone --platform android
```

iOS :

```bash
eas build --profile standalone --platform ios
```

Le profil est volontairement en `distribution: internal`. Il ne doit pas être soumis à l'App Store ou à Google Play comme version de production.

## Ce qui fonctionne sans backend

- navigation et authentification de démonstration ;
- listes de groupes, membres et conversations de démonstration ;
- envoi de messages local avec le même cycle optimiste que le client connecté ;
- création de conversations privées et mini-groupes ;
- création et gestion de groupes locaux ;
- réactions, commentaires et temps forts ;
- sélection locale des pièces jointes et médias lorsque la plateforme l'autorise ;
- parcours des appels audio/vidéo en session de démonstration avec caméra et microphone locaux ;
- interface des sous-titres traduits de visio avec exemple de démonstration ;
- exemples de messages traduits présents dans les données de démonstration ;
- persistance des contenus créés par l'utilisateur entre les sessions principales de l'application.

La persistance standalone sauvegarde les actions locales puis les restaure en les rejouant via les mêmes méthodes publiques (`sendMessage`, `createPrivateConversation`, `createPost`, `createGroup`, etc.). Cela évite de créer une seconde architecture métier uniquement pour la démonstration.

## Ce qui nécessite réellement le backend

Les fonctions suivantes ne doivent jamais être présentées comme réelles en mode standalone :

- synchronisation entre plusieurs téléphones ou comptes ;
- réception d'un message réellement envoyé par un autre membre ;
- WebSocket temps réel multi-utilisateur ;
- notifications push serveur ;
- appels WebRTC entre deux participants distants ;
- flux caméra distant du Coworking et mosaïque SFU réelle ;
- TURN de production ;
- transcription Speech-to-Text réelle ;
- traduction arbitraire de nouveaux messages ou paroles ;
- synchronisation Neptune Business des profils, rôles, groupes, temps forts et données métier ;
- modération, permissions et révocations calculées côté serveur.

## Contrat de bascule vers le backend

Quand `connexio-v1` est prêt :

1. construire avec `EXPO_PUBLIC_MOCK_MODE=false` ;
2. conserver `EXPO_PUBLIC_BACKEND_CONTRACT=connexio-v1` ;
3. renseigner `EXPO_PUBLIC_API_BASE_URL` en HTTPS ;
4. renseigner `EXPO_PUBLIC_REALTIME_URL` en WSS/HTTPS ;
5. implémenter les contrats documentés dans `BACKEND_CONTRACT.md`, `MESSAGE_TRANSLATION_BACKEND.md` et `LIVE_TRANSLATED_CAPTIONS_BACKEND.md` ;
6. vérifier les permissions et rôles côté serveur ;
7. tester APNs/FCM, WebSocket, TURN, traduction et sous-titrage sur appareils physiques ;
8. utiliser ensuite le profil `production`, qui continue de refuser toute build avec le mode mock actif.

## Données locales

Le mode standalone persiste uniquement les contenus nécessaires à la continuité de la démonstration. Sur web, cette continuité utilise le stockage local du navigateur. Sur l'application native, elle utilise le stockage clé/valeur fourni par Expo SQLite.

Ces données locales ne sont pas destinées à être migrées vers le futur backend. Lors de la bascule, le backend Neptune/Connexio redevient la source de vérité et fournit les identifiants canoniques utilisateurs, conversations, messages et contenus.

## Règle de publication

Le mode standalone est une aide temporaire d'intégration et de validation. Les gates existantes de production restent inchangées : une build Store publique doit utiliser le backend sécurisé `connexio-v1`, avoir le mock désactivé et réussir les contrôles CI, Store, responsive et produit.
