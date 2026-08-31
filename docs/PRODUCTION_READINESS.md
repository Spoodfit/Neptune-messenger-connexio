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

### Appels, rendez-vous et sous-titres traduits

- chaque appel immédiat ou programmé possède un objet explicite ;
- un rendez-vous programmé est créé et autorisé côté serveur, avec date UTC/fuseau maîtrisé ;
- l'acceptation, le refus et l'annulation sont idempotents et réservés aux participants autorisés ;
- aucun appel distant n'est déclenché si le rendez-vous n'est pas `accepted` ;
- à l'heure prévue, le backend crée la vraie session d'appel et déclenche les notifications d'appel entrant aux participants ;
- les anciens rappels sont invalidés lorsqu'un rendez-vous est déplacé, refusé ou annulé ;
- les coordonnées d'un invité externe ne sont utilisées que pour le rendez-vous demandé et ne deviennent jamais silencieusement un contact Neptune ;
- le contrat complet est défini dans `docs/SCHEDULED_CALLS_BACKEND.md` ;
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

### Contacts de l'appareil

- aucun import global ni synchronisation automatique du carnet d'adresses ;
- le sélecteur natif ne retourne que la personne explicitement choisie par l'utilisateur ;
- `WRITE_CONTACTS` reste bloqué sur Android ;
- avant une recommandation à un membre, les coordonnées réellement partagées sont affichées et une confirmation Connexio est demandée ;
- une invitation ou un invité externe ne crée pas automatiquement un membre Neptune ;
- la permission Contacts, la finalité et la politique de conservation sont reflétées dans App Privacy, Google Data Safety et la politique de confidentialité.

### Notifications

- APNs/FCM configurés sur development builds et builds de production ;
- token enregistré et révocable par appareil ;
- deep link testé application ouverte, arrière-plan et fermée ;
- contenu sensible masqué sur écran verrouillé ;
- préférences de notifications respectées côté serveur ;
- rappels d'appels programmés testés après redémarrage du téléphone, application fermée et changement de fuseau ;
- suppression/annulation d'un rendez-vous annule aussi les rappels associés.

### Sécurité et confidentialité

- TLS obligatoire ;
- ticket temps réel court et à usage unique, transmis dans l'auth Socket.IO et jamais dans l'URL ;
- base locale SQLCipher, clé dans SecureStore ;
- aucune donnée de message dans les logs ;
- blocage, signalement, limitation de débit et modération opérationnels ;
- localisation approximative calculée côté serveur ;
- Ghost Mode coupe effectivement la collecte et la diffusion ;
- suppression de compte et export de données disponibles ;
- politique de confidentialité mise à jour avant activation d'un fournisseur de transcription/traduction ;
- fournisseur réellement utilisé, sous-traitance, localisation du traitement et règles de conservation documentés avant publication publique.

### UX, apparence et navigation

- thèmes Système, Sombre et Clair testés sur les quatre onglets principaux et les écrans de détail ;
- contraste vérifié en thème clair et sombre, y compris états désactivés et erreurs ;
- changement d'onglet par swipe ne vole pas les gestes locaux des listes, conversations, membres ou carrousels ;
- retour arrière par swipe limité au bord gauche et testé sur Android/iOS ;
- préférences de réduction des animations respectées ;
- cibles tactiles principales >= 48 dp.

### Branding natif

- `icon.png`, `adaptive-icon.png` et `splash-icon.png` sont des assets distincts ;
- le foreground adaptatif Android est transparent, centré et reste dans la safe-zone contrôlée par le workflow ;
- l'icône est vérifiée sur launcher rond, squircle et masque constructeur ;
- splash blanc et logo intégral vérifiés sur au moins deux Android physiques avant diffusion.

### Qualité

- typecheck et tests de domaine verts ;
- test de 500 messages sans perte ni doublon ;
- test de reconnexion sur réseau faible ;
- test sur au moins un iPhone et deux Android dont un milieu de gamme ;
- visio avec CC testée sur iOS, Android et web, micro actif puis coupé/réactivé ;
- test de bascule anglais ↔ français et au moins une troisième langue ;
- VoiceOver et TalkBack testés ;
- crash-free sessions pilote >= 99,5 % ;
- sauvegarde backend restaurée lors d'un exercice réel ;
- procédure de rollback documentée.

## Éléments volontairement non simulés

Un bouton non branché ne doit pas être présenté comme fonctionnel. Les pièces jointes, vocaux, appels, Map, Story Time, traduction de messages, sous-titres traduits et déclenchement distant des appels programmés doivent rester derrière un feature flag jusqu'à ce que permissions, stockage, traitement serveur, confidentialité, erreurs et tests physiques soient terminés. Le mode standalone peut simuler l'acceptation d'un rendez-vous pour la recette UX, mais ne doit jamais être confondu avec une acceptation serveur réelle.
