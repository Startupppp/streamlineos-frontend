# c24 — The design system is the only way to build a screen

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 2** · 5 tickets, 0 retired.

The measured discipline is unusually good — zero arbitrary colour classes across 591k lines, zero effect-driven API calls, zero circular dependencies, zero dead files. **The verdict is mostly KEEP.** The exception is accessibility: 487 icon-only buttons against 78 labelled ones is a gap that excludes people from using the product, and it is the only item here with that character.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | Icon-only buttons are triaged and labelled | — | **partial** |
| 02 | A missing accessible label fails a check | 01 | done |
| 03 | Shared components pass accessibility assertions | — | **partial** |
| 04 | The canonical component wins | — | **partial** |
| 05 | The measured properties are asserted in CI | — | done |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
