# Execution plan — the 65 open tickets

Written 2026-09-27. Baseline: root `840d11079`, backend `dddce140a`, both trees clean at start.

This plan exists because the tickets carry no file paths by design, so the only way to prove two
agents never touch one file is to resolve every ticket's real file set first. Twelve read-only
readers did that. What follows is the partition their output supports — not a guess.

## Rules every lane obeys

1. **A lane owns files, not subjects.** If a file is not in your lane's territory you do not edit
   it, even to fix something obviously broken. Write the file, line and change you want into your
   report instead.
2. **Never run a git command that changes repository or working-tree state.** Banned by name:
   `git stash`, `git checkout`, `git restore`, `git reset`, `git clean`, `git commit`, `git revert`,
   `git merge`, `git rebase`, `git pull`, `git push`, `git worktree`, `git branch`, `git add`.
   Read-only `git status` / `git diff` / `git log` is fine. The orchestrator does all committing.
3. **Never open a database connection.** Every connection string in this repo points at production
   and production is the default, so a "quick check" is a production query. No `psql`, no `EXPLAIN`,
   no `drizzle-kit`, no migration runner, no script importing `postgres`.
4. **Migrations: author the files, never apply them.** Write `NNNN_name.sql` and
   `NNNN_name_rollback.sql`. Do **not** touch `backend/migrations/meta/_journal.json` — the
   orchestrator owns it exclusively, because six tickets across four lanes need it.
5. **No `pnpm build`, `pnpm type-check`, `pnpm check:*`, `pnpm test` without a path pattern,
   `pnpm test:e2e`, or Playwright.** No dev server. No `pnpm openapi:generate`.
6. **Never hand-edit `frontend/contracts/openapi.json`** — vendored and sha-pinned.
7. **Do not run `*.e2e-spec.ts` backend specs.** That tier writes to production.
8. **Keep off the Knowledge Base workstream:** `frontend/features/wiki/**`,
   `frontend/features/help-centre/**`, `help-centre/`, `kb_*`, `backend/src/modules/kb/**`. A live
   peer session owns it, tracked in `docs/specs/knowledge-base/sessions/DOCPORT2-TERRITORY.md`.
9. **No code comments.** A reason goes in a test name.
10. **Tick a box only when it is actually done**, with the file and line that satisfies it written into the
    ticket. Never reword a criterion to fit what was built. If a criterion cannot be met, leave it
    unticked and add a dated premise correction, the way tickets 10 and 14 already do.

## Migration house style

Directory `backend/migrations/`. Journal `backend/migrations/meta/_journal.json`, currently at
`idx: 1120`, tag `1366_user_sessions_mfa_satisfied_at`. Filename prefixes run to 1366 — the journal
`idx` and the filename number are two different counters and only `idx` orders the run.

Exemplar: `backend/migrations/1345_project_team_members_org_team_idx.sql` with its paired
`_rollback.sql`. Shape is `SET lock_timeout = '5s';` → `--> statement-breakpoint` → a guarded
`DO $$ ... $$` precondition → the DDL → a `DO $$ ... $$` postcondition assert.

**A `--> statement-breakpoint` marker must never appear inside a `DO $$ ... $$` block.**
`check-migration-discipline.mjs` fails the migration if it does, because Drizzle splits on that
marker and would tear the block into invalid fragments.

Exclusion-constraint precedent (`btree_gist` already installed, no extension migration needed):
`backend/migrations/0330_worker_engagement_overlap.sql`, `backend/migrations/0379_legal_entities_create.sql`.

## Orchestrator-only work

- Every journal entry, and applying every migration to production.
- `pnpm openapi:generate` after ticket 39 changes backend `@ResponseSchema` bodies.
- All surveys of existing rows before a constraint is added (62, 64; 63's and 65's survey queries
  are recorded below but 63's is not load-bearing — see its note).
- The three `EXPLAIN`-blocked findings from the second review.
- All commits, staged by pathspec only. The index is shared with peer sessions; a clean
  `git status` proves nothing.

## Territory conflicts that forced the wave structure

These are the files two or more tickets modify. Each one is why a lane boundary sits where it does.

| File | Tickets | Resolution |
|---|---|---|
| `backend/migrations/meta/_journal.json` | 13, 15, 16, 30, 36, 62, 63, 64, 65, 66 | Orchestrator owns it |
| `core/projects-tickets-update.service.ts` | 36, 37, 11, 12, 41, 43 | Waves 1 → 2 → 3 → 4 |
| `core/projects-tickets-read.service.ts` | 14, 41, 18 | 41/18 in wave 2; 14 waits for wave 2 |
| `core/project-access.ts` | 41, 42, 18, 43 | One lane, serial |
| `core/projects.module.ts` | 02, 25, 26, 27 | One lane, serial, final phase |
| `core/projects-roadmap.service.ts` | 04, 13, 26 | 04 wave 1, 13 wave 3, 26 final phase |
| `build/client-portal/client-visibility.service.ts` | 35, 36 | Both wave 1 — **35 merged into lane 1** |
| `db/schema/build/ticket-core.ts` | 63, 64 | One lane, one migration for the shared index |
| `core/assignee-filter.spec.ts` | 14, 61 | One lane, 14 then 61 |
| `frontend/hooks/api/build/reports.ts` | 19, 33 | One lane, 19 then 33 |
| `frontend/features/build/views/use-kanban-drag.ts` | 11, 39 | 11 wave 3, 39 wave 4 |
| `frontend/features/build/epics/epics-page.tsx` | 11, 39 | 11 wave 3, 39 wave 4 |

## Phases

**Phase 1** — backend and frontend content, four sequential waves for the ticket-core territory,
with independent lanes running alongside. 49 tickets.

**Phase 2** — the list surface: 49, then batches 50–54, then 55 and 56. Held back deliberately: it
rewrites 73 page files, the highest collision surface in the repo, and several of those pages are
edited by tickets 09, 11 and 39 in phase 1.

**Phase 3** — the core restructure: 01, then 02, then 25/26/27, then 28. One serial lane. It moves
~185 of the 229 files in `backend/src/modules/build/core` and repoints 49 external deep importers,
so it cannot run beside any backend content ticket. Last, so it absorbs the files phase 1 creates.

**Phase 4** — the acceptance sweep: the 16 non-browser boxes in `10-*.md`, the 36 in `00-06`, the 7
in `99-*`, and the non-browser subset of `lanes/status/LANE-5-STATUS.md`. These can only be
answered honestly once phases 1–3 have landed.

**Excluded, by the user's decision:** ~163 browser-verification boxes (a11y, 375 px, screen-reader,
reduced-motion, production browser evidence). They stay unticked with one exclusions note naming
the classes and counts. Also excluded: `10-project-wiki.md` and `10-project-wiki-page.md` (10
boxes, peer-owned).

## Premise corrections to carry into the work

Facts the tickets assert that the source does not support. Each needs a dated correction in its
ticket rather than a quiet reinterpretation.

- **36** — the code has **4** writers bumping `tickets.version`, not 5: `updateTicket`,
  `rankTicket`, `bulkMutateTickets`, automation `set_status`. The ticket also describes rank and
  bulk as non-bumping when they do bump. The invariant to build is "every writer moves the token",
  not "eleven writers do". Two further writers may belong to the set: `client-visibility.service.ts`
  and `bugs.service.ts` (bugs are `tickets` rows of type `BUG`).
- **41 / 42** — the canonical access helper has **104 call sites across 27 files**, not 48. The
  eight reachability constructions span **three** folders (`core/`, `scope-directory/`, `entity/`),
  not one. And the tickets' own arithmetic gives 1 + 6 = 7 against a stated 8.
- **04** — a correct per-sort cursor implementation already exists in
  `core/projects-roadmap.service.ts` (`RoadmapSortMode`, `decodeRoadmapCursor`,
  `buildRoadmapOrdering`) and is never called. The work is to wire up the dead seam and delete the
  hardcoded path, not to build keyset logic. Also missing from the ticket: `sort=updated_at` and
  `created_at` have no supporting index even after the cursor is fixed.
- **63** — the survey criterion is unnecessary. Full unique index → partial on `deleted_at IS NULL`
  is strictly weaker, so the new index cannot fail to build.
- **65** — nothing computes goal progress from `okr_links`; both progress functions read
  `okr_key_results` only. The constraints are still right; the "recompute goal progress" criterion
  is void.
- **39** — the two disagreeing schemas eighty lines apart are in the **frontend**
  (`frontend/hooks/api/build/build-project-schema.ts`), not the backend, which handles that column
  three different ways across three files. True blast radius is wider than its five known callers:
  ~27 more Build files contain a literal `"DONE"`, unseparated into real bypasses and coincidences.
- **29** — the audit is already written as CCG-7 in `99-cross-cutting-gaps.md:378-434`, and its
  answer is that there is nothing to rework: all paths for all three tables are already inside a
  tenant transaction, no after-commit hook or background sweep touches them, and
  `managed_product_memberships` has no write path at all.
- **03** — `build/qa/phase-2/bug-consolidation-mapping.ts` is production code imported by
  `bugs.service.ts` and `test-runs.service.ts`, not a test guard. `backend/src/scripts/assertion-ceiling-ledger.json`
  pins its path as a JSON key.
- **33** — `cache-policy.md` prescribes a cursor inside the query key; the board pattern the ticket
  says to copy uses `useInfiniteQuery` with an internal `pageParam` and no cursor in the key. Follow
  the board, per the ticket's own criterion, and correct the doc.
- **cache-policy.md** — claims the six report query-key factories live in `accounting-and-support.ts`.
  They already live in `frontend/lib/query-keys/build-work.ts`.
- **tickets/README.md** — claims tickets 29 and 30 came from the first architecture review. No
  review contains the row-level-security finding; `213335` never mentions RLS, and the other three
  reports are Knowledge Base and whole-repo auth reviews. 29/30 came from the memory note
  `three-build-tables-have-grants-but-no-rls-policy`, and 10 and 33 from somewhere other than a
  report. Correct the provenance line.

## Survey queries the orchestrator runs before the matching constraint lands

**62** — two active cycles per project, and overlapping date ranges:
```sql
SELECT org_id, project_id, count(*) FROM build.cycles
WHERE status = 'active' AND deleted_at IS NULL
GROUP BY org_id, project_id HAVING count(*) > 1;

SELECT a.org_id, a.project_id, a.id AS cycle_a, b.id AS cycle_b FROM build.cycles a
JOIN build.cycles b ON a.org_id = b.org_id AND a.project_id = b.project_id AND a.id < b.id
WHERE a.deleted_at IS NULL AND b.deleted_at IS NULL
  AND a.start_date <= b.end_date AND b.start_date <= a.end_date;
```

**64** — project-less tickets, their number collisions, and statuses no project defines:
```sql
SELECT count(*) FROM build.tickets WHERE project_id IS NULL AND deleted_at IS NULL;

SELECT ticket_number, count(*) FROM build.tickets
WHERE project_id IS NULL GROUP BY ticket_number HAVING count(*) > 1;

SELECT t.id, t.org_id, t.project_id, t.status FROM build.tickets t
WHERE t.project_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM build.project_statuses s
  WHERE s.org_id = t.org_id AND s.project_id = t.project_id AND s.name = t.status);
```

**65** — links with neither arm or both, and duplicate project links:
```sql
SELECT count(*) FROM build.okr_links
WHERE (ticket_id IS NULL AND project_id IS NULL) OR (ticket_id IS NOT NULL AND project_id IS NOT NULL);

SELECT org_id, goal_id, project_id, count(*) FROM build.okr_links
WHERE project_id IS NOT NULL GROUP BY org_id, goal_id, project_id HAVING count(*) > 1;
```

## Out of scope, recorded so it is not lost

`architecture-review-20260926-201335.html` is a whole-repo review of authentication, notifications,
redundancy and the stale-tab failure. It is referenced by no file in the repository and exists only
as a temp file. It is not a Build-module review, so it is outside this program, but it carries the
most serious findings of the five reports: an HR admin API returning a raw redeemable org-less login
token for another user; MFA satisfied by a `totpEnabled` flag with no login path verifying a code;
every `/portal/v1/*` route possibly 401ing because the global guard rejects the portal audience
before the portal guard runs; and magic-link tokens with ten writers and no org binding.

`architecture-review-20260926-153104.html` and `-224038.html` are two passes over the Knowledge
Base / Documents module, already owned by the peer session. Do not act on them.
