# Connexio — Critères de validation production

Aucune version ne doit être publiée tant qu’un critère **P0** n’est pas validé.

## P0 — Bloquants absolus

### Identité et permissions

- [ ] Authentification réelle partagée avec Neptune Business.
- [ ] Identifiant utilisateur immuable et unique.
- [ ] Rôles Neptune reçus du backend uniquement.
- [ ] Permissions de groupes officielles testées côté serveur.
- [ ] Session expirée, révoquée et renouvelée correctement.

### Messagerie

- [ ] Message texte persistant après redémarrage.
- [ ] Aucun doublon après retry réseau.
- [ ] États `pending`, `sent`, `delivered`, `read`, `failed` fondés sur des événements réels.
- [ ] Retry manuel et automatique.
- [ ] Historique paginé.
- [ ] Réponse, modification, suppression pour soi et suppression pour tous.
- [ ] Réactions uniques par utilisateur.
- [ ] Groupes privés et officiels protégés par RLS.

### Push

- [ ] Enregistrement et révocation des tokens iOS/Android.
- [ ] Notification en arrière-plan et app fermée.
- [ ] Deep link vers la bonne conversation.
- [ ] Pas de contenu sensible lorsque l’aperçu est désactivé.
- [ ] Gestion des tokens invalides et appareils multiples.

### Sécurité

- [ ] RLS active sur toutes les tables exposées.
- [ ] Aucune clé service-role dans l’application.
- [ ] Contrôle d’autorisation testé pour chaque endpoint.
- [ ] Validation et sanitation de toutes les entrées.
- [ ] Fichiers validés par type, taille et scan.
- [ ] Rate limiting et anti-spam.
- [ ] Stockage sécurisé des secrets et sessions.
- [ ] Journalisation sans contenu privé.

### Confidentialité et Map

- [ ] Consentement explicite avant localisation.
- [ ] Position obfusquée côté serveur.
- [ ] Ghost Mode coupe réellement le partage.
- [ ] Expiration automatique de la localisation.
- [ ] Suppression et export des données.
- [ ] Aucune position exacte dans les logs ou notifications.

### Modération

- [ ] Blocage d’un membre.
- [ ] Signalement profil, message, post et commentaire.
- [ ] Masquage immédiat du contenu signalé pour le déclarant.
- [ ] Console ou workflow de traitement des signalements.
- [ ] Suspension et bannissement.

### Accessibilité

- [ ] Toutes les actions utilisables au clavier et avec lecteur d’écran.
- [ ] Cibles tactiles de 44 pt iOS / 48 dp Android.
- [ ] Contraste WCAG AA.
- [ ] Focus piégé dans les dialogues et restauré à la fermeture.
- [ ] Messages et erreurs annoncés via `aria-live` ou équivalent natif.
- [ ] Reduced Motion testé.

## P1 — Obligatoires avant lancement public

### Médias

- [ ] Photos et vidéos réelles.
- [ ] Upload progressif et reprise après coupure.
- [ ] Compression côté client.
- [ ] Miniatures générées.
- [ ] Téléchargement sécurisé.
- [ ] Suppression et expiration des URL signées.

### Vocaux

- [ ] Enregistrement, pause, reprise et suppression avant envoi.
- [ ] Permissions micro.
- [ ] Forme d’onde réelle.
- [ ] Lecture, pause et vitesse.
- [ ] Bluetooth et changement de sortie audio testés.

### Groupes

- [ ] Ajout et retrait de membres.
- [ ] Admins et propriétaire.
- [ ] Nom et avatar de groupe.
- [ ] Invitations et permissions.
- [ ] Historique des actions système.
- [ ] Limite de 4 membres pour les petits groupes.

### Feed

- [ ] Publication texte, photo, vidéo et vocal.
- [ ] Réactions uniques.
- [ ] Commentaires et réponses.
- [ ] Suppression et signalement.
- [ ] Pagination et cache.
- [ ] État d’échec et retry.

### Navigation

- [ ] Bouton retour Android.
- [ ] Deep links.
- [ ] Restauration de l’état.
- [ ] Badges non lus.
- [ ] Gestion clavier et visual viewport.

## P2 — Après stabilité du cœur

- [ ] Appels audio WebRTC.
- [ ] Appels vidéo WebRTC.
- [ ] TURN et reconnexion.
- [ ] Appel entrant et notifications CallKit/ConnectionService.
- [ ] Historique d’appels.
- [ ] Messages épinglés et favoris.
- [ ] Traduction et transcription.
- [ ] Suggestions de mise en relation.

## Performance

- [ ] Ouverture à froid mesurée sur Android milieu de gamme.
- [ ] Conversation de 10 000 messages virtualisée.
- [ ] Feed de 1 000 publications paginé.
- [ ] Map de 2 000 profils clusterisée sans blocage UI.
- [ ] 60 FPS cible sur les interactions essentielles.
- [ ] Animations suspendues hors écran.
- [ ] Images lazy-loaded et mises en cache.

## Résilience

Scénarios obligatoires :

- [ ] Mode avion pendant l’envoi.
- [ ] Réseau très lent.
- [ ] App tuée pendant upload.
- [ ] Même compte sur plusieurs appareils.
- [ ] Message envoyé deux fois par le client.
- [ ] Session révoquée pendant une conversation.
- [ ] Suppression d’un groupe pendant qu’il est ouvert.
- [ ] Modification simultanée du profil depuis le web et le mobile.
- [ ] Token push invalide.
- [ ] Backend realtime indisponible.

## Observabilité et exploitation

- [ ] Crash reporting actif.
- [ ] Alertes sur erreurs API et realtime.
- [ ] Mesure P50/P95 de latence d’envoi.
- [ ] Mesure du taux d’échec push.
- [ ] Dashboard uploads et stockage.
- [ ] Procédure incident.
- [ ] Sauvegarde et restauration testées.
- [ ] Politique de rétention définie.

## Gate App Store / Play Store

- [ ] Politique de confidentialité accessible.
- [ ] Suppression de compte dans l’app.
- [ ] Justification des permissions.
- [ ] Captures et textes store validés.
- [ ] Build signé production.
- [ ] Tests sur appareils physiques iOS et Android.
- [ ] TestFlight et piste interne Play Store validés.
- [ ] Rollback disponible.

## Définition du Go production

Le Go est autorisé uniquement si :

1. tous les P0 sont cochés ;
2. aucun incident sécurité critique n’est ouvert ;
3. les tests de charge et de résilience passent ;
4. le crash-free rate de la bêta est supérieur à 99,5 % ;
5. aucun parcours principal ne dépend du prototype HTML ;
6. une procédure de rollback et de support est opérationnelle.
