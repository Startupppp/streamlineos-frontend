# 03 — Unknown Build URLs return 404, not a validation error

**What to build:** A numeric project parameter sits directly at the Build module root, so every unmatched sibling path falls into it and fails integer parsing. `/build/projects` and `/build/goals` returned `400 Validation failed (numeric string is expected)` rather than 404 — actively misleading, and during diagnosis it made the module look catastrophically broken when nothing was wrong.

**Status:** done — verified against a running server

## Half of this was already fixed

Criteria 3 and 4 were already satisfied before I started. `ProjectsByIdModule` exists solely so its bare `build/:projectId` routes can be registered **last**, `build.module.ts` says so, and `build-route-order.spec.ts` reconstructs the whole Build route table from source and fails if any bare `:param` route is registered ahead of a literal sibling. A new non-numeric sibling is already safe.

What remained was the response itself: the param route still *matched* `/build/goals` and `ParseIntPipe` turned it into a 400.

## The fix, and what Express 5 rules out

The natural fix — constraining the parameter as `:projectId(\d+)` — **is not available**. Nest 11 runs path-to-regexp 8.4.2 (Express 5), which removed inline regex in path parameters entirely.

So the constraint moves into a pipe. `ParseResourceIdPipe` distinguishes the two failures the old pipe conflated:

- **not numeric at all** (`goals`, `projects`, `4a`) → `NotFoundException`. The segment does not name a resource, so the path does not exist.
- **numeric but not a valid id** (`0`, `99999999999999999999`) → `BadRequestException`. The caller meant a project and got it wrong.

Applied to the four routes that actually shadow the namespace root, not to all 390 `ParseIntPipe` sites in Build — that is a wide refactor and belongs in its own expand–contract sequence.

## Verified against a running server, not just types

The dev server on :1500 was serving a stale build and still returned the old 400, which is exactly how this would have been missed. I built, booted my build on :1501, minted a short-lived local owner token, and probed. Behaviour before → after:

| path | before | after |
|---|---|---|
| `/build/goals` | 400 validation | **404** |
| `/build/projects` | 400 validation | **404** |
| `/build/4a` | 400 validation | **404** |
| `/build/0` | 404 from the service | **400 invalid resource id** |
| `/build/99999999999999999999` | **500 internal error** | **400 invalid resource id** |
| `/build` · `/build/labels` · `/build/9` · `/build/9/members` · `/build/my-work` | 200 | 200 |

The 500 was not in the ticket and nobody had noticed it: `ParseIntPipe` accepted `99999999999999999999`, `Number()` produced `1e20`, and the query blew up downstream.

Test server stopped afterwards; the dev server on :1500 was never touched.

**Blocked by:** None

- [x] An unknown path under the module returns 404 — confirmed over HTTP for three shapes
- [x] A malformed but numeric-looking project reference still returns a validation error — and `99999999999999999999` stopped being a 500
- [x] Every existing project route continues to resolve unchanged — five representative routes still 200
- [x] A new non-numeric sibling path can be added without being shadowed — already true, guarded by `build-route-order.spec.ts`

## Findings for you

- **Guards run before pipes**, so an unauthenticated or unpermitted caller still gets 401/403 for an unknown path rather than 404. That is the right order — it does not leak route existence — but it means the 404 is only visible to an authorised caller.
- **390 `ParseIntPipe` call sites remain in Build**, 336 files repo-wide. Every one has the same 404-vs-400 confusion and the same overflow-to-500 hazard. Worth its own expand–contract ticket; I deliberately did not widen this one.
- **`ParseResourceIdPipe` has a unit spec** covering both branches — written, **not run** per the standing rule.

## Line-by-line validation (2026-08-21)

| # | Criterion | Evidence |
|---|---|---|
| 1 | Unknown path → 404 | HTTP: `/build/goals`, `/build/projects`, `/build/4a` → 404. |
| 2 | Numeric-but-malformed → validation error | HTTP: `/build/0` and `/build/99999999999999999999` → 400. The latter was a **500** before. |
| 3 | Existing routes resolve unchanged | HTTP: `/build`, `/build/labels`, `/build/9`, `/build/9/members` → 200. **One deliberate change:** `/build/0` went 404 → 400. Criteria 2 and 3 conflict on that input; criterion 2 is the specific rule for a numeric-but-invalid reference, so it wins. Recorded rather than hidden. |
| 4 | New sibling not shadowed | Already true before this ticket, guarded by `build-route-order.spec.ts` — **run, passes**. |

This is done.
