# 41 — One-commit release verification

**What to build:** The §1 gate. Every proof re-run at a single commit, because evidence gathered across a moving tree proves nothing about any one state of it.

**Blocked by:** 40.

**Status:** ready-for-agent

- [ ] Disposable-database end-to-end runs for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing, Payments, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail.
- [ ] Each command, release SHA, database identity, dataset shape, pass/fail/skip count and failure artifact is recorded.
- [ ] At that same commit: backend build and typecheck, spec typecheck, frontend typecheck, OpenAPI freshness, cycle, file-size, dead-code, tenant-isolation, RLS, permission, cache, outbox, idempotency, migration, vulnerability, license and SBOM gates.
- [ ] Spec typecheck is run explicitly — the default backend typecheck configuration excludes spec files, so a clean typecheck does not prove the specs compile.
- [ ] The full suite is run, not a path-filtered subset, and the suite and test tails are read rather than trusting the exit code.
- [ ] Both repositories are verified. They are separate git repositories and a change spanning both needs two commits.
- [ ] Every code-level P0 and P1 finding is resolved; accepted lower-severity residual risks carry an owner and a deadline.
- [ ] Excluded modules remain excluded and public landing visuals and animations remain unchanged.
