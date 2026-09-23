# HRMS Execution Ledger

## Authority

This is the only mutable scheduler for the HRMS People program. The numbered
HRM-00 through HRM-15 documents are the normative acceptance library; their
346 open checkboxes are program-level roll-ups, not agent assignments. Never
send one of those broad checkboxes to an implementation agent.

The old README's 34 duplicate parent/phase boxes were removed from the work
count when it became this scheduler. The current source baseline contains 165 authenticated HR, Directory, `/me`,
and Payroll page files plus the `/employee-onboarding` gate (166 accounted page
files), 174 HR/Directory/Payroll controllers, and 96 schema files. Generated
censuses supersede these snapshot counts when source changes.

Use the system in this order:

1. Read the product contract in [product-blueprint-prd.md](./product-blueprint-prd.md).
2. Select one `READY` child from [work-packets.md](./work-packets.md).
3. Expand its planning boundary to an exact, non-overlapping write set and
   record the reservation below.
4. Give the agent only its capsule, exact acceptance text, source files, test
   files, and literal focused commands using [agent-runbook.md](./agent-runbook.md).
5. Review the actual diff and evidence, broker shared changes, then update this
   ledger. Only a release packet rolls evidence into old HRM checkboxes.

Repository `CLAUDE.md` files override this guide. Agents do not use Git, edit
trackers, run full suites, or expand their own file ownership. The coordinator
owns integration, shared-file arbitration, heavy tests, and commits.

## Status Model

| Status | Meaning |
|---|---|
| `BLOCKED` | A named dependency, decision, environment, or file collision prevents work |
| `READY` | Bounded outcome and current contract are sufficient to start |
| `RESERVED` | One agent owns the recorded exact write set until expiry |
| `CODE_COMPLETE` | Code and permitted focused source/unit/contract checks pass |
| `INTEGRATED` | Coordinator reviewed the diff and reconciled shared contracts |
| `EVIDENCE_PENDING` | Integrated code awaits real DB, browser, provider, deployed, or human proof |
| `DONE` | All evidence tiers required by the packet are accepted |

`CODE_COMPLETE` is the normal successful result for a browserless agent. It is
not relabelled `DONE`; browser and real-database proof belong to separate
verification packets.

## Packet Size and Split Gate

A runnable child has one observable outcome, normally 15–45 minutes of focused
work, two to five production files, direct tests, and one primary owner. Split
before assignment if it:

- says every/all/each without naming one generated inventory row;
- contains multiple independent endpoints, pages, forms, migrations, or defects;
- exceeds eight production files or three ownership roots;
- combines a shared contract change with leaf adoption;
- requires two agents to edit one file;
- mixes code with browser, deployed, human, or real-DB proof; or
- can be verified only by a whole-repository suite.

Catalog rows ending in `-*` are factories, not assignments. The coordinator
creates a child such as `HRM-X-BE-LEAVE-LIST-001` for one controller operation
or `HRM-X-FE-EMPLOYEES-SEARCH-001` for one page outcome.

## Parallelism Rules

- Default for this laptop: one coordinator plus two code agents. Add a third
  only after observed memory/test headroom; do not confuse agent count with
  throughput.
- There is no global census or Wave 0 barrier. Route, form, API, schema, and nav
  snapshots are independent. A leaf preserving current public contracts is
  runnable now.
- Shared route/access manifests, sidebar catalogs, permission catalogs, query
  key factories, cache/auth primitives, design tokens, schema barrels, module
  registration, migration journals, generated contracts, `PAGES.md`, and this
  ledger are coordinator-only unless one shared-seam packet reserves them.
- One migration/DB writer at a time. A migration child owns one schema slice,
  one hand-written migration, and its direct integrity tests.
- Focused tests may overlap only when they do not share mutable fixtures.
  Builds, whole-side typechecks, generated contracts, migration application,
  seeded database suites, and browser suites run serially.
- A leaf needing a forbidden shared edit submits the exact requested contract
  change and continues only its independent work. It never creates a private
  duplicate schema, permission, component, or cache key.
- A collision, contract mismatch, missing named environment, or two failed
  repair hypotheses is a stop condition.

## Reservation Ledger

Only the coordinator edits this table. Directory globs in the packet catalog
are planning boundaries, not write permission.

| Packet | Owner/session | Root revision | Backend revision | Exact write set | Acquired | Expires | Status |
|---|---|---|---|---|---|---|---|
| _none_ | | | | | | | |

Reclaim only after confirming the previous agent is idle and reviewing any
surviving diff. Never use reset or checkout to reclaim user work.

## Ready Pool

These are deliberately more numerous than the two code slots. Start disjoint
work immediately; census completion is required for final coverage, not for an
unrelated leaf.

| Lane | Packet | Initial status | Dependency boundary |
|---|---|---|---|
| Product | `HRM-X-DEC-001` | `DONE` | D01–D14 and blueprint reconciled |
| Snapshot | `HRM-X-CENSUS-ROUTES-001` | `READY` | Route files/snapshot output only |
| Snapshot | `HRM-X-CENSUS-FORMS-001` | `READY` | Mutation surfaces/schema ownership only |
| Snapshot | `HRM-X-CENSUS-API-001` | `READY` | Controller-operation inventory only |
| Snapshot | `HRM-X-CENSUS-SCHEMA-001` | `READY` | Schema/table inventory only |
| Snapshot | `HRM-X-CENSUS-NAV-001` | `READY` | Sidebar/link destination inventory only |
| Shared seam | `HRM-X-SEAM-ROUTE-001` | `READY` | Route/access/back contracts only |
| Shared seam | `HRM-X-SEAM-PERM-001` | `READY` | Permission aliases/catalogs only |
| Shared seam | `HRM-X-SEAM-CONTRACT-001` | `READY` | Request/response/filter/cursor vocabulary only |
| Shared seam | `HRM-X-SEAM-QUERY-001` | `READY` | Query keys/cache invalidation primitives only |
| Shared seam | `HRM-X-SEAM-UI-001` | `READY` | Surface tokens/shared collection primitives only |
| Backend leaf | `HRM-X-BE-PEOPLE-*` | `READY` | Current contract; one operation at a time |
| Backend leaf | `HRM-X-BE-TIME-*` | `READY` | Current contract; one operation at a time |
| Backend leaf | `HRM-X-BE-LEAVE-*` | `READY` | Current contract; one operation at a time |
| Backend leaf | `HRM-X-BE-EXPERIENCE-*` | `READY` | Current contract; one operation at a time |
| Backend leaf | `HRM-X-BE-OPS-*` | `READY` | Current contract; one operation at a time |
| Backend leaf | `HRM-X-BE-PAYROLL-*` | `READY` | Current contract; one operation at a time |
| Frontend leaf | `HRM-X-FE-PAGE-*` | `READY` | One catalog row; waits only for changed API fields |
| Frontend leaf | `HRM-X-FE-FORM-*` | `READY` | One mutation form; shared schema read-only |

The canonical child factories, ownership boundaries, negative cases, and
verification commands are in [work-packets.md](./work-packets.md).

## External Evidence Queue

| Family | Required environment | Output |
|---|---|---|
| `HRM-X-DB-*` | Named disposable Postgres database | migration/recovery, constraints, RLS/isolation, query plans |
| `HRM-X-PW-*` | Browser-capable session at fixed revisions | routes/history, focus, keyboard, responsive, contrast, touch |
| `HRM-X-PROVIDER-*` | Named payroll/benefits/device sandbox | retry, idempotency, revocation, reconciliation |
| `HRM-X-DEPLOY-*` | Production-like deployment | telemetry, alerts, rollback, scale and soak evidence |
| `HRM-X-SIGNOFF-*` | Product, legal/privacy, payroll, security, accessibility owners | explicit release decisions |

Browserless agents may author deterministic journeys and fixtures, but
executing them remains an evidence packet.

## Completion and Roll-up

A parent HRM criterion closes only when every applicable generated row is
covered at its required evidence tier. Passing types or mocks never proves a
customer journey, tenant isolation, query plan, migration, or accessibility.
The release packet fixes one frontend/backend revision pair and records exact
commands, exit codes, assertions, environments, residual risk, and rollback.

Coverage routing is in [requirement-map.md](./requirement-map.md), small reading
sets are in [context-capsules.md](./context-capsules.md), and the concrete
coordinator workflow is in [parallel-agent-guide.md](./parallel-agent-guide.md).
