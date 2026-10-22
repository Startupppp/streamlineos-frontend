# Completing HRMS Faster with Parallel Agents

## The Operating Model

Use a coordinator and a small rotating pool, not a swarm. The coordinator owns
packet creation, exact reservations, contract seams, integration, heavy-test
scheduling, ledger status, and Git. Each agent owns one bounded outcome and no
shared file unless explicitly granted.

Start on this laptop with one coordinator plus two code agents. This avoids the
failure mode where many agents reload the 24-document corpus, collide in route/
permission/query/schema files, and run competing builds. Scale to a third code
agent only after two cycles show memory and fixture headroom.

## Why Work Can Start Immediately

There is no serial Wave 0. Five snapshot packets are independent and final
coverage inputs, not prerequisites for ordinary repairs. Seven shared seams
have separate owners. Domain-local code that preserves the current contract is
already `READY`; only a leaf that changes a specific route, permission, API,
cache, token, event, or DB contract waits for that seam.

Examples:

- fixing the existing leave-list scope predicate does not wait for route census;
- adding a frontend field that requires a new response waits only for that API
  contract child, not the schema or nav census;
- a page adopting existing surface tokens does not wait for new global tokens;
- a people SoR cutover waits for D01 reconciliation, while Cases or Assets work
  proceeds; and
- a payroll provider proof never blocks contract-preserving HR page repairs.

## One Fast Cycle

### 1. Pick two disjoint children

Good first pair:

| Slot | Child | Why independent |
|---|---|---|
| Agent A | one leave list API operation | backend leave controller/service/DTO/tests |
| Agent B | one Cases frontend list/filter row | frontend Cases feature/hook/tests |
| Coordinator | route or nav snapshot, review, seam requests | no leaf write overlap |

Do not infer independence from domain names. Enumerate exact files first. Two
packets needing the same shared employee picker, route catalog, permission key,
query key, DTO barrel, or test fixture are not parallel until the collision is
split or serialized.

### 2. Reserve exact files

Record exact production/test paths, current root and nested backend revisions,
owner, acquired/expiry times, and `RESERVED`. No directory wildcard grants
write access. If both children need one file, assign that file to one owner and
turn the other need into a seam request.

### 3. Send a compact prompt

Use the template in `agent-runbook.md`. Copy exact acceptance text; do not tell
the agent to “implement HRM-04” or “fix all forms.” Limit reading to one context
capsule, relevant code/tests, and at most three PRD sections. This removes the
recurring discovery/token tax and prevents reinterpretation.

### 4. Code in parallel; test proportionately

Agents may run disjoint focused unit/component/controller tests in-band and
targeted lint. Queue whole-side typechecks/builds, generated contracts, cycle
checks, seeded DB suites, migrations, and browser suites. When both agents
finish, review both diffs then run the smallest combined expensive gate once.

### 5. Broker shared requests between cycles

Group requests by route, permission, API/filter, query/cache, UI, event, or DB
seam. Integrate one compatible seam batch, publish its resulting contract and
revision, and unblock only dependent leaves. Unrelated leaves continue.

### 6. Save a durable checkpoint

After diff review and combined gates, the coordinator commits only the verified
paths. This prevents later sessions overwriting a large uncommitted working
tree. Agents never commit or “clean up” unrelated changes.

### 7. Refill both slots

Prefer another disjoint domain if the next child reuses the same feature or
fixture. Do not wait for an entire phase, census, backend, or PRD to finish.
Frontend and backend progress interleave at stable contracts.

## Practical Scheduling Matrix

| May overlap | Must serialize |
|---|---|
| two disjoint feature roots | same exact file or symbol |
| source/unit work with snapshot generation | shared seam owner and its consumers' edits |
| disjoint in-memory tests | shared mutable fixtures or ports |
| frontend leaf and unrelated backend leaf | schema/migration journal writers |
| browserless journey authoring and leaf code | Playwright execution on shared environment |
| review while agents code elsewhere | build/typecheck/migration/seeded DB heavy windows |

If memory pressure, swapping, 429s, or worker contention occurs, reduce to one
code agent for the heavy window. Launching read-only auditors is not a recovery
strategy; duplicated context loading is still work.

## Avoiding Duplicate and Inert Code

- Generated censuses assign one owner per route/form/operation/table row.
- One action registry controls card/row/menu behavior; one filter AST controls
  list/count/export/bulk-all; one feature schema controls UI/API types.
- A leaf cannot add a second shared wrapper, schema, endpoint, permission alias,
  cache key, or component because it lacks those file permissions.
- Cross-domain work uses events/public services, never imports a private table
  or copies logic to avoid coordination.
- Cleanup happens only in a named cutover with zero-caller and build/graph proof.
- Coordinator rejects a handoff that changed unreserved files or reports tests
  without commands/results.

## No-Browser Agent Strategy

Browserless agents can still deliver reliable `CODE_COMPLETE` work:

- route/link/access/static manifest tests for 404 prevention;
- component tests for states, accessible names, focus intent, URL serialization;
- unit/contract/controller tests for Zod, permissions, filters, cursors, cache;
- deterministic Playwright journey code and fixtures (not execution evidence);
- query-plan/DB scripts with self-tests (real execution remains DB evidence);
- visual-token and arbitrary-color static gates; and
- inventory/traceability scripts that fail on missing ownership.

The coordinator later groups browser evidence into small persona/route batches
against fixed revisions. Failed browser evidence reopens the smallest owning
code child; it does not reopen a whole HRM PRD.

## Suggested First Three Cycles

Cycle 1:

- Agent A: one backend leave/team list bounded-filter child.
- Agent B: one frontend Cases search/filter URL-state child.
- Coordinator: route snapshot or inventory validator; review; one test window.

Cycle 2:

- Agent A: one Directory worker list/scope child.
- Agent B: one payroll page requiredness/schema child.
- Coordinator: integrate contract/query requests from Cycle 1; API snapshot.

Cycle 3:

- Agent A: one attendance workLocation projection child.
- Agent B: one employee page surface/accessibility child using existing tokens.
- Coordinator: permissions or form snapshot; combined integration gate.

Exact source inspection can change these pairings. Never reserve an example
child until its write set and current failing reproduction are known.

## Progress Metrics

Measure integrated inventory rows, not checkbox totals or agent count:

- children `RESERVED`, `CODE_COMPLETE`, `INTEGRATED`, reopened, and done;
- median duration and percent split before dispatch;
- duplicate/overlap rejections and shared requests resolved;
- focused tests run once versus duplicated heavy commands;
- route/form/API/schema/nav inventory coverage;
- external evidence accumulated at the fixed revision pair; and
- memory/test-runner/fixture failures per cycle.

If median code time exceeds 45 minutes, reopen rate rises, or a child regularly
needs more than eight production files/two seams, make the next child smaller.

## Completion Sequence

1. All generated rows have an integrated child or documented non-goal.
2. Shared route/form/filter/permission/cache/architecture/UI gates pass.
3. Real DB migration/isolation/query-plan packets pass serially.
4. Browser persona/route/accessibility batches pass at fixed revisions.
5. Provider/deployment/rollback evidence and human sign-offs are recorded.
6. `HRM-X-REL-001` reconciles the 347 canonical acceptance boxes, leaves any
   truly deferred item open with owner, and publishes the release decision.

This preserves speed without converting missing evidence into false completion.
