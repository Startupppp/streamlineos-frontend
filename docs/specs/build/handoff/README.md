# Build Handoff — start here

Written 2026-09-21. Four files, read in this order:

| File | What it answers |
|---|---|
| this one | Where the work stands, what blocks it, what to do first |
| [`completed-work.md`](./completed-work.md) | What is done, with commits — and what each proof does *not* cover |
| [`pending-work.md`](./pending-work.md) | Everything open, grouped by what blocks it |
| [`traps.md`](./traps.md) | Environment and process failures that will bite you again |

This is a session handoff, not an authority. The normative sources stay:
`docs/specs/build/README.md` (execution ledger, cycle history),
`docs/specs/build/module/*.md` and `sidebar/*.md` (acceptance criteria),
`architecture-refactor/prd/completion-plan.md` (cross-module criterion registry).
When this file disagrees with those, they win — and fix this one.

## The one thing blocking the most

**There is no local Postgres on this machine.** Run:

```
winget install -e --id PostgreSQL.PostgreSQL.17
```

Then roles `neondb_owner` + `streamline_app`, database `scratch_local`, a local
trust rule. Until that exists, nothing below can move: migration application,
the 73-file backend e2e status tier, every Database-proof and Browser-proof
acceptance item, and the stack boot needed to capture screenshots.

**Do not work around it by pointing at an existing database.** `.env` sets
`DATABASE_URL` *and* `APP_DATABASE_URL` to the production RDS instance
(`streamlineos-instance-1.…ap-south-1.rds.amazonaws.com/streamlineos`).
`.env.scratch` is `streamlineos_scratch` on **that same production host** — the
user explicitly declined it as a target. Never set
`ALLOW_PRODUCTION_MIGRATION=1`. A suite has already written to production once
in this program's history; see [`traps.md`](./traps.md).

## Current state in six numbers

| Measure | Value | Source |
|---|---|---|
| Frontend gates passing | **28 of 35** | run each self-test-first |
| Open acceptance boxes | **653** (`module/` 560, `sidebar/` 93) | `grep -c '^\s*- \[ \]'` |
| Migration files / journal entries | **897 / 897, in sync** through `1134` | `migrations/meta/_journal.json` |
| Migrations *applied* | **unknown** — needs a database | blocked |
| Test-typecheck errors | **121 across 38 files** | `node frontend/scripts/check-test-typecheck.mjs` |
| Build-owned files in that set | 22, of which **19 fixed**, 1 rejected | see completed-work |

## What to do first, in order

1. **Install Postgres** (above). It unblocks the largest share of remaining work.
2. **Fix `use-build-scope-directory.test.ts`** — the one rejected agent result.
   It needs a typed mock factory, not a cast. Detail in `pending-work.md`.
3. **Work the 7 red gates.** Each has its findings recorded verbatim in
   `module/10-release-verification-prd.md` under `BLD-10-067`. Three of them are
   pure-Build and small.
4. **Do not start a broad sweep before reading [`traps.md`](./traps.md).** Two
   gates in this repo have been found reporting green while resolving zero
   files, and one agent shipped `any` casts to make a typecheck pass.

## How to verify anything here

Run a gate **self-test before the gate**, always:

```
cd frontend && node scripts/<gate>.mjs --self-test && node scripts/<gate>.mjs
```

A gate that resolves no files reports zero violations and exits green. The
self-test plus a resolved-file count is the only evidence a green result means
anything. Jest runs from `frontend/`:

```
cd frontend && node ./node_modules/jest/bin/jest.js --runInBand <paths>
```

`--testPathPatterns` is not a valid flag here. Typecheck needs the heap:
`NODE_OPTIONS=--max-old-space-size=10240 pnpm type-check`.
