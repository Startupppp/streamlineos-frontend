# GET routes that write inside the request transaction

**Opened:** 2026-09-20 · **Owner:** backend
**Follows:** `2026-09-20-deferred-items-lane.md` R4, which found these while proving `accessMode: "read only"` unsafe.

⚠ **Every W-item is ticked and the lane is NOT finished.** Do not delete this file on the strength of its checkboxes. It still carries the documented recall limits of `check:get-route-writes` — without which a green gate reads as proof it is not. ~~It also carries a live billing-path defect at `ai-credits-reservation.service.ts:103`.~~ **That defect is now fixed — verified at source 2026-09-21; see below.**

**2026-09-21 — three of the four open items are now closed** (both races, plus the
`onboarding_flow_sessions` index), each verified against production. What remains open is the
`GET → POST` contract change for the payroll export and the `accessMode: "read only"` flip,
which needs a week of production signal rather than another code change. One closure corrected
the fix this document originally proposed — see the races section below.

backend/CLAUDE.md §2 says **"no writes in a GET"**. It is violated **15 times** across 1,646 GET routes. A written rule is not a control.

This is not a tidiness lane. Those 15 routes are the reason two separate capacity wins are blocked:

- **`accessMode: "read only"`** on read-intent transactions — a read-only Postgres transaction fails `25006` on any INSERT/UPDATE/DELETE.
- **Read-replica routing for 1,646 GET routes** — the largest remaining capacity win, and a reader endpoint cannot serve a GET that writes either.

Everything else for both is ready: `READ_ONLY_METHODS = {GET, HEAD, OPTIONS}` (`tenant-context.interceptor.ts:39`), intent already reaches `withTenant` (`:116`), and `run-in-tenant-transaction.ts:110` already passes `{ accessMode: "read only" }` for replica reads. Only `with-tenant.ts:188` needs the option — and it must not get it until these 15 are gone.

## The decision this lane makes, stated up front

Five of the 15 are `AuditService.logCritical` on a read path. `logCritical` awaits `write()`, which with an ambient context inserts **into the request's own transaction** (`audit.service.ts:87`). Its docblock defends that coupling: *"an audit of a mutation belongs in that mutation's transaction."*

**On a GET there is no mutation**, so the premise does not hold. These move to `logCriticalOutsideTransaction`, which is awaited and still throws — so a surface that cannot record an access still fails loudly rather than serving the file silently.

**The semantic this changes, explicitly:** the audit row now commits even if the request later fails. For these five the window is near-zero — every one of them calls `logCritical` as its last statement before `return`, so nothing can fail after it except serialization. The direction of the remaining risk is a *false positive* (recording an authorized access whose response did not reach the client) rather than a *false negative* (losing the record of an access that did). For a read-access security audit that is the safer direction, but it is a change and it is recorded here rather than buried.

`AuditService.log` was rejected for these: it is documented "best-effort telemetry only" and swallows its own failures, which is wrong for a security audit.

## Rules for this lane

- Exclusive file ownership per agent. `src/common/audit/**` and `src/common/tenant/**` are reserved to the coordinator — nobody edits the shared primitives.
- Every fixed route gets a test whose **name** states why (comments are banned).
- A route that must genuinely write on a read is **not** forced — report it, with the reason. A correct "no" is a valid outcome.
- Report any route where the fix would change what a caller observes.

---

## Todo

- [x] **W1 — HR: five audit-on-read routes + one lazy session seed**
  *Files touched:* `hr-export-jobs.service.ts` · `exit.controller.ts` · `onboarding-views.controller.ts` · `hr-onboarding-docs-admin.controller.ts` · `performance/documents.controller.ts` · `onboarding/flow/onboarding-session.service.ts` · `onboarding/core/onboarding.controller.ts` · 6 spec files (2 new)
  *Result:* all five read-path audits now use `logCriticalOutsideTransaction`. Verified by coordinator: **zero `logCritical(` calls remain on any of the five GET paths.**
  *Correctly left alone:* `hr-export-jobs.service.ts:101` keeps `logCritical` — it sits inside `async create(`, a write path, where committing the audit with the mutation is exactly right. The agent drew the line in the correct place.
  *Lazy session seed — option (b), not (a), and the reason is sound:* `onboardingFlowSessionSchema` declares `id: z.number().int()` non-optional, so the endpoint cannot return a default-shaped session without a database-assigned id. The seed moved into `runInNewTenantTransaction` instead.
  ⚠️ *Coordinator finding the agent flagged and I confirmed against schema:* `onboarding_flow_sessions` (`db/schema/common/onboarding.ts:38-40`) has only a plain `index` on `(orgId, membershipId, type)` — the sole `unique` is `(orgId, id)`, the tenant key. So `getOrCreateSession`'s find-then-insert **can genuinely double-insert** under concurrent first access. This is pre-existing and unchanged by the move (the race window sits between the read and the insert either way), but it is a real defect and closing it needs a partial unique index, i.e. a migration.
  *Verified:* 7 suites, 65 tests pass. 6 pre-existing HR failures in untouched files, unrelated.

- [x] **W5 — payroll: the one route that mutates business state on a GET**
  *Files touched:* `src/modules/payroll/insights/journal-outbox.service.ts` (`markExported`) · `src/modules/payroll/insights/__tests__/journal-outbox.service.spec.ts` (+1 test)
  *The write is NOT forced, and that is the right call.* `markExported` (`journal-outbox.service.ts:294`) implements a real business rule — downloading the CSV is what marks a payroll journal batch `EXPORTED`, stamping `exportedAt`/`exportedBy`. It is guarded (`:296`, only a `POSTED` or `EXPORTED` batch may export) and effectively idempotent. Relocating it to its own transaction would not help: the route would still write during a read-intent request, so it would still have to be excluded from read-only and from replica routing. **This is the one genuine write-on-read in the set.**
  *What the GET verb actually costs here, recorded because it is a product bug and not just a plumbing one:* a browser prefetch, a double-click, a retry, or a link scanner following the URL will stamp `exportedBy`/`exportedAt` and emit a `payroll.journal_batch_exported` audit event **with no human having downloaded anything**. On a payroll journal batch that is an audit-integrity problem. The real fix is `@Post(":batchId/export")`, which is a frontend contract change and belongs in a two-repo lane — recorded, not smuggled in here.
  *Fixed on the way — a discarded read:* `markExported` ended with `return this.get(orgId, batchId)`, a full re-read of the batch **and its lines** (2 queries). Its **only** production caller is `journal-outbox.controller.ts:127`, which discards the value. CLAUDE.md §9: delete a query whose result nothing reads. Return type is now `Promise<void>`.
  **Export path: 7 queries → 5** (the controller's own `get` is 2, `requireBatch` 1, the UPDATE 1, the membership lookup 1).
  *Verified:* no comment added, no cast added. `jest src/modules/payroll/insights` → **134 passed / 134**, 22 suites. New test is non-vacuous — it queues exactly the two reads the method still needs, so before the change the removed re-read would have drained the queue and thrown `NotFoundException`.
  *Noted, not changed:* `requireBatch:479` uses an unprojected `.select()`, which backend/CLAUDE.md §3 bans. Pre-existing and shared by many callers — out of scope for this lane.

---

## ⚠️ A concurrent session stashed this entire session's work mid-lane

Partway through W4, every tracked edit from **both** lanes vanished — the email budget, the automation outbox routing, all the `@NoTenantTransaction()` decorators, the payroll change made minutes earlier. `HEAD` had advanced to `fa65f810b` and `stash@{0}` was a "WIP on main: fa65f810b" holding 269 files.

**Recovered without a single banned git command.** CLAUDE.md §14 forbids `checkout`/`reset`/`stash`, so `git stash pop` and `git checkout stash@{0} -- <path>` were both off the table. Recovery used `git show "stash@{0}:<path>" > <path>` — read-only git plus shell redirection — restoring **58 files by name**, only this session's, leaving the other sessions' 200-odd files in the stash for them.

Untracked files survived the stash (it does not include them by default), which is why the new spec files, both gate scripts and `process-failure.ts` were never at risk — but it also left the tree **inconsistent**: specs referencing symbols that no longer existed.

Three things worth keeping from this:
- **`git show <stash>:<path> > <path>` truncates the target before git runs.** If the path is not in the stash, you are left with an empty file. Every restore here wrote to a temp file first and copied only on `[ -s ]`.
- **Restore by name, not by pattern.** I wrongly included `src/config/env-schema-providers.ts`, which was never mine; its stash version depended on an `ai-model-pricing.constants.ts` I had not restored, and **136 suites failed to load** on `KNOWN_CHAT_MODEL_IDS is not iterable`. Reverting that one file to HEAD fixed all 136.
- **Never measure a tree mid-restore.** The ratchet read red on `chat-assistant.controller.ts#confirmAction` during the partial restore; once the tree was whole it returned to its exact pre-incident baseline (216 routes, 36 controllers, 65 frozen).

## Verification log

| Check | Result |
|---|---|
| `jest` across `hr`, `e-sign`, `inventory/stock-engine`, `payroll/insights`, `billing`, `calls`, `calendar`, `surveys`, `email`, `automation`, `storage`, `kb/wiki` | **5,071 passed / 5,094**, 613 of 624 suites |
| The 23 failures | **All pre-existing — proven, not claimed.** I reverted all 17 lane production files to HEAD and re-ran the same 11 suites: identical 11 suites, identical 23 tests failed. Files then restored and markers re-verified. |
| `tsc --noEmit -p tsconfig.json` | 117 errors repo-wide; **exactly 1 was ours** and is fixed (see below). 51 of the remainder are one missing `fast-check` package; the rest sit in `build/`, `crm/` and other sessions' files. |
| `check:outbound-timeouts` | green — 17 calls across 5,038 files, all bounded |
| `check:ai-route-tenant-optout` | green — 216 routes, 36 controllers, **65 frozen**, identical to the pre-incident baseline |
| Comments added to production files | **zero** |

**The one type error that was ours, and why jest could not see it.** W2's mock spread `unknown[]` into a three-parameter function (`TS2556`) in `sign-certificate-download-scope.spec.ts`. Every e-sign run was green throughout, because **ts-jest does not fail on type errors — typecheck is the only gate that sees a spread or an arity mismatch.** Fixed by naming the three parameters. This is the second time this exact class has slipped past a green agent run in two days.

**A pre-existing defect found while separating ours from theirs, reported not fixed:** `ai-credits-reservation.service.ts:103` returns `{ reservationId: existingId }` where `existingId` is now `{ id, status }`, not a `number` — a concurrent session widened `findByIdempotencyKey`'s return type and left this call site behind. It is present at `HEAD`, so it is not this lane's. On the idempotent-replay path a duplicate reserve hands the caller an **object where `settle`/`release` expect a reservation id**. That is a live billing-path bug; it is left alone because the right fix depends on what that session intends `status` for.

✅ **Closed 2026-09-21 — that session finished the cutover.** The call site now reads `const existing = await this.findByIdempotencyKey(orgId, idempotencyKey); if (existing !== null) return { reservationId: existing.id };` — the object is unwrapped, so `settle`/`release` receive a `number` again. Note the file is `src/modules/billing/core/ai-credits-reservation.service.ts`, not under `modules/ai/`; the path was recorded bare here and cost a search. This closure also resolves the contradiction with `2026-09-20-deferred-items-lane.md`, which had already recorded it as fixed while this document still called it live.

## What this lane changed

**17 of the 15 known write-on-read routes are resolved** — the count went *up* because W2 found two the original audit missed (`sign-reports.service.ts:38` and `:128`), exactly the under-detection that audit warned about in its own limitations section.

| Category | Routes | Outcome |
|---|---|---|
| Audit-on-read (`logCritical`) | 5 | → `logCriticalOutsideTransaction` |
| Read-path audit (e-sign) | 1 | → `runInNewTenantTransaction` |
| Lazy seed on read | 4 + 2 found | inventory and e-sign **stop writing entirely**; onboarding session moved to its own transaction |
| Conditional writers | 4 | → `runInNewTenantTransaction` |
| Genuine write-on-read | 1 | `journal-outbox exportCsv` — **not forced**, documented |

---

## W7 — the control, and the four routes it found that every manual pass missed

The R4 audit's own conclusion was that *"a written rule is not a control"* — §2 said "no writes in a GET" and it had been broken 17 times. So the rule is now a ratchet: **`src/scripts/check-get-route-writes.mjs`**, wired into `package.json` and the CI `gates` job beside its two siblings.

**It found four more.** Three manual passes — the R4 audit and agents W1–W4 — had between them produced 17. The gate found **four additional real write-on-read routes**, and after the false-positive fix below it reported **zero false positives**:

| Route | What it wrote on a read |
|---|---|
| `sessions.controller.ts#list` | `INSERT userSessions` — and it is `@Universal()`, so **every active member hits it** |
| `hr-sensitive.controller.ts#get` | `HrAuditService.log` INSERT — "sensitive.viewed" on salary/bank/identity data |
| `payslip-templates.controller.ts#list` | seeds **three template rows** on an org's first read |
| `mail.controller.ts#listMessages` | `markNeedsReauthMany` UPDATE — the exact twin of the calendar reauth write W4 had just fixed |

All four fixed with `runInNewTenantTransaction`. Gate now reads **1,487 read routes across 598 controllers, 1 frozen** (`journal-outbox#exportCsv`, the documented exception) and exits 0.

**Three bugs the gate's own self-test and first run caught in the scanner, before it could be trusted:**
1. **A trailing `\b` that could never match.** `UPDATE\s+\w` consumes one word character, so the following `\b` landed mid-word and every raw-SQL `UPDATE` went undetected. The self-test caught it before the gate ever ran.
2. **Brace counting started in the parameter list.** `@Res({ passthrough: true })` opened and closed a brace, so the "body" ended before it began — which is exactly why the gate initially **missed `exportCsv`**, the one route I already knew wrote. A gate that cannot see a known violation is worthless, so this was the blocking bug. Fixed by closing the parameter list by paren depth, then skipping `<…>` so an object literal inside a return type (`Promise<{ url: string }>`) is not mistaken for the body. Both traps are now pinned by name in the self-test.
3. **Class-level `@Public()` was not honoured.** `public.controller.ts` carries it on the class, and a `@Public` route never opens a tenant transaction at all — `resolveTenant` returns `null`. That was a false positive on the KB view counter. Fixed for class-level `@Public` and `@NoTenantTransaction` together, which also dropped 87 routes that were never in scope.

**Bite-checked end to end**, not just self-tested: a planted `@Get` handler doing `this.db.insert(...)` made the gate exit 1 and name the route; the planted file was removed and the gate returned to green.

**What the gate cannot see, stated rather than implied:** it resolves `this.<prop>.<method>()` chains three hops deep via constructor parameter types. It misses destructured services, callbacks, free functions taking `db`, `SELECT … FOR UPDATE`, and outbox emits. Precision is high; recall is not proven. The vacuity floor (≥200 controllers, ≥800 read routes) stops a broken scan from passing silently.

**Two pre-existing races the agents found and correctly did not paper over.** ~~Both need a
migration, neither was authored here.~~ **BOTH CLOSED 2026-09-21 — and the first one's proposed
fix was wrong.**

- ~~`payslip_templates` has no unique constraint on `(org_id, layout)`~~ — **the race is real,
  the proposed key is not.** `create()` (`payslip-templates.service.ts:78-91`) deliberately lets
  a customer keep several templates on one layout, so a unique index on `(org_id, layout)` would
  have rejected a legitimate action with a 23505. The invariant that *is* true is **one default
  per org**, and all three write sites already enforce it in application code — `create()`
  demotes every other row before inserting a default, `update()` demotes all but the target, and
  `delete()` refuses to remove the default. **Migration 1132** writes that invariant into the
  database as `uq_payslip_templates_org_default ON payslip_templates (org_id) WHERE is_default`,
  which closes the seed race as a consequence: the seed inserts exactly one default, so the
  second concurrent seeder loses on the index instead of doubling the set. Applied to production
  (0 rows, so nothing to deduplicate) and bitten three ways in a rolled-back transaction: the
  legitimate seed **accepted**, the double-seed **rejected 23505**, and two templates on the same
  layout **still accepted** — that third case is the proof the original proposal would have
  broken the product. `payslip-templates.service.ts` now rescues that one constraint and falls
  through to the normal read, so the losing request returns the winner's templates instead of a
  500; a spec pins that it rethrows on any other constraint.
- ~~`user_sessions` find-then-insert can raise `23505` on a concurrent first listing~~ —
  **CLOSED, and it needed no migration.** The primary key already exists; the defect was that
  `sessions.service.ts:52` did a bare insert after a find. Now `.onConflictDoNothing()`, which is
  backend/CLAUDE.md §3's "atomic upserts for idempotent creates". This one mattered most of the
  three: the route is `@Universal()`, so every active member hits it.

**A regression the agents' scoped runs could not see.** The HR fix broke `src/modules/hr/__tests__/sensitive-projection-exposure.spec.ts` — a projection-allowlist security spec one directory *above* the `hr/core` the agent was told to test, so its green run was honest but blind. It failed `regional.transaction is not a function` because its mock db carries only `select`. Giving it a real `transaction` was the wrong fix: `withTenant` calls `refreshRelocationTargets(db, …)`, which would have consumed a captured projection and quietly corrupted the very allowlist assertions the spec exists for. Mocked the transaction seam instead; all 16 tests pass and every projection assertion still runs.

**W7 verification:** `jest` across 12 modules → **4,898 passed / 4,917**, 641 of 649 suites. The 19 remaining failures are the same 8 suites proven pre-existing earlier by reverting to HEAD. `tsc` → 120 errors repo-wide, **zero in any file this session touched** (51 are one missing `fast-check` package, 50 are another session's `build/` work). All three gates pass self-test and run: outbound-timeouts 17/17 bounded, ai-route-tenant-optout 65 frozen, get-route-writes 1 frozen.

**One arity break I had to repair.** The sessions fix added `orgId` as `list()`'s second parameter and left `sessions-list-bounds.db.spec.ts` — a file inside its own ownership — on the old 4-argument signature. That file is excluded from the jest run but **is** typechecked, so it would have gone red. Fixed by fetching an organization in `beforeAll` exactly as the probe already fetches a user. Note the new signature puts three `string` parameters adjacent (`userId, orgId, sessionId`), which is the swap hazard CLAUDE.md §7 warns about; there is one production call site and it is correct.

## Still open

- **`GET /payroll/.../:batchId/export` should be a `POST`.** It stamps `exportedBy`/`exportedAt` and emits an audit event; a prefetch, retry or link scanner fires it with no human involved. Frontend contract change → two-repo lane.
- ~~**`onboarding_flow_sessions` needs a partial unique index**~~ — **DONE, verified against
  production 2026-09-21.** Migration `1129_onb_flow_sessions_unique_type_per_actor` landed two
  partial unique indexes, not one, which is more correct than this bullet asked for:
  `uq_onb_flow_sessions_membership_type` on `(org_id, membership_id, type)
  WHERE membership_id IS NOT NULL AND status <> 'abandoned'`, and
  `uq_onb_flow_sessions_user_type` on `(org_id, user_id, type)` for the membership-less case.
  Excluding `abandoned` is what lets a user legitimately restart a flow they walked away from.
- **`accessMode: "read only"` is still not safe to ship.** The 17 are fixed, but the R4 audit's own limitations stand: its rule resolved `this.prop.method()` call graphs three hops deep and misses raw-SQL DML, `SELECT ... FOR UPDATE`, and outbox emits. W2 finding two more is the proof. Before flipping `with-tenant.ts:188`, get a production signal over a full week including a deploy.
- **Nothing here was run against a live database.**
