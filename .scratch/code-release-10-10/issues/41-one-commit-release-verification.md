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
  PARTIAL: six backend gates swept at head against `scratch_t41_gates` (journal 668/668, non-owner
  `streamline_app`) — see `reports/46-six-backend-gates.md`. Four now exit 0, two of them real
  defects: the app-role bootstrap re-granted UPDATE/DELETE on `audit_logs` over migrations 0840/0928,
  and `kb_page_attachments` (migration 1042) shipped with no RLS, readable across every org — both
  fixed and bite-proved on a scratch database. `check:vulnerabilities` 4 HIGH -> 0 (fast-uri 4.1.2 ->
  4.1.4). `check:module-lifecycle` and `check:audit-log-privileges` now name their PREREQUISITE and
  classify SKIP, not FAIL, when no database is present. Two residuals remain, both with an owner and
  a deadline of 2026-09-10:
  ACCEPTED RESIDUAL: `check:licenses` exit 1 — `@img/sharp-libvips-*` LGPL-3.0-or-later, dynamically
  linked (`otool -L` confirms `@rpath/libvips-cpp.8.18.3.dylib`), runtime not build-time, on two live
  paths; the existing allowlist's only rationale is a subprocess argument that does not apply. Owner:
  release owner + dependency-licensing sign-off. Deliberately NOT allowlisted by an engineering pass.
  ACCEPTED RESIDUAL: `check:lifecycle-predicates` exit 1 — 78/75 primary, 336/335 join. All four new
  sites identified by a hermetic `git archive b43cbba5` diff and assessed as by-design; two are in
  `src/modules/kb/**`, owned elsewhere this round. Baselines deliberately NOT moved. Owner: KB agent
  (2 sites) + release owner (2 sites).
- [ ] Excluded modules remain excluded and public landing visuals and animations remain unchanged.
