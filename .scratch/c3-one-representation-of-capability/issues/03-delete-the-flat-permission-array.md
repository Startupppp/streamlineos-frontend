# 03 — The flat permission array stops existing on the server

**What to build:** Nothing can read a stale or empty capability list off the request object, because there is nothing to read. The authorization result carries a verdict, a scope and a reason — not a list. The caller context carries identity and standing only. The permission guard stops hydrating an array it built per request from the resolved map.

This is the *contract* step. It is safe only because ticket 02 removed every reader.

**Blocked by:** 02 — Capability checks inside services stop reading the request object.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] The authorization result no longer carries a permission list, and the per-request array is no longer built.
- [x] The caller context no longer declares a permissions field, so the type system stops offering the old pattern to new code.
- [x] The permission guard still sets the request's data scope; only the hydration is removed.
- [x] Every existing authorization spec that asserted the list now asserts its absence.
- [x] Test fixtures that set the removed field are updated — the field is **not** restored to keep them compiling.
- [x] The access snapshot endpoint is unchanged: no field added, none removed.
- [x] Backend suite green, including the guard specs. Note the route-table specs run only under the e2e command.

## Todo

- [x] Delete the array construction in the authorization path and the field on its result type
- [x] Delete the field on the caller context and the guard's hydration block
- [x] Fix the fixtures that break — expect the snapshot-shape, authorization, KB review and guard specs
- [x] Invert the assertions that pinned the array's presence
- [x] Run the default suite and the e2e suite separately; the latter is excluded from the default run
- [x] Confirm the access snapshot response shape is byte-identical
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`AuthResult.permissions`, the per-request `granted` array, the guard's hydration block and `CurrentUserContext.permissions` are all gone. `req.rbacScope` is untouched and `GET /me/access` is byte-identical.

**`tsc --noEmit`: 0 errors** (with the raised heap this repo needs). Full suite across 6 shards: **590 suites / ~5,102 tests**, all green except `hr-canonical-parity-preflight.spec.ts`, which fails to RUN because its SQL fixture was deleted in `f43d16b36` before this work — pre-existing, unrelated, and left alone.

**Blast radius was larger than the ticket assumed.** 64 spec fixtures across the repo set `permissions: []` on a `CurrentUserContext` literal, plus five production files that constructed one. None were readers, which is why ticket 02's grep did not see them — but every one broke the typecheck. The field was NOT restored anywhere to make something compile.

Three genuine readers surfaced here that ticket 02 missed and are now on the seam. The e2e guard spec passes (5 tests, no DB needed — it uses an in-process harness).
