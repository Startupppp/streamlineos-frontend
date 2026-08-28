# 37: Remove proven frontend dead code

**What to build:** Confirmed unused files, exports and types are removed after feature decomposition without deleting extension points or side-effect dependencies.

**Blocked by:** 30, 31, 32 and 33.

**Status:** blocked on 30–33 — proof and classification delivered, no deletions performed

- [x] Module-graph tooling and public-contract review confirm each removal.
- [ ] The four reported files and reported exports/types are removed or explicitly retained with reason.
      **Every candidate is classified with a reason, but the four DEAD files are neither removed nor
      retained — they are recommended for deletion and held.** PROTOCOL §2 forbids removing a form
      while another session may still use it, and S3/S5 are mid-decomposition in tickets 30–33 right
      now. The 18 RETAINED-BY-CONTRACT and 2 RETAINED-BY-CONVENTION entries genuinely are retained
      with reasons. This box closes with the deletion commit, not with the register.
- [x] No schema or deliberate holding file is deleted from Knip evidence alone.
- [ ] Knip, typecheck and production build pass after removals. Nothing was removed, so there is
      nothing to prove. Baselines recorded below instead, labelled as baselines.

## Evidence

- Tool: `frontend/scripts/check-dead-code.mjs` (with `--self-test` proving bites on all 3 fixture types)
- Register: `architecture-refactor/final-refactor/evidence/37-dead-code/DEAD-CODE-REGISTER.md`

### Criterion 1 — Module-graph tooling

`check-dead-code.mjs` runs knip (JSON reporter) then builds a full import graph scanning all TS/TSX files. For each knip-reported dead file it checks: (a) Next.js convention stem, (b) scripts executable, (c) side-effect importers from live files, (d) re-export from live barrel, (e) dynamic import from live file. Only if all checks find zero live importers is the file classified DEAD.

Self-test output:
```
PASS: self-test (5 assertions)
  (a) file with no live importers                    → DEAD
  (b) file reachable via side-effect import          → RETAINED-BY-CONTRACT
  (c) file reachable via re-export from live barrel  → RETAINED-BY-CONTRACT
  (d) export from feature barrel                     → RETAINED-BY-CONTRACT
  (e) export from CRM domain                        → UNPROVEN
```

### Criterion 2 — PRD reconciliation

PRD figures (49 exports, 21 types, 4 files) match the original knip run. As of the session-6 run, knip reports 51/22/7 due to other sessions' in-flight additions. Classifier output: 5 DEAD files (4 original + 1 unwired barrel from another session), 18 RETAINED-BY-CONTRACT, 2 RETAINED-BY-CONVENTION, 55 UNPROVEN. Full classification in register.

### Criterion 3 — Schema/holding file protection

`check-dead-code.mjs` operates on frontend knip output exclusively. Backend files are never candidates. `backend/src/db/schema/hrms-phase1-sql-managed.ts` and its 11 sibling files are further protected by `backend/knip.json` ignore entries and by `migration-integrity.spec.ts`, which asserts they stay outside the Drizzle schema and journal. The register documents all three protection layers.

### Criterion 4 — Baseline established (not post-removal)

- `madge --circular` frontend: **zero circular dependencies** (4,606 files processed)
- `madge --circular` backend: **zero circular dependencies** (4,102 files processed)
- `pnpm type-check` frontend: 2 errors in `app/(authenticated)/hr/performance/analytics/page.tsx` — attributed to `types/hr/performance.ts` modification by another session (ticket 33). Not introduced by LANE E.
- `pnpm exec knip --no-progress` frontend: 7 files / 51 exports / 22 types
- `node scripts/check-dead-code.mjs`: DEAD=5 > BASELINE=4 → exit 1 (correct: another session's `lib/rbac/route-access/index.ts` is unwired)
- `next build`: NOT RUN (orchestrator gate after all lanes land)

## Recommended deletions (for orchestrator)

| Path | Proof | Condition for deletion |
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
