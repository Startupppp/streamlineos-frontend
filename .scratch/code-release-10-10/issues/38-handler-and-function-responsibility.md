# 38 — Handler and function responsibility across UI and backend

**What to build:** The §2.3 contract. Named handlers own event and transport orchestration; reusable rules live in domain functions rather than in inline closures or meaningless wrapper chains.

**Blocked by:** 36.

**Status:** 5 of 6 closed — box 1 PARTIAL. S13 converted the 10 of the 16 named risky closures that fall in this territory; the 6 that remain are features/inventory (5) and features/crm (1), both out of release scope. The box still cannot tick, for the reason S11 recorded: clause two is written as an absolute and 1,562 inline arrows remain, deliberately out of scope. Reports: `reports/38-handler-responsibility.md`, `reports/38c-closure-residue.md`, `reports/30c-a11y-residue-and-query-gating.md` (S13)
Routed findings 1-3 (outbox orphan + both gates) ADDRESSED — see `reports/38b-outbox-and-fire-and-forget.md`.

**2026-09-03 residual-risk register:** box 1 = **R-10 / R-10b / R-10c**, ACCEPTED RESIDUAL. Clause two is NOT reopened; the release owner ratifies the exclusion (deadline 2026-09-10). Path correction: the five inventory paths in this ticket are missing their `components/` segment. See `reports/residual-risk-register.md` §3.9.

- [ ] Non-trivial UI events and form actions use named, typed handlers whose names express user intent. No inline arrow or function expression appears in a JSX event prop.
      PARTIAL, and the two halves of this box now have different answers.
      **First clause — CLOSED for `features/build|hr|chat|notifications`.** Re-measured at head with the
      same scanner: 3,808 `.tsx` files, **1,562 inline arrows in JSX event props, 196 non-trivial, 16 risky**
      (a mutation, a sequence, validation, or something that can fail), and **0 of the 16 are in
      build/hr/chat/notifications** — down from 11. The five cross-feature duplications the last pass was
      blocked on now have shared homes and are converted (`lib/keyboard-activation.ts`,
      `lib/toggle-in-list.ts`). Eleven more were converted this session, of which the largest was one rule
      retyped at **44 call sites in eight disagreeing spellings**: numeric coercion on a form field, where
      `Number(v)` yields `0` for an emptied box, `parseInt(v, 10)` yields `NaN` and `v === "" ? undefined :
      Number(v)` yields `undefined`. `NaN` is a real defect — `shift-form-sheet`'s `breakMinutes` is a
      required `z.number().int()`, so clearing the box produced "Expected number, received nan" instead of
      "Required" and `.min(0)` never ran. `lib/numeric-field.ts` owns it now (13 tests, two bite proofs).
      One banned `as SurveyQuestion["type"]` cast was removed in the same pass.
      **Second clause — OUT OF SCOPE, deliberately, and this is the judgement the box was ambiguous about.**
      "No inline arrow appears in a JSX event prop" is literally false at 1,562 occurrences and would stay
      false after any amount of work short of converting all of them. Roughly 84% are
      `onClick={() => setOpen(true)}`: one call to a stable state setter, no rule, no mutation, no failure
      mode, and no behaviour to change by naming it. Converting them touches ~1,300 files for zero
      behavioural difference, and the PRD's closure protocol forbids reopening closed files for naming
      taste. **The first clause is the substantive one and it is what was measured.** The box stays
      unticked because the second clause is written as an absolute and is not met.
      **S13 UPDATE — 10 of the 16 converted, and the bank-code rule turned out to hide a real defect.**
      The uppercase-alphanumeric code rule was written three ways and they disagree on a paste.
      `components/hr/_onboarding/step-banking.tsx:93` tested the whole value and skipped `field.onChange`
      when the test failed; the input is controlled, so pasting `SBIN0001234 ` from a bank statement put
      the old value straight back with nothing said about why — the box reads as frozen. The ESS copy
      (`features/payroll/ess/components/ess-bank-section.tsx:256`) upper-cased only, handing an invalid
      code to the resolver. The PF/UAN and ESI length tests had the same reject-the-edit shape.
      `lib/code-field.ts` now owns it — uppercase, strip punctuation, truncate at the cap — with
      `digitsFieldValue` for the digits-only variant; `lib/comma-list.ts` takes over `parseOptionList`,
      which had a second caller in `components/automations` that could not import it out of `features/hr`.
      Pinned by `lib/__tests__/code-field.test.ts` (16 cases, three bite proofs asserting that the
      reject-the-edit test refuses a pasted code and that upper-casing alone leaves it invalid) and
      `lib/__tests__/comma-list.test.ts` (8, two bite proofs).
      Converted: `_onboarding/step-banking.tsx` x3 · `_onboarding/step-skills-pay.tsx` x3 ·
      `components/automations/ai-node-config-forms.tsx` x2 · `components/assistant/global-ask-os.tsx` ·
      `features/surveys/respondent/simple-question-input.tsx` ·
      `features/accounting/assets/create-asset-sheet.tsx` (x2 — the depreciation-method closure beside it
      was the same shape) · `features/payroll/ess/components/ess-bank-section.tsx`.
      **REMAINS after S13: 6, all out of release scope** — `features/inventory` 5
      (`order-line-table.tsx:146`, `receive-goods-sheet.tsx:381`, `stock/create-adjustment-sheet.tsx:119`,
      `stock/new-transfer-sheet.tsx:110`, `warehouse/warehouse-create-sheet.tsx:138`) and
      `features/crm/autonomy/autonomy-switches-panel.tsx:116`.
      Found and NOT fixed, recorded instead: `components/hr/_onboarding/step-banking.tsx:33` restricts the
      account-holder name to `/^[A-Za-z\s]*$/` with the same reject-the-edit shape, so a pasted "O'Brien"
      or "Jose Muller" with a diacritic silently does nothing. Converting it would bless a Latin-only name
      rule in a shared module; which characters a name may hold is a product decision, not a refactor.
      PRE-S13 RESIDUE, for the record: 16 risky closures in `components/` (5),
      `features/inventory` (4), `features/crm` (1), `features/accounting` (1), `features/payroll` (1),
      `features/surveys` (1), `components/automations` (2), `components/assistant` (1). Two of them —
      `components/automations/ai-node-config-forms.tsx:380` and
      `features/surveys/respondent/simple-question-input.tsx:41` — are the same numeric-coercion rule and
      can now import `lib/numeric-field.ts` instead of retyping it.
      **DISPOSITION 2026-09-03 — ACCEPTED RESIDUAL R-10, R-10b, R-10c. Clause two is NOT reopened. Register:
      `reports/residual-risk-register.md` §3.9.**
      **R-10 — clause two ("no inline arrow appears in a JSX event prop"), 1,562 occurrences. Blocker: DECISION,
      already taken and recorded in writing above. Owner: release owner, to RATIFY the exclusion so this box's
      failure to tick is an accepted decision rather than an unexplained gap. Deadline: 2026-09-10.** A coarse
      recount at head returns **1,575** occurrences of an inline arrow opening a JSX event prop, consistent with
      the 1,562 measured by this ticket's stricter scanner. Not reopened.
      **R-10b — the 6 remaining risky closures. Blocker: SCOPE. Owner: CRM/inventory release owner. Deadline:
      2026-12-01 review.** All 6 verified present at head.
      **PATH CORRECTION — the five inventory paths above are missing their `components/` segment**, so a reader
      checking them finds five missing files and would conclude the note was stale. They are
      `features/inventory/components/order-line-table.tsx:146` ·
      `features/inventory/components/receive-goods-sheet.tsx:381` ·
      `features/inventory/components/stock/create-adjustment-sheet.tsx:119` ·
      `features/inventory/components/stock/new-transfer-sheet.tsx:110` ·
      `features/inventory/components/warehouse/warehouse-create-sheet.tsx:138`. The sixth,
      `features/crm/autonomy/autonomy-switches-panel.tsx:116` (`onCheckedChange={(enabled) =>`), is correct as
      written.
      **R-10c — `components/hr/_onboarding/step-banking.tsx:33`'s `/^[A-Za-z\s]*$/` account-holder-name rule.
      Blocker: DECISION (which characters a name may hold; a pasted "O'Brien" or a diacritic silently does
      nothing). Owner: HR product owner. Deadline: 2026-09-17.**
- [x] Handlers delegate validation and state-independent rules to explicitly named domain functions, and do not embed business logic or multi-step mutations.
- [x] No handler-to-handler chain exists that adds no behaviour.
- [x] Memoization of a handler is used only where referential identity affects memoization, subscription or effect correctness, and every dependency is verified.
- [x] NestJS controllers, queue and event consumers, cron entry points and server actions stay thin: validate and authorize at the correct seam, build the command context, invoke one cohesive implementation, map its typed result or error.
- [x] Business rules, database orchestration and response shaping are not duplicated across handlers.

## Proof

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` | 2 | 1 error, not mine — `features/billing/components/payments-tab.tsx:125`, file unmodified, outside territory. 0 errors in every path I touched. |
| `pnpm -C frontend exec jest --runInBand --testPathPattern=…` | 0 | 34 suites, 199 tests passed |
| `pnpm check:effect-fetches` / `check:query-scope` | 0 | 0 violations, 5,226 files each |
| `pnpm check:icon-labels` / `check:empty-states` | 0 | 0 violations, 3,806 files each |
| `pnpm -C backend typecheck` | 2 | 1 error, not mine — `modules/finance/ap/payment-run-executor.service.ts:157`, another agent mid-rename |
| `pnpm -C backend check:spec-typecheck` | 2 | 2 errors, neither mine |
| `pnpm -C backend exec jest --runInBand --testPathPattern=…` | 0 | 27 suites, 213 tests passed |
| `pnpm check:route-classification` | 0 | 3,609 handlers, 0 undeclared |
| `pnpm check:fire-and-forget` | 0 | 1,838 files, 0 violations within its covered surface |
| `pnpm check:outbox-consumers` | 0 | 25 emitted / 28 consumed |

`check:empty-states` was flagged known-red at `features/workflows/builder/workflow-builder-canvas.tsx:118`
pending ticket 30. It is green now — 0 violations across 3,806 files.

## Routed out of this ticket

> **Items 1-3 were routed to a follow-up agent and are now ADDRESSED.**
> Report: `reports/38b-outbox-and-fire-and-forget.md`. Backend commit on `main`.
> - **1 — ADDRESSED.** `BuildTicketStatusChangedConsumerService` is now a provider in
>   `projects.module.ts`. The event was verified live before anything was touched
>   (`notification-events-build.catalog.ts:25` and `cross-cell-events.spec.ts:28` both reference it),
>   so registering it — not deleting it — was the fix. Unregistered it dead-lettered every ticket
>   status change: `OutboxPublisherService.deliver()` throws with no consumer.
>   `check:outbox-consumers` now resolves the Nest module graph from `AppModule` instead of
>   string-matching a `readonly eventType` literal. Bite-proved: exit 1 unregistered, exit 0
>   re-registered. Re-run over every emitted type: **26 emitted / 29 registered / 0 orphans**.
>   It was blind to exactly one orphan — the first registration-aware run flagged six more, all of
>   which proved to be false positives from `imports: BUILD_MODULES` array-const module lists that
>   the new parser did not yet resolve. Verified by hand against the module files before fixing.
> - **2 — ADDRESSED.** The `setImmediate` in `org-setup.service.ts` is gone. The four post-setup
>   steps now ride the transactional outbox (`organization.setup.completed`, emitted inside the
>   setup transaction) and are performed by `OrgSetupCompletedConsumerService`, which rethrows on
>   failure so the event retries and finally dead-letters instead of being logged and dropped.
>   Two further `void withIdentity(...)` floating promises removed in the same pass. Covered by
>   `org-setup-durability.spec.ts`, mutation-proved to fail (2 of 10) if the work is put back on a
>   fire-and-forget path.
> - **3 — ADDRESSED.** `check:fire-and-forget` no longer prints findings and exits 0. Tier 1 (banned
>   dispatch/checkpoint shapes) stays at zero tolerance; tier 2 ratchets **every** floating promise
>   and swallowed rejection across all of `src` — corpus widened from 1,839 files / 2 method names
>   to 3,574 files / every shape. Ratchet pinned at the **measured** 283 (200 floating + 83
>   swallowed, dated in the source beside the constant). `registerAfterCommit` (54) is inventoried,
>   not gated, because CLAUDE.md §4 sanctions it. Bite-proved: +1 floating promise → exit 1.
> - Items 4-6 remain open and unrouted.


1. **`build.ticket.status_changed` has a producer and no live consumer.**
   `src/modules/build/core/build-ticket-status-changed-consumer.service.ts` is not a provider in
   `projects.module.ts`, so Nest never constructs it and `onModuleInit` never registers it, while
   `projects-tickets-update.service.ts:296` emits the event on every ticket status change.
   `check:outbox-consumers` reports green because it string-matches the `readonly eventType` literal
   inside the orphan file — the gate proves the string exists, not that the class is wired. Needs a
   `*.module.ts` edit plus a gate fix; both held.
2. **`org-setup.service.ts:80` seeds RBAC roles, provisions checklists, closes the setup session and
   sends the welcome email inside a bare `setImmediate`** with log-only error handling. Ticket-24
   shape; belongs in the transactional outbox.
3. **`check:fire-and-forget` covers two method names** and printed 39 uncovered floating-promise
   targets while exiting 0. 33 `registerAfterCommit`, 145 `void this.`, ~90 `.catch(() => undefined)`
   in the corpus; report §7(c) names the ones whose effect leaves the process.
4. **63 verbatim copies of the cron lease/skip/error envelope** across 12 controllers, which already
   disagree on the skip-response shape (`{ ok: true }` vs `{ success: true }`). One `runCronJob`
   helper collapses all 63 — a ticket of its own, converted in one pass, not a subset.
5. **`case "email.send"` in `chat-assistant.controller.ts` gates an outbound email on
   `chat:messages:write`** while its sibling `mail.send` requires `mail:messages:send`. Surfaced by
   collapsing nine permission checks into one table. Keys were carried across verbatim — changing an
   authorization key is an owner's decision, not a refactorer's.
6. Two more zero-caller `@Injectable`s absent from `IngressModule`:
   `ingress/adapters/telephony-call-log.service.ts:83`, `ingress/adapters/whatsapp-ingress.service.ts:108`.
