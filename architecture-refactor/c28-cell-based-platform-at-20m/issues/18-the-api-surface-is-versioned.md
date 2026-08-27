# 18 — The API surface is versioned and its contract is generated in CI

**What to build:** A deployed web or mobile client keeps working across a backend release, and a breaking change is a declared new version rather than a discovery. The contract is generated from the code on every build, so drift between what the server accepts and what the client sends is a failing check instead of a silent no-op.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** PRD mistake #21 — *"Development-only OpenAPI and a base frontend query key without organization identity make compatibility and cross-org cache safety depend on convention."* Ticket 17 is the cache half; this is the contract half. Root `CLAUDE.md` §5 already requires client types to mirror the backend Zod schema exactly *because* drift silently strips fields into no-ops — this ticket makes that requirement checkable rather than reviewable. The error envelope is already standardised (`lib/api-client.ts` parses `message` as string or string array, `{ success, data }`, `204` → `undefined`); the version and the generation are what is missing.

## Acceptance criteria

- [ ] OpenAPI is generated in CI from the running Nest metadata and Zod schemas, and the build fails if the committed artifact is stale.
- [ ] The API declares a version; a breaking change ships under a new one, and compatibility adapters are removed only on consumer evidence rather than on a schedule.
- [ ] Retryable commands accept an idempotency key and honour it, so a client retry after a timeout does not double-charge, double-post or double-invite.
- [ ] Error envelopes, cursor/filter/sort contracts and deprecation dates are part of the generated artifact, not documented separately.
- [ ] A check compares the frontend's request/response types against the generated contract and fails on drift — the review-time rule becomes a build-time one.
- [ ] Webhooks and outbound events are versioned independently of the REST surface, because their consumers upgrade on a different clock.

## Todo

- [ ] Generate before versioning. A version applied to an ungenerated surface documents nothing.
- [ ] Start the drift check on one module rather than 3,500 handlers; a check that fails on everything on its first run gets disabled.
- [ ] Idempotency keys belong on the commands that can be safely retried; enumerate those rather than adding the parameter everywhere.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
