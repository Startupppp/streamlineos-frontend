# StreamlineOS architecture documentation

This directory contains the current target architecture, one final completion checklist, durable policies, and operator runbooks.

## Authority order

1. [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md) defines the product and target architecture.
2. [PRD-10-10-TODO.md](PRD-10-10-TODO.md) is the only cross-program completion checklist.
3. Policies, ADRs, and runbooks define durable operating rules; they are not status reports.
4. Source code, migrations, executable gates, and fresh environment evidence override dated prose.

Historical architecture reviews, execution reports, completed tickets, and superseded scorecards were removed. Git history remains the archive.

## Scope

CRM and Inventory implementation work is excluded from the completion PRD and remains in its own documentation. Public landing-page visuals and animations are frozen by product direction.

## Durable references

- [Data catalogue](DATA-CATALOGUE.md)
- [Retention policy](RETENTION-POLICY.md)
- [SLO catalogue](SLO-CATALOGUE.md)
- [Release engineering](RELEASE-ENGINEERING.md)
- [Provider reliability](PROVIDER-RELIABILITY.md)
- [Architecture decisions](adr/README.md)
- [Operator runbooks](runbooks/)


**No.** Code-level is not complete either — 26 criteria are open, and only about half of those are blocked on a deployed environment. The rest are genuine code and schema work.

**What's actually strong**

Tenant isolation 934/934, RLS live and failing closed, 685/685 migrations applied with an intact chain hash, zero import cycles in both repos, both typechecks clean, frontend production build clean, 248/260 gates passing with no ratchet, ceiling, budget or baseline raised. That last part matters — the numbers weren't bought.

**What is not done, at code level**

- **A broken shipped feature.** Chat mentions aren't delivered; `@everyone` expands to nobody. That's a defect, not a measurement gap.
- **Schema architecture isn't reconciled.** C053/C060 — tenant-owned tables still carry redundant single-column foreign keys alongside the canonical composite org-scoped ones. Never cleaned up, because it needs dependency proof first.
- **Schema drift you can prove.** `expense_export_jobs` has a `NOT NULL` column that exists in your dev database and in none of the 685 migrations. That's `db:push` contamination, and where there's one there are usually more.
- **Gates aren't all bite-proven** (C104). Some gates have no known-bad fixture, so it isn't established that they'd fail if the thing they check broke. A gate that can't fail isn't a gate.
- **Perf-regression gates are incomplete** (C148) across latency, query count, buffers, payload and memory.
- **Frontend bundle architecture is over budget structurally.** The shared authenticated shell is ~488 kB gzip against a 524 kB ceiling, so nine routes breach before their own code is counted. That's a composition problem in the shell, and it's real code work.
- **12 gates are still not passing.**
- **392 files exceed the 300-line target** in your own §7. That's the standing architecture debt marker.

**Two strictness rules that are deliberately off**

Both are documented in CLAUDE.md as needing an owner, not as passing:

- `noUncheckedIndexedAccess` — off. Turning it on surfaces **574 errors across 190 files** in backend, **184 across 84** in frontend, and both are floors because the build configs exclude tests and scripts.
- Unused-symbol enforcement — off. At real settings it's **4,186 violations across 1,896 files**, and **69.6% of them exist only because of the `^_` escape patterns**.

Neither is a bug, but neither is "top-notch" either. They're honest absences.

**Also worth stating:** CRM and Inventory were excluded from release scope entirely — they weren't audited or hardened. And `check:evidence-seal` is green only because 64 of 73 sealed bundles were resealed; the `bootstrap-head-637` bundle had 0 of 28 files still matching, so nothing should be cited from it.

**Bottom line:** the foundation is genuinely good — security, tenancy, migrations and dependency structure are in solid shape. But "everything implemented, top-notch architecture" isn't a claim the evidence supports today. Work is currently in flight on the chat P1, the gate bite-proofs and the perf-regression gates; the schema-key reconciliation, the shell bundle, and the two strictness migrations are separate pieces of work that nobody has started.
