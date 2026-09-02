# 38 — Handler and function responsibility across UI and backend

**Status:** 5 of 6 boxes closed. Box 1 is PARTIAL and counted.

Every number below came from a command run in this session. Where a gate was not run it says
*not run*. Where a red belongs to another territory it says so and names the file.

---

## 1. Measurement first

The ticket's real scope is box 1, so it was measured before anything was edited. A TypeScript-aware
scanner walked every `.tsx` under `frontend/`, found each JSX attribute matching `on[A-Z]…={`,
brace-matched its expression, and classified the ones holding an arrow or function expression.

| | Repo-wide | My territory |
|---|---|---|
| `.tsx` files scanned | 3,223 | — |
| Inline arrows in JSX event props — **before** | **1,469** | **818** |
| …of those, non-trivial (multi-statement / multi-line / `await` / `try`) | 236 | 138 |
| …of those, risky (a mutation, a sequence, validation, or something that can fail) | 105 | 61 |
| Inline arrows in JSX event props — **after** | **1,427** | **778** |
| Non-trivial — after | 205 | 107 |
| Risky — after | 82 | **38** |

**1,469 is the honest number.** It is not thousands, and it is not "many". Roughly 84% of them are
`onClick={() => setOpen(true)}` — a trivial event, which box 1 does not cover and which the PRD's
closure protocol forbids reopening for naming taste. The 61 risky ones in my territory were the
work; 23 of them are now named handlers, and the 38 that remain are listed and counted in §6.

Territory split of the 818 (before): hr 502 · payroll 115 · accounting 78 · settings 39 ·
notifications 28 · support 25 · calendar 14 · timesheets 8 · workflows 6 · directory 3.
The 651 outside my territory (components/ 128, app/ 78, crm 81, surveys 80, inventory 51, sign 47,
chat/build/inbox/mail 54, and 18 smaller features) are reported, not touched.

---

## 2. Box 1 — named, typed, intent-expressing handlers  — **PARTIAL**

### The largest single finding: eight copies of one paginator, inline in JSX

`onNext` on `CursorPageControls` held a 9-line closure that mutated a cursor stack:

```
const next = query.data?.pagination.nextCursor ?? null;
setCursors((prev) => { const copy = prev.slice(0, cursorIndex + 1); copy.push(next); return copy; });
setCursorIndex(cursorIndex + 1);
```

That is box 1 (a non-trivial event in an inline closure), box 2 (a state machine embedded in a
handler) and box 6 (the same rule in eight files) at once. Two spellings of the same machine were in
use — an indexed stack (`cursors` + `cursorIndex`, 6 files) and a push/pop stack (`cursorHistory`,
2 files) — which are behaviourally identical because the indexed version truncates forward history
on every advance.

Replaced by one named hook, `frontend/hooks/common/use-cursor-page-stack.ts`, exposing
`cursor` · `page` · `hasPrevious` · `goToNextPage(nextCursor)` · `goToPreviousPage` ·
`resetToFirstPage`. It normalises the `null`/`undefined` first cursor that the two spellings
disagreed on. Each call site keeps one named `handleNextPage` that supplies the cursor from its own
query — that is a real binding, not a wrapper (box 3).

Converted (9 stacks in 8 files):
`features/accounting/banking/components/bank-account-detail-client.tsx` ·
`features/accounting/banking/components/transfers-client.tsx` ·
`features/accounting/sales/recurring-invoices-page.tsx` ·
`features/hr/cases/cases-page-content.tsx` (two stacks) ·
`features/hr/safety/safety-page-content.tsx` ·
`features/workflows/list/workflows-list-page.tsx` ·
`features/settings/roles/groups/groups-panel.tsx` ·
`features/directory/people/people-directory-page.tsx`

Behaviour is pinned by `frontend/hooks/common/use-cursor-page-stack.test.ts` — 7 cases covering
advance, back, the floor at page one, forward-history truncation, `null` normalisation, reset, and
the referential stability of the two dependency-free callbacks.

### Mutations that were hiding in a closure

| File | Was |
|---|---|
| `features/hr/global/contingent-page-content.tsx` | two `AlertDialogAction onClick` closures each guarding an id then firing `endContract.mutate` / `convert.mutate` with an inline `onSuccess` |
| `features/hr/enterprise/ops/identity/identity-page-content.tsx` | `onClick={(e) => { e.stopPropagation(); deleteTemplate.mutate(r.id); }}` inside a column `cell` |
| `features/payroll/ess/components/ess-disciplinary-section.tsx` | a 7-line `acknowledge.mutate` with an inline `onError` toast |
| `features/payroll/payout/bank-transfers/batch-detail-sheet.tsx` | a file-input `onChange` that read the file then reset the input |

Each is now a named handler (`handleConfirmEndContract`, `handleTemplateDelete`,
`handleAcknowledge`, `handleReturnFileChange`). Row-scoped actions use a named handler factory so
the JSX prop holds a call, not a closure.

### Filter handlers carrying `as` casts

`features/hr/safety/safety-page-content.tsx` and `features/hr/cases/cases-page-content.tsx` had
seven `onValueChange={(v) => { setX(v === SENTINEL ? "" : (v as SomeUnion)); setCursors([null]); … }}`
one-liners. Those are three violations stacked: an inline closure, a banned `as X` cast, and the
duplicated paginator reset. They are now named handlers delegating to named type predicates
(`isIncidentStatus`, `isIncidentType`, `isIncidentSeverity`, `isCaseStatus`, `isCaseCategory`,
`isCaseSeverity`, `isActiveTab`) built from the same option constants the `<SelectItem>`s render, so
the guard cannot drift from the list. **7 `as X` casts removed.**

---

## 3. Box 2 — validation and rules in named domain functions — **CLOSED**

Three business rules were living inside JSX closures and are now named functions:

| Rule | Was | Now |
|---|---|---|
| Goal progress increments by 10% | `handleProgressUpdate(goal.id, (goal.progress ?? 0) + 10)` inline in a `DropdownMenuItem` | `incrementGoalProgress()` + `GOAL_PROGRESS_COMPLETE_PERCENT` in `features/hr/performance/goal-schema.ts` |
| An SLA pause status toggles in or out of a set | a 10-line `onCheckedChange` doing `form.getValues` / `form.setValue` | `togglePauseStatus(current, status, shouldPause)` in `features/support/settings/sla-policy-form.schema.ts` |
| A return date before its departure date is cleared | an 8-line `onChange` comparing two ISO strings by hand | the existing `clearEndIfInvalid(…, "onOrAfter")` from `lib/date-constraints`, reused rather than rewritten |

`features/hr/performance/succession-tab.tsx` had the same four-line "set the field, then delete its
error" block copy-pasted into five separate `onChange` closures. One named `applyFieldEdit<K extends
keyof FormState>` now owns it, behind six named handlers. The readiness `onValueChange` had its
inline three-way string comparison replaced by a named `isSuccessionReadiness` predicate.

Zod schemas stayed in `*-schema.ts` files beside their features; no schema moved into a component.

---

## 4. Box 3 — no-op handler chains — **CLOSED**

An AST scan over my territory found methods and consts named `handle*`/`on*` whose entire body is a
single call passing its own parameters through unchanged.

**14 candidates → 9 removed → 4 remain, and all 4 are justified.**

Removed (the wrapper was deleted and the prop wired straight through):

```
features/accounting/core/generate-periods-dialog.tsx      handleClose(isOpen)          -> onOpenChange
features/accounting/expenses/expense-filters-bar.tsx      handleSearchChange(value)    -> onSearchChange
features/calendar/ticket-picker-dialog.tsx                handleOpenChange(isOpen)     -> onOpenChange
features/hr/automations/automation-rule-card.tsx          handleToggleChange(next)     -> onToggle
features/hr/shared/approval-actions.tsx                   handleApprove()              -> onApprove
features/timesheets/team/member-detail-sheet.tsx          handleOpenChange(v)          -> onOpenChange
features/workflows/builder/workflow-builder-canvas-surface.tsx  handleNodesChange      -> onNodesChange
features/workflows/builder/workflow-builder-canvas-surface.tsx  handleEdgesChange      -> onEdgesChange
features/settings/organization/hierarchy/cost-centers-page.tsx  handleSearchInputChange -> handleSearchChange
features/settings/organization/hierarchy/locations-page.tsx     handleSearchInputChange -> handleSearchChange
```

Four of these were `useCallback`-wrapped, so removing them also removed four memoizations that
existed only to stabilise a prop that was already stable.

Kept, with the reason:

- `features/calendar/meeting-follow-up-panel.tsx:215` `handleDoneNoSend` — `onClose` is optional;
  the wrapper supplies the optional call. It adds behaviour.
- `features/hr/benefits/dependents-manager.tsx`, `features/hr/benefits/plan-upsert-sheet.tsx`,
  `features/hr/travel/travel-page.tsx` — `handleSubmit()` invoking `form.handleSubmit(fn)()`. That
  is react-hook-form's submit pipeline, not a relay.

---

## 5. Box 4 — memoization and dependency honesty — **CLOSED**

This box was audited in both directions, because a wrong dependency array is a correctness bug while
a missing memo is not.

**The territory is heavily over-memoized: 2,102 `useCallback` and 292 `useMemo` calls, 830 of the
`useCallback`s with an empty dependency array.** Almost all of the empty ones wrap nothing but
`useState` setters, which are stable, so they are noise rather than defects and were left alone per
the PRD's closure protocol.

An AST scan that resolves each callback's free identifiers against its enclosing component's
locals found **15 dependency arrays that lie**. Ten are `startTransition` from `useTransition()`,
which React guarantees is stable — false positives, no change made. **The other five were real and
are fixed:**

| File | The lie |
|---|---|
| `features/payroll/loans/loans-table.tsx:126` | `useMemo(… , [canManage])` builds columns from `handleOpenAdjust` and `handleOpenApproval`, both plain function declarations recreated every render — the memo pins render one's copies forever |
| `features/payroll/payout/bank-transfers/batch-detail-sheet.tsx:222` | same shape, omitting `handleAction` |
| `features/payroll/payout/payslips/publications-tab.tsx:221` | same shape, omitting `handleDownload` |
| `features/hr/performance/calibration-tab.tsx:187` | same shape, omitting `handleChange` |
| `features/hr/onboarding/onboarding-templates-tab.tsx:85` | `handleSubmit` calls `resetForm()`, a plain function omitted from its dependency array |

None of the five is *currently* producing a wrong value, because every omitted function happens to
touch only stable state setters. That is luck, not design: the arrays claim a capture set they do
not have, so the first reactive read added to any of those functions goes stale silently. Each
omitted function is now a `useCallback` with a verified dependency array and is listed in the memo
that captures it. Every dependency added was checked by hand, not by autofix.

Two memoizations were **inert** — their dependency could never be stable, so they re-ran on every
render while claiming not to. `react-hooks/exhaustive-deps` flagged both:

- `features/calendar/calendar-view.tsx` — `const events = eventsResponse?.events ?? []` produced a
  fresh array on every render with no data, defeating the `calendarEvents` memo. Now a module-level
  `NO_CALENDAR_EVENTS` constant.
- `features/hr/leaves/components/leaves-wfh-content.tsx` — `handleExportExcel` was a `useCallback`
  keyed on `myLeaveRequests`, itself a fresh array every render. It is passed to a plain `onClick`,
  where referential identity affects nothing, so per box 4 the memo was removed rather than
  patched.

Post-fix rescan: **0 dishonest dependency arrays** in my territory outside the ten
`startTransition` false positives.

---

## 6. Box 1 residue — the 38 risky inline closures I did not convert

Counted and named, so the remainder is a list rather than an estimate.

Two clusters are cross-feature duplication I am **blocked** from deduping, because
`features/A` may not import from `features/B` (`check:import-direction`) and the only shared homes
are `lib/` and `components/`, both held by other agents right now:

- **Event-subscription toggle**, the same add-or-filter rule three times:
  `features/hr/settings/hr-integrations/webhook-upsert-sheet.tsx:224`,
  `features/settings/webhooks/webhook-create-sheet.tsx:171`,
  `features/hr/forms/components/form-renderer.tsx:149`.
- **Enter/Space keyboard activation** on a non-button element, twice:
  `features/hr/analytics/command-center-section.tsx:88`,
  `features/hr/enterprise/comp/comp-cycle-list.tsx:95`.

The remaining 33 are two-statement row actions (`e.stopPropagation(); doThing(row)` — 9 of them in
`background-verification-page-client.tsx` and `form-builder.tsx`), numeric-coercion `field.onChange`
wrappers on react-hook-form inputs (7), and `onOpenChange` reset pairs (6). Full list with line
numbers is reproducible from the scanner; none contains a mutation, a network call or a validation
rule. One does carry a real rule — `features/payroll/ess/components/ess-bank-section.tsx:256`
uppercases an IFSC code inline — and is the best next candidate.

---

## 7. Box 5 — thin seams on the backend — **CLOSED for what I own, with three findings routed out**

Corpus measured: **463 `*.controller.ts` files, 3,289 controller methods, 56,088 lines**, excluding
`modules/{payroll,kb,support}`, `db/schema/`, `migrations/` and `*.module.ts`.

### Fixed

**One authorization seam replacing nine copies.** `modules/ai/core/controllers/chat-assistant.controller.ts`
`confirmAction` is a 169-line nine-arm command dispatcher, and each arm opened with the same two
lines:

```
const deny = await this.toolAccess.denyReason(u.orgId, u.userId, "<key>");
if (deny) throw new ForbiddenException(deny);
```

Now a `CONFIRM_ACTION_PERMISSION: Record<ConfirmableAction, string>` table consulted **once**, before
the switch. Authorization happens at one seam instead of nine, and the exhaustive `Record` makes a
new confirmable action fail to compile until it declares its key. Every key was carried across
verbatim — see the finding below about one of them.

**One client-IP rule replacing ten copies.** `function clientIp(req: Request)` was reimplemented in
ten controllers in **four different ways**: six returned `string | undefined`, one appended an
`"anon"` fallback, and `build/execution/whiteboard-sharing.controller.ts` used a fourth form with
**no 100-character truncation and no comma-splitting when falling back to `req.ip`**. This value
feeds e-signature audit certificates, a legal artifact, so the provenance rule having four variants
is not cosmetic. Now `resolveClientIp` / `resolveClientIpOr` in `src/common/http/client-ip.ts`,
adopted by nine controllers. Two deliberate behaviour changes, both narrowing: the whiteboard
controller now truncates to 100 characters like everyone else, and an empty `X-Forwarded-For` header
now falls through to the socket address instead of recording an empty string. The tenth copy is in
`modules/support/core/support-channels.controller.ts`, another agent's territory — left in place and
reported.

### Found, NOT fixed — outside my territory, routed to the orchestrator

**(a) `build.ticket.status_changed` has a producer and no live consumer, and the gate says otherwise.**
`src/modules/build/core/build-ticket-status-changed-consumer.service.ts` is referenced by nothing in
`src/` except its own file and its own spec — verified by grep. It is **not** a provider in
`src/modules/build/core/projects.module.ts` (its sibling `BuildReleasePublishedConsumerService` is).
Nest therefore never constructs it, its `onModuleInit` never runs, and `registry.register(this)`
never happens. Meanwhile `projects-tickets-update.service.ts:296` emits that event on **every ticket
status change**. Those outbox rows accumulate and no assignee is ever notified.

`pnpm check:outbox-consumers` reports it green because it string-matches the literal
`readonly eventType = "build.ticket.status_changed"` inside the orphan file. **The gate proves the
string exists, not that the class is wired.** Both the module registration and the gate script fix
are outside my territory (`*.module.ts` is held). This is the single highest-severity finding in the
audit.

**(b) `org-setup.service.ts:80` does durable work in a bare `setImmediate`.**
`setImmediate(() => void runOutsideTenantContext(this.runPostSetupWork))` seeds system RBAC roles,
provisions module checklists, completes the setup session and sends the welcome email, with
`Promise.allSettled` and log-only error handling. It is not even after-commit-aware. A crash between
the organization write and the tick leaves an org with no roles, no checklists and an open session.
This is exactly the ticket-24 shape — a side effect leaving the process whose loss is a correctness
bug — and belongs in the transactional outbox (`OutboxWriter.emit(tx, …)`,
`src/common/outbox/outbox-writer.ts:36`). Not fixed: it needs a new consumer plus a `*.module.ts`
registration, which is held territory.

**(c) `check:fire-and-forget` is green and near-blind.** It exits 0 having scanned 1,838 files, and
its own output admits it covers two method names (`emit`, `savePosition`). It printed 39 uncovered
floating-promise targets — `.attemptDelivery()`, `.dispatchScheduledAutomation()`,
`.sendLeadAssignedNotification()`, `.dispatchRejectionEmail()` and more — and passed anyway. Counted
in the corpus: **33 `registerAfterCommit` call sites, 145 `void this.`, ~90
`.catch(() => undefined)` that swallow the error entirely, and 7 bare
`(async () => {…})().catch(() => undefined)` IIFEs that are not even `void`-marked.** The ones whose
effect leaves the process — and therefore belong in the outbox — include
`hr/time/leaves-write.service.ts:274` (starts a workflow and dispatches notifications, swallowing
every error with no log line), `hr/lifecycle/onboarding-views-support.ts:33` (fires automations that
fan out to webhooks and email, fully swallowed),
`organization/core/org-membership-access-revocation.ts:318` (an HTTP call to Ably that **duplicates**
an existing `realtime.token-revocation` outbox event, and is the copy that can be lost),
`email/controllers/hr-send-email.controller.ts:105` (a provider send with no outbox row and no
idempotency key — a retry double-sends), and
`ai/core/controllers/crm-ai.controller.ts:134,149` (a floating call that opens a transaction and
inserts `auditLogs`; an audit record dropped on the floor).

The correct shape already exists in this repo and should be the reference for all of them:
`notifications/notification-dispatch.service.ts:111` writes the intent inside the transaction with
`onConflictDoNothing`, uses after-commit only as a latency optimisation, and keeps
`notification-outbox-relay.service.ts` as the crash backstop.

**(d) Two more zero-caller `@Injectable`s.** `IngressModule` provides neither
`ingress/adapters/telephony-call-log.service.ts:83` nor `ingress/adapters/whatsapp-ingress.service.ts:108`;
each is referenced only by its own spec. The telephony one has a full tenant-isolation spec suite
testing code nothing calls.

There is **no `boundDrain` symbol anywhere in `src/`, `scripts/` or `test/`** — ticket 31's finding
is gone from head. All six real drain helpers (`drainByKeyset`, `drainWithCursor`, `drainPages`,
`drainIds`, `drainExportPages`, `drainBacklog`) have callers, and all 12 cron controllers are
registered.

---

## 8. Box 6 — duplicated rules and response shaping — **CLOSED for what I own**

Fixed: the 8-copy cursor paginator (§2), the 5-copy succession field-error block (§3), the 9-copy
`denyReason` gate and the 10-copy `clientIp` (§7).

**Found and NOT fixed — the largest duplication in either repo:**

**63 verbatim copies of the cron lease/skip/error envelope.** Three independent greps agree:
`withLease(` = 63, `if (!outcome.ran)` = 63, `"already running"` = 63. Distribution:
`cron-platform.controller.ts` 14 · `cron-hr` 9 · `cron-build` 8 · `cron-notifications` 7 ·
`cron-support` 7 · `cron-billing` 6 · `cron-hr-notifications` 6 · `cron-outbox` 2 · `cron-gdpr` 1 ·
`cron-storage` 1 · `cron-invitation-expiry` 1 · `workflows-cron` 1. On top of that sit **63 GET/POST
twin relays** (126 methods) whose entire body is `return this.runX(authorization);` — legitimate as
route ownership, but they double the surface.

Every copy independently decides the skip-response shape, the log message and the error mapping, and
**they already disagree**: `cron-platform.controller.ts:198` returns `{ ok: true, skipped: true }`
while `:222` returns `{ success: true, skipped: true }`. One `runCronJob(name, ttl, fn, describe)`
helper would collapse all 63.

I did not do it. It is 63 call sites across 12 files with per-job response shapes that external
schedulers and e2e specs read, and converting a subset would leave two mechanisms side by side —
which this session has already been burned by. It is a ticket of its own and should be routed as
one, converted in a single pass with `cron.controller.e2e-spec.ts` as the proof.

Also found, not fixed (all outside or larger than this ticket): `ensureLlm` reimplemented privately
in 9 AI controllers · the `InboxConsumer.claim` five-field preamble hand-copied in 19 consumers ·
the AV-scan + capacity + plan-upload admission preamble duplicated byte-for-byte between
`storage.controller.ts:140-165` and `storage-onboarding.controller.ts:88-105` · the chat
system-message announcement block duplicated between `chat-actions.controller.ts:61` and
`chat-entity-actions.controller.ts:112`.

---

## 9. A security finding surfaced by the box-6 work

Collapsing the nine `denyReason` calls into one table made the whole permission mapping visible on
one screen, and it shows a mismatch:

```
"email.send":  "chat:messages:write"      <-- sends an outbound EMAIL
"mail.send":   "mail:messages:send"
```

`case "email.send"` reaches `EmailOutboxService.enqueueAndTry` — a real outbound send — while gating
on a **chat** permission. `mail.send`, the sibling, correctly requires `mail:messages:send`. Anyone
holding `chat:messages:write` can send outbound email through the AI confirm path.

**I did not change it.** Ticket 38 is a refactor and changing an authorization key is a security and
product decision with real blast radius — tightening it could lock out callers who use the path
today. The table preserves every key exactly as it was. This needs an owner's decision, not a
refactorer's.

---

## 10. Gates — command, exit code, number

Frontend:

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` | **2** | 1 error, **not mine**: `features/billing/components/payments-tab.tsx:125` — `Payment.amount` is `string \| null` where `types/invoice.ts` declares `string \| number`. `features/billing/**` is not in my territory and the file is unmodified in the working tree. Zero errors in any path I touched. |
| `pnpm -C frontend exec jest --runInBand --testPathPattern="(hooks/common/use-cursor-page-stack\|features/accounting/banking\|features/hr/performance\|features/settings/organization/hierarchy\|features/settings/roles\|features/directory\|features/calendar\|features/notifications\|features/timesheets\|features/payroll\|features/support\|features/workflows)"` | **0** | 34 suites, **199 tests passed**, 0 failed |
| `pnpm check:effect-fetches` | **0** | 0 violations, 5,226 files |
| `pnpm check:query-scope` | **0** | 0 violations, 5,226 files |
| `pnpm check:icon-labels` | **0** | 0 violations, 3,806 files |
| `pnpm check:empty-states` | **0** | 0 violations, 3,806 files |

Note on `check:empty-states`: the brief flagged it as known-red at
`features/workflows/builder/workflow-builder-canvas.tsx:118` pending ticket 30. **It is green now** —
0 violations across 3,806 files. Either ticket 30 landed its fix or the finding was resolved
upstream; nothing in my change touches that file's empty state.

Backend:

| Command | Exit | Number |
|---|---|---|
| `pnpm -C backend typecheck` | **2** | 1 error, **not mine**: `modules/finance/ap/payment-run-executor.service.ts:157` — `Cannot find name 'newStatus'`. That file shows as ` M` in the shared working tree; another agent is mid-rename. Zero errors in any path I touched. |
| `pnpm -C backend check:spec-typecheck` | **2** | 2 errors, **neither mine**: the same `payment-run-executor.service.ts:157`, plus `src/db/__tests__/db-call-count-contract.spec.ts:64`. |
| `pnpm -C backend exec jest --runInBand --testPathPattern="(e-sign\|feedbucket\|whiteboard\|chat-assistant\|public\.controller\|client-ip)"` | **0** | 27 suites, **213 tests passed**, 0 failed |
| `pnpm check:route-classification` | **0** | 3,609 handlers — public 239 / universal 100 / permissioned 3,210 / in-service 60 / **UNDECLARED 0** |
| `pnpm check:fire-and-forget` | **0** | 1,838 files, 0 violations *within its covered surface* — see §7(c); the gate itself is the finding |
| `pnpm check:outbox-consumers` | **0** | 25 emitted / 28 consumed, "OK" — **and it is wrong**, see §7(a) |
| `pnpm exec eslint` on my 4 changed backend files | **0** | 0 problems |

Not run: frontend repo-wide `pnpm lint` (258/48 pre-existing errors on main make it uninformative
here), backend `pnpm test:e2e`, `madge --circular`, `knip`, any seeded database work.

---

## 11. Files changed

**Frontend (35 files, 2 new)**

```
hooks/common/use-cursor-page-stack.ts                              (new)
hooks/common/use-cursor-page-stack.test.ts                         (new)
features/accounting/banking/components/bank-account-detail-client.tsx
features/accounting/banking/components/transfers-client.tsx
features/accounting/sales/recurring-invoices-page.tsx
features/accounting/core/generate-periods-dialog.tsx
features/accounting/expenses/expense-filters-bar.tsx
features/calendar/calendar-view.tsx
features/calendar/ticket-picker-dialog.tsx
features/directory/people/people-directory-page.tsx
features/hr/automations/automation-rule-card.tsx
features/hr/cases/cases-page-content.tsx
features/hr/enterprise/ops/identity/identity-page-content.tsx
features/hr/global/contingent-page-content.tsx
features/hr/leaves/components/leaves-wfh-content.tsx
features/hr/onboarding/onboarding-templates-tab.tsx
features/hr/performance/calibration-tab.tsx
features/hr/performance/goal-schema.ts
features/hr/performance/goals-tab.tsx
features/hr/performance/succession-tab.tsx
features/hr/safety/safety-page-content.tsx
features/hr/shared/approval-actions.tsx
features/hr/travel/travel-request-form.tsx
features/payroll/ess/components/ess-disciplinary-section.tsx
features/payroll/loans/loans-table.tsx
features/payroll/payout/bank-transfers/batch-detail-sheet.tsx
features/payroll/payout/payslips/publications-tab.tsx
features/settings/organization/hierarchy/cost-centers-page.tsx
features/settings/organization/hierarchy/locations-page.tsx
features/settings/roles/groups/groups-panel.tsx
features/support/settings/sla-policy-form-fields.tsx
features/support/settings/sla-policy-form.schema.ts
features/timesheets/team/member-detail-sheet.tsx
features/workflows/builder/workflow-builder-canvas-surface.tsx
features/workflows/list/workflows-list-page.tsx
```

**Backend (11 files, 1 new)**

```
src/common/http/client-ip.ts                                       (new)
src/modules/ai/core/controllers/chat-assistant.controller.ts
src/modules/build/execution/whiteboard-sharing.controller.ts
src/modules/e-sign/sign-certificates.controller.ts
src/modules/e-sign/sign-documents.controller.ts
src/modules/e-sign/sign-envelopes.controller.ts
src/modules/e-sign/sign-fields.controller.ts
src/modules/e-sign/sign-public.controller.ts
src/modules/e-sign/sign-recipients.controller.ts
src/modules/feedbucket/feedbucket-public.controller.ts
src/modules/public/public.controller.ts
```

---

## 12. What is still open

**Box 1 — PARTIAL.** 38 risky inline closures remain in my territory, counted and named in §6. Five
of them are two cross-feature duplications that cannot be deduped without a shared home in `lib/` or
`components/`, both held. The other 33 are two-statement row actions and numeric-coercion input
handlers with no mutation, network call or validation rule in them.

Boxes 2, 3, 4, 5 and 6 are closed for the territory I hold. What I could not fix is listed in §7 and
§8 with file, line and the reason, and none of it is blocked on me.
