# 27 — Group the remaining Build core concepts

**What to build:** The last of the flat files find their concept homes — releases, webhooks, analytics and reports, members and customers, custom fields and states, activity and changelog, settings, notification context, budget and templates. Roughly 60 files. After this, Build core is a set of named concepts rather than a directory of peers.

**Blocked by:** 01 — Publish the Build core shared surface.

**Status:** done

- [x] No concept group remains flat at the top of Build core
- [x] Imports are updated; no file is orphaned
- [x] The import graph stays acyclic, per BE-10
- [x] Every route behaves identically and no logic changed
- [x] Module naming is consistent with the convention the sibling Build submodules already follow

## What landed

Twenty concept directories now sit under `core/`: `activity`, `analytics`,
`automation`, `budget`, `custom-fields`, `custom-states`, `customers`, `dto`,
`due-sweep`, `feedback`, `lib`, `members`, `notifications`, `project-crud`,
`releases`, `roadmap`, `settings`, `tickets`, `webhooks`, `work-query`.

Thirteen files were left flat at the top of `core/`. Twelve of them stay, for
the reasons below; one moved.

## The per-file decision for all thirteen flat files

**Moved — one.**

`projects-invoice-line-detail.spec.ts` → `core/project-crud/`. Its subject is
`ProjectsWriteService`, which lives in `project-crud/` beside four other specs
over the same service (`projects-write-create-client`, `-reassign`,
`-tenant-isolation`, `-update-authz`). It was the fifth, and the only genuine
concept-group member still flat. Twelve tests pass at the new path.

**Structural — not a concept group, three.**

- `index.ts` — the published barrel. It *is* the shared surface every sanctioned
  import names; it cannot live inside one concept.
- `projects.module.ts` — the parent module's own `@Module`. BE-03 puts a parent
  module's wiring in `<module>/core/`. It wires all twenty concept directories,
  so it belongs to none.
- `projects.controller.ts` — the parent module's own `@Controller("build")`,
  again BE-03. Its routes span three concepts (project list/create, labels,
  invoice-line-detail), so no single directory owns it.

**Co-located with a file that stays — one.**

- `projects.controller.e2e-spec.ts` — the e2e for `projects.controller.ts`.
  Its subject stays flat, so it stays beside it.

**Cross-cutting invariants spanning two or more concept groups — six.**
Each asserts one property across several concepts. Filing any of them under a
single concept would misattribute the invariant and hide it from the other
concepts it also guards.

- `build-actor-migration.spec.ts` — the actor seam across `members`, `tickets`
  and `project-crud` scope. Three groups.
- `build-core-isolation.spec.ts` — BOLA across `releases`, `tickets` (labels and
  checklists), `custom-fields`, `custom-states`. Five groups.
- `build-core-services-tenant-isolation.spec.ts` — `tickets` (transfer, query,
  read, status), `webhooks`, `automation`, `project-crud`. Four groups.
- `build-cross-tenant-lookup.spec.ts` — the delete guard's blocker lookup in
  `tickets` and the activity feed's cycle-name lookup in `activity`. Two groups.
- `build-nested-child-cross-project-binding.spec.ts` — URL-project binding
  across `custom-states`, `custom-fields`, `webhooks`. Three groups.
- `sibling-version-conflict.spec.ts` — the shared
  `TicketVersionConflictException` across `releases`, `roadmap` and
  `execution/workspace.service`. It spans concepts *and* submodules.

**Depth-anchored disk scanners — two.** These resolve paths from `__dirname`,
so their depth is load-bearing and a move changes what they scan.

- `build-no-pm-workspace-invariant.spec.ts` — scans `join(__dirname, "..")`,
  which is `src/modules/build`. One directory deeper it would scan only
  `build/core` and still clear its own `> 50` anti-vacuity floor: a silent loss
  of coverage dressed as a refactor.
- `s04-openapi-pagination.spec.ts` — reads
  `join(__dirname, "../../../../openapi.json")` and asserts cursor pagination on
  four routes owned by four different groups (`work-query`, `roadmap`,
  `feedback`, `activity`). Cross-cutting and depth-anchored.

No file was moved to make a count reach zero, and no genuine concept group is
left flat.

## Eight orphaned reaches found and fixed

`core/project-access.ts` moved to `core/project-crud/project-access.ts` in an
earlier ticket. Eight `jest.mock` / `jest.requireActual` path strings were never
repointed, and **eight suites had been dead ever since** — every one failing
with `Cannot find module`, zero tests executed:

- `build/approvals/approvals-by-id-project-access.spec.ts`
- `build/execution/workload-capacity-tenant-isolation.spec.ts`
- `build/meetings/meetings-cycle-bridge.spec.ts`
- `core/build-actor-migration.spec.ts`
- `core/build-core-services-tenant-isolation.spec.ts`
- `core/tickets/build-ticket-create-cycle-bridge.spec.ts`
- `core/tickets/projects-tickets-cross-project-binding.spec.ts`
- `core/tickets/ticket-write-ancestry-lock.spec.ts`

All eight import the value from a barrel and mock the implementation module, so
repointing the mock to `project-crud/project-access` is the whole fix. The eight
suites now run: 66 tests that could not execute before.

`tsc` cannot see a string passed to `jest.mock`, and
`check:build-core-surface` could not either — its matcher was `from "…"` only.
That is how a repoint of the `from` import in the same file passed every gate
while the mock beside it stayed dead.

## check:build-core-surface widened

The gate now resolves **every** specifier form — `from`, bare and dynamic
`import`, `require`, and `jest.mock` / `doMock` / `unmock` / `requireActual` /
`requireMock` / `createMockFromModule` — across `src/` and `test/` (9,317
files, 807 specifiers aimed into `build/core`), and fails any that resolves to
nothing on disk. This is the invariant that was broken; it is now enforced.

It also fences the tickets group repo-wide: no file outside `build/core/` may
`from`-import past `core/tickets/index.ts`. Previously only
`src/modules/build/**` siblings were scanned, so every external module was
unwatched.

Self-test grew from 10 pattern checks to 26, with two anti-vacuity floors
(500 repo files, 40 core-aimed specifiers). Its bad samples are the real defect
— `jest.mock("./project-access")` resolved from `core/` — so the new direction
bites against disk, not against a synthetic fixture.

## Verification

`tsc -p tsconfig.json --noEmit` and `pnpm typecheck:test` both print **nothing
and exit 0** — zero errors on both configs, run at `--max-old-space-size=10240`
per BE-139. That was the entry baseline and it is the exit state.

`check:cycles` finds exactly **1** circular dependency,
`kb/linked-documents/kb-linked-document-ask-source.ts >
kb/retrieval/kb-ask-context.ts` — the pre-existing KB pair. None in Build, so
BE-10 holds.

`check:module-registration`: 260 module classes declared, 260 reachable from
`AppModule`, 0 unreachable. `check:kebab-case`: 10,304 entries scanned, 0
violations. `check:ticket-write-module`: 12 grandfathered bypasses, 0 new.
`check:authz-deny`: uncovered 1757 against a ratchet of 1791.
`check:build-core-surface` and its self-test both pass.

For "no logic changed": across `build/`, `agent-access`, `ai`, `cron`,
`feedbucket`, `integrations` and `portal`, **no non-spec file has a single
changed line that is not an import or export specifier**. Every production
change in this ticket is a path. The only non-import edits anywhere in the move
are in spec files, and they belong to the peer version-token lane, not here.

Ten suites were run directly — the eight revived above, the moved spec, and
`execution-cross-project-binding.spec.ts` as the untouched control: **10
passed, 118 tests passed**.

## Two gates are red for reasons outside this ticket

`check:unbounded-reads` fails on 19 unclassified paths and 1 regression. Every
one is in `e-sign`, `accounting`, `expenses`, `hr`, `invoices`, `kb`,
`notifications` or `timesheets`; the regression is
`timesheets/core/lib/billing-export.ts`. **Not one is under `build/`.** All 73
`build/` paths in `unbounded-reads-classification.json` and
`unbounded-reads-baseline.json` resolve on disk, so this ticket's re-anchoring
is complete and nothing here went stale.

`check:contract-registry` fails on one missing term for
`POST /public/intake/t/{intakeToken}`, which lives in
`modules/public/public.controller.ts` — the intake-token lane.

Neither was re-anchored here. Accepting another lane's unclassified output to
green a gate would be blanket acceptance, not re-anchoring by identity.

## Note, not a change

`core/__tests__/` holds one spec whose subject, `ProjectsProvisionService`,
lives in `project-crud/`. `__tests__` is allowed by exact name in
`check-kebab-case.mjs` and appears in ten-plus places repo-wide, so dissolving
it is a repo-wide convention decision rather than this ticket's business. It is
recorded here so the next reader does not have to rediscover it.
