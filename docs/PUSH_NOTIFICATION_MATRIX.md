# Matrice des notifications Connexio

Cette matrice est la source de vérité partagée entre le client mobile et le backend push.

## Évènements couverts

- messages privés et messages de groupe ;
- mentions, réponses et réactions ;
- appels audio/vidéo entrants, appels manqués et rappels ;
- invitations, demandes d’adhésion, approbations et nomination d’un responsable ;
- annonces, sondages, fermeture et résultats ;
- votes d’évènements, rappels, modifications et annulations ;
- commentaires, réponses et réactions aux Temps forts ;
- automatisations envoyées ;
- avertissements de modération ;
- sécurité du compte.

Les textes sont construits dans `src/services/notifications/notificationCatalog.ts`.
Ils doivent rester humains, chaleureux, professionnels et courts.

## Payload serveur attendu

```json
{
  "to": "<ExpoPushToken>",
  "title": "Océane vous a mentionné",
  "body": "Votre attention est demandée dans Club Carcassonne.",
  "sound": "connexio_mention.mp3",
  "channelId": "mentions",
  "data": {
    "type": "mention",
    "conversationId": "carcassonne"
  }
}
```

Le backend ne doit jamais notifier l’auteur de sa propre action. Les préférences,
la sourdine, les horaires calmes et les blocages sont appliqués côté serveur.

## Limite de validation

Le client, les canaux, le son, les textes et le contrat sont testés dans le dépôt.
La réception distante réelle reste à vérifier avec APNs/FCM, les identifiants EAS
et un backend de préproduction.
