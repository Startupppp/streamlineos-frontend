# Session 4 — Production signal and failure behaviour

Three tickets, no blockers, nothing waiting on you and nothing you wait on. This is the session that
makes a production failure visible and makes the platform's declared behaviour under failure true.

**Read in this order, then act.**

1. [`PROTOCOL.md`](PROTOCOL.md) — binding. Especially §1 (ask everything now) and §2 (a checkbox is evidence).
2. Root `CLAUDE.md`, then `backend/CLAUDE.md`.
3. Your three tickets in full: [`../issues/`](../issues/) files `15`, `16`, `31`.
4. [`../../OPEN-FINDINGS.md`](../../OPEN-FINDINGS.md) — ticket 15 *is* this file.
5. The PRD's *Reliability, security, and compliance* and *Fencing, overload, and dependency failure*
   sections ([`../prd.md`](../prd.md)).

## Your tickets

| # | Ticket | Blocked by |
|---|---|---|
| 15 | Every open item in `OPEN-FINDINGS.md` is closed or carries a dated reason | — |
| 16 | Every latency seam is instrumented and alerted below its SLO budget | — |
| 31 | Declared degradation is tested, not described | — |

Ticket `31` originally listed `20` (Session 3) as a blocker and **no longer does**. Its control-plane row
has two halves: *"refuse unknown or stale placement"* is already true today — `RegionRegistry.regionForOrg`
raises for an unplaced organization and for one placed in a region this deployment does not serve — so
assert that against whatever placement resolution exists when you run. *"Serve valid signed placement
cache"* is ticket 21's own acceptance criterion, proved there, not here. The other seven dependency rows
and the entire shed order have nothing to do with placement.

**Suggested order:** `15` first — several of its items are small and one (§3) is a real migration. Then
`16`, because `31`'s tests are far easier to write once the seams are instrumented. Then `31`.

## Ask these first — plus anything else you find

1. **Where do alerts actually go?** Ticket 16 requires an owner, a runbook, a paging destination and a
   scheduled test event that proves a human receives it. There may be no destination configured at all.
   Ask for the real one; without it, the alerts are logs and the ticket cannot close.
2. **`OPEN-FINDINGS.md` §5 — the FORCE-RLS contradiction.** Missing policies are at 0, but the verifier
   reports 907 `RLS is enabled but not forced`, and `backend/CLAUDE.md` §4 says never blanket-force. One
   has to change. *Recommend: change the verifier* — the application connects as `neondb_owner`, whose
   `BYPASSRLS` overrides `FORCE` anyway, so forcing 907 tables would alter nothing today. Record the
   decision as an ADR either way.
3. **§6a — what determines who a pending resignation's approver would be?** `leaveRequests` carries
   `approverId` for `leaveApprovalScope` to key off; `resignations` has no equivalent pre-assignment
   column — `approvedBy` / `hrReviewedBy` / `finalReviewedBy` are populated only *after* action. This is
   genuinely undiscoverable from the code. A guessed predicate is worse than the honest finding.
4. **§6 — the nine deliberately over-cap page fields** (`csat` 500, `party` 500, `issues` 400,
   `data-quality` 400, `hr/interviews` 200, `tasks` 200). Keep the caps, or migrate them to the 100/page
   platform cap? Product ruling, not a mechanical swap. The other twenty migrate regardless.

## Territory

**Yours, exclusively:**

- `architecture-refactor/OPEN-FINDINGS.md`
- `backend/src/db/schema/hr/hiring.ts` — for the `vault_access_logs` work **only** (S2 owns the rest of
  `db/schema/hr/**`)
- `backend/src/modules/hr/recruitment/recruitment-candidate-vault.service.ts` — the vault delete handler
- The `DashboardLeaveService.getPendingApprovals` resignation-count path (§6a)
- `backend/src/common/auth/verify-permission-catalog.mjs` — **delete it**, and repoint or drop
  `verify:permissions` in `backend/package.json`. This one file is carved out of S1's `common/auth/**`.
- `backend/src/scripts/alert-*.mjs` and the `unregistered-injectables.mjs` promotion
- Observability wiring in `backend/src/main.ts` — **the telemetry block only.** S5 owns the
  OpenAPI/Swagger block in the same file.
- Pool telemetry and the slow-acquire threshold, `backend/src/db/pool.config.ts` transaction guards
- Rate-limit tiers, guard and the dev multiplier
- The `recurring-journals.controller.ts` inline schema → its module's `dto/`
- The remaining hand-rolled pagination page fields

**Not yours:** `modules/access`, `common/rbac`, `common/region`, `common/tenant`, `modules/hr/**` beyond
the two files named above, `frontend/lib/query-keys`. Report, do not edit.

## Traps in this territory

- **A log line is not an alert.** It becomes one when scheduling, routing, paging, ownership and receipt
  are all verified. Ticket 16's last criterion is the whole ticket.
- **The alert predicate must match a real emission.** A `42501` alert here grepped for a string no log
  line contained, and its self-test hand-wrote the fixture — so the alert was green and dead. Trigger the
  real condition and watch it fire.
- **The rate-limit tier fails open.** `@UseRateLimit("key")` with no `TIERS` entry silently disables the
  limit; decorator, guard and entry are all required. And `DEV_LIMIT_MULTIPLIER` makes every tier 10×
  outside production — use `effectiveRateLimit(tier)` or a conservative-fallback test passes for the
  wrong reason.
- **CORS is registered after the body parser.** A parser rejection returns before `enableCors` and loses
  its `ACAO` header, so a 413 reads to the client as "Network error". Relevant when you test body-size
  limits in ticket 31.
- **§3: do not add the vault audit insert alone.** `vaultDocumentId` is `ON DELETE CASCADE`, so the audit
  row is destroyed by the same transaction that deletes the document it describes. The insert is inert
  until the cascade, the missing `org_id`, the nullable FK and the reader rewrite all land together.
- **Kill the dependency in ticket 31, do not stub it.** A stubbed Redis returns errors instantly; a real
  one returns them after a timeout, and the timeout is the behaviour under test.
- **Test the shed order at the boundary**, not at 10× saturation — everything sheds at 10× and that
  proves no ordering.
- **Text scans miss generated and indirect forms.** All four CI checks in this program under-reported on
  their first run.
- **Frontend eslint:** 25+ minutes and killed; scope by the rule's selector, batch ≤60 paths (356 exits 1
  with no report), and a `warn` never gates.
- **`OPEN-FINDINGS.md` §4 is operator-only** — Neon's control plane restores the previous password on
  suspend, so `ALTER ROLE` does not stick. Mark it, do not attempt it.
- **Verify each finding still reproduces before fixing it.** That file records that most of what its
  predecessors listed had already been fixed. And check every cross-reference you write — a dangling
  pointer claiming a finding was written up somewhere it wasn't is how §6a came to exist.

## Definition of done for this session

- All three tickets' criteria ticked with pasted evidence, or open with a written reason.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` clean.
- `OPEN-FINDINGS.md` contains no item whose status is unknown.
- Each ticket-16 alert has a recorded test event and the destination that received it, pasted.
- Each ticket-31 dependency row has a test that removed the dependency for real, with output.
- The vault migration is journalled, and its landing is proved by a `pg_catalog` diff.
- A commit per closed ticket, pathspec-scoped.
