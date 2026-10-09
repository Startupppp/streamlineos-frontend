# Build Packet Agent Runbook

## Assignment Contract

The coordinator must provide this completed block. A packet with a blank field
is not runnable.

```md
Packet: BLD-X-...
Status: RESERVED
Outcome: one observable result
Acceptance backlinks: exact BSN/BLD IDs and page/resource rows
Acceptance text: copied criteria needed for this packet
Context capsule: exact row from context-capsules.md
Prerequisites: packet IDs and current/frozen contract revision
Root/frontend revision: <sha>
Backend revision: <sha>
Evidence target: source | unit/contract | database | browser | deployed | human
Exclusive production write set: exact paths
Exclusive test write set: exact paths
Read-only dependencies: exact paths
Forbidden/shared files: exact paths
Delete candidates: exact paths or none
Expected failing reproduction: command and assertion
Verification commands: literal bounded commands
External follow-up: packet ID or none
```

The coordinator supplies a compact capsule: no more than three PRD sections
and normally less than 12,000 tokens excluding repository rules and assigned
source. The agent does not read the full Build PRD corpus.

## Execution Steps

1. Read root `CLAUDE.md`, the side-specific `CLAUDE.md` for every side in the
   write set, the assignment, and its named context capsule. Inspect every
   assigned file, symbol, route, caller, and test. Open no adjacent PRD unless
   the coordinator names its exact section after a concrete contradiction.
2. Reconfirm the exact write set has no overlapping active reservation. Treat
   all other files as read-only.
3. Reproduce the defect with the named focused test. When a failing automated
   reproduction is infeasible, preserve exact source proof and explain why.
4. Search for the canonical implementation before creating a symbol or file.
   Make the smallest cohesive change that produces the packet outcome.
5. Cover applicable negative cases: denied permission, wrong tenant, wrong
   parent/record scope, malformed input, empty/filter-empty/error, stale
   version, duplicate submission, rollback, and unavailable cache.
6. Run only the packet commands, in-band and without watch mode. Capture exit
   code plus assertion/test count. Static or mocked checks retain their actual
   evidence label.
7. Re-read the changed files and diff. Confirm the implementation is wired at
   the real entry point and no reserved/shared file changed.
8. Return the handoff below. Do not edit PRD checkboxes, this execution ledger,
   `PAGES.md`, generated contracts, or Git unless the packet explicitly grants
   that exact path.

## Handoff

```md
Packet: BLD-X-...
Result: CODE_COMPLETE | BLOCKED
Changed files: exact paths
Deleted files: exact paths and deadness proof
Source evidence: path:line and observable wiring
Verification: command | exit | assertions/tests | evidence tier
Unrun: check | reason | follow-up packet
Shared-contract requests: exact proposed owner/change or none
Deviations: contract difference or none
Residual risks: concrete risks or none
```

## Verification Commands

Replace placeholders with exact packet paths. The coordinator may remove
irrelevant commands; an agent does not add a full-suite substitute.

Frontend focused checks:

```text
pnpm -C frontend exec jest --runInBand --runTestsByPath <test1> <test2>
pnpm -C frontend exec eslint <changed-file-1> <changed-file-2>
pnpm -C frontend type-check:specs
pnpm -C frontend check:feature-cycles:self-test
pnpm -C frontend check:feature-cycles
pnpm -C frontend check:route-access-contract:self-test
pnpm -C frontend check:route-access-contract
pnpm -C frontend check:permission-binding
pnpm -C frontend check:response-contracts
pnpm -C frontend check:contract-drift
pnpm -C frontend check:query-scope
pnpm -C frontend check:query-signal
pnpm -C frontend check:colors
pnpm -C frontend check:empty-states
pnpm -C frontend check:icon-labels
pnpm -C frontend check:named-handlers
pnpm -C frontend check:file-sizes
```

Use `pnpm -C frontend type-check` only for route/signature/runtime wiring or in
the serial integration lane. Contract parity runs only after the coordinator
provides the reviewed backend artifact.

Backend focused checks:

```text
pnpm -C backend exec jest --runInBand --runTestsByPath <unit.spec.ts>
pnpm -C backend exec jest --config jest-e2e.json --runInBand --runTestsByPath <controller.e2e-spec.ts>
pnpm -C backend exec eslint <changed-file-1> <changed-file-2>
pnpm -C backend typecheck
pnpm -C backend typecheck:test
pnpm -C backend check:cycles:self-test
pnpm -C backend check:cycles
pnpm -C backend check:route-classification
pnpm -C backend check:permission-keys
pnpm -C backend check:scope-boundary
pnpm -C backend check:record-access
pnpm -C backend check:cache-invalidation
pnpm -C backend check:module-entitlement
pnpm -C backend check:unbounded-reads
pnpm -C backend check:db-call-count
pnpm -C backend check:query-projections
pnpm -C backend check:n1-growing-loops
pnpm -C backend check:tenant-indexes
pnpm -C backend check:tenant-relationships
```

Real database tests use a named disposable environment and run serially:

```text
pnpm -C backend exec jest --config jest-db.json --runInBand --runTestsByPath <test.db.spec.ts>
pnpm -C backend check:migration-discipline
pnpm -C backend check:migration-immutability
pnpm -C backend check:migration-chain
```

Migration application, migration proof, Build read-budget checks, seeded DB
tests, provider calls, browser journeys, and deployments are never simulated to
close the corresponding acceptance tier.

## Evidence Rules

- `source`: wiring/static ownership only.
- `unit/contract`: controlled process or mocked boundary.
- `database`: named disposable database, actual schema/RLS/query plan.
- `browser`: real history, focus, layout, media query, interaction, or network.
- `deployed`: production-like migration/provider/telemetry/rollback behavior.
- `human`: named approval.

A lower tier does not imply a higher tier. A jsdom test is not browser proof; a
mocked Drizzle suite is not database proof; a typecheck is not customer-journey
proof.

## Deletion Gate

A deletion packet proves all of the following before removing a file: import
graph deadness with `knip`, zero route/catalog/runtime ownership, real frontend
or backend build, and preservation of unique requirements/history. Schema
deletion additionally proves zero path assertions, raw table-name references,
foreign keys, migration dependencies, and service owners. Cleanup is never an
unscoped add-on to a feature packet.
