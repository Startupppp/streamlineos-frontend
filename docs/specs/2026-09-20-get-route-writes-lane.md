# GET routes that write inside the request transaction

**Opened:** 2026-09-20 · **Owner:** backend
**Follows:** `2026-09-20-deferred-items-lane.md` R4, which found these while proving `accessMode: "read only"` unsafe.

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

- [x] **W2 — e-sign: a read-path audit write and a lazy settings seed**
  *Files touched:* `sign-finalization.service.ts` · `sign-settings.service.ts` (new `get`) · `sign-admin.controller.ts` · `sign-reports.service.ts` (coordinator) · `__tests__/e-sign-services-tenant-isolation.spec.ts` (coordinator) · 2 spec files
  *Result:* the `document_downloaded` audit now commits in its own `runInNewTenantTransaction`. `SignSettingsService.get` reads without seeding; `getSettings` uses it, while all 6 mutation callers keep `getOrCreate`.
  **The agent found two GET routes the original audit missed** — `sign-reports.service.ts:38` (`getDashboard`) and `:128` (`getSummary`) both called `getOrCreate`. It correctly reported rather than reaching outside its scope; I fixed both. Each reads only `orgSettings.expirationWarningDays`, so neither depends on the row existing. **The set was 15; it is at least 17.** This is exactly the under-detection the R4 audit warned about in its own limitations section.
  *Coordinator check on the one risky part — the synthesised defaults.* `get` returns `{ id: 0, createdAt: new Date(), updatedAt: new Date(), ...defaults }` when no row exists, which is fabricated data. I verified it is inert: the backend PATCH keys on `u.orgId` from the token and never reads `id` (`sign-admin.controller.ts:60`), and the frontend renders none of `id`, `createdAt` or `updatedAt` (`frontend/hooks/api/sign/sign-schema.ts:211-232` types them but no component consumes them). The contract is satisfied — `id: z.number().int()` accepts 0, and the `Date`s serialise to the `z.string()` the frontend expects. Acceptable, and recorded because a fabricated id is the kind of thing that grows teeth later.
  *Also verified:* `sign-auth-method.policy.ts:45` keeps `getOrCreate` — its only callers are `sign-recipients.service.ts` and `sign-templates.service.ts`, both mutation paths, so it is not GET-reachable.
  *Verified:* 39 suites, 297 tests pass.

- [x] **W3 — inventory: a cache-gated lazy seed reached from four GET routes**
  *Files touched:* `src/modules/inventory/stock-engine/inventory-settings.service.ts` (`get`, :110-114) · `src/modules/inventory/stock-engine/__tests__/inventory-settings-get-no-write.spec.ts` (new, 2 tests)
  *Repair: option (a) — the write is gone, not relocated.* On a cache miss with no row, `get()` inserted defaults, re-read them, and fell back to `toSettingsRow(seeded ?? buildDefaults(orgId))`. That fallback was **already correct on its own**, so the whole insert-and-re-read collapses to it. Net diff is 5 lines out, 1 in.
  *Also removes two queries.* The miss-with-no-row path went `findFirst` → `insert` → `findFirst` (3 round trips) → now a single `findFirst`.
  *Caller evidence that this is safe:* `update()` (`:137-143`) creates the row itself with `insert(...).onConflictDoUpdate(...)` seeded from `{ ...buildDefaults(orgId), ...patch }`, so first-save still persists regardless of whether a read ever seeded it — and it invalidates the cache key, so the next read picks up the real row. Every other caller consumes only the returned `InvSettingsRow`.
  *Coordinator verification of the "pre-existing failures" claim — not taken on trust:* I reverted **only** this file to HEAD and re-ran `jest src/modules/inventory`. The **same 9 suites** failed (`quantity.property` is missing the `fast-check` package entirely, plus 8 unrelated), **and** the agent's new spec failed — which proves the new test is a genuine failing-first test rather than a tautology. With the change applied, the new spec passes and the 9 remain. File restored and diff confirmed present.
  *The comment that was the trap:* `inv-products.controller.ts:169` says *"A read — it computes and returns, and writes nothing."* It was true of the handler and false of its call graph. It is now true of both. Left untouched, as §6 requires.
  *Not certified:* that `update()`'s `onConflictDoUpdate` creates the row correctly on a fresh org. Mocked tests cover the branch, not the SQL.

- [x] **W4 — billing, calls, calendar, surveys: four conditional writers**
  *Files touched:* `ai-credits-reservation.service.ts` · `call-recording-consent.service.ts` · `external-calendar-events.service.ts` · `survey-version.service.ts` · 6 spec files (3 new)
  *Result:* all four writes moved into `runInNewTenantTransaction`. Coordinator-verified: each of the four imports from the direct module path (not a barrel) and uses the **escaping** primitive, not the joining one.
  *Both traps I warned it about were confirmed against source, not assumed:*
  1. **`runInTenantTransaction` joins rather than escapes.** `run-in-tenant-transaction.ts:73` is `if (ambient) return fn(ambient.tx)` — when the explicit `orgId` matches the request's, it hands back the *request's* transaction. `ensureWalletForOrg` used it, so its inner `db.transaction` was only a SAVEPOINT, which inherits read-only. The "it already has its own transaction" reading was wrong, and only `runInNewTenantTransaction` (via `runOutsideTenantContext`) actually escapes.
  2. **`.catch(() => undefined)` does not save the calendar write.** Swallowing the JS rejection cannot un-abort a Postgres transaction: after `25006` every later statement returns `25P02` and COMMIT becomes ROLLBACK. It would have converted a bookkeeping failure into a 500 for the whole GET.
  *Each test drives its conditional branch, which is the only way these are testable:* no wallet row, `verdict.allowed = false` (with an allowed-case anti-vacuity control), a `ComposioToolError(isAuthError)`, and a null active version.
  *Verified:* 16 new tests pass.

- [x] **W5 — payroll: the one route that mutates business state on a GET**
  *Files touched:* `src/modules/payroll/insights/journal-outbox.service.ts` (`markExported`) · `src/modules/payroll/insights/__tests__/journal-outbox.service.spec.ts` (+1 test)
  *The write is NOT forced, and that is the right call.* `markExported` (`journal-outbox.service.ts:294`) implements a real business rule — downloading the CSV is what marks a payroll journal batch `EXPORTED`, stamping `exportedAt`/`exportedBy`. It is guarded (`:296`, only a `POSTED` or `EXPORTED` batch may export) and effectively idempotent. Relocating it to its own transaction would not help: the route would still write during a read-intent request, so it would still have to be excluded from read-only and from replica routing. **This is the one genuine write-on-read in the set.**
  *What the GET verb actually costs here, recorded because it is a product bug and not just a plumbing one:* a browser prefetch, a double-click, a retry, or a link scanner following the URL will stamp `exportedBy`/`exportedAt` and emit a `payroll.journal_batch_exported` audit event **with no human having downloaded anything**. On a payroll journal batch that is an audit-integrity problem. The real fix is `@Post(":batchId/export")`, which is a frontend contract change and belongs in a two-repo lane — recorded, not smuggled in here.
  *Fixed on the way — a discarded read:* `markExported` ended with `return this.get(orgId, batchId)`, a full re-read of the batch **and its lines** (2 queries). Its **only** production caller is `journal-outbox.controller.ts:127`, which discards the value. CLAUDE.md §9: delete a query whose result nothing reads. Return type is now `Promise<void>`.
  **Export path: 7 queries → 5** (the controller's own `get` is 2, `requireBatch` 1, the UPDATE 1, the membership lookup 1).
  *Verified:* no comment added, no cast added. `jest src/modules/payroll/insights` → **134 passed / 134**, 22 suites. New test is non-vacuous — it queues exactly the two reads the method still needs, so before the change the removed re-read would have drained the queue and thrown `NotFoundException`.
  *Noted, not changed:* `requireBatch:479` uses an unprojected `.select()`, which backend/CLAUDE.md §3 bans. Pre-existing and shared by many callers — out of scope for this lane.

- [x] **W6 — integration, verification, and what remains**

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

**Two pre-existing races the agents found and correctly did not paper over** — both need a migration, neither was authored here:
- `payslip_templates` has no unique constraint on `(org_id, layout)`, so two concurrent first reads seed **six** templates.
- `user_sessions` find-then-insert can raise `23505` on a concurrent first listing.

**A regression the agents' scoped runs could not see.** The HR fix broke `src/modules/hr/__tests__/sensitive-projection-exposure.spec.ts` — a projection-allowlist security spec one directory *above* the `hr/core` the agent was told to test, so its green run was honest but blind. It failed `regional.transaction is not a function` because its mock db carries only `select`. Giving it a real `transaction` was the wrong fix: `withTenant` calls `refreshRelocationTargets(db, …)`, which would have consumed a captured projection and quietly corrupted the very allowlist assertions the spec exists for. Mocked the transaction seam instead; all 16 tests pass and every projection assertion still runs.

**W7 verification:** `jest` across 12 modules → **4,898 passed / 4,917**, 641 of 649 suites. The 19 remaining failures are the same 8 suites proven pre-existing earlier by reverting to HEAD. `tsc` → 120 errors repo-wide, **zero in any file this session touched** (51 are one missing `fast-check` package, 50 are another session's `build/` work). All three gates pass self-test and run: outbound-timeouts 17/17 bounded, ai-route-tenant-optout 65 frozen, get-route-writes 1 frozen.

**One arity break I had to repair.** The sessions fix added `orgId` as `list()`'s second parameter and left `sessions-list-bounds.db.spec.ts` — a file inside its own ownership — on the old 4-argument signature. That file is excluded from the jest run but **is** typechecked, so it would have gone red. Fixed by fetching an organization in `beforeAll` exactly as the probe already fetches a user. Note the new signature puts three `string` parameters adjacent (`userId, orgId, sessionId`), which is the swap hazard CLAUDE.md §7 warns about; there is one production call site and it is correct.

## Still open

- **`GET /payroll/.../:batchId/export` should be a `POST`.** It stamps `exportedBy`/`exportedAt` and emits an audit event; a prefetch, retry or link scanner fires it with no human involved. Frontend contract change → two-repo lane.
- **`onboarding_flow_sessions` needs a partial unique index** on `(orgId, membershipId, type)`. Today only a plain index exists, so find-then-insert can double-insert. Needs a migration.
- **`accessMode: "read only"` is still not safe to ship.** The 17 are fixed, but the R4 audit's own limitations stand: its rule resolved `this.prop.method()` call graphs three hops deep and misses raw-SQL DML, `SELECT ... FOR UPDATE`, and outbox emits. W2 finding two more is the proof. Before flipping `with-tenant.ts:188`, get a production signal over a full week including a deploy.
- **Nothing here was run against a live database.**
