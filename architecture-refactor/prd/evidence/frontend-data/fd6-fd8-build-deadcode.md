# FD6 + FD8 — Build/Type Baseline and Dead Code Evidence

Measured: 2026-09-12. Source tree: `frontend/` at HEAD (`main`).
Coordinator build is running concurrently — this agent ran no `next build` or `pnpm build`.

---

## TASK A — FD6 Build/Type Baseline

### A1. Webpack cache: why disabled and tradeoff

**Location:** `frontend/next.config.ts:53-56`

```ts
webpack(config, { dev }) {
  if (!dev) config.cache = false;
  return config;
},
```

**Why it was disabled:** Commit `510205f4b` (`chore: enhance next.config.ts with webpack
optimizations; modify build script in package.json for memory management`) added both
`webpackBuildWorker: true` + `webpackMemoryOptimizations: true` (experimental) and
simultaneously disabled the filesystem cache. The MEMORY.md notes in the project record
Windows-specific memory-pressure events (OOM/ECONNRESET on Postgres under load, the
typecheck requiring `--max-old-space-size=8192`). The `buildwp.log` confirms the cache is
absent in production: webpack ran cold and completed in **7.9 min** with no cache-hit
messages. The simultaneous addition of `webpackMemoryOptimizations` and the `--max-old-space`
build script confirms the intent was memory reduction, not speed.

**Tradeoff:** With cache disabled, every production build is cold. The last measured cold
build took 7.9 min (466 static pages, 11 workers). A warm filesystem cache can reduce
incremental builds significantly, but on memory-constrained machines (especially Windows
under concurrent tsc/pnpm load) the cache serialisation and in-memory chunk cache can spike
RSS above available RAM. Enabling it without first measuring available headroom during a
concurrent typecheck run risks the same OOM events already documented in MEMORY.md.

**Recommendation: KEEP** until a production build environment with measured headroom is
available. Re-enable only after confirming that a warm build + concurrent 8GB tsc does not
exhaust available memory. This is not a correctness issue; it is a build-time tradeoff.

### A2. Test typecheck gate — mechanism and current state

**tsconfig.json exclude list** (`frontend/tsconfig.json:40-49`):

```json
"exclude": [
  "node_modules", "drizzle", "scripts", ".next/dev/types",
  "**/__tests__/**",
  "**/*.test.ts", "**/*.test.tsx",
  "**/*.spec.ts",  "**/*.spec.tsx"
]
```

All test files — currently 338 spec/test files (documented in the script) — are invisible
to `pnpm type-check`. Jest runs through SWC which erases types; a spec can call a deleted
method and the suite reports green.

**Gate:** `scripts/check-test-typecheck.mjs` (script: `check:test-typecheck`).
Reads `tsconfig.test.json`, which is `tsconfig.json` with the four test globs dropped from
`exclude` plus `files: ["jest.setup.js"]` to load `@testing-library/jest-dom` globals.
Baseline is **0** (hard gate, not a ratchet).

**Current state: BROKEN — gate crashes.**

```
Command: node scripts/check-test-typecheck.mjs
Exit code: 1 (CRASH — no parseable diagnostics)
Output:
  check-test-typecheck: tsc exited 1 with no parseable diagnostics. That is a CRASH, not
  a clean tree — an out-of-memory tsc prints nothing and greps as zero errors.
  error TS5058: The specified path does not exist: 'tsconfig.test.json'.
```

`tsconfig.test.json` does not exist at `frontend/tsconfig.test.json`. The script treats a
crash as a failure (exit 1), so the gate does not silently pass — but it also does not
provide type coverage. The gate IS wired into CI (see A4), so the CI job currently fails on
this gate. **No test files are typechecked.**

What it does NOT cover even when healthy: scripts under `frontend/scripts/` (also excluded
from `tsconfig.json`) and `.mjs` files (the tsconfig `include` lists `.ts`/`.tsx`/`.mts` only).

**Fix required:** Create `frontend/tsconfig.test.json` that extends `tsconfig.json`, drops
the four test globs from `exclude`, and adds `files: ["jest.setup.js"]`. The script's own
comment at lines 148-208 describes the exact shape and includes a self-test that validates
the wiring.

### A3. Bundle and web-vitals budget scripts

#### `check-route-bundle-budget.mjs` — REPLAY gate

- Reads `contracts/route-bundle-manifest.json`.
- Requires `manifest.buildId === .next/BUILD_ID` (provenance guard).
- **Can run without a fresh build IF the manifest was measured from that build.**
- Current state: the committed manifest has **no `buildId` field** (`buildId: undefined`).
  The `.next/BUILD_ID` on disk is `ZZp6BSSfUy9NLjxj_wX_Z`. Provenance status: `unrecorded`.

```
Command: node scripts/check-route-bundle-budget.mjs
Exit code: 1
Output:
  check-route-bundle-budget: FAIL — manifest is not usable evidence (provenance: unrecorded).
  PROVENANCE — the manifest records no buildId, so there is no way to tell which build it
  measured. Re-run the bundle measurement, which stamps .next/BUILD_ID into the manifest.
  No budget verdict is reported from it.
```

**The gate is currently BROKEN** — it fails because the committed manifest carries no
`buildId`. It covers only **13 routes** (of 466 in the app). It is a replay gate and
cannot enforce budgets for the other 453 routes.

Committed baseline: `frontend/contracts/route-bundle-manifest.json` — 13 routes, `defaults`
with 9 budget keys, no `buildId`, routes include `/mail`, `/inbox`, `/build/inbox`, etc.
`measuredFirstLoadJsBytes` ranges from ~274 KB to ~320 KB gzip-9 in the current manifest.
`budgetExceptions` key exists with entries.

#### `measure-route-bundles.mjs` — BUILD REQUIRED

- Reads `.next/` client-reference manifests (per-route `page_client-reference-manifest.js`).
- **Cannot run without a production build artifact.** Requires `pnpm build` first.
- Command: `pnpm build && node scripts/measure-route-bundles.mjs --write`

#### `check-web-vitals-budget.mjs` — BROWSER-DRIVER REQUIRED

- Reads `.browser-driver-results.json` (default path).
- **Cannot run without the browser driver first.** File is not committed.

```
Command: node scripts/check-web-vitals-budget.mjs
Exit code: 2
Output:
  check-web-vitals-budget: results file not found: .browser-driver-results.json
  Run the browser driver first or supply --results=<path>
```

Budgets are defined inline in the script: mobile LCP p75 ≤2500ms, INP p75 ≤200ms, CLS p75
≤0.1, FCP p75 ≤1800ms, TTFB p95 ≤600ms; desktop LCP p75 ≤1500ms, INP p75 ≤200ms, CLS p75
≤0.1, FCP p75 ≤1200ms, TTFB p95 ≤400ms. Exceptions are annotation-only (do not change exit
code). Historical evidence: `architecture-refactor/final-refactor/evidence/42-production-ops/
release-authority/WEB-VITALS-CAPTURE-2026-09-04.md`.

### A4. check:gate-wiring output

```
Command: node scripts/check-gate-wiring.mjs
Exit code: 0
Output:
  check-gate-wiring: 37 gates, 34 of them able to FAIL the job (3 registered non-blocking),
  all invoked by a run: step of a reachable job (54 run steps across 6 jobs in 1 workflow
  files, all 1 reachable, 0 deliberate exceptions).
```

All 37 gates are wired. This confirms `check:test-typecheck` IS wired — its current CRASH
failure therefore blocks the CI job.

---

## TASK B — FD8 Dead Code and Folder Seams

### B1. check-dead-code result

```
Command: node scripts/check-dead-code.mjs
Exit code: 0
```

Summary:
- knip findings scanned: 221 of 221 (100%)
- Module graph: 6003 files walked and read (100%)
- knip raw: `dependencies=1 devDependencies=2 duplicates=16 exports=29 files=2 types=171`
- DEAD: **0 files, 0 exports**
- UNCLASSIFIED: **0**
- Baseline: files=0 exports=0 | Current: files=0 exports=0
- Result: **PASS: dead code within baseline.**

No DEAD or UNCLASSIFIED findings. The gate is a hard gate at zero.

### B2. knip findings breakdown

knip was invoked by check-dead-code.mjs (`pnpm exec knip --no-progress --reporter json`).
Findings by group:

| Group | Count |
|---|---|
| dependencies | 1 (sharp) |
| devDependencies | 2 (tailwindcss, @tailwindcss/typography) |
| duplicates | 16 (per-route schema alias groups) |
| exports | 29 |
| files | 2 |
| types | 171 |
| **Total** | **221** |

### B3. Classification of all findings

**CONFIRMED-DEAD: none.** Every finding classified as one of the following:

#### KEEP-BY-DESIGN — 31 entries

**Dependencies (CSS/runtime-loaded — no JS import possible):**
| Key | Reason summary |
|---|---|
| `dep:sharp` | Next.js loads it at runtime by name; adding an import would break it |
| `dep:tailwindcss` | Loaded via CSS `@import "tailwindcss"` — knip cannot see CSS @import |
| `dep:@tailwindcss/typography` | CSS `@plugin "@tailwindcss/typography"` — same CSS-only reason |

**Buffered API hooks kept beside streaming counterparts** (would break live routes if deleted):
- `hooks/api/kb/page-ai.ts`: `useKbPageImprove`, `useKbPageSuggestRelated`
- `hooks/api/kb/article-ai.ts`: `useKbArticleAsk`, `useKbArticleImprove`, `useKbArticleSuggestRelated`
- `hooks/api/meetings-ai.ts`: `useMeetingFollowUp`

**Per-route schema seam aliases — `duplicates` group** (16 groups, CLAUDE.md forbids removing boundary validation):

These are `one row contract + per-route alias` patterns. Each alias is a distinct Zod `z.infer` shape at a specific API seam; collapsing them would erase the per-route validation boundary. Verified: each alias is consumed at a distinct `apiClient` call site.

Files affected: `hooks/api/accounting/planning-schema.ts`, `hooks/api/accounting/settings-schema.ts`,
`hooks/api/accounting/assets-schema.ts`, `hooks/api/accounting/taxes-schema.ts`,
`hooks/api/payments-schema.ts`, `hooks/api/blog-schema.ts`,
`hooks/api/support/support-channel-schema.ts`, `hooks/api/party/party-schema.ts`,
`hooks/api/hr/engagement-schema.ts` (3 groups), `hooks/api/hr/leave-policies-schema.ts`,
`hooks/api/hr/policies-schema.ts`, `hooks/api/hr/letters-schema.ts`,
`hooks/api/hr/workforce-schema.ts`, `hooks/api/hr/recruitment/jobs-schema.ts`

The last group (`jobs-schema.ts`) is reached via `lazyContract`'s dynamic `import()` — which
is outside knip's static graph. Verified by grep before the verdict was written.

**Command catalog exported types** (keyof unions for consumers that don't import the full catalog):
- `lib/command-catalog.ts`: `NotificationCommandName`, `ChatCommandName`, `CommandDomain`

**Lead type aliases** (`z.infer` member shapes, reached by indexing — never imported by name):
- `types/leads.ts`: `LeadBoardColumn`, `SlaAlert`

**Re-exported type** (stable import path after consolidation):
- `lib/expense-constants.ts:ReceiptFileKind`

#### RETAINED-BY-CONTRACT — 158 entries

All types in `hooks/api/**` from live (non-knip-dead) modules — type erasure at the API
boundary means hooks' inferred return types are never imported by name.

#### RETAINED-BY-CONVENTION — 43 entries

- Next.js filesystem convention files (page.tsx, layout.tsx, etc.)
- `scripts/` directory files (standalone executables, not modules)
- `test-utils/` exports (available for future test suites)

#### EXCLUDED — 13 entries

CRM/Inventory exports — outside current PRD scope.

### B4. Duplicate types — consolidation candidates

The `duplicates` group (16 groups) represents Zod contract aliases, not duplicate logic.
**CLAUDE.md §6 explicitly forbids removing Zod boundary validation even when TS shapes look
identical.** Each alias parses a distinct API response. These are NOT consolidation candidates.

No cases of duplicate functions/types with identical meaning AND identical invariants were
found outside CRM/Inventory. The gate classifies zero findings as DEAD.

---

## Summary table

| Gate | Command | Exit | Notes |
|---|---|---|---|
| check:gate-wiring | `node scripts/check-gate-wiring.mjs` | 0 | 37/37 wired |
| check:dead-code | `node scripts/check-dead-code.mjs` | 0 | 0 dead files, 0 dead exports |
| check:test-typecheck | `node scripts/check-test-typecheck.mjs` | **1 (CRASH)** | `tsconfig.test.json` missing |
| check:route-bundle-budget | `node scripts/check-route-bundle-budget.mjs` | **1** | manifest has no buildId |
| check:web-vitals-budget | `node scripts/check-web-vitals-budget.mjs` | **2** | no .browser-driver-results.json |
| measure:route-bundles | N/A — needs build | — | BUILD REQUIRED |

## Open items requiring action

1. **BLOCKING:** `frontend/tsconfig.test.json` is missing. Gate crashes; CI job fails.
   Repair: create `tsconfig.test.json` extending `tsconfig.json`, removing the four test
   globs from `exclude`, adding `files: ["jest.setup.js"]`. Shape is documented at
   `frontend/scripts/check-test-typecheck.mjs:143-208`.

2. **STALE manifest:** `contracts/route-bundle-manifest.json` has no `buildId`.
   Repair: run `node scripts/measure-route-bundles.mjs --write` after the next production
   build to stamp the manifest and enable the budget gate.

3. **UNVERIFIED:** Web Vitals have no current measurement (no `.browser-driver-results.json`).
   Historical evidence at `WEB-VITALS-CAPTURE-2026-09-04.md`; not current.

4. **ignoreBuildErrors bypass** (`next.config.ts:59`): still active. FD6 requires removing
   it after type errors are repaired. The running `pnpm type-check` will establish current
   error count. Do not change `next.config.ts` until that typecheck completes.
