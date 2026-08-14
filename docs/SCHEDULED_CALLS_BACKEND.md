# Connexio — Scheduled calls backend contract

This contract separates the UX shipped by the Connexio client from the persistence/signalling that must be authoritative on the backend.

## Capability advertisement

A session/bootstrap response may expose:

```json
{
  "scheduled_calls_enabled": true,
  "scheduled_call_guests_enabled": true,
  "scheduled_call_reminders_enabled": true
}
```

The production UI must not expose a successful scheduling state unless `scheduled_calls_enabled` is true and the server acknowledges the mutation. Standalone/mock mode may demonstrate the flow locally.

## Data model

```json
{
  "id": "scheduled_call_123",
  "conversationId": "conversation_123",
  "requesterId": "user_a",
  "participantIds": ["user_a", "user_b"],
  "subject": "Préparer le rendez-vous client ACME",
  "scheduledAt": "2026-08-20T14:00:00+02:00",
  "timezone": "Europe/Paris",
  "status": "pending",
  "reminders": ["PT24H", "PT1H", "PT10M"],
  "createdAt": "2026-08-14T13:30:00+02:00",
  "updatedAt": "2026-08-14T13:30:00+02:00"
}
```

Allowed status values: `pending`, `accepted`, `declined`, `cancelled`, `completed`.

Subject is mandatory, trimmed and length-bounded server-side.

## REST

### Create a request

`POST /v1/scheduled-calls`

```json
{
  "recipient_ids": ["user_b"],
  "subject": "Préparer le rendez-vous client ACME",
  "scheduled_at": "2026-08-20T14:00:00+02:00",
  "timezone": "Europe/Paris",
  "reminders": ["PT24H", "PT1H", "PT10M"]
}
```

### List relevant requests/appointments

`GET /v1/scheduled-calls?scope=upcoming`

`GET /v1/scheduled-calls?scope=pending`

### Accept

`POST /v1/scheduled-calls/{id}/accept`

### Decline

`POST /v1/scheduled-calls/{id}/decline`

### Cancel

`POST /v1/scheduled-calls/{id}/cancel`

All mutations are authenticated and authorised against participant membership. They are idempotent where practical.

## Realtime events

Server to client:

- `scheduled-call:created`
- `scheduled-call:updated`
- `scheduled-call:cancelled`
- `scheduled-call:reminder`
- `scheduled-call:due`

At due time the backend creates/activates a normal Connexio call session using the existing call engine and emits the existing incoming-call signalling to the entitled participants. The scheduled-call object is not a second call engine.

The `scheduled-call:due` event may contain:

```json
{
  "scheduledCallId": "scheduled_call_123",
  "callId": "call_456",
  "conversationId": "conversation_123",
  "subject": "Préparer le rendez-vous client ACME",
  "expiresAt": "2026-08-20T14:05:00+02:00"
}
```

The client must verify call membership through the normal call session endpoint/token before joining.

## Reminder policy

The client may suggest an adaptive reminder set, but the backend is authoritative for delivery. Never schedule reminders that fall before the creation time. Users may mute or adjust reminders for a given appointment if product permissions allow it.

Recommended default:

- lead time >= 24h: 24h, 1h, 10m;
- lead time >= 2h: 1h, 10m;
- lead time >= 20m: 10m;
- shorter lead time: one contextual reminder only when meaningful.

## Guests outside Connexio

External guests are not silently copied from the device address book. The client selects one explicit contact and sends a share/deep-link invitation. If server-managed guest RSVP is later enabled, store only the fields explicitly submitted for that invitation and document retention/privacy rules.

## Security and privacy

- authenticate every request and realtime subscription;
- enforce participant visibility/permissions server-side;
- do not trust requester-supplied user/company/status metadata;
- rate-limit request creation and reminder changes;
- prevent scheduling in the past;
- normalise timezone and date inputs;
- redact subjects from infrastructure logs where logs do not require message content;
- do not upload the complete device address book as part of this feature;
- cancellation and account deletion must invalidate future reminders/call activations as appropriate.
