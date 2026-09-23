# Completing Build Faster with Parallel Agents

## Operating Model

Use a coordinator-and-pool model, not a swarm. The coordinator owns packet
selection, exact file reservations, shared seams, test scheduling, integration,
status, and commits. Agents own one bounded code outcome each.

For the current laptop, start with:

- one coordinator;
- two simultaneous code agents with disjoint exact files;
- zero overlapping builds, typechecks, seeded DB suites, or other heavy gates;
- one migration/DB writer at a time; and
- no speculative read-only fan-out.

This produces parallel implementation without multiplying the full PRD context
or crashing the machine with concurrent test workers.

## Fast Cycle

### 1. Select two independent packets

Choose from the Ready Pool. Prefer different feature roots and avoid the same
shared seam. A strong first cycle is:

| Slot | Packet | Why independent |
|---|---|---|
| Agent A | `BLD-X-BE-PRODUCT-001` | Owns `managed-products` module-local files |
| Agent B | `BLD-X-BE-FORMS-001` | Owns `forms` module-local files |
| Coordinator | `BLD-X-CENSUS-ROUTES-001` or integration of prior work | Read-only/generated route lane, no leaf files |

Do not start Product beside Scope Directory if both need the same membership or
directory helper. Exact-file inspection decides independence, not packet names.

### 2. Create exact reservations

For each agent, enumerate production and test paths. A reservation contains no
directory wildcard. If two packets need one file, keep that file with one
packet and convert the other need into a shared-change request.

Record root/frontend and nested backend revisions so later test evidence refers
to a real pair. Agents run no Git commands.

### 3. Send a compact assignment

Copy this prompt and fill every field:

```md
Execute packet <ID> only.

Outcome: <one observable result>.
Acceptance: <exact IDs plus copied criterion text>.
Context capsule: <one row from context-capsules.md>.
Read: <exact files and no more than three PRD sections>.
Write: <exact production files>.
Tests you may write: <exact test files>.
Forbidden: <shared files and every unlisted path>.
Contract: <route/method, schemas, permission/scope, query key, cache, errors>.
Reproduction: <exact command and failing assertion>.
Verify: <literal focused commands>.
External evidence: <follow-up packet or none>.

Read the applicable CLAUDE.md files. Do not read the full Build PRD corpus, run
a full suite, edit trackers/PAGES, use Git, or broaden the file set. If a shared
change is needed, report the exact proposed diff and continue independent work.
Return the runbook handoff.
```

### 4. Let agents code; serialize expensive verification

Agents may run small `jest --runInBand --runTestsByPath` or targeted ESLint
commands when those do not share mutable fixtures. Queue whole-side typechecks,
builds, contract generation, cycle gates, seeded DB tests, and migrations with
the coordinator. Run one heavy batch at a time.

When both agents finish close together, review both diffs first, then run the
smallest combined integration batch once. This avoids paying twice for the same
typecheck or build.

### 5. Integrate shared requests between cycles

The coordinator groups compatible requests by seam:

- route/navigation/access;
- permission catalogs;
- request/response/filter contracts;
- query keys/cache primitives;
- schema barrel/module registration/migration journal; or
- shared UI tokens/primitives.

Apply and verify one seam batch, publish the resulting contract revision, and
unblock only the leaves depending on that seam. Unrelated leaves keep running.

### 6. Commit durable checkpoints

After reviewing source, focused evidence, and the combined integration gate,
the coordinator may commit the exact verified paths. A checkpoint protects work
from another session overwriting uncommitted tracked files. Never sweep
unrelated dirty files into the commit.

### 7. Refill the pool immediately

Keep two code slots occupied while READY work exists. Prefer the next packet in
the same domain only when it does not reuse the same files; otherwise rotate to
another module. Do not wait for a whole census, route program, or release phase
to finish before starting independent module-local work.

## Dependency Rules

A packet is blocked only by a dependency that changes its behavior or write
set. Examples:

- A workspace service fix that preserves its endpoint shape does not wait for
  route or form census.
- A frontend page changing a response field waits for that backend response
  contract, but not for schema census.
- A ticket BUG cutover waits for its canonicalization/migration contract, while
  unrelated Files or Meetings work proceeds.
- A page consuming existing surface tokens does not wait for the UI seam; a
  page requiring new global tokens submits a UI-seam request.
- Snapshot packets block final coverage reconciliation, not ordinary leaf
  implementation.

## Avoiding Duplicate Work

- One packet owns one outcome and exact files.
- One shared seam owns each cross-cutting file.
- A leaf proposes shared changes; it does not make private copies or wrappers.
- Packet assignments copy the exact acceptance text so agents do not rediscover
  requirements from 131k tokens of PRDs.
- The coordinator rejects two implementations of the same symbol, schema,
  endpoint, route, cache key, or component before integration.
- Cleanup runs only as a named cutover packet with graph/build proof.

## Machine-Safe Scheduling

Use this priority order when the laptop is constrained:

1. two agents inspect/code without heavy commands;
2. one agent runs a focused in-band unit test while the other codes;
3. coordinator reviews diffs and queues shared requests;
4. pause code test execution and run one combined typecheck/gate batch;
5. resume the two code slots;
6. run builds, seeded DB tests, migrations, and browser suites only in their
   dedicated serial windows.

If memory pressure, swapping, or test-worker contention appears, reduce to one
code agent temporarily; do not compensate by launching more read-only agents.

## Progress Measurement

Measure throughput by integrated packets and generated inventory rows covered,
not by PRD checkboxes or agent count. Track per cycle:

- packets reserved, code-complete, integrated, and evidence-pending;
- average packet duration and reopen rate;
- shared-change requests created and resolved;
- focused tests run once versus duplicated;
- route/form/API/schema inventory rows newly covered; and
- laptop failures or memory pressure.

If a packet repeatedly exceeds 45 minutes, touches more than eight production
files, or needs two shared seams, split the next instance before dispatch.

## Example Two-Cycle Plan

Cycle 1:

- Agent A: Workspace backend contract-preserving defects.
- Agent B: Forms backend contract-preserving defects.
- Coordinator: route census snapshot, reservations, review, one combined test
  batch, checkpoint.

Cycle 2:

- Agent A: Managed Product backend defects.
- Agent B: QA backend defects.
- Coordinator: integrate any permission/query requests from Cycle 1, run the
  form or API census snapshot, review, combined test batch, checkpoint.

Continue rotating disjoint modules. Start frontend leaves as soon as their one
API contract is stable; do not wait for every backend packet. External browser
and database evidence accumulates in separate queues and does not send completed
code back through implementation.
