# 19f — The automation trigger→module map is total, fail-closed, and one vocabulary

**Unblocks:** ticket 19 box 6, residual **R-12**. Report 19e recorded R-12's prerequisite
("close the map first"). This pass closes it, and corrects two of 19e's numbers.

Repos touched: **both**. Backend commits `e049d065`, `99709108`, `c7951d71`.
Frontend commits `404ce244a`, `c332ee492`, `69982c282`, `1e09df665`.

---

## 1. Every number in the brief, re-measured before acting

Reproduced independently from source, not transcribed.

| Claim | Verdict | Measured |
|---|---|---|
| `getModuleForTrigger` ends `?? "hr"` | **TRUE** | `components/automations/automation-trigger-data.ts:23` |
| Three vocabularies: 55 / 48 / 33 | **TRUE** | engine `AUTOMATION_TRIGGERS` 55 (all distinct), `automationTriggerSchema` 48, frontend `TRIGGER_META` 33 |
| 19 of 48 do not resolve to their owner | **TRUE as arithmetic** | 15 unmapped + 4 mapped `hr`. The 15: `lead.status_changed`, `lead.assigned`, `lead.score_updated`, `deal.created`, `deal.won`, `deal.lost`, `ticket.assigned`, `ticket.status_changed`, `ticket.escalated`, `invoice.paid`, `attendance.late`, `employee.onboarded`, `employee.resignation`, `review.cycle_started`, `expense.approved` |
| 4 are "explicitly wrong" | **1 of the 4, not 4** | see §3 — `sla.breached` is contested; `expense.submitted`, `reimbursement.approved`, `reimbursement.rejected` are **correctly** `hr` on the evidence, and the ticket's own hedge ("leaving the arguable `expense.*`/`reimbursement.*` out") was the safer reading |
| `/support/settings/automations` shows 3 of 7 | **TRUE** | support-mapped META was 3; support-owned triggers are 7 |
| `/accounting/settings/automations` shows 1 of 6 | **1 is right, 6 is wrong** | finance-mapped META was 1; finance **owns 2**, not 6 — see §3 |

There is also a **fourth** vocabulary the brief did not name: `AutomationTrigger` in
`hooks/api/automations.ts` was its own 33-member union, the same 33 as `TRIGGER_META`. That is
why the compiler never saw the hole — the map was total over a truncated union, and
`AutomationRule.triggerEvent` reaches it through `apiClient.get<T>`, which is a cast
(AGENT-BRIEF rule 11). A rule on `ticket.escalated` arrived typed as something it was not and
resolved to HR.

---

## 2. What changed

**One source of truth: the engine.**

- `backend/src/modules/automation/automation-trigger-modules.ts` (new) —
  `AUTOMATION_TRIGGER_MODULE: Record<AutomationTriggerEvent, AutomationTriggerModule>`.
  Total **by construction**: adding a trigger to `AUTOMATION_TRIGGERS` without an owner is
  `error TS2741`, not a runtime surprise. No `??`, no default, no fallback branch.
- `backend/src/modules/settings/dto/settings.schemas.ts` — `automationTriggerSchema` is now
  `z.enum(AUTOMATION_TRIGGERS)`. **48 → 55.** The seven `sign.*` events the e-sign module
  already dispatches (19e §6) were unreachable from the API; they are now creatable.
- `frontend/lib/automations/automation-triggers.ts` (new) — mirrors the vocabulary and the
  owner map. `AutomationTrigger` now has **one** definition; `hooks/api/automations.ts`
  re-exports it, so every existing importer is unchanged.
- `frontend/components/automations/automation-trigger-data*.ts` — UI metadata for **all 55**,
  so no engine trigger is invisible and no frontend-only trigger is dead. crm 2→8, support
  3→7, finance 1→2, hr 27→31, sign 0→7. Fields and sample payloads are taken from the real
  dispatch sites where one exists; the triggers nothing dispatches carry `fields: []` and a
  minimal payload rather than an invented one.
- `frontend/features/shared/automations/module-automations-settings.tsx` — the list filter uses
  `resolveTriggerModule(trigger: string): TriggerModule | null`. A trigger the vocabulary does
  not contain now lands on **no** module's screen instead of on HR's. That is the wire path,
  where the value is really a string.
- `getTriggerMeta` no longer falls back to `TRIGGER_META[0]` (which was `lead.created`, module
  `crm` — a fail-open to the wrong module in the copy as well as the rung).

---

## 3. The ownership question, and where the brief's hint is wrong

The measured partition is **crm 8 · support 7 · finance 2 · hr 31 · sign 7 = 55**.

The census's own OWNERSHIP corollary is "if exactly one module owns the rows the route reads
and writes, the route is that module's". Applied to the dispatch sites:

- **`expense.submitted`** is dispatched by `modules/expenses/expense-outbox.consumer.ts:88`.
  That module's controllers mount at **`hr/expenses`**, `hr/expenses/import`,
  `hr/expenses/categories`, `me/expenses`, and gate on **`hr:expenses:view|create|approve|manage|read`**.
  The frontend's `/accounting/expenses` page is not a second surface: `hooks/api/accounting/expenses.ts:68`
  calls **`/hr/expenses/page-data`** and types from `@/types/hr/expenses`. One table, one gate,
  and the gate is HR's.
- **`reimbursement.approved|rejected`** are dispatched by
  `modules/payroll/hr-payroll/reimbursements.service.ts:116`, reached through
  `PATCH /hr/reimbursements/:id` on **`hr:payroll:view`**. `/accounting/reimbursements` is a
  *different entity* — reimbursement **batches** (`FinReimbursementBatch`) on
  `accounting:reimbursements:*` — and dispatches nothing.
- **`expense.approved`** is never dispatched to this engine at all; it exists only as an audit
  action string (`expenses-write.service.ts:278`). It follows `expense.submitted`.

So **finance owns 2** (`invoice.overdue`, `invoice.paid` — `modules/invoices`, `accounting:*`),
not 6. Report 19b's "Accounting 6" grouped by name family. Assigning these four to `finance`
would put an `accounting:*` rung over `hr:expenses`/`hr:payroll`-gated rows — a privilege
widening, which is the direction R-12 exists to avoid. Assigning them to `hr` costs an
accounting admin a 403, which is recoverable and visible.

**`sla.breached` is the one genuinely undecidable case, and it is assigned `support`.**
Nothing dispatches it. For support: Support owns the only live SLA-breach engine
(`support-sla.service.ts`, `/support/settings/sla`, escalation), and the release's own census
has counted it as Support's for three passes. Against: the frontend labelled it *"Recruitment
SLA breached"* with `candidateId`/`stage`/`hoursInStage`, it sits in the HR block of the engine
list, and HR recruitment runs a **separate** engine whose own enum already carries
`SLA_BREACHED` (`hr/recruitment/dto/automation.schemas.ts:7`) — so reading the global one as
recruitment's would duplicate a trigger recruitment already handles internally. Its metadata is
relabelled "SLA breached" with no fabricated payload.

**These five are recorded in source**, not only here:
`AUTOMATION_TRIGGER_OWNERSHIP_DECISIONS` in `automation-trigger-modules.ts` carries each
trigger, its alternative module and the dispatch site and gate that decided the current owner.
The gate asserts every entry is a real trigger and that its alternative genuinely differs from
its current owner, so resolving a decision means deleting the entry, not leaving it to rot.

### The product decision that is still open

> **D-1 — `sla.breached`: Support or HR recruitment?** Currently `support`. If HR, Support is
> 6 and HR 32; the change is one line in `AUTOMATION_TRIGGER_MODULE` plus its mirror and the
> `TriggerMeta` entry's `module`, and the gate makes the two repos agree or fail.
>
> **D-2 — `expense.submitted`, `expense.approved`, `reimbursement.approved`,
> `reimbursement.rejected`: HR or Finance?** Currently `hr`, on the dispatch site and the gate.
> A ruling of "finance" is legitimate *only if* the underlying surfaces move too — an
> `accounting:*` rung over routes that check `hr:expenses:*` is the wrong-rung defect in a new
> place. If they move, finance becomes 6 and hr 27, which is the shape reports 19b and 19e
> assumed.

Neither is invented here, and neither blocks the mechanism: the map is total either way.

---

## 4. Is R-12 Option 2 adoptable now?

**The prerequisite is closed. Option 2's remaining blockers are the ones report 19b already
named, and they are unchanged.**

- ✅ A trigger→module map that fails closed — done, and compile-enforced rather than remembered.
- ⬜ **The rung itself.** Four new key pairs (`<module>:automations:view|manage`) is still a
  product call. `sign` is now a fifth owning module, so it is five pairs, not four.
- ⬜ **The re-trigger `PATCH`.** A `PATCH` that changes `triggerEvent` moves the row between
  modules and must require `manage` on **both**. Still unimplemented, and now visible in the
  UI: `module-automations-settings.tsx:335` passes `NON_CRM_TRIGGER_META` as the edit sheet's
  full option list, so the edit form already offers cross-module re-targeting.
- ⬜ **The four `support_*` actions.** A CRM-triggered rule can still act on Support data.
- ⬜ **A rule with no owning screen.** `crm` rules are served by a different builder and `sign`
  has no `/sign/settings/automations` page, so under Option 2 those two rungs need a screen.

---

## 5. The second item — the `/accounting` page gate

**The reported characterisation is half right, and the half that is wrong matters.**

`app/(authenticated)/accounting/settings/automations/page.tsx` did hold only `requireSession()`.
It was **not** ungated: `app/(authenticated)/accounting/layout.tsx` calls
`enforceRouteAccess("/accounting")`, which resolves the **live** request path from headers, and
`routeOwnsPath` matches by prefix, so `/accounting/settings/automations` was gated by the
longest matching nav entry — `/accounting/settings`, on **`accounting:settings:read`**. Not a
leak (the backend routes are `@RequirePermission("settings:automations:view|manage")`), but the
**wrong key**: a finance admin holding `accounting:settings:read` reached a page whose every
request then 403s.

`route-access-keys.test.ts` proved the point: a `ROUTE_ACCESS_EXTENSIONS` entry for the path
failed with `nav accounting:settings:read vs registry settings:automations:view`. The screen was
missing from **navigation**, not from the registry. Fixed by adding the `Automations` child to
the Finance Settings group on `settings:automations:view` — exactly what
`/support/settings/automations` already has — and switching the page to `enforceRouteAccess`.
Strictly narrowing for the page, additive for the sidebar: only OWNER/ORG_ADMIN hold
`settings:automations:view` (via `ALL_PERMISSION_NAMES`; no role template carries it), and they
already saw the Finance Settings group. Nav digest updated with the dated reason its convention
requires.

---

## 6. Gates, and the bite proofs

**Backend — `src/modules/automation/automation-trigger-vocabulary.spec.ts`, 7 tests.**
Floors: `AUTOMATION_TRIGGERS.length >= 55`; the dispatch-site scan must find `>= 20` literal
`runAutomationsForEvent(orgId, "…")` call sites (it finds **29** across 27 distinct triggers).

**Frontend — `lib/automations/__tests__/automation-trigger-mirror.test.ts`, 7 tests.**
Reads the backend repo through `backendPath`. Floors: the backend vocabulary read must yield
`>= 55` and the module list `>= 5`.

Bite-proved in `git archive HEAD`-populated temp trees, never the shared tree.

| # | Bite | Result |
|---|---|---|
| A | engine gains `widget.exploded`, map does not | jest **2 failed / 6**; `tsc` **exit 2**, `error TS2741: Property '"widget.exploded"' is missing … but required in type 'Record<…>'` |
| B | write schema restated by hand at the old 48 | **1 failed / 6** on "accepts … no more, no less" |
| C | a module value nothing maps to | **1 failed / 6** on the dead-module test |
| D | the dispatch scan stops matching (43 files renamed) | **1 failed / 6**, `Expected: >= 20 / Received: 0` |
| E | frontend drops `ticket.escalated` | **5 failed / 7** |
| F | frontend says `sla.breached` is `hr`, backend says `support` | **3 failed / 7**, `Expected: "support" / Received: "hr"` |
| G | `?? "hr"` reintroduced in `resolveTriggerModule` | **1 failed / 7** on "fails closed" |
| H | a trigger loses its UI metadata | **2 failed / 7** |
| I | backend source read against a stub with empty lists | **3 failed / 7**, `Expected: >= 55 / Received: 0` |
| — | all restored | backend **6/6** then **7/7**, frontend **7/7**, both exit 0 |

Bite D initially did **not** bite: the first attempt renamed the method across all of `src/`
including the spec's own regex, so the scan followed it. Recorded because it is the exact shape
of a gate that looks bite-proved and is not.

---

## 7. Commands run — literal, with real exit codes

```
backend  node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit   EXIT=0  (0 lines)
backend  jest --runInBand -t automation-trigger-vocabulary                            EXIT=0  7/7
backend  jest --runInBand --testPathPattern="src/modules/(automation|settings)"       EXIT=0  14 suites / 180 tests
backend  pnpm -s check:spec-typecheck                                                 EXIT=0
backend  pnpm -s check:cycles                                                         EXIT=0  5648 files, no cycle
backend  pnpm -s check:file-sizes                                                     EXIT=1  pre-existing, 9 files, none mine
backend  pnpm -s openapi:check                                                        EXIT=1  STALE — see §8
frontend pnpm run type-check                                                          EXIT=0
frontend jest --runInBand --testPathPattern="(lib/rbac/route-access|lib/automations|components/layout/sidebar)"
                                                                                      EXIT=0  14 suites / 184 tests
frontend pnpm -s check:route-access-contract                                          EXIT=0  204 keys, 633 x-permission
frontend pnpm -s check:contract-vendor                                                EXIT=0
frontend eslint <the changed files>                                                   EXIT=0
```

Per-screen counts, computed from the shipped source after the change:
`TRIGGER_META` **55** = crm 8 · support 7 · finance 2 · hr 31 · sign 7, identical to
`AUTOMATION_TRIGGER_MODULE`. **`/support/settings/automations` 7 of 7** (was 3).
**`/accounting/settings/automations` 2 of 2** (was 1 of 2) — the correct denominator is 2, not
the 6 the brief expected; §3 is why.

---

## 8. Honest gaps and cross-territory findings

- **`pnpm openapi:check` is exit 1**, naming four changed operations:
  `POST /settings/automations` and `PATCH /settings/automations/{ruleId}` (**mine** — the
  request enum went 48 → 55) and `POST|GET /build/{projectId}/labels` (**not mine**; my change
  touches only `automationTriggerSchema`). So the contract was already stale before this pass.
  Regeneration is the release-time step box 3 owns, and running it now would sweep another
  agent's contract change into my commit. **Not run. Owner: the orchestrator, once.**
- **Cross-territory edits I made because the fix was not separable**, both minimal and both
  proved by `type-check` exit 0: `hooks/api/automations.ts` (ticket 28's territory) — the
  33-member union replaced by a two-line import + re-export, no behaviour change; and
  `features/shared/automations/module-automations-settings.tsx` + `components/automations/**`,
  which 19e listed as outside ticket 19 but which this task was assigned to fix.
- **`hooks/api/automations.ts` has a pre-existing unused `useMutation` import** (eslint warning).
  Verified unchanged at `HEAD~3`. Not mine, not fixed. **Owner: `frontend/hooks/`.**
- **Still open from 19e and untouched here:** the 9 routes at a global `/settings/*` path, the
  `POST /settings/email-templates/test` abusable send, `GET /settings/permissions` as a
  duplicate door, and the six dual-homed sunset aliases.
- **Not run:** backend lint, any e2e suite, any database. Nothing here needed one.
- The `sign.*` widening (write API 48 → 55) is a **deliberate behaviour change**: users can now
  create rules for events the engine was already firing into a table that could not hold a
  matching rule. It is additive and it is what "one vocabulary" means, but it is a product-visible
  widening and is called out rather than buried.
