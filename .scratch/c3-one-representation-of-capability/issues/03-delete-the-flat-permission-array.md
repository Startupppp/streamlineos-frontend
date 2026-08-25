# 03 — The flat permission array stops existing on the server

**What to build:** Nothing can read a stale or empty capability list off the request object, because there is nothing to read. The authorization result carries a verdict, a scope and a reason — not a list. The caller context carries identity and standing only. The permission guard stops hydrating an array it built per request from the resolved map.

This is the *contract* step. It is safe only because ticket 02 removed every reader.

**Blocked by:** 02 — Capability checks inside services stop reading the request object.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The authorization result no longer carries a permission list, and the per-request array is no longer built.
- [ ] The caller context no longer declares a permissions field, so the type system stops offering the old pattern to new code.
- [ ] The permission guard still sets the request's data scope; only the hydration is removed.
- [ ] Every existing authorization spec that asserted the list now asserts its absence.
- [ ] Test fixtures that set the removed field are updated — the field is **not** restored to keep them compiling.
- [ ] The access snapshot endpoint is unchanged: no field added, none removed.
- [ ] Backend suite green, including the guard specs. Note the route-table specs run only under the e2e command.

## Todo

- [ ] Delete the array construction in the authorization path and the field on its result type
- [ ] Delete the field on the caller context and the guard's hydration block
- [ ] Fix the fixtures that break — expect the snapshot-shape, authorization, KB review and guard specs
- [ ] Invert the assertions that pinned the array's presence
- [ ] Run the default suite and the e2e suite separately; the latter is excluded from the default run
- [ ] Confirm the access snapshot response shape is byte-identical
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
