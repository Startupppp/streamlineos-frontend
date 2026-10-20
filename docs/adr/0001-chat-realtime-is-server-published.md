# 0001: Chat realtime is server-published only

Date: 2026-10-20 · Status: accepted

## Decision

- Clients never publish to Ably. Chat channel tokens grant `subscribe` + `presence`; huddle and notification channels grant `subscribe`.
- Every chat event goes through one chat events module (`emit(event)`), validated against a per-kind zod schema.
- Typing uses Ably presence, which Ably binds to the token's `clientId`; display names come from the member list.
- Huddle chat is not built in-app; huddles are Meet/Teams meetings (see `CONTEXT.md`).
- Delivery: publish after commit, outbox as backstop, client refetch on reconnect. Production may run with the outbox worker disabled.

## Why

Client-published events carried client-chosen `userId`/`name`, so any member could spoof typing, huddle chat and huddle lifecycle events. Server-only publishing puts identity, authorization and payload shape in one module.

## Rejected

- Server typing endpoint: an HTTP request per typing burst for no security gain over presence.
- Ably history rewind for catch-up: unused by the client; refetch on reconnect is simpler.
