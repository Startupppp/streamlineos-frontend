# Ticket 34 — Published contract versioning and consumer-surface reconciliation

Session S8. Every number below came from a command whose output I read.

## 1. Real gate numbers (measured, not assumed)

Baseline, before any edit of mine:

| Gate | Repo | Exit | Numbers |
|---|---|---|---|
| `check:contract-registry` | BE | 0 | 3,625 operations (101 published, 3,524 internal), 24 events, 12 retained |
| `check:contract-breaking-change` | BE | 0 | 101 published, 3,524 internal, 0 breaking |
| `check:operation-ids` | BE | 0 | 3,613 operations across 2,676 paths, 0 duplicate operationIds |
| `check:openapi-coverage` | BE | 0 | 3,613 operations, 3,613/3,613 exposure-stamped, 100% error shapes / response schemas / request schemas |
| `check:contract-vendor` | FE | **1** | did not compare anything — see §5 |
| `check:contract-drift` | FE | 0 | 49 timesheets calls, 0 baselined drifts, no new drift |

The orchestrator's reported figures were correct. 3,625 − 12 retained = 3,613 live, consistent with the OpenAPI document.

Final, after this ticket — all seven green, live **and** self-test:

```
BE check-api-contract-registry      live=0 self-test=0
BE check-contract-breaking-change   live=0 self-test=0
BE check-operation-ids              live=0 self-test=0
BE check-openapi-coverage           live=0 self-test=0
BE generate-api-contract-registry          self-test=0
FE check-contract-vendor            live=0 self-test=0
FE check-contract-drift             live=0 self-test=0
```

## 2. Three P1 defects found. All fixed.

### D1 — Retained tombstones failed OPEN (the ticket's own trap, from the other side)

`findUnclassifiedOperations` walks `openapi.json`, so it can only see entries that still have a
live operation. A **retained** entry — the tombstone `check-contract-breaking-change` reads to
detect a removal — has no live operation, and nothing validated it. `findBreakingRemovals` then
exempted anything whose classification was not literally `"published"`.

So: take a published tombstone, change `"published"` to `"internl"`, and the removal finding
disappears with every gate green. The generator's retention comment guards against *deleting* a
tombstone; this is the same evasion by *mutation*. Proved against the real registry:

```
tombstone flipped to published              : removals=1   (want 1)
same tombstone with a typo'd classification : removals=1 invalidEntries=1   (want 1/1)
   (before this ticket both of those were 0)
```

Fix: new `findInvalidEntries(registry)` validates **every** entry including tombstones; and
`isExemptFromBackwardCompatibility` exempts only the exact string `"internal"` — a typo, a null,
a missing field and `"published "` all now read as published. 5 self-test cases.

### D2 — The parameter-narrowing gate had never been able to fire

`findBreakingNarrowings` reads `entry.knownParameters`. The generator never wrote that field:
**0 of 3,625 entries had it**, so `registryParams.size === 0` short-circuited on every operation.
Half of `check:contract-breaking-change` was dead code against real data since it was written. Its
self-test passed only because the fixtures hand-built a field the generator never produced.

Fix: the generator now freezes a parameter baseline for published operations on first
classification and preserves it thereafter (re-deriving it every run would let `registry:generate`
— the command the gate's own failure message recommends — erase the evidence). 101/101 published
entries now carry one. It also catches a newly-added required parameter, not only a narrowed or
dropped one. Proved live against the real committed document:

```
published entries carrying a frozen baseline    : 101 / 101
baseline narrowings against the real document   : 0   (want 0)
add required 'orgId' to GET /public/kb/{slug}   : 1 breaking
drop every parameter from GET /public/kb/{slug} : 2 breaking
```

### D3 — Customer webhook event names were an unprotected published contract

Confirming the ticket-07 finding the orchestrator relayed, and answering it explicitly rather
than inferring anything from a green exit code.

**The 24 registry events are NOT the customer webhook names.** They are `OutboxWriter.emit()`
events, all classified internal, all consumed by `outbox-relay`. `registry.webhooks` was `{}` —
an object the generator never wrote to. The customer webhook catalogue was a third list that no
gate read. Renaming `deal.won` passed everything.

**The six organization-scoped names** (`WebhooksDispatchService.dispatch`, subscribed to via the
webhooks API `events` array, delivered as the body's `event` field):

`deal.won` · `deal.lost` · `employee.hired` · `lead.created` · `lead.updated` · `leave.approved`

Plus **eight project-scoped** (`ProjectsWebhooksDispatchService.enqueue`): `ticket.created`,
`ticket.updated`, `ticket.assigned`, `ticket.deleted`, `comment.created`, `member.added`,
`member.removed`, `member.role_updated` — and **nine subscribable survey triggers** reached
through a variable dispatch. 23 names total, all now catalogued, versioned and consumer-named.

Note: `survey.response.submitted` exists as **both** an outbox event and a customer webhook name.

Fix: the generator scans both dispatchers; the registry records scope, dispatcher, version,
consumer and emitting file per name; retention applies to names as it does to operations; and
`findBreakingWebhookRemovals` fails a rename. The scan is re-run **by the gates**, not read out of
the registry's own snapshot, so it bites whether or not `registry:generate` was run afterwards.
Proved against the real registry:

```
rename deal.won -> deal.closed_won               : 1 breaking
  and the registry gate sees the new name as     : 1 unclassified (fail-closed)
new event 'invoice.paid' emitted, not in registry: 1 unclassified (fail-closed)
```

My first version of this check was itself wrong — it exempted an entry whose `emittedFrom` was
non-empty, which exempts every scanned name and is no check at all. The probe caught it (0 instead
of 1) and it is fixed; `declaredIn` now carries the hand-declared exemption and `emittedFrom` is
descriptive only.

## 3. The three traps

**Unknown operations fail closed — tested, not assumed.** An operation in `openapi.json` absent
from the registry → 1 violation. With no `x-exposure` at all → 1 violation. A webhook name a
dispatcher emits that the registry has never seen → 1 violation. The exposure marker is *not* the
published contract: 3,208 operations are `x-exposure: permissioned` and internal; the published
set is the 101 the registry classifies, each naming a consumer that is not our own frontend.

**Duplicate controller class names: 0.** 560 `@Controller`-decorated classes scanned by decorator
(not by an `*Controller` name convention), 560 distinct names. `check:operation-ids` agrees: 0
duplicate operationIds across 3,613 operations. The header comment in
`check-api-contract-registry.mjs` still says "known defect: 28 ops published another route's
contract" — that text is **stale**; the live run reports none.

**The registry was never hand-edited.** Every change to it came from editing the generator and
running `pnpm registry:generate`. Human declarations live in a new hand-authored *input* file.
Regeneration is idempotent: two consecutive runs differ only in `generatedAt`.

## 4. Versioning, deprecation and replay — what is now enforced

`findPublishedContractGaps` fails a published entry that has no version **and** no dated
deprecation window; whose registry version disagrees with its own `/vN/` path segment; that names
no consumer; that has no frozen parameter baseline; or that documents no idempotency/replay rule.
101/101 pass.

Deprecation is read straight off the OpenAPI document (`deprecated` / `x-sunset` /
`x-deprecation-link`, present on 9 operations — all internal today) so the date advertised to
consumers and the date recorded cannot drift. It stays separate from `sunsetAt`/`sunsetEvidence`:
announcing a sunset is not the same act as authorising a removal.

Replay rules for all 101 published operations, each read from the named handler:

| mode | n |
|---|---|
| safe (GET) | 43 |
| **at-least-once-unfenced** | **20** |
| replayable-write | 7 |
| natural-key-upsert | 6 |
| advisory-dedup-unfenced | 6 |
| single-use-token | 6 |
| provider-signature-and-event-id | 3 |
| single-use-token-racy | 3 |
| no-persistence-rate-limited | 3 |
| provider-signature-idempotent-effect | 2 |
| optimistic-concurrency | 1 |
| captcha-single-use | 1 |

**0 of the 101 published operations carry `x-idempotent`** — all 229 `@Idempotent` routes are
internal. And the decorator could not help them if added: `idempotency.interceptor.ts` falls
through to `next.handle()` **unfenced** when the request has no `orgId`/`userId`, so it is inert
on every `@Public()` route. That is recorded in the terms file.

`at-least-once-unfenced` is a **finding, not an endorsement** — it records that the operation has
no server-side replay fence, so a consumer retrying after a timeout must expect a duplicate.
Recording it truthfully is what lets the gate pass while leaving the defect visible. The worst of
the 20, for whoever owns them: `POST /leads/ingest`, `POST /csat/{surveyId}/responses`,
`POST /agent/v1/projects/{projectId}/tickets`, `POST /portal/v1/projects/{projectId}/change-requests`,
`POST /support/chat/{orgId}/start`.

## 5. Answers to the orchestrator's questions

**Classification of the routes ticket-07 flagged** — all four are **published**, which is the
worse answer:

```
POST  /support/inbound/email/{orgId}       published  x-exposure=public  idem=advisory-dedup-unfenced
POST  /support/inbound/sms/{orgId}         published  x-exposure=public  idem=advisory-dedup-unfenced
POST  /support/inbound/whatsapp/{orgId}    published  x-exposure=public  idem=advisory-dedup-unfenced
PATCH /public/whiteboard-links/{token}     published  x-exposure=public  idem=replayable-write
```

The `/support/inbound/*` three are not unauthenticated — `verifyInboundSecret` compares an
`x-webhook-secret` header against `support_channels.inbound_secret` and 401s — but their dedupe is
a SELECT-then-INSERT on `support_ticket_messages.source_message_id` backed by
`idx_support_ticket_messages_source_message`, which is **not unique**, so two concurrent
redeliveries can both insert. `PATCH /public/whiteboard-links/{token}` is a genuinely
unauthenticated write, gated only by `publicAccess = 'editor'` and a rate limiter. Both are
authorization defects, not mine to fix, but they are now frozen as *published* contracts — worth
resolving before this ships.

**The cross-repo guard.** `check:contract-vendor` resolved the backend only at
`<frontend-root>/backend/openapi.json`. On this sibling layout it exited **1** with "missing" —
loud, so it was not a silent pass, but it had never compared the two files. Fixed: it now resolves
`STREAMLINEOS_BACKEND_ROOT`, the monorepo path, and the sibling `streamlineos-backend` path, and a
green result **names the artifact it actually read**. It now passes having genuinely compared them
(sha256 `ae149514fa2887b8…`, identical). `check:contract-drift` reads only the vendored copy — no
cross-repo dependency. Three self-test cases added for the resolution.

## 6. Files changed

Backend (`/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`):
- `src/scripts/generate-api-contract-registry.mjs` — published-only derived fields (version, deprecation, frozen parameter baseline, idempotency, evidence); outbound webhook scanner with retention; reads the new terms file; main body and self-test gated on direct run so the gates can import it without side effects
- `src/scripts/check-api-contract-registry.mjs` — `findInvalidEntries` (validates retained entries), `findPublishedContractGaps`, `findUnclassifiedWebhookEvents`, `findWebhookContractGaps`; 17 new self-test cases
- `src/scripts/check-contract-breaking-change.mjs` — fail-closed classification, live narrowing check, `findBreakingWebhookRemovals`; 13 new self-test cases
- `contracts/published-contract-terms.json` — **new**, hand-authored input: 58 published mutating operations + 9 subscribable webhook event names, each with the handler file it was read from
- `contracts/api-contract-registry.json` — regenerated by `pnpm registry:generate`, never hand-edited (schemaVersion 1.0 → 1.1)

Frontend (`/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/frontend`):
- `scripts/check-contract-vendor.mjs` — backend artifact resolution + 3 self-test cases

Ticket: `/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/.scratch/code-release-10-10/issues/34-published-contract-versioning.md`

I edited nothing under `BE/src/modules/**`, `BE/migrations/**`, `BE/src/db/schema/**` or `FE/app/**`,
and ran no git commands. `openapi.json` was not regenerated, so the vendored frontend copy is
untouched and still matches.

## 7. Left for others

- **P1, ticket-07's territory:** `PATCH /public/whiteboard-links/{token}` is an unauthenticated
  write, and the three `/support/inbound/*` routes dedupe on a non-unique index. Both are now
  *published* contracts, which raises the cost of changing them later.
- **P2:** `idx_support_ticket_messages_source_message` should be unique for the inbound dedupe to
  hold under concurrency. Schema territory, not mine.
- **P2:** `POST /portal/auth/accept-invitation` consumes its token with an UPDATE carrying no
  `status = 'PENDING'` predicate and no affected-row check, unlike its org-side twin. Concurrent
  redemptions are unfenced. `src/modules/portal/auth/portal-auth.service.ts:101`.
- **P3, cosmetic:** the stale "known defect: 28 ops" line in `check-api-contract-registry.mjs`'s
  header. I left it and noted it in the ticket rather than editing a comment I could not attribute.
- Backend `eslint` reports `'process' is not defined` on every `src/scripts/*.mjs`, touched or not
  (`check-operation-ids.mjs` 20 errors, `check-outbox-consumers.mjs` 21). Pre-existing env config,
  not a regression from this work.
