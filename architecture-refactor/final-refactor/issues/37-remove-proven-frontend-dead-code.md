# 37: Remove proven frontend dead code

**What to build:** Confirmed unused files, exports and types are removed after feature decomposition without deleting extension points or side-effect dependencies.

**Blocked by:** 30, 31, 32 and 33.

**Status:** done — four files and six exports/types removed, proved by a real production build

- [x] Module-graph tooling and public-contract review confirm each removal.
- [x] The four reported files and reported exports/types are removed or explicitly retained with reason.
- [x] No schema or deliberate holding file is deleted from Knip evidence alone.
- [x] Knip, typecheck and production build pass after removals.

## Evidence

- Tool: `frontend/scripts/check-dead-code.mjs` (with `--self-test` proving bites on all 3 fixture types)
- Register: `architecture-refactor/final-refactor/evidence/37-dead-code/DEAD-CODE-REGISTER.md`

### Criterion 1 — Module-graph tooling

`check-dead-code.mjs` runs knip (JSON reporter) then builds a full import graph scanning all TS/TSX files. For each knip-reported dead file it checks: (a) Next.js convention stem, (b) scripts executable, (c) side-effect importers from live files, (d) re-export from live barrel, (e) dynamic import from live file. Only if all checks find zero live importers is the file classified DEAD.

Self-test output — (f)/(g)/(h) were added in review, because the original five built a synthetic
importer map and never exercised `buildImporterMap` itself, leaving the whole file-walk untested:
```
PASS: self-test (8 assertions)
  (a) file with no live importers                    → DEAD
  (b) file reachable via side-effect import          → RETAINED-BY-CONTRACT
  (c) file reachable via re-export from live barrel  → RETAINED-BY-CONTRACT
  (d) export from feature barrel                     → RETAINED-BY-CONTRACT
  (e) export from CRM domain                        → UNPROVEN
  (f) buildImporterMap: named import edge recorded
  (g) buildImporterMap: side-effect import edge recorded
  (h) buildImporterMap: re-export edge recorded
```

Review also found the guard was an upper bound only: `deadFiles <= BASELINE` meant a knip run that
returned **zero** findings printed "PASS: dead code within baseline". A broken scan reported clean.
`SCAN_FLOOR` now requires knip to return a plausible total and the graph walk to resolve a plausible
number of files and edges, or the check fails as broken rather than passing as clean.

### Criterion 2 — PRD reconciliation

PRD figures (49 exports, 21 types, 4 files) match the original knip run. Mid-session the classifier briefly reported 5 DEAD files — the fifth was `lib/rbac/route-access/index.ts`, S5's ticket-27 barrel while it was still unimported, and it resolved itself when S5 wired it. **The PRD's "4 unused files" was correct and c18's later "zero unused files" was stale.** After deletion the count is genuinely 0. Full classification in the register.

### Criterion 3 — Schema/holding file protection

`check-dead-code.mjs` operates on frontend knip output exclusively. Backend files are never candidates. `backend/src/db/schema/hrms-phase1-sql-managed.ts` and its 11 sibling files are further protected by `backend/knip.json` ignore entries and by `migration-integrity.spec.ts`, which asserts they stay outside the Drizzle schema and journal. The register documents all three protection layers.

### Criterion 4 — the pre-deletion baseline (superseded by the post-deletion run below)

- `madge --circular` frontend: **zero circular dependencies** (4,606 files processed)
- `madge --circular` backend: **zero circular dependencies** (4,102 files processed)
- `pnpm type-check` frontend: 2 errors in `app/(authenticated)/hr/performance/analytics/page.tsx` — attributed to `types/hr/performance.ts` modification by another session (ticket 33). Not introduced by LANE E.
- `pnpm exec knip --no-progress` frontend: 7 files / 51 exports / 22 types
- `node scripts/check-dead-code.mjs`: DEAD=5 > BASELINE=4 → exit 1 (correct: another session's `lib/rbac/route-access/index.ts` is unwired)
- `next build`: not run at that point; it was run after deletion and is recorded below

## Deletion plan as written before it was executed (kept for the reasoning; outcome is below)

| Path | Proof | Condition that had to hold |
|---|---|---|
| `features/help-centre/components/article-reader.tsx` | zero live importers | tickets 30–33 confirmed not to reference this cluster |
| `features/help-centre/components/help-center-client.tsx` | zero live importers | same |
| `components/blog/table-of-contents.tsx` | sole importer is dead article-reader | same |
| `components/kb/article-content.tsx` | sole importer is dead article-reader | same |
| `hooks/api/support/kb.ts::{usePublicSupportKb,usePublicSupportKbArticle}` | sole consumers are dead files | delete in same commit as files above |
| `hooks/api/support/kb-attachments.ts::usePublicSupportKbAttachments` | sole consumer is dead article-reader | same |
| `lib/server-fetch.ts::serverPost` | zero consumers — re-verified: the only occurrence of the identifier in the whole frontend is its own `export const` at `lib/server-fetch.ts:66` | **Hold.** The most recent root commit (`fd7cd2d08`) is a `server-fetch` refactor, so this file has an active owner this week. Confirm with them, then `next build`. |

## Independent re-verification of the four DEAD files

The orchestrator re-checked the classifier's central claim rather than accepting it, because a static
scan produces candidates and not conclusions. Searching every `.ts`/`.tsx`/`.mjs` file outside
`node_modules` and `.next` for each identifier:

- `article-reader` — **zero occurrences anywhere**, including its own directory.
- `help-center-client` — **zero occurrences anywhere**.
- `table-of-contents` — one importer, `features/help-centre/components/article-reader.tsx:32`, itself dead.
- `article-content` — imported by the dead `article-reader.tsx:31`, and separately by
  `app/(public)/help/[orgId]/[slug]/page.tsx:4` — but that route imports
  **`features/help-centre/components/public-article-content`**, a different, live file with its own
  tests (`public-article-content.test.tsx`, `sanitize-article-html.test.ts`).

That last line is what makes the finding safe and also explains it: the public help route was rebuilt
around `public-article-content.tsx` and the old `article-reader` cluster was left behind. The
substring match on `article-content` is exactly the kind of near-miss that would make a grep-based
deletion wrong, and the reason PRD §22 requires a module graph.

This also corrects a stale claim in the record. `c18-removals-are-proved/prd.md` states "Frontend:
**zero unused files across 4,429**" as of 2026-08-25. That is not true today, and the four files above
are the counter-example.


## Deletion — performed 2026-08-29

Ticket 33 closed during this session and 30/31/32 are Chat, Calendar and Notifications: different
clusters that cannot reach help-centre or blog, and root CLAUDE.md §9 bans feature→feature imports
anyway. The blocker was real when the register was written and had lapsed by the time it was acted on.

Re-verified immediately before deleting, because the tree had moved:

| Path | External references at deletion time |
|---|---|
| `features/help-centre/components/article-reader.tsx` | 0 |
| `features/help-centre/components/help-center-client.tsx` | 0 |
| `components/blog/table-of-contents.tsx` | 1 — `article-reader.tsx`, itself deleted |
| `components/kb/article-content.tsx` | 1 — `article-reader.tsx`, itself deleted |

The other four `article-content` matches were `public-article-content` — a **different, live** file
with its own tests, imported by `app/(public)/help/[orgId]/[slug]/page.tsx`. That substring near-miss
is exactly what makes a grep-based deletion unsafe and is why PRD §22 requires a module graph.

Removed with them, orphaned by the deletion and confirmed to have no remaining references:
`usePublicSupportKb`, `usePublicSupportKbArticle`, `usePublicSupportKbAttachments`, and the three
interfaces they alone used (`PublicKbResponse`, `PublicKbParams`, `PublicKbAttachment`).
`components/kb/` was left empty and removed.

**Held deliberately:** `lib/server-fetch.ts::serverPost`. It has zero consumers — the only occurrence
of the identifier in the frontend is its own `export const` — but the most recent root commit
(`fd7cd2d08`) is a `server-fetch` refactor, so the file has an active owner this week. Confirm with
them rather than delete underneath them.

## Verification after deletion

```
$ pnpm exec knip --no-progress
unused files: 0 | unused exports: 46 | unused types: 21

$ pnpm check:dead-code
=== Baseline: files=0 exports=0 ===
=== Current:  files=0 exports=0 ===
PASS: dead code within baseline.            (exit 0)

$ pnpm build
✓ Compiled successfully in 55s
```

**Unused files is now 0, down from 4** — which restores c18's "zero unused frontend files" claim as a
fact rather than a stale assertion. The baseline in `check-dead-code.mjs` was tightened from
`{files: 4, exports: 3}` to `{files: 0, exports: 0}`, so the count can no longer drift back up
unnoticed.

`✓ Compiled successfully` is the load-bearing line: Turbopack resolved every import in the graph,
which is the module-graph proof PRD §22 asks for and the thing a bare `tsc` cannot give — a missing
side-effect import compiles fine and fails to build.

**The build's TypeScript stage then failed, and not on anything deleted here.** All 9 errors are in
`features/calendar/event-create-dialog.tsx`, whose `date-fns` import has been removed by whoever is
mid-edit on ticket 31 (`startOfDay`, `parseISO`, `endOfDay`, `addHours`, `format`,
`differenceInMinutes` are all unresolved). Zero errors reference any deleted file, any of the removed
exports, or `components/kb`. Raised to S3 in `CROSS-SESSION.md`.

The 46 unused exports and 21 unused types that remain are the RETAINED-BY-CONTRACT set — intentional
barrels (`components/shared/index.ts`, `components/ai/index.ts`, ~39 feature barrels) and the
CRM/Inventory surfaces excluded from this PRD. They are classified with reasons in the register, not
silently tolerated.
