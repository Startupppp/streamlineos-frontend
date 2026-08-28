# S6 — Async safety, security, observability and cleanup

Read `PROTOCOL.md`, the PRD and tickets 22, 37, 39, 40 and 41.

## Opening decisions to include

- Confirm security/compliance test environment and whether destructive GDPR purge flows may run against disposable data.
- Confirm alert destination credentials and whether test alerts may be emitted.
- Confirm CI environment variables available for OpenAPI generation.
- Ask the protocol's commit and migration questions.

## Exclusive territory

- Shared outbox/after-commit infrastructure, security/compliance verification, audit/observability scripts, alerting/runbooks, OpenAPI generation/CI and dead-code proof tooling.
- Do not edit domain implementations owned by S1-S5; request domain changes through `CROSS-SESSION.md`.

Ticket 22 starts immediately in coordination with S2. Ticket 39 follows actor migrations 07-10. Ticket 40 follows durable-domain tickets 20 and 22-25 plus 38. Ticket 41 follows 26 and 28. Ticket 37 follows frontend decompositions 30-33.
