# Why the product was non-functional — measured, not guessed

Reproduced by booting the API (`pnpm start:prod`, port 1500), minting a real owner JWT and calling the
actual endpoints. None of these faults is visible to `tsc`, `nest build`, or any unit test with a
mocked `db` — which is exactly why "complete" was reported and was wrong.

## FAULT 1 — every authenticated request could 500

```
POST /build/9/tickets  ->  500 {"error":"An unexpected error occurred"}
  UpstashError: max requests limit exceeded. Limit: 500000, Usage: 500002
    at JwtAuthGuard.canActivate (jwt-auth.guard.js:143)
```

The Upstash plan is exhausted — an account issue. But `jwt-auth.guard.ts` awaited Redis with **no
try/catch**, so any Redis fault (quota, rate limit, network blip, cold start) became a 500 on every
authenticated request to every module. Intermittent because a 5s in-process cache masked it.

**Fixed.** The lookup is a revocation *tombstone* — absence already means "not revoked" — so a failed
read degrades to "not revoked" and logs loudly, and a degraded read is not memoised. Failing closed
here locks every user out of a working system.

## FAULT 2 — 73 endpoints demanded a header the client never sent

```
POST /build/9/tickets -> 400 {"error":"An Idempotency-Key header is required for this operation"}
```

`idempotency.interceptor.ts` rejects any `@Idempotent` route without the header; **73 endpoints** carry
it; `frontend/lib/api-client.ts` set only `Authorization` and `Content-Type`. Every create/approve/
apply was a guaranteed 400 from the UI — a contract break between two halves that both compile.

**Fixed** in `authedFetch`, so no call site can forget it, reusing the same key across the 401
refresh-retry so a token refresh dedupes instead of creating two rows.

## FAULT 3 — project creation was broken since migration 0333

`projects.pm_workspace_id` is NOT NULL with no default, and `createProject` never set it. A previous
agent had written `resolveDefaultWorkspaceId` and a comment listing the call sites it *"could not
modify — report to maintainer"*. Nobody wired them.

**Fixed** — wired in `createProject` and `createFromDeal`.

## FAULT 4 — template projects got the wrong workflow

Two drifted copies of the default status list. Provisioning seeded `TODO/IN_PROGRESS/IN_REVIEW/DONE`
with a `type`; templates seeded `"To Do"/"In Progress"/"Done"` with **no type**. Consequences:

- `tickets.status` defaults to `'TODO'` and is a composite FK into `project_statuses`, so no row named
  `TODO` meant every ticket insert in a template project failed the FK;
- `type` fell back to `'unstarted'`, so the **"Done" column was not typed as completed** — and `type`
  is what every report reads. The board looked right while velocity and burndown were wrong.

**Fixed** — one `DEFAULT_PROJECT_STATUSES` constant, used by both paths.

## Proven working end-to-end

```
POST   /build/9/tickets                 201   id 204256, status TODO, number 3335
PATCH  .../status                       200   -> IN_PROGRESS
PATCH  .../assignee                     200   -> 1ad20737-…
PATCH  .../priority + title             200   -> HIGH, renamed
GET    .../204256                       200   all persisted, version 4
```

`version: 4` shows optimistic locking incrementing per write. Fault 3/4 verified by driving the real
compiled service against the real database (the app cannot boot — see below):

```
createProject OK -> id 74 | key EEF-820 | pmWorkspaceId dc187574-…
seeded statuses -> TODO:unstarted, IN_PROGRESS:started, IN_REVIEW:started, DONE:completed
ticket in fresh project OK -> id 204257 | status TODO
```

## What this says about verification

Typecheck, build, unit tests and SQL probes all passed while the product was unusable:
unit tests mock `db` so they never execute a guard, an interceptor or a constraint; SQL probes bypass
HTTP so they miss both; nothing exercised the frontend↔backend contract. **Booting the app and driving
the real flow is the only verification that would have caught any of this**, and it belongs in the
Definition of Done rather than after it.

## ⚠️ Standing hazard: uncommitted work disappears

The root repo was reset by a concurrent session mid-session: `frontend/lib/api-client.ts` returned to
`HEAD` (losing the idempotency fix, silently — `git diff` showed nothing) and untracked files under
`docs/architecture/` were deleted. Five programs share this tree and nothing is committed (B-04).
Re-check `grep -c "Idempotency-Key" frontend/lib/api-client.ts` before trusting any UI test.

## Unblocked — full end-to-end run over HTTP

The concurrent session landed `db/compat/organization-holidays`; typecheck is 0 and the API boots.
Every flow driven against the running server:

```
POST  /build                                   201  project 75
POST  /build/75/tickets                        201  ticket 204258, status TODO, number 1
PATCH /build/75/tickets/204258  status         200  -> IN_PROGRESS
PATCH /build/75/tickets/204258  assignee       200  -> 581a21d3-…
POST  /ai/projects/75/tickets/draft/suggest-title        201
      -> "500 Error on Login: Users Unable to Sign In"
POST  /ai/projects/75/tickets/draft/improve-description  201
      -> "<p><strong>Overview:</strong> The login page intermittently throws a 500…"
GET   /build/75/tickets/204258                 200  all persisted, version 3
```

`number: 1` is the new counter allocating from a freshly seeded project.

### Correction: the AI feature already existed

I reported that AI title/description generation "does not exist — only blog". **That was wrong.** It is
built on both ends: `projects-ai.controller.ts` (`suggest-title`, `improve-description`,
`suggest-fields`, `summarize`), `hooks/api/build/ticket-ai.ts`, and mounted UI in
`features/build/ai/` — `create-ticket-dialog.tsx`, `ticket-dialog-title-field.tsx`,
`ticket-dialog-description-section.tsx`, `ticket-detail-main-section.tsx`. I had grepped for
`generateTitle`/`suggestTitle` under `modules/build/`; the code lives in the AI module under different
names. It was broken by FAULT 1 like everything else, not missing.

### AI is plan-gated, and that is correct

With the org on `STARTER` the endpoints return `402 FEATURE_NOT_AVAILABLE`. `ai.project-manager` and
`ai.ticket-insights` require **PROFESSIONAL** (`feature-gates.ts`). All six orgs are on STARTER, so AI
is off by entitlement, not by defect. Verified by temporarily setting one org to PROFESSIONAL — both
endpoints returned 201 with real content — then restoring it to STARTER.

**Action for you:** if AI should be available to these orgs, the subscription plan is the lever, not the
code.
