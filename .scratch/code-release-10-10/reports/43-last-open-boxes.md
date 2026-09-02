# 43 — Closing the last open box on tickets 14 / 20 / 33 / 08 / 35

One pass over five boxes that were each "one box from done", plus the unowned
`check:tenant-isolation` failure two agents had reported and neither owned. Two of the five
turned out to need no work at all, and recording that is the result for those.

Scope note: this pass ran under a working tree that holds several other agents' uncommitted
changes. Every number below was measured at that head. No `psql` was run, no database was
connected to, `DATABASE_URL` was never read.

---

## 1. `check:tenant-isolation` — the defect no longer exists

**Reported:** the gate exits 1 on `src/modules/organization/setup/org-setup-completed-consumer.service.ts`,
which has no cross-tenant negative test.

**Measured at head:** `pnpm check:tenant-isolation` → **exit 0**. 992 service files with a db handle,
928 tenant-owned, 667 isolation test files, **928 / 928 (100%)** declared. `pnpm check:tenant-isolation:self-test`
→ **exit 0**. The gate's own note says the static half proves a spec *exists*, not that it passes, so the
executable half was run too: `pnpm check:tenant-isolation:run` → **exit 0, 450 suites passed / 450, 1,847 tests
passed / 1,847**. Both halves are green.

The gap was closed by backend commit `deff6b6f` ("test(organization): cross-tenant negative suite for
the setup consumer, and close the hole it found"), which landed
`src/modules/organization/setup/__tests__/org-setup-completed-tenant-isolation.spec.ts` (10 tests),
made the payload schema `.strict()`, and added the consumer's payload-vs-event tenant guard. The two
agent reports predate it.

**Verified rather than taken on the commit message.** `jest --runInBand --testPathPattern="org-setup-completed-tenant-isolation"`
→ **exit 0, 10 passed / 10**.

**Bite-proven independently, in a hermetic tree** (`git archive HEAD src test package.json tsconfig.json`
into a temp directory with `node_modules` symlinked — the live shared tree was never mutated, and
`git diff -- src/modules/organization/setup/` is empty):

| mutation | result |
|---|---|
| tenant guard forced false (`if (orgId !== event.organizationId)` → `if (false)`) | **4 failed / 6 passed / 10** |
| `.strict()` removed from `org-setup-completed-payload.schema.ts` | **1 failed / 9 passed / 10** |

The four that go red are exactly the cross-tenant ones: *refuses to provision organization B from an
event recorded against organization A*, *names neither organization in any write when the two
disagree*, *records the refusal durably on the inbox row*, *never reads the subject when it refuses*.
These reproduce ticket 14's own recorded numbers exactly, from an independent tree.

**On "the assertion is 404, never 403".** That rule is about an HTTP-facing negative test, and it does
not apply here: this is an outbox **consumer**, not a route, so there is no status code to assert. The
equivalent non-disclosure property is asserted directly and is stronger — the third test serialises
every argument passed to every downstream call and asserts the string contains **neither** organisation
id, so the refusal cannot confirm that either organisation exists. Nothing in this suite branches on a
403/404 distinction.

**Verdict: no work needed.** The box this belongs to (ticket 14) is already closed and correctly
evidenced; ticket 14 was not edited, since it is another lane's file and nothing in it is wrong.

---

## 2. Ticket 20, box 1 — re-read, three real fixes, then BLOCKED on a product decision

The two earlier passes scored this box on whole-table shape: does each `db.query.*.findMany` carry a
`columns:` projection. That framing concluded the entire residue was DTO-bound and therefore a product
decision. Re-reading the box's own wording found a gap in that framing: it names **three** path kinds —
list, **count** and **existence** — and a count or an existence check returns no DTO at all, so
narrowing one is contract-neutral by construction and needs no decision from anybody.

**Instrument.** Re-counted independently over all 3,708 non-spec `src/**` files, brace-matching each
call's argument list and testing for a **top-level** `columns:` key (a nested one inside `with:` does
not count). Then, for every `findMany` with no projection, the assigned variable's uses were scanned:
sites whose result is used **only** for `.length`.

Four candidates; one is a false positive of the scan
(`dashboard/dashboard-project.service.ts:66` — the variable the heuristic attributed comes from a
different query above and the `findMany` is the returned list, not a count). **Three are real and are
fixed:**

| site | was | now | why it matters |
|---|---|---|---|
| `e-sign/sign-envelope-validation.service.ts:42` | all **17** declared `sign_documents` columns, for `documents.length === 0` | `columns: { id: true }, limit: 1` | hydrated `sha256Hash`, `originalFileKey`, `currentFileKey` to answer "does this envelope have a document" |
| `e-sign/sign-bulk-send.service.ts:70` | all **15** declared `sign_bulk_send_jobs` columns, for `activeJobs.length >= max` | `columns: { id: true }` | hydrated the `column_mapping_json` **jsonb** of every active job to answer a quota check |
| `surveys/survey-participant.service.ts:106` | all **21** declared `survey_participants` columns, for `rows.filter(r => r.status !== "completed").length` | `columns: { status: true }` | hydrated the `metadata` **jsonb** and **`access_token_hash`** — the hashed bearer token that grants access to a survey response — into the Node heap to answer a count |

The third is the one worth naming: a count path was pulling a per-participant access-token hash across
the database boundary for every requested id. It is now the single column the count actually reads.

**Proof.** `pnpm typecheck` **exit 0**. `jest --runInBand --testPathPattern="e-sign|survey"` **exit 0,
34 suites / 211 tests passed**. Contract-neutrality was measured, not assumed:
`pnpm check:openapi-coverage` **exit 0** (1,371/1,371 mutating ops carry a body schema) and
`pnpm check:contract-breaking-change` **exit 0** (101 published operations, 3,524 internal, 23 published
webhook event names).

**Why the box still cannot close.** Re-counted at head over all of `src`: **290** `findMany` with no
top-level `columns:`, **499** `findFirst` with no `columns:`, **600** bare `.select()`. (These exceed the
previous pass's 200/456/373 because that count covered only the 33 in-scope module directories — a scope
difference, not a regression.) Distribution of `findMany`-without-`columns`: hr 83 · inventory 37 ·
e-sign 28 · surveys 23 · support 20 · build 12 · chat 11 · billing 10 · crm 7. Bare `.select()`:
hr 190 · finance 55 · crm 49 · build 39 · inventory 38 · payroll 37 · billing 31.

Two things follow. First, roughly 80% of the population sits in a module this release **excludes**
(inventory, CRM) or that another agent holds (hr, support, build, chat, billing, finance, timesheets,
accounting, invoices, notifications, workflows, storage). Second — and this is why the box is now
marked **BLOCKED** rather than PARTIAL — there is no further *measurement* that would close it.
`measure-projection-bytes.mjs` already scores any candidate (`kb-chunks-page-50` 22.07x;
`dashboard-recent-activity` 1.44x in bytes where `EXPLAIN (BUFFERS)` reports 417/417 either way). What is
missing is a product owner deciding which list endpoints may return less than they return today. Leaving
it labelled PARTIAL makes it look like unfinished measurement and routes it to the wrong person.

---

## 3. Ticket 33, box 7 — confirmed, and rewritten as an operator runbook

Confirmed at head: the code half is complete and gated.
`pnpm check:public-object-urls` → **exit 0**, 3,567 source files scanned, **9** public-base references
(all 9 declared with a stated non-minting reason), **0** upload-result `url` fields.
`pnpm check:public-object-urls:self-test` → **exit 0**. `scripts/backfill-public-object-urls.mjs` is on
disk (13.9 kB) and proven on scratch databases per the ticket.

What remains is two operator actions nobody may take from code, so the box is now marked **BLOCKED** with
the exact commands and the exact evidence that would close it (written into the ticket):

1. **Database backfill** — as the **database owner**, `node scripts/backfill-public-object-urls.mjs --url <owner DSN>`
   (dry run), then `--apply`, then a confirming dry run. **Read the exit code**: 0 means the scan was
   complete; **2** means a column sat behind an RLS policy this role does not bypass and its rows were
   *not* counted, so that output can never be read as "nothing found".
2. **Bucket policy** — remove public access (the r2.dev public development URL) from the buckets named by
   `R2_BUCKET_NAME` and `R2_KB_BUCKET_NAME` in the Cloudflare R2 console. Neither step is sufficient
   alone: rewriting a column does not invalidate a URL somebody already copied.

Closing evidence specified: the confirming dry run's
`ROWS HOLDING A PUBLIC URL: 0 … UNVERIFIABLE COLUMNS: 0` line at **exit 0**; the `--apply` run's
`ROWS REWRITTEN: n`; and an unauthenticated `curl -I` of one previously-public object returning 401/403.

**One defect fixed in the script's header.** Its docstring said `chat_attachments.file_url` "is NOT
handled here — it has its own script … which must still be run", while forty lines later the same header
said running as the owner "also covers chat_attachments.file_url". Both cannot be true, and the code is
catalog-driven with no exclusion list — the column is discovered like any other, and the separate script
is needed only when the backfill must run as the application role. An operator following the first
sentence would have run a second script unnecessarily, or worse, doubted whether the column had been
swept. The header now states the owner/app-role distinction once, correctly.

No database was connected to. No `scratch_*` database was created, read or dropped in this pass.

---

## 4. Ticket 08, box 4 — re-verified as actionable? No: BLOCKED on instrumentation

Two earlier passes marked this blocked on territory. It was re-checked because response contracts have
been worked heavily since, and the reason it is blocked turns out to be **stronger** than territory.

Measured at head:

| command | exit | number |
|---|---:|---|
| FE `pnpm exec knip --no-progress` | 1 | 1 unused file · 38 unused exports · **65 unused exported types** · 14 config hints |
| FE `pnpm check:dead-code` | 1 | **1 unclassified** — `lib/keyboard-activation.ts:nestedActivationProps` |
| BE `pnpm check:dead-code` | 1 | **1 unclassified** — `src/common/admission/admission-tenant-hint.ts:UseAdmissionTenantHint`; knip 0 unused files / 36 other findings over a 9,813-file, 68,271-edge importer graph; ledger 34 verdicts |
| BE `pnpm check:openapi-coverage` | **0** | 1,371/1,371 mutating ops carry a body schema |
| BE `pnpm check:contract-breaking-change` | **0** | 101 published operations, 3,524 internal, 23 published webhook event names |

**Every one of those instruments resolves at the granularity of a file, an export, or a type alias.
None of them resolves a field.** This box asks for unused *fields inside* request/response/DTO/Zod
schemas. Neither knip, nor the dead-code ledger, nor `tsc` (`noUnusedLocals` does not reach object or
interface members) can tell you whether a property of a live, imported, exported type is read anywhere.
So the only evidence available for a field-level removal today is a text search — which this box's own
wording and AGENT-BRIEF rule 8 both forbid as sole grounds for deletion. Closing it needs an instrument
that does not exist yet: a cross-repo property-reachability analysis over the OpenAPI schema and the
frontend hooks.

Confirming that this is not merely a naming problem: of the 65 unused exported *types* knip does report,
**62 sit in `frontend/hooks/api/**` and `frontend/types/**`**, and they are unused *aliases*, not unused
fields — removing them would not satisfy this box even if they were in reach.

The territory bar is unchanged and independent: the removal must land "as one contract change" across
backend, OpenAPI **and** frontend hooks/forms; `frontend/hooks/api/**` and `frontend/types/**` are
another agent's, the DTO-dense backend modules are another agent's, and crm/inventory are excluded.
Either blocker alone keeps the box open.

Nothing was deleted. No `.strict()` boundary was weakened.

---

## 5. Ticket 35, last box — exclusion re-verified, and one wording correction

Both gates are green at their ratchets and the entire residue is out of release scope, so it was
confirmed and left alone as instructed.

- `pnpm check:test-suppressions` → **exit 0**. 1,993 spec files · 20 suppression sites · 27 conditional
  aliases → conditional 28 (ratchet 28) · placeholder 13 · **quarantine 6 (ratchet 6)**.
- `pnpm check:transaction-callbacks` → **exit 0**. 1,978 spec files · 255 files with a transaction
  double · 453 doubles → invokes 246 · declared-unreached 7 · rejects 0 · **VOID 2 (ratchet 2)**.

The two VOID files, named by the gate itself: `src/modules/inventory/replenishment/inv-replenishment.service.spec.ts`
(`22:BARE`) and `src/modules/leads/lead-status-tenant-isolation.spec.ts`
(`36:RESOLVES-WITHOUT-INVOKING`) — inventory and leads/CRM, both excluded, both untouched.

**Correction written into the ticket.** It described the 6 quarantines as sitting "in `inventory` and
`leads`/CRM". All 6 are `describe.skip` blocks in one file, and that file is
**`src/modules/ai/core/crm-copilot.service.phase2.spec.ts`** — under `modules/ai/`, not `modules/crm/`.
The exclusion still holds (the skipped assertions target `CrmScoringService` and `CrmBriefService`), but
a reader grepping `modules/crm` for the residue finds nothing and would conclude the note was stale. The
path is now recorded so the claim is checkable.

---

## 6. Gates run in this pass

| command | exit | number |
|---|---:|---|
| BE `pnpm check:tenant-isolation` | **0** | 928 / 928 tenant-owned services declared |
| BE `pnpm check:tenant-isolation:self-test` | **0** | all checks pass |
| BE `pnpm check:tenant-isolation:run` | **0** | **450 suites / 1,847 tests passed** — the executable half |
| BE `jest --testPathPattern="org-setup-completed-tenant-isolation"` | **0** | 10 / 10 |
| BE hermetic mutation A (tenant guard) | 1 | 4 failed / 6 passed / 10 |
| BE hermetic mutation B (`.strict()` removed) | 1 | 1 failed / 9 passed / 10 |
| BE `pnpm typecheck` | **0** | 0 errors |
| BE `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| BE `jest --testPathPattern="e-sign\|survey"` | **0** | 34 suites / 211 tests |
| BE `pnpm check:openapi-coverage` | **0** | 1,371 / 1,371 |
| BE `pnpm check:contract-breaking-change` | **0** | 101 published operations |
| BE `pnpm check:public-object-urls` | **0** | 3,567 files · 9 declared · 0 url fields |
| BE `pnpm check:public-object-urls:self-test` | **0** | all checks pass |
| BE `pnpm check:test-suppressions` | **0** | quarantine 6 (ratchet 6) |
| BE `pnpm check:transaction-callbacks` | **0** | VOID 2 (ratchet 2) |
| BE `pnpm check:dead-code` | 1 | 1 unclassified, **not mine** (`src/common/admission/**`) |
| FE `pnpm check:dead-code` | 1 | 1 unclassified, **not mine** (`lib/keyboard-activation.ts`) |
| FE `pnpm exec knip --no-progress` | 1 | 65 unused exported types, 62 in another agent's territory |

`pnpm lint` — **not run**, either repo.

## 7. Cross-territory findings (not fixed)

- **BE `check:dead-code` is exit 1** on one unclassified finding,
  `src/common/admission/admission-tenant-hint.ts:UseAdmissionTenantHint` — `src/common/admission/**` is
  another agent's territory. It needs a KEEP/WIRE/REMOVE entry in `FINDING_VERDICTS`.
- **FE `check:dead-code` is exit 1** on one unclassified finding,
  `lib/keyboard-activation.ts:nestedActivationProps` — needs a WIRE/KEEP entry in `EXPORT_VERDICTS`.
  This belongs to whichever lane owns the frontend dead-code ledger, not to any of these five boxes.
- **Ticket 20's residue is 80% unreachable from any single lane.** hr alone carries 83 unprojected
  `findMany` and 190 bare `.select()`. If the projection decision is ever taken, it needs routing to the
  hr/finance/build owners as one instruction, not to this ticket.

## 8. Files changed

Backend (`streamlineos-backend`):
- `src/modules/e-sign/sign-envelope-validation.service.ts`
- `src/modules/e-sign/sign-bulk-send.service.ts`
- `src/modules/surveys/survey-participant.service.ts`
- `scripts/backfill-public-object-urls.mjs` (header correction only)

Frontend repo (`streamlineos-frontend`, scratch only):
- `.scratch/code-release-10-10/issues/20-query-projections-and-plans.md`
- `.scratch/code-release-10-10/issues/33-tenant-private-upload-lifecycle.md`
- `.scratch/code-release-10-10/issues/08-execute-schema-key-minimization.md`
- `.scratch/code-release-10-10/issues/35-bite-prove-every-gate.md`
- `.scratch/code-release-10-10/reports/43-last-open-boxes.md` (this file)

No migration, no `src/db/schema/**`, no `src/scripts/check-*.mjs`, no `.github/workflows/**`, no
`package.json`, no frontend application code.
