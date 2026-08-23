# Platform phase four — the carried-forward items

Five tickets from the "carried forward" section of phase three, each re-measured against the tree before being worked.

## Done

- **01 — a reaction cannot be lost.** `toggleReaction` read the reactions object, computed the next value in JavaScript and wrote it back whole, so two people reacting in the same moment erased one another. The read now takes a row lock for the rest of the request transaction. Reactions stay `jsonb` — they are always read with their message, never queried alone, and bounded, so §3's warning does not apply. The toggle rule (one reaction per person; a second emoji **replaces**) moved into a pure function with eight tests, because it was previously only discoverable by reading the code.
- **02 — invite tokens are not readable at rest.** Two columns, each with one job: a hash carries the indexed lookup, ciphertext carries the re-display an admin needs. Hash-only would have killed every circulating link, which is why this is not hash-only like organization invitations. Migration `0459` written and journaled, **not applied**.
- **03 — the streaming handler opts out.** `pipeTextStreamToResponse` returns before the stream ends, so the request transaction committed under still-running tools. Verified first that the tools and `onFinish` already open their own transactions — on a handler that did not, the decorator would break the work rather than fix it.

## Closed as non-defects, after re-measuring

- **The Ably capability cap is not silent.** It logs the truncation with org, user, total and granted. A bounded capability list is deliberate.
- **The push fan-out is not a dangerous N+1.** Sends are concurrent (`Promise.allSettled`) and awaited inside the send path rather than fired after commit, so it never runs on a dead tenant context.

## Put up as decisions rather than taken

- **04 — team scope's fast path is unreachable.** Of **56** `applyScope` call sites, **zero** supply a `teamColumn`, so the branch is guarded by a condition no caller can make true and every team-scoped list takes the correlated subquery. A test pins this. The three ways out include removing a capability the roles screen currently offers — a product decision, not a cleanup.
- **05 — partitioning `chat_messages` and the twelve `serial` primary keys.** §3 requires a demonstrated row count before partitioning and says to record it in the migration; source cannot supply that number. The `serial` → identity migration should come first, since partitioning rewrites primary keys anyway.

## Verified state — 2026-08-23

- **Backend: 559 suites / 4,778 tests, zero failures.** `tsc --noEmit` clean, `pnpm lint` 0 errors, `madge --circular` acyclic.
- Nothing was verified by running the application.

## What went wrong here, worth keeping

A run that "passed" had `ENCRYPTION_KEY` set on its command line. Without it, the invite-token change broke my own new spec **and** a pre-existing service spec — four failures, invisible until the full suite ran. Setting an environment variable to make a run pass and then reporting that run is the mistake, not the missing key. Fixed in the global jest setup, where the schema's own requirement says it belonged.
