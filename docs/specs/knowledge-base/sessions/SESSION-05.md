# Session 05 — History: current marker, two-version compare, semantic block diff

Read `sessions/README.md` first. Its ten rules bind you.

**Slice:** S09.

**The defects, measured 2026-09-25.** There is no current-version marker, so a user cannot tell
which row is live. The picker selects one version only — you cannot compare two. The diff is a
word count plus a first-divergence point, not a block-level semantic diff, so it cannot answer
"what changed". Restore writes **no audit entry**. There is no `?version=` deep link, so a
version cannot be shared or bookmarked.

**Migration tag allocated to you:** `1207_kb_version_restore_audit`.

## Files you own

Frontend:
- `frontend/features/wiki/components/page-history-page.tsx`
- `frontend/features/wiki/components/page-history-sheet.tsx`
- `frontend/features/wiki/components/page-history-cursor.test.tsx`
- `frontend/features/wiki/lib/version-diff.ts`
- `frontend/app/(authenticated)/knowledge/wiki/doc/[pageId]/history/page.tsx`
- **NEW, yours to create:** `frontend/hooks/api/kb/page-versions.ts`,
  `frontend/features/wiki/lib/version-diff.test.ts`,
  `frontend/features/wiki/components/page-history-page.test.tsx`

Backend (`backend/src/modules/kb/`):
- `wiki/kb-page-versions.service.ts` + `kb-page-versions.service.spec.ts`
- `wiki/kb-page-version.service.spec.ts`
- `wiki/kb-page-version-restore-reindex.spec.ts`
- `wiki/kb-page-versions-tenant-isolation.spec.ts`
- `kb-version-append-only-migration.spec.ts`

Migration: `backend/migrations/1207_kb_version_restore_audit.sql` + its rollback.

**Note:** `frontend/hooks/api/kb/pages.ts` belongs to SESSION-01. If version hooks live there
today, create your new hooks in `page-versions.ts` and post a `HANDOFF` asking SESSION-01 to drop
the old ones. Do not edit `pages.ts`.

## Todo

- [ ] Measure first: read the current history list, diff and restore paths and record with
      `file:line` exactly what each does today. Confirm the five defects above are still real.
- [ ] Cursor list of versions with actor, timestamp and a change summary — bounded, never an
      unbounded revision load.
- [ ] A current-version marker: the live version is unambiguously identified in the list.
- [ ] Select one **or two** versions. Two selected produces a comparison.
- [ ] Semantic block-level diff: added, removed and changed blocks identified as blocks, with
      metadata changes distinguished from content changes. Not a word count, not raw JSON.
- [ ] `?version=` deep link: the URL identifies the selected version(s) and survives reload and
      share. Invalid or inaccessible version ids resolve to a recovery state, not a crash.
- [ ] Restore preview and confirmation before anything is written.
- [ ] Restore **appends** a new version — it never rewrites history — increments the content
      revision, and reindexes asynchronously outside the database transaction.
- [ ] Restore writes an audit entry naming actor, source version and target page. Add the table or
      column it needs in `1207`, tenant-leading, with a rollback.
- [ ] Remove the raw JSON diff path and any unbounded revision load.
- [ ] Tenant-isolation spec: a sibling org's version is never listed, diffable, deep-linkable or
      restorable.
- [ ] Append-only spec still bites after your change — `kb-version-append-only-migration.spec.ts`
      pins an exact two-tag list of baselined splices; keep it exact.
- [ ] All six states on the history route, plus the restore path.
- [ ] Keyboard path for selection, compare and restore; usable at 375 px.
- [ ] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [ ] `pnpm typecheck` (backend, under the lock) and frontend `type-check` clean for your files.

## Handoffs

_(append `HANDOFF: <file> — owned by SESSION-0N — <exact change needed>`)_

## Evidence

_(record command output and file:line here as you close each box)_
