# Connexio — critères de préparation à la production

## Règle d'architecture

Connexio est un second client du backend Neptune existant. Il ne crée ni base utilisateurs, ni rôles, ni conversations parallèles. Les identifiants `user_id`, `club_id`, `conversation_id` et `message_id` restent ceux de Neptune Business Point App.

## Gates bloquants

Aucune publication publique tant que chaque gate n'est pas prouvée sur préproduction.

### Identité et permissions

- échange de code mobile à usage unique, expirant et non rejouable ;
- access token court, refresh token révocable stocké dans SecureStore ;
- droits calculés côté serveur pour Visionnaire, Amiral, Capitaine, Légende, Moussaillon, Triton et administration ;
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
- suppression de compte et export de données disponibles.

### Qualité

- typecheck et tests de domaine verts ;
- test de 500 messages sans perte ni doublon ;
- test de reconnexion sur réseau faible ;
- test sur au moins un iPhone et deux Android dont un milieu de gamme ;
- cibles tactiles de 48 dp sur les actions principales ;
- VoiceOver et TalkBack testés ;
- crash-free sessions pilote >= 99,5 % ;
- sauvegarde backend restaurée lors d'un exercice réel ;
- procédure de rollback documentée.

## Éléments volontairement non simulés

Un bouton non branché ne doit pas être présenté comme fonctionnel. Les pièces jointes, vocaux, appels, Map et Story Time doivent rester derrière un feature flag jusqu'à ce que permissions, stockage, modération, erreurs et tests physiques soient terminés.
