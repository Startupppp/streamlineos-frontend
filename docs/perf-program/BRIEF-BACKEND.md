# Backend fix-lane brief (shared by every Wave A lane)

Repo: `D:\projects\personal\Streamlineos\backend` — NestJS 11, Drizzle, Postgres with RLS, Redis via `CacheService`.

## Hard bans
- No git commands of any kind (status, diff, stash, checkout, reset, log). The coordinator owns git.
- No `tsc`, `pnpm typecheck`, `pnpm build`, repo-wide `pnpm lint`, `openapi:generate`, or any whole-suite jest run. The machine has limited RAM; the coordinator runs these once at the end.
- Never connect to a database. `.env` points at PRODUCTION. Never run a spec named `*.db.spec*`, `*e2e*`, `*degradation*` or `*.int.spec*`, and never override jest config, `testPathIgnorePatterns` or env vars.
- Edit only the files your lane owns. If a fix needs a file you do not own, do not touch it — write it under "Needs coordinator" in your report.
- Do not change any HTTP response shape, request param name, route path or status code. Contract changes run later in paired backend+frontend lanes. Purely additive internal changes are fine.
- No code comments (do not add any; do not delete existing comments unrelated to your change).
- Do not weaken a gate, ratchet, allowlist or test to get green; fix the code.

## Rules to apply
`backend/CLAUDE.md` — especially BE-06 (thin controllers), BE-07 (explicit projections), BE-119..126 (caching), BE-132, BE-158..160.
- Cache reads with `CacheService.cachedVersioned` (`common/cache/cache.service.ts`) and make every writer of the source call `invalidateNamespace` for that namespace. Keys include every response-shaping input plus tenant, and actor/permission scope when the response varies per user. Never wildcard-invalidate.
- No N+1: one join or one `inArray` batch. Independent awaits run under `Promise.all`. Explicit column projections on wide tables.
- Delete dead code completely (methods, DTOs, imports, now-unused spec cases). Verify "dead" with a repo-wide grep across `backend/src` AND `frontend/` before deleting. Delete pass-through methods and point callers at the real service (inject it if needed, within your files).

## Verification you may run
- `pnpm jest <exact spec path> --runInBand` for unit specs co-located with files you changed, after checking the spec does not touch a real DB. Update a spec only when its assertion encoded the old, now-removed behaviour — never to hide a regression.
- Targeted greps to confirm every renamed or deleted symbol has no remaining references.

## Report (final message)
1. Every ledger item: done / skipped (why) / needs coordinator, with file:line.
2. Files changed and files created/deleted.
3. Needs coordinator: shared-file edits, migrations (give SQL), contract changes.
4. Specs run and their result.

## Targeted invalidation (user rule, overrides anything above)
Invalidate ONLY what the write actually changed — never blanket-clear. Detail reads use a per-entity namespace (org + entity id), so updating one record evicts only that record. List/count namespaces are bumped only by writes that change list membership, ordering or a listed field. Aggregates are bumped only by writers of their source rows. Never bump a namespace "to be safe", and never fan one write out to every namespace in a module.
