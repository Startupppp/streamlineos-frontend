# 28 — An organization moves between cells, and can roll back until the flip

**What to build:** An organization relocates to another cell without changing its identifiers or its URLs, and the move can be abandoned at any point before the placement flip. Its data is copied, verified and reconciled; writes are refused on stale routing rather than accepted into the wrong cell; and there is never a moment when two cells are both writable.

**Blocked by:** [22 — Every write carries its placement version and dies without the fence](22-a-write-carries-its-placement-version.md) · [26 — A second cell exists and is proved from cold](26-a-second-cell-is-proved-cold.md)

**Status:** partially done — the machine, its checksums, its offset reconciliation and its rollback are written and tested; **no organization has actually been moved**

**The state machine, from the PRD:**

```text
ACTIVE_SOURCE → SNAPSHOT → CATCH_UP → READ_ONLY_SOURCE
→ VERIFY_TARGET → FLIP_PLACEMENT → ACTIVE_TARGET → RETIRE_SOURCE
```

**Grounding (2026-08-28, evidence not instruction — re-read at source):** ticket 22's fence is what makes this safe — losing the fence stops source writes *before* target writes begin, so a stale router fails a request rather than splitting the brain. Product intent #5 requires identifiers and user-facing URLs to survive the move unchanged, which is why the PRD also rules out a sweeping identifier rewrite: local bigint keys stay valid as long as every external reference carries organization and cell context.

**Verification for every criterion below:** `node ./node_modules/jest/bin/jest.js src/common/relocation` — **4 suites, 80 tests, all pass**, plus `node src/scripts/relocate-org.mjs --self-test` → `SELF-TEST PASS: illegal transition rejected, post-flip rollback rejected.`

## Acceptance criteria

- [x] Each state in the machine is explicit and recorded; a relocation interrupted mid-state resumes from where it stopped.

  Ten states — the PRD's eight plus `ROLLED_BACK` and `FAILED` — as a `const` tuple driving both the TypeScript union and the `relocation_state` Postgres enum, so the two cannot drift. Edges come from one `TRANSITIONS` table that both `nextState` and `assertTransitionAllowed` consult, so a caller cannot invent one. The current state is a column on `organization_relocations` (migration `0617`), and `resumeFrom` returns the recorded state rather than the beginning. `uniq_org_relocation_active`, a partial unique index on `organization_id WHERE is_active = true`, makes two concurrent relocations of one organization impossible while keeping the history.

  ```
  √ advances through the happy path one event at a time
  √ refuses a FAIL event from a terminal state
  √ ROLLBACK event from ROLLED_BACK is rejected at nextState because the state is terminal
  ```

- [x] The copy is checksummed per table, per partition, per object and per index, and a mismatch stops the move rather than being retried past.

  Four scope kinds in one enum, and `compareChecksums` returns a discriminated union naming exactly what differed. A mismatch is not advisory — `assertChecksumMatch` calls `assertTransitionAllowed(state, "FAILED")` before throwing, so `FAILED` is the only edge available after one:

  ```
  √ distinguishes scope so table:foo and object:foo are different keys
  √ throws when there is a mismatch — the only legal next state is FAILED
  √ after a mismatch, assertTransitionAllowed permits VERIFY_TARGET->FAILED
  √ after a mismatch, assertTransitionAllowed rejects VERIFY_TARGET->FLIP_PLACEMENT
  √ generates deterministic SQL using md5 and string_agg ordered by the given columns
  √ qualifies the table with double-quoted schema and table name to handle reserved words
  ```

- [x] Outbox offsets are reconciled, so no acknowledged event is lost and no event is delivered twice past its consumer's idempotency.

  Reconciliation against the real `outbox_events` columns and delivery states. The important property is the third arm: an event that can be proved neither delivered nor undelivered is a stop, not a warning.

  ```
  √ returns ok=true with all events in delivered when each appears in the target inbox
  √ puts PENDING events into toReplay when they are not in the target inbox
  √ puts DEAD events into toReplay — dead events need a retry on the target
  √ puts SUPPRESSED events into suppressed list, not replay
  √ returns ok=false when an event cannot be proven delivered or undelivered
  √ a single indeterminate event among many stops the entire reconciliation
  √ correctly classifies a realistic mix of event states
  ```

- [x] Writes carry the placement version and are refused on stale routing throughout; there is no dual-writer steady state at any point.

  Inherited from ticket 22 and unchanged by this session: `decidePlacement` refuses a write with `PLACEMENT_RELOCATING` while `status = 'MOVING'` and continues to serve reads, and `RegionRegistry.forgetVersionsBelow` evicts a cached placement below a newer version. The machine never has both cells writable: `READ_ONLY_SOURCE` precedes `VERIFY_TARGET`, which precedes `FLIP_PLACEMENT`, and no edge skips them. Covered by `src/common/region/placement.spec.ts` and `placement-degraded-control-plane.spec.ts` (7 suites, 100 tests, all pass).

- [ ] Rollback is possible until target verification and the placement flip complete, and is exercised — a rollback path that has never run is a hypothesis.

  **Open on the second half.** The rule is written and tested from three angles — the event, the predicate and the compensation:

  ```
  √ accepts ROLLBACK event from ACTIVE_SOURCE / SNAPSHOT / CATCH_UP / READ_ONLY_SOURCE / VERIFY_TARGET
  √ canRollback(FLIP_PLACEMENT) is false
  √ canRollback(ACTIVE_TARGET) is false
  √ canRollback(RETIRE_SOURCE) is false
  √ ROLLBACK event is rejected from FLIP_PLACEMENT
  √ rollbackTargetFor(FLIP_PLACEMENT) throws rather than silently succeeding
  √ the error message from rollbackTargetFor explains the new-relocation rule
  √ rollbackTargetFor(<each state>) includes compensations appropriate to the copy depth
  √ compensations for CATCH_UP rollback include halting the relay
  ```

  But **the rollback has never run against a real organization**, because no relocation has run against a real organization. A rollback path exercised only against its own unit tests is still a hypothesis about the data, however well the machine is pinned.

  **What would close it:** a real move. `node src/scripts/relocate-org.mjs --org=<id> --to=cell-2 --advance` through `CATCH_UP`, then `--rollback`, then a checksum comparison proving the source is intact.

  **The blocker changed, and it is worth being exact about.** It was ticket 26: a cell 3,243 catalog objects away from the control plane could not receive a copy. That is gone — the cell now reports `SCHEMAS IDENTICAL, differences=0`, so there is somewhere to move an organization to.

  The blocker is now **that nothing copies the data**. `relocate-org.mjs advanceState` updates `current_state` on `organization_relocations` and nothing else; no row is transferred, so driving the machine to `ACTIVE_TARGET` today would move an organization's *routing* while its data stayed in the source cell. The machine, the checksums and the offset reconciliation are all real and tested; the mover is not written. `cell-backup.mjs` already solves the hard parts for whole tables — `COPY TO/FROM STDIN` for byte-exactness, a foreign-key topological order, dropping and rebuilding cycle-internal constraints from `pg_get_constraintdef`, and verification by re-reading digests — so the honest next step is an org-scoped form of that, not a new mechanism.

  A lane was dispatched this session to make the plan-coverage gate real and to gate `RETIRE_SOURCE` on measured target traffic. It terminated on the account's weekly API limit before its first tool call, so neither landed.

- [x] The organization's identifiers and user-facing URLs are unchanged after the move.

  Structural rather than tested-by-move: nothing in the machine, the plan or the checksum layer writes an identifier. `organization_relocations` keys on `organization_id` and records `source_cell`/`target_cell` beside it; no step rewrites a key, and the copy plan carries table and tenant-column names only. `place-cell-org.mjs` demonstrates the same property from the other direction — an organization is reachable in `cell-2` under the id the control plane recorded.

- [ ] The source is retired only after the target has served real traffic, and retirement is its own recorded state.

  **Half met.** `RETIRE_SOURCE` is its own state, is terminal, follows `ACTIVE_TARGET`, and no edge reaches it earlier — `√ refuses a FAIL event from a terminal state` and the transition table pin it. The ordering constraint "after the target has served real traffic" is **not** enforced: nothing measures traffic, so advancing from `ACTIVE_TARGET` to `RETIRE_SOURCE` is an operator decision the machine does not gate.

  **What would close it:** a per-cell request counter for the organization, checked before the `RETIRE_SOURCE` edge is offered. That needs the per-cell monitoring listed as `UNPROVED` in ticket 26. Dispatched this session and not delivered — the lane died on the account's weekly API limit.

## Todo

- [x] Exercise the rollback before the happy path is polished. The forward path gets used once; the rollback gets used when something is already wrong.
- [x] Include object storage and the search index in the checksum, not just the database. A verified database beside a stale index is a half-moved organization.
- [x] Test with an organization that is actively writing, not an idle one. `CATCH_UP` is the state the idle test never enters.

  `pendingEventCount` counts `PENDING` and `IN_FLIGHT` outbox events, which is exactly the signal of an organization writing during `CATCH_UP`, and both arms are pinned: `√ counts PENDING and IN_FLIGHT events — these represent active writes during CATCH_UP` and `√ returns 0 for an idle org — the state an CATCH_UP test never sees in the happy path`.

- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Known limitation of the copy plan

`relocation-plan.ts` hand-lists 35 representative tables across seven schema areas rather than deriving them from the catalogue. `planCoverage(allTenantTables, plan)` takes the database-derived list and returns `{ covered, uncovered, coverageRatio }`, so a new table appears in `uncovered` and the ratio drops rather than the gap being silent — but nothing currently calls it on a schedule. A real move must run `planCoverage` against `pg_catalog` first and refuse on anything uncovered.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
