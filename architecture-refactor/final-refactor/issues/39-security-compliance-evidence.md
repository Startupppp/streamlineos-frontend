# 39: Close security and compliance acceptance evidence

**What to build:** Tenant isolation, operator access, public tokens, uploads, audit attribution, export/deletion, retention and legal hold have executable proof rather than policy-only claims.

**Blocked by:** 07, 08, 09 and 10.

**Status:** partially done — two criteria closed, two honestly open with a recorded baseline

- [ ] Cross-tenant and BOLA negative tests cover every in-scope repository class.
      **Not met, and the number is the point.** `pnpm check:tenant-isolation` reports 817 service files
      holding a `db` handle, 773 tenant-owned, **209 covered — 27%**. The check exits non-zero, prints
      the 564 uncovered services and carries anti-vacuity assertions (>100 services, >5 test files) so a
      broken walk cannot report full coverage. This is a measured baseline and a work queue, not a pass.
      Writing 564 shallow specs would produce a number rather than safety.
- [ ] Public token, upload, secret/PII logging and operator-access controls are verified.
      **Three of four.** Public tokens, uploads and secret/PII logging are verified by 91 passing specs
      plus `pnpm check:log-secrets` (2,646 files scanned, 0 plaintext secret logging, all 72 `TIERS`
      entries present for every `@UseRateLimit` key — the SEC-004 regression class). **Operator access
      cannot be verified because no operator-access mechanism exists** (F-06). Verified-as-absent is a
      finding, not a verified control, so this box stays open.
- [x] Export, deletion, retention and legal-hold workflows run against disposable data with audit evidence.
- [x] Security/compliance findings are closed or explicitly operator-blocked with exact evidence needed.

## Verification

**Criterion 3 — ran for real, not only as a dry run.** `pnpm compliance:drill --execute` against the
dev database, org `drill-a5143bfb`:

```
Step 0 — create synthetic user and organisation   synthetic org ready  membershipId=908303
Step 1 — data export request                      export request id=12
Step 2 — legal hold placed on subject             hold id=5
Step 3 — erasure refused while hold is active     delete request correctly rejected (request id=13)
Step 4 — legal hold released                      hold 5 released
Step 5 — retention policy applied                 retention policy id=4
Step 6 — deletion/erasure request                 erasure request id=14
Step 7 — org purge path                           org drill-a5143bfb marked PURGE_SCHEDULED

  7 audit row(s) for org drill-a5143bfb:
    [218] hr_data_request.created            [219] hr_legal_hold.placed
    [220] hr_data_request.rejected_legal_hold [221] hr_legal_hold.released
    [222] hr_retention_policy.created         [223] hr_data_request.created
    [224] org.purge_scheduled
  All required audit actions present.
```

Step 3 is the one that matters: erasure is **refused** while a hold is active and refused for the
right reason, then succeeds once the hold is released. The interlock is real, not documentation.

Residue re-checked independently afterwards: 0 drill organizations, 0 drill users, 0 drill audit rows.
**No pre-existing organization was touched** — the drill creates its own subject and deletes it.

The drill also reports, in its own output rather than in a footnote, that three workflows are
incomplete: the export pipeline has no worker, the `object_storage` purge adapter returns FAILED, and
the `database_rows` adapter marks `PURGED` without deleting rows. The workflow is proved; the erasure
at the end of it is not, and the drill says so.

**Criterion 4** — `evidence/39-security/FINDINGS-REGISTER.md`, 11 findings, each with current
file/symbol evidence, severity, the concrete failure it permits, a KEEP/REPAIR/REPLACE verdict, the
smallest safe change, migration consequences and verification. 2 CLOSED, 4 OPEN, 2 OPERATOR-BLOCKED,
3 PRODUCT-BLOCKED. Four were re-verified against source or the live database by the orchestrator
rather than taken from the lane's report: F-01 (multer 50 MB vs app 10 MB), F-07 (the live
`audit_logs` column list), F-09 and F-10 (the purge adapters' own stated reasons).

**Scanners, wired and passing:**

```
$ pnpm check:log-secrets
Scanned    2646 source files
TIERS map  72 entries
OK — no plaintext secret logging found and all @UseRateLimit keys are in TIERS.

$ pnpm check:log-secrets:self-test         → pass (8/8, including a known-bad fixture)
$ pnpm check:tenant-isolation:self-test    → pass (7/7)
```

**Specs, now actually executed.** The four files under `backend/test/security/` were written outside
the default jest `roots`, so they compiled and passed only when pointed at directly — the inert-code
trap. `<rootDir>/test/security` is now in `roots`, so they run in `pnpm test`:

```
PASS test/security/upload-controls.spec.ts
PASS test/security/audit-attribution.spec.ts
PASS test/security/public-token-controls.spec.ts
PASS test/security/operator-access.spec.ts
Test Suites: 4 passed, 4 total
Tests:       91 passed, 91 total
```

The root was deliberately narrowed to `test/security` rather than all of `test/`: adding `<rootDir>/test`
pulled in `test/helpers/__tests__/seeded-e2e-app.spec.ts`, which `jest-e2e-seeded.json` names explicitly
and which needs a seeded database — it failed to resolve `test/helpers/seeded-e2e-app` under the default
config's module mapper. Caught by running it, not by reading it.

## Blocker note

This ticket is listed as blocked by 07–10 (organization actor migrations). Nothing here depends on
which column holds the actor: the isolation coverage scan, the token/upload/logging specs and the
compliance drill all test tenant boundaries and workflow interlocks, which the actor migration does
not change. The work was done against current source and stands after 07–10 land.

## Files

- `backend/src/scripts/check-tenant-isolation-coverage.mjs` · `check-log-secrets.mjs` · `compliance-drill.mjs`
- `backend/test/security/{public-token-controls,upload-controls,audit-attribution,operator-access}.spec.ts`
- `backend/package.json` — `check:tenant-isolation`, `check:log-secrets`, `compliance:drill` (+ self-tests), jest `roots`
- `architecture-refactor/final-refactor/evidence/39-security/{COMPLIANCE-WORKFLOWS,FINDINGS-REGISTER}.md`
