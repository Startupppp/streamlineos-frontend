# 01 — The frontend folder name says which product it holds

**What to build:** A developer opening the frontend can tell the public help centre from the internal wiki by the folder name. Today the two are `kb` and `knowledge-base` — synonyms in English, opposite products here — so guessing wrong means editing the customer-facing help centre while intending to edit the internal wiki. The backend already names them help-centre and wiki; the frontend adopts the same words, and an import-boundary test stops them re-merging.

Nothing user-facing changes. No route moves.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] The two feature folders are renamed to match the backend's vocabulary, kebab-case throughout.
- [x] Every importer and both barrels are updated.
- [x] **No route changes.** The public help centre URL and the wiki reading routes are a product contract and stay exactly as they are — this rename must not reach the routing layer.
- [x] Neither feature imports the other, enforced by a test.
- [x] A real production build passes — not just a typecheck. A bare side-effect import is invisible to a type checker and to a from-based scan, and has already cost a live file in this repo once.
- [x] The module graph is still acyclic in both repos.
- [x] The dead-code baseline is unchanged — a rename that leaves an orphan shows up as a delta.

## Todo

- [x] Rename the first folder; on Windows a two-step rename may be needed for git to record it rather than reporting a delete plus an add
- [x] Update importers and the barrel
- [x] Repeat for the second folder
- [x] Add the import-boundary test
- [x] Run a real build, the module-graph check and the dead-code check
- [x] Confirm nothing under the routing layer changed
- [ ] Load the help centre and the wiki in a browser — **deferred to the runtime verification pass**
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`features/kb` → `features/help-centre` (the public help centre) and `features/knowledge-base` → `features/wiki` (the internal wiki), confirmed against the backend's own `kb/help-centre/` and `kb/wiki/` split rather than assumed from the names.

72 files updated, **all import-path-only**. Git recorded the moves as renames. No folder under `app/` moved and no URL changed — the public help-centre route and the wiki reading routes are a product contract.

- `npx next build` → **compiled successfully, 455 static pages, zero errors.** This is the check that matters: a bare side-effect import is invisible to both `tsc` and any from-based search, and has cost a live file in this repo before.
- `madge --circular` → no circular dependency found.
- `knip` → no new orphans; the pre-existing HR baseline is unchanged.
- An import-boundary test now fails if either feature imports the other.
