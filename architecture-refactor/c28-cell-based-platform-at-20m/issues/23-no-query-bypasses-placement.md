# 23 — No organization-owned query bypasses placement

**What to build:** Proof, not confidence. Every query touching organization-owned data goes through placement resolution, and a query that does not is a failing build — so the one someone adds next year cannot quietly reach the primary database for a tenant that no longer lives there.

**Blocked by:** [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** this is a listed Phase 1 exit criterion — *"prove no organization-owned query bypasses placement."* The escape hatches already exist and are legitimate: `runOutsideTenantContext` is used by the placement lookup itself (`region.module.ts:44`), and `no-tenant-transaction.decorator.ts` exists for genuinely global work. The check's job is to make each of those deliberate and enumerated rather than available by default. Two warnings from this program apply directly: a text scan under-reports on its first run in every case recorded here, and a scan that reports "everything is fine" is usually a broken scan — test it against a defect you already know.

## Acceptance criteria

- [x] A check enumerates every path that reaches the database outside a tenant transaction and fails on one that is not on an explicit allowlist.

  `backend/src/scripts/check-placement-bypass.mjs`, five rules: `@NoTenantTransaction` · `runOutsideTenantContext` · `withIdentity` · a `modules/cron/**` service reaching the db without `forEachOrg` / `runInTenantTransaction` / `runInNewTenantTransaction` · a `registerAfterCommit` hook whose body reaches the db without opening its own transaction. Clean run:

  ```
  Bypass sites found       37
    @NoTenantTransaction   17
    runOutsideTenantCtx    8
    withIdentity           11
    cron direct db         1
    registerAfterCommit    0
  OK — every database bypass is on the allowlist with a reason.
  exit=0
  ```

  Ordinary `this.db.select()` in a service is deliberately **not** flagged: the DRIZZLE provider is an ALS-routed proxy, so inside a request it already routes to the ambient tenant transaction. Flagging it would have produced hundreds of false positives and taught everyone to ignore the check.

- [x] Each allowlist entry carries a reason; an entry with no reason is removed rather than kept.

  The reason is a required field, and `emptyReasonInAllowlistIsDetected` in the self-test asserts an entry with an empty reason makes the check fail rather than silently excusing the site.

- [x] The check is self-tested against a deliberately bypassing query, and fails on it — a check that has never failed proves nothing.

  `--self-test` exits 0 across 17 named boolean checks. Beyond that, **two independent failing runs against real trees outside the repo** (verified by the orchestrator, not only by the author):

  ```
  DATABASE BYPASS NOT ALLOWLISTED:
    FAIL  [no-tenant-transaction]  …/src/modules/billing/billing.controller.ts:5
    FAIL  [cron-bypass]            …/src/modules/cron/cron-rogue.service.ts:1
  FAIL — 2 of 2 bypass site(s) not on the allowlist.
  EXIT CODE = 1
  ```

- [x] Raw `db.execute(sql\`…\`)` call sites are covered; they are the ones a Drizzle-shaped scan misses.

  Verified by probe rather than by claim — a cron service whose *only* database reach is `this.db.execute(sql\`SELECT count(*) …\`)`, and an after-commit hook whose only reach is `this.db.execute(sql\`INSERT …\`)`:

  ```
    cron direct db         1
    registerAfterCommit    1
    FAIL  [cron-bypass]       …/src/modules/cron/cron-raw.service.ts:1
    FAIL  [after-commit-db]   …/src/modules/reports/reports-hook.service.ts:5
  FAIL — 2 of 2 bypass site(s) not on the allowlist.
  EXIT = 1
  ```

- [x] Background jobs, cron sweeps and post-commit hooks are covered.

  The `cron-bypass` and `after-commit-db` rules above. Both fire on a real defect, both shown failing.

- [x] The check runs in CI and fails the build non-zero, not as a warning.

  Two steps added to the existing `backend` job in `.github/workflows/backend.yml`, immediately after Type Check:

  ```yaml
      - name: Placement Bypass Guard Self-Test
        run: pnpm check:placement-bypass:self-test

      - name: Placement Bypass Guard
        run: pnpm check:placement-bypass
  ```

  `pnpm` fails a step on a non-zero exit, and the check exits 1 on a violation and 2 on a broken pattern.

## Adversarial review round (2026-08-28) — the check was under-reporting

An independent verifier caught this ticket's own guard failing its central claim.

**The cron rule matched whole files, not sites.** `isCronBypass(src)` was `/\bthis\.db\b/.test(src) && !/forEachOrg|runIn(?:New)?TenantTransaction/.test(src)` — so a single guarded sweep anywhere in a file excused **every** bare `this.db` in it. Any cron service that guards some work and not the rest was invisible.

I had even watched this happen and misread it: when I wrapped the purge worker's legal-hold read in `runInNewTenantTransaction`, the reported `cron direct db` count went **1 → 0**, and I recorded that as an improvement. It was the rule going blind.

Rewritten to locate each `this.db.<method>` site and judge it by the block it sits in, using the `balanced()` scanner already in the file. The result:

```
                     before   after
Bypass sites found       40      71
  cron direct db          0      31
```

**31 sites in five files were invisible** — `cron-leave` (16), `cron-hr-engines` (4), `cron-recruitment` (3), `cron-notification-retention` (2), `cron-billing` (2). All five mix `forEachOrg` sweeps with bare `this.db.transaction` blocks. They belong to other sessions, so they are allowlisted as `PRE-EXISTING, UNAUDITED` with the site count and an instruction to migrate or justify — **not** asserted safe. Handed to their owners in [`CROSS-SESSION.md`](../sessions/CROSS-SESSION.md).

The purge worker's allowlist entry was **dead code** until now: the file-level rule never flagged the file, so the entry was never consulted. It now does real work.

New self-test case `cronBypassFoundWhenOnlySomeWorkIsGuarded` pins the exact blind spot, and a fresh failing run against that shape:

```
FAIL  [cron-bypass]  .../src/modules/cron/cron-new.service.ts:6
FAIL — 1 of 1 bypass site(s) not on the allowlist.
exit=1
```

This is the third time in this program a CI check under-reported on its first run. The lesson held.

## Known limits of this guard (red-teamed 2026-08-28)

A red-team was pointed at the check and told to break it. It did. These are recorded rather than hidden, because the criterion says *"every path"* and that claim is currently stronger than the implementation. Each was demonstrated with a real file and an exit code of 0.

**Text-scanner evasions — fixable, not yet fixed:**

| Evasion | Why it slips through |
|---|---|
| `const db = this.db; db.select()` | the regex requires the literal `this.db` prefix |
| `const { db } = this;` | same |
| `this.db?.select()` | the regex requires a bare `.`, not `?.` |
| `this.db["select"]()` | dot access only |
| `import { withIdentity as wi }` | the scanner searches for the literal string `withIdentity(` |
| `@NoTenantTransaction( )` with a space, or an aliased decorator | exact-string `includes()` |
| a cron-like service outside `src/modules/cron/**` | `isCron` is a path literal |
| **`forEachOrg(this.db, "(", …)`** | `balanced()` is not string-aware, so a `(` inside a string argument inflates the depth counter and the "guarded region" swallows code that is actually outside the guard — **the most dangerous of these** |

**Not fixable by text scanning at all — documented, not attempted:**
- `registerAfterCommit(() => this.doDbWork())` where the database access lives in a *called method*. Needs call-graph analysis.
- a closure defined inside a guard block but invoked later (`process.nextTick(fn)`) — textually inside, executes outside.

**False positives** in the same family: an annotation inside a mid-line comment or a string literal is flagged, because no scanner here is string- or comment-aware.

The honest summary: this guard is materially stronger than the one it replaced — 40 → 74 enumerated sites, and it now catches the partial-guard shape that hid 31 real cron sites — but it is a **text scanner**, and the list above is what that costs. It raises the floor; it is not a proof. Hardening it (string-aware `balanced()`, alias resolution, `@Cron(` detection) is the next increment and is the single highest-value follow-up on this ticket.

## Todo

- [x] Written against known-bad cases and shown failing before being run clean.
- [x] Matching is on the **call-site symbol**, not the import statement, so a re-export through `common/tenant/index.ts` or a bare side-effect import cannot hide a site.
- [x] **Allowlist counted: 20 entries covering 37 sites.** The 12 AI controllers share **one** glob entry with one reason (SSE: `pipeTextStreamToResponse` returns before the stream ends, so holding a request transaction open would commit while tools still run) rather than 12 copies of it. The rest are genuinely distinct pre-tenant paths: identity-scoped org discovery, sign-in membership reads, the placement lookup itself, and `runInNewTenantTransaction`'s own implementation.

  **Correction to this ticket's grounding:** it said 14 files under `modules/ai/**` carry `@NoTenantTransaction`. The real count is **12** AI files; 14 is the total across all modules (12 AI + notifications + organization), 17 uses. Verified against source.

- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
