# 02 — The board does not ship descriptions

**What to build:** Loading a project board downloads what the board renders. Today the list projection includes each ticket's full description — content the kanban never displays — making it the heaviest list payload in the product.

**Blocked by:** 01 — A ticket opens by its key

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The board list response carries no description field.
- [ ] A field-presence assertion fails if it is re-added.
- [ ] The board renders unchanged.
- [ ] The ticket detail view still shows the description, fetched where it is needed.

## Todo

- [ ] Remove the column from the list projection
- [ ] Check no consumer read it from the list response
- [ ] Add the field-absence test
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
