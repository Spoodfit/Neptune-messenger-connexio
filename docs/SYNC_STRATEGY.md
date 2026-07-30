# Stratégie de synchronisation Neptune

## Règle absolue

Un message envoyé depuis Neptune Business Point App doit apparaître dans Connexio, et inversement, sans copie manuelle ni base séparée.

## Modèle recommandé

### Identifiants partagés

Conserver les mêmes identifiants :

- `user_id`
- `club_id`
- `conversation_id`
- `message_id`

Ne jamais recréer un identifiant mobile indépendant pour un objet déjà existant.

### Écriture

1. le client génère un `client_message_id` ;
2. il affiche immédiatement le message en état `sending` ;
3. il l’envoie au backend ;
4. le backend déduplique ;
5. il renvoie l’objet définitif ;
6. le client remplace l’état local ;
7. le backend diffuse l’événement à tous les autres clients.

### Lecture

Le client envoie le dernier message réellement visible. Le serveur calcule le nombre de non-lus, plutôt que de faire confiance à un compteur mobile.

### Hors ligne

Pour la première version :

- cache local de la liste des conversations ;
- file d’attente des messages non envoyés ;
- reprise automatique au retour du réseau ;
- aucune suppression définitive hors ligne.

### Conflits

- les messages ne sont pas modifiables librement après une fenêtre définie ;
- les changements de rôle et d’accès du serveur gagnent toujours ;
- une conversation retirée doit disparaître du client à la prochaine synchronisation ;
- un message refusé doit afficher un état d’échec et proposer une nouvelle tentative.

## Migration depuis WhatsApp

Ne pas essayer de synchroniser WhatsApp et Connexio en continu. Ce serait fragile, juridiquement discutable et dépendant d’une plateforme tierce.

Plan recommandé :

1. lancer Connexio sur un groupe pilote ;
2. publier les nouvelles annonces dans les deux canaux pendant une courte période ;
3. afficher dans WhatsApp un lien profond vers Connexio ;
4. fermer progressivement les discussions WhatsApp ;
5. conserver WhatsApp uniquement comme canal d’urgence temporaire ;
6. annoncer une date de fin claire.

L’historique WhatsApp ne doit être importé qu’avec une base légale, une information claire et une procédure contrôlée. Par défaut, démarrer avec un historique neuf.
