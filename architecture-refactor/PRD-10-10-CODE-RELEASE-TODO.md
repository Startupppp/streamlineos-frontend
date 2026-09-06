# StreamlineOS code-release completion PRD

Status: active and reconciled through 2026-09-05. This is the single authoritative checklist.
Scope: Home, Settings, Authentication/Organization/RBAC, HRMS, Payroll, Build/PM, Billing/Payments/Accounting, Chat, Calendar, Inbox/Mail, Notifications, Knowledge/Wiki/Chatbot, Workflows, shared platform code, and AI. CRM and Inventory are excluded. Public landing-page visuals and animations are protected.

## Status and evidence

Checkbox census at this revision: **146 closed, 49 open, 195 total**. Applying the [closure definition](../.scratch/code-release-10-10-v2/CLOSURE-DEFINITION.md) gives **145/159 CODE criteria closed (91.2%), 14 CODE criteria open**. These fourteen include roll-ups; they are not fourteen independent implementation defects. PRD-C188 retention/legal-hold is closed with its linked drill evidence. A checked criterion is either measured or explicitly labelled owner-dispositioned; disposition is never measurement. Code-level and deployed production readiness remain separate.

Measurement prerequisites, checked 2026-09-05: PostgreSQL, Redis and Docker executables were not discovered on PATH, and no matching Windows service was discovered. This does not establish that no installation exists elsewhere. The process snapshot included 31 Node processes whose command lines matched `tsc` and six matching `jest`; ownership was not established. Run heavy verification serially after resource availability is established. Latency and Web Vitals acceptance requires a controlled production-build measurement stack with suitable database/cache proximity; unmeasured or resource-contended runs do not close criteria.

- Full-run evidence: [release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md)
- Current migration re-proof: [head-691 evidence](final-refactor/evidence/42-production-ops/release-authority/HEAD-691-REPROOF-2026-09-04.md)
- Human decisions: [code-release input register](decisions/CODE-RELEASE-HUMAN-INPUTS.md)
- Owner dispositions: [signed disposition record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md)
- Exact criterion ownership: [V2 traceability](../.scratch/code-release-10-10-v2/TRACEABILITY.md)
- Latest focused implementation evidence: [AI streaming and request-cost verification, 2026-09-05](final-refactor/evidence/42-production-ops/release-authority/FUNCTIONAL-STREAMING-2026-09-05.md). Covers Executive Brief, Payroll, Timesheets, KB replay protection and shared transport; does not close unmeasured route budgets or whole-product release gates.

Current measured architecture gates include zero dependency cycles, zero actionable tenant-relationship findings, 691/691 migration ledger coverage, exact catalog parity across nine catalog sections, and zero actionable legacy actor fields. Open performance, disposable-E2E, one-commit, deployed infrastructure, live-provider, alerting, recovery, cost and compliance criteria remain open below; green static gates do not substitute for them.

## Release roll-up

- [x] **[PRD-C001]** **Schema/contracts:** complete v2 ticket 02's cross-repository reachability, canonical-key and safe-deletion criteria, then v2 ticket 03's current-head catalog parity evidence.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C002]** **AI:** complete v2 ticket 17's streaming, cancellation, deadline, structured-output, citation, credit and frontend failure-state criteria.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C003]** **Authorization/security:** complete v2 ticket 22's live BOLA/IDOR, valid mutating-body, same-tenant control, abuse-protection and privacy criteria.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C004]** **Organization/RBAC/Settings:** complete v2 ticket 05's organization authority, module permission, owner/descendant protection, cache invalidation, contract and frontend criteria.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C005]** **Query/database cost:** complete v2 ticket 18's bounded projection, N+1, tenant-predicate, index, pagination, cache and invalidation criteria, then retain performance evidence in v2 ticket 29.
      **CLOSED 2026-09-06 - both halves measured.** Query-cost gates stay green (`check:query-projections`
      0 in scope, `check:db-call-count`, `check:unbounded-reads`, `check:cache-invalidation`). The ticket-29
      performance half, which was the named blocker, is now measured on the co-located stack together with
      PRD-C140: statement ceilings **in scope 241/244** with 0 breaches and 0 vacuous slots, request-level
      **188/204** route x tenant slots measured over HTTP, and `check:route-budgets` passing. Three query-cost
      defects the measurement found were fixed at the source rather than excused: `GET /search` issued 19
      statements to return an empty result set, `GET /calendar/events` fetched 2,000 candidate rows per branch
      to serve 400, and the hourly notification retention sweep had never detached a partition because it ran
      its DDL on the application role. Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

- [ ] **[PRD-C006]** **Frontend speed:** complete v2 ticket 29's production-build Web Vitals, bundle, rendering and interaction budgets while preserving completed lazy-loading, virtualization and hydration gains.
      **OPEN - blocked only on the PRD-C149 remainder.** Production-build capture 8 at build
      `R3If1XUBWjLPTezFUEMNR`: server TTFB p95 is 47-88 ms on all eleven routes, desktop INP 40-136 ms, CLS at
      or under 0.05 everywhere, 0 hydration mismatches over 132 navigations, and every in-scope route inside its
      script-byte ceiling (PRD-C151). The lazy-loading, virtualization and hydration gains are preserved and
      extended: the server now selects the shell variant from the request, so a phone never hydrates the desktop
      sidebar and header. What remains open is the mobile half of PRD-C149 - four routes above the 200 ms INP
      budget and three above the 2.5 s mobile LCP budget - and this criterion should close with it.
      Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

- [x] **[PRD-C007]** **TanStack:** complete v2 ticket 19's permissioned-read, required-identifier, query-key, pagination, runtime parsing, cancellation, invalidation and optimistic-update criteria.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C008]** **Calendar/Inbox/Knowledge:** complete v2 tickets 13, 14 and 16 respectively, including provider drift, sync correctness, bounded read paths, ACL-aware retrieval and current performance evidence.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C009]** **UX/accessibility:** complete v2 ticket 20's in-scope responsive, keyboard, screen-reader, loading, empty, error, offline, permission and retry states.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [ ] **[PRD-C010]** **Uploads/operator cutover:** complete v2 ticket 21's code lifecycle and v2 ticket 34's deployed private-bucket/backfill evidence before cutover.
      Open: code lifecycle is complete; deployed private-bucket/backfill evidence is not measured. The signed owner disposition records risk acceptance, not completion.
- [x] **[PRD-C011]** **Gate integrity:** complete v2 ticket 30's bite-proven architecture/release gates and portable verification harness.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C012]** **Repository hygiene/types:** complete the v2 tickets 24–27 expand–migrate–contract sequence for unused symbols, dead surface, unsafe assertions, dependency cycles and dependency proof.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C013]** **Handlers:** complete v2 ticket 28's named-handler, thin-entry-point, cohesion and justified file-size-exception criteria without meaningless wrapper chains.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C014]** **Current P0/P1 audit:** resolve or formally disposition Payroll financial-integrity gaps in v2 ticket 08, notification/email permission and delivery gaps in v2 ticket 15, security findings in v2 ticket 22, and every surviving P0/P1 before v2 ticket 31.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C015]** **Release harness:** complete v2 ticket 30 by removing absolute workstation paths and resolving both repositories from the workspace or explicit validated arguments on Windows, macOS and Linux.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [ ] **[PRD-C016]** **Final integration:** complete v2 ticket 31 at one clean frontend/backend commit pair, then v2 ticket 36's deployed release-authority record; interrupted, skipped and prerequisite-blocked gates never count as passing.
      Open: code-level one-commit verification and the deployed release-authority record are not both current. The signed owner disposition records risk acceptance, not completion.
- [x] **[PRD-C017]** **PRD-to-ticket traceability:** complete v2 ticket 01 and keep its manifest fail-closed so every PRD criterion has exactly one ticket owner, ticket-only criteria are rejected and the restored module evidence cannot disappear again.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

## Product constraints

- Do not change public landing-page visuals or animations.
- CRM and Inventory code, migrations and acceptance evidence are excluded.
- Home is the universal shell and composition module. Chat, Calendar, Inbox and Notifications appear through Home but retain independent schema, authorization, caching, workers and implementation behind small interfaces.
- Preserve [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md) unless a concrete scale, correctness, security or operability failure requires change.
- Never solve growing work with silent truncation. Use keyset pagination, resumable batches, streams or queues.
- Every tenant relationship, query, cache key, event, object key and search ACL preserves organization scope.
- Never delete code or schema from text search alone. Require dependency evidence plus build/typecheck and migration-integrity proof.
- “May be useful later” is not evidence for retaining an unused implementation. Preserve future ideas in product documentation; keep executable code only when it has a verified caller, registration/side effect or compatibility obligation.

## Approved implementation decisions — 2026-09-01

These decisions are final for this release and remove implementation alternatives from the checklist:

1. **RBAC:** exactly six fixed standings — organization owner, organization admin, organization member, module owner, module admin and module member. Capability customization uses fixed templates, per-person permission grants, delegations and DataScope. No runtime custom-role creation.
2. **Token authority:** the backend exposes an authenticated session-exchange interface and alone signs short-lived asymmetric JWTs. Frontend and edge runtimes contain no backend signing key.
3. **Payroll posting:** Payroll commits an idempotent Accounting-posting intent through the transactional outbox; Accounting consumes it asynchronously and idempotently. Brief `pending` state is accepted; lost or dangling journals are not.
4. **Calendar synchronization:** local Calendar state commits first with durable `pending` synchronization state. Provider synchronization runs asynchronously with `synced`/`failed` state, retry/backoff and user-visible recovery.
5. **Chat presence:** Ably connection presence is authoritative. One leader-elected browser heartbeat with jitter/backoff is permitted only as a bounded fallback.
6. **Knowledge comments:** authors may edit/delete their comments while they retain page visibility; page editors may resolve; KB administrators may moderate. Every action rechecks current page/article visibility at the data seam.
7. **Home contract:** the backend owns the authoritative Home section/access manifest. The frontend consumes a generated contract; hand-maintained parallel registries are prohibited.
8. **Billing providers:** frontend checkout is provider-neutral. Razorpay is the first adapter; a Stripe-ready contract test proves another adapter requires no Billing caller change.
9. **Migration policy:** staging and production contain no valuable data. Destructive migration rebasing, squashing and database recreation are authorized; no legacy watermark upgrade compatibility is required for this release. The new clean baseline must remain reproducible and interruption-safe.
10. **Deferred capabilities:** hooks, routes and UI that are outside the confirmed release scope are removed after dependency proof, not retained behind speculative flags.
11. **Release scope:** Home, Settings, Authentication/RBAC, HRMS, Payroll, Build, Billing/Payments/Accounting, Chat, Calendar, Inbox/Mail, Notifications, Knowledge/Wiki/Chatbot and Workflows. CRM and Inventory remain excluded.
12. **Compatibility:** internal frontend/backend routes, types and schemas may break during this coordinated refactor. Only published customer/integration contracts require backward compatibility or explicit versioned deprecation.

## Immediate code-level release candidate

### 1. One-commit release verification

- [x] **[PRD-C018]** Run disposable-database E2E for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing, Payments, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail.
      **CLOSED 2026-09-06 - run and recorded.** The whole in-scope corpus ran in one command against an
      explicitly identified disposable database: `scratch_local` on the co-located PostgreSQL 18.6, cold-built
      by `apply-chain-cold.mjs` to 695/695 against the journal, application role granted on 1027/1027 tables,
      filled by the three seed layers across four tenants. At backend `fb59a5478` / root `e7d70a88f`:
      **27 suites passed, 2 skipped, 1 failed** (`Tests: 157 passed, 11 skipped, 168 total`), log
      `runs/seeded-corpus-final.log`, sha256 `86d05e39475b410e...`. All fifteen named domains passed with zero
      unexpected skips. The one failure is not an assertion: `route-budget-http` lost its Jest worker to a
      concurrent session's process sweep with no exception text, and that instrument completed standalone twice
      on the same database at 94 measured / 8 refused / 0 failed of 102 on both tenants. The two skips are the
      opt-in BOLA sweeps, run separately. The live cross-tenant BOLA sweep attempted **1,937 routes and scored
      1,012**, and the defects it found were fixed rather than pinned: a 500 on a foreign project id in epic
      creation, a cross-tenant consent write that answered 200, a 409 existence oracle on lead status, five
      blind deletes that answered 204 for another organisation's id, an autonomy review mark that answered 201,
      and three support AI actions that answered 200 - and reserved credits - for a ticket the caller could not
      see. Twelve stale pins were removed and the Build project routes re-probed by hand to confirm they now
      answer 404. Evidence: [E2E-DISPOSABLE-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/E2E-DISPOSABLE-2026-09-05.md) and [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

- [x] **[PRD-C019]** Record each command, release SHA, database identity, dataset shape, pass/fail/skip counts and failure artifacts.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C020]** At the same commit run backend build/typecheck, spec typecheck, frontend typecheck, OpenAPI freshness, cycle, file-size, dead-code, tenant-isolation, RLS, permission, cache, outbox, idempotency, migration, vulnerability, license and SBOM gates.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C021]** Resolve every code-level P0/P1 finding and assign owner/deadline to accepted lower-severity residual risks.
      **CLOSED 2026-09-04 — measured.** The single open code-level P1 (`verify:chat-mentions`) is resolved and re-measured twice at exit 0; see PRD-C127. Three further defects were found and FIXED in the same session rather than accepted as residual risk: (1) a release-blocking P1 in migration 1009, whose foreign-key COUNT assertion only ever held against warm `db:push` residue and killed every clean bootstrap at 654/685 — replaced with a named-FK existence check and resealed; (2) `useBulkUpdateTickets` omitted `queryKeys.projectReports.all` and `queryKeys.dashboard.myIssues()`, so a bulk status or assignee change left sprint reports and the My Issues widget stale while the equivalent single-ticket path invalidated both; (3) two product-rule violations on Home, see PRD-C115. No code-level P0 or P1 remains open and unowned.

### 2. Module and folder architecture

- [x] Prove domain modules expose small, stable interfaces and keep implementation local; remove shallow pass-through layers that add no behavior.
      Evidence: ticket 39 is 8/8 closed; six shallow shells were removed, Nest module exports were reduced from 363 to 312 with zero unconsumed in-scope exports, and module/dependency gates were green in that ticket's recorded run.
- [x] Prove Home only composes universal experiences; Chat, Calendar, Inbox and Notifications retain independent business implementation.
      Evidence: ticket 39 verified `DashboardModule` does not absorb Chat/Calendar/Mail implementation or their tables, and the frontend dashboard imports none of those feature implementations.
- [x] Prove zero circular imports, forbidden new `forwardRef`, barrel self-imports and erased Nest injection tokens.
      Evidence: `check:cycles` (both repos), `check:module-di`, `check:import-direction` all pass 2026-09-02.
      **RE-VERIFIED 2026-09-03 — PARTIALLY REGRESSED.** The cycle and DI half holds: `check:cycles` exit 0 in both repos (backend 5,528 files, frontend 5,264, zero circular dependencies), `check:module-di` exit 0 (218 modules, 1,713 classes, 0 violations), backend `check:import-direction` exit 0 (222 files under `src/common`, 0 new violations, empty baseline). **The frontend `check:import-direction` is exit 1: `shared-imports-feature: 20 violations against a baseline of 19 — REGRESSED`** (`cross-feature-import` is 194/194, at baseline). This box covers both repos and cannot be read as green until that is settled.
      **CURRENT DISPOSITION:** the later import-direction repair deduplicated repeated static/dynamic edges and returned the distinct-edge gate to its recorded baseline without hiding a real cycle. Final one-commit rerun remains mandatory.
- [x] **[PRD-C022]** Prove every active Nest module is registered and every frontend route has one canonical owner; remove obsolete routes rather than preserving hidden duplicates.
      Evidence: `check:module-registration` + frontend `check:routes` pass 2026-09-02.
      **RE-VERIFIED 2026-09-03 — REGRESSED.** `check:module-registration` is exit 0 (218 module classes declared, 217 reachable from `AppModule`, 0 unreachable). **Frontend `check:routes` is exit 1**: `1 business route handler(s) — the only permitted route.ts is NextAuth: api/media/image/route.ts`. See §3's last box for the analysis; the two findings are the same file.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Keep authenticated `app/**/page.tsx` and `layout.tsx` files as thin route modules for metadata, parameters, server authorization and composition; move state, forms, queries and mutations behind feature-owned interfaces and gate route-file size/import direction without changing landing visuals or animations.
      Evidence: ticket 25 closed 7/7; the in-scope thick-route count reached 0 without raising the ceiling, extracted feature files remained below 300 lines, and public landing files were untouched.


#### 2.1 Repository hygiene, dead code and type integrity

- [x] **[PRD-C023]** Run fail-closed dead-code analysis over the backend, frontend, shared packages, workers and scripts; require zero unclassified unused files, dependencies, exports and exported types in the in-scope code. CRM/Inventory and generated/vendor artifacts must be reported separately, not silently included or deleted.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C024]** Remove every in-scope compile-time and runtime dependency cycle across backend modules, frontend features, shared packages, barrels and NestJS DI. Replace cycles with correct ownership, dependency inversion or a neutral seam; do not hide them with `forwardRef`, lazy/dynamic imports, re-export indirection, duplicated types or an exception baseline. The cycle gate and a bite-proven self-test must report zero cycles.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C025]** Enable and enforce TypeScript/ESLint unused-symbol checks for imports, locals, parameters and private members. Remove unused symbols instead of renaming them to `_` or suppressing the rule; allow a named `_` parameter only where a framework/interface callback contract requires its position.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C026]** Remove unused imports, variables, parameters, functions, classes, constants, enums, types, interfaces, Zod schemas, DTOs, hooks, query keys, context values, feature flags and re-exports. An exported symbol is not considered used merely because a barrel exports it.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C027]** Remove unreachable branches, obsolete compatibility shims, commented-out implementation, debug logging, stale TODO scaffolding and constants that duplicate an authoritative enum/config/schema. Retain a compatibility path only with a named consumer, removal date and contract test.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C028]** Remove unused files and folders including abandoned routes, controllers, providers, modules, components, hooks, workers, jobs, adapters, tests, fixtures, mocks, scripts, assets and styles after proving that no static, dynamic, reflective, generated, CLI, package-script or side-effect entry point reaches them.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C029]** Remove unused runtime and development dependencies, package scripts, environment variables, configuration keys, feature flags and asset references; update lockfiles, deployment manifests, validation schemas and documentation in the same change.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C030]** Eliminate unsafe forced typing: no `as any`, `as unknown as T`, unjustified non-null assertions, `@ts-ignore`, `@ts-nocheck`, error-suppressing casts or broad index signatures used to bypass a contract. Narrow `unknown` with Zod, discriminated unions, exhaustive guards or a tested adapter; use `satisfies` where only conformance is needed.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C031]** Permit a type assertion only at a proven external/framework seam where TypeScript cannot express an already runtime-validated invariant. Each exception must be local, narrow, documented with the invariant and covered by a negative/runtime contract test; maintain a zero-growth, named exception ledger.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C032]** Replace duplicated or weakly owned constants with the canonical domain-owned schema/catalog only when at least two real callers share the invariant; do not create generic dumping-ground helpers or speculative seams. Apply the deletion test to pass-through wrappers and retain modules that provide real depth, policy or adaptation.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C033]** Reduce public interfaces and barrel surfaces to verified consumers. Internal implementation details stay private to their module; deep imports across module ownership are removed or replaced by the smallest stable interface at the correct seam.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C034]** Prove every deletion with import/dependency graph results plus checks for Nest metadata/DI, Next.js file conventions and dynamic imports, raw SQL/table names, migrations, reflection, queues/events, cron registration, package scripts and side-effect imports. Text search or a successful editor rename alone is insufficient evidence.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C035]** After each cleanup batch, run focused behavior tests and the affected package typecheck/build; at final integration run both dead-code gates and their self-tests so a broken or under-scanning analyzer cannot report a false green result.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C036]** Record before/after counts for unused files, exports/types, dependencies, suppressions, unsafe assertions and exceptions. Final acceptance is zero unclassified findings, zero unexplained suppressions and no increase in an approved framework/generated exception baseline.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C037]** Confirm the cleanup does not remove authorization, validation, cache invalidation, outbox/worker registration, observability, accessibility, SEO metadata or error/offline states merely because those paths are uncommon in local development.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 2.2 File cohesion and 500-line policy

- [x] **[PRD-C038]** Enforce a repository-wide default maximum of 500 physical lines for authored production, frontend, backend, shared-package, worker, script and test files (`.ts`, `.tsx`, `.js` and `.mjs`). The gate must scan every applicable workspace with a vacuity floor and fail when a new unregistered file exceeds the limit; CRM/Inventory are reported separately and landing visuals are unchanged.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C039]** Treat 300 lines as a review/refactoring target, not a reason for mechanical fragmentation. Split files by cohesive responsibility and domain ownership when doing so reduces the interface or separates independently changing behavior; never split into numbered fragments, pass-through wrappers, re-export shells or mutually dependent files merely to satisfy a counter.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C040]** Permit a file above 500 lines only for a generated/vendor artifact, declaration, immutable migration, cohesive declarative catalog or an implementation whose documented split alternatives would reduce locality or introduce a cycle. Each exception records exact path and measured lines, category, owner, public interface, concrete cohesion argument, alternatives considered, review date and removal trigger; directory-wide and wildcard exceptions are prohibited.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C041]** Make the exception registry fail closed: missing/stale paths, line counts, owners, interfaces, reasons or review dates fail; any file that falls to 500 lines or below automatically loses its exception. Generated/vendor/migration exclusions must be path-classified and must never exempt ordinary authored implementation transitively.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C042]** Review functions, classes, React components, hooks, forms, controllers and workers inside an allowed large file for mixed responsibilities, hidden state, duplicated validation/query logic and excessive public surface. A file-size exception does not exempt dead-code, cycle, authorization, query-cost, contract, testing or readability requirements.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C043]** Run the hard-size gate and bite-proven self-test for backend and frontend at the final commit, publish all over-300 and over-500 inventories, require zero unexplained violations and prove each extraction preserves behavior, import direction, DI registration, route ownership, caching and authorization.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 2.3 Handler and function responsibility

- [x] **[PRD-C044]** Use named, typed handler functions for non-trivial UI events and form actions instead of embedding business logic, multi-step mutations or long anonymous closures in JSX. Names express the user intent (`handleSubmit`, `handleMemberRemove`, `handleRetrySync`), and handlers delegate validation/state-independent rules to domain-owned functions.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C045]** Keep NestJS controller handlers, queue/event consumers, cron entry points and server actions thin: validate and authorize at the correct seam, construct the command/query context, invoke one cohesive implementation and map its typed result/error. Do not duplicate business rules, database orchestration or response shaping across handlers.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C046]** Use named event handlers only; JSX event props must not contain inline arrow/function expressions. Do not create meaningless handler-to-handler chains: the named handler performs event orchestration and delegates reusable rules to explicitly named domain functions. Use `useCallback` only when referential identity affects memoization, subscription or effect correctness, and verify every dependency.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

### 3. TypeScript, Zod and cross-layer contracts

- [x] **[PRD-C047]** Prove strict TypeScript with no new `any`, suppression directives, unsafe double casts, non-null assertion abuse or parallel hand-written types that drift from schemas.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C048]** Validate every untrusted body, parameter, query, environment value, upload manifest and external response through established Zod boundaries.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Keep Zod schemas in module DTO/schema files, derive types with `z.infer`, reject protected/client-supplied actor and tenant fields and enforce unknown-key policy.
      Evidence: Unknown-key policy closed 2026-09-02: `.strict()` on 1,652 request-boundary schemas; 7 documented non-ZodObject exceptions (unions / ZodEffects).
      **RE-VERIFIED 2026-09-03 — criterion holds, exact figure NOT-VERIFIED.** The tree carries **2,464 `.strict()` calls across 764 files** against 2,814 `z.object(` occurrences, and no gate reports an unknown-key defect. That is a different (larger) population than "request-boundary schemas", so it corroborates the criterion without re-deriving **1,652**; reproducing that exact number needs the original classifying script.
- [x] **[PRD-C049]** Reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Prove controllers remain thin, business rules stay backend-side and no frontend `app/api` or client module contains business/database logic.
      Evidence: Verified 2026-09-02: only `app/api/auth/[...nextauth]/route.ts` exists, no `lib/services/`, zero drizzle/postgres/neon imports in frontend source.
      **RE-VERIFIED 2026-09-03 — the evidence sentence is FACTUALLY WRONG and the gate is red.** Two thirds of it hold: `lib/services/` is absent, and drizzle/postgres/neon imports in frontend source are **0**. But **two** route handlers exist, not one, and `pnpm check:routes` is **exit 1** naming the second: `app/api/media/image/route.ts`. That file (72 lines) is an authenticated image proxy — it Zod-parses one `key`, requires `session.backendJwt`, forwards to `GET /storage/image` and hardens the content type — so it holds no business rule and touches no database, and the *criterion* is arguably satisfied. The repo's own fail-closed gate disagrees. **Resolve one way or the other before release:** either allowlist the proxy in `check:routes` with its justification, or move it. It cannot remain red beneath a ticked box.

### 4. Database schema and migration quality

- [x] **[PRD-C050]** Audit primary-key strategy, tenant-scoped uniqueness, FK indexes, named constraints, referential actions, checks, money units, timestamps and audit columns.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C051]** Verify normalized lifecycle and relationship tables; remove actionable JSON arrays/polymorphic authority relationships and avoid EAV unless an approved custom-field seam requires it.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C052]** Verify soft-delete/archive policy and every active readâ€™s deleted/archived predicate; use partial indexes where the access pattern requires them.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C053]** Reconcile Drizzle declarations, migration snapshots and the live catalog so each tenant relationship has one canonical composite constraint; remove redundant single-column constraints only after dependency proof, cold bootstrap and current-catalog parity. Upgraded-catalog compatibility is required only if migration decision 9 changes, because this release explicitly authorizes database recreation.
      **CLOSED 2026-09-04 — Lane F measurement.** Evidence: [TENANT-FK-CANONICALIZATION-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/TENANT-FK-CANONICALIZATION-2026-09-04.md). 152 redundant pairs measured at HEAD 685 on scratch_boot_a: all 152 are CRM (54) or Inventory (98), both explicitly excluded from release scope. 0 in-scope pairs remain — migration 1006 (sealed in chain) addressed all in-scope pairs prior to this session. Dependency proof: no code in src/ references the dropped single-column FK names. Catalog parity A-vs-B: 0 differences across 9 sections (1026 tables, 14026 constraints, 4767 indexes). Behavior tests: 6/6 PASS. No new migration authored.
- [x] **[PRD-C054]** Remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Establish a new clean migration baseline after authorized destructive rebase/squash, recreate disposable staging from zero and exercise interruption/retry plus rollback/forward-fix using [RB-09](runbooks/RB-09-migration-rollback.md); no legacy watermark upgrade is required.
      Evidence: 2026-09-02: `applied=633 skipped=1 failures=0`; catalog parity vs an independent bootstrap `differences=0` across tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums, rlsEnabled. The interrupt/retry path is what exposed the `0628`/`0652` ordering defect, now fixed.
      **SUPERSEDED — covers a former head (633/634-entry chain). Do not cite as current.** The journal holds **666** entries as of 2026-09-03. Two further reasons this evidence cannot carry the current claim: the parity comparator keyed on object *names* rather than definitions until the fix that shipped alongside it, so no parity number from that era means what it appears to; and no database reachable on 2026-09-03 is at head. The baseline-establishment half of this box stands; the **parity** half is re-opened by the blocker list above.
- [x] **[PRD-C055]** Compare two independent clean bootstraps and an interrupted-then-resumed bootstrap at the same release commit: tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums and RLS state must match exactly.
      **CLOSED 2026-09-04 — measured.** All three bootstraps were run from empty databases on disposable Neon branch `br-patient-dew-az4o362h`. Bootstrap A 685/685 exit 0; Bootstrap B 685/685 exit 0; Bootstrap C interrupt-resume (3 real SIGKILL interruptions, 12/12 invariants) 685/685 exit 0. A vs B and A vs C both EXACT MATCH across 9 sections — 1026 tables, 13510 columns, 14026 constraints, 4767 indexes, 983 policies, 466 functions, 169 triggers, 6 extensions, 476 enums — 0 differences, compared by full definition rather than by name. Running it found and fixed a release-blocking P1: migration 1009 asserted a foreign-key COUNT that only ever held against warm `db:push` residue, so every clean bootstrap died at 654/685. Evidence: [BOOTSTRAP-PARITY-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/BOOTSTRAP-PARITY-2026-09-04.md).
- [x] **[PRD-C056]** Retain release SHA, commands, database identity, journal hash/count, catalog diff, sanitized logs and artifact hashes for the current-head bootstrap and migration evidence.
      **CLOSED 2026-09-04 — measured.** The evidence bundle exists at journal head 685: release commit, database identity (`br-patient-dew-az4o362h`, host `ep-polished-art-azutwo4c.c-3.ap-southeast-1.aws.neon.tech`, databases `scratch_boot_a/b/c`), verbatim commands, journal count 685 with head `1061_push_endpoint_cross_tenant_claim`, chain head hash `376be53d4e245725f2acef88b68ae14bcd0c0c6b231a2b5791273440577ac244`, the A-vs-B and A-vs-C catalog diffs, and sanitized logs in which no password appears. Evidence: [BOOTSTRAP-PARITY-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/BOOTSTRAP-PARITY-2026-09-04.md).

#### 4.1 Schema and executable-key minimization

- [x] **[PRD-C057]** Inventory and classify in-scope database columns, primary/foreign/unique/check constraints, indexes and JSONB keys plus executable code registries for routes, permissions, modules, events, commands, query/cache keys, configuration, environment variables, feature flags and translations. Every entry is KEEP, REFACTOR or REMOVE with its owner and concrete failure prevented.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C058]** Remove unused database columns and JSONB properties only after proving zero reads/writes through Drizzle, raw SQL, migrations, exports, search/vector ingestion, audit/retention jobs, analytics and external contracts. Frequently filtered, joined, authorized or constrained JSONB properties must be normalized or indexed rather than silently retained as opaque payload.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C059]** Detect redundant or overlapping foreign keys, unique constraints, checks and indexes using schema declarations, `pg_catalog`, representative `EXPLAIN (ANALYZE, BUFFERS)` plans and workload/index statistics. Statistics alone never justify deletion; preserve every constraint/index required for tenant isolation, referential integrity, concurrency, ordering or a documented access pattern.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C060]** Require each tenant-owned relationship to use the canonical composite organization-scoped key and supporting index. Remove a redundant single-column foreign key only after all callers and migrations target the composite relationship and clean-bootstrap/catalog parity passes.
      **CLOSED 2026-09-04 — Lane F measurement.** Evidence: [TENANT-FK-CANONICALIZATION-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/TENANT-FK-CANONICALIZATION-2026-09-04.md). 0 in-scope redundant single-column FK pairs at HEAD 685. All 152 remaining pairs are CRM/Inventory (excluded from release scope). Prerequisites: callers of removed single-column FKs = 0 (dependency proof §2); clean-bootstrap/catalog parity = 0 differences (§4). Behavior preserved: 6/6 tests pass, SET NULL composites carry explicit column lists, org_id excluded from set-null columns. 54 CRM + 98 Inventory pairs reported but not changed.
- [x] **[PRD-C061]** Remove dead or duplicate code keys and aliases from permission catalogs, route/operation registries, module manifests, event/command catalogs, TanStack factories, cache namespaces, configuration schemas, feature flags and translation catalogs only after static and runtime registration/caller proof. Unknown dynamic string keys are rejected at their seam rather than preserved indefinitely.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C062]** Keep one typed, domain-owned factory/catalog for each surviving key family; prohibit ad-hoc string literals, parallel aliases and generic global dumping grounds. Tenant, subject, scope, filters, sort, cursor, version and permission dimensions remain in query/cache keys wherever correctness requires them.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C063]** Remove unused request/response/DTO/Zod fields and object properties across backend, OpenAPI, frontend hooks/forms and persisted events as one contract change. Never remove server-controlled tenant/actor fields, idempotency/version fields, authorization dimensions, audit fields or compatibility fields with a published consumer without an explicit migration/deprecation path.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C064]** After every key/schema cleanup, regenerate affected artifacts and prove migration chain/ledger, two clean bootstraps, catalog parity, tenant relationships/indexes/RLS, query plans, OpenAPI/contract compatibility, cache invalidation and focused behavior tests. Final acceptance is zero unclassified unnecessary keys and no orphaned schema/code reference.
      **CLOSED 2026-09-04 — measured at journal head 691.** The release baseline moved during this session (`ab8858bb3` journalled 6 previously-orphaned migrations, 685 → 691), so this was re-proved at the new head rather than inherited. Two databases reached `REACHED_HEAD 691/691`; catalog parity between them is **0 differences across 9 sections** (1026 tables · 13511 columns · 14027 constraints · 4773 indexes · 983 policies · 467 functions · 170 triggers · 6 extensions · 476 enums). Four migration gates re-run with `DATABASE_URL` bound to a database AT head so the applied-watermark check actually ran: `check:migration-chain`, `check:migration-ledger`, `check:migration-immutability`, `check:migration-discipline` — all exit 0. `check:tenant-relationships`, the single named blocker, now exits **0** (691 of 691 journal entries, 214 single-column FKs, **0 actionable**); it previously exited 2 — INCONCLUSIVE — only because its target was mid-bootstrap. It refused twice more during this work (unchosen target, then ledger 685 of 691) and both refusals were honoured by bringing the database to head, not by overriding the gate. Evidence: [HEAD-691-REPROOF-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/HEAD-691-REPROOF-2026-09-04.md).

### 5. Query, pagination and cache correctness

- [x] **[PRD-C065]** Prove explicit projections, tenant-leading/access-pattern indexes and no required full tenant/table scan or avoidable sort.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C066]** Exercise reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard queries against seeded data.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C067]** Verify cache keys include tenant, subject, permission and resource dimensions where applicable.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C068]** Prove mutation/revocation invalidation, TTL/negative-cache policy, stampede protection and Redis degradation never leak data or preserve revoked access.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 5.1 Efficient database-call contract

- [x] **[PRD-C069]** Record a maximum database-call count for every critical route and worker batch; fail regression tests when an implementation adds unexpected calls.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C070]** Execute tenant-owned request work inside the minimum correct tenant transaction and reuse its handle; never open nested/per-row transactions or borrow a committed request transaction.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C071]** Select named columns only and return minimal DTO projections; never hydrate full ORM rows, global users or large JSON/blob/vector fields for list/count/existence paths.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C072]** Batch relationship, permission, unread, attachment, assignee and metadata lookups with joins, CTEs or bounded multi-key queries; forbid database/cache calls inside growing loops.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C073]** Implement existence/authorization probes with tenant-correlated indexed predicates and `LIMIT 1`; do not fetch records or counts when only existence is required.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C074]** Make exact totals opt-in and independently budgeted; cursor pages must not run an expensive `COUNT(*)` automatically on every request.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C075]** Use bounded bulk insert/update/upsert operations and conflict-safe unique keys instead of one write per row; keep transactional batches below documented lock/payload limits.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C076]** Verify concurrent counters, unread state, seats, balances, ordering and idempotency use atomic SQL/upsert/locking semantics without read-then-write races.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C077]** Apply statement/query timeouts and cancellation propagation to interactive work; move reports, exports, reindexing and wide aggregates to resumable jobs.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C078]** Measure connection acquisition, transaction duration and idle-in-transaction behavior; release connections before external provider calls or long CPU work.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C079]** Benchmark under the application role with tenant context and RLS, never only as the database owner; plans must include real authorization predicates.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C080]** Capture slow-query fingerprints, call counts, rows read/returned, buffers and lock waits in test evidence without logging sensitive bind values.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

### 6. Organization and module RBAC

- [x] **[PRD-C081]** Run BOLA/IDOR tests for reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and public/share-token paths; cross-tenant misses return 404.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

### 7. NestJS route and worker behavior

- [x] Verify every route is classified public, universal, permissioned or explicitly authorized inside its implementation; no undeclared route exists.
      Evidence: `check:route-classification` passes; `openapi:generate` reports exposure stamped on 3,613 operations, 0 undeclared.
- [x] **[PRD-C082]** Verify every privileged operation applies module, permission, tenant, record and DataScope checks at the correct seam.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C083]** Verify writes are transactional, idempotent and safe under concurrent retry; side effects use after-commit/outbox behavior and never a dead request transaction.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Verify background sweeps iterate tenant context explicitly, use bounded/resumable leases and expose retry/DLQ/cancellation states.
      Evidence: ticket 32 is closed; tenant iteration, bounded readiness, fenced leases, retry/DLQ/cancellation metrics and safe shutdown handoff are covered by its recorded health/cron suites.
- [x] **[PRD-C084]** Verify minimal response projections, serialization/redaction, generic errors, resource limits and stable HTTP semantics.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Reconcile OpenAPI exposure, request, response, 4xx schema and operation metadata with active controllers and consumers.
      Evidence: `check:openapi-coverage`, `check:contract-registry` (3,625 classified: 101 published / 3,524 internal), `check:contract-vendor`, `check:contract-drift` all pass 2026-09-02.

#### 7.1 Optimized route and transport contract

- [x] Keep one canonical route per product operation; remove dead, versionless, duplicated and overlapping routes after caller/dependency proof.
      Evidence: `check:route-duplicates` passes 2026-09-02.
- [x] **[PRD-C085]** Define route budgets for database calls, downstream calls, application latency, response bytes and memory; record p50/p95/p99 at the release commit.
      **CLOSED 2026-09-06 - measured over HTTP on the co-located stack.** 102 budgets (76 routes + 26 workers)
      carry p50/p95/p99 latency, response bytes and heap, plus request-level database and downstream call
      counts, captured in-process against `scratch_local` on two tenants over independent replicates:
      **94 measured / 8 refused / 0 failed of 102 on each tenant**, 188 of 204 route x tenant slots measured.
      `check:route-budgets` **passes** at the release commit - 566 of 781 declared ceilings are measured and
      within budget, and the remaining 215 are reported as unmeasured and unenforced rather than as passing.
      The critical set is 53 routes with 0 missing a budget entry. The 8 refusals per tenant are declared and
      reasoned: six provider-backed mail routes (the seed has no connected mail account, so no real message,
      thread or attachment id exists) and two realtime-token routes (no Ably credentials in the seed). Two
      measured breaches were fixed rather than excused - `GET /search` at 19 request statements (one combined
      SDF probe plus per-request module memos, now 7-11) and `GET /calendar/events` at 2,079 ms and 372 KB
      (a 400-per-source candidate page and a compact range projection, now 475 ms and 143 KB).
      Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

- [x] **[PRD-C086]** Design routes around one user intent rather than forcing avoidable request waterfalls, while keeping unrelated domain implementation out of oversized mega-responses.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C087]** Keep Home aggregation bounded and parallel with independent section results; one slow source must not delay or fail every section.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C088]** Return explicit DTO projections and omit unused nested relations, internal columns, secrets and repeated denormalized payloads.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Support conditional responses with version/ETag or `Last-Modified` where correctness permits; include tenant, permission and representation changes in the validator.
      Evidence: Express 5.2.1 already emits a weak ETag per response body and returns 304 on a matching `If-None-Match` — proven by round-trip (200+ETag / 304 empty / 200 on stale). A hand-rolled global interceptor was removed: it double-serialised every authenticated GET and threw `ERR_HTTP_HEADERS_SENT` on `@Res()` downloads.
- [x] **[PRD-C089]** Enable Brotli/gzip for eligible JSON/text/OpenAPI/static responses with minimum-size and already-compressed-content exclusions; never compress secrets in a cross-origin reflection context.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C090]** Stream AI responses, downloads and large exports or return durable asynchronous jobs; do not buffer growing payloads in NestJS or Next.js memory.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C091]** Propagate cancellation and deadlines through NestJS, database, cache and provider adapters; enforce upstream timeouts, concurrency limits and backpressure.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C092]** Require idempotency and optimistic concurrency/version checks for replayable or conflict-prone mutations; return stable 409/412 semantics.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C093]** Avoid serial downstream/provider calls when independent, cap parallel fanout and use batch adapters where providers support them.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C094]** Verify frontend route loaders and TanStack consumers reuse/prefetch the canonical request instead of issuing duplicate server/client fetches.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Keep response/error envelopes, pagination metadata and cache headers consistent across modules and prove frontend/OpenAPI contract compatibility.
      Evidence: `check:envelope-consistency` + `check:contract-vendor` pass 2026-09-02.

### 8. TanStack Query and Next.js data layer

- [x] **[PRD-C095]** Verify one hierarchical query-key factory per domain includes organization, subject, scope, filters, sort and cursor dimensions as applicable.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Remove duplicated/ad-hoc string query keys and prove invalidation targets the correct prefix without flushing unrelated tenants/modules.
      Evidence: `check:query-scope` passes 2026-09-02.
- [x] **[PRD-C096]** Gate queries with effective access and required identifiers; disabled queries must not send unauthorized or malformed requests.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C097]** Verify mutations invalidate or update every affected list/detail/count/dashboard key and roll back optimistic state safely on failure.
      **CLOSED 2026-09-04 — measured, with one defect fixed.** A coverage sweep of 1,164 mutation sites across 308 files found exactly one real invalidation gap: `useBulkUpdateTickets` (`frontend/hooks/api/build/ticket-mutations.ts:302-307`) invalidated `projects.detail`, `projects.tickets` and `projects.columnCounts` but omitted `queryKeys.projectReports.all` and `queryKeys.dashboard.myIssues()` — both of which its sibling `useCreateTicket` and `useDeleteTicket` do invalidate, and which `useUpdateTicket.onSettled` gates on exactly the `status`/`sprintId`/`assigneeId` fields the bulk hook accepts. A bulk status or assignee change therefore left sprint burndown reports and the My Issues dashboard widget serving stale data until staleTime expired. Both invalidations were added, so the bulk path now matches the single-ticket path key for key. The argument-less-factory trap was checked rather than assumed: `dashboard.myIssues` is declared `() => [...base, "dashboard", "myIssues"]` and takes no parameters, so calling it bare produces no trailing `undefined`, and `projectReports.all` is a prefix array rather than a function. Frontend `tsc --noEmit` exit 0. Evidence: [CACHE-INVALIDATION-EVIDENCE-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/CACHE-INVALIDATION-EVIDENCE-2026-09-04.md).
- [x] **[PRD-C098]** Use optimistic updates only where concurrency semantics are defined; otherwise await the backend result and invalidate deterministically.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C099]** Verify cursor pagination does not duplicate/skip records and changing filter/sort resets pagination correctly.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C100]** Verify loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C101]** Prove frontend types and runtime parsing cannot silently accept a backend contract change.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Enforce canonical query-key factories for authenticated data: zero ad-hoc array keys or local key factories, no redundant tenant argument where the scoped Query hash already owns tenant/user identity, and exact invalidation tests for every mutation.
      Evidence: `check:query-scope` + `query-scope-isolation.test.tsx` pass 2026-09-02.

### 9. Operability, upload lifecycle and verification integrity

- [x] **[PRD-C102]** Emit structured, redacted and tenant-safe logs, metrics and distributed trace context across HTTP requests, database/cache/provider adapters, outbox publication, queue/event consumers, cron jobs and AI streams. Correlate one user intent through asynchronous work without logging secrets, tokens, prompts, file contents or sensitive bind values; classify expected domain failures separately from actionable faults.
      **CLOSED 2026-09-04 — measured per surface.** All eight named surfaces carry correlation id and tenant context into the log record: HTTP `common/http/correlation-id.middleware.ts:75` plus post-auth enrichment `observability-enrichment.interceptor.ts:30`; database statement `db/query-telemetry.ts:79` and pool `db/pool-telemetry.ts:95`; cache `common/cache/cache.service.ts:125`; provider `common/outbound/call-provider.ts:123`, which also injects `traceparent` and `x-correlation-id` outbound; outbox producer `common/outbox/outbox-writer.ts:41` persisting `outbox_events.correlation_id` and consumer `outbox-publisher.service.ts:89` restoring it; queue/event consumers `common/workflow/workflow-outbox-relay.service.ts:160` and `workflow-runner.service.ts:82`; cron `common/tenant/for-each-org.ts:227` per org; AI streams `modules/ai/core/telemetry/ai-correlation.ts` and `ai-call-metrics.ts:114`. Redaction was verified by reading its field list, not by trusting its name: `SENSITIVE_EXACT` and `SENSITIVE_SUBSTRINGS` cover jwt/bearer/token, password, secret, authorization, apikey, credential, privatekey, prompt, email/phone and message envelope fields, and `scrubBindParameters` (`redact.ts:123`) strips Drizzle bind values out of error strings. AI token counters deliberately use `ai.tok_in`/`ai.tok_out` to avoid being redacted by the `token` substring rule. No log call site emits a secret, credential, prompt or cross-tenant identifier. Evidence: [OBSERVABILITY-INVENTORY-EVIDENCE-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/OBSERVABILITY-INVENTORY-EVIDENCE-2026-09-04.md).
- [x] Expose shallow liveness and dependency-aware readiness interfaces, plus graceful shutdown, connection draining and worker lease handoff in code. A failed database, cache, queue or required provider dependency must produce an explicit degraded/unready state without making health probes amplify the outage; deployed probe and alert delivery evidence remains deferred.
      Evidence: ticket 32 is closed with explicit ready/degraded/unready contracts, bounded cached dependency probes, graceful HTTP drain and fenced lease handoff.
- [x] **[PRD-C103]** Enforce one tenant-private upload interface for attachments and documents: validate declared size and magic-byte MIME, sanitize names, use organization-scoped object keys, idempotent multipart completion, malware quarantine, authorization recheck before short-lived download URLs and asynchronous compression/preview/transcoding with bounded jobs. Cancellation, failed transforms, replacement and GDPR/retention deletion must clean database rows and objects without orphaning or exposing public URLs.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Version every published customer/integration contract or provide an explicit backward-compatible deprecation window. Reconcile REST/OpenAPI, webhooks, realtime events, exports and SDK-facing schemas with consumer evidence, idempotency/replay rules and removed-operation records; coordinated internal frontend/backend contracts may break only in the same release commit.
      Evidence: ticket 34 is closed; 101 published operations and 23 customer webhook event names carry version/deprecation and replay terms, with retained tombstones and breaking-change gates.
- [x] **[PRD-C104]** Make every architecture/release gate bite-proven with a known-bad fixture or mutation that fails for the intended reason. Critical tests must exercise transaction callbacks, authorization deny/cross-tenant paths, retries and failure branches; zero silently skipped/quarantined tests, vacuous mocks, swallowed promise failures or baselines raised merely to turn a regression green.
      **OPEN — named blocker.** `check:test-suppressions` exit 1 — runtime-selected suppressions against a ratchet of 29. The bulk are infrastructure-gated suites (`*.db.spec.ts` needing a live database, `*.eval.spec.ts` needing an AI provider key, 1 perf e2e). The ratchet was NOT raised.
      **CORRECTED 2026-09-05 — the count recorded here was 66 and is not reproducible; the gate reports 76, and reported 76 on 2026-09-04 too.** Measured at backend `b1896c38e`: `pnpm -C backend check:test-suppressions` prints "Spec files 2286 · suppression sites 20 · conditional aliases 75 · conditional 76 · placeholder 13 · quarantine 6 — FAIL, 76 runtime-selected suppressions, above the ratchet of 29". This is **not a regression**, and must not be read as one: `git diff --stat 92d4aa4f6..HEAD -- src/scripts/check-test-suppressions.mjs src/scripts/baselines/test-suppressions.json` is empty (gate and registry byte-identical to the 2026-09-04 release commit), and the conditional-alias corpus is unchanged at 81 matching lines across every commit from `92d4aa4f6` through `b1896c38e`. Same tree, same gate, same number — 66 was a transcription error, not an earlier measurement.
      **MEASURED 2026-09-05 — the promotion condition is NOT met, and this is now evidence rather than assumption.** The gate's own source says 29 moves only once `db-gates.yml`'s "Database-gated spec suites" step is green on a run somebody has read. That step was run for the first time, against a disposable Neon branch bootstrapped from empty to `REACHED_HEAD 691/691`, seeded with `seed-scratch-e2e`, with all 23 `*_DB_TESTS` gates armed and `APP_DATABASE_URL` on the non-owner `streamline_app` role (`bypassrls=false`). Result: **43 suites passed, 11 failed, 2 skipped of 56; 249 tests passed, 36 failed, 19 skipped.** It is not green, so **29 stands and the gate stays honestly red.** Failing suites: `chat-presence-conflict-target`, `chat-read-path-hardening`, `chat-send-conflict-target`, `hr-import-attendance-idempotency`, `hr-dashboard-attendance-grain`, `party-identifiers`, `party-legacy-backfill`, `party-legacy-writer`, `journal-completeness`, `crm-permissions-reach-somebody` (CRM, out of release scope), `workflow-publish-lost-update`. The failures cluster on two fixture faults, not on production defects: 18 occurrences of `constraint "fk_business_parties_employer" for relation "business_parties" already exists` (setup that is not re-runnable) and 10 of `null value in column "party_id" of relation "business_parties" violates not-null constraint` (a fixture gap). That matches the step's own comment predicting suites would fail until a seed step lands or the specs build their own fixtures.
      ⚠️ **`pnpm test:db-specs` matched 0 of 56 specs on Windows and must not be trusted as the measurement command.** The script carries `--testPathPattern='\\.db\\.spec\\.ts$'`; through `pnpm run` on this machine jest received the doubled backslashes and reported `Pattern: \\.db\\.spec\\.ts$ - 0 matches` while exiting as if it had run. Invoked directly, the same pattern lists all 56. The figures above come from a direct `node ./node_modules/jest/bin/jest.js --testPathPattern='\.db\.spec\.ts$'`. **Whether CI (Ubuntu) is affected was NOT tested and must not be inferred** — but a step that can report success over an empty set is exactly what this ratchet exists to prevent, so verify the matched-file count before ever reading that step as green.
      **UPDATED 2026-09-05 — 8 of the 11 failing suites repaired; the db-gates step is 51/54 in scope, and the ratchet still stands at 29.** The 3 party suites were fixed in `6d33c5e0d` (0/23 -> 23/23). The remaining 8 are fixed in `e7f5854d0` and `50118928d`: **46/46 passing**. **Every failure was in the test, not in the code under test**, and three were worse than failing. (1) Three HR specs hardcoded `const ORG_ID = "kbprobe-a"` — a string that appears in those three files and **nowhere else in the repository**; no seeder, migration or fixture creates it. Two threw on every machine but one. The third, `hr-analytics-plus-department-filter`, asserts "the call resolves" and "the filtered page is empty" — both of which a **non-existent org satisfies for free** — so it reported 9/9 green while measuring nothing, which is why it never appeared on this list. It now runs against the seeded tenant behind a floor requiring ≥ 2 of 4 drilldown metrics to carry rows, bite-proved by pointing `SEED_ORG_ID` back at `kbprobe-a`. (2) `workflow-publish-lost-update` was **accusing correct code**: it ran two "concurrent" publishes with `sql.begin` twice on ONE postgres.js client, which measured against Neon do not overlap — editor B did not read until editor A had committed, so two SEQUENTIAL publishes both won and the suite reported that as a lost update. `workflows-crud.service.ts:238` is correct; on separate connections both read version 3, one UPDATE returns 1 row and the other 0. The suite now asserts the interleaving it depends on rather than assuming it. (3) `journal-completeness` planted 1,400 rows one round trip at a time — 4,200 across the suite at ~450 ms each — and hit the 180 s cap having planted nothing; set-based inserts bring it to ~3 s per test. **No timeout, ceiling or ratchet was raised.** (4) The three chat suites open with a discovery read that cannot set `app.organization_id` before it runs, so RLS emptied it under the application role. Still failing and NOT repaired: `crm-permissions-reach-somebody` (CRM, out of release scope under PRD-C157). Evidence: [DB-SPECS-AND-DATE-GATE-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/DB-SPECS-AND-DATE-GATE-2026-09-05.md).

      **UPDATED 2026-09-05 (second) — the CI step had never run a single test, and the numbers above were never produced by it.** `pnpm test:db-specs` shipped `--testPathPattern='\\.db\\.spec\\.ts$'`, which reaches jest as a regex where `\\` is a **literal backslash**, demanding `<backslash><anychar>db` — a sequence no path has, on Windows or Linux. jest printed `Pattern: \\.db\\.spec\\.ts$ - 0 matches` and `No tests found, exiting with code 1`. It was introduced in `31b83208a`, the commit that added **both** the script and the scheduled `.db.spec.ts` step in `db-gates.yml`, so that step has never executed one test since the day it was written. It escaped notice because every tally ever quoted for it — including the 43/11/2 and 51/54 above — came from invoking jest **directly** with a working pattern, never through the script the workflow runs. Fixed in `d2bb0e2b8`; `\.db\.spec\.ts$` selects **56**, the same 56 recorded here. Separately, three probe URLs (`CALENDAR_`, `EMAIL_`, `PUSH_`) named the `ci` owner, which the step's own comment warns against — a spec prefers its `*_PROBE_DATABASE_URL` over `APP_DATABASE_URL`, so those three ran with BYPASSRLS. Calendar and email failed loudly; **push passed, because "re-registers instead of raising 42501" is free when RLS never applies.** Fixed in `454c03ac7` (as `streamline_app`: calendar 9/9, email 9/9, push 9/9). Run end-to-end through the fixed script against the fully seeded branch: **51 passed, 3 failed, 2 skipped of 56** (282 tests passed, 5 failed, 23 skipped). Two of the three failures were `party-identifiers` and `party-legacy-writer`, both of which passed only while the first organisation had no CRM rows — repaired in `2e376779b` (14/14). Re-run whole through the same script after that repair: **53 passed, 1 failed, 2 skipped of 56 — 286 tests passed, 1 failed, 23 skipped.** The one remaining failure is `crm-permissions-reach-somebody`. **The ratchet stays at 29**: `db-gates.yml` requires the suites to be green here and measured before it moves, and one is still red. Evidence: [READ-COST-FULL-COVERAGE-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/READ-COST-FULL-COVERAGE-2026-09-05.md).
      **The ratchet still may not be raised, and this criterion cannot be closed by writing specs.** The condition for moving 29 is written into `check-test-suppressions.mjs` itself and is not a judgement call: the `Database-gated spec suites` step in `db-gates.yml` must be green on a run somebody has read, and promoted off its `if:` to every event. Note the structural tension with PRD-C018, which is real and unresolved: every new DB-gated seeded-E2E spec written to close C018 adds a conditional alias to the class this ratchet caps, so the two criteria pull against each other until that CI step is promoted.
      Owner: the repository owner. Recorded in the release record; not waived.

### 10. Module release matrix

- [x] **[PRD-C105]** Inventory its backend module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, TanStack keys, tests, fixtures and operational scripts.
      **CLOSED 2026-09-04 — counted on disk, not estimated.** Backend: 74 top-level module folders, 218 module files, 551 controllers, 1,085 services, 382 DTO/Zod schema files, 347 database schema files, 925 SQL migration files against 691 journal entries (the 234 orphan SQL files are pre-existing and not introduced by this release), 78 worker/cron files, 136 cache-key namespace entries, 29 files registering outbox consumers, 2,208 test files. Frontend: 600 App Router pages, 306 shared components, 2,334 feature files, 602 hooks, 22 TanStack query-key files holding roughly 173 namespace entries, 439 test files. Evidence: [OBSERVABILITY-INVENTORY-EVIDENCE-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/OBSERVABILITY-INVENTORY-EVIDENCE-2026-09-04.md).
- [x] **[PRD-C106]** Verify every folder/file has one canonical domain owner, kebab-case naming, correct import direction and no parallel legacy/duplicate location.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C107]** Classify every inventoried file as KEEP, REFACTOR or REMOVE; name the concrete failure prevented for each REFACTOR/REMOVE verdict.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C108]** Verify each file has one cohesive responsibility, stays within size policy or a documented exception, exposes the smallest useful interface and contains no pass-through/dead/commented/debug implementation.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C109]** Prove removals and moves with dependency-graph, dynamic/side-effect import, route registration, raw table-name/FK, build/typecheck and relevant migration-integrity evidence.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C110]** Record the final module folder tree and public interfaces so future work cannot recreate retired paths, duplicated schemas, hooks, query keys or endpoints.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.1 Authentication, identity, sessions and organization

- [x] **[PRD-C111]** Queries/cache: verify bounded membership/session reads, required indexes and immediate invalidation of session, effective-access and organization caches.
      **CLOSED 2026-09-04 — measured.** Bounded reads: the session list cap of 50 is enforced and logged, the cache-bust loop uses keyset pagination with no ceiling, and frontend membership reads are capped at 100 per page. Session revocation is a real tombstone, not a database flag: `sessions.service.ts` writes `revoked:session:<id>` to Redis after each database update and the read path checks it — independently re-verified by the orchestrator at `common/auth/jwt-auth.guard.ts:106` (the global guard, so every request pays the check) as well as `modules/auth/auth.controller.ts:335`, and bite-proved by `jwt-guard-revocation.spec.ts`. Immediate invalidation: `bumpPermissionsVersion` is called in-transaction for every RBAC mutation; a module toggle busts all active member sessions through `invalidateMany` with keyset paging (`entitlements.service.ts:bustActiveMemberSessions`); membership revocation tombstones every session of the removed user; and the frontend invalidates `queryKeys.access.me()` on every role, permission-grant and module-access mutation. Evidence: [CACHE-INVALIDATION-EVIDENCE-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/CACHE-INVALIDATION-EVIDENCE-2026-09-04.md).
- [x] **[PRD-C112]** Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and allow/deny/cross-tenant E2E.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.2 Organization RBAC and module RBAC

- [x] **[PRD-C113]** Routes/contracts: verify role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protections.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C114]** Queries/performance: verify effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role, permission, module and tenant access paths.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.3 Home

- [x] **[PRD-C115]** Reconstruct current-head Home evidence across folder ownership, universal-versus-module composition, section-level authorization/privacy, bounded parallel queries, independent loading/error states, cache/query keys, responsive accessibility and representative E2E; classify every Home file KEEP, REFACTOR or REMOVE without changing public landing-page visuals or animations.
      **CLOSED 2026-09-04 — measured, with two product-rule violations fixed.** Home was carrying two module destinations that the product rules place in their owning nav. `RecruitmentWidget` mounted a `HomeSectionBoundary` calling `GET /hr/recruitment/interviews` and linking into `/hr/recruitment/candidates/:id`; its dynamic `import()` and the component file are removed. `PayrollAdminCard` rendered for holders of `payroll:runs:view`, calling `GET /payroll/command-center` and linking to `/payroll/runs`; it is removed. `PayrollSelfCard` is deliberately PRESERVED and verified still rendering — employee self-service is platform core, not a module destination, so an employee's own pay summary stays on Home. The now-dead `canViewPayrollAdmin` and `canViewInterviews` fields were deleted from `use-dashboard-access.ts` and its test mocks. Two bite tests pin the result in `home-section-boundary.test.tsx`: one asserts `<RecruitmentWidget` is absent from the grid, the other asserts `payroll-widget.tsx` contains neither `useCommandCenter` nor `/payroll/runs` while still containing `PayrollSelfCard` and `/me/pay` — so re-adding either surface fails, and so does silently deleting self-service along with it. All other sub-claims were already clean: `HomeSectionBoundary` isolates every widget independently, parallel queries are bounded behind an IntersectionObserver, cache keys come from the `queryKeys.dashboard.*` factory, and `EMPLOYEE_SELF_SERVICE_GRANTS` is enforced in backend effective permissions at `access-policy.ts:166` rather than as a frontend entitlement constant. Frontend `tsc --noEmit` exit 0. Evidence: [HOME-BILLING-EVIDENCE-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/HOME-BILLING-EVIDENCE-2026-09-04.md).

#### 10.4 Settings and module-access administration

- [x] **[PRD-C116]** Architecture/schema: prove global settings contain organization configuration/access governance only while operational and module-owned settings remain with their modules.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C117]** Queries/cache: verify bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement caches.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.5 Directory, Me and employee self-service

- [x] **[PRD-C118]** Reconstruct current-head Directory/Me evidence across canonical ownership, self-versus-administrative authorization, tenant-scoped schema and indexes, bounded search/list projections, privacy-safe caching, TanStack keys, responsive accessibility and allow/deny/cross-tenant E2E.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.6 HRMS

- [x] **[PRD-C119]** Reconstruct current-head HRMS evidence across employee lifecycle schema, tenant-composite integrity, module/record/DataScope authorization, bounded indexed queries, async imports/exports, cache invalidation, frontend states, folder cohesion and representative HR workflows.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.7 Payroll

- [x] **[PRD-C120]** Architecture/schema: verify payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C121]** Queries/cache/workers: verify bounded run/item reads, indexed employee/period/status paths, no N+1 calculations, asynchronous exports and correct invalidation after lock/publish/reversal.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C122]** Frontend/TanStack/tests: verify run-state UI, conflict/retry/partial failure, permission gates, secure downloads and calculation/locking/reconciliation E2E.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.8 Build and project management

- [x] **[PRD-C123]** Reconstruct current-head Build/PM evidence across workspace/project/ticket schema, tenant and record authorization, bounded boards/backlogs/search, cursor and cache contracts, async/realtime workflows, frontend states, folder cohesion and representative E2E.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.9 Workflows and automations

- [x] **[PRD-C124]** Reconstruct current-head Workflow evidence across definition/version/execution schema, permission rung, bounded execution history, idempotent queue/outbox processing, retry/DLQ/cancellation, secrets/redaction, frontend states and representative E2E.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.10 Billing and payments

- [x] **[PRD-C125]** Reconstruct current-head Billing/Payments evidence across plans, subscriptions, entitlements, seats, proration, usage, immutable invoices, tax/currency, idempotent provider events, replay-safe webhooks, cached feature gates, authorization, frontend states and sandbox failure tests.
      **CLOSED 2026-09-04 — measured.** Route contract holds and was independently re-verified against the filesystem by the orchestrator: `/settings/billing` and `/settings/billing/ai-credits` are the only two platform billing pages, `/billing` carries a layout but no `page.tsx`, and `/billing/ai-credits`, `/settings/subscription` and `/billing/seats` do not exist. `/billing/invoices` is the organization's own customer invoicing gated on `accounting:view`, which the product rules permit. Entitlement enforcement is complete rather than partial: all 14 `LimitKey` values (members, projects, kbPages, chatChannels, crmLeads, crmContacts, crmDeals, supportTickets, automations, signEnvelopes, surveys, acctInvoices, hrCandidates, hrJobPostings) call `assertWithinLimit` before insert in their creation services. AI billing is token-metered through `computeTokenCharge` (`ai-model-pricing.constants.ts:35`) with integer milli-credits stored on every settle path and `AI_FEATURE_COSTS` used only as reserve ceilings. Webhook replay safety: `ProviderEventLedger.claim` (`provider-event-ledger.ts:22`) inserts with `onConflictDoNothing` on composite `(org_id, provider, provider_event_id)` after signature verification. Invoices are immutable via `InvoiceSnapshotService.issueInvoice` with credit notes for adjustments. `billing:subscription:view` and `billing:ai-credits:view` exist verbatim in both the backend and frontend catalogs. Evidence: [HOME-BILLING-EVIDENCE-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/HOME-BILLING-EVIDENCE-2026-09-04.md).

#### 10.11 Accounting and finance

- [x] **[PRD-C126]** Reconstruct current-head Accounting/Finance evidence across immutable tenant-safe ledgers, normalized expenses and reconciliation, bounded indexed reads, queue-backed exports/reminders, idempotent consumers, retention, authorization, frontend states and production-shaped workflow tests.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.12 Chat

- [x] **[PRD-C127]** Reconstruct current-head Chat evidence across channel/thread/member/message/reaction/attachment schema, tenant-composite integrity, channel and mutation authorization, scalable ordering/fanout/unread state, bounded history/search, cache/realtime invalidation, offline UI and representative E2E.
      **CLOSED 2026-09-04 — measured.** The one blocking sub-claim, live mention delivery, now passes: two consecutive runs of `verify-chat-mention-delivery.mjs` against the API booted on a cleanly bootstrapped database returned exit 0 with `Alex received 1 / Alexander received 0` for an explicit `@alex` and `1 / 1` for `@everyone`. Both directions matter — `@alex` reaching Alexander would be a substring over-match, and `@everyone` missing Alexander would be a roster-expansion failure. The recorded failure text ("got 0", "@everyone notified nobody") was stale: it predated the fan-out fix and had never been re-measured. Everything else was already verified — all 10 chat tables carry `(orgId, id)` UNIQUE with composite tenant FKs and no bare global FK; `chat:channels:read|write` and `chat:messages:read|write` gate the controllers under `JwtAuthGuard, PermissionGuard`; message send re-asserts channel membership before any write (`chat-messages.service.ts:78-83`); ordering uses `idx_chat_messages_channel_position` on `(orgId, channelId, channelPosition DESC)` with position taken from an in-transaction `message_count` increment; history is capped at 100 and channel lists at their page cap; fan-out is outbox-backed and atomic with the insert; attachments mint signed URLs with a 3600-second TTL, not permanent public ones. Evidence: [CHAT-MENTION-DELIVERY-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/CHAT-MENTION-DELIVERY-2026-09-04.md) and [CHAT-EVIDENCE-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/CHAT-EVIDENCE-2026-09-04.md).

#### 10.13 Calendar

- [x] **[PRD-C128]** Frontend/TanStack/tests: verify one `/calendar`, source toggles, timezone display, series-versus-instance edits, cursor/range keys and DST/exception/conflict/reminder E2E.
      **CLOSED 2026-09-04 — measured.** One unified calendar confirmed against the router tree on disk: `app/(authenticated)/calendar/page.tsx` with only a settings sub-route, error and loading boundary beside it. Three module mini-calendar surfaces exist (`features/build/views/calendar-view.tsx`, `features/hr/holidays/components/calendar-view.tsx`, `features/hr/leaves/components/leave-calendar-widget.tsx`); they predate this release and are pinned by a `toEqual` assertion in `features/calendar/unified-calendar-surface-boundary.test.ts:86` that bites both on a new addition and on a silent removal. Source toggles are module-gated server-side in `calendar-source.registry.ts:50-69` and the enabled set is part of the query key (`lib/query-keys/platform-hierarchy.ts:6-9`). Times are stored as UTC instants with the browser zone applied at create only (`hooks/api/calendar.ts:139`). Series-versus-instance edits go through `event-series-scope-dialog.tsx:15` with nominal-start handling bite-proved in `use-event-series-scope.test.ts:99`. Range keys carry the range and contain no `undefined` slot. DST, exception, conflict and reminder behaviour are covered by `calendar-dst-edge.spec.ts:27-111`, `calendar-reminder-sweep-recurring.spec.ts:594`, `calendar-exception-reminder-cancellation.spec.ts` and `__tests__/event-conflict-notice.test.ts:65-92`. Neither of the two Drizzle runtime traps is present: zero Date-in-`sql`-template and zero `= ANY(${jsArray})` matches across `backend/src/modules/calendar/**`. Evidence: [CALENDAR-EVIDENCE-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/CALENDAR-EVIDENCE-2026-09-04.md).
- [x] **[PRD-C129]** Commit Calendar changes locally first with an atomic provider-sync intent and `pending` state; process create/update/delete asynchronously with idempotent lease, retry/backoff and cancellation, persist per-event monotonic operation/version ordering plus delete tombstones, discard stale jobs/webhooks, reconcile provider drift, expose `synced/failed` plus user retry, and prevent permanent local/external divergence.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.14 Inbox and mail

- [x] **[PRD-C130]** Queries/cache/workers: verify indexed conversation ordering/search/unread, incremental sync, idempotent send/receive, bounce/retry/DLQ and invalidation of list/thread/count keys.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C131]** Frontend/TanStack/tests: verify infinite lists, thread hydration, optimistic read/label rollback, compose/send states, offline/reconnect, sanitization and account-revocation E2E.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.15 Notifications, email and push

- [x] Give the notification lifecycle mutations an `onError` and a rollback. `frontend/hooks/api/notifications-inbox.ts`
- [x] **[PRD-C132]** Re-verify provider-response schemas, tenant-fair delivery/backpressure, consent and suppression enforcement, durable retry/DLQ behavior, offline/revocation UI and cross-tenant notification delivery E2E at the release commit.
      **CLOSED 2026-09-04 — measured.** The only blocker was the PRD-C127 delivery failure, now resolved by measurement. The notification infrastructure itself verified clean on every named dimension: provider responses are schema-parsed with `providerSendResultSchema.safeParse` and an invalid shape becomes a retryable FAILED rather than a swallow; tenant fairness is bounded by `ORG_BATCH_CAP = 10` with a rotating org cursor; consent is the first gate and covers `SMS`/`WHATSAPP` before every other check including mandatory; suppression rules carry a composite tenant FK; retry is a real four-state machine `PENDING|IN_FLIGHT|PROCESSED|DEAD` with `processedAt`, lease-based reclaim, jittered backoff and a circuit breaker, reaching DEAD at `MAX_ATTEMPTS=5`; the inbox surfaces an offline banner and a retryable error state. Two recorded traps were re-tested and are genuinely fixed rather than assumed: the delivery FK no longer truncates microseconds (migration `0426` made both columns `timestamptz` and the value is set by SQL subquery, never through a JS Date), and the outbox is no longer a boolean without `processed_at`. RLS covers `notifications` and its 50 partitions plus every delivery table. Evidence: [NOTIFICATIONS-EVIDENCE-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/NOTIFICATIONS-EVIDENCE-2026-09-04.md).

#### 10.16 Knowledge Base, Wiki and Chatbot

- [x] **[PRD-C133]** Architecture/schema: verify spaces, memberships, documents/pages, immutable revisions, attachments, ingestion jobs, chunks/embeddings and deletion/reindex state have tenant-composite integrity.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C134]** Queries/cache/workers: verify revision/search plans, ingestion leases/retries/DLQ, chunk dedupe, permission-aware cache keys, purge/reindex and realistic-corpus latency.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C135]** Frontend/TanStack/tests: verify editor/revision conflicts, search cursors, permission changes, citations/source integrity, ingestion states and ACL/purge/reindex E2E.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.17 Shared storage, search, realtime and integration adapters

- [x] **[PRD-C136]** Reconstruct current-head shared-adapter evidence across tenant-safe interfaces, bounded retries/timeouts/circuit breakers, idempotency, backpressure, schema-validated provider responses, cache/credential isolation, observability, failure-mode tests and removal of duplicate provider-specific policy from product modules.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).

#### 10.18 Frontend system-wide release

- [x] **[PRD-C137]** TanStack/contracts: verify query-key factories, parsing, invalidation, hydration, cancellation, retry, optimistic concurrency and pagination rules across every module above.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C138]** UX/accessibility: verify loading/empty/error/offline/permission states, keyboard/screen reader, focus, contrast and responsive 375/768/1280 behavior.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C139]** Performance/SEO/tests: verify bundle boundaries, lazy loading, rendering/Web Vitals budgets and public metadata without changing landing visuals/animations; run representative browser E2E.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Reduce authenticated client route modules below the current 304-page ceiling, never raise that ceiling, and move data/authorization/orchestration to server or feature seams while preserving interactive leaf components; public landing visuals and animations remain untouched.
      Evidence: `check:client-pages` passes at 220 of a 304 ceiling; `check:route-thinness` ratchet lowered 114 → 58. Landing visuals untouched.
      **RE-VERIFIED 2026-09-03 — still true, and both numbers have improved past what is written here.** `check:client-pages`: **141 of 600 (23.5%), 163 below the 304 ceiling**, exit 0. `check:route-thinness`: 588 authenticated route modules scanned, **IN SCOPE thick 0 against a baseline of 0**, exit 0; the 67 that remain thick are CRM/Inventory, outside release scope. The ceiling was not raised. Landing visuals untouched.

### 11. Application security and privacy implementation

- [x] Test session fixation/replay, revoked membership, invitations, password reset, MFA/recovery, brute force and credential stuffing behavior.
      Evidence: ticket 17 closed all seven boxes with 133 recorded application-security tests, including real token revocation at guard evaluation.
- [x] Test code-level CSRF, XSS, SSRF, SQL injection, unsafe redirect, path traversal, CORS/CSP/headers, payload limits and rate limits.
      Evidence: ticket 17 recorded 133 passing tests across the injection, transport and rate-limit surfaces with known-bad controls.
- [x] Verify secret/PII redaction, secure cookies/sessions, generic auth failures and signing/encryption-key rotation behavior.
      Evidence: tickets 17 and 31 cover secret/PII redaction, bearer-session posture, generic failures, public-JWK projection and signing-key rotation behavior.
- [x] Implement correction/rectification rather than treating export, deletion or anonymization as correction.
      Evidence: ticket 18 is 7/7 closed; rectification writes the requested value, verifies read-back and records before/after hashes while authentication-linked fields require a separate challenge.
- [x] Make subject export exhaustive and resumable with no silent caps or skipped in-scope sources.
      Evidence: ticket 18 closed the async export drains, reclaim path and exhaustive-source coverage with keyset progress checks.
- [x] Implement idempotent tenant-scoped erasure for database, object storage, search/vector, projections, caches and supported adapters while preserving immutable/legal-hold records.
      Evidence: ticket 18 closed all recorded database, chat/AI, attachment, export-artifact, vector, cache/session and object-manifest sinks with legal-hold and repeat-run behavior.
- [x] Prove retention workers are code-scheduled, bounded/resumable, idempotent, audited, retryable and emit failure events.
      Evidence: ticket 18 records the in-process retention scheduler, leases, bounded drains, dead-man monitoring, durable failure state and zero uncovered retention tables.
- [x] Prove document, payroll, export, purge and retention workflows never silently skip or truncate growing work.
      Evidence: ticket 18 closed the previously capped mail/helpdesk/announcement, organization-member, HR-document and GDPR export/purge paths with multi-page and no-progress proofs.

### 12. Light-speed performance and AI

#### 12.1 Backend, database and cache budgets

- [x] **[PRD-C140]** Publish a benchmark manifest for every module: dataset size, concurrency, warm/cold state, machine/container limits, command, repetitions, p50/p95/p99, error rate and release SHA.
      **CLOSED 2026-09-06 - measured on the co-located stack.** Regenerated at backend `d00856b27` with
      `measure-benchmark-manifest.mjs --samples=50 --replicates=3 --concurrency=8 --plans --write` against
      `scratch_local` (PostgreSQL 18.6 on loopback, four skewed tenants, 962 MB): **15 modules, 105 benchmarks,
      105 measured on the reference tenant**, with dataset sizes, concurrency runs at c1 and c8, warm/cold
      state, cluster settings, command line, repetitions and p50/p95/p99 recorded per benchmark; plans retained
      for 20 approved-complex statements x 4 profiles and 36 heavy-query plans per tenant; 300 plan signatures
      stable across replicates. Statement coverage **in scope 241/244 (98.8%)**, 0 vacuous; the 3 unmeasured
      in-scope slots are `employee-record-list-canonical` on the two tenants below its `minRows` floor, named in
      the manifest. CRM (8) and Inventory (5) are excluded by `codeReleaseScope`, counted separately and never
      folded into the coverage number. Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

- [x] **[PRD-C141]** Keep application-controlled overhead for ordinary authenticated reads/mutations at p95 ≤ 300 ms and approved complex aggregate/search operations at p95 ≤ 800 ms, excluding internet/provider time.
      **CLOSED 2026-09-06 - measured on the co-located stack, at the cache-miss ceiling.** With Redis
      deliberately off, so every figure is the worst case, the in-process HTTP capture puts every ordinary
      authenticated read and mutation far inside the 300 ms budget - the median route p95 is about 30-50 ms and
      the slowest ordinary route stays under 100 ms - and the one approved complex aggregate,
      `GET /calendar/events`, at **p95 475 ms against the 800 ms ceiling** after the range read was bounded
      (2,079 ms before). Twenty-six workers measure at about a 30 ms median p95. The ~448 ms tenant-transaction
      floor that made this criterion unjudgeable from this machine is gone with the co-located database, and the
      figures exclude internet and provider time by construction, since no provider is reachable from the
      capture. Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

- [x] **[PRD-C142]** Keep ordinary database statements at p95 ≤ 50 ms and explicitly approved complex statements at p95 ≤ 200 ms on the production-shaped seed; retain plans for every exception.
      **CLOSED 2026-09-06 - measured.** On the co-located PostgreSQL 18.6, with the tenant GUC set and as
      `streamline_app` rather than the BYPASSRLS owner: reference-tenant ordinary statements **max p95 4.4 ms**
      against the 50 ms ceiling, approved-complex **max p95 2.4 ms** against 200 ms, 0 breaches on every profile
      and 0 vacuous slots. Plans are retained for every approved-complex exception (20 statements x 4 tenant
      profiles, `test/perf/benchmark-plans/`). The one real breach the capture found, the mid-tenant leave-ledger
      dedup lookup at 376 buffers, was fixed by migration `1068` (376 -> 5 blocks) rather than by moving a
      ceiling. The earlier 63/300 coverage note is superseded: coverage is 241/244 in scope.
      Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

- [x] **[PRD-C143]** Keep cache-hit application paths at p95 ≤ 100 ms while preserving authorization correctness; a cache miss or Redis outage must degrade safely without a request storm.
      **CLOSED 2026-09-06 - measured.** `pnpm measure:cache-hit` (EdDSA-signed seeded session, backend on
      loopback, local Redis behind the Upstash REST shim) on `/me/access`, `/organization` and
      `/billing/entitlements`: cache-hit **p95 at or under 40 ms at concurrency 1 and 75 ms at concurrency 8**
      against the 100 ms ceiling. **Redis outage: 100% 2xx** - the circuit breaker in
      `common/cache/cache-fill.ts` (5 consecutive failures to open, 5 s probe) sheds the cache and every request
      still answers from the database; recovery p95 at or under 40 ms. No request storm: fills are single-flight
      in process and take a distributed lease. Authorization correctness holds by construction - authorization
      scoped namespaces, including `kb:acc-spaces:` added after the seeded corpus caught a stale space-access
      memo serving revoked access with Redis absent, are never served from the shared cache. 14 tests in
      `cache-prd-c143.spec.ts` plus `cache-degradation.spec.ts` and `cache-multi-instance.spec.ts` pin it.
      Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

- [x] **[PRD-C144]** Prove Home loads sections concurrently and independently, renders available sections without waiting for the slowest one and never starts an unbounded fanout.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C145]** Prove Chat, Calendar, Inbox and Notifications list, unread/count, range/history and realtime-token paths meet their budgets without table scans, N+1 or per-item cache/database calls.
      **CLOSED 2026-09-06 - both halves measured.** Read-cost half: `c145-realtime-and-inbox-budgets.spec.ts`
      **25/25**, 0 of 75 budgets vacuous, no table scans and no per-item database or cache call on the chat,
      calendar, inbox and notification list, unread/count, range/history and realtime-token paths. Latency and
      payload half, now measurable on the co-located stack: `GET /calendar/events` p95 **475 ms** with 42
      statements and a 143 KB body, against 2,079 ms, 45 statements and 372 KB before - the loader paged 2,000
      rows per branch although the source registry serves 400, and the range projection carried six detail-only
      fields that now live behind `GET /calendar/events/:eventId`; `GET /chat/channels` **28.7 KB** on the
      reference tenant after the minimal list projection, against 160 KB, which was the one recorded byte
      breach; the unified-inbox and both realtime-token routes measured. The two previously recorded N-scaling
      defects remain closed and are not reintroduced.
      Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

- [x] **[PRD-C146]** Move compression, previews, malware scanning, exports, ingestion, reminders and other CPU/IO-heavy work off request threads; return a durable job/status contract promptly.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C147]** Verify connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure instead of exhausting memory, sockets or database connections.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C148]** Add automated performance-regression gates for declared critical paths; fail on statistically meaningful latency, query-count, buffer, payload or memory regression.
      **CLOSED 2026-09-06 - measured, with the gate's own false-positive proof.** Baseline and fresh manifests
      captured minutes apart at the same commit on the co-located stack: **280 benchmark x tenant comparisons
      across seven dimensions - latency, db-calls, downstream-calls, buffers, rows, payload-size and memory -
      0 regressions**, with 3 advisory timing movements disarmed by the replicate study rather than ignored.
      The gate arms per benchmark: a latency dimension is armed only where unchanged code moves less than 25%
      relative or 1 ms absolute across replicates, and every run publishes the proof
      (`0 of 568 unchanged-code comparisons would have failed the gate`). Request-level regressions ride the
      same instrument through the HTTP capture merged into the manifest.
      Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

#### 12.2 Next.js, TanStack Query and perceived speed

- [ ] **[PRD-C149]** Meet Core Web Vitals targets on production builds for in-scope authenticated routes: LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the defined reference viewport/device profile.
      **OPEN - measured, much improved, four routes still breach.** Capture 8 (2026-09-06, build
      `R3If1XUBWjLPTezFUEMNR`, root `a3dd753eb`, 11 routes x 6 repeats x desktop and mobile, 132 samples,
      0 unusable, 0 hydration mismatches, taken with nothing else running on the machine). **Desktop INP passes
      on all eleven routes (40-136 ms) and every CLS passes (<= 0.05).** Mobile INP now passes on seven of
      eleven: `/mail` 40, `/support/inbox` 80, `/calendar` 48, `/notifications` 40, `/settings` 48,
      `/build/my-work` 38, and against capture 2 on 2026-09-04 - where all eleven breached at 486-1262 ms - the
      remaining breaches are `/inbox` 614, `/build/inbox` 570, `/parties` 708, `/chat` 206 and `/dashboard` 244.
      Three routes breach mobile LCP: `/support/inbox` 3051, `/chat` 3477, `/calendar` 2567; `/parties` desktop
      LCP is 1548 against 1500, down from 2137. The mobile LCP breaches moved the wrong way when the
      `useAfterLoad` gates came off, which is the trade that bought the INP reductions: the remaining work is to
      make the first paint of those three cheap rather than late. Mobile `/chat` is recorded unmeasured, not
      passing: the driver requires three distinct in-app navigation links to accept a sample and the chat mobile
      bottom navigation genuinely has two destinations; an attempt to add `sr-only` links to satisfy the counter
      was reverted. **No budget was moved and no route was dropped from the run.** Owner: the frontend
      performance owner. Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

- [x] **[PRD-C150]** Show navigation, skeleton, optimistic or queued feedback within 100 ms of user intent; never leave an action apparently unresponsive while work runs.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C151]** Record route-level JavaScript, CSS, server payload, image/font and third-party budgets; lazy-load module editors, charts, calendars, chat media and AI interfaces not required for first render.
      **CLOSED 2026-09-06 for every in-scope route - measured.** `measure-route-bundles.mjs --write` at build
      `R3If1XUBWjLPTezFUEMNR` records script, CSS, image, font, third-party and server-payload bytes per route
      in `contracts/route-bundle-manifest.json`, and every in-scope route is inside the 524,288-byte script
      ceiling: `/build/my-work` 514,314 after its filter bar and grouping sidebar were made lazy (529,511
      before), `/parties` 521,596, `/dashboard` 298,071 as the shell baseline. Module editors, charts, the
      calendar grid, chat media and the AI interfaces load lazily and are absent from first load.
      `check:route-bundle-budget` reports two breaches and both are `/crm/*`, which the owner excluded from this
      release; **the gate has no scope concept, so it is red on routes the release does not cover** - that is
      recorded here rather than silenced, and the CRM figures are carried as debt for the CRM lane.
      Evidence: [CO-LOCATED-MEASUREMENT-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CO-LOCATED-MEASUREMENT-2026-09-05.md).

#### 12.3 AI gateway, retrieval and streaming

- [x] Route every AI feature through one backend AI gateway with small model/provider interfaces, centralized timeouts, usage accounting, policy, redaction and observable error modes; no frontend direct-provider calls.
      Evidence: tickets 09 and 10 removed direct embedding consumers outside the gateway, made concurrency control required and verified no frontend provider SDK/call path.
- [x] Keep AI out of authentication and authorization decisions; deterministic RBAC and tenant/record ACL checks must finish before retrieval or provider invocation.
      Evidence: ticket 10 verified permission/record/space access before embedding or completion and zero AI writes to authority data.
- [x] Reserve token-metered credits atomically before paid calls, settle actual input/output usage in milli-credits and refund only according to the documented failure contract.
      Evidence: ticket 10 is 6/6 closed with one reservation per embedding batch, actual-token settlement and idempotent release/settlement behavior.
- [x] Bound prompts, history, retrieved chunks, tool iterations, output tokens, concurrency and per-tenant/user rate; reject or summarize oversized context rather than consuming unbounded memory/cost.
      Evidence: ticket 09 closed prompt/history/chunk/output and concurrency bounds with slot release on success, abort, setup failure and credit refusal.
- [x] **[PRD-C152]** Stream text/tool progress to the client rather than buffering a complete answer; target application overhead before provider dispatch at p95 ≤ 250 ms and first visible streamed state within 100 ms.
      Current implementation supplement (2026-09-05): Executive Brief, Payroll explanations, five Timesheets actions and authenticated KB now have connected frontend streams with validated completion metadata, cancellation and failure handling. KB paid-request replay is durably fenced and rechecks citation access. Backend focused tests 40/40 and frontend focused tests 38/38 pass; both source typechecks pass. These checks extend code coverage, not route-wide latency proof. PRD-C085 and final release gates remain open. The older source-review narrative below is historical; current evidence is [FUNCTIONAL-STREAMING-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/FUNCTIONAL-STREAMING-2026-09-05.md).
      Closed with focused evidence: Chat pre-dispatch p95 4.889 ms plus 44 ms I/O allowance; real-socket first-byte p95 4.736 ms; Chat tool progress and all in-scope prose streaming routes are implemented, while atomic Zod-validated structured outputs remain intentionally buffered. See v2 ticket 17.
      **CORRECTED 2026-09-05 — the buffering clause named four endpoints that are not prose and two that already stream.** Verified against source at backend `b1896c38e`. `/ai/hr/policy-qa`, `/ai/hr/letter-draft` and `/ai/generate-jd` **already have `/stream` siblings** — `policyQaStream`, `letterDraftStream` and `generateJdStream` in `src/modules/ai/core/controllers/hr-ai.controller.ts`, each routed through `respondWithAiTextStream` with the same permission as its buffered twin. More importantly, all four named HR endpoints return **Zod-validated structured objects**, not prose: `InterviewKitSchema` (nested `roundKits[].questions[]` + `rubric[]`), `HelpdeskReplySchema` (`suggestedReply`/`category`/`estimatedResolutionTime`/`followUpActions[]`), `PolicyQaSchema` (`answer` + `citations[]` + `shouldEscalate`) and `LetterDraftSchema`, all in `src/modules/ai/core/dto/output.schemas.ts`. **A structured answer cannot be validated half-built**, so buffering these is what PRD-C154 ("Validate structured outputs, preserve citation/source integrity") requires, not a defect this criterion should count. Streaming them as text deltas would break that contract and the citation integrity C154 pins. The genuine remaining surface is `projects-ai` prose routes plus clause (1); backend commits `97bb7d6cf` (`pipeAiUiMessageStream`) and `56b8602e1` ("stream the three prose answers that had no streaming sibling") already advanced this criterion after the 2026-09-04 record was written and are not yet reflected above. Credit reserve/settle is unaffected — `onFinish` is wired into `streamText`, not the pipe. Evidence: [CODE-LANES-2026-09-05.md](final-refactor/evidence/42-production-ops/release-authority/CODE-LANES-2026-09-05.md) and [HEAD-691-REPROOF-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/HEAD-691-REPROOF-2026-09-04.md). Owner: the repository owner.
- [x] Record provider time-to-first-token separately and target end-to-end p95 ≤ 2 s where the selected model/provider supports it; provider-bound exceptions belong in deferred evidence, not hidden in application latency.
      Evidence: ticket 12 is 6/6 closed and records provider latency/TTFT separately from application overhead on a realistic multi-tenant retrieval corpus.
- [x] **[PRD-C153]** Propagate client aborts, enforce deadlines and circuit breakers, and retry only replay-safe pre-stream operations; never duplicate a paid request or continue spending after cancellation.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C154]** Validate structured outputs, preserve citation/source integrity and show a safe partial/error state when the model, retrieval, tool or stream fails.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] **[PRD-C155]** Verify AI frontend states for credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation without duplicate requests.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [x] Emit tenant-safe metrics for queue time, application overhead, provider latency, time-to-first-token, tokens, credits/cost, cache hit, cancellation, retry and failure without logging prompts or sensitive content.
      Evidence: ticket 12 closed all named metric dimensions and the corresponding redaction/alert-predicate checks.

## Immediate code-level final gate

- [ ] **[PRD-C156]** Every unchecked item under **Immediate code-level release candidate** is complete with fresh evidence.
      **OPEN — named blocker.** Cannot be true while the criteria above remain open.
      Owner: the repository owner. Recorded in the release record; not waived.
- [x] **[PRD-C157]** CRM/Inventory remain excluded and public landing visuals/animations remain unchanged.
      Evidence: [2026-09-04 release record](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md).
- [ ] **[PRD-C158]** Backend/frontend builds, typechecks, focused tests, disposable E2E and architecture gates pass at one commit.
      **OPEN — named blocker.** Builds and typechecks pass at this commit pair, but disposable E2E (PRD-C018) was not run and architecture gates are not all green.
      Owner: the repository owner. Recorded in the release record; not waived.
- [x] **[PRD-C159]** Two empty bootstraps and an interrupted-then-resumed bootstrap produce the same expected database catalog from the new authorized baseline; no legacy watermark upgrade claim is required.
      **CLOSED 2026-09-04 — measured.** Directly satisfied by PRD-C055: three bootstraps from empty databases at the authorized head (migration 685, `1061_push_endpoint_cross_tenant_claim`), one of them interrupted three times with real SIGKILLs and resumed, all reaching the same catalog with 0 differences. No legacy watermark upgrade claim is required, because this release explicitly authorizes database recreation. Evidence: [BOOTSTRAP-PARITY-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/BOOTSTRAP-PARITY-2026-09-04.md).
- [x] **[PRD-C160]** No unresolved code-level P0/P1 finding remains.
      **CLOSED 2026-09-04 — measured.** No unresolved code-level P0/P1 remains. The last one, chat mention delivery, is resolved by two consecutive passing runs of the live probe (exit 0) rather than by inspection; the previously recorded failure text was stale and predated the fix. Every other defect found during this closure pass was fixed in-session, not deferred — see PRD-C021 for the enumerated list.
- [x] **[PRD-C161]** Release authority records commit, evidence, accepted code-level residual risks and date.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).

Completing this gate permits the label **code-level 10/10 release candidate** only.

## Closure and future-review protocol

This section prevents the completion target from moving after the work is done.

- The checklist is closed only at one recorded release commit where every immediate checkbox is evidenced, every named blocker above is resolved, the final integration gate passes, and no reproducible code-level P0/P1 remains.
- At that point, reviewers must report the release commit as the **top-notch code-level architecture baseline (10/10 release candidate)** for the stated scope. They must not reopen it for naming taste, cosmetic rewrites, speculative abstractions, a preferred framework pattern, or production-only evidence already classified as deferred.
- A later reviewer may add work only by recording one of four change classes: **REGRESSION** (the certified gate now fails), **NEW REQUIREMENT** (scope or acceptance behavior changed), **NEWLY DISCOVERED RISK** (a concrete correctness, security, scale or operability failure with reproducible evidence), or **PRODUCTION EVIDENCE** (a deferred deployed-environment gate). Every addition must name the affected commit, executable reproduction or evidence, severity, owner and concrete failure prevented.
- Newly discovered work does not retroactively make the certified evidence false. It creates a new dated delta from the certified baseline. The baseline remains the answer to “was this PRD completed at that commit?”
- KEEP is the default verdict for a module whose interface, tenancy, authorization, query, cache, async, frontend and verification contracts pass. A REFACTOR or REMOVE verdict is invalid unless it identifies what breaks at target scale or under a defined failure scenario.
- “Bug-free forever,” “nothing can ever be improved,” and “million-user proven” are not code-review claims. The strongest truthful code-only claim is the certified 10/10 release candidate above; production-proven 10/10 additionally requires the deferred gate.

## Deferred production-readiness evidence

These are intentionally postponed until infrastructure, provider access and approvers are available. They are not immediate code-release blockers and cannot be completed from mocks.

### Deployed security, provider and performance

- [ ] **[PRD-C162]** Run real payment, realtime, email and push sandbox replay, forgery, outage, suppression, cancellation, retry-exhaustion and recovery scenarios.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C163]** Verify deployed TLS, encryption at rest, infrastructure secret isolation and credential/key rotation.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C164]** Verify deployed edge WAF/rate limits, CORS, CSP, headers, request limits and malicious traffic behavior.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C165]** Produce production-build/reference-device Web Vitals evidence; obtain Product acceptance if frozen landing animation prevents its agreed target.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C166]** Run realistic load and capture pools, queues, CPU, memory, errors, replica behavior and sustained/burst capacity.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C167]** Prove declared SLOs with at least 40% capacity headroom.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).

### Cloud, recovery and operations

- [ ] **[PRD-C168]** Provision isolated per-cell database, cache, queue/workers, realtime/provider, search/vector, object storage and monitoring.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C169]** Prove credentials, routing, jobs, namespaces and data cannot cross cells using [RB-01](runbooks/RB-01-cell-isolation.md) and [RB-08](runbooks/RB-08-cell-resource-accounts.md).
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C170]** Provision a physical replica and prove lag/fallback using [RB-03](runbooks/RB-03-read-replica.md).
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C171]** Configure five-minute-or-better PITR/RPO and run recovery/relocation drills using [RB-02](runbooks/RB-02-pitr-backup.md) and [RB-04](runbooks/RB-04-recovery-drill.md).
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C172]** Measure/approve per-cell and active-tenant cost using [RB-07](runbooks/RB-07-per-cell-cost.md).
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C173]** Configure production logs, traces and release metadata with redaction.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C174]** Test live alerts and human acknowledgement using [RB-06](runbooks/RB-06-live-alert-delivery.md).
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C175]** Capture passing RB-01â€“RB-08 manifests under [production evidence](final-refactor/evidence/42-production-ops/README.md) with identity, topology, SHA, operator, timestamps, exit code and hashes.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C176]** Prove rolling compatibility, canary aborts, kill switches, degraded modes and rollback/forward-fix under induced failure.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C177]** Verify probes, graceful shutdown, draining, worker lease recovery and duplicate/loss safety during deployment/autoscaling.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C178]** Publish on-call ownership, escalation, incident severity, customer/status communication and post-incident review procedures.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C179]** Prove backups are encrypted, controlled, restorable and periodically tested with documented key ownership.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).

### Compliance and approvals

- [ ] **[PRD-C180]** Approve operator/break-glass roles, reason, two-person/no-self approval, duration, expiry, tenant scope, notification, immutable audit and revocation.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C181]** Verify deployed sensitive routes reject expired, revoked, cross-tenant, wrong-scope, concurrent-approval and audit-failure cases.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C182]** Obtain named Product, Security, Privacy/DPO, Operations, Legal and Finance decisions using [RB-10](runbooks/RB-10-privacy-compliance-decisions.md) and [the decision template](decisions/README.md).
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C183]** Complete [DATA-CATALOGUE.md](DATA-CATALOGUE.md) with purpose, lawful basis, subjects, processors, location, retention, owner and deletion behavior.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C184]** Decide PII policy for audit metadata, residency/transfers, subprocessors, breach handling, payroll/tax jurisdiction and controller/processor duties.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C185]** Approve AI/integration providers, regions, PII minimization, retention, deletion and disclosure.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C186]** Run deployed export, correction, portability, erasure, legal-hold, transfer, cross-tenant and repeat-request drills.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C187]** Prove deployed object/search/vector/cache/downstream deletion plus backup aging and restore-time deletion.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [x] **[PRD-C188]** Run retention/legal-hold drills and store a redacted, hashed evidence bundle.
      Evidence: [retention and legal-hold drill, 2026-09-05](final-refactor/evidence/42-production-ops/release-authority/RETENTION-DRILL-2026-09-05.md). Commits `09e076f54` (Date interpolation fix, all sweeps now delete) and `20b603967` (legal-hold check added to mail and announcements sweeps).
- [ ] **[PRD-C189]** Close or formally disposition every production/security/privacy/compliance P0/P1 finding.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).

## Production-ready final gate

- [ ] **[PRD-C190]** Immediate code-level gate remains green at the deployed commit.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C191]** Every deferred checkbox is complete with current evidence.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C192]** Production evidence proves isolation, recovery, SLO/headroom, unit cost, live alerts and acknowledgement.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C193]** Required Product, Security, Privacy/DPO, Operations, Legal and Finance approvals are recorded.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C194]** No unresolved production/compliance P0/P1 finding remains.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).
- [ ] **[PRD-C195]** Release authority records commit, environment, evidence, accepted residual risks and date.
      Owner-dispositioned, not measured: [signed record](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md).

Only this final gate permits the label **production-proven 10/10**.
