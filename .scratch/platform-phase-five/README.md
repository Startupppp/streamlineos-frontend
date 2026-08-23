# Platform phase five — ticket set

Fifteen tickets across eight streams, derived from six PRDs in `docs/specs/`, dated 2026-08-23.

Source: the 2026-08-23 architecture review, scoped to org- and module-level RBAC, billing, chat, calendar, notifications, inbox, knowledge base and the assistant. Every claim was re-read at source before ticketing; the ones that did not survive are under **Premises corrected**.

> **Numbered five, not four.** These were written as phase four and a concurrent session had already committed a different phase-four set — the carried-forward chat and scope items. Both sets are real; only the folder collided. Phase four is theirs and is untouched.

## The streams

| Stream | PRD | Tickets | What it delivers |
|---|---|---|---|
| **P — KB retrieval seam** | `2026-08-23-kb-retrieval-seam-prd.md` | P01, P02, P03, P04 | One visibility predicate, crossed by every read of a page. |
| **Q — Access snapshot** | `2026-08-23-access-snapshot-seam-prd.md` | Q01 | One representation of what a person may do. |
| **R — Module availability** | `2026-08-23-module-availability-seam-prd.md` | R01, R02 | One answer to "is this module available", with the reason. |
| **S — Calendar sources** | `2026-08-23-calendar-source-seam-prd.md` | S01, S02 | A module contributes events without the calendar knowing its name. |
| **T — Payment adapter** | `2026-08-23-payment-and-fanout-adapters-prd.md` | T01 | The money path goes through the seam built for it. |
| **U — Chat fan-out** | `2026-08-23-payment-and-fanout-adapters-prd.md` | U01, U02, U03 | One fan-out interface; mentions stop being guesses. |
| **V — Server data** | `2026-08-23-server-data-seam-prd.md` | V01, V02 | The web app can read the API on the server. |

## How to run these in parallel

**One agent per ticket. A ticket owns its files exclusively for the wave it runs in.** Two agents editing one file in the same wave is the failure this structure exists to prevent, and it has happened in this tree.

### Ownership rules

1. **`Owns (exclusive)` in a ticket is the complete list of files that ticket may write.** Need a file outside it? Stop and say so — do not edit it.
2. **Ownership is enforced within a wave, not globally.** A later ticket may own a file an earlier one owned, because they never run at once.
3. **The orchestrator owns the shared files and no ticket may touch them:** `backend/src/app.module.ts`, `PAGES.md`, this README, and the ticket files.
4. **A new module is not wired until it is in `app.module.ts`** — which a ticket may not edit. A ticket that adds a provider **names the one line it could not write**, and the orchestrator writes it. Unwired code compiles green and does not exist at runtime; this is the most repeated failure in this repository's history.
5. **No git from a subagent.** The orchestrator commits between waves with `git commit -m … -- <file paths>`, naming **files, not directories** — the index is shared with other sessions and a bare commit takes all of it. This set was written while another session held staged work.

### Waves

**Wave 1 — eight tickets, fully parallel, zero shared files.**

```
P02   Q01   R01   S01   T01   U01   U03   V01
```

**Wave 2 — five tickets, parallel, each unblocked by wave 1.**

```
P03   R02   S02   U02   V02
```

**Wave 3 — one ticket, alone.**

```
P04
```

P04 relocates the whole `modules/kb/` tree. Every other P ticket edits files it moves.

### Cross-wave file map — check this before starting

| File | Owned by | Wave |
|---|---|---|
| `modules/kb/kb-page-visibility.ts` + 9 page files | P02 | 1 |
| `modules/kb/kb-indexing.service.ts`, `db/schema/kb/**` | P03 | 2 |
| `modules/access/access.types.ts`, `access-snapshot.resolver.ts` | Q01 | 1 |
| `frontend/hooks/api/access.ts`, `lib/rbac/require-permission.ts` | Q01 | 1 |
| `modules/access/entitlements.service.ts`, `authorize.ts`, `common/rbac/module.guard.ts` | R01 | 1 |
| `common/rbac/module-registry.ts` | R02 | 2 |
| `modules/calendar/calendar.module.ts` + new source files | S01 | 1 |
| `modules/calendar/*.loader.ts`, `*-aggregate.service.ts` | S02 | 2 |
| `modules/billing/**` | T01 | 1 |
| `modules/chat/chat-messages.service.ts`, `chat-notifications.service.ts`, `chat.module.ts` | U01 | 1 |
| `modules/chat/chat-channels.service.ts`, `entity-reference/**` | U03 | 1 |
| `frontend/features/chat/message-panel.tsx`, `hooks/api/chat.ts` | U02 | 2 |
| `frontend/lib/api-client.ts`, `server-fetch.ts`, `rbac/get-server-access.ts` | V01 | 1 |
| `frontend/lib/query-keys*`, one route + feature | V02 | 2 |

**Two near-misses worth knowing.** R01 owns `authorize.ts`, which imports from `access.types.ts` — Q01's file. Q01 changes `AccessSnapshot` only and leaves `AuthResult` alone, so they do not collide; if either finds it must touch the other's file, stop. And Q01 owns `frontend/hooks/api/access.ts` while V01 owns `frontend/lib/rbac/get-server-access.ts` — different files, both about access.

### Verification each ticket owes

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — always allowed, and the default proof.
- The specs it touched, run by path.
- **Lint and the full suite only when asked.** Report them *not run*; never as passing.
- Anything provable only by running the app is left **unticked and says so**. Typecheck, build and mocked tests have all passed here while nothing worked.

### Per-wave, by the orchestrator

- Full backend suite in six sequential shards at `--maxWorkers=2` — the whole suite at once gets its workers OS-killed. Grep `^FAIL`; a clean tally hides suites that failed to run.
- `pnpm test:e2e` explicitly for any controller spec touched. `*e2e-spec` files are excluded from the default run.
- `madge --circular` on both repos. Both are at zero and stay there.
- `pnpm exec knip --no-progress`. Never delete a `db/schema` file on knip's word.
- **Run the suite with a clean environment.** A phase-four run "passed" only because `ENCRYPTION_KEY` was set on its command line; without it, four specs failed. Setting a variable to make a run pass and then reporting that run is the mistake.

## Progress — 2026-08-23

**P01 is done.** Page retrieval now crosses `pageVisibleTo`. `KbAccessService.getAccessibleProjectIds` gives "what can this person reach" one owner beside `getAccessibleSpaceIds`; the three hand-written predicates in `kb-search.service.ts` are gone.

Verified: `tsc --noEmit` exit 0 · `src/modules/kb` 16 suites / 141 tests, exit 0 · the new spec was watched failing first, its rendered output showing `visibility IN ('org','public')` where the read path builds the project-scoped expression.

Not verified: nothing was run against a booted application, and no query was measured. `kb-search-restrictions.spec.ts` gained one line — its access mock lacked the new method — which is the "a new read breaks every spec mock" pattern, not a weakened assertion.

**P01 does not close the hole on its own.** A member of zero projects still gets the permissive branch inside the seam, so retrieval and read are now consistent and both wider than they should be for that person. **P02 closes it and should lead wave 1.**

## Premises corrected before ticketing

Recorded because each would have produced a ticket that built the wrong thing.

- **"A downgrade should revoke a paid module."** It should not — root §8 records that existing enablement is deliberately not revoked. R01 makes the rule explicit and named; it does not change it.
- **"Index-time ACL is what closes the KB hole."** It is not. That is an indexed-predicate optimization (P03). The hole closes with P01 and P02.
- **`isPageIndexable` is not an access check.** It answers "is this page indexable at all" and already excludes private pages. Its spec must pass unchanged.
- **`@RequireModule` is not redundant.** Correct for routes gating on module status with no specific permission. R01 makes both guards consult one function; it does not delete the decorator.
- **The push fan-out is not a sequential N+1.** `sendToChannelMembers` is `Promise.allSettled(members.map(...))` and is awaited inside the send path. Verified at `realtime/web-push.service.ts:87`. The genuinely sequential loop is `chat-notifications.service.ts:49–62`.
- **The Ably capability cap is not silent.** It logs org, user, total and granted. A bounded list is deliberate.
- **`kb-notification-visibility.ts` needed no change.** Its "deliberately empty" comment is about permissions never travelling as claims, not projects — it already routes through `assertPageAccessible`.
- **Chat's permission vocabulary is 11 keys over 72 routes**, not 4 over 21. Thin, worth widening, not part of this set.

## Carried forward — real, verified, not ticketed here

- **`ChatAssistantController` carries no `@NoTenantTransaction`** — but see phase four ticket 03, which may have closed this.
- **AI credit settlement bypasses `AiGatewayCreditHelper` in streaming chat** — `chat-assistant.service.ts` calls `computeTokenCharge` and `ledger.settle` inline, so charge policy lives in two places.
- **Two KB retrieval implementations** — the public widget path and the authenticated assistant path share zero code and have different ACL models. Worth its own PRD.
- **Fourteen AI entry points each assemble their own context.** No shared retrieval seam. Needs a product decision on the feature taxonomy first.
- **Two email template systems** — flat functions in `email/templates/*.ts` beside the registry in `email/templates/registry/*.ts`. A service calling the former skips preference, routing, quiet hours and visibility.
- **Two transactional outboxes.** `outbox_events` has 23 producing modules, one consumer, and a publisher whose `isDispatchConfigured()` returns `false` by design, so rows stay `PENDING`. `notification_outbox` has 67 callers and a working relay. Either wire a broker or retire the second path — the current state is neither, and it is a decision, not a ticket.
- **`PAGES.md` was deleted** in `c27680b6e` and the constitution still requires it updated at the end of every task.

## Known hazards in this area

- Backend `tsc --noEmit` OOMs at the default heap. Always raise it.
- The web `tsconfig.json` **excludes test files**, so a clean web typecheck does not prove the tests compile.
- `prepare: false` on the Neon driver makes prepared statements inert. Optimize with indexes, projection and N+1 removal.
- A side effect fired after the request must not borrow the request's transaction.
- A `db.transaction` mock must invoke its callback, or every assertion inside it silently passes.
- This tree is edited by more than one session at once and the git index is shared. This set was renumbered because of exactly that.
