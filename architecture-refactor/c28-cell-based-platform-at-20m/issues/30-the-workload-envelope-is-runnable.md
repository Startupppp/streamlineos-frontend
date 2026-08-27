# 30 — The workload envelope is a runnable load profile

**What to build:** The PRD's planning envelope becomes a test anyone can run, and the answer it gives is the only basis for a scale claim. It drives the platform at the declared traffic on production-shaped data, including the hundred-thousand-member organization and the hundred-thousand-recipient broadcast, and reports each latency budget with the headroom left in every limiting resource.

**Blocked by:** [26 — A second cell exists and is proved from cold](26-a-second-cell-is-proved-cold.md)

**Status:** ready-for-agent — **needs production-shaped seed data and a running second cell**

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

**Grounding (2026-08-28, evidence not instruction — re-read at source):** this ticket is also what unblocks three tickets left honestly open in this program — c16-06, c21-04 and the read budgets generally all refuse to measure against zero rows, correctly. It is the same blocker, and this is where it is solved rather than worked around. The `db:check-read-budgets` runner already exists and already refuses; it needs a population, not a change.

## Acceptance criteria

- [ ] The envelope runs as a repeatable profile against production-shaped data, measured as the application database role with the tenant GUC set — never as the owner, whose `BYPASSRLS` hides the policy and produces plans production never gets.
- [ ] Every latency objective in the PRD's reliability table is reported, under the declared cold/warm cache mix, payload sizes, pool pressure, tenant sizes, geography, device and network.
- [ ] At least 40% headroom remains in every limiting cell resource at the sustained target, and the burst target is survived.
- [ ] The 100,000-member organization is a real fixture, and the list, search and directory surfaces over it stay within their budgets.
- [ ] A single 100,000-recipient broadcast creates one logical job and bounded batches, with no recipient write inside the request.
- [ ] The existing read-cost budgets are re-measured against this population and either pass or fail with a number — the refusal state ends here.
- [ ] The result is published. Per the PRD, published workload and SLO results are the only basis for a `20M-ready` claim; typecheck and review are not.

## Todo

- [ ] Build the fixture generator before the load profile. Every other ticket that needed data has been blocked on this and has been waiting rather than inventing rows.
- [ ] `VACUUM ANALYZE` after the load; a bulk insert leaves the statistics and the visibility map wrong, and an Index Only Scan will not appear without it.
- [ ] Do not calibrate a ceiling against synthetic rows and call it a budget. The declared ceilings already exist; this run either meets them or does not.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
