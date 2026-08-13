# Connexio — critères de préparation à la production

## Règle d'architecture

Connexio est un second client du backend Neptune existant. Il ne crée ni base utilisateurs, ni rôles, ni conversations parallèles. Les identifiants `user_id`, `club_id`, `conversation_id` et `message_id` restent ceux de Neptune Business Point App.

## Gates bloquants

Aucune publication publique tant que chaque gate n'est pas prouvée sur préproduction.

### Identité et permissions

- échange de code mobile à usage unique, expirant et non rejouable ;
- access token court, refresh token révocable stocké dans SecureStore ;
- droits calculés côté serveur pour Visionnaire, Amiral, Capitaine, Moussaillon, Triton et administration ;
- révocation d'un membre propagée au mobile en moins d'une minute ;
- aucune confiance accordée aux rôles envoyés par le téléphone.

### Messages

- `client_message_id` unique et contrainte d'idempotence côté serveur ;
- file locale chiffrée, reprise après redémarrage et coupure réseau ;
- états réels : attente, envoi, envoyé, distribué, lu, échec ;
- aucune simulation automatique de l'état « lu » ;
- pagination par curseur ;
- déduplication REST/temps réel ;
- édition, suppression et réactions autorisées uniquement par le serveur.

### Traduction des messages

- le corps original reste la source de vérité et n'est jamais écrasé par une traduction ;
- la langue cible provient de la préférence/locale du lecteur et est propagée au backend ;
- une traduction retournée pour une autre langue cible n'est jamais affichée ;
- cache serveur indexé par message/version/langue cible et invalidé après édition ;
- aucun secret fournisseur de traduction dans le client mobile ;
- échec de traduction = affichage immédiat du message original ;
- le fournisseur, les conditions de traitement et la conservation éventuelle sont validés avant activation publique.

### Appels et sous-titres traduits

- l'appel WebRTC reste fonctionnel lorsque le service de sous-titrage est indisponible ;
- le bouton CC n'est exposé en production que si le backend annonce explicitement la capacité ;
- aucun fragment audio de sous-titrage n'est envoyé avant `call:captions:ready` ;
- aucun fragment audio n'est envoyé lorsque le microphone est coupé ;
- chaque fragment et chaque sous-titre est associé au `call_id` authentifié ;
- les sous-titres destinés à un autre appel ou à une autre langue cible sont rejetés ;
- limitation de débit, taille maximale et MIME audio autorisés contrôlés côté serveur ;
- fragments audio supprimés après traitement par défaut, sans historique de transcription côté mobile ;
- panne ou reconnexion du service de sous-titrage ne doit jamais terminer l'appel ;
- latence et qualité testées sur conversations multilingues réelles avant activation publique.

### Notifications

- APNs/FCM configurés sur development builds et builds de production ;
- token enregistré et révocable par appareil ;
- deep link testé application ouverte, arrière-plan et fermée ;
- contenu sensible masqué sur écran verrouillé ;
- préférences de notifications respectées côté serveur.

### Sécurité et confidentialité

- TLS obligatoire ;
- ticket WebSocket court plutôt que JWT long dans l'URL ;
- base locale SQLCipher, clé dans SecureStore ;
- aucune donnée de message dans les logs ;
- blocage, signalement, limitation de débit et modération opérationnels ;
- localisation approximative calculée côté serveur ;
- Ghost Mode coupe effectivement la collecte et la diffusion ;
- suppression de compte et export de données disponibles ;
- politique de confidentialité mise à jour avant activation d'un fournisseur de transcription/traduction ;
- fournisseur réellement utilisé, sous-traitance, localisation du traitement et règles de conservation documentés avant publication publique.

### Qualité

- typecheck et tests de domaine verts ;
- test de 500 messages sans perte ni doublon ;
- test de reconnexion sur réseau faible ;
- test sur au moins un iPhone et deux Android dont un milieu de gamme ;
- visio avec CC testée sur iOS, Android et web, micro actif puis coupé/réactivé ;
- test de bascule anglais ↔ français et au moins une troisième langue ;
- cibles tactiles de 48 dp sur les actions principales ;
- VoiceOver et TalkBack testés ;
- crash-free sessions pilote >= 99,5 % ;
- sauvegarde backend restaurée lors d'un exercice réel ;
- procédure de rollback documentée.

## Éléments volontairement non simulés

Un bouton non branché ne doit pas être présenté comme fonctionnel. Les pièces jointes, vocaux, appels, Map, Story Time, traduction de messages et sous-titres traduits doivent rester derrière un feature flag jusqu'à ce que permissions, stockage, traitement serveur, confidentialité, erreurs et tests physiques soient terminés.
