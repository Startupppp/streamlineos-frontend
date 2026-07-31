# 05 — Deletions (prove-then-delete)

**Date:** 2026-07-31 · **Scope:** Build module only
**Rule:** nothing is deleted without proof. Every candidate needs a symbol grep, a path grep, **and** a
bare side-effect import grep (`import "x";` with no `from`) — a prior cleanup in this repo deleted a
live file because from-based scanners cannot see that form.

**Tooling note:** `knip`, `ts-prune` and `depcheck` are **not installed** in either repo
(`node_modules/.bin` checked in both). Nothing was installed for this pass. All evidence below is grep
+ build-output based, which is weaker for dynamic references — hence the extra bare-import check.

---

## 1. Executed deletions (Batch 2) — frontend routes

| Deleted | Proof | Verified after |
|---|---|---|
| `app/(authenticated)/build/[projectId]/pages/` (`error.tsx`, `loading.tsx`) | No `page.tsx` in the directory and no nested route → Next cannot route it. All repo hits for `/pages` were unrelated KB imports (`@/hooks/api/kb/pages`). | `pnpm build` exit 0; route absent from the 583-route table |
| `app/(authenticated)/build/settings/layout.tsx` | Body was `return <>{children}</>`; only a default export, no `metadata`/`generateMetadata`. | `/build/settings/integrations` **still routed** after removal |
| `app/(authenticated)/build/[projectId]/workload/` (`page.tsx`, `loading.tsx`) | `page.tsx` body was a single `redirect()`. Nav already points at `?view=workload` (`project-nav-config.ts:194`), so nothing linked to it. | URL preserved via `next.config.ts` redirect; build exit 0 |

**Net:** 5 files removed, 1 redirect added.

### Rejected — proposed for deletion but proven live

| Candidate | Verdict | Evidence |
|---|---|---|
| `app/(authenticated)/build/customers/page.tsx` | **KEEP** | One-line re-export of a feature component — the correct App Router pattern per CLAUDE.md §9. Deleting removes the `/build/customers` route. |
| `app/(authenticated)/build/page.tsx` | **KEEP** | It *is* the `/build` route. `/build/all` is referenced in 6 places (`quick-create-groups.ts:71`, `all-work-page.tsx:216`, `command-center-jump-links.tsx:41,109`, `command-center-page.tsx:97,146`), so `/build/all` is canonical in code and `/build` is a legitimate alias. |

---

## 2. Proven dead — deletion DEFERRED (needs a migration, H1)

### `reports` table — `backend/src/db/schema/build/core.ts:192`

| Check | Result |
|---|---|
| `from(reports)` / `insert(reports)` / `update(reports)` / `delete(reports)` / `query.reports` | **0** occurrences repo-wide |
| Imported as a named specifier (`import { … reports … }`) anywhere in `src` | **0** occurrences |
| Bare side-effect imports that could pull it in | none (only `reflect-metadata`) |
| Present in migrations | 1 (the `0000` baseline) |
| Exported from the barrel? | Yes, but only transitively via `export * from "./core"` in `db/schema/build/index.ts` — exported, never consumed |

**Verdict: dead application-side.** Deletion is deferred rather than executed because H1 requires a
reviewed, reversible migration with dry-run row counts, and that needs a live DB connection which this
session does not have. Required before dropping:
```sql
SELECT count(*) FROM reports;              -- dry-run row count
SELECT count(*) FROM reports WHERE org_id IS NOT NULL;
```
Then an expand/contract migration with a tested rollback. If the table holds rows, they must be
exported to a backup path first.

---

## 3. Candidates NOT yet proven — do not delete

Reported by recon lanes as having zero frontend callers, but **[UNVERIFIED]** by the orchestrator.
Each still needs the full three-way grep before any action.

| Candidate | Reported evidence | Still required |
|---|---|---|
| `GET /build/resource-allocation` | 0 frontend hooks/components | confirm no dynamic route-string construction |
| `GET/POST/PATCH/DELETE /build/programs/*` | 0 frontend callers | ❌ **NO LONGER A CANDIDATE** — a `/build/programs` UI was built this session (see `03-change-map.md` §1d). These endpoints are now live. |
| `POST /build/:projectId/reports/snapshot` | 0 frontend callers | likely job-shaped; check for a cron/scheduler caller before deleting |
| `GET /whiteboards` (hub) | 0 frontend callers | note it also lacks the `build/` route prefix (`workspace.controller.ts:223`) — may be a routing bug rather than dead code |

The programs entry is a concrete example of why "0 callers" is not sufficient proof of deadness: the
endpoints were not dead, the **UI was missing**. Deleting them would have destroyed a working backend
capability.

---

## 4. Not deleted — dead-looking but deliberate

| Item | Why it stays |
|---|---|
| `project_webhooks.events`, `project_custom_fields.options`, OAuth scope subsets | Documented in `docs/schema-redesign/todo.md` as deliberately-kept **bounded value lists**, not entity collections |
| `managed_products` vs `inv_products` vs `crm_products` | `north-star.md:397` — four distinct concepts, "already correctly separated and must stay so" |
| `build-comment-drafts` write endpoints on `build:tickets:view` | Own-data writes scoped by `u.userId`; not a permission defect |
| `filter-command-menu.tsx` raw Popover | Explicitly exempt from the mobile-Drawer rule; already has a custom mobile Drawer |
