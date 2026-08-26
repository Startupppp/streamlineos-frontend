# Lanes — four parallel sessions, one branch, no worktrees

The 47 open tickets are partitioned into five lanes with **disjoint territory**. Four run in
separate sessions; the fifth (`c18`, `c23-05`, `c21`, `c27-05`, `c24-02`) stays with the
orchestrator because it moves or deletes files across the whole tree and cannot run beside anything.

## How to start a lane

Open a new session in `D:\projects\personal\Streamlineos` and send exactly:

```
Read architecture-refactor/lanes/LANE-1-BILLING.md and execute it.
```

Substitute the file for the lane you want. Nothing else is needed — each file is self-contained.

| Lane | File | Tickets | Territory | Migrations |
|---|---|---|---|---|
| 1 | [`LANE-1-BILLING.md`](LANE-1-BILLING.md) | 10 — c17 ×6, c26 ×4 | `modules/billing`, `modules/platform`, `db/schema/billing` | 0525–0529 |
| 2 | [`LANE-2-AUTHORIZATION.md`](LANE-2-AUTHORIZATION.md) | 10 — c25 ×4, c20 ×3, c15 ×3 | `common/{auth,tenant,security,observability,interceptors}`, `modules/storage`, `src/scripts`, CI | 0530–0534 |
| 3 | [`LANE-3-LIST-CONTRACT.md`](LANE-3-LIST-CONTRACT.md) | 10 — c13 ×6, c12 ×1, c19 ×2, c16-04 | `common/{pagination,cache}`, `modules/{build,accounting,invoices,crm,chat,mail,search}` | 0535–0539 |
| 4 | [`LANE-4-HR-EXTENSIBILITY.md`](LANE-4-HR-EXTENSIBILITY.md) | 8 — c23 ×3, c16 ×4, c19-03 | `modules/{hr,payroll,careers}`, `db/schema/{hr,payroll}`, custom fields | 0540–0549 |
| 5 | orchestrator session | 9 — c18 ×3, c21 ×3, c23-05, c27-05, c24-02 | cross-tree removals and the schema split | 0550+ |

All five work **on `main`, in the existing checkout. No worktrees, no branches.**

## The two shared files no lane may edit

`backend/migrations/meta/_journal.json` and `backend/src/db/schema/index.ts` are single files that
every lane would otherwise write at once. A lane that needs an entry in either writes its request to
`architecture-refactor/lane-requests/lane-N.md` instead; the orchestrator applies them.

This matters: **a migration `.sql` absent from `_journal.json` never runs, and `db:migrate` reports
success anyway.** An unrequested journal entry is a migration that silently does nothing.

Same rule for `backend/src/app.module.ts`, `backend/src/modules/rbac/permissions/index.ts` and
`frontend/lib/rbac/permissions/index.ts`.

## The standing gate

**Nothing in this program has touched a database.** Migrations 0473–0524 are written, mostly
journalled, and unapplied. Any criterion whose proof needs to query the result is unfinishable
today — it is marked `**BLOCKED:**` in the ticket with its specific dependency. Lanes were
partitioned so that no lane is mostly blocked, but a few blocked boxes remain and must stay
open rather than be reworded to fit what can be built.
