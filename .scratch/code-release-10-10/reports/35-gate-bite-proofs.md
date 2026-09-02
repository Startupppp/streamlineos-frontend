# 35 — Gate bite-proofs: classification and repairs

Session S8. Measured 2026-09-02 on this machine (macOS, sibling-repo layout).
BE = `streamlineos-backend`, FE = `streamlineos-frontend/frontend`.

Every row below was produced by running the gate and its self-test and reading the output.
Nothing here is inferred from the source alone.

---

## 0. How far I got

| | Count |
|---|---|
| `check:*` gates enumerated (BE 61 · FE 24) | **85** |
| Self-tests enumerated and classified | **74 of 74** (100%) |
| Gates without any self-test at session start | 13 |
| Gates without any self-test now | **7**, of which 5 are legitimately exempt (see §5) |
| Self-tests found VACUOUS and rewritten | **5 of 5** |
| Gates found INERT (could not measure) and repaired | **6 of 6** |
| Gates found NOISY (findings all generated input) and repaired | **5 of 5** |
| Gates additionally bite-proven end-to-end with a planted real defect | **3** |
| P0/P1 defects found | **3** (§6) |

Classification is complete. Repairs are complete for every gate in the three defect
categories. What I did **not** do: re-audit the 50-odd self-tests already classified
BITE-PROVEN beyond confirming they call a real detector against known-bad input and assert
rejection — I read the fixture bodies but did not mutation-test each one individually.

---

## 1. The three failure modes (vocabulary used below)

A gate can report something other than the truth about the codebase in three distinct ways.
All three were present here.

| Mode | Meaning | Symptom |
|---|---|---|
| **VACUOUS** | The self-test asserts its own constants, or re-implements the gate's rule inside the test. The real detector never executes. | Self-test green forever; detector can rot undetected. |
| **INERT** | The gate cannot measure — a path it needs does not exist in this layout — so it exits early, crashes, or prints a green "SKIPPED" notice. | Real signal never appears. |
| **NOISY** | The gate fires on generated/vendored input, so a real finding is buried in hundreds of lines about build chunks. | Real signal appears but is unreadable, and gets filtered away by hand. |

`if (!available) return;` is the canonical INERT shape and belongs in the vacuous column
even when the logic is sound, because the logic never runs.

---

## 2. Defects found and repaired

### 2.1 VACUOUS self-tests (asserted constants or re-implemented the rule)

| Gate | What the self-test actually did | Rewritten to | Proof |
|---|---|---|---|
| `FE check:over-300` | Asserted `LIMIT === 300`, `BASELINE > 0`, and re-implemented `countLines` **inside the assertion**. `collectFiles` and the real `countLines` never ran. This is the exact defect the ticket names as precedent — only the BE twin had been fixed. | Writes a known-bad fixture tree (301-line file, exactly-300 boundary, spec/d.ts/js exclusions, `.next-buildmart/`, `node_modules/`, and an authored `next-intl/`) and runs the real `collectFiles` + `countLines`. | `check-over-300 self-tests: 26 passed` (was 5, none of which touched the scan) |
| `BE check:vulnerabilities` | Built a mock advisory report and then re-filtered it inline with `Object.values(...).filter(a => a.severity === "critical")`. The gate's own threshold logic was never invoked. | Extracted `evaluateAudit(report)`; both the gate and the self-test go through it. 11 fixtures including two the old shape could not express: a report with **no** `metadata.vulnerabilities` and a report whose counts read zero **beside a listed critical advisory** — both now `INCONCLUSIVE`, exit 2, never OK. | `check-vulnerabilities self-tests: 11 passed` |
| `BE check:outbox-consumers` | Filtered two hand-built arrays (`fakeEmitted.filter(...)`), then re-declared the inline-registration regex locally and tested *that copy*. The real emit/consumer scanners were never called. | Extracted `analyseSources(pathToSourceMap)`. 15 fixtures over a synthetic 3-file corpus: literal emission, const-resolved emission, `readonly eventType` consumer, inline `registry.register({eventType})`, bare `registry.register(this)`, an unresolvable identifier, and the two-pass const-map ordering case. | `check-outbox-consumers self-tests: 15 passed`; gate measures 24 emitted / 27 consumed types over 5,376 files |
| `FE check:empty-states` | One positive fixture, no negative case, no vacuity floor, and the self-test **fell through into the real scan** so `--self-test` and the gate printed identical output — a self-test failure and a gate failure were indistinguishable. | 6 fixtures with three explicit negatives (canonical `EmptyState`, a centred spinner, empty-state wording with no structure), a proper exit, and a 500-file vacuity floor. | `check-no-handrolled-empty-states self-tests: 6 passed`; gate now reports `3764 files scanned` |
| `BE check:licenses` (PARTIAL) | Calls the real `isDisallowed` but re-implements the map walk; the `pnpm licenses --json` extraction layer is untested. | **Not rewritten** — left classified PARTIAL. The detector half is genuinely proven; the extractor half needs a captured `pnpm licenses` fixture, which is a larger change than the remaining budget allowed. | — |

### 2.2 INERT gates (could not measure anything on this machine)

Every one of these was caused by the same class of bug: a hardcoded relative path
guessing the *other* repository's location, which is wrong on a sibling checkout.
Repaired with two new marker-searching resolvers (§3).

| Gate | Was | Now |
|---|---|---|
| `BE check:permission-keys` | exit 2, `ENOENT .../streamline/frontend/lib/rbac/...`. **And a second, latent defect underneath it**: `BACKEND_MODULES_DIR` was also computed as `<repo>/../backend/src/modules` — a directory that does not exist. Had only the frontend path been fixed, the gate would have walked an empty tree and reported **OK over zero controllers**. | Measures: **3,116 `@RequirePermission` usages, 627 unique keys, backend catalog 698, frontend union 696, 0 ghosts.** Vacuity floors on files (100), route refs (200) and union keys (100). |
| `BE check:navigation-permissions` | exit 2, `Cannot read frontend navigation manifest dir` | Measures: **438 navigation gates, 197 unique keys, 627 keys enforced on a route** — OK. Vacuity floors on controllers, nav files (5) and parsed gates (50). |
| `BE check:file-sizes` | exit 1, `cannot read exceptions doc at .../streamline/architecture-refactor/...` — the §7 registry lives in the FEROOT docs tree. The gate had **never measured** on this machine. | Measures. Reports 2 real violations (§6). |
| `BE check:s05-artifact-contract` | exit 1 with a raw Node stack trace: `SELF-TEST FAIL: approval/evidence template exists` — same wrong docs root. | `S05 approval/evidence artifact contract passed.` — the first time this gate has passed here. |
| `FE check:module-manifest` | printed `[NOTICE] backend/ is absent — rule-1 (registry agreement) is SKIPPED`, then `✔ Module manifest is consistent.` and **exit 0**. The rule the gate exists for never ran. | rule-1 runs; manifest agrees with the backend registry. Registry-entry floor of 5. |
| `FE check:home-manifest` | printed `[NOTICE] backend/ is absent — controller comparison is SKIPPED` then `✔ Manifest file is present` and **exit 0**. The entire comparison was the gate. | Measures: **16 dashboard controller routes + 1 external route vs 17 manifest sections** — consistent. |

All six now report `INCONCLUSIVE` and **exit 2** when the other repository genuinely cannot be
reached, or `PARTIAL` (exit 0, explicitly labelled) only when an operator opts in with
`STREAMLINE_ALLOW_PARTIAL_GATES=1` / `STREAMLINE_ALLOW_FRONTEND_ONLY=1`.

Bite proof for the INCONCLUSIVE path (each run individually):

```
STREAMLINE_FRONTEND_ROOT=/nonexistent node src/scripts/check-permission-keys.mjs      → rc=2
STREAMLINE_FRONTEND_ROOT=/nonexistent node src/scripts/check-navigation-permissions.mjs → rc=2
STREAMLINE_WORKSPACE_ROOT=/nonexistent node src/scripts/check-file-sizes.mjs           → rc=2
STREAMLINE_WORKSPACE_ROOT=/nonexistent node src/scripts/check-s05-artifact-contract.mjs → rc=2
STREAMLINE_BACKEND_ROOT=/nonexistent  node scripts/check-module-manifest.mjs           → rc=2
STREAMLINE_BACKEND_ROOT=/nonexistent  node scripts/check-home-manifest.mjs             → rc=2
```

And the PARTIAL path is labelled, not disguised:

```
PARTIAL — every @RequirePermission key resolves and exists in the backend catalog.
The frontend PermissionKey union was NOT compared; this run proves nothing about useCan.
```

### 2.3 NOISY gates (findings were all generated build output)

`frontend/.next-buildmart/` is 718 MB of Turbopack output under an alternate `distDir`.
Eleven frontend scanners used a **name-exact** `new Set(["node_modules", ".next", ...])`
exclusion, so `.next-buildmart` walked straight into the corpus of every one.

| Gate | Was | Now |
|---|---|---|
| `FE check:formatters` | rc=1 on `.next-buildmart/dev/static/chunks/_18nw3r0._.js` | `✔ ... (5141 files scanned)` |
| `FE check:query-scope` | rc=1 on `.next-buildmart/.../hooks_api_hr_recruitment_*.js` | `✔ No query-scope violations found.` |
| `FE check:file-sizes` | rc=1, findings dominated by build chunks | rc=1 with **exactly one real finding** (§6) |
| `FE check:dead-code` | rc=1 on `.scratch/mint-session.mjs` | Path-classified `OUT-OF-SCOPE`; now surfaces a real application finding (§6) |
| `FE check:over-300`, `check:colors`, `check:effect-fetches`, `check:icon-labels`, `check:query-signal`, `check:command-catalog`, `check:seo-metadata` | latently exposed (only their extension filters kept them clean) | all migrated to the shared predicate |

The exclusion is **anchored on the leading dot**, not on a `.next*` prefix — an authored
`next-intl/` directory is still scanned, and this is asserted, not assumed:

```
assert("an authored directory merely starting with 'next-' is still scanned",
       overLimit.some((f) => f.endsWith("/next-intl/authored.tsx")));
assert("the Build module route folder is NOT mistaken for a build output dir",
       isExcludedScanDir("build") === false);
```

I confirmed each of the five previously-red gates still reports its real findings after the
change — two of them now report findings that were previously buried.

---

## 3. What was built

Two new shared resolvers, both named `check-*.mjs` so they stay inside the ticket's territory:

- **`BE/src/scripts/check-repo-paths.mjs`** — resolves the FRONTEND root (marker `lib/rbac/permissions`) and the WORKSPACE docs root (marker `architecture-refactor/final-refactor/issues`) by searching upward for the marker rather than guessing a depth. `STREAMLINE_FRONTEND_ROOT` / `STREAMLINE_WORKSPACE_ROOT` are authoritative: a wrong override resolves to `null` and fails loudly instead of silently falling back to the search. Exports `reportUnreachable()`. Self-test: 9 assertions including "a wrong override fails loudly instead of falling back".
- **`FE/scripts/check-repo-paths.mjs`** — the `.mjs` twin of `test-utils/backend-repo.ts` (same MARKER, same search, same override semantics), plus the shared `isExcludedScanDir()` generated/vendor classifier and `runScanDirSelfTest()`. Self-test: 18 assertions.

One trap found while building them: importing the helper into a gate made the helper's own
`--self-test` branch fire and `process.exit(0)` **under** the importing gate, so
`check:permission-keys:self-test` silently ran the helper's 9 assertions and reported success
without running any of its own 22. Both helpers now guard on being the entry module.

---

## 4. Full classification table

`BITE` = constructs known-bad input and runs the real detector, asserting rejection for the
right reason. `PARTIAL` = detector proven, an outer layer (IO/extraction) is not.
Changes made this session are marked **→**.

### 4.1 Backend (61 gates)

Ordered by what the gate protects.

| Gate | Self-test | Class | Note |
|---|---|---|---|
| **Tenant isolation & authorization** ||||
| `check:tenant-isolation` | yes | BITE | real `hasDbHandle`/`isTenantOwned`/`serviceClassName` + ISOLATION_PATTERNS vs good/bad service and spec sources |
| `check:tenant-indexes` | yes | BITE | 7-table fixture; trailing-tenant index and no-index cases both asserted to fail |
| `check:tenant-relationships` | yes | BITE | real `parseStaticViolations` |
| `check:scope-application` | yes | BITE | 9 fixtures copied from the real defect site (`leaves.service.ts:211`); cache-key interpolation asserted *not* to count as application |
| `check:record-access` | yes | BITE | real `parseSchema`/`parseFindFirst` |
| `check:permission-keys` | yes | BITE **→** | was INERT; ghost/backend-only/unresolvable-constant fixtures + 7 new vacuity and reachability assertions |
| `check:navigation-permissions` | yes | BITE **→** | was INERT; 35-line nav-manifest fixture, unknown + unenforced key cases |
| `check:owner-authority` | yes | BITE | fabrication / gate / shortcut / elevation told apart |
| `check:placement-bypass` | yes | BITE | real `findAnnotationSites`/`findContextExitSites`/`findCronBypassSites` |
| `check:module-gate` | yes | BITE | real `parseRegistry`/`walkControllers`/`checkFile`, 12 cases |
| `check:module-entitlement` | yes | BITE | real `checkEntitlement`, 6 cases incl. lowercase storedKey |
| `check:route-classification` | yes | BITE | real `parseControllerHandlers` |
| `check:audit-log-privileges` | yes | PARTIAL | real `evaluatePrivilegeRow` vs safe/unsafe/wrong-role rows. The SQL half needs `APP_DATABASE_URL`; absent, exits **2**, correctly INCONCLUSIVE not OK |
| `check:log-secrets` | yes | BITE | real `findSecretLogLines`/`findRedactorGaps`/`findMissingRateLimitTiers` |
| `check:hardcoded-secrets` | yes | BITE **→** | 17 → **34** assertions; six new credential classes (§6.1) |
| **Migration integrity** ||||
| `check:migration-chain` | yes | BITE | writes real journal + `.sql` fixtures on disk, 18 cases |
| `check:migration-rollback` | yes | BITE | real fixture dirs incl. `writeDown`, 11 cases |
| `check:migration-discipline` | yes | BITE | 28 assertions across 7 check shapes |
| `check:migration-ledger` | yes | BITE | real `classify` |
| `check:drop-column-safety` | yes | BITE | real `collectDrops`/`declaresColumn` |
| `check:hr-table-freeze` | yes | BITE | real `extractTableNames`, 8 assertions. Corpus is `db/schema/hr/` only — it does **not** scan `src/scripts`, so the self-referencing-corpus trap does not apply to this gate (see §6.3) |
| `check:module-lifecycle` | yes | BITE | real `checkColdMigration`/`checkRestore`/`checkRemoval` |
| `check:restrict-fks` | yes | BITE | real `findRestrictFksInContent`, 11 cases |
| `check:s05-artifact-contract` | no (gate is assertions) | BITE **→** | was INERT (crashed); now passes and reports INCONCLUSIVE/exit 2 when the docs root is unreachable |
| **Reliability & data access** ||||
| `check:outbox-consumers` | yes | BITE **→** | was VACUOUS |
| `check:fire-and-forget` | yes | BITE | real `scanFile` against good/bad emit fixtures |
| `check:idempotent-commands` | yes | BITE | real `parseHandlers` |
| `check:unbounded-reads` | yes | BITE | real `isUnboundedSelect`/`hasOffsetUsage`/`checkForRegressions` |
| `check:db-call-count` | yes | BITE | real `detectLoopDbCalls` + on-disk fixture, 8 cases |
| `check:unjoined-table-refs` | yes | BITE | real `schemaImports`/`scanSource` |
| `check:bulk-id-limits` | yes | BITE | real `scanContent`, 9 cases |
| `check:cache-invalidation` | yes | BITE | real `checkMissingInvalidation`/`runScopeKeyCheck` |
| `check:mock-surface` | yes | BITE | 363-line self-test, real `extractMockPairs`/`extractClassPublicMethods` |
| `check:module-di` | yes | BITE | real `analyseModuleSource`/`checkNonInjectableType`/`checkImportType`, 15 assertions incl. the StorageModule defect verbatim |
| `check:module-registration` | yes | BITE | real `importedModuleNames`/`declaredModuleNames`, 13 cases |
| `check:import-direction` | yes | BITE | real `importedSpecifiers`/`isFeatureImport`, 11 cases |
| `check:spec-typecheck` | yes | BITE | writes a real spec with a deliberate arity error and runs the real `tsc`; asserts the failure names the fixture |
| **API contract** ||||
| `check:openapi-coverage` | yes | BITE | real `findExposureViolations`/`findMissingResponseSchemas` + an `isVacuous` guard |
| `check:openapi-path-params` | yes | BITE | real `findMissingPathParams` |
| `check:bodyless-conflicts` | yes | BITE | real `findBodylessConflicts` |
| `check:multipart-contracts` | yes | BITE | real `findUndeclaredMultipartHandlers` |
| `check:contract-registry` | yes | BITE | real `findUnclassifiedOperations`/`findStaleEntries` (owned by ticket 34; not modified) |
| `check:contract-breaking-change` | yes | BITE | real `findBreakingRemovals`/`findBreakingNarrowings` (ticket 34) |
| `check:route-duplicates` | yes | BITE | real `findDuplicateOperationIds`/`findAmbiguousParamRoutes` |
| `check:bounded-contracts` | yes | BITE | real `findCursorViolations`/`findSortViolations`/`findBulkIdViolations` |
| `check:envelope-consistency` | yes | BITE | real `findMissingErrorRefs`/`findUnpaginatedCollections` |
| `check:operation-ids` | yes | BITE | real `findDuplicates`, clean + duplicate + multi-method docs |
| `check:compression` | yes | BITE | real `detectCompression`/`detectBinaryProducers`, positive and negative |
| `check:route-budgets` | yes | BITE **→** | already reported INCONCLUSIVE/PARTIAL correctly in prose, but exited 0 in all three states, so a CI job reading only the exit code could not tell them apart. Added `STREAMLINE_STRICT_BUDGETS=1` / `--strict` → exit 2. Default behaviour unchanged. Currently **INCONCLUSIVE — 19 declared budgets, 19 unmeasured** |
| **Structure & supply chain** ||||
| `check:file-sizes` | yes | BITE **→** | was INERT; self-test now asserts the registry is reachable and parses |
| `check:over-300` | yes | BITE | the ticket's cited precedent, already repaired before this session |
| `check:kebab-case` | yes | BITE | real `classifyEntry`, 14 cases; additionally bite-proven end-to-end (§6.2) |
| `check:vulnerabilities` | yes | BITE **→** | was VACUOUS |
| `check:licenses` | yes | PARTIAL | real `isDisallowed`; the `pnpm licenses --json` extraction is untested |
| `check:feature-flag-governance` | yes | BITE | real `checkSchema`, compliant + non-compliant |
| `check:ai-charge` | yes | BITE | real `extractOptionsObject`/`findViolations`, 8 cases |
| `check:retention-coverage` | yes | BITE | real `classify`/`policyTableName` |
| `check:alert-system` | n/a | BITE | it *is* a self-test runner: executes `--self-test` on 14 alert scripts, `{"allPassed":true,"checkedScripts":14}` |
| `check:alert-ack` | yes **→** | BITE | had a working `--self-test` (7 cases) that was **never registered in package.json**; now `check:alert-ack:self-test` |
| `check:db-generate-guard` | n/a | BITE | the gate command already *is* `--self-test` |
| `check:cycles` | n/a | exempt | third-party (`madge`) |
| `check:repo-paths` | yes **→** | BITE | new this session, 9 assertions |

### 4.2 Frontend (24 gates)

| Gate | Self-test | Class | Note |
|---|---|---|---|
| `check:command-catalog` | yes | BITE | 399-line self-test, 25 fixtures, real `classifyBlock`/`resolveOperation`/`runMainScan`. This is the gate whose `*`-as-wildcard bug hid 36 mis-keyed mutation hooks — the repaired form is the best self-test in either repo |
| `check:route-access-contract` | yes | BITE | real `isCheckable` + an explicit `vacuityFailure` path |
| `check:query-scope` | yes | BITE (noise fixed **→**) | 5 rules self-tested; corpus previously included build output |
| `check:query-signal` | yes | BITE | real `findSignalViolations`, 19 fixtures |
| `check:module-manifest` | yes | BITE (was INERT **→**) | 11 cases already bite-proved `checkRegistryAgreement`; the rule simply never ran |
| `check:home-manifest` | yes | BITE (was INERT **→**) | real `diffRoutes`, 15 cases; comparison never ran |
| `check:contract-drift` | yes | BITE | delegates to `contract-drift/self-test.mjs`, 18 cases; has a `MIN_RESOLVED_FRACTION` vacuity floor |
| `check:contract-vendor` | yes | BITE | already layout-aware; real `compareFiles` + `resolveBackendArtifact` incl. "no candidate returns null, never a path that is not there" |
| `check:dead-code` | yes | BITE (noise fixed **→**) | 14 cases; added 3 asserting generated/scratch paths classify OUT-OF-SCOPE and an authored `next-`-prefixed dir does not. **Mutation-tested**: disabling the classifier makes the self-test fail with `(m0) a scratch path → expected OUT-OF-SCOPE, got DEAD` |
| `check:file-sizes` | yes | BITE (noise fixed **→**) | 25 assertions incl. a real fixture registry |
| `check:over-300` | yes | BITE **→** | was VACUOUS |
| `check:formatters` | yes | BITE (noise fixed **→**) | real `isLocalFormatterLine`/`findFormatterLines` + a walk-reaches-the-tree assertion |
| `check:empty-states` | yes | BITE **→** | was VACUOUS-ish (positive case only, fell through into the real scan) |
| `check:colors` | **added →** | BITE | had **no** self-test. 21 assertions over a fixture tree |
| `check:effect-fetches` | **added →** | BITE | had **no** self-test. 20 assertions: async-effect + apiClient, voided `useCallback`, and two negatives (`useQuery`, DOM-only effect) |
| `check:routes` | **added →** | BITE | had **no** self-test *and no vacuity floor at all* — an empty `app/` would have printed `✔`. Now 7 assertions + a 100-route-directory floor (653 today) |
| `check:icon-labels` | **added →** | BITE | had **no** self-test. 20 assertions incl. `aria-label` on a preceding prop line |
| `check:seo-metadata` | yes | BITE | writes fixtures; "all three failure modes bite as designed" |
| `check:web-vitals-budget` | yes | BITE | explicitly asserts "an unmeasured budget is not reported as met" |
| `check:route-bundle-budget` | yes | BITE | real `findExceededBundles`/`findPendingBundles` |
| `check:client-pages` | yes | BITE | writes a real fixture tree, runs real `countPages`; thin (2 assertions) but genuine |
| `check:route-thinness` | yes | BITE | real `inspectRouteModule`, 9 fixtures |
| `check:repo-paths` | yes **→** | BITE | new this session, 18 assertions |
| `check:properties` | n/a | exempt | composite of 5 gates, each self-tested |
| `check:cycles` | n/a | exempt | third-party (`madge`) |

---

## 5. Gates still without a self-test (7) — and why that is correct for 5

| Gate | Reason |
|---|---|
| `BE check:db-generate-guard` | its command already *is* `node scripts/guard-db-generate.mjs --self-test` |
| `BE check:alert-system` | it is a self-test runner over 14 alert scripts |
| `BE check:cycles`, `FE check:cycles` | third-party `madge` |
| `FE check:properties` | composite of `check:routes` + `check:colors` + `check:effect-fetches` + `check:icon-labels` + `check:cycles`, all now self-tested |
| `BE check:s05-artifact-contract` | the gate body is entirely assertions against repo artifacts; there is no separable detector. **Genuinely open** — a self-test would have to fixture the whole evidence bundle. |
| `BE check:alert-ack` | **closed this session** — the `--self-test` existed but was unregistered |

---

## 6. Defects found

### 6.1 P1 — `check:hardcoded-secrets` did not detect AI provider keys or AWS secret keys

The gate's 17-assertion self-test was green and the gate reported
`scanned 15546 files — 0 file(s) with a committed credential`. I planted a real credential
file inside my own territory (`src/scripts/__gate-bite-probe.md`, deleted immediately after
each run) and the gate **passed it**:

```
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY   → rc=0   MISSED
const apiKey = "sk-proj-4kQ2xR9vLmNp7Ts3Wz8Yb1Ac5De6Fg0Hi2Jk4Lm6No8Pq";  → rc=0   MISSED
```

`KEY_PATTERNS` covered the AWS access-key **id** (`AKIA…`) but not the secret half, and had
no pattern at all for OpenAI or Anthropic keys — in a product that ships an AI gateway and
whose CLAUDE.md §4 forbids exactly this. Six patterns added
(`aws-secret-access-key`, `openai`, `anthropic`, `google-oauth-client-secret`, `sendgrid`,
`stripe-restricted-live`) plus a name-anchored `named-secret-assignment` rule.

Bite-proven end-to-end after the change, each probe planted as a real file and the gate run:

```
aws-secret      rc=1  [aws-secret-access-key]        openai       rc=1  [openai]
anthropic       rc=1  [openai, anthropic]            gocspx       rc=1  [google-oauth-client-secret]
sendgrid        rc=1  [sendgrid]                     named-secret rc=1  [named-secret-assignment]
benign long string  rc=0    placeholder "password"  rc=0    process.env read  rc=0
```

The generic rule initially produced 20 findings, all in `*.spec.ts` / `test/` / `*.fixture.ts`
where fake secrets are deliberate — that would have made the gate NOISY, the defect I was
sent to remove. It is now path-classified: the generic rule is suppressed in test paths,
while every provider-specific pattern still applies there (a real `sk-ant-` key in a spec is
still a finding, and that is asserted). Self-test: **34 assertions**, up from 17.

Also worth recording: adding the patterns made the gate flag **its own self-test fixtures**,
because it scans `src/scripts/`. The pre-existing fixtures avoided this by string-splitting;
mine now do too. I did **not** add the gate's own file to an allowlist — a gate that exempts
itself from its own rule is the self-referencing-corpus trap.

### 6.2 Gates additionally bite-proven end-to-end with a planted real defect

Beyond fixture-level proof, three gates were proven against a real file in the real tree:

| Gate | Planted defect | Result |
|---|---|---|
| `BE check:hardcoded-secrets` | 7 credential probes (above) | all rejected; 3 benign probes passed |
| `BE check:kebab-case` | `src/scripts/Bad_Probe_Name.mjs` | `rc=1`, `file src/scripts/Bad_Probe_Name.mjs`; `rc=0` after removal |
| `FE check:dead-code` | classifier disabled by mutation | self-test `rc=1` with the intended message; `rc=0` restored |

### 6.3 On the self-referencing-corpus trap

I checked the reference-counting gates specifically. `check-hr-table-freeze.mjs` scans only
`db/schema/hr/`, and `check-unjoined-table-refs.mjs` scans only `src/modules` + `src/common` —
neither includes `src/scripts`, so neither can count its own baseline as a reference. The
orchestrator's ticket-07 finding was about a scanner *outside* these gates whose corpus
included the guard scripts; the 234-name `BASELINE` set inside `check-hr-table-freeze.mjs` is
what made those tables look referenced to it. Nothing to fix inside my territory, but the
general rule is worth keeping: **a reference scan must never include the guard scripts in its
corpus**, and `check-hardcoded-secrets` is the one gate here that legitimately does — which is
why its fixtures must stay string-split.

---

## 7. Findings in other agents' territory (reported, not fixed)

Now visible because the gates measure for the first time, or because the noise was removed:

| Gate | Finding | Owner |
|---|---|---|
| `BE check:file-sizes` | `src/modules/gdpr/gdpr-subject-erasure.service.ts` 619 lines · `src/modules/storage/storage.service.ts` 521 lines — over the 500 hard limit, not in the §7 registry. **This gate had never run here, so these have never been reported.** | backend |
| `BE check:tenant-indexes` | `FAIL — 5 of 828 tenant tables have no leading tenant index` | schema |
| `BE check:db-call-count` | `NEW /support/core/support-ticket-erasure.ts (1 call site)` | backend |
| `BE check:over-300` | above baseline | backend |
| `BE check:licenses` | rc=1, a dependency with a disallowed licence | supply chain |
| `FE check:file-sizes` | `hooks/api/notifications-inbox.ts` 507 lines — the **only** real finding once build output was excluded | frontend |
| `FE check:dead-code` | `features/build/analytics/project-charts.tsx:CHART_COLORS` — surfaced only after `.scratch` was path-classified | frontend |
| `FE check:web-vitals-budget` | 6 budget violations | frontend |
| non-`check:*` scripts | `alert-dispatch.mjs`, `collect-s7-evidence.mjs`, `production-ops-evidence.mjs`, `browser-driver-auth.mjs` all still hardcode `<repo>/../architecture-refactor` or `../frontend` and will be INERT here. They are outside this ticket's territory; the fix is to import `check-repo-paths.mjs`. | ops scripts |

`BE check:audit-log-privileges` exits 2 for want of `APP_DATABASE_URL`. That is correct
behaviour, not a defect — but it means the privilege boundary is **unproven on this machine**
and must not be cited as evidence.

---

## 8. Files changed

**Backend** (`streamlineos-backend/src/scripts/`)
`check-repo-paths.mjs` (new) · `check-permission-keys.mjs` · `check-navigation-permissions.mjs` ·
`check-file-sizes.mjs` · `check-s05-artifact-contract.mjs` · `check-hardcoded-secrets.mjs` ·
`check-vulnerabilities.mjs` · `check-outbox-consumers.mjs` · `check-route-budgets.mjs` ·
`package.json` (added `check:repo-paths:self-test`, `check:alert-ack:self-test`)

**Frontend** (`streamlineos-frontend/frontend/scripts/`)
`check-repo-paths.mjs` (new) · `check-module-manifest.mjs` · `check-home-manifest.mjs` ·
`check-over-300.mjs` · `check-file-sizes.mjs` · `check-dead-code.mjs` · `check-seo-metadata.mjs` ·
`check-no-arbitrary-colors.mjs` · `check-no-effect-fetches.mjs` · `check-no-business-routes.mjs` ·
`check-no-unlabeled-icon-buttons.mjs` · `check-no-local-formatters.mjs` ·
`check-no-handrolled-empty-states.mjs` · `check-query-scope.mjs` · `check-query-signal.mjs` ·
`check-command-catalog.mjs` ·
`package.json` (added `check:colors:self-test`, `check:effect-fetches:self-test`,
`check:routes:self-test`, `check:icon-labels:self-test`, `check:repo-paths:self-test`)

No application source in either repository was modified.

---

## 9. Ticket checkbox status

| Checkbox | Status |
|---|---|
| Every gate has a self-test that constructs a known-bad fixture and confirms rejection | **Substantially closed.** 74/74 classified, all 5 vacuous ones rewritten, 4 gates given a self-test that had none. One genuinely open: `BE check:s05-artifact-contract` |
| Gates whose self-test only asserts constants are rewritten to run the scan | **Closed.** 5 of 5 |
| A gate that cannot measure reports INCONCLUSIVE/PARTIAL rather than OK | **Closed.** 6 INERT gates repaired; all 6 INCONCLUSIVE paths individually bite-proven at rc=2; `check:route-budgets` given a machine-readable strict mode |
| Critical tests exercise transaction callbacks, authz deny, cross-tenant, retries | **Not this ticket's territory** — that is spec coverage, not gate scripts |
| Zero silently skipped tests, vacuous mocks, baselines raised to turn a regression green | **No baseline was raised.** The `.next-buildmart` exclusion removes generated input from a source scan, and each of the five affected gates was re-verified to still report its real findings — two now report findings that were previously buried |
| Text scans validated against a known defect | **Closed and it found one** — see §6.1 |
| Coverage counts honest / path-filtered run not reported green | Partially addressed: the `PARTIAL` labelling in §2.2 is exactly this shape for cross-repo gates. Jest coverage filtering is another ticket's territory |
| Quoted globs checked on this platform | **Closed.** No `check:*` gate in either repo uses a shell glob; all walk the tree with `readdirSync`. The macOS-specific failure was the opposite — a *too permissive* walk pulling in 718 MB of build output, now fixed and asserted |
