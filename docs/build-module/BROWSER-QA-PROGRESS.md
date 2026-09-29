# Browser QA progress — Build module page specs

**Authority:** Tracks signed-in Cursor IDE browser verification for open browser acceptance boxes under `docs/build-module/`.

**Denominator (2026-09-29 recount):** `OUT OF SCOPE — browser verification` lines = **167** across **88** files. Broader open browser-ish unchecked lines (keyboard / production evidence / related) = **169**. User asked for 224; the checkable open set is **167** OOS boxes — finish all of them (tick or evidence). No repo file lists 224.

**Projects:** Build QA Sandbox `/build/6` (BQS); StreamlineOS `/build/1` (STRE) when needed.

**Rule:** Mark boxes only after signed-in **cursor-ide-browser** evidence. No Playwright. No `browser_tabs` action `new`.

## Status

| metric | count |
|---|---|
| Open OOS browser boxes at start of this attempt | **167** |
| Closed (ticked) this attempt | **0** |
| Evidenced but left open (error/denied/conflict not seen) | **0** |
| Verified in Cursor browser this attempt | **0** |

## Completed / evidenced this pass

(none)

## Blocked — provided viewIds not visible to this agent

Parent supplied:

- Primary `c79e04` (`http://localhost:1000/build/6/issues`)
- Fallback `f64219`
- Fallback `5e7488`

Observed:

1. `browser_tabs` `list` → empty.
2. `browser_lock` on `c79e04`, `f64219`, `5e7488` → each: `No browser tab available. Please navigate to a page first.`
3. `browser_navigate` to each viewId → each: `Browser view not found: <id>.`

Per instructions: **stopped. Did not create a tab. Did not use Playwright. Did not mark any row complete.**

**Unblock:** run the verification pass from the parent agent that owns those viewIds (or re-share a live viewId after `browser_tabs` list shows it), then resume locking `c79e04` without creating tabs.
