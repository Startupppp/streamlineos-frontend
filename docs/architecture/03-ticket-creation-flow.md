# 3. How a ticket is created

```
 BROWSER
   │  POST /build/:projectId/tickets   { title, type, priority, … }   + Idempotency-Key
   ▼
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │ JwtAuthGuard        verify JWT → { userId, orgId, sessionId }                 │
 │                     Redis revocation tombstone — degrades on failure          │
 │ ModuleGuard         org has the BUILD module enabled?                         │
 │ PermissionGuard     @RequirePermission("build:tickets:create") → req.rbacScope │
 │ IdempotencyIntcptr  replays the first result if the same key retries          │
 │ TenantContextIntcp  ONE transaction, sets GUC app.organization_id             │
 │ ZodValidation       parses body, strips unknown keys                          │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ createTicket()                                                                │
 │   1. checkProjectAccess(org, user, project)     → 404 if not a member         │
 │   2. validateTicketStatus(project, org, status) → must exist in the workflow  │
 │   3. allocateTicketNumbers(tx, org, project)    → counter upsert, one row lock│
 │   4. INSERT tickets (…) RETURNING *                                           │
 │   5. activity log + notifications → registerAfterCommit                       │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ COMMIT → after-commit hooks drain in their OWN tenant transaction             │
 └──────────────────────────────────────────────────────────────────────────────┘
```

Rank for a new ticket is `(max rank in the target column) + 1000` from a single indexed lookup, so
creation never renumbers anything.

## Ticket number allocation — corrected after measurement

**What I first claimed, then disproved.** I said `COALESCE(MAX(ticket_number),0)+1` was the module's
worst insert bottleneck and a counter would be the biggest throughput win. Measured:

```
OLD  MAX(ticket_number)+1   Index Scan Backward on uniq_tickets_project_number
                            4 buffers, 0.052 ms   — O(log n), does NOT degrade at 100M rows
NEW  counter UPDATE         4 buffers, 0.087 ms   — marginally slower per statement
```

Both hold their lock until commit, so the serialised window per project is unchanged. **The throughput
claim was wrong and is retracted.**

**What the counter actually fixes**, and why it was still worth doing:

1. **A real race.** Only `projects-tickets-create` held `pg_advisory_xact_lock(projectId)`. The other
   five sites — epics, workspace intake, ticket transfer, form submissions, meeting action items —
   computed `MAX+1` with **no lock at all**, so two concurrent creates through different paths could
   produce the same number and collide on `uniq_tickets_project_number`.
   Verified after: **20 concurrent allocations → 20 distinct, contiguous numbers, 0 duplicates.**
2. **Advisory-lock key collision.** `pg_advisory_xact_lock(projectId)` occupies Postgres' single global
   bigint namespace; any unrelated subsystem locking the same integer blocks ticket creation.
3. **One mechanism** instead of six, so a new call site cannot reintroduce the race.

```
project_ticket_counters (org_id, project_id) PK, next_ticket_number bigint

INSERT … VALUES (org, project, n+1)
ON CONFLICT (org_id, project_id) DO UPDATE
  SET next_ticket_number = next_ticket_number + n
RETURNING next_ticket_number - n AS start
```

`ON CONFLICT` self-heals a project whose counter row is missing. Numbers are monotonic, not gap-free:
an aborted transaction leaves its number unused, which is correct — reissuing would let a deleted
ticket's identifier reappear on a different ticket, and PROJ-123 turns up in commits and chat.
