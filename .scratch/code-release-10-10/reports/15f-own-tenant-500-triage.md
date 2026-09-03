# 15f — A-2: the 88 own-tenant 500s, triaged and fixed

**Ticket:** 15 (BOLA/IDOR sweep), assignable item **A-2**.
**Repo:** `streamlineos-backend` only. No frontend change.
**Measured on:** `scratch_t15_500d`, a `CREATE DATABASE ... TEMPLATE scratch_t15` copy of the
database the live sweep itself ran against (1.6 GB). Writes go only to the copy.
**Result: 88 routes answered 500 to a valid same-tenant request. 62 no longer do. 26 remain —
18 in territory this session does not hold, 7 reachable only through rows the harness inserted
directly, and 1 real defect blocked on a migration.**

---

## 1. How the triage was done

The sweep artifact (`reports/residual-risk-register/bola-live-offline.json`) records only the
sanitized envelope — `{"code":"INTERNAL_ERROR","message":"An unexpected error occurred"}` — which
cannot be triaged. `AllExceptionsFilter` (`src/common/http/all-exceptions.filter.ts`) writes the
message, stack, SQLSTATE, table and column to **stderr as JSON** before returning that envelope.

`test/security/bola/t15-own-tenant-500.seeded-e2e-spec.ts` boots the application, replays the exact
own-tenant CONTROL request of all 88 routes, and intercepts `process.stderr.write` for the duration
of each one. Every 500 is therefore attributed to a message, a SQLSTATE, a stack frame and a table —
not to a status code. The 88-route list is committed at
`test/security/bola/live/own-tenant-500-routes.json` so the run is repeatable; the artifact it was
derived from is not in either repository.

```
DATABASE_URL=…/scratch_t15_500d APP_DATABASE_URL=…streamline_app…/scratch_t15_500d \
PGSSLMODE=disable AUTH_SIGNING_KEYS=<local placeholder Ed25519 JWK> \
heavy.sh 2 -- node ./node_modules/jest/bin/jest.js --config ./jest-e2e-seeded.json \
  --forceExit --runInBand --testPathPattern=t15-own-tenant-500
```

**A measurement trap worth recording.** The first replay ran against a copy of `scratch_perf_seed`
and only 43 of 88 reproduced — the other 45 answered 404 because the object the sweep borrowed does
not exist in that database. `scratch_perf_seed` is **not** the database the sweep used; `scratch_t15`
is. Triage on the wrong seed would have closed 45 routes as "did not reproduce" while every one of
them still carried the defect. One proved it directly: `PATCH /hr/employees/:employeeId/sensitive`
answered **200** on the first replay because it INSERTED the sensitive row, and **500** on the second
because it then took the update branch.

---

## 2. Triage table

| # | Cause | SQLSTATE | Routes | Verdict |
|---|---|---|---|---|
| RC-1 | **Empty PATCH body reaches an all-conditional change set.** Drizzle's `mapUpdateSet` drops every `undefined` and throws `No values to set` on the empty result (`node_modules/drizzle-orm/utils.js:92`). The route's own DTO is all-optional, so `{}` validates and then cannot be written. | — (JS `Error`) | **56** (all PATCH) | 40 fixed · 16 out of territory |
| RC-2 | **A path parameter declared `z.string().min(1)` addressing a `uuid` column.** The id reaches Postgres unvalidated and raises `invalid input syntax for type uuid`. | **22P02** | **19** | 19 fixed |
| RC-3 | **`support_ticket_watchers.user_id` is `NOT NULL` in the database and absent from the Drizzle schema.** Every insert omits it. | **23503**→**23502** | **1** | Blocked on `migrations/` |
| RC-4 | **Harness fixture rows.** The sweep inserted objects directly with placeholder values (`period_key='bola-fixture'`, `options='{}'`, `payload='{}'`, an empty merge snapshot). Handlers that read them fault. The creating endpoints all validate the shape, so these rows cannot be produced through the API. | 22007 / — | **7** | Recorded, not fixed |
| RC-5 | Same shapes as RC-1/RC-4 in **build / crm / inventory**. | — | **18** | Out of territory or out of release scope |

No route in the 88 **writes inside a GET**. All 13 GETs were reads; 11 failed on the SELECT itself
(RC-2), 2 on the shape of a fixture row (RC-4). The one write-on-GET this release already knows about
(`GET /surveys/:surveyId/builder`) is not in this set.

### 2a. RC-1, the dominant cause — and why the fix is per-service, not central

An empty PATCH body is a **500 on 56 routes and a 200 on 174 others**. Measured from the sweep
artifact: of 431 PATCH routes, `{}` gives **200 on 174**, 400 on 157, 500 on 56, and 44 were never
asked. So this is a per-service omission, not a contract.

A central rule in `ZodValidationInterceptor` ("a PATCH whose parsed body has no keys is a 400") was
considered and **rejected**: it would flip those 174 working routes to 400, including action-shaped
PATCHes that take no body at all (`PATCH /build/:projectId/tickets/:ticketId/rank`,
`PATCH /crm/automations/:ruleId/enable`, `PATCH /chat/huddles/:huddleId/heartbeat`).

The fix follows what the 174 already do:

* **Table has `updated_at`** → the change set always stamps it. Identical to
  `hr-benefits-plans.service.ts:133` (`.set({ ...data, updatedAt: new Date() })`), the sibling
  pattern. An empty PATCH answers 200 with the object, and a cross-tenant id still answers 404.
* **Table has no `updated_at`** (12 of the affected tables) → branch on
  `hasPatchValues()` (`src/common/db/patch-values.ts`, new, 5 lines) and read the object back **under
  the same tenant predicate**. No write, no lost 404.

The second shape matters for this ticket specifically: it leaves the route answering its object, so
the BOLA sweep can finally score it. A 400 would have left all 56 unprobeable.

### 2b. RC-2 — the repository already had the answer

`src/modules/payroll/runs/payroll-export.controller.ts:31` declares
`jobIdParams = z.object({ jobId: z.string().uuid() }).strict()`, and it is the one export-job surface
the sweep could probe. Nine controllers declaring the same kind of parameter used
`z.string().min(1)`; 96 param schemas repo-wide still do. The two GDPR export-job routes carried **no
params schema at all**.

Fixed by declaring the format. Malformed ids now answer `400 VALIDATION_FAILED`, which discloses
nothing (it is a property of the string, not of the row); a well-formed cross-tenant uuid reaches the
handler and gets the contract 404.

### 2c. RC-3 — a real defect, and the only one blocked

`POST /support/:supportTicketId/follow` **500s for every caller at head.**

* Live `support_ticket_watchers`: `user_id text NOT NULL` (no default), `user_membership_id integer NULL`.
* Declared (`src/db/schema/support/support-workspace.ts:76`): no `userId`, and `userMembershipId.notNull()`.
* `0865_support_actor_expand.sql` added `user_membership_id`, backfilled it and added the FK;
  `0866_pay_support_actor_validate.sql` validated it. **No migration ever contracted the pair** —
  `0915`/`0916`/`0917`/`0918` (`*_actor_drop`) do not name this table, and nothing in `migrations/`
  drops `support_ticket_watchers.user_id`.

Scanned repo-wide: 73 tables are in the same expanded state, and **`support_ticket_watchers` is the
only one whose Drizzle declaration omits `user_id`.** The other 72 still declare it, so only this one
inserts a row without it. `reports/07b-declaration-drift.md` does not mention the table.

**Owner: `migrations/` (ticket 08).** The missing statement, matching `0916`'s own shape:

```sql
UPDATE "support_ticket_watchers" w
SET "user_membership_id" = om.id
FROM "organization_members" om
WHERE om.org_id = w.org_id AND om.user_id = w.user_id AND w."user_membership_id" IS NULL;
--> statement-breakpoint
DELETE FROM "support_ticket_watchers" WHERE "user_membership_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "support_ticket_watchers" ALTER COLUMN "user_membership_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "support_ticket_watchers" DROP COLUMN "user_id";
```

Journal `when` must be stamped above 2027-02-19 or it lands below the applied watermark and is
skipped while `db:migrate` prints success.

### 2d. SQLSTATE 25P02 — found once, and it was a shadow

`POST /hr/payroll-inputs/periods/:periodId/build` reported
`current transaction is aborted` on the statement in its own `catch`:

```ts
} catch (err) {
  await this.db.update(hrPayrollInputPeriods).set({ status: "open", … });  // threw 25P02
  throw err;                                                                // never reached
}
```

The compensation ran on the connection the failed build had already aborted, threw, and **replaced
the original error** — every failed build reported 25P02 and lost its cause. The compensation is now
guarded and the original error always propagates. Behind the shadow the real fault is
`RangeError: Invalid time value`, from `periodBounds('bola-fixture')`. `periodKey` is validated
`^\d{4}-\d{2}$` at creation, so that row is a harness fixture (RC-4) — but the mask was real and is
gone. No other route in the 88 produced 25P02.

---

## 3. What was fixed, by module

**Announced territory: `hr`, `finance`, `accounting`, `payroll`, `support`, `sales`, `surveys`,
`expenses`, `gdpr`, plus `src/common/db/patch-values.ts` (new) and `test/security/bola/**`.**
`src/modules/storage/**`, `cron/**`, `e-sign/**` and `build/**` were not touched.

| Commit | Scope |
|---|---|
| `2bb472d7` | the replay harness — see the attribution note below |
| `425f930a` | RC-2 x19 - hr, finance, gdpr, expenses |
| `5cda9874` | RC-1 x23 + `EngagementService.updateSurvey`'s missing 404 |
| `40b4367b` | RC-1 x17 more (the sites the wrong seed hid) |
| `4722a208` | the 25P02 shadow, `deletePlan`'s 23503, the last RC-1 |
| `3872fbe8` | the committed route list |

**Attribution note (seventh incident of the shape).** The first commit of the harness spec —
`test/security/bola/t15-own-tenant-500.seeded-e2e-spec.ts`, a NEW file — was staged with
`git add -- <file>` and then rejected by `git commit -m … -- <file>` ("no changes added to commit").
The file stayed in the **shared index** and was swept into another agent's next commit,
`2bb472d7 fix(storage): …`, which describes none of it. Nothing was lost and the file is at head, but
the brief's rule 2 workaround (`git add` then still pass the pathspec to `git commit`) **did not work
for a new file here**. A `git show --stat HEAD` after the failed commit would have caught it; it was
caught two commits later instead.

One finding beyond the 88: **`EngagementService.updateSurvey` never checked whether its update
matched anything** — it returned `{ success: true }` for any survey id, another organisation's
included. That is a silent no-404 on a write verb, the shape ticket 15 exists to find. It now
resolves the row under the tenant predicate and throws `NotFoundException`.

Also fixed: `HrBenefitPlansService.deletePlan` let a **23503** foreign-key violation out as a 500.
Deleting a benefit plan that still has enrollments or claims is a conflict and now says so (409).

---

## 4. The 26 that remain

**Out of territory / out of release scope — 18.** All RC-1 except three.

* **build (7)** — `PATCH /build/:projectId/{approvals,releases,sprints,meetings}/…`,
  `/tickets/:ticketId/related-links/:linkId`, `/build/labels/:labelId`,
  `/build/workspaces/:pmWorkspaceId`. **Owner: build module owner.** One line each:
  `approvals.service.ts:283`, `projects-releases.service.ts:67`, `sprints.service.ts:111`,
  `meetings.service.ts:294`, `projects-ticket-links.service.ts:168`, plus labels and pm-workspaces.
* **crm (5)** — `PATCH /crm/{campaigns,assignment-rules,scoring-rules,sla/policies}/:id` (RC-1) and
  `POST /crm/imports/:crmImportId/commit` (a failed `UPDATE workflow_runs`). **Excluded from the release.**
* **inventory (6)** — `PATCH /inventory/{products/categories,products/uom,quality/recalls,settings/number-sequences,webhooks}/:id`
  (RC-1) and `POST /inventory/quality/holds/:holdId/release` (a failed `inv_stock_transactions`
  insert). **Excluded from the release.**

**Harness-fixture rows — 7.** Each traced to a row the sweep inserted directly with a placeholder the
creating endpoint would reject. Not production-reachable; recorded so the next reader does not
re-triage them.

| Route | Module owner | Fixture value |
|---|---|---|
| `GET /hr/engagement/polls/:pollId/results` | hr/performance | `hr_polls.options = '{}'` (code expects an array) |
| `GET /hr/forms/:formId/submissions` | hr/forms | `hr_form_submissions.form_schema_snapshot = '{}'` |
| `POST /hr/payroll-inputs/periods/:periodId/build` | hr/payroll-inputs | `period_key = 'bola-fixture'` |
| `POST /payroll/policies/:policyId/activate` | payroll/setup | `start_month = 'bola-fixture'` → 22007 |
| `POST /accounting/recurring-invoices/:templateId/run-now` | finance/ar | `payload = '{}'` |
| `POST /accounting/credit-notes/:creditNoteId/post` | finance/ar | zero-amount note → unbalanced journal |
| `POST /party/merges/:partyMergeId/revert` | party | empty merge snapshot behind `as unknown as MergeSnapshot` |

**Real, blocked — 1.** `POST /support/:supportTicketId/follow`, §2c, owner `migrations/`.

---

## 5. What this returns to ticket 15's open box

| | before | after |
|---|---|---|
| 500 INTERNAL_ERROR | 88 | **26** |
| 200 (probeable) | 3 | **22** |
| 400 (malformed id rejected) | 1 | **21** |
| 404 | 41 | 16 |

The 21 that now answer 400 are RC-2: the sweep sent the literal `1` for a `uuid` parameter. With a
correctly-shaped borrowed id their controls will succeed and they become scoreable — the fix does not
merely change the status code, it removes the reason the sweep could not ask.

---

## 6. Gates

| Command | Exit | Result |
|---|---|---|
| `heavy.sh 2 -- pnpm -C streamlineos-backend typecheck` | **0** | clean |
| `pnpm -C streamlineos-backend check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| `npx jest --runInBand --testPathPattern=test/security/bola` | **0** | **18 suites, 263 tests, all green** |
| `npx jest --runInBand --testPathPattern="(kpis\|dimensions\|budgets\|scenarios\|benefits\|handbook\|custom-fields\|sensitive\|assets\|payroll-compliance\|hr-forms\|engagement\|payslip-templates\|accounting-mappings\|support-kb\|survey-logic\|shifts\|leave-policies\|biometric\|attendance\|helpdesk\|recurring-journals\|sales\|hr-import\|hr-export\|expenses\|gdpr\|emergency\|identity\|accommodations\|finance-report-export)"` | **0** | **114 suites, 808 tests, all green** |
| the replay, 88 routes, `scratch_t15_500d` | **0** | 26 × 500 (was 88) |

**Not mine, seen in passing.** `npx jest --testPathPattern=test/security` has **8 failures in 3
suites** — `appsec/injection-surfaces`, `appsec/secrets-cookies-and-keys`, `upload-controls`. They pin
file sets in `webhook-url-guard`, `sql.raw` and the storage upload controller; nothing in this pass
touches any of them. Reported red, not investigated.

**Not run.** Lint. Frontend anything. The full backend jest suite.
