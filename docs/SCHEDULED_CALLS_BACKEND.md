# Connexio — contrat backend des appels programmés

## Objectif

Le frontend Connexio permet de préparer un rendez-vous d’appel avec :

- un membre Neptune principal ;
- un objet obligatoire ;
- un mode `audio` ou `video` ;
- une date/heure ISO 8601 ;
- zéro ou plusieurs invités externes explicitement sélectionnés par l’organisateur ;
- un cycle `pending → accepted|declined|cancelled → completed`.

Le mode standalone conserve ce rendez-vous localement pour la recette. **En production, le backend est l’autorité** : l’application ne doit jamais simuler une acceptation ou un déclenchement distant.

## REST

### Créer une demande

`POST /v1/call-appointments`

```json
{
  "member_id": "user_456",
  "conversation_id": "conv_123",
  "mode": "video",
  "subject": "Valider le partenariat avant la conférence",
  "scheduled_at": "2026-08-18T14:00:00+02:00",
  "guest_contacts": [
    {
      "id": "device-contact-local-id",
      "displayName": "Camille Martin",
      "phone": "+33600000000",
      "email": "camille@example.com"
    }
  ]
}
```

Réponse recommandée :

```json
{
  "id": "appointment_123",
  "member_id": "user_456",
  "conversation_id": "conv_123",
  "mode": "video",
  "subject": "Valider le partenariat avant la conférence",
  "scheduled_at": "2026-08-18T12:00:00Z",
  "status": "pending",
  "requested_by_current_user": true,
  "created_at": "2026-08-14T13:00:00Z",
  "updated_at": "2026-08-14T13:00:00Z"
}
```

### Répondre

- `POST /v1/call-appointments/{id}/accept`
- `POST /v1/call-appointments/{id}/decline`

Le backend doit vérifier que l’utilisateur authentifié est bien un participant autorisé à répondre.

### Annuler

`POST /v1/call-appointments/{id}/cancel`

Seul l’organisateur ou un rôle explicitement autorisé peut annuler.

## Validations obligatoires

1. `subject` obligatoire, trim, minimum 3 caractères, maximum recommandé 160.
2. `scheduled_at` doit être dans le futur.
3. Stockage UTC côté serveur ; conserver le fuseau/offset d’origine si nécessaire pour l’affichage et les changements d’heure.
4. `member_id` doit désigner un membre visible et joignable selon les règles Connexio.
5. `conversation_id` doit appartenir aux participants concernés.
6. Une réponse doit être idempotente.
7. Une demande annulée/refusée/terminée ne peut plus déclencher d’appel.
8. Les invités externes ne doivent être utilisés que pour le rendez-vous demandé ; ne pas importer ces coordonnées dans un carnet global Connexio sans consentement séparé.

## Notifications et rappels

Le client standalone peut programmer des rappels locaux. En production, le backend doit également planifier les notifications distantes afin que la demande et les rappels fonctionnent même si l’application n’a pas été ouverte récemment.

Rappels recommandés, uniquement lorsqu’ils ont encore du sens :

- J-1 ;
- H-1 ;
- 10 minutes avant ;
- heure du rendez-vous.

Toute modification de date/heure doit invalider les anciens rappels avant d’en programmer de nouveaux.

## Déclenchement automatique de l’appel

À l’heure prévue, **le backend doit être l’autorité de déclenchement** :

1. vérifier que le rendez-vous est toujours `accepted` ;
2. créer/initialiser une vraie session d’appel Connexio avec le même `subject` ;
3. émettre une notification d’appel entrant haute priorité aux participants ;
4. inclure `appointment_id`, `call_id`, `conversation_id`, `mode` et `subject` ;
5. appliquer les mêmes règles d’authentification et d’appartenance qu’un appel immédiat ;
6. expirer proprement l’appel si personne ne répond ;
7. marquer le rendez-vous `completed` ou conserver un statut de non-réponse selon le modèle métier retenu.

Le client ne doit pas « appeler automatiquement » une autre personne uniquement à partir de son horloge locale : cela créerait des divergences de fuseau, de réseau et d’état du rendez-vous.

## Événements temps réel recommandés

- `call-appointment:created`
- `call-appointment:updated`
- `call-appointment:accepted`
- `call-appointment:declined`
- `call-appointment:cancelled`
- `call-appointment:due`

Chaque événement doit être limité aux utilisateurs autorisés.

## Sécurité / confidentialité

- authentification obligatoire ;
- vérification serveur de chaque participant ;
- chiffrement TLS/WSS ;
- aucune coordonnée de contact dans les logs applicatifs ;
- rate-limit sur la création/invitation ;
- prévention des invitations répétées/abusives ;
- nettoyage des rappels lors d’une annulation ;
- politique de conservation explicite pour les rendez-vous terminés et les invités externes ;
- App Privacy / Data Safety et politique de confidentialité alignées sur le traitement réel avant publication.

## Critères d’acceptation backend

- FR et fuseaux différents testés ;
- changement d’heure d’été/hiver testé ;
- double acceptation idempotente ;
- refus/annulation empêche tout appel à échéance ;
- modification du rendez-vous remplace les rappels ;
- le sujet affiché au moment de l’appel est strictement celui du rendez-vous accepté ;
- notification à l’heure prévue sur Android et iOS ;
- aucune sonnerie distante si le rendez-vous n’est pas accepté ;
- un invité externe n’est jamais ajouté silencieusement à l’annuaire Neptune.
