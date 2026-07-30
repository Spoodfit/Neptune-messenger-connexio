# Connexio — Modèle de données initial

## Utilisateurs

### `profiles`

| Champ | Type | Règle |
|---|---|---|
| `id` | uuid | Identifiant partagé avec Neptune Business |
| `first_name` | text | Synchronisé avec l’application web |
| `last_name` | text | Synchronisé avec l’application web |
| `avatar_url` | text | Fichier privé signé ou URL contrôlée |
| `phone_e164` | text | Non exposé sans autorisation |
| `company_name` | text | Profil Neptune |
| `city_id` | uuid | Club principal |
| `membership_role` | enum | visionnaire, amiral, capitaine, legende, moussaillon, triton |
| `presence_status` | enum | online, away, busy, offline |
| `updated_at` | timestamptz | Gestion des conflits |

Le client n’a jamais le droit de modifier directement `membership_role`.

## Conversations

### `conversations`

| Champ | Type | Règle |
|---|---|---|
| `id` | uuid | |
| `type` | enum | direct, small_group, official_group |
| `name` | text nullable | Obligatoire pour un groupe |
| `avatar_url` | text nullable | |
| `official_key` | text nullable unique | Ex. club_carcassonne, visionnaires |
| `created_by` | uuid | |
| `max_members` | integer nullable | 4 pour les petits groupes |
| `created_at` | timestamptz | |
| `archived_at` | timestamptz nullable | |

### `conversation_members`

| Champ | Type | Règle |
|---|---|---|
| `conversation_id` | uuid | |
| `profile_id` | uuid | |
| `member_role` | enum | owner, admin, member |
| `joined_at` | timestamptz | |
| `left_at` | timestamptz nullable | Quitter sans effacer l’historique serveur |
| `last_read_message_id` | uuid nullable | Accusé de lecture |
| `muted_until` | timestamptz nullable | |
| `is_archived` | boolean | |

Contrainte unique : `(conversation_id, profile_id)`.

## Messages

### `messages`

| Champ | Type | Règle |
|---|---|---|
| `id` | uuid | Identifiant serveur |
| `client_id` | uuid | Idempotence côté client |
| `conversation_id` | uuid | |
| `sender_id` | uuid | |
| `reply_to_message_id` | uuid nullable | Citation/réponse |
| `type` | enum | text, image, video, audio, file, poll, location, system |
| `body` | text nullable | |
| `metadata` | jsonb | Durée, dimensions, aperçu, etc. |
| `created_at` | timestamptz | |
| `edited_at` | timestamptz nullable | |
| `deleted_for_all_at` | timestamptz nullable | |

Contrainte unique : `(sender_id, client_id)`.

### `message_receipts`

| Champ | Type | Règle |
|---|---|---|
| `message_id` | uuid | |
| `profile_id` | uuid | |
| `delivered_at` | timestamptz nullable | |
| `read_at` | timestamptz nullable | |

### `message_reactions`

| Champ | Type | Règle |
|---|---|---|
| `message_id` | uuid | |
| `profile_id` | uuid | |
| `reaction` | text | Une réaction active par membre et message |
| `created_at` | timestamptz | |

Contrainte unique : `(message_id, profile_id)`.

### `message_deletions`

Permet la suppression uniquement pour soi.

| Champ | Type |
|---|---|
| `message_id` | uuid |
| `profile_id` | uuid |
| `deleted_at` | timestamptz |

## Pièces jointes

### `attachments`

| Champ | Type | Règle |
|---|---|---|
| `id` | uuid | |
| `message_id` | uuid nullable | |
| `post_id` | uuid nullable | |
| `owner_id` | uuid | |
| `storage_path` | text | Bucket privé |
| `mime_type` | text | Validé côté serveur |
| `size_bytes` | bigint | Limité |
| `duration_ms` | integer nullable | Audio/vidéo |
| `width` | integer nullable | |
| `height` | integer nullable | |
| `scan_status` | enum | pending, clean, rejected |
| `created_at` | timestamptz | |

## Sondages

### `polls`

| Champ | Type |
|---|---|
| `id` | uuid |
| `message_id` | uuid unique |
| `question` | text |
| `multiple_choice` | boolean |
| `closes_at` | timestamptz nullable |

### `poll_options`

| Champ | Type |
|---|---|
| `id` | uuid |
| `poll_id` | uuid |
| `label` | text |
| `sort_order` | integer |

### `poll_votes`

| Champ | Type |
|---|---|
| `poll_id` | uuid |
| `option_id` | uuid |
| `profile_id` | uuid |
| `created_at` | timestamptz |

## Feed / Temps forts

### `posts`

| Champ | Type |
|---|---|
| `id` | uuid |
| `author_id` | uuid |
| `type` | enum: text, image, video, audio |
| `category` | enum: reussite, coulisses, defi, besoin |
| `body` | text nullable |
| `city_id` | uuid nullable |
| `created_at` | timestamptz |
| `edited_at` | timestamptz nullable |
| `deleted_at` | timestamptz nullable |

### `post_reactions`

Contrainte unique : `(post_id, profile_id)` pour empêcher le cumul.

### `post_comments`

| Champ | Type |
|---|---|
| `id` | uuid |
| `post_id` | uuid |
| `author_id` | uuid |
| `parent_comment_id` | uuid nullable |
| `body` | text |
| `created_at` | timestamptz |
| `edited_at` | timestamptz nullable |
| `deleted_at` | timestamptz nullable |

### `comment_reactions`

Contrainte unique : `(comment_id, profile_id)`.

## Carte et confidentialité

### `location_shares`

| Champ | Type | Règle |
|---|---|---|
| `profile_id` | uuid | |
| `coarse_lat` | numeric | Coordonnée obfusquée côté serveur |
| `coarse_lng` | numeric | Coordonnée obfusquée côté serveur |
| `precision_meters` | integer | Jamais une position exacte par défaut |
| `visibility` | enum | nobody, contacts, club, all_members |
| `expires_at` | timestamptz | Expiration obligatoire |
| `updated_at` | timestamptz | |

### `post_map_visibility`

Associe une publication récente à une position approximative sans exposer la localisation brute de l’utilisateur.

## Notifications

### `device_tokens`

| Champ | Type |
|---|---|
| `id` | uuid |
| `profile_id` | uuid |
| `platform` | enum: ios, android |
| `token` | text chiffré |
| `app_version` | text |
| `last_seen_at` | timestamptz |
| `revoked_at` | timestamptz nullable |

### `notification_preferences`

Préférences par conversation et par catégorie : messages, mentions, réactions, appels, groupes officiels.

## Modération

### `blocks`

| Champ | Type |
|---|---|
| `blocker_id` | uuid |
| `blocked_id` | uuid |
| `created_at` | timestamptz |

### `reports`

| Champ | Type |
|---|---|
| `id` | uuid |
| `reporter_id` | uuid |
| `target_type` | enum: profile, message, post, comment |
| `target_id` | uuid |
| `reason` | enum |
| `details` | text nullable |
| `status` | enum: open, reviewing, resolved, rejected |
| `created_at` | timestamptz |

## Événements realtime

```text
message.created
message.updated
message.deleted
message.reaction.changed
message.receipt.delivered
message.receipt.read
conversation.typing
conversation.presence
post.created
post.reaction.changed
comment.created
comment.reaction.changed
profile.updated
role.updated
call.ringing
call.ended
```

Chaque événement comporte :

```text
event_id
occurred_at
actor_id
resource_id
version
payload minimal
```
