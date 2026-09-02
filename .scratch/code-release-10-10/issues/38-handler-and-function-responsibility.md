# 38 — Handler and function responsibility across UI and backend

**What to build:** The §2.3 contract. Named handlers own event and transport orchestration; reusable rules live in domain functions rather than in inline closures or meaningless wrapper chains.

**Blocked by:** 36.

**Status:** 5 of 6 closed — box 1 PARTIAL with a counted residue. Report: `reports/38-handler-responsibility.md`

- [ ] Non-trivial UI events and form actions use named, typed handlers whose names express user intent. No inline arrow or function expression appears in a JSX event prop.
      PARTIAL: measured first — 1,469 inline arrows in JSX event props repo-wide across 3,223 `.tsx` files, 818 in my territory, of which 138 are non-trivial and 61 risky (a mutation, a sequence, validation, or something that can fail). 23 of the 61 risky ones are now named handlers, including one 9-line cursor-paginator closure duplicated across 8 files. 38 risky closures remain, named and counted in report §6. Five of those are two cross-feature duplications (event-subscription toggle ×3, Enter/Space activation ×2) that cannot be deduped without a shared home in `lib/` or `components/` — both held by other agents. The other 33 are two-statement row actions and numeric-coercion `field.onChange` wrappers with no mutation, network call or validation rule in them.
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
