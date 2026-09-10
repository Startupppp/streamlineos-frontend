# PRD — AuthContext: one per-request answer for module availability, membership and MFA

Status: **COMPLETE** · §6 (the C1 completion) closed 2026-09-10 · §1–§5 unchanged
Opened, closed, reopened for §6 and closed again 2026-09-10 · Owner: this session
Baseline commit: `db887baad` · C1-completion baseline: `7d5c126df`

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
- [x] Frontend `check:cycles` — **5,836 files, zero cycles**, run 2026-09-10 with the tree quiesced
- [x] POST-WAVE RENAME **DONE** once the wave was quiet: `MODULE_GUARD_ACCESS` →
      `MODULE_AVAILABILITY_LOOKUP`, and the file moved `common/rbac/module-guard.token.ts` →
      `common/auth/module-availability-lookup.token.ts`, since `JwtAuthGuard` is the consumer and
      `ModuleGuard` no longer imports it at all. Three references, typecheck clean, cycles still zero.

### Gate — run once, quiesced · **PASSED**
- [x] `tsc --noEmit` — **0 errors**. First run found **34 arity errors across 14 spec files** the lanes
      missed; all fixed, and nine byte-identical HR guard-context helpers were consolidated into
      `test/helpers/module-guard-context.ts` in the process.
- [x] `madge --circular` — **6,475 files, zero cycles**. The feared `common/auth` ↔ `common/rbac` edge
      never formed: `module-availability.ts` has no imports at all, and the token has since moved into
      `common/auth`, so the edge is gone entirely.
- [x] Unit specs for the touched paths — green.
- [x] **The gate has a blind spot the typecheck cannot cover, now recorded in `backend/CLAUDE.md` §8:**
      `test/security/**` and `test/perf/**` RUN under jest but are outside `tsconfig.json`. Three
      `JwtAuthGuard` constructions there survived the 34-error typecheck — one failed at runtime, two
      passed only because the missing dependency was never reached. After a signature change, grep
      `test/` by hand.

## 5. FIXED 2026-09-10 — was: filed, not fixed

`AccessPermissionResolver.getMembershipAccessState` (`access-permission.resolver.ts:356-383`)
queries `organizationMembers` alone and treats `status === "ACTIVE"` as active. It never checks
`users.isActive`, `users.deletedAt` or organization lifecycle — unlike
`MembershipStateService.resolve`, which joins all three.

In-request this is covered, because `JwtAuthGuard` checked liveness first. It is **not** covered
for the two callers that never pass a guard:

- `HrExportWorkerService` — `setInterval` poll, hand-built actor
- `WorkflowsCronController` — `@Public()`, cron-secret only, resolves for a stored `triggeredBy`

Concrete failure: a deactivated or deleted user's queued export or scheduled workflow continues to
resolve permissions as if the account were live.

### How it was fixed, and the wrong fix that was tried first

- [x] **`HrExportJobsService.resolveExecutionScope`** — deleted its hand-rolled `organizationMembers`
      read (which checked `status === "ACTIVE"` and nothing else) and now calls
      `MembershipStateService.resolve`, which returns `active`/`isOwner`/`role`/`membershipId` — every
      field the hand-built actor needed, with all three liveness dimensions checked.
- [x] **`WorkflowRunnerService.runOne`** — resolves the trigger's membership state before
      `resolveUserPermissions` and fails the execution rather than running as a dead account.
      It logs who it refused; a `failed` execution is visible, a silent grant is not.
- [x] **REJECTED, after building it: adding the liveness join to `AccessPermissionResolver`.** It
      typechecked and read well, and it was wrong twice over. It forked liveness into a **second
      definition** competing with `MembershipStateService` (§4: one owner), and it broke **14 access
      spec files** whose doubles model `organizationMembers.findFirst` — every one of which would have
      had to be rewritten to keep asserting the same thing. In-request the resolver is already covered,
      because `JwtAuthGuard` checks liveness first; the defect was only ever the two paths that pass no
      guard. Fixing it at those two closes the whole gap and adds no second answer. Reverted in full.
- [x] Dead field removed while there: `MembershipAccessState.exists` had **zero** readers.
- [x] Constructor arity: typecheck caught 15 spec sites across 6 files; `test/` is not typechecked, so
      `test/security/bola-export-download.spec.ts` was found by the §8 hand-grep rule and fixed.

---

## 6. C1 completion — membership and MFA join the request context

Source: `claude-prompts/architecture-review-pending/01-c1-full-request-auth-context.md`.
§1–§5 delivered the module-availability memo only (D1). The HTML candidate asks for **one
request-owned answer** for membership, module availability and MFA. This section closes that.

### 6.1 What was still duplicated

| Fact | Guard-chain resolution | Second, independent resolution |
|---|---|---|
| Membership | `JwtAuthGuard` → `MembershipStateService.resolve` (joins user + org + membership) | `AccessPermissionResolver` reads `organizationMembers` alone and calls `status === "ACTIVE"` active — twice per resolution (`computeUserPermissions`, `getMembershipAccessState`) |
| MFA | `MfaGuard` → `MFA_POLICY.resolve` | `AccessSnapshotResolver` → `MfaPolicyService.resolve` |
| Module availability | `ModuleGuard` → `ctx.moduleAvailable` | already shared — §1–§4 |

The membership row is the load-bearing one: two definitions of "live", and the weaker one decides
what a background caller is allowed to do.

### 6.2 Decisions

| # | Decision | Rationale |
|---|---|---|
| D12 | `AuthContext` owns actor, `moduleAvailable()`, `membership()`, `mfa()` | One request-facing surface; no second request cache beside it |
| D13 | `JwtAuthGuard` **seeds** the membership it already resolved | The request then costs one `resolve`, not two |
| D14 | `AuthContextFactory` assembles the three lookups | Callers stop hand-wiring a seam; detached callers use the same factory |
| D15 | `AccessPermissionResolver` delegates both membership reads to `MembershipStateService` | One authority (§4), and the detached path inherits all three liveness dimensions |
| D16 | The context is consulted only when `ctx.actor` matches the `(orgId, userId)` being resolved | A snapshot for another member must not read the caller's membership |
| D17 | `MfaGuard` and the snapshot share `ctx.mfa()`; both keep a direct fallback | A request with no context (e2e fakes, non-HTTP) keeps its current answer |
| D18 | `MfaState` moves to `common/auth/mfa-policy.token.ts` | `common/auth` must not import `modules/access` for a type it owns |
| D19 | `evaluateMembershipGate` is deleted | Its only production consumer was the duplicate read; leaving it leaves a second definition of "live" |

### 6.3 TODO — all complete

#### Lane CORE — the request-owned context
- [x] `common/auth/auth-context.ts` — `membership()` + `mfa()` beside `moduleAvailable()`, each memoized once, in-flight promise shared, org-less actor short-circuits to no membership
- [x] `common/auth/mfa-policy.token.ts` — owns `MfaState`; `modules/access/access.types.ts` re-exports it, as it already did for `DataScope`
- [x] `common/auth/auth-context.factory.ts` — NEW; injects `MODULE_AVAILABILITY_LOOKUP`, `MembershipStateService`, `MFA_POLICY`
- [x] `common/auth/auth-context.module.ts` — provides and exports the factory (`@Global()`, so no module-graph work)
- [x] `common/auth/jwt-auth.guard.ts` — builds through the factory and seeds the resolved membership on the JWT path **and** the PAT path (`tryPatAuth` now returns `{ actor, membership }`)
- [x] `common/auth/mfa.guard.ts` — reads `ctx.mfa()` when the context is bound to the same actor; falls back to the policy otherwise

#### Lane ACCESS — request-path resolution consumes the context
- [x] `modules/access/authorize.ts` — `scopeFor(ctx.actor, key, ctx)`
- [x] `modules/access/access-permission.resolver.ts` — both membership reads come from the injected `MembershipReader`; `ownsOrAdministers` and `membershipId` derive from `MembershipState`; the `organizationMembers` import is gone
- [x] `modules/access/access.service.ts` — injects `MembershipStateService`; threads the context through `scopeFor` → `resolveUserPermissions` → `resolveWithValidity` / `getMembershipAccessState`, gated by `contextFor()`'s identity check
- [x] `modules/access/access-snapshot.resolver.ts` — optional context; `ctx.mfa()` when present, the policy otherwise
- [x] `modules/access/access-policy.ts` — `evaluateMembershipGate` and `MembershipGateResult` deleted; the `access.service.ts` re-export dropped. Zero references remain anywhere in `src/` or `test/`

#### Lane CALLERS
- [x] `modules/rbac/rbac.controller.ts` · `me/me.controller.ts` — both take `@AuthCtx()` and pass it into `getAccessSnapshot`
- [x] `modules/hr/import/hr-export-jobs.service.ts` — builds the detached context through the factory
- [x] Every remaining `createAuthContext(` call site compiles against the three-lookup seam — 10 sites, migrated to `testAuthContext` in `test/helpers/module-guard-context.ts`, which defaults the two facts a module-gate spec does not care about

#### Lane TESTS — must bite
- [x] `common/auth/auth-context.spec.ts` — 15 tests: memoization and in-flight sharing for all three facts, a seeded membership calling no lookup, an org-less actor reading no membership, each rejection preserved, one failing fact not poisoning the other two, and each context bound to its own actor/tenant
- [x] NEW `modules/access/__tests__/request-authorization-composition.spec.ts` — the real `JwtAuthGuard` → `MfaGuard` → `ModuleGuard` → `PermissionGuard` → `authorize()` → `AccessService` boundary over one request, asserting call counts
- [x] COMPOSITION: **exactly one** `MembershipStateService.resolve` across authentication and permission resolution — with an A/B against the same resolution without the context, which costs **two**, so the count is not vacuous
- [x] COMPOSITION: **exactly one** MFA resolution across `MfaGuard` and the access snapshot
- [x] COMPOSITION: **exactly one** module lookup across `ModuleGuard` and `authorize()`; distinct keys and `"HR"` / `"hr"` / `" hr "` covered in the unit spec
- [x] COMPOSITION: a context bound to one actor/tenant is refused for any other pair — two extra reads, with the arguments asserted
- [x] Deny paths hold: suspended membership (403), deactivated account (401), unsatisfied MFA (403 `MFA_REQUIRED`), unavailable module (`ModuleDisabledException` from both guards), rejected availability lookup (denies, never allows)
- [x] Liveness moved to the authority: `common/auth/membership-state.service.spec.ts` now drives the **real** `fetchMembershipState` query and denies a suspended, left or invited membership, a deactivated user, a soft-deleted user, an inactive organization, a soft-deleted organization, an absent row, and a failed read
- [x] Background resolution denies a deactivated user with no HTTP context
- [x] Account-only and `@AllowNoOrg()` flows keep their status codes and read no membership at all

#### Gate
- [x] `tsc --noEmit -p tsconfig.test.json` — **zero errors in every file this lane touches.** The run is not globally clean: 73 errors remain, all in `e-sign`, `feedbucket`, `search`, `hr`, `build`, `dashboard`, `accounting` and `test/security/bola/bola-{esign,rag}` — the concurrent C5 scoped-read migration, in another session's lane
- [x] `madge --circular --extensions ts src` — **6,485 files, zero cycles**
- [x] `test/` is inside `tsconfig.test.json`, so the §8 hand-grep blind spot did not apply this time — the arity breaks under `test/security/**` were reported by the typecheck itself
- [x] Focused suites (auth · rbac · access · settings · payroll · me): **1,867 of 1,868 pass across 173 suites.** The single failure is `apply-scope-team.spec.ts`, which counts files containing `applyScope(` and expects more than 20; C5 has rewritten those call sites to `scopedRead`, so it reports 6. Not this lane's, and not repaired here
- [x] Lint and the full suite: **not run**

### 6.4 Notes for the reviewer

- **The seeded membership is what makes the count one, not the cache.** `MembershipStateService` has its own 15-second versioned cache, so a second `resolve` would usually have been cheap — but it would still have been a second call, and on a cache miss a second query. Seeding removes the call.
- **The identity check is the safety property, not an optimization.** `AccessService.contextFor` refuses a context whose actor or tenant differs from the pair being resolved. Without it, `getAccessSnapshot(orgId, someOtherMember)` inside a request would have read the *caller's* membership and reported the caller's admin standing for someone else.
- **Deleting `evaluateMembershipGate` removed a rule, not coverage.** Every assertion it carried moved onto `MembershipStateService`, where it now exercises the real joined query rather than a pure function no production path called.
- **§5's earlier verdict is corrected, not contradicted.** It rejected adding a liveness *join* to `AccessPermissionResolver`, because that forked a second definition. Delegating to the authority is the opposite move: it removes the fork. The 14 spec files §5 worried about were migrated by giving each its existing member fixture as the authority's answer.
- **The concurrent session wired `hr-export-jobs.service.ts` to the new factory** while unblocking its own typecheck. The change is correct and is counted here rather than reverted.
