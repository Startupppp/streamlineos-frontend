# E-sign (electronic signature) — dedicated current-head certification

**This is a local co-located scratch-database certification, not deployed evidence.** It replaces
reliance on **incidental test selection**: until now e-sign had no dedicated acceptance record and
was only ever exercised as a by-product of broader suite runs. This certifies the e-sign module
(`backend/src/modules/e-sign/**`, 13 tenant schema files under `db/schema/e-sign/`) as its own
surface at current head.

## 1. Run identity

| Field | Value |
| --- | --- |
| Operator | unattested — executed by an automated agent. No named human operator. |
| Date | 2026-09-09, local (IST) |
| Host / DB | Windows 11, PostgreSQL **18.6** on `127.0.0.1:5432`; `scratch_local` (10 orgs, 592 users), journal head **708/708** |
| Backend HEAD | **`8a6737df2`**, working tree dirty (see the KB certification §1); no git command run |
| Email safety | `jest-e2e-setup.ts` sets `NODE_ENV=test` and **deletes `ZEPTOMAIL_TOKEN` / `RESEND_API_KEY`** from the environment, so the app-booting e2e cannot send real mail even though `EMAIL_PROVIDER=zeptomail` in the env file. The signing-flow e2e additionally overrides `SignNotificationsService` and `StorageService` with mocks. No real email or object-storage write occurred. |
| DB pinning | e2e run with `--env-file=D:\localstack\backend-local.env` (DATABASE_URL = `scratch_local`); `dotenv/config` does not override pre-set vars, so the run never touched a remote/Neon DB. |

## 2. Commands run, with real exit codes

| # | Command | Exit | Headline |
| --- | --- | --- | --- |
| 1 | `jest modules/e-sign/` unit (ignore `.db`/`.e2e`) | **0** | **16 suites / 129 tests pass** |
| 2 | `jest test/security/bola/bola-esign*` | **0** | **2 suites / 59 tests pass** |
| 3 | `jest --config jest-e2e.json --testPathPattern="e-sign.*e2e-spec"` (DB `scratch_local`) | **0** | **2 suites / 168 tests pass** |
| 4 | `db:verify-rls` (from the KB run) | **0** | RLS VERIFIED — covers e-sign tables |
| 5 | `check-tenant-relationships` (from the KB run) | **0** | 0 actionable single-column tenant FKs — covers e-sign tables |

Total e-sign-specific dynamic coverage: **356 tests** + 2 structural gates that include the e-sign
schema, all green.

## 3. What is certified

**Schema / tenant integrity.** 13 tenant schema files — `envelopes`, `recipients`, `fields`,
`documents`, `certificates`, `audit`, `templates`, `public-forms`, `settings`, `signature-assets`,
`watermark`, `bulk-send`, `enums`. RLS coverage and composite-FK integrity for these tables are
proven by the two global gates (cmd 4, cmd 5), which sweep every in-scope tenant table and FK and
found e-sign clean.

**State machine.** `sign-state.spec.ts` pins the envelope/recipient state transitions (the legal
lifecycle: draft → sent → viewed → signed/declined/voided → completed).

**Authorization & tenant isolation (BOLA is the #1 risk).** Certified across three layers:
- Service-layer cross-tenant deny — `e-sign-services-tenant-isolation.spec.ts`,
  `esign-inventory-tenant-isolation.spec.ts`, `esign-delete-tenant-isolation.spec.ts`,
  `sign-integrations-tenant-isolation.spec.ts`, `sign-public-form-tenant-isolation.spec.ts`.
- Envelope-scope & 404-contract — `bola-esign-envelope-children-404.spec.ts` (the three envelope-child
  list routes that returned an empty `200` for another org's id now answer a uniform `404`, never a
  `403`, never an empty `200`), `bola-esign-scope-sweeps-and-token.spec.ts`,
  `sign-envelope-get-authz.spec.ts`, `sign-envelopes-list-scope.spec.ts`,
  `sign-certificate-download-scope.spec.ts`.
- HTTP auth/RBAC — `e-sign-auth-rbac.e2e-spec.ts` over the real app (cmd 3).

**Public signing flow.** `e-sign-signing-flow.e2e-spec.ts` (cmd 3) exercises the recipient-facing
signing path end to end against a booted app; `sign-public-preview-authentication.spec.ts` proves
the public preview is authenticated.

**Money / limits / lifecycle.** `sign-envelopes-plan-limits.spec.ts` (the `signEnvelopes` limit key
is asserted before insert), `sign-expiration-sweep-bulk.spec.ts` (bounded bulk expiry sweep),
`sign-integrations-after-commit.spec.ts` (side effects deferred to after commit, never on the dead
request handle), `sign-envelope-completed-consumer.service.spec.ts`.

**Secret handling.** `sign-settings-secret-projection.spec.ts` proves integration secrets are not
projected back through the settings surface.

**Template governance.** `sign-template-restrictions.spec.ts`.

## 4. What this run does NOT claim

- **Not deployed evidence.** Local PostgreSQL 18.6, not Neon, not a cell.
- **Not a clean-tree attestation.** HEAD `8a6737df2` with a dirty working tree; no git command was run.
- **No e-sign `.db.spec.ts` exists** — the module has no dedicated live-DB spec suite; its tenant/RLS
  integrity rests on the two global gates plus the service-layer isolation specs, not an e-sign-owned
  live-DB harness. If a first-class e-sign live-DB harness is wanted, it does not exist yet.
- Real PDF rendering, watermarking and object-storage writes are stubbed in the e2e (StorageService
  mocked); the *provider* side of signing (real PDF finalization to R2) is deployment-gated, not
  certified here.
- **Lint and typecheck were not run** — reported as not run, never as passing.
- Deployment/legal items (retention, legal-hold, Privacy/Legal approval of the e-sign audit trail)
  remain register **D03/D06/D08** work and are not closed here.
