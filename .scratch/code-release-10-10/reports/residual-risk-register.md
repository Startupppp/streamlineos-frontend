# Residual risk register — the last open boxes on tickets 08, 11, 15, 20, 21, 33, 35, 36, 38

**Why this file exists.** Ticket 41 box 7 requires that "every code-level P0 and P1 finding is resolved;
accepted lower-severity residual risks carry an owner and a deadline." Nine tickets each hold one or a few
open boxes. Until today none of those carried an owner or a deadline, so ticket 41 could not close on any
of them. This register gives every remaining open box exactly one of two dispositions:

- **ASSIGNABLE** — genuinely closable work, with the file, the shape of the fix and an owner. Not a risk.
- **ACCEPTED RESIDUAL** — a verified blocker outside anyone's reach this release, with a named blocker
  class, an owner and a deadline.

**Every blocker below was re-verified against source, artifacts or a live gate run on 2026-09-03.** Where
a ticket's claim turned out to be stale or wrong, the correction is recorded and the ticket was edited.
**Six items previously filed as blocked are not blocked at all** and are moved to ASSIGNABLE. Section 1
states those first, because they are worth more than the register.

**Deadlines are proposed by this pass.** They are concrete dates rather than "TBD" so that ticket 41 box 7
has something checkable; the release owner confirms or moves each one at sign-off, and a moved date is a
decision on the record rather than a silent slip.

No source file in either repository was edited by this pass. Only ticket files under `issues/`, this
report and its two companion data files were written.

---

## 1. LOUD — six items filed as blocked that are actually closable work

### 1.1 Ticket 15 — 468 of the 1,138 "unprobeable" routes are a harness gap, not infrastructure

This is the largest single item in the register and it was not previously recorded anywhere.

The ticket, and `reports/cross-tenant-404-contract.md`, both cite the raw probe as
`scratchpad/bola-live-offline.json` and both stop at the four-way split. **The artifact was located and
re-read** (see §4 — it was in neither repo; it is now committed beside this report). Its 1,921 outcomes
reproduce the ticket's numbers exactly:
`PASS 666 · UNPROBEABLE 1138 · NO-404 113 · SERVER-ERROR 2 · LEAK 1 · INCONCLUSIVE 1`, taken at backend
commit `ca4ec171` on 2026-09-02T20:19:47Z.

**Nobody had opened the 1,138.** Bucketed by the probe's own `detail` field
(`reports/residual-risk-register/bola-unprobeable-buckets.json`):

| count | bucket | what it actually means |
|---:|---|---|
| **468** | own-tenant control answered **400 VALIDATION_FAILED** | the probe sent no valid request body. **Harness gap.** |
| **168** | the source tenant has no object of this type | **Seed gap.** |
| **149** | the path segment is not an object (`:moduleKey`, `:token`, `:providerKey`, …) | correctly and permanently unprobeable |
| 135 | own-tenant control answered 404 | control precondition |
| **88** | own-tenant control answered **500 INTERNAL_ERROR** | **a route that errors on a valid same-tenant request** |
| 48 / 32 / 24 / 14 / 8 / 4 | control 403 / 402 / 409 / 503 / 401 / timeout | permission, plan, state, dependency |

**468 routes — 41% of the unprobeable set, 24% of the whole surface — are unprobed because the probe
did not send a body.** The repo already holds the input needed to fix that: `check:openapi-coverage`
exits 0 at **1,371/1,371 mutating operations carrying a body schema** (re-run today). Generating a
minimal valid body per route from `contracts/openapi.json` is a bounded change to
`test/security/bola/bola-live-cross-tenant.seeded-e2e-spec.ts` that would move the single largest bucket
from "covered statically only" to "probed live". That is assignable work, not an infrastructure blocker,
and no one has been asked to do it.

**Separately, the 88 own-tenant 500s are an untriaged defect population.** These are routes returning
`INTERNAL_ERROR` for a *valid, same-tenant* request against the seeded database — hr 37, build 10,
finance 9, inventory 6, crm 5, accounting 4, party 3, payroll 3, support 3, and eight more. Two routes of
exactly this shape (`GET /surveys/:surveyId/builder`, `/logic`) were already triaged and turned out to be
a **write on a GET** violating a composite FK. Nothing says the other 88 are benign; nothing has looked.
The full route list is in the companion JSON.

### 1.2 Ticket 15 — 3 of the 4 e-sign no-404 routes are a 15-line fix with the template in the same directory

The ticket routes 4 e-sign routes to "another agent's territory" and stops. Read at head:

- `GET /sign/envelopes/:envelopeId/audit` — **already fixed.** `SignAuditService.listForEnvelope` calls
  `mustGetVisibleEnvelope(...)` (`sign-audit.service.ts:111`), which throws 404. The ticket's count of 4
  is stale; it is 3.
- `GET /sign/envelopes/:envelopeId/fields` → `SignFieldsService.listForEnvelope` (`sign-fields.service.ts:156`)
- `GET /sign/envelopes/:envelopeId/recipients` → `SignRecipientsService.listForEnvelope` (`sign-recipients.service.ts:150`)
- `GET /sign/envelopes/:envelopeId/documents` → `SignDocumentsService.list` (`sign-documents.service.ts:118`)

All three are a bare `findMany` on `(orgId, envelopeId)` that returns `[]` — HTTP 200 — for an envelope in
another organisation. The remedy already exists **in the same module**:
`src/modules/e-sign/sign-envelope-scope.ts::mustGetVisibleEnvelope`, whose own docstring says "Out of
scope and out of tenant answer the same 404 a missing envelope answers." Three call sites, three lines
each. Assignable to the e-sign owner today.

### 1.3 Ticket 21 box 2 — `client-accounts.service.ts` is no longer held by another lane

The ticket records this one as "was being edited by another lane while this ran". **That is no longer
true.** `git status --short` in `streamlineos-backend` shows 11 uncommitted paths and
`src/modules/clients/client-accounts.service.ts` is not among them; its last commit is `9d840a1f`. The
N+1 is still present and still real — `reassignAccounts` (lines 483–490) issues one
`db.update(clientAccounts)` per distinct assignee inside `Promise.all(Object.entries(assignments).map(…))`.

The gate's own baseline already writes down the exact fix: *"one `bulkUpdateFromValues` keyed on id with
`assignedCrmId` per row."* `src/common/db/bulk-update.ts` exists, is chunked, makes the tenant predicate
mandatory, refuses a repeated key, and has its own spec. This is a self-contained conversion with the
target form pre-derived. Assignable to the clients-module owner.

### 1.4 Ticket 36 box 7 — the three in-scope negative tests were never written

The ticket names its own concrete remainder and then records *"Not run: no negative test was written this
pass."* Verified at head that all three sites and all three spec files exist:

| cast | file | invariant to pin | spec file that already exists |
|---|---|---|---|
| `match as unknown as [string,string,string,string]` | `src/common/observability/tracing.ts:93` | traceparent capture-group arity | `tracing.spec.ts` |
| `(req as unknown as { route?: { path?: string } })` | `src/modules/platform/operator-session.guard.ts:46` | `req.route` absent degrades to `req.url` | `operator-session.guard.spec.ts` |
| `(raw/proxy as unknown as Thenable)` ×3 | `src/db/query-telemetry.ts:137,152,156` | the proxy reaches the thenable branch only after checking `.then` | `query-telemetry.spec.ts` |

Three tests in three files that already have a spec neighbour. This does not close the box on its own
(see R-8), but it is the whole of the box's in-scope remainder and it is unowned.

### 1.5 Ticket 11 box 1 — `/ai/meetings/follow-up` still has no `/stream` sibling

S8 added `POST /ai/meetings/prep/stream` and the calendar prep panel now opens it. Verified at head:
`meetings-ai.controller.ts:83` carries `@Post("prep/stream")`, and enumerating every `@Post("…stream…")`
in `src/modules/ai` returns 10 routes — **none of them is `follow-up/stream`**.

So `features/calendar/meeting-follow-up-panel.tsx` still buffers, and it **cannot be converted from the
frontend**, because the route it would need does not exist. The streamed follow-up that does exist,
`POST /ai/crm/meeting-follow-up/stream` (`crm-copilot.controller.ts:182`), is CRM-only and reached from
`features/crm/**`, which the release excludes.

This is a real, scoped, assignable **backend** change in `src/modules/ai/**`, and it is the exact shape
already landed one method above it in the same file: add `@Post("follow-up/stream")` to
`MeetingsAiController` delegating to a `streamFollowUp` on `MeetingsPrepService` through
`respondWithAiTextStream`, then point `useMeetingFollowUp` at it. The alternative — deciding that
`MeetingsAiController` and `CrmAiController`'s meeting families are duplicates and retiring one — is a
product decision, and is filed as R-3b.

---

## 2. The register

Blocker classes: **SCOPE** (CRM/inventory excluded from this release) · **DECISION** (owner's to make) ·
**INFRA** (credentials or infrastructure this effort does not hold) · **TOOL** (no instrument exists) ·
**ASSIGNABLE** (not a risk — closable work).

| id | ticket · box | disposition | blocker | owner | deadline |
|---|---|---|---|---|---|
| **A-1** | 15 · box 1 — 468 unprobed-for-lack-of-body | **ASSIGNABLE** | — | security/BOLA harness owner | 2026-09-08 |
| **A-2** | 15 · box 1 — 88 own-tenant 500s | **ASSIGNABLE** (triage) | — | release owner to route per module | 2026-09-08 |
| **A-3** | 15 · box 1 — 3 e-sign no-404 routes | **ASSIGNABLE** | — | e-sign module owner | 2026-09-08 |
| **A-4** | 21 · box 2 — `client-accounts.reassignAccounts` | **ASSIGNABLE** | — | clients module owner | 2026-09-08 |
| **A-5** | 36 · box 7 — 3 in-scope negative tests | **ASSIGNABLE** | — | observability / platform / db owner | 2026-09-08 |
| **A-6** | 11 · box 1 — `/ai/meetings/follow-up/stream` | **ASSIGNABLE** | — | `src/modules/ai/**` owner | 2026-09-08 |
| **R-1** | 33 · box 7 — R2 bucket policy | ACCEPTED RESIDUAL | INFRA | infrastructure operator | **2026-09-08, before cutover** |
| **R-2** | 33 · box 7 — owner-DSN backfill `--apply` | ACCEPTED RESIDUAL | INFRA | infrastructure operator | **2026-09-08, before cutover** |
| **R-2b** | 33 · box 7 — pre-`0edadaa0` KB orphan objects | ACCEPTED RESIDUAL | INFRA | infrastructure operator | 2026-09-30 |
| **R-3** | 11 · box 1 — 6 `/stream` routes with no product surface | ACCEPTED RESIDUAL | DECISION | release owner (product) | 2026-09-10 |
| **R-3b** | 11 · box 1 — `MeetingsAi` vs `CrmAi` duplicate route families | ACCEPTED RESIDUAL | DECISION | release owner (product) | 2026-09-10 |
| **R-3c** | 11 · box 1 — 26 buffered text surfaces in 17 other modules | ACCEPTED RESIDUAL | territory + DECISION | release owner to route | 2026-09-17 |
| **R-4** | 15 · box 1 — 17 excluded-scope no-404 routes | ACCEPTED RESIDUAL | SCOPE | CRM/inventory release owner | 2026-12-01 review |
| **R-4b** | 15 · box 1 — 1,138 minus what A-1/A-2 recover | ACCEPTED RESIDUAL | harness reach | security/BOLA harness owner | 2026-09-17 |
| **R-5** | 20 · box 1 — which list endpoints may return less | ACCEPTED RESIDUAL | DECISION | release owner (API contract) | 2026-09-17 |
| **R-6** | 21 · box 2 — `party-legacy-employer.ts:213` | ACCEPTED RESIDUAL | SCOPE (writes CRM `contacts`) | CRM/inventory release owner | 2026-12-01 review |
| **R-6b** | 21 · box 2 — `party-legacy-writer.ts:252` `claimIdentifiers` | ACCEPTED RESIDUAL | DECISION (bulk conflict semantics) | party module owner | 2026-09-17 |
| **R-6c** | 21 · box 2 — 3 `ACTIONABLE-UNDETECTED` service-call N+1s | ACCEPTED RESIDUAL | TOOL (unmatchable by a pattern detector) | hr / timesheets owners | 2026-09-17 |
| **R-7** | 21 · box 3 — `team` scope for leave approval | ACCEPTED RESIDUAL | DECISION | HR product owner | 2026-09-17 |
| **R-7b** | 21 · box 3 — 79 write sites with no `org_id`, 10 count-for-existence, 6 fetch-for-existence, 1 unindexed probe | ACCEPTED RESIDUAL | territory + migration | per-module owners | 2026-09-17 |
| **R-7c** | 21 · box 5 — recurring journals / recurring bills | ACCEPTED RESIDUAL | DECISION (transaction shape, not bulk) | accounting + finance owners | 2026-09-17 |
| **R-8** | 36 · box 7 — 13 `narrow-me` casts | ACCEPTED RESIDUAL | the box's own requirement is **wrong** for these | release owner to amend the box | 2026-09-10 |
| **R-8b** | 36 · box 7 — 17 of 20 `external` casts | ACCEPTED RESIDUAL | territory / compile-time-only / vendored | per-lane owners | 2026-09-17 |
| **R-9** | 35 · box 5 — 6 quarantines + 2 VOID transaction specs | ACCEPTED RESIDUAL | SCOPE | CRM/inventory release owner | 2026-12-01 review |
| **R-10** | 38 · box 1 — clause two, 1,562 inline JSX arrows | ACCEPTED RESIDUAL | DECISION (already ruled out in writing) | release owner | 2026-09-10 (ratify) |
| **R-10b** | 38 · box 1 — 6 remaining risky closures | ACCEPTED RESIDUAL | SCOPE | CRM/inventory release owner | 2026-12-01 review |
| **R-10c** | 38 · box 1 — `step-banking.tsx:33` name-character rule | ACCEPTED RESIDUAL | DECISION (which characters a name may hold) | HR product owner | 2026-09-17 |
| **R-11** | 08 · box 4 — unused DTO/Zod fields | ACCEPTED RESIDUAL | **TOOL — permanent** | release owner; revisit only if the instrument is built | 2027-03-03 review |

**Six ASSIGNABLE items, twenty-two accepted residuals.** No item is left without a disposition, an owner
and a date.

---

## 3. Per-ticket verification — what was checked, and how

### 3.1 Ticket 08 box 4 — the tool-capability block is real and reproducible ✅ **VERIFIED**

The ticket's claim is that neither `tsc --noUnusedLocals` nor `knip` can see a never-read field inside a
live, exported DTO. The bite proof was **rebuilt from scratch in a hermetic scratch tree**, not read off
the ticket, and — importantly — the ticket's version of the probe is single-file, which would have made
the knip half vacuous (knip treats an entry file's own exports as used by construction). A three-file
probe was used instead: `dto.ts` (the DTO) → `service.ts` (imports it) → `main.ts` (the entry).

| run | command | exit | result |
|---|---|---:|---|
| A | `tsc --noEmit --strict --noUnusedLocals --noUnusedParameters --esModuleInterop main.ts service.ts dto.ts` (TypeScript 5.9.3) | **0** | two never-read DTO fields invisible |
| A | `knip --no-progress` (`entry: main.ts`) | **0** | zero findings |
| **control** | same tree + an unused **local** in `service.ts` | **2** | `TS6133: 'neverReadLocal' is declared but its value is never read` |
| **control** | same tree + an **unimported export** in `dto.ts` | **1** | `Unused exports (1) neverImportedConst` · `Unused exported types (1) NeverImportedType` |
| restore | both, after reverting | **0** / **0** | back to silent |

Both instruments **bite** on the granularity they do resolve, and both are **silent** on a field. The
block is confirmed, and it is a property of the tools, not of this codebase. `R-11` is correctly a
permanent accepted residual. The independent territory blocker also still stands (`FE knip` reports 65
unused exported *types* — aliases, not fields; removing every one would not satisfy the box).

Nothing in the shared working tree was touched: the probe lives in the session scratchpad with the
backend's `node_modules` symlinked in.

### 3.2 Ticket 11 box 1 — one blocker cleared, three confirmed ⚠️ **TICKET WAS STALE**

Verified at head by enumerating `@Post("…stream…")` across `src/modules/ai`:

- **10 streaming routes**, including the new `meetings-ai.controller.ts:83 @Post("prep/stream")`.
- **`follow-up/stream` does not exist** → **A-6**, assignable backend work (§1.5).
- 6 routes with zero frontend callers even for their buffered sibling → **R-3**, product decision.
- `/ai/crm/meeting-follow-up/stream` is CRM-reached → excluded, folded into R-3b.
- 26 buffered text sites in 17 other modules → **R-3c**, territory.

The ticket presented the meeting-follow-up gap inside a "P2 FINDING" paragraph whose opening sentence
("S5 streamed three routes the product does not call") reads as an observation about S5's work rather
than as an open work item. It is now written as an assignable item with its shape.

### 3.3 Ticket 15 box 1 — cannot close; the ticket's blocker text is wrong ⚠️ **TICKET WAS STALE**

**Can it close on the 113's accounting?** No — and for a reason the ticket does not state.

The 113 *are* fully accounted (`reports/cross-tenant-404-contract.md`: 84 fixed · 17 excluded scope · 4
another territory · 8 not applicable · **0 still open**), the 2 SERVER-ERRORs are fixed, the 1
INCONCLUSIVE is classified and fixed, and the 1 LEAK is fixed. So the ticket's own stated blocker —
*"BLOCKED on other territory for the actionable remainder: the 113 + 2 + 1"* — **is false at head**: 84
of the 113 are fixed and both of the other two classes are closed. That sentence would have sent the next
reader looking for work that no longer exists.

What actually keeps the box open is the clause the ticket buries: **"the box says *every*
object-addressable route… and 1,138 were never asked."** 666 of 1,921 probed-and-passing is 34.7%. The
box cannot tick.

But **the 1,138 are not one blocker** (§1.1). 468 are a harness gap with the OpenAPI bodies already
available (**A-1**), 168 are a seed gap, 88 are an untriaged 500 population (**A-2**), and only ~149 are
permanently unprobeable by construction. The residual after A-1/A-2 is **R-4b**, and the 21 measured
non-404 routes still open split into 17 excluded (**R-4**) and 3 e-sign (**A-3**, §1.2 — the ticket says
4, and one of those is already fixed).

Verification performed: the raw probe artifact was located and re-parsed; all six verdict counts
reproduce the ticket exactly; the three e-sign services were read at head; `check:openapi-coverage` was
re-run (exit 0, 1,371/1,371).

### 3.4 Ticket 20 box 1 — blocker confirmed ✅ **VERIFIED**

`pnpm check:query-projections` → **exit 0**. 3,575 files. `findMany` 294 · `findFirst` 547 · bare
`.select()` 600 = **1,441 against a ceiling of 1,441**. **Unprojected COUNT/EXISTENCE paths: 0
(allowed 0).**

That is the correct shape for this box: the two clauses that need no contract decision (count, existence)
are at zero and *enforced*, and the clause that does need one is ratcheted so it cannot grow while the
decision is outstanding. The ticket's 79.1% / 79.8% held-or-excluded split is consistent with the gate's
own recount (the gate reads 294/547/600 where the ticket's hand recount read 296/550/599 — a two-site
drift from concurrent lanes, not a discrepancy in kind).

There is no measurement left that would close this. It is **R-5**, a product/API-contract decision, and
the register now gives it an owner and a date instead of leaving it as an unattributed "BLOCKED".

### 3.5 Ticket 21 boxes 2 / 3 / 5 — one of the three N+1s is free ⚠️ **TICKET WAS STALE**

`pnpm check:db-call-count` → **exit 0**, all N+1 patterns classified, `ACTIONABLE-UNDETECTED: 3
(ratchet 3)`. The three N+1s recorded-not-fixed were each re-read in
`src/scripts/baselines/db-call-count-classification.json` and at their source line:

| site | recorded reason | verified at head |
|---|---|---|
| `party/party-legacy-employer.ts:213` | writes CRM `contacts`, excluded | **holds** → R-6 |
| `party/party-legacy-writer.ts:252` | `claimIdentifiers` owns per-party conflict resolution whose bulk semantics need its owner | **holds** → R-6b |
| `clients/client-accounts.service.ts:483` | "was being edited by another lane while this ran" | **NO LONGER TRUE** → **A-4** (§1.3) |

Box 3's residue (R-7, R-7b) and box 5's (R-7c) were read but not independently re-counted — see §5.

### 3.6 Ticket 33 box 7 — operator-owned, and the code half still holds ✅ **VERIFIED**

- `pnpm check:public-object-urls` → **exit 0**. 9 public-base references, all 9 declared with a stated
  non-minting reason; **0 upload-result `url` fields**.
- `pnpm check:public-object-urls:self-test` → **exit 0**.
- `scripts/backfill-public-object-urls.mjs` is on disk.

Both remaining steps are console/credential actions with no code equivalent, and neither has ever been
run by any agent on any database:

1. **R-2** — `node scripts/backfill-public-object-urls.mjs --url <owner DSN> --apply`, as the **database
   owner**. **Read the exit code, not the text: `2` means "a column sat behind an RLS policy this role
   does not bypass and its rows were NOT counted" — never "nothing found."** Closing evidence: a
   confirming dry run reading `ROWS HOLDING A PUBLIC URL: 0 across 0 column(s)` **with
   `UNVERIFIABLE COLUMNS: 0`** at exit 0, plus the `--apply` run's `ROWS REWRITTEN: n`.
2. **R-1** — remove public access (the r2.dev development URL) from the buckets named by
   `R2_BUCKET_NAME` **and** `R2_KB_BUCKET_NAME` in the Cloudflare R2 console. Closing evidence: an
   unauthenticated `curl -I` of a previously-public object returning 401/403.

**Neither step substitutes for the other.** Rewriting a column stops the application handing out a
permanent URL; every object already at a public address stays fetchable to anyone who copied one until
the bucket policy changes. **R-1 and R-2 are the only two items in this register that are a live data
exposure rather than a code-quality residual, and they are dated before cutover for that reason.**

3. **R-2b** — objects orphaned by KB trash purge *before* commit `0edadaa0` leave no database row at
   all, so the backfill cannot find them; recovering them needs a bucket-side listing diffed against
   `kb_page_attachments.file_key`. The ongoing leak is fixed; this is historical cleanup only.

### 3.7 Ticket 35 box 5 — exclusion confirmed ✅ **VERIFIED**

- `pnpm check:test-suppressions` → **exit 0**. 2,029 spec files (up from 2,013 — the corpus grew, the
  residue did not) · 20 suppression sites · 27 conditional aliases → conditional 28 (ratchet 28) ·
  placeholder 13 · **quarantine 6 (ratchet 6)**.
- `pnpm check:transaction-callbacks` → **exit 0**. 2,014 spec files · 264 files with a transaction double
  · 464 doubles → invokes 255 · declared-unreached 7 · rejects 0 · **VOID 2 (ratchet 2)**.

All 6 quarantines are `describe.skip` blocks in `src/modules/ai/core/crm-copilot.service.phase2.spec.ts`
targeting `CrmScoringService` / `CrmBriefService`; both VOID specs are `modules/inventory` and
`modules/leads`. Both ratchets can only go down. **R-9** — blocked on release scope, and it becomes
actionable the moment CRM and inventory enter scope, not before.

### 3.8 Ticket 36 box 7 — the "wrong remedy" claim is correct ✅ **VERIFIED**

- BE `pnpm check:type-assertions` → **exit 0**. 3,573 files, **26** `as unknown as` in 16 files,
  **18 external / 8 narrow-me**. Self-test exit 0.
- FE `pnpm check:type-assertions` → **exit 0**. 4,264 files, **7** in 6 files, **2 external / 5
  narrow-me**. Self-test exit 0.
- Totals: **33 sites · 20 external · 13 narrow-me** — exactly the ticket's numbers.

**R-8 is a defect in the box's own wording, not in the code.** A `narrow-me` entry's recorded remedy is
to *delete* the cast (a shared Zod parse for the four jsonb round-trips, `Number(row.count)` at the use
site for the two raw `db.execute` rows, a generic type parameter for the four `RecordValue` sites).
Writing a per-site negative test for one would certify a cast the ledger already says must not exist and
would make its later removal look like a regression. The box should read "a per-site negative test for
each `external` site; a scheduled deletion for each `narrow-me` site" — that is an amendment the release
owner makes, and it is why R-8's owner is the release owner rather than a module owner.

The in-scope testable remainder is **A-5** (§1.4). The other 17 external sites are **R-8b**: harness
files in another lane, the Drizzle-instantiation seam where the invariant is compile-time and no runtime
test can reach it, and one vendored file.

### 3.9 Ticket 38 box 1 — clause two stays out of scope ✅ **VERIFIED, not reopened**

Clause two ("no inline arrow in a JSX event prop") is ruled out of scope **in writing in the ticket**,
with the reasoning recorded: ~84% of the occurrences are `onClick={() => setOpen(true)}` — one call to a
stable state setter, no rule, no mutation, no failure mode — and converting them touches ~1,300 files for
zero behavioural difference. A coarse recount at head returns **1,575** occurrences of an inline arrow
opening a JSX event prop, consistent with the ticket's 1,562 under a stricter scanner. **Not reopened**
(**R-10**); the register's only ask is that the release owner ratifies the exclusion so the box's failure
to tick is an accepted decision rather than an unexplained gap.

The 6 remaining risky closures were checked and all 6 exist: 5 under `features/inventory/**` and 1 at
`features/crm/autonomy/autonomy-switches-panel.tsx:116` (`onCheckedChange={(enabled) =>`) — **R-10b**,
excluded scope. *Ticket correction:* the ticket writes the five inventory paths without their
`components/` segment (e.g. `features/inventory/order-line-table.tsx`, actually
`features/inventory/components/order-line-table.tsx`), so a reader checking them finds five missing
files and would conclude the note was stale. Corrected in the ticket.

`components/hr/_onboarding/step-banking.tsx:33`'s `/^[A-Za-z\s]*$/` account-holder-name rule is **R-10c**
— a genuine product decision (a pasted "O'Brien" or a diacritic silently does nothing), correctly not
taken unilaterally.

---

## 4. Cross-territory findings — not mine to fix

1. **The release's largest security artifact is not in either repository.** `bola-live-offline.json`
   (1.4 MB, 1,921 probed routes, backend commit `ca4ec171`) — cited by ticket 15 and by
   `reports/cross-tenant-404-contract.md` as `scratchpad/bola-live-offline.json` — exists **only in the
   session's temporary scratchpad directory**, alongside `bola-live-partA.json` and
   `bola-live-full.json`. Nothing under `streamlineos-backend/` or `streamlineos-frontend/` holds it, and
   a `find` across both repos for `bola-live*` returns nothing. **Ticket 41 box 2 requires that each
   "database identity, dataset shape, pass/fail/skip count and failure artifact is recorded"**, and this
   artifact will not survive the session. The derived bucket summary is now committed at
   `reports/residual-risk-register/bola-unprobeable-buckets.json`. **The raw 1,921-route probe has also been
   copied into the repo at `reports/residual-risk-register/bola-live-offline.json`** so it survives the session;
   whoever owns ticket 15 or ticket 41 should decide whether it belongs somewhere more canonical.
2. **`reports/findings-register.md` §Q is stale and contradicts `reports/cross-tenant-404-contract.md`.**
   It carries #165 / #166 / #167 as **OPEN**; the contract report records #165 as 84 fixed / 0 still
   open, #166 as FIXED and #167 as CLASSIFIED-and-fixed. Two agents reading the two files reach opposite
   conclusions about whether 116 routes still need work. The register belongs to whichever lane owns it.
3. **88 routes return `500 INTERNAL_ERROR` to a valid same-tenant request** on the seeded database
   (§1.1). Untriaged, unrecorded until now, and spread across 15 modules. Two routes of this exact shape
   turned out to be a write-on-a-GET violating a composite FK.
4. **Ticket 15's e-sign count is 4 but one is already fixed** (§1.2) — `…/audit` calls
   `mustGetVisibleEnvelope`. Whoever picks up A-3 should not go looking for a fourth.

---

## 5. Honest gaps — what this pass did NOT verify

- **Not run, either repo:** `lint`, `test`, `test:e2e`, seeded e2e, `next build`, backend `typecheck`,
  frontend `type-check`, `check:spec-typecheck`. This pass edited no source, so none was required, and
  none is claimed as passing.
- **No database was connected to.** No `psql`, no `scratch_*` database created, read or dropped, and
  `DATABASE_URL` was never read.
- **The BOLA probe was not re-run.** The 1,921-route split is re-derived from the existing artifact at
  commit `ca4ec171`; the tree has moved since. The bucket analysis in §1.1 is therefore accurate *as of
  that probe*, and re-running it is part of A-1.
- **Taken on trust, not independently re-counted:** ticket 21 box 3's "79 write sites with no `org_id`,
  10 count-for-existence, 6 fetch-for-existence, 1 unindexed probe" (R-7b) and box 5's "~5 candidate
  sites remain" (R-7c). Their *blocker classes* were verified by reading the recorded reasoning and the
  gate output; the *populations* were not recounted.
- **Taken on trust:** ticket 20's per-module 79.1% / 79.8% held-or-excluded split. The gate's total
  (1,441) and its zero count/existence findings were verified; the module attribution was not
  re-derived.
- **Taken on trust:** ticket 11's census of 26 buffered text sites across 17 modules (R-3c). The
  streaming-route enumeration and the absence of `follow-up/stream` were verified directly.
- **The inline-arrow count is approximate.** 1,575 by a coarse `grep` against the ticket's 1,562 by its
  own scanner; the ticket's scanner was not re-run.
- **Owner names are role-based**, following this release's own convention (`reports/findings-register.md`
  writes "Owner: surveys", "Owner: organization"). No individual is named because no roster exists in
  either repository. The release owner must map each role to a person for ticket 41 box 7 to be
  genuinely satisfiable by a human.
- **Deadlines are proposed, not agreed.** They are recorded as concrete dates so ticket 41 box 7 has
  something checkable rather than a "TBD"; the release owner confirms or moves each at sign-off.

---

## 6. What this changes for ticket 41

Ticket 41 box 7 has two halves. This pass addresses only the second.

- *"Every code-level P0 and P1 finding is resolved"* — **not assessed here.** Out of this pass's scope.
- *"Accepted lower-severity residual risks carry an owner and a deadline"* — **now satisfiable for these
  nine tickets.** Twenty-two accepted residuals each carry a blocker class, an owner and a date; six
  further items are not risks at all but unowned work, and are listed separately so they are not
  accepted as risk by default.

**Two of the twenty-two should not be accepted as lower-severity without the release owner looking at
them directly: R-1 and R-2.** Until the R2 buckets are made private, every object already sitting at a
public r2.dev address stays fetchable by anyone who ever copied one, whatever the database columns now
say. That is a live exposure, not a code-quality residual, and no code change substitutes for it.

---

# EXTENSION — part 2, tickets 19, 22, 23, 26, 28, 29 and 30 (2026-09-03)

The nine tickets above are not all of them. Seven more each hold open boxes, eighteen in total, and until
today none of those carried an owner or a deadline either. They are covered in the companion file
**`reports/residual-risk-register-19-30.md`**, written to the same contract: ASSIGNABLE or ACCEPTED
RESIDUAL, every blocker verified against source, a live gate run or a committed artifact rather than
transcribed from the ticket. Part 2 adds **20 ASSIGNABLE items and 15 accepted residuals**. Nothing above
this line was changed.

Four of part 2's findings belong in front of anyone reading only this file:

1. **A-17 — two release gates are red on numbers the product no longer produces.** Tickets 22, 23 and 29
   all record `GET /calendar/events` as fixed (915.944 → 305.746 ms p95, 7,063 → 706 buffer blocks). At
   head, `pnpm check:route-budgets` → **exit 1** (`measuredBufferBlocks=7072 exceeds maxBufferBlocks=2000`)
   and `pnpm check:benchmark-manifest` → **exit 1** (`request p95 915.944 ms > 800 ms`). The contract still
   carries the old capture because the replacement run stopped at ~81 of 164 slots. It is a **re-run**, not
   an investigation, and it is unowned.
2. **A-12 — `pnpm openapi:check` is not database-coupled and the ticket's reason for deferring it is
   wrong.** Ticket 19 box 3 says regenerating "would write grants into the shared Neon database". Backend
   CI runs the same command against `postgres://ci:ci@127.0.0.1:5432/ci`, and it was reproduced locally
   today with that placeholder: **exit 1, artifact STALE, 55 operations adrift**, no database contacted.
   What actually defers it is sequencing across six lanes, i.e. the release commit. Separately,
   `pnpm check:contract-vendor` is **already exit 1** on one operation (`POST /gdpr/rectification/me`).
3. **A-22 — a live user-visible regression is shipping.** Ticket 23's chat payload fix replaced the full
   member list with a bounded preview of 8 plus a true `memberCount`;
   `features/chat/use-message-panel-data.ts:326` still reads `channel?.members?.length ?? 0`, so every
   channel header reports at most 8 members. The field is on the wire and in the frontend type.
4. **A-28 / §1.4 — two items are addressed to owners who cannot act.** Ticket 29 box 1's last clause ("No
   module-specific calendar page exists") is **false at head** —
   `features/hr/recruitment/interviews-page.tsx:249` still renders `BigCalendarWrapper`, reported and
   re-routed in three consecutive passes. And ticket 28 box 6 routes its whole remainder to **ticket 30
   box 1, which is already `[x]` closed**, so nobody will pick it up.

Two boxes in part 2 cannot be met as worded and should be **amended** rather than left to fail — the same
shape as R-8 above: **28 box 7** ("client types mirror the backend schema exactly", at 2.2% coverage over
2,502 seam calls) and **29 box 2** (it asks for two features the release has decided not to build).

**Added after the fact, because it landed while part 2 was being written:** **ticket 30 box 1 is ticked over
evidence that names a mechanism which is not in the code.** It was rewritten on 2026-09-03 to close its
offline clause with "`components/shared/loading-state.tsx` and `components/ui/data-table.tsx` … both read
`fetchStatus === "paused"`". Measured at head, twice: a non-test grep for `fetchStatus` across
`app features components hooks lib` returns **zero** occurrences, and both files read `useOnlineStatus()`
(`navigator.onLine`) instead. The clause's substance may still hold, so the box was **not** unticked — but
ticket 28 box 6 and ticket 30 box 1 now assert opposite things in writing about the same two files, which is
the second instance in this release of the two-files-two-conclusions failure recorded at §4.2 above.
`reports/residual-risk-register-19-30.md` §1.5.
