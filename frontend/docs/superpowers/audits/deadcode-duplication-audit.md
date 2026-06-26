# Dead-Code & Duplication Audit — Streamlineos

Date: 2026-06-25
Scope: `app/`, `components/`, `features/`, `lib/`, `hooks/`, `types/`, `server/`, `scripts/`
Mode: **READ-ONLY**. This audit is a map, not a changelist.

> **NO CODE WAS DELETED OR MODIFIED.** Every item below is a *candidate* for review.
> Removal must happen **later**, in **small, test-gated commits** — build + lint + tests
> green after **each batch**, never a single sweep. Several findings are
> **likely false positives** (see the caveats per section) and would break the build
> if deleted blindly.

---

## Tooling run

All three tools ran via `pnpm dlx` (no permanent install) from the repo root.

| Tool | Status | Command |
|------|--------|---------|
| **knip** | ran (full) | `pnpm dlx knip --no-progress --no-config-hints` |
| **ts-prune** | ran (full) | `pnpm dlx ts-prune -p tsconfig.json` |
| **jscpd** | ran (full) | `pnpm dlx jscpd app components features lib --min-lines 20 --reporters console` |

Notes:
- knip emitted a non-fatal `ERROR: Error loading .github/workflows/main.yml` (YAML parse quirk, a [known knip issue](https://knip.dev/reference/known-issues)). It did **not** stop the analysis — knip still produced its full report. Worth a one-line YAML fix later so CI tooling stays clean.
- No `knip.json` config exists, so knip ran with framework auto-detection (Next.js). Without an explicit config, knip cannot know which exports are intentional public API, so its "unused exports/types" lists over-report (see caveats). A tuned `knip.json` would sharpen future runs.
- ts-prune output is dominated by `(used in module)` entries (4,596 total lines; ~4,198 are real candidates but many overlap with knip and include intra-module-only symbols). knip's resolution is more reliable here, so this report leads with knip and uses ts-prune only as corroboration.

---

## 1. Unused files (knip: 34) — HIGHEST-VALUE, LOWEST-RISK

These files have **no inbound imports** anywhere in the graph. Split by confidence.

### 1a. App/feature components with zero references (verified independently)
Confirmed by a repo-wide grep — no file imports these by name:
- `components/dashboard/quick-actions-widget.tsx`
- `components/projects/git-ticket-links.tsx`
- `components/ui/progress-bar.tsx`
- `features/hr/devices/device-form-content.tsx`
- `features/hr/devices/device-table-row.tsx`
- `features/hr/employees/ai-attrition-risk-button.tsx`  *(note: near-duplicate of `crm/clients/ai-churn-risk-button.tsx` — see §3)*
- `features/landing/components/motion/marquee.tsx`
- `features/landing/components/motion/tilt-card.tsx`
- `features/support/inbox/ticket-stats.tsx`
- `lib/constants/statuses.ts`
- `lib/services/hr/automation-engine.ts`
- `server/actions/leave-actions/leave-requests.ts`

### 1b. Stale schema / barrel duplicates — VERIFY, do NOT blind-delete
- `lib/db/schema/crm/index.ts`
- `lib/db/schema/hr/index.ts`
- `lib/rbac/permissions/index.ts`

**Why these are flagged but need care:** the codebase imports from the *sibling* barrels
`@/lib/db/schema/crm`, `@/lib/db/schema/hr`, `@/lib/rbac/permissions` — i.e. the
`crm.ts` / `hr.ts` / `permissions.ts` files one level **up**, not the directory
`index.ts`. The directory `index.ts` files are stale, **incomplete** copies:
`schema/crm.ts` re-exports 9 sub-modules (incl. `customer-success`, `nps`, `playbook`)
while `schema/crm/index.ts` re-exports only 6. They are leftovers from when the barrel
was moved up a directory. Deletion is *probably* safe but a stray
`from ".../crm/index"` import would break silently — **gate on a full build**.

### 1c. `scripts/` one-off & ops/migration scripts (16) — KEEP unless intentionally pruned
These are CLI entrypoints (run via `tsx`, `pnpm run`, or manually); knip flags them
because nothing *imports* them, which is expected for scripts. **Do not treat as dead
code by default.** `scripts/` is excluded from `tsconfig` and the build.
- `scripts/backfill-org-owners.ts`, `scripts/clear-db.ts`, `scripts/create-organization.ts`,
  `scripts/drop-qr-codes-table.ts`, `scripts/import-holidays.ts`,
  `scripts/invalidate-user-sessions.ts`, `scripts/migrate-blog.ts`,
  `scripts/migrate-invoice-items.ts`, `scripts/migrate-kb-rag.ts`,
  `scripts/test-accounting.ts`, `scripts/test-rbac-runtime.ts`
- Load-test harness (referenced by `package.json` `load-test:*` scripts via `bash run.sh`,
  which knip's resolver doesn't follow): `scripts/load-tests/all.js`, `chat.js`,
  `hr-modules.js`, `recruitment-hub.js`, `smoke.js`, `lib/config.js`, `lib/http.js`.
  **These are NOT dead — they back the `load-test:*` npm scripts.**

### 1d. Runtime asset
- `public/sw.js` — service worker. knip can't see it being registered from client JS at
  runtime; **almost certainly live**. Do not delete without confirming push/SW registration.

---

## 2. Unused exports & types (knip: 510 exports + 274 types) — REVIEW INDIVIDUALLY

This is the largest bucket and the **noisiest**. The dominant pattern is the
TanStack Query hooks layer under `lib/api/hooks/**`: hundreds of `use*` hooks are
exported but not yet consumed by a page (e.g. `useManagerDashboard`,
`useResignationAnalytics`, `useInterviewScorecard`, `useCreatePoll`,
`useHrDiversityMetrics`, …). These represent **built-but-not-yet-wired feature surface**,
not classic dead code — many correspond to pages still being built page-by-page.
**Treat as a backlog to reconcile feature-by-feature, not a delete list.**

Lower-risk sub-clusters worth a closer look:
- **shadcn/ui re-exports** intentionally kept for API completeness:
  `components/ui/*` (`DialogPortal`, `SelectGroup`, `DropdownMenuRadioGroup`,
  `CardFooter`, `CardAction`, `badgeVariants`, `TableCaption`, `useFormField`, …).
  These mirror the upstream shadcn surface; **keep** unless you deliberately trim the
  design system. Pure false-positive class for deletion purposes.
- **Barrel re-exports never imported via the barrel:** `components/shared/index.ts`
  re-exports `AppSheet`, `AppDialog`, `CardGrid`, `PageHeader`, skeletons, etc.; many
  are imported by deep path instead, so the *barrel entry* reads as unused. Consolidating
  on one import style would clear these.
- **`lib/date-utils.ts`** — large utility module where ts-prune flags ~25 helpers
  (`formatDisplayDateTime`, `startOfWeek`, `getAgeInYears`, `workingDaysBetween`, …) as
  unused. A genuine candidate for trimming, but verify each isn't referenced from a
  `.tsx` the tool under-resolved.
- **`lib/theme-constants.ts`** — many exported colour/config maps and type guards
  (`isCampaignStatus`, `campaignStatusConfig`, `eventStatusColors`, `projectProgressBarColors`)
  flagged unused; review against the design-token source of truth before touching.
- **Type-only exports (knip: 274)** under `types/*` and `lib/api/hooks/**` — interfaces
  like `ManagerDashboard`, `ClientTimelineEvent`, `NpsResponse`, `CashFlowLineItem`. Low
  runtime risk (types erase at build) but should be removed alongside their owning feature,
  not in isolation.

**Caveat for the whole section:** without a `knip.json` declaring entry points and
public API, knip cannot distinguish "intentional library surface" from "orphaned".
Do **not** mass-delete from this list. Each removal needs: (1) confirm zero references
incl. dynamic/`import()`/barrel paths, (2) build, (3) tests.

---

## 3. Duplication (jscpd: 52 clones, ~0.57% of lines) — LOW overall, a few real targets

Overall duplication is **very low (0.57% of lines, 0.49% of tokens)** across 1,900 files —
the codebase is not copy-paste-heavy. Most clones are boilerplate (route-handler auth
preambles, loading-skeleton shells, Next.js page metadata blocks) that are cheap and not
worth abstracting. The handful worth extracting into a shared component/helper:

### Worth refactoring (real logic duplication)
- **Add vs Edit candidate sheets** — the biggest clone in the repo:
  `features/hr/recruitment/candidates-list/add-candidate-sheet.tsx` vs
  `edit-candidate-sheet.tsx` — three overlapping blocks incl. one of **117 lines / 567 tokens**
  and one of **80 lines**. Strong candidate for a shared `CandidateFormFields` component.
- **AI risk buttons** — `features/crm/clients/ai-churn-risk-button.tsx` vs
  `features/hr/employees/ai-attrition-risk-button.tsx` (35-line + 26-line clones). Same
  shape, different domain. (The HR one is *also* flagged unused in §1a — confirm before
  unifying.)
- **Upload vs Edit document dialogs** — `app/(dashboard)/hr/documents/upload-document-dialog.tsx`
  vs `features/hr/documents/edit-document-sheet.tsx` (38-line + 28-line clones).
- **Create-ticket dialog vs ticket-detail sheet** — `features/support/inbox/create-ticket-dialog.tsx`
  vs `ticket-detail-sheet.tsx` (45-line clone, 295 tokens).
- **Aged payables vs aged receivables** report routes — `app/api/accounting/reports/aged-payables/route.ts`
  vs `aged-receivables/route.ts` (two clones, 23 + 29 lines). Near-identical aging logic.
- **Device form** duplicated between `app/(dashboard)/hr/assets/page.tsx` and
  `features/hr/devices/device-form-content.tsx` (30 lines) — note the latter is flagged
  unused in §1a.

### Expected / low-value clones (leave alone)
- Route-handler auth/session preambles (`api/branches`, `api/targets`, `api/hr/leaves/...`,
  `api/onboarding/...`) — short boilerplate; abstracting risks over-engineering thin handlers.
- `loading.tsx` skeleton shells across HR pages (`asset-returns` vs `loans`, `assets` vs
  `background-verification`) — intentional per-page skeletons.
- Page-metadata / generateMetadata blocks across many `page.tsx` files.
- `email.ts` ↔ `email/index.ts` (28-line clone) — a barrel forwarding to a refactored
  module; reconcile if one supersedes the other.

---

## 4. Comments / console / unused imports

- **Commented-out code blocks:** effectively **none**. A repo-wide scan for commented-out
  statements (`// import`, `// const`, `// return`, JSX, etc.) returned **0 matches**.
  The "no comments / no commented-out code" project rule is well-enforced.
- **`console.*` statements:** 135 occurrences across 19 files — **all confined to**
  `scripts/**` (CLI/ops/seed/migration/load-test scripts, expected and not shipped),
  plus `lib/logger.ts` (the structured-logger wrapper — legitimate) and `lib/env.ts`
  (startup env validation). **Zero `console.*` in `app/`, `components/`, or `features/`.**
  Clean.
- **Unused imports:** ESLint config (`eslint.config.mjs`) extends `next/core-web-vitals`
  + `next/typescript` and does not surface a standalone unused-imports report here; knip's
  per-symbol "unused exports" is the proxy. No separate dead-import cluster identified
  beyond what the unused-files/exports lists imply.

---

## 5. Unused dependency

- knip: `playwright` listed as an **unused devDependency** (`package.json:157`).
  Likely a false positive — `e2e-artifacts/` exists and Playwright is the E2E driver
  (see project memory: E2E setup on port 1000). It's probably invoked outside the import
  graph (config/test runner). **Verify against the E2E setup before removing.**

---

## Recommended removal protocol (for LATER, not now)

Deletion must be **incremental and test-gated**. Suggested ordering, smallest-risk first,
**one batch per commit**, with `pnpm build && pnpm lint` (and tests) green before the next:

1. **Batch A — verified orphan components** (§1a, the 12 grep-confirmed files). Delete,
   then build to confirm no dynamic import breakage.
2. **Batch B — stale schema/barrel `index.ts` duplicates** (§1b). Delete the three
   directory `index.ts` files; build — this is where a hidden `/index` import would fail,
   so isolate it.
3. **Batch C — duplication extractions** (§3 "worth refactoring"): introduce shared
   components/helpers, migrate both call sites, verify behaviour, then remove the dupes.
4. **Batch D — `lib/date-utils.ts` / `lib/theme-constants.ts` helper trims** (§2), each
   helper individually grep-verified.
5. **Defer:** the `lib/api/hooks/**` unused-hook backlog (§2) — reconcile per feature as
   pages are wired, not as a bulk delete.
6. **Do NOT delete:** `scripts/**` (§1c), `public/sw.js` (§1d), `playwright` (§5),
   shadcn/ui re-exports (§2) without explicit per-item confirmation.

**Re-run `knip` / `jscpd` after each batch** to confirm the count drops as expected and no
new orphans were created. Add a `knip.json` with declared entry points to cut the
false-positive noise in future passes.
