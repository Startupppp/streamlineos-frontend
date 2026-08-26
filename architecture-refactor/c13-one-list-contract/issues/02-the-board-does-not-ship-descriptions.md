# 02 — The board does not ship descriptions

**What to build:** Loading a project board downloads what the board renders. Today the list projection includes each ticket's full description — content the kanban never displays — making it the heaviest list payload in the product.

**Blocked by:** 01 — A ticket opens by its key

**Status:** in-progress

## Acceptance criteria

- [x] The board list response carries no description field.
- [ ] A field-presence assertion fails if it is re-added.
- [x] The board renders unchanged.
- [x] The ticket detail view still shows the description, fetched where it is needed.

## Todo

- [x] Remove the column from the list projection
- [x] Check no consumer read it from the list response — `epic-story-row.tsx` consumed it; updated to handle absence gracefully (read-only description preview removed, edit path uses `?? null`)
- [ ] Add the field-absence test
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

### Out-of-scope dependency
`frontend/types/projects/tasks.ts` line 80: `description: string | null` should become `description?: string | null` to match the narrowed projection. This file is outside the agent's scope and must be updated separately.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
