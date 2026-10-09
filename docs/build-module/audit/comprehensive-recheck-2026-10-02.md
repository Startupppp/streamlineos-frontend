# Comprehensive Build specification recheck — 2026-10-02

Status: documentation checks Current verified on source revision `a5b8347fb`; application behavior Current unverified unless a linked gate says otherwise. Planned, Conditional, and Deferred retain their meanings in the [architecture vocabulary](../architecture/08-deep-module-reconciliation.md).

## Current completion and standards audit — 2026-10-07

**Decision: completion cannot be confirmed.** This current audit supplements the historical entries below. Root source revision is `84588c78915f4996c0ccc53691007c137ff05b37`; backend source revision is `5e6277e7678ce6af6dc383e1a16fedf71ce179aa`. Both Git working trees were clean before the documentation-only audit claim. Neither implementation presence nor checked documentation is proof that all customer journeys work.

### Requested confirmations

| Requested confirmation | Current result | Evidence and limitation |
|---|---|---|
| All implementation is complete and working | Cannot confirm | Actual BT rows total 535: 298 checked, 237 open. These include documentation tasks; checked does not mean every product feature has runtime proof. Initial index freshness failed and official regeneration repaired it without closing tasks. |
| All backend code follows both repositories' CLAUDE rules | Cannot confirm | Backend Build lint fails, the backend size gate fails, growing-query and attributable-denial-test ratchets fail. Several narrower source gates pass. |
| Completed Markdown can be deleted | Conditional | No document qualifies for deletion merely because its checklist is checked. Canonical specs, acceptance criteria, ownership, research and runtime evidence remain needed. Exact duplicates or superseded documents require reference/hash/unique-content checks and a cleanup receipt. No Markdown was deleted in this audit. |

### Scope actually examined

Source inventory reads found 1,278 files/206,269 lines under `frontend/features/build`, 222 files/27,790 lines under `frontend/hooks/api/build`, 1,357 files/66,360 lines under `frontend/app`, 911 files/145,381 lines under `backend/src/modules/build`, and 444 files/53,314 lines under `backend/src/db/schema`. These are directory inventories including tests, not counts of individually reviewed implementations. Current rule files, tracker, ledger, claims, architecture registry and existing cleanup/audit authorities were consulted. Targeted semantic inspection covered shared URL filters, Feedbucket search, attachment preview effects, import transactions/publication, ticket creation publication, and visual values flagged by lint. Whole-folder lint and named repository scans provide wider mechanical coverage. **An exhaustive semantic review of every file and endpoint has not been completed.**

### Confirmed failures and next changes

| Priority | Finding | Exact location or command | Required correction/proof |
|---|---|---|---|
| High | Authorization negative-test attribution regressed | `pnpm -C backend check:authz-deny`: 1,518 unproved gated handlers versus ratchet 1,508; 2,168/3,686 have attributable declared denial tests | Attribute and execute meaningful positive/negative controller tests, then physical role/tenant flows. Build examples include Approvals, dashboard layout, automation policy/replay, landing preference and All Work IDs. Missing attribution is not itself a demonstrated authorization bypass. |
| High | Growing per-row round trips exceed the ratchet | `pnpm -C backend check:n1-growing-loops`: 101 sites/83 files versus ratchet 100; 4,557 files parsed | Review reported loops, batch tenant-data reads/writes while preserving per-row semantics. Verify actual query counts and plans before claiming every API optimized. |
| Medium | URL/prop values mirrored into state by effects | `frontend/features/build/shared/use-build-list-filters.ts:125`–143; `frontend/features/build/feedbucket/submission-inbox-filters.tsx:100`–109 | Current FE-138 forbids this even when hidden behind `startTransition`/a reducer. Use existing source-override/reset conventions and debounce ownership. Preserve Back/Forward, pending Clear, cursor reset and stale-write prevention; test consumers and browser before handoff. Exact two-file ESLint currently exits 0, demonstrating that this rule also requires semantic review. |
| Medium | Build frontend lint fails with 17 errors | `pnpm -C frontend exec eslint features/build hooks/api/build --quiet` | Fix existing components' typography/status tokens and test import/unused-symbol errors. Do not add exclusions. Locations include timeline section:265, project template:91/100, time-budget section:54/55/57, Git connection:111, Slack connection:54, portal/product/board test imports, and publish-preview bad-path test:32. |
| Medium | Build backend lint fails with four errors | `reports-filter-envelope.spec.ts:224`, `build-automation-trigger-consumer.spec.ts:396`, `build-actor-migration.spec.ts:253` | Replace forbidden `require` imports and two `any` usages with existing typed test conventions, retaining assertions. |
| Medium | Backend size rule fails | `pnpm -C backend check:file-sizes`: 45 files exceed 500 lines | Build examples: roadmap service 568, apply-ticket-change 527, tickets-read service 516, intake service 516, timesheets service 579, managed-products service 611. Split only at real domain seams; preserve all callers and behavior. This is a maintainability violation, not proof those APIs fail at runtime. |
| Medium | Frontend size/ratchet gates fail | `check:over-300`: 624 versus 614; `check:file-sizes` reports ten stale exception records | Remove only verified stale exemptions for files now below the limit; review growth at a baseline before any registry adjustment. Never raise a ratchet to get green. |
| Medium | Frontend size self-test fails its corpus floor | `frontend/scripts/check-file-sizes.mjs:62` and `:541`: 5,200 is below 60% of the measured 8,796-file corpus | Review the anti-vacuity floor and directory coverage; retain the self-test's intent. Normal scan also reports 7,723 scanned and 1,073 excluded, so scope must stay explicit. |
| Resolved in this audit | Generated TODO index was stale | Initial `pnpm check:build-doc-todos` exited 1; zero missing delivery checklists | Official regeneration repairs source anchors; all 535 task IDs/text/status/stages/evidence remain unchanged. No completion inferred from regeneration. |

### Current verified bounded checks

Self-tests and normal checks pass for backend strict-input baseline (345 non-strict calls retained in the baseline across 78 scanned DTO files), critical idempotency coverage (128 handlers: 123 fenced, five explicitly excluded), tenant-leading index declarations (957 tenant tables/428 schema files), cache-key resolver coverage (5,691 files, 129 factory shapes), and module registration (267/267 reachable modules). The strict-input baseline pass is not a claim that every schema is strict. Index declarations do not prove applied physical indexes or efficient plans. Cache-key resolver coverage does not prove invalidation behavior or isolation for every key.

Frontend route-access binding passes (220 checked keys/654 contract permissions), permission catalog parity passes (772 keys), contract vendor parity passes, and Build contract self-test/freshness passes (93 self-test cases, 417 generated schemas, 331 hook-called operations). Backend route-duplicate self-test/normal scan pass with zero duplicate operation IDs and zero ambiguous parameter routes, while reporting two version sibling observations for Users. No claim of a duplicate-route bug follows from those informational observations.

The existing two frontend filter suites pass **40 tests**. The initial invocation used an incorrect `.test.ts` suffix for the shared filter suite and failed to locate it; the corrected `.test.tsx` invocation runs both actual suites successfully. Existing backend ticket-import service/access suites pass **26 tests**. No assertion or production code was changed. Backend production `pnpm typecheck` and frontend production `pnpm type-check` both exit 0; Next route types generate successfully and report an Edge Runtime deprecation warning. Full test-inclusive TypeScript, every unit/integration suite, migration replay, query-plan measurement, performance sampling, provider delivery, and deployment parity are not proved by these results.

Official tracker regeneration passes freshness afterward. The first row comparison falsely reports a mismatch because the original uses CRLF and the generator writes LF. After normalizing line endings and excluding source-line anchors, all 535 IDs, task texts, checkbox states, stages and evidence cells match HEAD. Generated source-line anchors now point to the current documents. Preserve the generator-removed unique index note here: "Desktop Chrome wave2 browser marks (honest, REVIEW-7 only): see evidence `sos-evidence/desktop/TRACKER.md` — theme, create-issue bad paths, wizard dirty, 375 FAB, list labels, ticket title, nonsense 404. Invites/portal not marked." This is an inherited claim/reference, not newly verified browser evidence; that relative path is absent in this checkout and must be resolved before relying on it.

### Remaining proof and safe implementation order

Keep D/I/T/R/B/L separate for each BT row. Browser/mobile flows, actual persisted writes, allow/deny cases for all six standings and clients, cross-tenant 404 controls, retry/concurrency, cache/outbox effects and deployed operational proof require current matching evidence. No browser or database mutation was performed in this audit. Historic receipts remain historic.

First repair the current build/lint/security-test/query gates with disjoint file claims. Next resolve the filter effect semantics using existing helpers and targeted tests. Then verify the critical activation sequence (invitation acceptance → module assignment → client grant), followed by project/ticket/intake/client flows and responsive/error/history states. Optimize queries only against measured counts/plans; do not rewrite a working service simply because a different design looks preferable. Defer cosmetic redesign until these flows and authorization boundaries have a stable baseline.

No code, schema, API, permission key, component, test, generated contract or task status was edited. This report is a current defect/evidence inventory, not a release certificate or an exhaustive file-by-file completion claim.

## Cross-check ledger

| Scope checked | Authority and reconciliation | Result and remaining proof |
|---|---|---|
| Approved architecture HTML | The 16 recommendations in the local `architecture-review-20261002-184500.html` map to [ARC-01–16](../architecture/08-deep-module-reconciliation.md), [17 work packages](../implementation/18-architecture-work-package-registry.md), and six access layers. The report's 26 product areas map to the package registry. | Documentation covered. Recommendation strength and source findings are not deployment proof. Each package requires its own migration and operational evidence. |
| Horizontal behavior | [Complete behavior matrix](../implementation/19-complete-surface-behavior-matrix.md) covers 17 universal behaviors, 15 Ticket capabilities, and Intake, activation, and portal journeys. | Documentation covered. For every record family an implementation claim must adopt, reject with reason, or defer each behavior; route rendering cannot close it. |
| Current Build routes | The source has 75 `frontend/app/(authenticated)/build/**/page.tsx` pages. [Route decisions](../experience/routes-and-screen-decisions.md) list all 75 once, including `/build`. | Documentation covered. Six proposed/compatibility destinations require implementation and route tests. Program detail was added because the list had no stable direct detail route. |
| External portal routes | The source has `/client-portal` and `/client-portal/[projectId]` under `frontend/app/(portal)`. [External portal screens](../experience/screens/external-client-portal.md) specify both plus conditional client views and negative access. | Current unverified source anchors. The project route uses partial numeric parsing and the detail component renders an attachment URL directly; strict full-ID validation and Files-mediated signed access must be proven before release. |
| Persona screens and UX | [Persona sidebar authority](../experience/02-personas-navigation-and-sidebars.md), [14 screen documents](../experience/screens/README.md), [shared behavior](../experience/screens/shared-screen-contract.md), and [field/filter catalog](../experience/06-ui-component-and-filter-system.md) cover freelancers, agencies, PM/PjM, engineering, content, client and executive work. | Planned contracts include fields, filters, actions, pane/page/dialog, return, mobile, states, permission and cache. Persona aliases are configured views, not duplicate records. |
| Signup and multi-module onboarding | [Onboarding](../onboarding/01-signup-and-multi-module-onboarding.md) and [activation screens](../experience/screens/activation.md) reconcile Workspace → Products → optional People, five default Build-only inputs, multiple selections, adaptive questions, custom field drafts, invitations, preview, resume and deterministic destination. | Planned. Cold invite → module standing → client grant remains the research priority. Six identity journeys require browser and persisted-state proof. |
| RBAC and external access | [RBAC authority](../governance/rbac/01-role-model-and-open-risks.md) and ARC-01 require Org Owner/Admin access to enabled modules; Org Member requires explicit module assignment; project/record/field policy still narrows access. Client requests and grants are separate. | Planned target and Current unverified source. Test each actor against module, project, record, query, command, file, cache, event, AI and portal seams. Preserve permission keys. |
| APIs, schemas, cache and architecture | [Architecture](../architecture/07-architecture-data-api-cache-ai.md), [screen data contracts](../architecture/screen-data-contracts.md), [deep modules](../architecture/08-deep-module-reconciliation.md), and [work packages](../implementation/18-architecture-work-package-registry.md) name owners, wire/Zod and database changes, indexes, cursor queries, outbox, revisions, idempotency, invalidation and migrations. | Planned contract, not a blanket assertion that every proposed HTTP path exists. Generated wire contract and source/controller parity must be checked at implementation time. |
| Research packs, bugs and WOW | [Research traceability](./research-traceability.md), [bug ledger](./bugs-and-verification.md), [original WOW crosswalk](./original-wow-research-crosswalk.md), and [100 prioritized customer-value themes](../product/customer-value-and-differentiation.md) keep the original 120 IDs separate from the new 100. | All 120 original rows mapped. Historical HAVE/VERIFIED is Current unverified for this revision. Three representative screenshots were visually inspected in this recheck; retained screenshot paths are inventoried, not all visually reverified. |
| Cross-module handoffs | [Ownership contract](../integrations/08-cross-module-client-content-commercial.md) assigns CRM, Accounting, Timesheets, Home and Files their records; Build owns contextual actions and safe return. | Planned. Invoice/payment, time approval, meeting calendar, customer account and file access need owner-module integration proof. |
| Agent coordination and cleanup | [Work claims](../implementation/WORK-CLAIMS.md), [coordination rules](../implementation/17-agent-coordination-and-work-ownership.md), and [cleanup manifest](./cleanup-manifest.md) prevent overlapping primary seams and preserve unique research/evidence. | 39 byte-identical research copies and seven redundant generated summaries were removed in the prior pass. This recheck added three canonical documents and deleted no additional research. |

## Corrections made in this recheck

1. Separated browser routes from API interfaces on specialized screens; `/build` is a landing redirect, Inbox is a Home notification projection, and Feedbucket URLs are read/redirect compatibility until migration.
2. Added external client portal page contracts and a stable Program detail destination. Added organization Budget and Reports compatibility destinations without inventing second data owners.
3. Filled the original WOW crosswalk including item 105, which was missed by the first pass. The 120 source items and 100 new value themes use different numbering.
4. Added a typed filter field/operator catalog and specified filtered-empty, saved-view, URL, export, dashboard and AI consistency.
5. Explicitly separated Member client-access requests from grants, protected Form New/Cancel from implicit server draft creation, and required portal publish preview and confirmation.
6. Corrected schema validation to reject unknown nested mutation keys, kept Ticket assignee canonicalization contingent on actual cardinality evidence, and required non-vacuous outbox/runtime registration checks.

## Remaining implementation and evidence risks

- No browser, database, network/console, real identity, client grant, mobile device, load, provider, payment, or deployment test was performed in this documentation recheck. The application cannot be called bug free from this result.
- Proposed routes, interfaces, schemas, and migrations are implementation work; an agent must inspect current controllers and existing permission keys before modifying code. Unsupported illustrative screen GET paths must never be generated mechanically from UI routes.
- The external portal's partial ID parsing and direct attachment URL are source-level audit findings, not a demonstrated exploit. File access and parameter validation need implementation and negative tenant/grant tests.
- `frontend/CLAUDE.md` and `backend/CLAUDE.md` both refer to a root `CLAUDE.md`, but no root file exists in this checkout. Agents must use the existing scoped files, accepted ADRs, `CONTEXT.md`, and Build authorities; do not assume missing root rules. Repair those references or establish a root instruction file as an explicit separate documentation decision before using it as a precedence source.
- 162 retained images are preserved in the research packs; only three representative images received visual inspection here. Do not present the rest as newly reviewed visual evidence.
- Full release remains gated by [delivery and release criteria](../delivery/09-delivery-roadmap-release-gates-and-positioning.md) and [RBAC evidence](../governance/rbac/01-role-model-and-open-risks.md), with the original priority order: invite acceptance, module assignment, client grant activation.

## Final start-readiness gate sample

On the current documentation checkout, the following bounded checks were run before recommending implementation. A passing self-test proves that a gate's own negative fixtures work; it does not make the normal gate pass.

| Check | Result | Start action |
|---|---|---|
| `pnpm check:build-execution-plan:self-test` | 5/5 passed | Keep the anti-vacuity fixtures. |
| `pnpm check:build-execution-plan` | Failed: requires seven files under removed `docs/specs/build` / `architecture-refactor` paths | Migrate the gate to canonical `docs/build-module` authorities and assert real route, requirement, package, claim, and screen coverage. Do not recreate obsolete summaries merely to satisfy text checks. |
| `pnpm check:route-census:self-test` | Passed | Retain its drift fixtures. |
| `pnpm check:route-census` | Failed: expected `docs/specs/build/generated/routes.snapshot.json` is absent; actual census reports 84 route patterns | Move the snapshot owner to the canonical Build audit/generated location, generate and review the snapshot, then rerun. This 84-pattern census is not the 75-page count; document the distinct units. |
| `pnpm -C frontend check:build-contracts:self-test` | 34/34 passed | Retain generated-schema anti-truncation and matching checks. |
| `pnpm -C frontend check:build-contracts` | Failed: `contracts/build-contracts.generated.ts` hash is stale against vendored OpenAPI | Under `ARCH-06-WIRE-CONTRACTS`, compare OpenAPI operations with current backend, regenerate through the prescribed generator, review the diff, and rerun parity checks. Do not hand-edit generated output. |
| `pnpm -C backend check:build-core-surface:self-test` and normal check | Both passed; normal check scanned 378 sibling files and 1,186 Build core-targeting specifiers with no reported boundary violations | Preserve this source boundary while implementing packages. Runtime registration and behavior require separate proof. |

The first implementation packet is therefore **contract/gate baseline**, followed by Module Access authority as a technical dependency and the three user-visible release priorities: invite acceptance, automatic Build assignment, and usable client grant. Gate repair and current-source inventory can run in separate non-overlapping claims; schema/migration ownership remains serialized.

## Repeatable documentation acceptance

Compare actual page files against the 75 existing route rows; count both external portal pages; require a contract for each proposed destination; compare all 120 original WOW IDs and 100 canonical value rows; validate every relative Markdown/image link; check 16 architecture IDs and 26 product areas; and run staged/unstaged whitespace checks. A green documentation check does not change the status of the application.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Verify six onboarding journeys and the invite → module standing → client grant priority path through browser, persisted state, role/tenant, and worker evidence.
- [ ] Resolve the documented portal ID/file-access, root instruction reference, and unsampled screenshot limitations with separate evidence before asserting release readiness.
