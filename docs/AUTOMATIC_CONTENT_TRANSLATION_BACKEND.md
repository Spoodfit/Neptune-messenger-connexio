# Connexio — contrat backend de traduction automatique du contenu (V18)

## Objectif

Tout contenu textuel produit par un utilisateur doit être présenté dans la langue active du lecteur, sans modifier le contenu original stocké. Le mobile envoie déjà `Accept-Language` sur les requêtes authentifiées : le backend Connexio utilise cette valeur comme langue cible.

Le fournisseur de traduction, ses clés API, la détection de langue, le cache et les retries restent exclusivement côté serveur.

## Règles non négociables

1. Le texte original est canonique et immuable.
2. Une traduction est un dérivé d'affichage ; elle ne remplace jamais `body`, `question`, `label`, etc.
3. Une traduction absente, `pending` ou `failed` ne bloque jamais l'API : renvoyer immédiatement l'original et l'état de traduction.
4. Ne jamais traduire les noms/prénoms, entreprises, villes/lieux, URLs, emails, numéros de téléphone, identifiants, mentions `@`, hashtags, nombres ou emojis.
5. La traduction doit préserver les URLs, mentions, sauts de ligne et marqueurs structurants.
6. Le cache doit être indexé au minimum par `(content_id, revision, field, target_language, model_version)`.
7. Une modification du contenu invalide les traductions de l'ancienne révision.

## Forme commune

```json
{
  "source_language": "fr",
  "target_language": "en",
  "status": "ready",
  "generated_at": "2026-08-15T20:00:00.000Z",
  "fields": {
    "body": "Translated content"
  }
}
```

Le mobile accepte `snake_case` et `camelCase`. Les champs connus peuvent aussi être renvoyés directement (`body`, `question`, `title`, `description`, `last_message`, `pinned_message`, `transcript`) ; `fields` est cependant la forme recommandée pour l'extensibilité.

## Messages

Réponse recommandée :

```json
{
  "id": "m-123",
  "body": "Qui sera présent au prochain afterwork ?",
  "source_language": "fr",
  "translation": {
    "source_language": "fr",
    "target_language": "en",
    "status": "ready",
    "fields": {
      "body": "Who will be at the next afterwork?"
    }
  }
}
```

## Réponse citée

```json
{
  "reply_preview": {
    "message_id": "m-100",
    "sender_name": "Léa",
    "body": "Je confirme le rendez-vous.",
    "source_language": "fr",
    "translation": {
      "source_language": "fr",
      "target_language": "en",
      "status": "ready",
      "fields": {
        "body": "I confirm the appointment."
      }
    }
  }
}
```

## Sondages et votes

La question et chaque option sont des contenus traduisibles. Les votes, compteurs, IDs de votants et noms des votants ne le sont pas.

```json
{
  "poll": {
    "id": "poll-1",
    "question": "Quel créneau préférez-vous ?",
    "source_language": "fr",
    "options": [
      { "id": "thursday", "label": "Jeudi à 18 h 30", "vote_count": 12 },
      { "id": "friday", "label": "Vendredi à 19 h", "vote_count": 9 }
    ],
    "translation": {
      "source_language": "fr",
      "target_language": "en",
      "status": "ready",
      "question": "Which time slot do you prefer?",
      "options": {
        "thursday": "Thursday at 6:30 p.m.",
        "friday": "Friday at 7 p.m."
      }
    }
  }
}
```

Les traductions d'options doivent être indexées par `option.id` afin qu'un changement d'ordre n'associe jamais une traduction au mauvais choix.

## Alertes de vote d'évènement

Le `title` peut être traduit. `club_name`, `city`, `web_url`, `pending_count` et les dates restent des données structurées.

```json
{
  "event_vote_alert": {
    "id": "vote-1",
    "title": "2 évènements attendent votre vote",
    "club_name": "Carcassonne",
    "pending_count": 2,
    "translation": {
      "source_language": "fr",
      "target_language": "en",
      "status": "ready",
      "fields": {
        "title": "2 events are waiting for your vote"
      }
    }
  }
}
```

## Conversations

Les champs traduisibles sont `description`, `lastMessage`/`last_message` et `pinnedMessage`/`pinned_message`. Le nom d'une personne, d'un groupe ou d'un club ne doit pas être traduit automatiquement.

```json
{
  "id": "carcassonne",
  "name": "Carcassonne",
  "last_message": "Besoin d'un photographe pour mardi.",
  "translation": {
    "source_language": "fr",
    "target_language": "en",
    "status": "ready",
    "fields": {
      "lastMessage": "Need a photographer for Tuesday."
    }
  }
}
```

## Temps forts

`HighlightPost.body` et chaque `HighlightComment.body` sont traduisibles indépendamment. Le backend doit renvoyer une traduction au niveau de l'objet concerné.

```json
{
  "id": "post-1",
  "body": "Première session studio validée.",
  "source_language": "fr",
  "translation": {
    "source_language": "fr",
    "target_language": "en",
    "status": "ready",
    "fields": {
      "body": "First studio session approved."
    }
  },
  "comments": [
    {
      "id": "comment-1",
      "body": "Le rendu est vraiment premium.",
      "source_language": "fr",
      "translation": {
        "source_language": "fr",
        "target_language": "en",
        "status": "ready",
        "fields": {
          "body": "The result really looks premium."
        }
      }
    }
  ]
}
```

## Transcriptions audio

Une transcription est d'abord produite dans la langue source. Sa traduction est séparée :

```json
{
  "transcript": "Je vous confirme la date demain.",
  "transcript_status": "ready",
  "transcript_translation": {
    "source_language": "fr",
    "target_language": "en",
    "status": "ready",
    "fields": {
      "transcript": "I will confirm the date tomorrow."
    }
  }
}
```

## Comportement asynchrone recommandé

- à la création/modification : détecter la langue source et enregistrer l'original immédiatement ;
- mettre en file les traductions nécessaires ;
- lors d'une lecture avec `Accept-Language`, chercher le cache pour la langue cible ;
- si disponible : `status=ready` + champs traduits ;
- sinon : `status=pending` sans bloquer la réponse ;
- pousser ensuite une mise à jour realtime du contenu traduit ou laisser le prochain refresh récupérer la traduction ;
- après échec définitif : `status=failed`, l'app garde l'original.

## Langues

Conserver la liste de langues déjà supportée par le moteur de traduction des messages. L'interface V18 expose actuellement FR, EN, ES, DE, IT et PT ; le contrat de contenu reste compatible avec les autres langues prises en charge côté serveur.
