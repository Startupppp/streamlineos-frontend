# Pending work — consolidated

**As of 2026-09-21.** A single index of everything still open, gathered from four lane
documents that had grown overlapping and in places contradictory.

**This is an index, not a replacement.** The lane documents below still hold the measurements
and per-item derivations, and `2026-09-21-session-handoff.md` §6 names them as the evidence
store. Read the source before reversing anything in §9.

| Evidence lives in | For |
|---|---|
| `2026-09-20-deferred-items-lane.md` | Every deferral premise re-test, the migration closeout, dead-code classification |
| `2026-09-20-connection-hold-remediation-prd.md` | H1–H21 measurements and the frozen-route reasoning |
| `2026-09-20-get-route-writes-lane.md` | The writing GET routes and `check:get-route-writes` recall limits |
| `2026-09-20-architecture-review-html-closeout.md` | The six architecture reviews' items, item by item |

**Companion documents:** [`2026-09-21-session-handoff.md`](2026-09-21-session-handoff.md) for
state up to the migration closeout, and
[`2026-09-21-migration-repair-handoff.md`](2026-09-21-migration-repair-handoff.md) for the
production break, the billing-webhook fix and the rollback work done later the same day.

---

## 1. Blocked on you

| # | Item | Why it needs you |
|---|---|---|
| 1 | **`git push` both repos** | Repo rules make git orchestrator-only; I may commit, never push. Backend and root both have unpushed commits. |
| 2 | **List-view consolidation — name the pages, or drop it** | The observation ("~222 pages improvise") may stand; the *named repair* was refuted. Moving the `filter-*` cluster relocates a Build-specific module with one external consumer and makes its name less accurate. Real work is migrating two or three genuinely duplicating pages onto one implementation — a product call about which pages. |
| 3 | **The four synchronous send-test routes** | `automation#testAutomation`, `support-automations#testAutomation`, `projects-webhooks#sendTest`, `feedbucket#analyzeSubmission` hold a pooled connection to show the user a live delivery result. Whether that result is worth the connection is a product decision per route, not a blanket opt-out. |
| 4 | **Notifications email-predicate widening** | Needs the notifications owner's call on the predicate. |

---

## 2. Gates currently red

None of these are from my work; each is attributed.

| Gate | State | Owner |
|---|---|---|
| `check:migration-discipline` | Exits 1 — `1134_qa_keyset_cursor_indexes.sql` has no journal entry, so `db:migrate` skips it while printing success | Another session, in flight |
| `check:migration-chain` | Exits 1 — same 1134, plus two pre-existing: duplicate prefix `1090` (`1090_inv_quality_hold_stock_grain` / `1090_subscription_purchases`) and the `0619` timestamp regression | Pre-existing + another session |
| `pnpm exec eslint` | 9 errors, all in `src/scripts/*.mjs` (census-dead-sqlstate-checks, census-unasserted-body-locations, check-navigation-permissions, check-openapi-coverage, rehearse-migration-rollback, run-read-cost-budgets, seed-envelope, seed-perf-scratch) — all tracked and unmodified | Another session's committed scripts |
| `check:type-assertions` | Exits 1 — `jwt-keyring.service.ts` grew 1 → 8 assertions from a live edit to JWT signing; one is `JSON.parse(...) as SerializedKeyEntry[]` that should be a Zod parse. Plus pre-existing unledgered classes: 20 double-cast files, 85 raw-row files, 187 unledgered assertion files | Another session's in-flight edit |
| `check:migration-ledger` | Cannot run locally — it uses password auth and production is IAM (`PAM authentication failed`). Runs in `db-gates.yml` with a password URL; `ci.yml` runs only its self-test | Environment |

The `0619` regression (`when=1787895425277` ≤ `0271a_waitlist_admission`) is harmless while every
applier iterates the journal array and guards by file hash, and **fatal the moment one selects by
`created_at` watermark** — which is why `check:watermark-free` exists.

---

## 3. Production and database

- **869 journal entries sit below the applied watermark with no ledger row.** They *are* applied;
  they are simply unrecorded. Nothing is pending (watermark `1803000010350`, 0 above it, 0 orphans,
  0 duplicates). The real residual is **cold-rebuild divergence**: a database built from the chain
  would differ from production. Not fixable one object at a time.

- **`0466` must never be applied without `0467`.** `0466_drop_legacy_accounting` drops 45 tables and
  the last two — `fin_expense_policies`, `fin_reimbursement_batches` — are live employee-expense
  tables, not accounting. This bit on 2026-09-21: applying `0466` alone broke
  `modules/expenses/lib/expense-policy-rules.ts`. Recovery is `0467 → 1098 → 1101 → 1116 → 1118`,
  because `0467` rebuilds the *original* shape and reinstates single-column FKs the later migrations
  retired. **Open question for you:** whether `0466`'s drop list should be narrowed so a cold rebuild
  cannot repeat this.

- **`uniq_ai_action_proposals_org_id` exists in production with no migration that creates it.**
  Writing one now would fail `42710`. Production was built partly by push/bootstrap, so "no migration
  creates it" says nothing about whether it is there. Same cold-rebuild class as the 869.

- **`accessMode: "read only"` is still not safe to flip** (`with-tenant.ts:188`). The 17 GET-route
  writes are fixed, but the audit that found them resolved `this.prop.method()` call graphs only three
  hops deep and misses raw-SQL DML, `SELECT ... FOR UPDATE`, and outbox emits. Needs a production
  signal over a full week including a deploy — not another code change.

---

## 4. Code work, ready to pick up

| Item | Detail |
|---|---|
| **`GET /payroll/.../:batchId/export` → `POST`** | It stamps `exportedBy`/`exportedAt` and emits `payroll.journal_batch_exported`. A prefetch, double-click, retry or link scanner fires it with no human downloading anything — an audit-integrity bug on a payroll batch. Frontend contract change → two-repo lane. |
| **H5 — org sweep runs on every replica** | It left the boot path but still runs everywhere. Needs a lease. No reusable primitive exists; session-scoped advisory locks over a pool are not safe as-is. |
| **H12 — 50 periodic sweeps have no budget** | Including all 38 under `modules/cron/`. ⚠ The obvious fix is harmful: a default budget on `forEachOrg` silently truncates sweeps with no durable cursor, so they restart at the first org each tick and the tail is never reached. Making `stopWhen` required is also wrong — one-shot administrative callers legitimately want every org. Genuinely per-caller work. `check:sweep-budget` holds the ceiling at 50. |
| **H4 — third webhook dispatcher** | `modules/build/core/projects-webhooks-dispatch.service.ts`, unaudited. Determine whether it repeats the transaction-hold / TOCTOU-SSRF defects the automation copy had. ⚠ `build/` carries another session's uncommitted work — **audit read-only**. |
| **2 of the 8 frozen routes** | `notifications-dispatch#dispatch` and `feedbucket#createTicketFromAnalysis`. ⚠ **Both prerequisites have moved** — H20 fixed the outbox scope resolution the first was waiting on, and the idempotency-fence claim for the second was retracted. Re-read before picking up; the recorded reason is no longer the reason. (`webhooks#retryLog` and `support-reports#getOverview` are settled, needing no work.) |
| **ask-os F-07** | Needs a decline endpoint and a token-bearing reload path. |
| **ask-os F-10** | Needs windowing, on an established in-repo pattern. |

---

## 5. Deferred, each with a re-open threshold

Do not re-open these without the trigger firing.

| Item | Threshold |
|---|---|
| **`chat_messages` partitioning** | Re-open at **~10M rows or ~10 GB**, and re-measure before designing. Today it holds **14 rows**; the largest table in production is `role_permission_grants` at 27,808 rows / 13 MB and nothing else exceeds 900. Partitioning now would force the partition key into every PK, UNIQUE and inbound FK to optimise a 14-row scan. |
| **`MAX_CAPABILITY_CHANNELS = 500`** | Re-open when any org passes **~400 channels per member**. "Silently" was wrong and it is unreachable by the route as written. |
| **Ownership-transfer lifecycle across three services** | Deferred; only part of it was ever real. |
| **`rich-text-content.tsx` has no Plate branch** | YAGNI until a **second** consumer of Slate rendering exists. The premise is true but the obvious repair was implemented and reverted: it duplicated `renderSlateLeafNode` from `features/wiki/components/public-page-content.tsx:141` verbatim, and `RichTextContent` has exactly one caller which passes Tiptap HTML, so the branch could not execute. When a second consumer appears this is a **structural move** — lift the Slate renderers into a neutral home — not an addition, because `components/` may not import `features/wiki/`. |
| **Three leading-wildcard `ILIKE` searches** | `org-membership-read`, `chat-search`, and the chat title match. Each needs the same five-condition `SECURITY DEFINER` + `pg_trgm` treatment, with a migration measured in buffers on a live database. |

---

## 6. Needs a live environment

No local Postgres, Redis or Docker on this machine — 5432, 5433 and 6379 all refuse.

- Every chat-os item requiring a live stack.
- **chat-os P4-6** — reopened. Source and the live census disagree and nothing static can settle it.
  Needs a raw-SSE census on a stack built from backend `448c4e25b` or later.

---

## 7. Re-filed successors

Different problems from the items that produced them, so they are tracked separately rather than
left inside a closed item.

1. **`ticket_participants` redesign.** Even project-narrowed, the My-work page costs 11,121 buffers
   and discards 40,000 rows. This is a data-model problem, not a query problem.
2. **A directory-owned, name-searchable and name-sortable query method for salary profiles.**
   `salary-profiles.repository.ts` cannot use the person seam today because `profileSortName` drives
   the `ORDER BY`, six search `ilike`s and the keyset cursor predicate.

---

## 8. Module acceptance backlog — 1,279 unchecked

These are **normative acceptance references**, not an agent queue. The completion plan
(`architecture-refactor/prd/completion-plan.md`) designates them as such, and the active Build
execution ledger has zero open boxes.

| Group | Unchecked |
|---|---|
| `build/` | 657 |
| `hrms-module/` | 360 |
| `documents-module/` | 261 |
| `2026-09-18-chat-os-prd.md` | 1 |
| **Total** | **1,279** across 69 files |

Largest single files: `build/module/10-release-verification` (80),
`build/sidebar/05-release-verification` (55), `build/module/06-data-performance` (49),
`build/module/README` (46), `build/module/07-architecture-integrations` (44).

Say the word if you want these scheduled; I have not treated them as a backlog to burn down.

---

## 9. Closed — do not re-raise

Kept because each was closed by a *refutation* or a measurement. Re-raising any of these costs the
same work again.

| Item | Verdict |
|---|---|
| **"My work" three-OR-branch UNION split** | **REFUTED by measurement.** 200k seeded tickets: the UNION split costs **157,565 buffers against the current 555 — 284× worse**; its bounded form is 70× worse on the project page. The §7 premise does not even hold — `tickets.reporter_id` has no index at all. |
| **`payslip_templates` unique index on `(org_id, layout)`** | **The proposed fix was wrong.** `create()` deliberately allows several templates per layout, so that index would 23505 a legitimate action. The true invariant is one *default* per org — shipped as `1132`, bite-proven that same-layout non-default templates are still accepted. |
| **171 direct `process.env` reads** | Both halves wrong. Real count outside config/scripts/tests is **94**, and a `no-restricted-syntax` gate already existed. Its actual defects were narrower and worse. Closed; ratchet baseline **62**. |
| **56 knip findings + 18 duplicate exports + `po-lifecycle.ts`** | Resolved to **one** deletion (`stopImpersonationSchema`). The 18 "duplicates" were never work: each is a per-route contract name bound to a shared row model, live via `@ResponseSchema`. Collapsing them would merge separate route contracts into one name. |
| **ask-os 11.1 "directive column needs a migration"** | **False.** Directives are not a column — `serializeDirective()` appends `CONFIRM_ACTION:{…}` lines into `ai_chat_messages.content`, `text NOT NULL` since `0000`. |
| **"Impersonation is never recorded in any audit log"** | **Retracted.** The setter *is* called, by `ImpersonationContextInterceptor.intercept` (`impersonation-context.interceptor.ts:20`), registered before `TenantContextInterceptor`. |
| **`sendToChannelMembers` awaits N pushes** | Obsolete on both counts. |
| **No Postgres safety net on email canonicalization** | Obsolete — the net already exists. |
| **`team` DataScope** | Withdrawn. `apply-scope` fell back to the caller's own rows whenever `teamIds` was absent and the only runtime caller never supplied it, so a `team` grant silently returned `own` rows. Migration `1131` deleted the 57 standing offers. `broadest()`'s `none < own < team < all` ordering is deliberately untouched. |
| **H6 container heap** | Not a defect. `start:prod` is used only by the local runner; the container's flagless `CMD` lets Node size its heap from the cgroup limit, which is correct. |
| **H4 third webhook dispatcher is a duplicate** | Not a duplicate — keep. (The audit in §4 is still owed.) |
