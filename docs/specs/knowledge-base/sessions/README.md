# Knowledge Base — parallel session partition

Eight sessions. Each owns a disjoint set of files. No two sessions edit the same file.
Each session closes only when **every** checkbox in its own `SESSION-0N.md` is `[x]` with evidence.

| # | Session | Slice | Primary territory |
|---|---|---|---|
| 01 | Bounded page tree & lazy hierarchy | S04/S06/S07 tree | `kb-page-tree.service.ts`, `page-tree*.tsx`, `wiki-shell.tsx`, `hooks/api/kb/pages.ts` |
| 02 | Wiki Home: action descriptors & card pager | S06 | `wiki-home-*.tsx`, `wiki-page-card.tsx`, `page-action-descriptors.ts` |
| 03 | Spaces: members, counts, detail | S07 | `kb-spaces.*`, `kb-members.*`, `space*-page.tsx`, `space-card.tsx` |
| 04 | Page document: action model, offline, export gating | S08 | `page-document*.tsx`, `use-page-autosave.ts`, `kb-export-serializer.ts` |
| 05 | History: current marker, compare, block diff | S09 | `page-history-*.tsx`, `version-diff.ts`, `kb-page-versions.service.ts` |
| 06 | Ask observability: `kb_ai_interactions` | S16 data | `kb-ask.service.ts`, `kb-events.service.ts`, `db/schema/kb/{chat,events}.ts` |
| 07 | Ask UI: scope sheet, answer parts, quotas | S16 UI | `kb-chat-parts.tsx`, `kb-sources-sheet.tsx`, `hooks/api/kb/ask.ts` |
| 08 | Authorization closure: one predicate, proven | S01 | `core/authorization/**`, `kb-article-restriction-predicate.ts` |

## Rules that bind every session

1. **Stay inside your territory.** Your `SESSION-0N.md` lists the files you own. If a change you
   need lives in another session's file, do **not** edit it — append a `HANDOFF` line to the
   `## Handoffs` section of your own session file naming the file, the owning session, and the
   exact change. The orchestrator resolves handoffs.
2. **Never run git state commands.** `stash`, `checkout`, `restore`, `reset`, `clean`, `rebase`,
   `merge`, `commit`, `push`, `apply`, `revert` are forbidden — other sessions are editing the same
   tree and a single `restore` destroys their work. Read-only `git diff`/`git log`/`git status` is
   fine. The orchestrator commits.
   **`git add` is banned too.** The index is shared across all eight sessions: one `git add -A`
   stages every other session's half-finished files, and the next commit sweeps them in. This
   happened on 2026-09-25 — leave your work unstaged and let the orchestrator stage by pathspec.
3. **Never edit `backend/migrations/meta/_journal.json`.** Write your `.sql` and its
   `rollback/*.down.sql` using the migration tag pre-allocated to you, then post a `HANDOFF`.
   The orchestrator journals and applies it to production.
4. **Never run repo-wide gates.** No `pnpm typecheck` until your final step, no `check:*` sweeps,
   no full `pnpm test`. Eight concurrent 10 GB typechecks will OOM the machine and eight
   concurrent Jest runs fake module-resolution failures. Run Jest with `--runTestsByPath` against
   your own specs, `-w 2`.
5. **Final typecheck is serialized by a lock.** Before your one `pnpm typecheck`, take the lock:
   `mkdir D:/agent-work/kb-sessions/typecheck.lock` — if it fails, sleep 120s and retry.
   `rmdir` it when done. Backend needs `--max-old-space-size=10240` (use the package script).
6. **Measure before you build.** The ledger's checkboxes are the least reliable document in this
   pack — several items marked open are already done, and several marked done are not. Open every
   file you are about to change and confirm the gap is real before writing code. If a checkbox is
   already satisfied, tick it with the `file:line` that satisfies it and move on.
7. **No code comments.** No block comments, docstrings, TODO/FIXME/HACK, commented-out code, or
   explanatory prose in source files. Express intent through names, types, and test names.
8. **No `any`, no `as X`, no `@ts-ignore`.** `check:type-assertions` is a hard zero on new code.
9. **Tests must bite.** For every fix, run the new test against the *unfixed* code and confirm it
   fails, then against the fixed code and confirm it passes. A test that passes both ways is not
   evidence. Record both outcomes in your session file.
10. **Tick your own boxes as you go**, in your own `SESSION-0N.md`, each with the `file:line` or
    command output that closes it. Do not edit `REQUIREMENT-LEDGER.md` — the orchestrator merges.

## Production database

Production is the only database. Destructive operations are authorized **only** within
Knowledge-Base-owned tables, routes, caches, indexes and blobs. Never touch HR, payroll,
accounting, CRM, Build, organization, identity, billing, or user data. Never run a broad wipe.

e2e fixtures must be `[e2e]`-prefixed and deleted afterwards. `kb_pages` ids
**4, 5, 6, 7, 14, 15, 16, 17 must not be modified or deleted.** Nothing may trigger real email.

## Pre-allocated migration tags

Use only the tag allocated to you. Do not invent a number — a collision corrupts the journal.

| Session | Tag |
|---|---|
| 01 | `1205_kb_page_tree_children_index` |
| 03 | `1206_kb_space_member_counts` |
| 05 | `1207_kb_version_restore_audit` |
| 06 | `1208_kb_ai_interactions`, `1209_kb_events_correlation_id` |
| 04 | none — the export grant was a role-template change, not a migration (BE-111) |
| 07 | `1212_kb_indexed_bytes_quota` |
| 08 | `1210_kb_page_grants_plan_evidence` |
| 02 | `1213` (spare, only if needed) |

## Environment facts you will need

- Backend is a **separate git repo** at `backend/`. The root `.gitignore` hides it from ripgrep —
  pass `backend/src` explicitly as a search path.
- Backend typecheck needs `--max-old-space-size=10240` (`pnpm typecheck`, `pnpm typecheck:test`).
- Git Bash rewrites `/`-leading args. Prefix with `MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'`.
- `readErrorReachesBoundary` (`frontend/lib/query-error-policy.ts:3`) sends any read error with no
  cached data to the route error boundary. `INLINE_READ_ERROR` is the sanctioned escape hatch for
  reads that have a semantic default.
- `check:contract-parity` is blind to top-level array-vs-envelope mismatches — check by hand.
- Regenerating `backend/openapi.json` needs no database; a stale one disarms the permission-binding
  gate. Only the orchestrator re-vendors `frontend/contracts/openapi.json`.
