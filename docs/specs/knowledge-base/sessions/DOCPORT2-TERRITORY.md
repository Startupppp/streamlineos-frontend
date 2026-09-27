# Documents module — second port, lane territory map

Opened 2026-09-27. Scope = the 79 unchecked ledger boxes **plus** both Documents
architecture reviews (`architecture-review-20260926-153104` candidates 1–10 and
live defects; `architecture-review-20260926-224038` findings 1–10).

## Baseline

Pinned at dispatch, 2026-09-27: backend `2c9a9e34e`, root `840d11079`. Both had
moved since the previous segment, so peer sessions are committing into this tree
— a clean `git status` proves nothing about whether a lane did its work.

## Rule

No two lanes touch the same file. A lane that needs a change outside its
territory **reports it** and does not make it. The orchestrator owns every file
listed under "orchestrator only".

## Territories

| Lane | Owns | Items |
|---|---|---|
| A · Retrieval | `backend/src/modules/kb/retrieval/**` except `kb-chunk-visibility.ts*`; `backend/src/common/cache/cache-keys.ts` | R1-C3 retrieve() seam · R1-C5 query-embedding cache · R1-C4 search controller · R2-#5 ask/search file size · R2-#9 cache keys |
| B · Wiki writes | `backend/src/modules/kb/wiki/**`; `backend/src/scripts/check-request-txn-outbound.mjs` | trash-purge pool wedge · R1-C4 sources controller + gate regex · R2-#5 spaces/pages/trash file size · writer coverage test |
| C · Access seam | `backend/src/modules/kb/core/**`; `backend/src/modules/kb/retrieval/kb-chunk-visibility.ts*`; `backend/src/db/schema/support/kb-chunks.ts`; migration **file only** | R1-C1 one access seam · R1-C6 OR→UNION + indexes · R1-C7/R2-#7 chunk ACL ceiling · R2-#1 one table five meanings |
| D · Help centre | `backend/src/modules/kb/help-centre/**`; `backend/src/modules/kb/analytics/**` | R1-C9 help-centre owner · R1-C10 unreachable surface · R2-#6 dto sprawl (its share) |
| E · Frontend | `frontend/features/wiki/**`; `frontend/hooks/api/kb/**`; `frontend/app/(authenticated)/knowledge/**` | R1-C8 one Page<T> · AUDIT-L5 ×5 |
| F · Verification | nothing — read only | the ~26 boxes whose own text claims SATISFIED / DEFECT FIXED |

## Orchestrator only

- `backend/migrations/meta/_journal.json` — journalling
- applying any migration
- `docs/specs/knowledge-base/**` — every checkbox tick
- `pnpm typecheck` / `typecheck:test` (needs `--max-old-space-size=10240`)
- all commits

## Wave 2 (after wave 1 lands)

Observability (spans on read/write/search/Ask, DB/replica/cache metrics, ACL
denial anomalies, KB-scoped cost, purge backlog, CDN invalidation) ·
`linked-documents` cycle module · module/controller federation · remaining dto
consolidation.

## Standing constraints

Never `git stash/checkout/restore/reset/clean/rebase/merge/commit/push/apply/revert/add`.
Never delete a file — retire by disuse. No code comments; the reason goes in the
test name. Never run `check:migration-chain` (it connects to production).
Nothing may trigger real email. Pre-existing `kb_pages` ids 4,5,6,7,14,15,16,17
are untouchable. Other sessions are editing this tree — never revert their work.
