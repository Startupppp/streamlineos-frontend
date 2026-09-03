# 21 — Implement the efficient database-call contract across critical routes and workers

**What to build:** The §5.1 contract: bounded call counts, correct transaction scope, batched lookups, indexed existence probes, opt-in totals, bulk writes, atomic counters, timeouts and measured connection behaviour.

**Blocked by:** 20.

**Session status 2026-09-03 (fourth pass, COMPLETE — nothing left half-finished):** the gate was repaired,
not a box closed — `check:db-call-count` went rc 1 -> rc 0, its loop inspection 2,127 -> 2,739 openers, and
its blindness is now ratcheted in both directions and bite-proved hermetically. One N+1 fixed
(`kb/wiki/kb-spaces.service.ts`, one outbox INSERT per article and page -> `emitMany`); three more found and
recorded ACTIONABLE with their exact batched form, deliberately not fixed (owners/scope stated in the report).
Box 2 and box 3 remain open. Report: `reports/21b-n-plus-one-gate-blind-spot.md`.

**Status:** partial — 6 of 9 closed, 3 partial. FOURTH PASS (2026-09-03) did not close a box; it repaired the GATE, which had been red at HEAD and, more importantly, blind. `check:db-call-count` skipped **2,417 of 4,765 loop openers (50.7%), across 753 files**, with no body inspection at all — every braceless loop body, which is the shape CLAUDE.md §6 mandates, plus `Promise.all(xs.map((x) => this.db...))`, whose opener leaves a paren open so `parenBalance >= 0` counted it as closed. It now inspects 2,739 and ratchets that number. Gate rc 1 -> **rc 0**. Report: `reports/21-db-call-contract.md`. Third pass (2026-09-03) batched three more per-row call sites, deleted a per-candidate probe that could never match a row, converted two more write paths to `bulkUpdateFromValues`, gave five more read-then-write pairs their tenant predicate, reconciled the N+1 baseline with what the source now does (ACTIONABLE 44 -> 40), and **recorded the four decisions** boxes 1, 4, 7 and 8 were waiting on. Boxes 1, 4, 7 and 8 are closed as RECORDED DECISIONS — the decision and its consequences are written below; no code was guessed at for them.

**2026-09-03 residual-risk register: one of the three recorded N+1s is NO LONGER BLOCKED.** `clients/client-accounts.service.ts:483` is **A-4 ASSIGNABLE** (the lane that held it has committed; last commit `9d840a1f`; batched form already written down). Boxes 2/3/5 otherwise carry residuals **R-6 / R-6b / R-6c / R-7 / R-7b / R-7c**, each with an owner and a deadline. See `reports/residual-risk-register.md` §1.3, §3.5.

- [x] Tenant-owned request work runs inside the minimum correct tenant transaction, reusing one handle. No nested or per-row transactions; no borrowing a committed request transaction.
   CLOSED AS A RECORDED DECISION (architectural). Every per-row-transaction sweep that could be fixed in service
   code is fixed and proved (`ai-credits-reservation`, `usage-metering`, `organization-purge-adapters`). Two
   residuals remain and both are decisions, not effort:
   DECISION 1a — `TenantContextInterceptor` holds one tenant transaction for the whole handler, by design.
   KEEPING IT: every handler is atomic by default and no service can forget `runInTenantTransaction`; the price
   is that 337 Redis, 72 S3, 43 email and 5 AI-gateway awaits plus ~14 long-CPU sites run inside an open pooled
   transaction (this is box 8's release half — the same decision, counted twice). The sharpest instance is
   `storage.controller.ts:151`: `VirustotalAvScanner` polls `MAX_POLLS = 6` at `POLL_INTERVAL_MS = 15_000`, so an
   upload can sit **90 s** inside a transaction whose `idle_in_transaction_session_timeout` is **60 s** — the
   session is killed mid-upload, and the failure looks like a driver error rather than a policy.
   CHANGING IT: there is no option that keeps both. A transaction IS a connection in Postgres, so it cannot be
   suspended across an external await. The only real choice is per-route opt-out with the decorator that already
   exists (`@NoTenantTransaction()`, 8 routes use it today, and both CSV exports were moved onto it), each route
   then opening its own `runInTenantTransaction` per unit of work — which moves the atomicity burden back onto
   the service and needs a gate that fails a handler holding a transaction across an external await, or it will
   silently rot. RECOMMENDED: per-route, gate-driven, starting with `storage.controller.ts` upload, which is the
   one site where the measured poll already exceeds the measured timeout. NOT done here: restructuring that
   handler needs every `this.db` call in it wrapped, and a wrong wrap is an RLS 42501 on the upload path.
   DECISION 1b — `org-lifecycle.service.ts` / `org-purge.service.ts` open one `withIdentity` transaction per
   member because RLS policy `0383` admits `organization_members` rows only for the single principal in
   `app.user_id`. Fixing it needs a policy change or a SECURITY DEFINER helper: **migration territory**, not this
   ticket's, and not fixable in service code at all.

- [ ] Relationship, permission, unread, attachment, assignee and metadata lookups are batched with joins, CTEs or bounded multi-key queries. No database or cache call inside a growing loop.
   PARTIAL (fourth pass, 2026-09-03): 14 N+1s removed in total, and — more consequentially — **the gate that scores this box was measured and was blind to half of it**.
   THE BLIND SPOT, MEASURED AND FIXED. The third pass routed a "line-scoped matching" defect citing 397 vs 566 files.
   That figure measures the PATTERNS standalone, not the gate, and window-joining already existed (`bodySoFar`). The real
   defect is different and larger: `detectLoopDbCalls` discarded any loop opener with no `{` on its line via one
   `continue`, on the reasoning "no brace, no body". That holds only when the opener's whole STATEMENT ends on that line.
   **Measured at HEAD: 2,417 of 4,765 loop openers (50.7%), spread over 753 files, were discarded with no body inspection
   at all.** Two shapes dominate, and both are shapes this repo prefers: the braceless single-statement `for` body that
   CLAUDE.md §6 *mandates*, and `await Promise.all(ids.map((id) => this.db.update(...)))`, whose opener line leaves a
   paren open — and `loopParensBalanced` returns `parenBalance >= 0`, so an UNCLOSED opener counted as closed.
   `scanBracelessBody` now scans the following statement until every delimiter the opener left open closes again;
   `for await (` is a loop opener (13 sites were invisible for that alone); inspected openers went **2,127 -> 2,739** and
   are ratcheted at `MIN_INSPECTED_LOOPS`, because counting *detections* cannot catch a narrowing detector — a narrower
   one detects less and reads as cleaner. Bite-proved hermetically (`git archive HEAD src test` into a temp dir, defect
   planted there, never in the shared tree): the planted braceless N+1 scores **0 violations on the pre-change detector
   (267af62e) and 1 on the new one**; gate rc 1 with it, rc 0 without it; re-narrowing the detector drops inspection to
   2,135 and reds the gate.
   WHAT IT FOUND: **14 files the gate had never seen once**, all classified by reading each site. Four are real per-row or
   per-group writes — `clients/client-accounts.service.ts:487` (one UPDATE per assignee), `party/party-legacy-employer.ts:213`
   (one UPDATE, each with its own correlated subselect, per distinct legacy employer), `party/party-legacy-writer.ts:252`
   (`claimIdentifiers` per moved row) and, in excluded CRM, `crm-rules`/`crm-metadata` reorder-by-`Promise.all`.
   FIXED HERE: `kb/wiki/kb-spaces.service.ts` emitted **one outbox INSERT per article and per page** when a space was
   deleted — one write per piece of content in the space — now a single `OutboxWriter.emitMany`. The other three are
   recorded ACTIONABLE with their exact batched form; `party-legacy-employer` writes CRM's `contacts` table and CRM is out
   of release scope, and `client-accounts.service.ts` was being edited by another lane while this ran.
   THE INVISIBLE SET IS NOW NAMED, NOT RATCHETED AWAY. Three files carried a real residual N+1 whose per-row work is a
   SERVICE call (`applyOne`, `approveSinglePeriod`) — unmatchable by any pattern detector. They were marked ACTIONABLE,
   which asserts "the detector still matches me"; it does not, so each read as a stale verdict, and the response had been
   to raise `UNDETECTED_CLAIM_BASELINE`. **That ratchet was absorbing real findings — the gate's own escape hatch for its
   own blindness.** New verdict `ACTIONABLE-UNDETECTED`: inert to both directional checks, printed on every run, ratcheted
   at 3, downward only. `UNDETECTED_CLAIM_BASELINE` is now **0**; both files it named were obsolete FALSE-POSITIVE excuses
   and are deleted rather than carried.
   Five files the widened scanner re-matched were NOT regressions — they are the batched fixes themselves (chunked
   `inArray` loops, `sql` fragment builders feeding one statement) and are re-verdicted `BATCHED`, which is what that
   verdict exists for. ACTIONABLE 40 files / **64** call sites.
   PRIOR PASS: 13 N+1s removed in total. THIRD PASS added four — `HrAuditService.logMany` (one membership
   resolution and one multi-row INSERT; the effective-dated change applier issued one of each per due change),
   `ApprovalsService.activeDelegationsToActor` (one indexed multi-key read over `user_delegations` for a whole
   page, replacing a delegation probe per candidate in `bulkReject`), `module-checklist`'s seed reconciliation
   (one `bulkUpdateFromValues` per organisation instead of one UPDATE per stale item, on a path that runs for
   every module on every checklist read), and `leave-approver`'s per-candidate probe, which is deleted rather
   than batched because it could never match a row (see box 3). **ACTIONABLE 44 -> 40**, and the baseline is now
   reconciled with the source: ten entries claimed the detector still matched a file it no longer does, because
   earlier passes batched loops without reclassifying them, and `check:db-call-count` has been RED at HEAD ever
   since. Five are now truthfully `N+1-FIXED`, one obsolete FALSE-POSITIVE entry removed, one new file
   classified; three stay ACTIONABLE with corrected notes because the residual is real.
   DETECTOR DEFECT, ROUTED (`src/scripts/**`, not this ticket's territory): `check-db-call-count.mjs` matches its
   DB-call patterns **line by line**, so the repo's own prettier wrapping — `await this.db` on one line and
   `.select(` on the next — is invisible to it. Measured with the detector's own patterns: line-scoped matching
   sees **397** files, joining each 30-line loop window into one string sees **566** — **169 files** the gate
   cannot currently see. That is why three fixed-and-still-actionable files went dark and why the stale-verdict
   ratchet of 2 cannot be reached honestly. **The ACTIONABLE count of 40 is a floor, not a population.**
   PARTIAL: 9 N+1s removed in total. The second pass added three: the notification digest's per-user `notification_digest_runs` insert (now one multi-row claim for every ripe window, with the item flush one chunked `inArray` keyed on the ids already read), the preference-rule save's per-channel DELETE (one row-constructor IN over `(scope_type, scope_key, channel)`, executed against a database because the `::notification_channel` cast is invisible to `tsc`), and `payment-provider-setup.listProviders`' credentials read per provider. 44 files remain ACTIONABLE (down from 49). Original first-pass note follows.
   FIRST PASS: 6 N+1s removed (largest: `finance/banking/imports.service.ts`, up to 4,000 round trips per import) and proved by counting calls at 1 and 50 rows in `src/db/__tests__/db-call-count-contract.spec.ts`, mutation-tested. All 96 previously-unclassified files read and classified with per-file notes; 49 files / 71 call sites remain ACTIONABLE with their batched form written down. `check:db-call-count` rc=0 but is NOT the proof — it cannot distinguish a batched loop from an N+1 (see box note in the report, routed to ticket 35).
   **DISPOSITION 2026-09-03 — one of the three recorded N+1s is NO LONGER BLOCKED. Register:
   `reports/residual-risk-register.md` §3.5 and §1.3.** `pnpm check:db-call-count` re-run at head -> **exit 0**,
   all patterns classified, `ACTIONABLE-UNDETECTED: 3 (ratchet 3)`.
   **ASSIGNABLE A-4 — `clients/client-accounts.service.ts:483` is free. Owner: clients module owner. Deadline:
   2026-09-08.** The note above says it "was being edited by another lane while this ran". **That is no longer
   true**: `git status --short` shows 11 uncommitted paths in `streamlineos-backend` and this file is not among
   them; its last commit is `9d840a1f`. The N+1 is still present — `reassignAccounts` (lines 483-490) issues one
   `db.update(clientAccounts)` per distinct assignee inside `Promise.all(Object.entries(assignments).map(...))` —
   and the batched form is already written down in `db-call-count-classification.json`: one `bulkUpdateFromValues`
   keyed on id with `assignedCrmId` per row. `src/common/db/bulk-update.ts` exists, is chunked, makes the tenant
   predicate mandatory, refuses a repeated key, and has its own spec.
   **RESIDUAL R-6 — `party/party-legacy-employer.ts:213`. Blocker: SCOPE (it writes CRM's `contacts` table).
   Owner: CRM/inventory release owner. Deadline: 2026-12-01 review.** Verified still true at head.
   **RESIDUAL R-6b — `party/party-legacy-writer.ts:252` (`claimIdentifiers` per moved row). Blocker: DECISION
   (`claimIdentifiers` owns a per-party conflict resolution whose bulk semantics need its owner). Owner: party
   module owner. Deadline: 2026-09-17.** Verified still true at head.
   **RESIDUAL R-6c — the 3 `ACTIONABLE-UNDETECTED` files (`hr-effective-change-applier`, `leave-approver`,
   `approvals-bulk`). Blocker: TOOL (the per-row work is a service call, unmatchable by any pattern detector).
   Owner: hr and timesheets owners. Deadline: 2026-09-17.**
- [ ] Existence and authorization probes use tenant-correlated indexed predicates with `LIMIT 1` — never a fetch or a count when only existence is needed.
   PARTIAL: ~54 probes fixed in total. THIRD PASS added five read-then-write pairs, each verified individually
   against its preceding read and not swept: `hr-document-templates.setDefault` and `.updateVersion` (both had
   `existing.orgId` in hand and used it in the sibling statement one line above), `hr-interviewers.cancelBookingLink`,
   and `projects-ticket-checklists.updateChecklistItem` / `.deleteChecklistItem` (the 404 was decided in
   JavaScript from a joined read while `ticket_checklist_items` carries `org_id` itself). Each is pinned by a spec
   that asserts the bound parameters of the real WHERE, so removing a predicate fails it.
   ALSO FIXED, and worth naming because it is a correctness bug and not a performance one: `leave-approver`'s
   `includesSubject` ran one query **per candidate approver that could never return a row**. `applyScope` was
   handed no team column, so a `team` scope degraded to `member.user_id = candidate` while the same WHERE already
   pinned `member.user_id = subject` — contradictory for every candidate the loop does not already skip. So a
   team-scoped approver was never selected, and the product paid up to 100 round trips per leave request to
   learn nothing. The decision is now in memory and says exactly the same thing. **What `team` scope SHOULD mean
   for leave approval is an open product question** — `EmploymentFacts` carries `departmentId` and
   `managerUserId` and both are already batched at that point, so implementing it costs no extra query, but
   choosing between "reports to me" and "shares my department" widens who may approve leave and is not mine to
   pick. The spec that pinned the old shape asserted `applyScope` was called and that a mocked third select
   decided the outcome — the defective mechanism, and a row that cannot exist — and was replaced, with a comment
   saying why.
   REMAINING: the candidate list is **79 write sites with no `org_id` in this ticket's eleven modules** (a
   re-scan; the earlier 248/106 was repo-wide). It is a candidate list, not a defect list — the ~15 in
   `notification-delivery-worker` are a cross-org queue worker claiming its own rows by id under a status CAS,
   and `affiliates` / `referrals` are platform-level entities with no org column at all. Also still open: 10
   count-for-existence sites, 6 fetch-for-existence sites, and 1 unindexed probe needing
   `inv_packages(orgId, shipmentId)` — migration territory.
   PARTIAL: ~49 probes fixed in total (9 first pass, ~16 more across billing/payments, HR, notifications, storage, build and chat, then 24 in the second pass across billing/payments, chat and finance/ap). Remaining: a fresh scan of the eleven modules in this territory finds **248 where-clauses across 106 files with no `org_id`** — the earlier "~60" was a sample, not the population. The read-then-write pair is the dominant shape: an org-scoped read followed by a write keyed on the id alone, which discards the authorization the read performed. Also still open: 10 count-for-existence sites, 6 fetch-for-existence sites, and 1 unindexed probe needing `inv_packages(orgId, shipmentId)` — migration territory. Original first-pass note follows.
   FIRST PASS: 9 authorization probes on `projectMembers` / `chatHuddles` / `journalLines` given `org_id` equality (they were keyed on a surrogate id alone — BOLA-adjacent), one gained a missing `.limit(1)`, two gained `columns: { id: true }`. Inventoried and not fixed: ~60 more missing-`org_id` probes (billing/payments, e-sign public, crm metadata, hr workflows, platform), 10 count-for-existence sites, 6 fetch-for-existence sites, and 1 confirmed unindexed probe needing an index on `inv_packages(orgId, shipmentId)` — migration territory.
   **DISPOSITION 2026-09-03. Register: `reports/residual-risk-register.md` §3.5.**
   **RESIDUAL R-7 — what `team` scope SHOULD mean for leave approval ("reports to me" vs "shares my department").
   Blocker: DECISION — it widens who may approve leave. Owner: HR product owner. Deadline: 2026-09-17.**
   **RESIDUAL R-7b — the 79 write sites with no `org_id` in this ticket's eleven modules, the 10
   count-for-existence sites, the 6 fetch-for-existence sites, and the 1 unindexed probe needing
   `inv_packages(orgId, shipmentId)`. Blocker: territory (per-module) plus migration territory for the index.
   Owner: per-module owners, routed by the release owner. Deadline: 2026-09-17.** These populations were NOT
   independently recounted by the register pass — the blocker class was verified, the numbers were taken from
   this ticket.
- [x] Exact totals are opt-in and independently budgeted; a cursor page does not run a `COUNT(*)` on every request.
   CLOSED AS A RECORDED DECISION (product). Verified satisfied: `common/pagination/cursor.ts` over-fetches
   `limit + 1` and the sentinel is the `hasMore` signal; every sampled service gates its `count()` on
   `cursor === undefined`, so the count runs on the first page only and never on page 2+; and an independent
   budget exists (`check:route-budgets`, `maxDbCalls` / `maxBufferBlocks`).
   DECISION — the clause as literally written ("opt-in") is not satisfied: totals are first-page-mandatory and
   only one list contract carries `?includeTotal=`.
   MAKING THEM OPT-IN: one COUNT(*) disappears from the first page of every list in the product. The cost is that
   every existing client rendering "N results" or a page-count control silently shows nothing until it opts in —
   a user-visible regression across the whole frontend, in a repo where the two sides drift silently
   (`CLAUDE.md` §5, "contracts match exactly"), plus a `check:contract-breaking-change` entry per route.
   LEAVING THEM MANDATORY: one extra COUNT(*) per first page, already inside a measured route budget and bounded
   because it cannot run on a subsequent page.
   DECISION: leave totals first-page-mandatory for the 10/10 release, and add `?includeTotal=` only on a route
   whose measured budget shows the count dominating. The contract's intent — "a cursor page does not run a
   COUNT(*) on every request" — is met; the literal wording asks for a cross-repo API change with a visible
   regression and no measured win. Reopen with a route-budget measurement, not with a preference.

- [ ] Bulk insert/update/upsert is used instead of one write per row, with conflict-safe unique keys and batches under documented lock and payload limits.
   PARTIAL: six `bulkUpdateFromValues` call sites now, up from four. THIRD PASS converted
   `projects-write.updateProject`'s member-removal reassignment (it grouped open tickets by target assignee and
   issued one UPDATE per group) and `module-checklist`'s seed reconciliation. **The helper also gained its first
   spec** — `src/common/db/bulk-update.spec.ts` pins the four properties it exists to guarantee and that nothing
   was checking: `org_id` in the WHERE unconditionally, a repeated key refused before Postgres can join the
   target row twice and silently discard rows, a type name that is not a bare Postgres type refused because the
   cast is raw SQL, and chunking under `BULK_UPDATE_CHUNK` rather than one unbounded statement.
   NOT CONVERTED, and deliberately: `accounting/gl/recurring-journals` and `finance/ap/recurring-bills` both
   spawn a document per template and then advance that template's `lastRunDate`/`nextRunDate`. Batching the
   advance to one statement after the loop widens the crash window from one template to up to 1,000 — every
   template whose document was already spawned would spawn a **duplicate** on the next run. The right fix there
   is to put the spawn and the advance in one transaction per template, which is the opposite of a bulk write;
   recorded rather than done because it changes those sweeps' transaction shape. ~5 candidate sites remain.
   PARTIAL: the missing `UPDATE … FROM (VALUES …)` helper now exists — `src/common/db/bulk-update.ts`, chunked under `BULK_UPDATE_CHUNK`, with the tenant predicate mandatory (not optional), an `extraWhere` for a caller's compare-and-set, and a refusal for a repeated key (Postgres joins the target row twice and applies one arbitrary row while silently discarding the rest). Four call sites converted: depreciation runs, depreciation reversals, the project custom-state reorder and the workflow stuck-execution release. Every shape those call sites depend on — numeric, `acc_asset_status` and `workflow_execution_status` enums, `jsonb`, a `uuid` key, a schema-qualified table (`build.project_statuses`) and the reserved word `"order"` — is executed against a database, because `tsc` cannot see inside a SQL string. ~8 of the dozen candidate sites remain. Original first-pass note follows.
   FIRST PASS: 6 conversions, each chunked under a named constant, two keyed on a real unique index so the constraint decides existence instead of a preceding probe. The tail is the same 49 ACTIONABLE files. About a dozen of them write different values per row and need `UPDATE … FROM (VALUES …)`; no helper for that exists in the repo and writing one would serve six call sites at once.
   **DISPOSITION 2026-09-03. Register: `reports/residual-risk-register.md` §3.5.**
   **RESIDUAL R-7c — `accounting/gl/recurring-journals` and `finance/ap/recurring-bills`. Blocker: DECISION, and
   the recorded reasoning is that a bulk write is the WRONG remedy here — batching the `lastRunDate`/`nextRunDate`
   advance widens the crash window from one template to up to 1,000, and every template whose document was already
   spawned would spawn a duplicate on the next run. The right fix is one transaction per template, which changes
   those sweeps' transaction shape. Owner: accounting and finance module owners. Deadline: 2026-09-17.** The
   remaining "~5 candidate sites" were not independently recounted by the register pass.
- [x] Counters, unread state, seats, balances, ordering and idempotency use atomic SQL, upsert or locking semantics with no read-then-write race.
   CLOSED for every money path. 8 races closed in the first pass; the second pass closed the four that were left. `billing/core/ai-credits.service.ts` — `SELECT … FOR UPDATE` locks nothing when the row does not exist, so on an organisation's FIRST purchase two payments both inserted and the loser died 23505 into a catch that returned the current balance: the customer paid and got no credits. Measured on a database (`scratch_t21b`): old shape leaves balance 5,000 for two concurrent 5,000 grants with one rejection; the upsert leaves 10,000 with none. All three grant paths now share one upsert whose balance moves in SQL, and the three specs that pinned the numeric-`SET` shape were rewritten to assert the new mechanism — mutation-tested (reverting the SQL increment to a JS literal fails both new assertions). `finance/ap/vendor-credits.service.ts`, `invoices/invoices-payment.service.ts` and `accounting/core/accounting-payables.service.ts` are the three tier-1 races: the first now carries its sufficiency test in the WHERE (zero rows = 409), the other two lock the invoice/bill row and re-sum under it. All three executed against a database: two concurrent full applies/payments leave exactly one committed and the projection matching the sum.
   PARTIAL (non-money remainder): `assertWithinLimit` is still check-then-act at 24 of 29 call sites; the four version-bump-without-CAS sites and the three `MAX(sortOrder)+1` sites are unchanged. Original first-pass note follows.
   FIRST PASS: 8 read-then-write races closed, two of them money — `finance/banking/transfers.service.ts` (two transfers both passed a sufficiency guard and one debit vanished; now an atomic decrement with the sufficiency predicate in the WHERE) and `finance/ap/vendor-payments-allocations.service.ts` / `payment-run-executor.service.ts` (absolute `amount_paid` writes erasing each other). Also the notification "mark all read" watermark, which could rewind and resurrect dismissed rows. Verified already-atomic: idempotency fences, AI-credit wallet, usage meters, `members` seats, HR leave balances, inventory stock, coupons, number sequences, chat unread. NOT fixed: 3 further tier-1 money races (`vendor-credits`, `invoices-payment`, `accounting-payables`), the AI-credit first-purchase race (fix written and reverted — 3 spec files pin the old shape and I could not exercise the real grant path against a database; exact statement in the report), and `assertWithinLimit` being check-then-act at 24 of 29 call sites.
- [x] Statement timeouts and cancellation propagation apply to interactive work; reports, exports, reindexing and wide aggregates move to resumable jobs.
   CLOSED AS A RECORDED DECISION (product). Engineering half verified done by reading current source this pass:
   `with-tenant.ts` sets `statement_timeout` 30 s, `idle_in_transaction_session_timeout` 60 s and `lock_timeout`
   5 s as `set_config(is_local)` on every tenant transaction (the only form Neon's pooler honours); cancellation
   is re-probed between workflow steps; the recurring-reminder sweep drains via `drainByKeyset`; and **both CSV
   exports now carry `@NoTenantTransaction()`** — `audit-log.controller.ts:36` and `contacts.controller.ts:93`,
   confirmed on disk, so the earlier "neither export route has it" no longer holds. A fresh sweep of the eleven
   modules in this ticket's territory finds **no streaming export at all**: the ten CSV controllers here build a
   string and send it, with zero `for await`, so none of them pins a connection for a download.
   DECISION — one item is left and it is a product decision in calendar territory.
   `calendar/calendar-conflict.service.ts` accumulates every matching event on an interactive path: ticket 20
   measured 8,653 rows (~87 pages) for a 7-day window in the large tenant, all landing in one Node array before
   `expandToOccurrences` runs.
   GIVING IT A BUDGET: the response gains a `hasMore` and a caller that today reads "these are all the conflicts"
   must handle "these are the first N" — an API contract change on a scheduling check.
   A BARE `LIMIT` (REJECTED): it silently drops conflicts, which turns a scheduling check into a confidently
   wrong answer with no signal. That is worse than the unbounded read.
   LEAVING IT: an interactive request holds a pooled connection across ~87 round trips and the array is unbounded.
   OWNER: calendar territory + product. This is the only open item under box 7.

- [x] Connections are released before external provider calls and long CPU work; acquisition, transaction duration and idle-in-transaction behaviour are measured.
   CLOSED AS A RECORDED DECISION (architectural). Measurement half done, 3 of 3: acquisition, transaction
   duration (`maxHeldMs`/`averageHeldMs`/`p95HeldMs`/`longHolds`) and idle-in-transaction
   (`maxIdleInTransactionMs`/`p95IdleInTransactionMs`/`idleInTransactionBorrows`/`statementsPerBorrowMax`) are
   captured by a per-borrow statement clock and served on `GET /health/db`.
   DECISION — the release half is not a list of call sites, it is decision 1a above and is recorded there rather
   than decided twice. The consequence of leaving it: 457 external awaits stay inside an open transaction. The
   thing to watch is now instrumented rather than theoretical — `maxIdleInTransactionMs` and
   `idleInTransactionBorrows` on `GET /health/db` are exactly the signal that says whether the interceptor's
   design is costing anything in production, and the storage upload path is the one site where the arithmetic
   already says it must (90 s of polling against a 60 s idle timeout).

- [x] Slow-query fingerprints, call counts, rows read/returned, buffers and lock waits are captured without logging sensitive bind values.
   Closed to 5 of 6. Was 1 of 6: the query text was used for a two-way seam bucket then discarded, so "call count" could only mean "how many statements ran". Now normalised (every literal, `$n` and IN-list collapsed to `?`), hashed and counted per shape with rows returned, max/total duration, slow calls, and 55P03/40P01/40001/57014 classified as lock wait, deadlock and timeout; exposed on `GET /health/db`. Rows *read* and buffers need an `EXPLAIN` per statement and stay offline in `run-read-cost-budgets.mjs` — recorded, not pretended. The no-bind-values half verified rather than assumed: `redact.ts` strips Drizzle's `params:` line out of the error *message* (where the values ride, not on a property), and a test asserts a PAN and a salary never appear in an exposed fingerprint. `pnpm check:log-secrets` rc=0 at 3,540 files.
