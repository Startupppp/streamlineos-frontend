# Platform phase four — the carried-forward items

Five tickets from the "carried forward" section of phase three, each re-measured against the tree before being worked.

## Done

- **01 — a reaction cannot be lost.** `toggleReaction` read the reactions object, computed the next value in JavaScript and wrote it back whole, so two people reacting in the same moment erased one another. The read now takes a row lock for the rest of the request transaction. Reactions stay `jsonb` — they are always read with their message, never queried alone, and bounded, so §3's warning does not apply. The toggle rule (one reaction per person; a second emoji **replaces**) moved into a pure function with eight tests, because it was previously only discoverable by reading the code.
- **02 — invite tokens are not readable at rest.** Two columns, each with one job: a hash carries the indexed lookup, ciphertext carries the re-display an admin needs. Hash-only would have killed every circulating link, which is why this is not hash-only like organization invitations. Migration `0459` written and journaled, **not applied**.
- **03 — the streaming handler opts out.** `pipeTextStreamToResponse` returns before the stream ends, so the request transaction committed under still-running tools. Verified first that the tools and `onFinish` already open their own transactions — on a handler that did not, the decorator would break the work rather than fix it.

## Closed as non-defects, after re-measuring

- **The Ably capability cap is not silent.** It logs the truncation with org, user, total and granted. A bounded capability list is deliberate.
- **The push fan-out is not a dangerous N+1.** Sends are concurrent (`Promise.allSettled`) and awaited inside the send path rather than fired after commit, so it never runs on a dead tenant context.

## Decided on measurement, once the database was reachable

- **04 — team scope: accepted, not changed.** Measured: **0** role grants and **0** user grants use `scope='team'` (distribution is `all=8291, own=6`), and `org_unit_members` holds **0 rows**. That last number decides it — with no unit memberships the subquery returns nothing, so team scope is behaviourally identical to `own` today. Removing the offer would need deletion semantics added to a sync service that currently only inserts (`onConflictDoNothing`), which is a bigger and riskier change than an unused, non-functional option warrants. The pin test stays; revisit when org units are populated.
- **05 — partitioning refused on the number; serial keys converted.** `chat_messages` holds **2 rows / 136 kB**. §3 says do not partition a table that is not demonstrably large, so this is refused on evidence rather than deferred. The twelve `serial` primary keys **were** converted (migration `0460`), precisely because those tables hold 20 rows between them — the rewrite is free now and would not be later.

## Migrations applied — 2026-08-23

`0455`–`0460` are applied. The catalog was probed first: none of the objects they create existed, so nothing was re-run — `0455` and `0458` create an index and policies **without** `IF NOT EXISTS` and would have failed partway had they already been there.

Verified after applying: the invite-token backfill produces a hash that **matches what the application computes**, so links already in circulation still resolve; and all twelve identity sequences sit above their table's maximum, so no insert can collide.

## Verified state — 2026-08-23

- **Backend: 559 suites / 4,778 tests, zero failures.** `tsc --noEmit` clean, `pnpm lint` 0 errors, `madge --circular` acyclic.
- Nothing was verified by running the application.

## What went wrong here, worth keeping

A run that "passed" had `ENCRYPTION_KEY` set on its command line. Without it, the invite-token change broke my own new spec **and** a pre-existing service spec — four failures, invisible until the full suite ran. Setting an environment variable to make a run pass and then reporting that run is the mistake, not the missing key. Fixed in the global jest setup, where the schema's own requirement says it belonged.
