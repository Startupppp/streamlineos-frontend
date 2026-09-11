# StreamlineOS Release Engineering

**Owner:** Platform Engineering  
**Last updated:** 2026-09-01  
**Applies to:** every production release of `streamlineos-api` (backend) and the Next.js frontend.

This document is an executable checklist, not a narrative. Every command named below exists in the codebase. A release that skips a step is not a release.

---

## 1. Pre-release gates (CI-enforced, must pass on main)

⚠ **CORRECTED — these two paths do not exist.** The real workflow files are `backend/.github/workflows/ci.yml` (typecheck, lint, build, unit tests, and the static `gates` job) and `backend/.github/workflows/db-gates.yml` (the gates that need a live database). Every table below is updated to cite the real file. A failing gate blocks merge.

### 1.1 Code and type correctness

| Gate | Command | CI file |
|---|---|---|
| TypeScript strict typecheck | `pnpm typecheck` | `ci.yml` (`verify` job, ci.yml:50) |
| Unit test suite | `pnpm test -- --runInBand` | `ci.yml` (`tests` job, ci.yml:101 — runs as plain `pnpm test`, not with `--runInBand`) |
| Controller e2e suite | `pnpm test:e2e:ci` | `db-gates.yml` (`bootstrapped` job, db-gates.yml:178 — gated `if: schedule \|\| workflow_dispatch`, not on every push; UNPROVEN per that job's own comment) |
| NestJS build | `pnpm build` | `ci.yml` (`verify` job, ci.yml:56) |
| Docker image build | `docker build -f backend/Dockerfile backend` | ⚠ not found in any workflow under `backend/.github/workflows/` — leaving as-is, not verified as wired; needs its own audit |

### 1.2 API contract and route safety

| Gate | Command | CI file |
|---|---|---|
| OpenAPI freshness | `pnpm openapi:check` | `ci.yml` (`gates` job, ci.yml:338) |
| Request-schema coverage | `pnpm check:openapi-coverage` | `ci.yml` (`gates` job, ci.yml:351) |
| Bodyless conflicts | `pnpm check:bodyless-conflicts` | `ci.yml` (`gates` job, ci.yml:363) |
| Unique operation IDs | `pnpm check:operation-ids` | `ci.yml` (`gates` job, ci.yml:359) |
| Route classification (zero undeclared) | `pnpm check:route-classification` | `ci.yml` (`gates` job, ci.yml:322) |
| Navigation permission keys | `pnpm check:navigation-permissions` | `ci.yml` (`gates` job, ci.yml:330-334 — blocking; a divergence fails the job, an absent frontend checkout reports as a tolerated warning via `run-gate.mjs`) |

### 1.3 Migration and schema discipline

| Gate | Command | CI file |
|---|---|---|
| Migration authoring discipline | `pnpm check:migration-discipline` | `ci.yml` (`gates` job, ci.yml:502) |
| Migration ledger vs journal | `pnpm check:migration-ledger` | `db-gates.yml` (`bootstrapped` job, db-gates.yml:120 — the live check needs a bootstrapped database; `ci.yml:822` runs only its self-test) |
| Migration chain integrity | `pnpm check:migration-chain` | `ci.yml` (`gates` job, ci.yml:498) |
| Cold bootstrap and catalog parity | `pnpm migration:proof` | `db-gates.yml` (`migration-proof` job, db-gates.yml:287) |

### 1.4 Security and access

| Gate | Command | CI file |
|---|---|---|
| Permission key catalog | `pnpm check:permission-keys` | `ci.yml` (`gates` job, ci.yml:311-315 — blocking, needs a frontend checkout; see the step's own comment) |
| Tenant index coverage | `pnpm check:tenant-indexes` | `ci.yml` (`gates` job, ci.yml:460) |
| Record-access soft-delete | `pnpm check:record-access` | `ci.yml` (`gates` job, ci.yml:439) |
| DataScope application | `pnpm check:scope-application` | `ci.yml` (`gates` job, ci.yml:435) |
| Log secret / rate-limit tier | `pnpm check:log-secrets` | `ci.yml` (`gates` job, ci.yml:570) |
| Placement bypass guard | `pnpm check:placement-bypass` | `ci.yml` (`gates` job, ci.yml:443) |
| Owner authority guard | `pnpm check:owner-authority` | `ci.yml` (`gates` job, ci.yml:447) |

### 1.5 Dependency supply chain

⚠ **CORRECTED — this section used to say "CI HANDOFF — not yet wired, see §7." That was false.** All three gates below are wired and blocking in `backend/.github/workflows/ci.yml`'s `gates` job — self-test then live check, guarded by `if: ${{ !cancelled() }}`, no `continue-on-error`: `check:vulnerabilities` at ci.yml:714-716, `check:licenses` at ci.yml:718-720, `check:feature-flag-governance` at ci.yml:722-724. §7.1's paste-this-YAML instructions are retired — see the note there.

| Gate | Command | Self-test |
|---|---|---|
| High/critical vulnerabilities | `pnpm check:vulnerabilities` | `pnpm check:vulnerabilities:self-test` |
| Disallowed licenses | `pnpm check:licenses` | `pnpm check:licenses:self-test` |
| Feature-flag governance | `pnpm check:feature-flag-governance` | `pnpm check:feature-flag-governance:self-test` |

### 1.6 Event and async consistency

⚠ **CORRECTED — this section used to say "CI HANDOFF — not yet wired, see §7." That was false.** `check:outbox-consumers` self-test and live check both run, blocking, in `backend/.github/workflows/ci.yml`'s `gates` job at ci.yml:686-688. `verify:rbac-integrity`'s self-test runs in the same job at ci.yml:690-692; its live probes — which need a real database — run, blocking, in `backend/.github/workflows/db-gates.yml`'s `bootstrapped` job at db-gates.yml:128-129 ("RBAC referential integrity (live probes)"). §7.2's paste-this-YAML instructions are retired — see the note there.

| Gate | Command | Self-test |
|---|---|---|
| Outbox consumer registry | `pnpm check:outbox-consumers` | `pnpm check:outbox-consumers:self-test` |
| RBAC referential integrity | `pnpm verify:rbac-integrity` | `pnpm verify:rbac-integrity:self-test` |

---

## 2. Environment validation

Run BEFORE booting or deploying the app. Validates all required env vars against the Zod schema in `src/config/env.validation.ts` without starting the application server.

```bash
pnpm validate:env
```

Required for production (`NODE_ENV=production`): `DATABASE_URL`, `APP_DATABASE_URL` (must differ from `DATABASE_URL`), `BACKEND_JWT_SECRET` (≥44 chars), `PORTAL_JWT_SECRET` (≥44 chars), `ENCRYPTION_KEY` (≥32 chars), `CORS_ORIGINS`, `APP_URL`, `CRON_SECRET`, `INTERNAL_API_SECRET`, `CONTACT_NOTIFICATION_EMAIL`.

If any required variable is absent or invalid, the command exits 1 with a clear error. The app itself performs the same check at boot via `ConfigModule`; this gate catches it before deployment traffic arrives.

Self-test (proves it bites on a bare environment):

```bash
pnpm validate:env:self-test
```

---

## 3. SBOM generation and artifact hashes

### 3.1 Software Bill of Materials

Generate a CycloneDX 1.4 SBOM from the lockfile before each release. The SBOM covers all dependencies (production + devDependencies).

```bash
pnpm sbom:generate
# Output: backend/sbom.json
# Stdout: sha256:<hex>
```

Retain `sbom.json` as a release artifact (attach to the GitHub Release, upload to the artifact store, or add to the Docker image layer). The SHA-256 printed to stdout is the content hash; record it alongside the release tag.

Self-test (proves the builder and SHA-256 work):

```bash
pnpm sbom:generate:self-test
```

### 3.2 Artifact hash manifest

After `pnpm build`, record SHA-256 hashes of every file in `dist/`:

```bash
pnpm build
pnpm artifact:record-hashes
# Output: backend/artifact-hashes.json
# Stdout: manifest-sha256:<hex>
```

Retain `artifact-hashes.json` with the release. On the receiving end (deploy host or Docker layer), re-run `pnpm artifact:record-hashes --dir=<mounted-dist>` and diff the manifests to verify reproducibility.

Self-test:

```bash
pnpm artifact:record-hashes:self-test
```

Build command for the orchestrator (do NOT run during parallel lane sessions — memory limit with 8 concurrent agents):

```bash
NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend build
```

---

## 4. Canary criteria

A release advances from canary to full rollout when ALL of the following hold for the canary cell after a minimum 30-minute soak:

- `pnpm -C backend e2e:smoke --url=<canary-url>` exits 0 (all domain groups pass)
- `pnpm -C backend cell:load` reports ≥40% headroom on CPU, memory, connection pool and queue depth
- `pnpm -C backend check:alert-ack` finds no unacknowledged critical alerts for the canary cell
- Zero 5xx responses in the canary cell's error rate for the soak window (check via `APP_RELEASE` tag in logs)
- p95 API latency below the budget recorded in `pnpm -C backend alert:p95:self-test`

If the canary regresses:

```bash
pnpm -C backend cell:rollout:regressed-canary
```

This marks the canary cell as regressed and prevents further rollout. Do not promote until the root cause is identified and a fix is deployed to a new canary.

---

## 5. Rollback criteria

Immediate rollback is required if ANY of the following occur during or after rollout:

- `pnpm -C backend e2e:smoke --url=<cell-url>` exits non-zero for two consecutive probes
- A P0 alert fires and is not resolved within 10 minutes of acknowledgement
- `pnpm -C backend cell:load` reports < 20% headroom (risk of OOM / connection exhaustion)
- Database error rate exceeds 1% of requests (visible in `pnpm -C backend alert:p95`)
- Any cross-tenant data leak confirmed (immediate, no grace period)

Rollback procedure:

```bash
pnpm -C backend cell:rollout:regressed-canary   # pause rollout
# Redeploy the previous tag via CI (re-run the deploy workflow at the prior commit)
pnpm -C backend e2e:smoke --url=<cell-url>       # confirm smoke passes on previous version
pnpm -C backend check:alert-ack                  # confirm alerts resolved
```

Record the rollback in the incident log with: trigger metric, time-to-detect, time-to-rollback, impacted cells.

---

## 6. Release notes and change ownership

Every release tag (`v*`) must have a GitHub Release with:

- **Change owner:** the engineer who authored the majority of changes (not the release engineer)
- **Summary:** one paragraph describing what changed and why (not a commit dump)
- **Breaking changes:** list any API contract changes, schema changes requiring downtime, or client-side changes
- **Migration note:** if `pnpm db:migrate` must run before or after traffic switches, say so explicitly
- **Known issues:** any P1s or regressions intentionally deferred with a link to the tracking ticket
- **Rollback note:** whether the release is forward-only (schema drops, data migrations without reversals)

Template:

```
## v<semver> — <one-line description>

**Change owner:** @<github-handle>
**Release engineer:** @<github-handle>

### What changed
<paragraph>

### Migration
[ ] Run `pnpm -C backend db:migrate` BEFORE switching traffic
[ ] Run `pnpm -C backend db:migrate` AFTER switching traffic
[ ] No migration required

### Breaking changes
- <list or "None">

### Known issues
- <list or "None">

### Rollback
- Forward-only: No (safe to roll back to vX.Y.Z)
- Forward-only: Yes — reason: <why>
```

---

## 7. CI wiring handoffs (orchestrator action required)

⚠ **CORRECTED — §7.1 and §7.2 below used to instruct pasting YAML into two files, `.github/workflows/backend.yml` and `.github/workflows/backend/ci.yml`, that do not exist in this repository.** Both sets of gates are already wired into the real workflow files — see the retraction notes in §1.5 and §1.6. There is nothing left to paste for either. §7.3 (SBOM generation and artifact-hash upload) is the one genuine handoff remaining in this section.

### 7.1 Vulnerability, license and feature-flag-governance gates — WIRED, see §1.5

These three gates run, blocking, in `backend/.github/workflows/ci.yml`'s `gates` job: `check:vulnerabilities` (ci.yml:714-716), `check:licenses` (ci.yml:718-720), `check:feature-flag-governance` (ci.yml:722-724, no `continue-on-error`). Nothing to paste.

### 7.2 Outbox consumer registry and RBAC referential integrity gates — WIRED, see §1.6

`check:outbox-consumers` (self-test and live check) runs, blocking, in `backend/.github/workflows/ci.yml`'s `gates` job at ci.yml:686-688. `verify:rbac-integrity`'s self-test runs in the same job at ci.yml:690-692; its live probes run, blocking, in `backend/.github/workflows/db-gates.yml`'s `bootstrapped` job at db-gates.yml:128-129. Nothing to paste.

### 7.3 SBOM and artifact hashes (post-build, paste into `backend` job after "Build")

```yaml
      - name: Generate SBOM
        run: pnpm sbom:generate

      - name: Record artifact hashes
        run: pnpm artifact:record-hashes

      - name: Upload SBOM artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom-${{ github.sha }}
          path: backend/sbom.json
          retention-days: 90

      - name: Upload artifact hash manifest
        uses: actions/upload-artifact@v4
        with:
          name: artifact-hashes-${{ github.sha }}
          path: backend/artifact-hashes.json
          retention-days: 90
```

---

## 8. Post-release smoke verification

After traffic is switched to the new release (all cells or canary cell):

```bash
pnpm -C backend e2e:smoke --url=<deployment-url>
```

This exercises every domain group (Access, RBAC, Module access, Invitations, Users, Organization, Org hierarchy, People directory, Business parties, Employee onboarding, Incoming transfer, Org setup). If any group fails, it prints which endpoints returned non-200 and exits 1.

For cell-by-cell rollout:

```bash
pnpm -C backend cell:rollout              # advance to next cell
# Wait for soak (≥30 minutes)
pnpm -C backend e2e:smoke --url=<cell-url>
pnpm -C backend cell:load                 # verify headroom
pnpm -C backend check:alert-ack           # confirm no unacknowledged alerts
# Repeat for each cell
```

For failure-mode verification after a deployment:

```bash
pnpm -C backend failure-drill             # inject controlled failures, verify alerts fire
pnpm -C backend failure-drill:self-test   # verify the drill logic itself, no live injection
```

Alert self-tests (no live system required, run anytime):

```bash
pnpm -C backend alert:queue-age:self-test
pnpm -C backend alert:pool-saturation:self-test
pnpm -C backend alert:tenant-cost:self-test
pnpm -C backend alert:dispatch:self-test
pnpm -C backend alert:dead-outbox:self-test
pnpm -C backend alert:dead-delivery:self-test
pnpm -C backend alert:sig-failures:self-test
pnpm -C backend alert:tenant-ctx-errors:self-test
pnpm -C backend alert:p95:self-test
pnpm -C backend alert:seam-latency:self-test
pnpm -C backend alert:cell-recovery:self-test
```

---

## 9. Schema and event compatibility

These checks are CI-enforced (§1.3) and available as runbooks for manual verification:

| Scenario | Command |
|---|---|
| Migration chain is intact | `pnpm -C backend check:migration-chain` |
| Migration ledger matches journal | `pnpm -C backend check:migration-ledger` |
| Migration authoring rules | `pnpm -C backend check:migration-discipline` |
| Outbox event types all have consumers | `pnpm -C backend check:outbox-consumers` |
| RBAC FK integrity | `pnpm -C backend verify:rbac-integrity` |
| Cold bootstrap (full migration from zero) | `pnpm -C backend db:bootstrap && pnpm -C backend db:migrate` |
| Schema comparison between cells | `pnpm -C backend cell:compare-schema` |

Before any release that includes a migration:

1. `pnpm -C backend check:migration-discipline` — verify no authoring violations
2. `pnpm -C backend check:migration-chain` — verify chain is intact and no gaps
3. `pnpm -C backend cell:compare-schema` — confirm schema is consistent across cells
4. Apply migration to staging, verify `pnpm check:migration-ledger` passes
5. Apply to production cells one at a time; verify after each

---

*Document owner: Platform Engineering. Update this file whenever a script is renamed, added, or removed.*
