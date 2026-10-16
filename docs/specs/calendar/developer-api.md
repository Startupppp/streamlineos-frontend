# Calendar Developer API

## Version and authentication

The stable base path is `/v1/calendar`. Send the tenant credential in `X-API-Key`. Credentials expire within 90 days, are stored as hashes, can be revoked immediately, and are restricted to their selected scopes.

| Scope | Access |
| --- | --- |
| `calendar:availability:read` | Read a current booking rule's available slots. |
| `calendar:bookings:read` | Read minimized booking records. |
| `calendar:bookings:write` | Create a booking through a secure booking session. |
| `calendar:lifecycle:write` | Apply a version-fenced lifecycle transition or cancellation. |
| `calendar:embeds:read` | Read embed policy and allowed-origin configuration. |

Administrators with `calendar:admin:manage` create and revoke credentials through `/calendar/admin/developer/credentials`. The secret is returned once and responses carrying it disable compression. A credential cannot access another tenant because tenant identity comes from the credential record and every resource query includes that tenant.

Credential creation and revocation require an `Idempotency-Key`. Keep the same key and request body when retrying an uncertain create response. A repeated successful create returns `409` because its secret cannot be shown again; it does not issue another credential. Review the credential list and revoke the new credential if its secret was lost before starting a replacement with a new key. A reused key with different input or actor returns `422`.

## Endpoints

### Availability

`GET /v1/calendar/availability`

Required scope: `calendar:availability:read`.

Query fields are `ruleId`, `expectedRuleVersion`, `from`, `to`, `limit`, and optional `cursor`. The version fence returns `409` when the rule changed. Results contain an opaque cursor and at most 100 minimized slots.

### Booking list

`GET /v1/calendar/bookings`

Required scope: `calendar:bookings:read`.

Query fields are `limit` and optional `cursor`. Records omit guest identity, intake answers, provider payloads, tokens, and internal routing evidence.

### Booking creation

`POST /v1/calendar/bookings`

Required scope: `calendar:bookings:write`. `Idempotency-Key` is mandatory.

The body supplies an active `bookingToken`, its secure `sessionToken`, `start`, `expectedRuleVersion`, guest fields, allowed intake values, optional routing context, and consent state. The token must belong to the credential tenant and the rule version is checked before capacity is held. The API acquires a durable hold and confirms it through the same availability, capacity, resource, routing, invitation, and booking commit rules as the public journey. When the booking rule has an active payment policy, this endpoint rejects confirmation; the client must complete the public payment prepare and confirm flow with a captured payment. Reusing a key with the same request replays its response. Reusing it with a different request returns `422`; an in-flight duplicate returns `409`.

### Lifecycle and deletion

`POST /v1/calendar/bookings/{bookingId}/lifecycle`

`DELETE /v1/calendar/bookings/{bookingId}?expectedVersion={version}`

Required scope: `calendar:lifecycle:write`. `Idempotency-Key` is mandatory. Lifecycle writes require `expectedVersion`. Deletion is a versioned cancellation that preserves audit, invitation, provider reconciliation, refund, and webhook history. It does not physically erase the booking record.

### Embed configuration

`GET /v1/calendar/embeds/{ruleId}`

Required scope: `calendar:embeds:read`. The response reports rule and distribution versions, allowed origins, locale, consent policy, and current status. Access-link and session secrets remain on the secure public booking endpoints and are never returned by this read.

## Rate and error behavior

Each credential has a 300 request per minute limit shared across Calendar API routes. Excess returns `429` with a `Retry-After` header in seconds. Missing, expired, revoked, or unknown credentials return `401`. Missing scope returns `403`. A disabled Calendar module returns the module-disabled response. Wrong-tenant identifiers return `404`. Stale versions and concurrent commands return `409`. Invalid bodies and cursors return `400`.

Clients should retry `429` and transient `5xx` responses with bounded exponential backoff and jitter. Retry writes with the original idempotency key and identical request. Never retry a `4xx` response except `409` caused by an in-flight identical command or `429` after its retry window.

## Webhooks

Subscribe through the existing webhook administration endpoints and choose explicit `calendar.booking.*`, `calendar.event.*`, or `calendar.source.changed` events. Calendar payloads contain only lifecycle state, start and end time, occurrence identity, source key and source status. They omit guest identity, intake, payment data, meeting details, and private source fields.

Every delivery body has this envelope:

```json
{
  "id": "delivery UUID",
  "apiVersion": "2026-10-13",
  "event": "calendar.booking.rescheduled",
  "data": {},
  "timestamp": "2026-10-13T10:00:00.000Z"
}
```

Headers include `X-StreamlineOS-Signature`, `X-Webhook-Id`, `X-Webhook-Version`, `X-Webhook-Timestamp`, and `X-Webhook-Event`. The signature is `sha256=` plus the hexadecimal HMAC SHA-256 of the exact raw body using the endpoint secret.

Receivers must compare the HMAC in constant time, require all headers to match the signed body, reject timestamps older than five minutes or over one minute in the future, and atomically claim each delivery ID until its replay window expires. A second claim is a replay and must produce no effect. Store the raw body before parsing so signature verification uses the exact delivered bytes.

Automatic attempts reuse one delivery ID, timestamp, version, and body. Network failures and `5xx` responses retry with bounded backoff. Unsafe destinations and `4xx` responses are terminal. Exhausted deliveries are marked dead letter. Administrators can inspect paginated delivery logs and explicitly replay a failed delivery; an operator replay creates a new signed delivery identity.

## Compatibility and deprecation

The path major version defines request and response compatibility. Fields may be added within `v1`; existing field meaning and enum values are not silently changed. Consumers must ignore unknown response fields and treat unknown event types as unsupported without acknowledging an effect.

Breaking changes ship under a new path major and webhook `apiVersion`. A deprecated version remains available for at least 180 days after a dated deprecation notice. The notice identifies the replacement, behavior changes, final creation date for old credentials or subscriptions, and shutdown date. Security fixes may shorten the window when continued operation would expose tenant data or allow replay.

Credential revocation is immediate. Webhook deletion removes the subscription and its delivery logs under the existing foreign-key cascade. Booking deletion remains a cancellation. Tenant retention and erasure jobs remain authoritative for physical deletion.
