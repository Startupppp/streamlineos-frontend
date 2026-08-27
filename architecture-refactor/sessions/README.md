# Sessions — five independent workstreams, one branch, no worktrees

Supersedes [`../lanes/`](../lanes/), whose four files reflect an earlier split. **Use these.**

## How to start one

Open a session in `D:\projects\personal\Streamlineos` and send exactly:

```
Read architecture-refactor/sessions/S1-BILLING-WEBHOOKS.md and execute it.
```

Each file is self-contained. Start as many as you like at once — territories are disjoint.

| # | File | Tickets | Open boxes | Territory |
|---|---|---|---|---|
| S1 | [`S1-BILLING-WEBHOOKS.md`](S1-BILLING-WEBHOOKS.md) | c17-01, 02, 03, 05 | 34 | `billing.service.ts`, webhook controllers, `revenue-analytics.service.ts` |
| S2 | [`S2-BILLING-LEDGER.md`](S2-BILLING-LEDGER.md) | c17-04, c26-02…05 | 13 | `plan-limits.service.ts`, new ledger services, `billing.module.ts` |
| S3 | [`S3-AUTHORIZATION.md`](S3-AUTHORIZATION.md) | c25-01, 02, 03 | 13 | `common/auth/**`, `modules/access/**`, `modules/module-access/**` |
| S4 | [`S4-LIST-CONTRACT.md`](S4-LIST-CONTRACT.md) | c13-01, 03, 04, 05, 06, c12-02 | 14 | `common/pagination/**`, build · accounting · chat · mail · search |
| S5 | [`S5-NOTIFICATIONS.md`](S5-NOTIFICATIONS.md) | c21-04, 05, 07 | 19 | `modules/notifications/**`, `modules/cron/**` |
| — | orchestrator | c23-05, c23-02, c16-05, c18-02 | 14 | the schema split, which touches every importer and cannot run beside anything |

## Why billing is two sessions and not one or three

`billing.service.ts` carries both the webhook path and coupon redemption, so c17-01/02/03 cannot be
split from each other. c17-05 joins them because `revenue_events` currently has **zero writers**, so
"record a revenue event on every billing state change" means editing that same file.

c17-04 and c26 split off cleanly: `plan-limits.service.ts` is self-contained, and c26-02's seat
serialisation uses the same `quota:${orgId}:members` advisory lock that plan limits already take.

## The five files no session may edit

`backend/migrations/meta/_journal.json` · `backend/src/db/schema/index.ts` ·
`backend/src/app.module.ts` · `backend/src/modules/rbac/permissions/index.ts` ·
`frontend/lib/rbac/permissions/index.ts` · and `architecture-refactor/README.md`.

Four sessions doing Read-then-Edit on one file means the last writer wins and the rest vanish
silently. Write what you need to `architecture-refactor/lane-requests/<session>.md` instead; the
orchestrator applies it. **A migration absent from `_journal.json` never runs and `db:migrate`
reports success anyway**, so a missing request is a migration that does nothing.

Reserved migration numbers: S1 0560–0564 · S2 0565–0569 · S3 0570–0574 · S4 0575–0579 ·
S5 0580–0589 · orchestrator 0590+.

## Not assigned to any session — operator-gated

These have open boxes that **cannot** be closed without a database or a deployment. Do not pick them
up; they are documented, not forgotten.

| Ticket | Gate |
|---|---|
| c16-01, c16-04, c16-06 | every box names an unapplied migration (0477/0478, 0479, 0486–0488) |
| c17-06, c18-04 | migration `0491` unapplied; c18-04 is two levels down |
| c18-03 | this candidate's own standard forbids deleting an endpoint without access logs; none exist |
| c25-04 | needs a live ephemeral database wired into CI |
| c27-05 | conditional on *measured* storage; no measurement is possible |
| c15-04, c12-02 (last box) | "verify by running the app" — no live environment |

**Nothing in this program has been applied to any database.** See [`../APPLY-MIGRATIONS.md`](../APPLY-MIGRATIONS.md);
315 `.sql` files, 300 journal entries, 15 un-journalled — 11 of them unaccounted for, including the
only migration that puts an RLS policy on `crm_suppression_hashes`.
