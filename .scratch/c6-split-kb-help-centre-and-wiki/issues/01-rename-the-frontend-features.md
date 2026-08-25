# 01 — The frontend folder name says which product it holds

**What to build:** A developer opening the frontend can tell the public help centre from the internal wiki by the folder name. Today the two are `kb` and `knowledge-base` — synonyms in English, opposite products here — so guessing wrong means editing the customer-facing help centre while intending to edit the internal wiki. The backend already names them help-centre and wiki; the frontend adopts the same words, and an import-boundary test stops them re-merging.

Nothing user-facing changes. No route moves.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The two feature folders are renamed to match the backend's vocabulary, kebab-case throughout.
- [ ] Every importer and both barrels are updated.
- [ ] **No route changes.** The public help centre URL and the wiki reading routes are a product contract and stay exactly as they are — this rename must not reach the routing layer.
- [ ] Neither feature imports the other, enforced by a test.
- [ ] A real production build passes — not just a typecheck. A bare side-effect import is invisible to a type checker and to a from-based scan, and has already cost a live file in this repo once.
- [ ] The module graph is still acyclic in both repos.
- [ ] The dead-code baseline is unchanged — a rename that leaves an orphan shows up as a delta.

## Todo

- [ ] Rename the first folder; on Windows a two-step rename may be needed for git to record it rather than reporting a delete plus an add
- [ ] Update importers and the barrel
- [ ] Repeat for the second folder
- [ ] Add the import-boundary test
- [ ] Run a real build, the module-graph check and the dead-code check
- [ ] Confirm nothing under the routing layer changed
- [ ] Load the help centre and the wiki in a browser
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
