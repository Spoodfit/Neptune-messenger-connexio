# Attestation backend Connexio avant build natif

## Objectif

Une compilation réussie ne prouve pas que le backend sait faire fonctionner Connexio. Les workflows `release-candidate` et `production` exécutent donc un contrôle réseau **avant** tout appel payant à EAS.

Commande identique en local ou en CI :

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.neptunebusiness.com/api \
EXPO_PUBLIC_REALTIME_URL=https://api.neptunebusiness.com \
npm run smoke:production
```

Le contrôle échoue si l’attestation est absente, ancienne, incomplète, si une dépendance critique est bloquée ou si une route sensible accepte un visiteur non authentifié.

## Route à ajouter au backend Neptune

```http
GET /api/v1/connexio/readiness
Accept: application/json
```

Réponse HTTP `200` attendue :

```json
{
  "status": "ready",
  "contract": "connexio-v1",
  "environment": "production",
  "version": "SHA_GIT_DU_BACKEND_DEPLOYE",
  "checked_at": "2026-08-24T20:00:00.000Z",
  "capabilities": {
    "authentication": true,
    "member_directory": true,
    "messaging": true,
    "private_media": true,
    "realtime": true,
    "calls": true,
    "push_notifications": true,
    "moderation": true,
    "coworking": true,
    "events": true,
    "account_deletion": true,
    "blocked_members": true
  },
  "dependencies": {
    "postgres": "ready",
    "redis": "ready",
    "object_storage": "ready",
    "turn": "ready",
    "push": "ready"
  },
  "controls": {
    "authorization_matrix": true,
    "idempotency": true,
    "rate_limiting": true,
    "migrations": true,
    "rollback": true,
    "backup_restore": true
  }
}
```

`checked_at` doit être calculé au moment de la requête et dater de moins de dix minutes. `version` doit contenir le SHA ou un identifiant immuable du déploiement. La route ne doit jamais renvoyer `ready` à partir d’une simple variable d’environnement : chaque valeur doit provenir d’un contrôle de santé ou d’un artefact de test du déploiement courant.

## Signification des preuves

| Champ | Condition pour déclarer `ready` |
|---|---|
| `postgres` | connexion en lecture/écriture et migrations attendues appliquées |
| `redis` | lecture/écriture, TTL et adaptateur Socket.IO fonctionnels |
| `object_storage` | upload privé, URL temporaire, contrôle MIME et antivirus disponibles |
| `turn` | allocation TURN avec credentials temporaires réussie |
| `push` | credentials Expo/APNs/FCM chargés et envoi de test serveur accepté |
| `authorization_matrix` | tests d’accès par rôle et appartenance exécutés sur le SHA déployé |
| `idempotency` | rejouer la même clé ne crée ni second message, ni second vote |
| `migrations` | schéma Prisma de la release appliqué sans dérive |
| `rollback` | procédure et artefact de retour arrière disponibles pour cette version |
| `backup_restore` | dernière restauration vérifiée avec date et résultat conservés côté exploitation |

## Contrôles anonymes automatiques

Après l’attestation, le préflight appelle sans cookie ni bearer token :

- `GET /api/v1/auth/me` ;
- `GET /api/v1/conversations` ;
- `POST /api/v1/realtime/ticket` ;
- `GET /api/v1/coworking` ;
- `POST /api/v1/devices/push-tokens`.

Ces routes doivent répondre `401` ou `403`. Un `429` reste accepté si la protection anti-abus s’applique avant l’authentification. Une erreur de validation `400`/`422` ne prouve pas le contrôle d’accès ; toute autre réponse bloque le build.

## Ce que cette attestation ne remplace pas

Elle ne remplace pas la recette sur appareils : deux comptes réels, notifications application fermée, appels Wi-Fi/4G avec TURN, permissions caméra/micro refusées, reconnexion, VoiceOver/TalkBack, tentative d’accès aux médias d’un autre groupe, suppression et blocage. Ces preuves restent obligatoires avant soumission Store.
