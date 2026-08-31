# Traduction automatique des messages — contrat backend

## Objectif

CONNEXIO affiche automatiquement un message reçu dans la langue de lecture du destinataire, tout en conservant le texte original comme donnée canonique et toujours accessible.

Le mobile ne doit contenir aucune clé de fournisseur de traduction. Toute détection, traduction, facturation fournisseur et mise en cache est réalisée côté backend Neptune.

## Langue cible

Chaque requête authentifiée de l’application envoie `Accept-Language` à partir de la locale du téléphone, normalisée vers une langue supportée. Une préférence explicite enregistrée dans le compte Neptune peut primer sur cette valeur.

Langues reconnues par le client : `fr`, `en`, `es`, `de`, `it`, `pt`, `nl`, `pl`, `ro`, `sv`, `da`, `no`, `tr`, `ru`, `ar`, `hi`, `zh`, `ja`, `ko`.

## Payload message attendu

Le champ `body` reste toujours le texte original écrit par l’auteur.

```json
{
  "id": "message_123",
  "body": "Who will be at the next afterwork?",
  "source_language": "en",
  "translation": {
    "source_language": "en",
    "target_language": "fr",
    "body": "Qui sera présent au prochain afterwork ?",
    "status": "ready",
    "generated_at": "2026-08-13T12:00:00.000Z"
  }
}
```

`translation.status` accepte `ready`, `pending` ou `failed`. En absence de traduction prête, le client affiche immédiatement l’original et ne bloque jamais la conversation.

Le même schéma doit être utilisé dans les listes de messages, les réponses temps réel et toute resynchronisation.

## Règles de génération

1. Détecter la langue source une seule fois par version du message.
2. Si langue source = langue cible, ne pas appeler le fournisseur de traduction.
3. Ne jamais remplacer `body` par le texte traduit en base.
4. Conserver les URLs, emails, numéros de téléphone, mentions `@`, hashtags, nombres et emojis autant que possible.
5. Après modification d’un message, invalider les traductions de l’ancienne version.
6. Après suppression d’un message, appliquer les mêmes règles de rétention aux traductions associées.

## Cache et maîtrise des coûts

Clé de cache recommandée : `message_id + message_revision/hash + target_language + translation_model_version`.

Une traduction générée pour une langue doit être réutilisée pour tous les lecteurs de cette langue. Ne pas retraduire le même message pour chaque utilisateur.

Prévoir déduplication des requêtes concurrentes, timeout fournisseur, circuit breaker, métriques de coût et taux de cache, quotas, alertes budgétaires et retries bornés hors du chemin critique d’envoi.

## Temps réel

L’envoi du message original ne doit jamais attendre un fournisseur de traduction.

Flux recommandé : persister et diffuser l’original immédiatement, détecter sa langue, récupérer ou générer la traduction en cache, puis diffuser la version enrichie ou l’inclure au prochain événement de synchronisation.

## Sécurité et confidentialité

Les secrets fournisseur restent uniquement côté serveur. Minimiser les données envoyées au fournisseur, ne pas journaliser le contenu intégral des messages, protéger les traductions avec les mêmes ACL que le message source et vérifier les exigences de traitement et de conservation du prestataire choisi.

## Critères d’acceptation backend

- un message étranger peut être lu automatiquement dans la langue cible ;
- l’original reste inchangé et accessible ;
- une panne du service de traduction ne bloque ni l’envoi ni la lecture ;
- les traductions sont réutilisées par langue ;
- une modification du message invalide l’ancienne traduction ;
- REST et temps réel renvoient le même contrat ;
- aucune clé fournisseur n’est présente dans l’application mobile.
