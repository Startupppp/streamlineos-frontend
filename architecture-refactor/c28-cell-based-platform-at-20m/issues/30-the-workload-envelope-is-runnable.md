# 30 — The workload envelope is a runnable load profile

**What to build:** The PRD's planning envelope becomes a test anyone can run, and the answer it gives is the only basis for a scale claim. It drives the platform at the declared traffic on production-shaped data, including the hundred-thousand-member organization and the hundred-thousand-recipient broadcast, and reports each latency budget with the headroom left in every limiting resource.

**Blocked by:** [26 — A second cell exists and is proved from cold](26-a-second-cell-is-proved-cold.md)

**Status:** partially done — **the refusal state has ended**; there is no load driver, so no latency objective is measured

**The envelope, from the PRD** — validation inputs, not traffic predictions:

| Dimension | Minimum target |
|---|---:|
| Registered accounts | 20,000,000 |
| Organizations | 1,000,000 |
| Daily active users | 2,000,000 |
| Peak authenticated sessions | 250,000 |
| Concurrent realtime connections | 100,000 |
| Largest organization | 100,000 active members |
| Sustained traffic | 50,000 req/s platform-wide |
| Burst traffic | 100,000 req/s for 10 minutes |
| Async event ingress | 1,000,000 events/minute |
| Single broadcast | 100,000 recipients, no request-time fanout |
| Knowledge corpus | 1 billion chunks with ACL-safe retrieval |

**Decision taken at the start of this session:** seed a 100,000-member organization plus one cell's proportional share, with the extrapolation method written down, rather than the full envelope — which would exhaust the Neon plan's storage. `envelope-profile.mjs` holds `ENVELOPE`, `CELL_SHARE` derived from it by an explicit divisor, `extrapolate()` and `EXTRAPOLATION_NOTES` stating per dimension whether scaling is linear, sub-linear or not extrapolable at all.

## Acceptance criteria

- [x] The envelope runs as a repeatable profile against production-shaped data, measured as the application database role with the tenant GUC set — never as the owner, whose `BYPASSRLS` hides the policy and produces plans production never gets.

  `pnpm -C backend seed:envelope` then `node src/scripts/run-workload-envelope.mjs`. The runner connects as `APP_DATABASE_URL` (`streamline_app`, `bypassrls=false`) and issues `SELECT set_config('app.organization_id', $1, true)` inside each transaction, the same shape `run-read-cost-budgets.mjs` uses. The seed completed in 15.8s and ran `VACUUM ANALYZE` on 38 tables — not `ANALYZE` alone, which is the trap `seed-build-load.mjs` still contains.

- [ ] Every latency objective in the PRD's reliability table is reported, under the declared cold/warm cache mix, payload sizes, pool pressure, tenant sizes, geography, device and network.

  **Open.** All 14 objectives are enumerated as data and every one is reported — but 12 are reported as **not measurable**, which is not the same as measured:

  ```
  INFO  latency-objectives-total                           14 objectives in PRD
  INFO  objective-not-measurable:p95-transactional-write   target=500 ms — requires production load driver
  INFO  objective-not-measurable:p95-redis-operation       target=2 ms including network — requires production load driver
  INFO  objective-not-measurable:p75-first-useful-view     target=1000 ms — requires production load driver
  … 9 more
  ```

  **What would close it:** a load driver generating the declared traffic against a running application with a declared cold/warm cache mix, reference device and network. This repository has no load driver and one application process. A buffer-count check cannot stand in for a latency measurement, and reporting one as the other is what this program has already un-ticked boxes for.

  **Dispatched this session and not delivered.** A lane was given the whole job — drive a real authenticated API, declare the run conditions as data, report p50/p75/p95/p99 per objective, mark anything undrivable as `NOT DRIVEN` with a reason rather than dropping it, sample connections and queue depth for headroom, run the burst shape, and write `.load-driver-results.json` for tickets 29 and 32 to consume. It terminated on the account's weekly API limit before its first tool call. Nothing in this criterion changed.

- [ ] At least 40% headroom remains in every limiting cell resource at the sustained target, and the burst target is survived.

  **Open, and the runner refuses rather than guessing:**

  ```
  REFUSE 40pct-headroom-in-all-resources   headroom requires production-load driver measuring CPU/connection/memory
                                           against the 50 req/s per-cell target; 40% floor cannot be asserted
                                           from buffer counts alone
  ```

  The one resource that *is* measured says the cell has headroom — `database-size` at 42.1% of the plan limit, admission `OPEN` — but that is storage occupancy, not headroom under load, and neither the sustained nor the burst target has been driven.

- [x] The 100,000-member organization is a real fixture, and the list, search and directory surfaces over it stay within their budgets.

  ```
  PASS  member-count-adequate      100004 >= 100000
  PASS  org-members-list           blocks=1431 (ceiling 5000)
  PASS  org-people-directory       blocks=2216 (ceiling 8000)
  PASS  employee-record-list       blocks=4457 (ceiling 8000)
  ```

  Measured as `streamline_app` with the tenant GUC. All three surfaces are comfortably inside their **declared** ceilings; no ceiling was changed.

- [x] A single 100,000-recipient broadcast creates one logical job and bounded batches, with no recipient write inside the request.

  ```
  INFO  broadcast-mechanism             audience_targets table present; recipientCount column present;
                                        notification_queue fanout table present
  PASS  broadcast-one-logical-job       recipientCount + status columns confirm one-job model
  PASS  broadcast-no-request-time-fanout notification_queue or audience_targets table present — fanout deferred
  ```

  Asserted against the schema that actually exists rather than the one the ticket assumes. This proves the **mechanism** is a deferred one-job model; it does not prove a 100,000-recipient broadcast has been sent, which needs the load driver.

- [x] The existing read-cost budgets are re-measured against this population and either pass or fail with a number — the refusal state ends here.

  **The refusal state has ended.** `node src/scripts/run-read-cost-budgets.mjs`:

  ```
  PASS=23  FAIL=23  SKIP=2  SEED_TOO_SMALL=0  ERROR=0
  ```

  **Not one budget is over its declared ceiling.** All 24 breaches are `forbid-seq-scan` plan assertions. Two distinct causes, neither of which is a dropped index:

  1. **Small tables.** `clients-list` reports 3 blocks, `payroll-runs-list` 1, `inv-vendors-list` 1. The whole relation is a page or two, so a sequential scan is the correct plan and the assertion is firing on a table below the size where an index can win.
  2. **The fixture is one huge tenant with no neighbours.** `org-members-list` reports 1,431 blocks with a `Seq Scan` over `organization_members` — but 100,004 of the table's 100,079 rows belong to the seeded organization, so the tenant predicate is 99.9% selective-of-everything and the planner is right to scan. At 1M organizations the same predicate selects 0.01% of the table and the tenant-led index wins.

  **What would make these assertions meaningful:** seed the cell's proportional share of *other* organizations alongside the 100,000-member one, so tenant selectivity is realistic. Bringing the large org to 10% of `organization_members` needs roughly 900,000 further member rows; the database is already at 42.1% of the Neon plan's 3 GiB and `database-size` is the measured limiting resource, so that population does not fit here.

  **Eight budgets executed for the first time in this session.** They referenced columns that do not exist — `kb_spaces.cover_image`, `deals.title`, `payroll_run_employees.gross_pay`/`net_pay`, `payroll_line_items.component_code`, `inv_stock_levels.quantity_available`/`quantity_reserved`, `inv_stock_transactions.quantity`, `hr_leave_ledger.entry_type`, and `'ARCHIVED'`, which is not in `inv_product_status` (`ACTIVE, INACTIVE, DISCONTINUED`). Every one was hidden behind the `seed too small` refusal, so the refusal was masking broken budgets as well as unmeasured ones. Projections corrected against `information_schema`; **no ceiling was touched**. `leave-ledger-mine`, `deals-pipeline` and `inv-stock-transactions` now pass outright.

- [ ] The result is published. Per the PRD, published workload and SLO results are the only basis for a `20M-ready` claim; typecheck and review are not.

  **Open, and deliberately so.** There is no workload result to publish: no load driver ran, no latency objective was measured, and no headroom figure exists. What *can* be published is what this ticket produced — a runnable profile, a production-shaped 100,000-member fixture, and 46 read-cost measurements against declared ceilings. None of that is a workload result, and calling it one would be the exact claim the PRD's release rule forbids.

## Todo

- [x] Build the fixture generator before the load profile. Every other ticket that needed data has been blocked on this and has been waiting rather than inventing rows.
- [x] `VACUUM ANALYZE` after the load; a bulk insert leaves the statistics and the visibility map wrong, and an Index Only Scan will not appear without it.
- [x] Do not calibrate a ceiling against synthetic rows and call it a budget. The declared ceilings already exist; this run either meets them or does not.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## What this unblocks elsewhere

`c16-06`, `c21-04` and the read budgets generally were left open in this program because they refused to measure against zero rows. That refusal was correct and it is now resolved for the budgets: every one emits a number. Re-run `node src/scripts/run-read-cost-budgets.mjs` from those tickets and record the figure rather than the refusal.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
