# c12 — Route text search through the id probe that already exists

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 3 tickets, 0 retired.

Five `SECURITY DEFINER` id probes exist, each with one caller and the bounded fallback. Migration 0275 created four trigram indexes on `business_parties` and shipped the probe for them — and the global header search reads those same four columns with a plain `ILIKE`, so every keystroke is five parallel sequential scans. This is not a request to wrap all 213 `ilike()` sites; targeted wrapping is the standing decision and it is right.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | The three missing probes exist | — | done |
| 02 | [Global search uses the probes](issues/02-global-search-uses-the-probes.md) | 01 | done |
| 03 | The comment that says otherwise is corrected | 02 | done |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
