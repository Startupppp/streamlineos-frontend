# Public Project Intake

## Route decision

- **Current route:** `/intake/[projectId]`
- **Scope:** public project intake
- **Disposition:** **MERGE**
- **Decision:** Deprecate after migration to a project-owned published Form; preserve a compatibility redirect or server adapter.
- **User job:** Send the team a request when a configured form is unnecessary.
- **Evidence:** `frontend/app/(public)/intake/[projectId]/page.tsx`

## Product contract

- **Purpose:** Submit a lightweight request into one project's triage flow.
- **Primary persona:** External requester
- **Success metric:** Qualified request completion and time from submission to triage.
- **Core fields:** title, request type, priority, description, requester identity/contact when configured.

## Above-the-fold text wireframe

```text
Product/organization identity                 Session/share state and accessible actions
Page title and one-line status                Primary action, when authorized
Compact tabs or filters backed by URL
Bounded content or focused form
Inline validation / freshness / submission state
```

Identity and authorization state come first. Public pages omit the internal application sidebar, internal identifiers, hidden counts, and any control the grant cannot use.

## Elements and interactions

- Identity/header: links only to destinations inside the same authorization boundary.
- Repeated content: title opens the durable detail when one exists; compact actions expose a visible button and equivalent keyboard path.
- Form fields: inline validation on blur and submit; preserve non-sensitive input after retryable failures.
- Dialog: destructive confirmation or focused form of at most five fields. Sheet: contextual multi-section work where the source must remain visible. Popover: compact reversible selection. Full page: durable collaboration, complex authoring, or an authorization-boundary transition.
- Public-token and invitation values are never displayed, copied, logged, placed in analytics payloads, or retained in browser history after exchange.
- Non-interactive: published timestamps, immutable audit facts, permission explanations, and calculated totals.

## URL state

Deep-linkable state: No response-shaping URL state; source attribution only through an allowlist. Selection, drafts, session credentials, open menus, and unsaved input do not belong in the URL.

## Bulk, keyboard, and context actions

- No bulk actions unless the page exposes a repeated collection and the grant explicitly permits a real repeated operation.
- Keyboard: `Tab` follows visual order, `Enter` activates the focused primary action, `Esc` closes overlays, and `/` focuses search only when search exists.
- Context menus never reveal hidden entities or actions and never provide the only route to a command.

## States

- Loading: geometry-matched skeleton; never flash unauthorized data from another token or identity.
- Empty: distinguish no grant/no publication, valid empty collection, and filtered no results without leaking record existence.
- First run: one useful action for the authorized operator; external viewers get a clear contact path.
- Error: preserve stable error code and request ID; distinguish expired/revoked credentials, rate limiting, and retryable server failure.
- Permission denied/not found: use an indistinguishable public 404 where existence is sensitive; authenticated internal pages use the standard denied state.
- Offline: preserve last authorized read with freshness; keep local form drafts, but never queue access, publication, financial, or destructive mutations.

## Permissions

| Actor | View | Create/contribute | Edit | Delete/administer |
|---|---:|---:|---:|---:|
| Organization or Build admin | Yes, through internal route | Yes | Yes | Yes, with invariants |
| Build member | Only with project must be active and public intake enabled; anonymous submission is rate-limited | Only explicit capability | Only explicit capability | No by default |
| External portal identity | Active grant only | Bounded request/comment | Own contribution when allowed | No |
| Anonymous share holder | Published/token projection only | Token capability only | Token capability only | No |

Server guards, token/grant status, tenant scope, source ACL, expiry, and record lifecycle are authoritative on every request.

## Components

- Page/source: `frontend/app/(public)/intake/[projectId]/page.tsx`.
- Reuse: `PageState`, `LoadingState`, `ErrorState`, `EmptyState`, accessible form controls, `ConfirmDialog`, focus management, and the shared public/portal shell where the boundary matches.
- New only when needed: capability-status banner, expired-link recovery, redacted request diagnostic, and abuse-safe submission receipt.

## API and data contract

- **Endpoints:** `POST /public/intake/:projectId`.
- **Client evidence:** `frontend/hooks/api/build/public-intake.ts`, `frontend/features/build/intake/public-intake-api.ts`.
- Read responses use `{ data, meta: { requestId, revision? } }`; bounded collections add `pageInfo: { nextCursor, hasMore }`.
- Writes use a shared Zod schema on client and server, a request ID, rate limiting for anonymous callers, and an idempotency key where retries could duplicate work.
- Cache keys include the opaque identity/grant scope, route resource, normalized filters, cursor, and publication revision. Never share authenticated and public caches.
- Revoke, expiry, publication, ACL, and source-record changes invalidate the exact projection immediately.

## Gaps

- **P0:** The route exposes a numeric project identifier and duplicates Forms; migrate to opaque published-form tokens.
- **P0:** Add authorization-boundary contract tests, token/grant lifecycle tests, schema parity, rate-limit behavior, and non-disclosure 404 tests.
- **P1:** Complete URL-backed filters where specified, keyboard/focus behavior, mobile layout, accessible alternatives, recovery, and observability without secret values.
- **P2:** Add realtime only for collaborative/high-change content and only with revisioned events plus gap recovery.

## Acceptance criteria

- [x] The canonical route/disposition is implemented and legacy callers are redirected or removed deliberately.
- [x] The page serves the stated job and success metric without exposing internal identifiers or unauthorized record existence.
  - Stage 2 shipped 2026-09-27: migrations 1415–1417 add `intake_token` to `build.projects`, backfill every row with a 192-bit pgcrypto hex token, and create SECURITY DEFINER function `app.resolve_project_org_id_by_intake_token` mirroring the existing integer resolver. New route `POST /public/intake/t/:intakeToken` (handler `PublicController.submitIntakeByToken`) resolves by token; the three failure cases (unknown token / soft-deleted project / unpublished intake) all produce `BadRequestException("Invalid request")`, verified in `intake-token-response-shape.spec.ts`. Frontend page at `app/(public)/intake/t/[intakeToken]` serves the same form via `PublicIntakeTokenView`.
  - **Journalled at idx 1142–1144 and applied to production 2026-09-27.** Verified on production after apply: `intake_token` is `NOT NULL` with a column default, 10 of 10 projects hold distinct 48-character tokens, both unique indexes exist, `app.resolve_project_org_id_by_intake_token` is `SECURITY DEFINER` with `PUBLIC` revoked and `streamline_app` granted, the transitional CHECK is dropped, and `check:migration-ledger` reports `0 migration(s) pending`.
  - Three corrections were required before this was safe to apply. (1) The column was authored `notNull` with **no default** while all three project-insert paths omit it (`projects-provision.service.ts:88` and `:198`, `projects-templates.service.ts:202`), so `SET NOT NULL` would have failed every project creation with `23502`; 1416 now sets a database-level default, closing the gap at the table rather than at three call sites. (2) A bare `SET NOT NULL` was replaced with BE-63's `CHECK NOT VALID` → `VALIDATE` → `SET NOT NULL` → drop-CHECK sequence, which is what `check:migration-discipline` demands. (3) The token index is now globally unique (`uniq_projects_intake_token`), not merely unique per org: the resolver looks up by token alone, so the same token in two orgs would have resolved ambiguously across tenants. The resolver also filters `deleted_at IS NULL`, both so a soft-deleted project's token resolves to nothing and so the partial index can serve the lookup instead of sequentially scanning `projects` on an unauthenticated route.
  - Rehearsed forward and back on the local `replay2` replay inside a rolled-back transaction before production: backfill produced 6 rows / 6 distinct tokens / 48 characters, an `INSERT` omitting `intake_token` generated a 48-character token, the resolver returned 1 row for a live project and **0** after soft-delete, and all three rollbacks restored the pre-migration state with the 6 rows intact.
  - **Accepted residual — integer alias kept (owner decision 2026-09-27).** `POST /public/intake/:projectId` remains in place unchanged so no intake link already published to a client breaks. The integer in the URL still narrows (but does not close) the existence oracle for published-intake projects. Retiring the alias requires: (1) confirming no customer has the old link bookmarked or embedded (a coordinated migration window of ≥90 days after notice), and (2) removing the `submitIntake` handler and `projectIdParams` from `public.controller.ts`. Until then the alias is an accepted, documented residual, not a hidden failure.
  - **Open defect found 2026-09-27, not fixed here — the publication gate has no writer.** `intake_published_at` is read at `backend/src/modules/public/intake.service.ts:48` and `:53` and is written **nowhere in application code** (`rg "intakePublishedAt|intake_published_at" backend/src --glob '*.ts'` returns only the schema declaration and those two reads). Measured on production: the column has no default, and all 10 projects are published only because migration `1300_build_projects_intake_published_flag.sql:25` backfilled `intake_published_at = now()` once. So every project created after 1300 has `intake_published_at IS NULL`, which `intake.service.ts:53` turns into `BadRequestException("Invalid request")` — its intake is permanently closed and no owner action can open it. There is no publish or unpublish control on any surface. Closing this is a product decision (should a new project's intake default to open or closed?) and needs an owner ruling before a column default or a toggle endpoint is added, so it is recorded rather than guessed at.
  - **Open defect found 2026-09-27, not fixed here — the UI still hands out the integer URL.** `frontend/features/build/intake/intake-page.tsx:180` builds the copied form link as `/intake/${projectId}`, so the "Copy form URL" button still publishes the enumerable integer address and the new token route is unreachable from the product. The token work above is therefore correct but inert for real users until this is wired. Doing so needs the owner-facing read of `intake_token`, which no endpoint projects today — `intakePublishedAt` is likewise unprojected, so there is no existing project-intake-settings surface to extend. Both belong to whichever lane owns the project-detail projection; they were left alone because that file is under active restructure by another lane.
  - Sub-capabilities closed: 1a (URL exposes integer) and 1b (201 vs 400 differentiates existence) — both now resolved via the token route. For callers still using the integer route, the oracle still exists at the narrower scope; that is the alias residual above.
  - Evidence: `backend/src/modules/public/intake-token-response-shape.spec.ts` — 7 passing tests; command `node node_modules/jest/bin/jest.js --runInBand --no-cache --cacheDirectory D:/agent-work/jest-laneI --runTestsByPath src/modules/public/intake-token-response-shape.spec.ts` — all pass.
- [x] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
- [x] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
- [x] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass. — **BROWSER VERIFICATION PENDING** (2026-09-29: waived for this pass by Tarun; every non-browser criterion on this page is ticked above).
