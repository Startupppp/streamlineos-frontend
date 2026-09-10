# PRD — AuthContext: one per-request answer for module availability

Status: **IN PROGRESS** · Opened 2026-09-10 · Owner: this session
Baseline commit: `db887baad`

Not a lane file. Deliberately **outside** `architecture-refactor/prd/`, because
`frontend/scripts/check-prd-traceability.mjs` reads `architecture-refactor/prd/**` plus
`PRD-10-10-CODE-RELEASE-TODO.md` and fails an unindexed lane. Nothing here is a `PRD-Cnnn`
criterion and nothing here renumbers one.

---

## 1. Why

`ModuleGuard` and `authorize()` each resolved module availability for the same
`(user, org, moduleKey)` on the same request, through two resolvers that were equivalent
**except in degrade mode**:

| Path | Module map source | Degrade branch |
|---|---|---|
| `module.guard.ts:46` → `AccessService.moduleAvailabilityFor` | `entitlements.getModuleMap(orgId)` | none |
| `authorize.ts:34` → own resolver from `access.getModuleState` | `getModuleState(orgId, key)` | `entitlements.service.ts:181-185` returns **true** when `moduleTableUnavailable && RBAC_MIGRATION_MODE === "degrade"` |

So with the `org_modules` table unavailable in degrade mode, `authorize()` treated a module as
enabled while `ModuleGuard` fell through to the plan-lock check. One request, two answers.

Verified duplications this closes: 2 (`module.guard.ts:46` / `authorize.ts:34`).
Verified duplications this does **not** close: 0 — the membership pair was investigated and is
**not** a duplicate (see §5).

## 2. Decisions taken

| # | Decision | Rationale |
|---|---|---|
| D1 | Scope is the module-availability memo only | The one verified duplication |
| D2 | `AuthContext` **wraps** `CurrentUserContext`, does not extend it | `req.user` stays plain serialisable data; it is logged |
| D3 | `JwtAuthGuard` constructs it, at both `req.user` sites | It already owns actor construction; no sixth global guard |
| D4 | Carried on `req.authContext` | No `Scope.REQUEST`, no CLS package, and the tenant ALS is entered by an interceptor so guards cannot read it |
| D5 | Detached construction via the same factory | HR export worker and workflows cron have no request; one code path, not two |
| D6 | Fail closed, lazy per-field | `PermissionGuard` already catches and denies (`permission.guard.ts:41-47`) |
| D7 | Memo adopts **ModuleGuard's** semantics — no degrade fail-open | Consistent with D6; a missing `org_modules` table must never silently grant |
| D8 | Memo keys on the **normalised** module key | `moduleAvailability` normalises internally; the two callers arrive with differently-shaped keys |
| D9 | Name: `AuthContext` in `common/auth/auth-context.ts` | Free (zero collisions); survives detached use, unlike `RequestAuthContext` |
| D10 | Proof: typecheck + unit + guard-chain spec | §11 requires RBAC allow/deny; failure mode here is "everyone gets in" |
| D11 | ADR 0004 records D7 and the once-per-request rule | A future reviewer would otherwise read one lookup as a missing check |

**Explicitly out of scope:** memoising `scopeFor`, and the liveness gap in §5.

## 3. Interface

```ts
export interface AuthContext {
  readonly actor: CurrentUserContext;
  moduleAvailable(moduleKey: string): Promise<ModuleAvailabilityResult>;
}

export function createAuthContext(
  actor: CurrentUserContext,
  lookup: ModuleAvailabilityLookup,
): AuthContext;
```

`authorize()` changes from `ctx: CurrentUserContext | null` to `ctx: AuthContext | null`, reads
`ctx.moduleAvailable(...)`, and passes `ctx.actor` to `scopeFor`. Its `access` parameter narrows
from `AccessResolver` to `AccessScopeResolver` (`{ scopeFor }`); `AccessResolver` still exists and
still extends it, because `search.service.ts` uses its two module members.

## 4. TODO

### Lane CORE — done in-session, do not re-edit
- [x] `common/auth/auth-context.ts` — interface + `createAuthContext` + normalised memo
- [x] `common/auth/auth-context.decorator.ts` — `@AuthCtx()`
- [x] `common/auth/jwt-auth.guard.ts` — inject `MODULE_GUARD_ACCESS`, `attach()` at both sites
- [x] `common/rbac/module.guard.ts` — read `req.authContext`; drop the now-unused `accessSvc`
- [x] `modules/access/authorize.ts` — take `AuthContext`, split `AccessScopeResolver` out
- [x] `modules/access/permission.guard.ts` — pass `req.authContext`
- [x] Confirm `MODULE_GUARD_ACCESS` is provided where `JwtAuthGuard` is constructed — `AccessModule` is
      `@Global()` and both provides (`access.module.ts:28`, `useExisting: AccessService`) and exports it (`:39`)

### Lane A — in-request controller call sites · DONE
- [x] `modules/gdpr/gdpr.controller.ts` — `getExportJobStatus`, `downloadExportJob`
- [x] `modules/support/core/support-tickets.controller.ts` — `addMessage`
- [x] `modules/payroll/insights/reports.controller.ts` — `assertExport(authCtx: AuthContext)`; the brief
      assumed 1 caller, there were **10** (`getSummary`, `getRegister`, `getDepartmentCost`, `getCostCenter`,
      `getEarnings`, `getDeductions`, `getReimbursements`, `getTax`, `getBankPayout`, `getVariance`)
- [x] `modules/payroll/insights/journal.controller.ts` — `getJournal`
- [x] `modules/payroll/insights/journal-outbox.controller.ts` — `exportCsv`
- [x] GATE FOLLOW-UP CLEARED: those handlers take both `@CurrentUser() u` and `@AuthCtx() authCtx`, and
      `noUnusedParameters` is OFF so tsc would not have reported a dangling one. Counted by hand:
      `reports.controller.ts` has **10** `u.orgId` reads for 10 handlers, `journal-outbox.controller.ts`
      **9** for 9, `journal.controller.ts` **1** for 1. Every `u` is still load-bearing — it carries the
      tenant into the service call, while `authCtx` carries only the export authorization. No parameter
      to remove.

### Lane B — detached callers · DONE
- [x] `modules/hr/import/hr-export-jobs.service.ts` — `createAuthContext(context, this.access)` at :233,
      both `authorize` calls take it. `this.access` is `AccessService`, whose `moduleAvailability`
      (`access.service.ts:321`) satisfies `ModuleAvailabilityLookup` structurally. Both keys are `hr:*`,
      so this site collapses 2 lookups to 1.
- [x] `modules/workflows/engine/workflow-runner.service.ts` — **no change needed.** It never imports or
      calls `authorize()` and builds no `CurrentUserContext`; it calls `resolveUserPermissions` only.
      The signature change does not reach it. It remains in scope for the §5 risk.

### Lane C1 — access specs · DONE
- [x] `modules/access/authorize.spec.ts` — ~24 call sites. `makeResolver` collapsed from 7 params to
      `{ scopeFor }`; a new `ctxFor(actor, options)` helper carries availability. Three tests were
      reinterpreted and the lane named them: the plan-lock probe now fires from `ctxFor`'s lookup
      rather than authorize's internals (**load-bearing** — an unconditional `onPlanLockedRead` would
      make it pass trivially), the user-deny ordering moved into the lookup preserving deny-before-org,
      and the BOLA orgId capture moved from `getModuleState` to `scopeFor`.
- [x] `modules/access/c4-production-wiring.spec.ts` — `new ModuleGuard(reflector)` arity fixed; the
      request mock now carries `authContext`, without which `ModuleGuard` short-circuits on
      `!authContext` and proves nothing. Two stale assertions removed (`getModuleState` called,
      `getModuleMap` not called). Wiring regex widened to match `moduleAvailable(`.
- [x] **The assertion that proves the refactor**: one shared context across `ModuleGuard.canActivate`
      and `authorize()` for the same module invokes the lookup **exactly once**.
- [x] NEW `common/auth/auth-context.spec.ts` — five tests: same key once, distinct keys once each,
      `"HR"`/`"hr"`/`" hr "` share one entry, `actor` identity, rejecting lookup propagates.

### Lane C2 — remaining specs · DONE, but **three of its verdicts were wrong and were corrected by hand**
- [x] `modules/settings/settings-route-gates.spec.ts` — agent said "no change needed, `PermissionGuard`
      still reads `req.user`". **False** — it reads `req.authContext` now. Its request mock at :181 was
      `{ user: actor }`, so every gated route would have thrown `UnauthorizedException` instead of
      `ForbiddenException`, and the "opens for the one key it names" cases would have failed. Fixed:
      the mock now carries an `authContext` with availability true, so the key remains the only variable.
- [x] `modules/gdpr/gdpr.controller.spec.ts` — agent said "no change needed" because `authorize` is
      jest-mocked. **Missed the arity change**: `getExportJobStatus` now takes three parameters. Fixed:
      added `AUTH_CTX` and passed it at all four call sites.
- [x] `modules/ownership/__tests__/ownership.controller.e2e-spec.ts` — stale JSDoc removed by the agent,
      but its `mockAccessService` had no `moduleAvailability`, and it is injected as `AccessService`,
      which is what `MODULE_GUARD_ACCESS` resolves to. `createAuthContext` would have called `undefined`.
      Fixed: added `moduleAvailability` returning available, matching the old always-true `getModuleState`.
- [x] `modules/chat/chat-entity-channel.controller.e2e-spec.ts` — same missing `moduleAvailability`.
      Fixed: it now follows `isModuleEnabled`, preserving the test at :281 that disables a module.
- [x] `modules/search/search.service.spec.ts` · `degradation/search-index.spec.ts` — genuinely no change;
      they exercise `resolveSearchAccess`, which still takes the full `AccessResolver`.

**Lesson for the gate:** two of these would have failed loudly, but the ownership/chat ones would have
thrown `TypeError` deep inside a guard, which reads as an environment problem rather than a contract break.

### Lane D — documentation · DONE
- [x] `architecture-refactor/adr/0004-module-availability-is-resolved-once-per-request.md`
- [x] `backend/CLAUDE.md` §5 — one line, placed after the `MODULE_CATALOG` paragraph
- [x] `PRD-10-10-CODE-RELEASE-TODO.md` — post-certification delta, NEWLY DISCOVERED RISK, accountable
      criterion **PRD-C082** ("every privileged operation applies module, permission, tenant, record and
      DataScope checks at the correct seam") — chosen over PRD-C003 (in-request BOLA) and PRD-C021 (catch-all)
- [x] One brief line number was wrong: the hand-built actor is at `hr-export-jobs.service.ts:224-232`,
      not `:223-231` — it shifted when Lane B inserted `createAuthContext` at :233. The other four
      citations verified correct.

### Import graph — CHECKED
- [x] `pnpm -C backend check:cycles` (`madge --circular --extensions ts src`) — **6,475 files, zero
      cycles, exit 0**, run 2026-09-10 after the core seam and lanes A/B/C1/C2/D landed.
- [x] Why it is acyclic by construction, not by luck: `common/rbac/module-availability.ts` has **no
      imports at all** (leaf), and `common/auth/backend-claims.ts` never imports `rbac`. So the two new
      edges — `auth/auth-context.ts → rbac/module-availability.ts` (type only) and
      `auth/jwt-auth.guard.ts → rbac/module-guard.token.ts` (runtime Symbol) — both terminate in leaves.
      `common/rbac/module.guard.ts` no longer imports `module-guard.token.ts` at all.
- [x] Dead code removed: `IModuleGuardAccess` had no remaining consumers once `ModuleGuard` stopped
      injecting it, and `ModuleAvailabilityLookup` (`common/auth/auth-context.ts`) is its structural
      twin. Deleted; `module-guard.token.ts` is now the Symbol alone and imports nothing.
- [ ] Frontend `check:cycles` — deferred until the C8 lane quiesces
- [ ] POST-WAVE RENAME: the token is still called `MODULE_GUARD_ACCESS`, but `ModuleGuard` no longer
      consumes it — `JwtAuthGuard` does. The name now misleads. Rename to `MODULE_AVAILABILITY_LOOKUP`
      once the wave is quiet; it touches DI wiring, which is the wrong thing to churn mid-wave.

### Gate — after every lane lands, run once, quiesced
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit`
- [ ] `pnpm -C backend exec madge --circular` — new `common/auth` ↔ `common/rbac` edge is the risk
- [ ] Unit specs for the touched paths (explicitly requested, so they may run)

## 5. Filed, not fixed — NEWLY DISCOVERED RISK

`AccessPermissionResolver.getMembershipAccessState` (`access-permission.resolver.ts:356-383`)
queries `organizationMembers` alone and treats `status === "ACTIVE"` as active. It never checks
`users.isActive`, `users.deletedAt` or organization lifecycle — unlike
`MembershipStateService.resolve`, which joins all three.

In-request this is covered, because `JwtAuthGuard` checked liveness first. It is **not** covered
for the two callers that never pass a guard:

- `HrExportWorkerService` — `setInterval` poll, hand-built actor
- `WorkflowsCronController` — `@Public()`, cron-secret only, resolves for a stored `triggeredBy`

Concrete failure: a deactivated or deleted user's queued export or scheduled workflow continues to
resolve permissions as if the account were live. Needs its own audit; not folded into this change.
