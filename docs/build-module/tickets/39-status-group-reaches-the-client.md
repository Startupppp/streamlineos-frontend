# 39 — "Hide completed" works for custom statuses

**What to build:** A project that renames its final column to "Shipped" gets the same behaviour as one that calls it "Done": hiding completed work hides it, and completion-based reports count it. Project statuses carry a state group in the database — backlog, unstarted, started, completed, cancelled — and that column is absent from the response contract and absent from the frontend contract, so the helper that decides which statuses count as completed branches on a field that is never populated and can only ever return the single hardcoded name. Nothing type-errors, because the field is declared optional on the way in.

The same table's group is declared correctly by a second schema eighty lines away in the same file, for the custom-states read. One of the two is the shape to keep.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Schema correction (2026-09-27):** `backend/src/db/schema/build/core.ts:110` gives the group a
default but does not declare it NOT NULL. A default is not a guarantee against historical or
explicit nulls. Expose the current nullable contract honestly, or survey/backfill/constrain before
requiring it. Ticket custom status names remain text; do not replace them with a fixed enum.

- [ ] The state group is present in the response contract, the frontend contract and the read hook's row type
- [ ] The completed-status helper returns every status whose group is completed, and a test covers a renamed completed status
- [ ] The field is required where the database guarantees it, not optional-and-ignored
- [ ] The two schemas for this table agree, or one of them is deleted
- [ ] Every surface that hides or counts completed work is checked against a project with a renamed completed column
- [ ] Test existing null group rows and newly created/custom-renamed statuses through the actual response parser, not a cast that invents the missing field
