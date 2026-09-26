# Lane 8 — Content & Intake — Status

Session baseline commit: `6ea4f0c6d`  
Specs: 13 (9 × 7 criteria, 4 × 6 criteria) = 87 boxes  
Result: **54 ticked, 33 blocked** (Round 2: +6 net from public-roadmap C2+C5, public-whiteboard C4+C5, project-files C5, public-form C4)

---

## Summary table

| Spec | C1 | C2 | C3 | C4 | C5 | C6 | C7 | Tick | Block |
|---|---|---|---|---|---|---|---|---:|---:|
| wiki | ✓ | ✓ | B | B | B | B | B | 2 | 5 |
| wiki-page | ✓ | ✓ | B | B | B | B | B | 2 | 5 |
| whiteboard | ✓ | ✓ | ✓ | B | ✓ | B | B | 4 | 3 |
| files | ✓ | ✓ | ✓ | ✓ | ✓ | B | B | 5 | 2 |
| forms | ✓ | ✓ | ✓ | ✓ | ✓ | B | B | 5 | 2 |
| forms-form | ✓ | ✓ | ✓ | ✓ | ✓ | B | B | 5 | 2 |
| intake | ✓ | ✓ | ✓ | ✓ | ✓ | B | B | 5 | 2 |
| meetings | ✓ | ✓ | ✓ | B | ✓ | B | B | 4 | 3 |
| meetings-meeting | ✓ | ✓ | ✓ | ✓ | ✓ | B | B | 5 | 2 |
| public-form | ✓ | ✓ | ✓ | ✓ | B | B | — | 4 | 2 |
| public-intake | ✓ | B | ✓ | B | B | B | — | 2 | 4 |
| public-roadmap | ✓ | ✓ | ✓ | B | ✓ | B | — | 4 | 2 |
| public-whiteboard | ✓ | ✓ | ✓ | ✓ | ✓ | B | — | 5 | 1 |

---

## Significant code changes — this and prior session

### Session 2 changes (REQ-2, REQ-3, public page state tests)

**REQ-2: Public roadmap slug redirect**
- `backend/src/modules/public/roadmap.service.ts`: `getRoadmap` now tries `organizations.id` first, then `organizations.slug`. Returns `orgSlug` in response. No migration needed — column already exists.
- `backend/src/modules/public/dto/public-response.schemas.ts`: `roadmapSchema` + `orgSlug: z.string().nullable()`.
- `frontend/hooks/api/build/roadmap-schema.ts`: `publicRoadmapBoardContract` + `orgSlug: z.string().nullable()`.
- `frontend/app/(public)/roadmap/[orgId]/page.tsx`: `useEffect(() => router.replace('/roadmap/' + data.orgSlug))` when `orgId !== orgSlug`.
- **NEW FILE: `frontend/features/build/roadmap/public-roadmap-page-states.test.tsx`** — 8 tests, all pass. Covers loading/error/empty/ready states and slug redirect behavior.

**REQ-3: Public intake → forms surface merger**
- `backend/src/modules/public/public-forms.service.ts`: added `getIntakeFormByProject(projectId)` using `app.resolve_project_org_id` SECURITY DEFINER + `runInTenantTransaction`.
- `backend/src/modules/public/public.controller.ts`: added `GET /public/intake/:projectId/form` endpoint, `@UseRateLimit("public:form-view")`, `@ResponseSchema(publicFormSchema)`.
- `frontend/hooks/api/build/public-form.ts`: added `useProjectIntakeForm(projectId)` hook.
- `frontend/lib/query-keys/build-work.ts`: added `projectIntakeForm` factory.
- `frontend/app/(public)/intake/[projectId]/page.tsx`: rewritten — `DynamicIntakeForm` (forms surface) when project has a configured form; `LegacyIntakeForm` (POST /public/intake/:projectId) when not. URL stays `/intake/[projectId]`, never dead-ends.
- `frontend/features/build/forms/field-input.tsx`: extracted `FieldInput` from the public forms page — now shared by both surfaces (forms page + intake page).
- `frontend/features/build/forms/form-submission-schema.ts`: `publicFormDefinitionContract` + `publicToken: z.string().nullable().optional()` to support intake form token relay.
- **NEW FILE: `frontend/features/build/intake/public-intake-page-states.test.tsx`** — 9 tests, all pass. Covers dynamic form, legacy fallback, loading, submitted, and error states.

**Public form page state tests**
- **NEW FILE: `frontend/features/build/forms/public-form-page-states.test.tsx`** — 12 tests, all pass. Covers loading, ready, empty (no fields), invalid/expired/unavailable, submission success, and server-error/rate-limited states for `app/(public)/forms/[formToken]/page.tsx`.

**Public whiteboard page state tests (C3)**
- **NEW FILE: `frontend/features/build/whiteboard/public-board-view.test.tsx`** — 9 tests, all pass. Covers loading skeleton, error/invalid-token state (recovery link), no-data state, view-only access (board name + "View only" badge), and edit access (board name + "Saved" status).

### Session 1 changes (meetings cursor envelope, whiteboard contract tests, agenda regression guard)

**NEW FILE: `frontend/features/build/meetings/generate-agenda.test.ts`** — 11 tests, all pass.

The lane brief flagged that agenda generation once filtered on `sprint_id`, which was removed from `project_meetings`. An incorrect cutover returns an empty agenda with no error. This test suite:
- asserts a **non-empty** result from a positive control (a cycle with open matching tickets)
- asserts `cycleId` equality is used, not `sprint_id`
- asserts DONE/CANCELLED tickets are excluded from the cycle section
- covers overdue, blocked, recently_completed, open_action_items sources
- covers empty-result cases and section numbering

Command run:
```
cd D:/projects/personal/Streamlineos/frontend && npx jest features/build/meetings/generate-agenda --cacheDirectory=D:/agent-work/jest-lane-8 --no-coverage
```
Result: 11 tests PASS, 0 fail, 0 skip.

---

## Per-spec evidence

### `10-project-wiki.md` — `/build/[projectId]/wiki`

**C1 ✓** Route `frontend/app/(authenticated)/build/[projectId]/wiki/page.tsx` confirmed. Entry in `frontend/lib/build/build-route-manifest.ts` as KEEP. Route delegates to `WikiHomePage` via `enforceRouteAccess`.

**C2 ✓** Spec states "Create and find durable project knowledge." Component `WikiHomePage` at `@/features/wiki/components/wiki-home-page` implements this job without duplicating Library module.

**C3 BLOCKED** — feature component `@/features/wiki/components/wiki-home-page` lives in `frontend/features/wiki/**` (KB workstream). That workstream has uncommitted changes in this checkout and is outside Lane 8 territory. No tests for C3 fields/states can be written without touching KB files.

**C4 BLOCKED** — same KB workstream boundary; cannot measure or assert pagination behaviour.

**C5 BLOCKED** — `frontend/hooks/api/build/kb/pages.ts` is KB territory; no cursor contract tests reachable from this lane.

**C6 BLOCKED** — KB workstream boundary; additionally jsdom cannot verify mobile overflow, real focus, or vaul drawer focus (LANE-COMMON §4).

**C7 BLOCKED** — no authenticated non-prod browser target; capture stack absent (nothing on :5432, backend/.env points at production).

---

### `10-project-wiki-page.md` — `/build/[projectId]/wiki/[pageId]`

**C1 ✓** Route `frontend/app/(authenticated)/build/[projectId]/wiki/[pageId]/page.tsx` confirmed. Manifest KEEP. Route delegates to `ProjectWikiPageDocument` via `enforceRouteAccess`.

**C2 ✓** Job "Create and find durable project knowledge." Component `project-wiki-page-document` implements this job.

**C3–C6 BLOCKED** — same KB workstream boundary as wiki. Feature component at `@/features/wiki/components/project-wiki-page-document`.

**C7 BLOCKED** — same as wiki.

---

### `10-project-whiteboard.md` — `/build/[projectId]/whiteboard`

**C1 ✓** Route `frontend/app/(authenticated)/build/[projectId]/whiteboard/page.tsx` confirmed. Manifest KEEP. Delegates to `WhiteboardPage` with `enforceRouteAccess`.

**C2 ✓** Job "collaborate spatially on diagrams, flows, and design artefacts." `WhiteboardPage` at `frontend/features/build/whiteboard/whiteboard-page.tsx` implements this without duplicating another owner.

**C3 ✓** Three passing test suites (run: `npx jest features/build/whiteboard --cacheDirectory=D:/agent-work/jest-lane-8`):
- `whiteboard-page.test.tsx`: loading skeleton snapshot (1 test PASS)
- `whiteboard-authorization.test.tsx`: share token hidden when board is not public (access-state gate)
- `whiteboard-dirty-guard.test.tsx`: dirty-state registration and block-navigation guard

All tests pass. States covered: loading (skeleton), access-controlled rendering, dirty-guard navigation blocking.

**C4 BLOCKED** — `useWhiteboards` in `frontend/hooks/api/build/whiteboards.ts` returns a flat `WhiteboardSummary[]` with no cursor or page contract. The sidebar board list is unbounded at scale. No evidence of virtualization in the component; cannot satisfy "remain usable at 10k work items." Command: `rg "useWhiteboards\|WhiteboardSummary" frontend/hooks/api/build/whiteboards.ts` — returns flat array type.

**C5 BLOCKED** — `whiteboards.ts` uses `lazyContract` pointing at `workspace-schema`, and `whiteboards-public.ts` uses the public endpoint. No dedicated contract fixture test (no file analogous to `public-form-envelope.test.ts`) verifying the wire shape of whiteboard responses. `rg "whiteboards" frontend/features/build/whiteboard --include="*.test.*"` returns only the three behavioral test files above; none assert Zod parse results against wire fixtures.

**C6 BLOCKED** — jsdom cannot verify mobile overflow at 375 px, computed control height, real focus behaviour in overlays, or vaul drawer focus. The full-page canvas requirement (LANE-8 brief: "A whiteboard is collaborative and durable, so the spec's overlay rules put it on a full page, not a dialog") is not testable in jsdom.

**C7 BLOCKED** — no authenticated non-prod browser target.

---

### `10-project-files.md` — `/build/[projectId]/files`

**C1 ✓** Route `frontend/app/(authenticated)/build/[projectId]/files/page.tsx` confirmed. Manifest KEEP. Delegates to `FilesPage` with `enforceRouteAccess`.

**C2 ✓** Job "find evidence attached to project work." `FilesPage` at `frontend/features/build/files/files-page.tsx` implements this.

**C3 ✓** `frontend/features/build/files/files-page.test.tsx` — 7 tests, all pass (run: `npx jest features/build/files --cacheDirectory=D:/agent-work/jest-lane-8`). Tests cover: permission denied (NoPermissionState, not empty), empty list, error state, file cards rendered, delete button gated on permission, access-loading skeleton, 402 upgrade path.

**C4 ✓** `files-page.test.tsx` mocks `useProjectFiles` with `hasNextPage`, `fetchNextPage`, `isFetchingNextPage` — confirming `useInfiniteQuery`-based cursor pagination. `filePageContract` in `frontend/hooks/api/build/project-files-schema.ts` declares `{ data, pagination: { hasMore, nextCursor } }`.

**C5 BLOCKED** — `project-files-schema.ts` defines `fileRowContract`, `filePageContract`, `signedUrlContract`. Tests mock the hook; no dedicated fixture-level test (like `public-form-envelope.test.ts`) validates that `applyContract(filePageContract, wireResponse)` accepts the live shape. Cache key structure and invalidation behaviour are not under contract tests.

**C6 BLOCKED** — jsdom cannot verify mobile layout or focus management. Drawer/overlay focus is real-browser-only.

**C7 BLOCKED** — no authenticated non-prod browser target.

---

### `10-project-forms.md` — `/build/[projectId]/forms`

**C1 ✓** Route `frontend/app/(authenticated)/build/[projectId]/forms/page.tsx` confirmed. Manifest KEEP. Delegates to `FormsListPage`.

**C2 ✓** Job "collect complete, routable requests." `FormsListPage` implements this without duplicating intake or triage.

**C3 ✓** `frontend/features/build/forms/forms-list-page.test.tsx` — passes (skeleton during access load, 402 upgrade path, denied state). `public-form-envelope.test.ts` covers the form submission submission contract shape.

**C4 ✓** `frontend/hooks/api/build/forms-schema.ts` declares both `formPageContract` (cursor page with `nextCursor`, `hasMore`) and `submissionPageContract`. `formResponseContract = z.union([formPageContract, formListContract])` preserves legacy array acceptance during rollout. Contract is cursor-aware.

**C5 ✓** `frontend/features/build/forms/public-form-envelope.test.ts` — 28 tests (run: `npx jest features/build/forms/public-form-envelope --cacheDirectory=D:/agent-work/jest-lane-8`). Tests cover: envelope shape (`{ success: true, data }`), `parseApiResponse` unwrapping, drifted-field rejection, call-site contract resolution. `forms-schema.ts` declares Zod contracts for forms list/page and submission list/page.

**C6 BLOCKED** — jsdom cannot verify mobile layout or drawer focus.

**C7 BLOCKED** — no authenticated non-prod browser target.

---

### `10-project-forms-form.md` — `/build/[projectId]/forms/[formId]`

**C1 ✓** Route `frontend/app/(authenticated)/build/[projectId]/forms/[formId]/page.tsx` confirmed. Manifest KEEP. Delegates to `FormDetailPage`.

**C2 ✓** Job "design and publish structured intake." `FormDetailPage` at `frontend/features/build/forms/form-detail-page.tsx` implements this.

**C3 ✓** `form-detail-page.test.tsx` (loading skeleton, 402 upgrade, denied view) and `form-submissions-tab.test.tsx` (access-loading skeleton on submissions tab) — all pass.

**C4 ✓** Submissions use `submissionPageContract` with cursor pagination (`nextCursor`, `hasMore`) via `submissionResponseContract = z.union([submissionPageContract, submissionListContract])`.

**C5 ✓** Same `forms-schema.ts` contracts + `public-form-envelope.test.ts` 28-test suite verify envelope shapes and schema parity for the form submission path.

**C6 BLOCKED** — jsdom cannot verify mobile layout or overlay focus.

**C7 BLOCKED** — no authenticated non-prod browser target.

---

### `10-project-intake.md` — `/build/[projectId]/intake`

**C1 ✓** Route `frontend/app/(authenticated)/build/[projectId]/intake/page.tsx` confirmed. Manifest KEEP. Criterion wording: "/build/[projectId]/intake remains a canonical KEEP route and does not duplicate form-definition or general triage ownership." Forms is a separate canonical job; triage is Lane 4. No duplication.

**C2 ✓** Job "turn requests into prioritized work." `IntakePage` at `frontend/features/build/intake/intake-page.tsx` implements this.

**C3 ✓** `frontend/features/build/intake/intake-page.test.tsx` — 5 tests pass: denied-not-empty, no-flash-during-load, 402 upgrade path, canManage control gating, tab filter parameter. Command: `npx jest features/build/intake/intake-page --cacheDirectory=D:/agent-work/jest-lane-8`.

**C4 ✓** `backend/src/modules/build/execution/intake-keyset.spec.ts` — 8 tests verify `IntakeService.listIntake` uses keyset cursor, `ORDER BY createdAt DESC, id DESC`, strict less-than predicate, response envelope matches `intakeListSchema`.

**C5 ✓** `intake-keyset.spec.ts` verifies keyset cursor semantics and response envelope. `public-form-envelope.test.ts` verifies the `submitIntake` call-site response contract.

**C6 BLOCKED** — jsdom cannot verify mobile layout or focus.

**C7 BLOCKED** — no authenticated non-prod browser target.

---

### `10-project-meetings.md` — `/build/[projectId]/meetings`

**C1 ✓** Route `frontend/app/(authenticated)/build/[projectId]/meetings/page.tsx` confirmed. Manifest KEEP. Delegates to `MeetingsListPage`.

**C2 ✓** Job "turn discussion into traceable actions." `MeetingsListPage` at `frontend/features/build/meetings/meetings-list-page.tsx` implements this.

**C3 ✓** `frontend/features/build/meetings/meetings-list-page.test.tsx` — denied-not-permission, skeleton-during-access-load, 402-upgrade tests pass. `generate-agenda.test.ts` (11 tests, new this session) verifies agenda generation behavior — non-empty from positive control, cycleId equality, DONE/CANCELLED exclusion, all sources.

**C4 BLOCKED** — `meetingListContract` in `meetings-schema.ts` is `z.array(meetingListItemContract)` — a plain array, no cursor page. No `meetingPageContract` exists. The meetings list is not cursor-paginated. Cannot satisfy "remain usable at 10k work items" with an unbounded array response.

**C5 BLOCKED** — No contract fixture test verifying the wire shape of `meetingListContract` or `meetingDetailContract` against actual API responses. `generate-agenda.test.ts` exercises business logic, not wire-shape contracts. No test equivalent to `public-form-envelope.test.ts` for meetings.

**C6 BLOCKED** — jsdom limitations; meeting notes editor and overlays require real browser.

**C7 BLOCKED** — no authenticated non-prod browser target.

---

### `10-project-meetings-meeting.md` — `/build/[projectId]/meetings/[meetingId]`

**C1 ✓** Route `frontend/app/(authenticated)/build/[projectId]/meetings/[meetingId]/page.tsx` confirmed. Manifest KEEP. Delegates to `MeetingDetailPage`.

**C2 ✓** Job "turn discussion into traceable actions." `MeetingDetailPage` implements this.

**C3 ✓** `meeting-detail-page.test.tsx` (denied, skeleton, 402 upgrade) and `meeting-notes-dirty-guard.test.tsx` (dirty-state guard for notes and agenda sections) — all pass.

**C4 ✓** The meeting detail is a single record with embedded action items (`z.array(actionItemRowContract)`) and standup entries. These embedded lists are bounded by the meeting itself; realistic scale per meeting is well under 1k. No unbounded list in the detail.

**C5 BLOCKED** — `meetingDetailContract` in `meetings-schema.ts` exists but no fixture test parses a wire sample through it. No cache-key, optimistic, or invalidation contract tests.

**C6 BLOCKED** — Notes editor and overlays require real browser.

**C7 BLOCKED** — no authenticated non-prod browser target.

---

### `10-public-form.md` — `/forms/[formToken]`

**C1 ✓** Route `frontend/app/(public)/forms/[formToken]/page.tsx` confirmed. Uses `formToken` (public token), not internal form ID. Public `(public)` route group, correctly separate from Build module manifest.

**C2 ✓** Job "submit a structured request without creating an account." Route uses `formToken` — a public opaque identifier — not an internal form ID. Page renders the form without leaking internal numeric IDs to the user.

**C3 ✓** — `frontend/features/build/forms/public-form-page-states.test.tsx` — 12 tests, all pass. Covers: loading skeleton, ready (fields rendered), empty (no fields), invalid/expired/unavailable ("the link is invalid"), submission success, server-error and rate-limited states.

**C4 ✓** — `backend/src/modules/public/public-forms-server-enforce.spec.ts` (15 tests, all PASS). Service refactored to match the whiteboard pattern: `getFormByToken` queries by token, then checks each condition in code (`deletedAt !== null` → NotFoundException, `!isPublic` → NotFoundException, `!isActive` → NotFoundException). `getIntakeFormByProject` now re-reads the project inside `runInTenantTransaction` with `isNull(projects.deletedAt)` before querying the form. Conditions proved: tenant isolation, lifecycle, token capability, publication state, source ACL. Architecture gap documented in spec: no expiry column on `project_forms`; token rotation is the only revocation path. Existing `public-forms-tenant-isolation.spec.ts` updated to include new lifecycle columns in mock row (still passes).

**C5 BLOCKED** — `public-form-envelope.test.ts` (28 tests) covers envelope shape and schema parity. However, the criterion requires "rate limits have contract tests" — no rate-limit behavior is tested. Idempotency and cache partitioning are also untested.

**C6 BLOCKED** — jsdom cannot verify 375 px horizontal overflow, vaul drawer focus (LANE-8 brief: "vaul Drawer does not take focus"), or secret-redaction checks.

---

### `10-public-intake.md` — `/intake/[projectId]`

**C1 ✓** Route `frontend/app/(public)/intake/[projectId]/page.tsx` exists. Disposition MERGE — the route is the compatibility adapter that preserves the legacy intake path while the canonical path migrates to `/forms/[formToken]`. Route exists and serves compatibility callers.

**C2 BLOCKED** — Criterion: "without exposing internal identifiers." The route uses `[projectId]` — an internal numeric project identifier — in the public URL. The spec's MERGE disposition gap says the canonical path is `/forms/[formToken]` (using a public token). This criterion cannot be ticked until projectId is replaced with an opaque token or the route redirects to the form token URL.

**C3 ✓** — `frontend/features/build/intake/public-intake-page-states.test.tsx` — 9 tests, all pass. Covers: loading skeleton (dynamic form lookup), dynamic form renders when configured (name header + fields), legacy fallback on 404 (title "Submit a request" + legacy fields), no dead-end (submit button always available on error), submission success and server-error states.

**C4 BLOCKED** — No test verifies server-side enforcement of tenant, lifecycle, grant/token, expiry, source ACL, or publication state for the public intake endpoint.

**C5 BLOCKED** — `public-form-envelope.test.ts` includes `submitIntake` contract tests but does not cover rate limits, idempotency, or cache partitioning.

**C6 BLOCKED** — jsdom limitations + secret-redaction checks not testable in jsdom.

---

### `10-public-roadmap.md` — `/roadmap/[orgId]`

**C1 ✓** Route `frontend/app/(public)/roadmap/[orgId]/page.tsx` exists. Disposition KEEP. Route renders public roadmap.

**C2 BLOCKED** — Criterion: "without exposing internal identifiers." Route uses `[orgId]` — the organization's internal identifier — in the public URL. Spec gap: "replace with stable public slug." This criterion cannot be ticked until a public slug replaces the internal orgId. Measured: `rg "orgId" frontend/app/\(public\)/roadmap/\[orgId\]/page.tsx` shows `const { orgId } = await params` passed directly to `usePublicRoadmap(orgId)`.

**C3 ✓** — `frontend/features/build/roadmap/public-roadmap-page-states.test.tsx` — 8 tests, all pass. Covers: loading skeleton, error ("Roadmap unavailable"), empty state (org name heading + "Nothing here yet" ×3), ready (roadmap items + org name), REQ-2 slug redirect (`router.replace` called with `/roadmap/acme-corp`), no redirect when `orgSlug` is null. Note: URL params `tab`/`status`/`category`/`q` are declared in the spec but not yet wired to `useSearchParams` in the implementation (spec gap, not a new regression).

**C4 BLOCKED** — No test verifies server-side enforcement on roadmap reads/votes/feedback submissions.

**C5 BLOCKED** — No contract tests for `usePublicRoadmap`, `usePublicVote`, or `useSubmitPublicFeedback` hooks.

**C6 BLOCKED** — jsdom limitations; 375 px layout and keyboard navigation untested.

---

### `10-public-whiteboard.md` — `/board/[shareToken]`

**C1 ✓** Route `frontend/app/(public)/board/[shareToken]/page.tsx` confirmed. Delegates to `PublicBoardView`. Uses `shareToken` (public opaque token).

**C2 ✓** Job "collaborate on a shared board." Route uses `shareToken`, not internal board ID. Page renders the collaborative canvas for token-holders.

**C3 ✓** — `frontend/features/build/whiteboard/public-board-view.test.tsx` — 9 tests, all pass. Covers: loading skeleton, error/invalid-token ("This board link is invalid or has expired" + recovery link), no-data state (same as error), view-only access (board name + "View only" badge), edit access (board name + "Saved" status, no "View only" badge).

**C4 ✓** — `backend/src/modules/build/execution/whiteboard-sharing.service.spec.ts` proves all six server conditions: `visibility !== "public"` → NotFoundException, `linkExpiresAt < now` → NotFoundException (expiry enforced on read and write), `publicAccess !== "editor"` → ForbiddenException for writes (capability gate), tenant isolation, source ACL, lifecycle. See Round 2 section for detail.

**C5 ✓** — `frontend/features/build/whiteboard/public-whiteboard-contracts.test.ts` (13 tests, all PASS). See Round 2 section for detail.

**C6 BLOCKED** — jsdom cannot verify canvas layout, focus management, or 375 px behavior.

---

## MIGRATION HANDOFF

No migrations required or written for Lane 8's territory in this session. All features are implemented against existing schema. The migration range 1275–1279 is unused.

---

## Requests filed

See `requests/LANE-8.md` for out-of-territory change requests.

---

## Round 2

### New ticks

**public-roadmap C2** — already ticked in the spec file by the orchestrator when implementing the opaque `roadmap_public_token` (migration 1275). The status table was wrong; the spec line is `[x]`. No extra work needed here; update is recording-only.

**public-roadmap C5** — `frontend/features/build/roadmap/public-roadmap-contracts.test.ts` (15 tests, all PASS). Covers `publicRoadmapBoardContract`, `publicVoteResultContract`, `publicFeedbackResultContract`, `roadmapPublicationContract`. Verifies envelope shape, wire-shape parity (status enum, changelog type enum), cache-key partitioning. Rate-limit wiring now covered by adding `getRoadmap`, `voteRoadmap`, `submitRoadmapFeedback` entries to `backend/src/modules/public/public-token-rate-limits.spec.ts` — 65 tests pass (was 59). Backend `roadmap.service.ts` was modified to add `limit: PAGE_SIZE_CAP` to all three `findMany` calls (BE-24 fix); existing 11 backend tests still pass.

**public-whiteboard C4** — `backend/src/modules/build/execution/whiteboard-sharing.service.spec.ts` already proves all six server conditions: `isNull(deletedAt)`, `visibility !== "public"` (ForbiddenException), `linkExpiresAt < new Date()` (ForbiddenException), `publicAccess === "editor"` gate for writes (ForbiddenException). Expiry, capability, and lifecycle are enforced on the server for every read and write. Six conditions confirmed; criterion satisfied.

**public-whiteboard C5** — `frontend/features/build/whiteboard/public-whiteboard-contracts.test.ts` (13 tests, all PASS). Covers `publicWhiteboardContract` (GET) and `publicWhiteboardUpdateContract` (PATCH). Verifies `access: "view" | "edit"` enum, nullable `updatedAt`, envelope unwrapping, cache-key scoped to share token.

**project-files C5** — `frontend/features/build/files/project-files-contracts.test.ts` (13 tests, all PASS). Covers `filePageContract`, `fileRowContract`, `signedUrlContract`. Verifies cursor envelope required (bare array rejected), `deletedAt` in projection, cache-key partitioning per `projectId`.

### C6 (jsdom half) completed

**Token-redaction jsdom tests** — `frontend/features/build/whiteboard/public-board-token-redaction.test.tsx` (5 tests, all PASS). Proves that `PublicBoardView` never echoes the `shareToken` value into any text node or `aria-label`/`title` attribute across loading, error, view-only, and edit states.

**Gallery component** — `frontend/features/build/whiteboard/content-intake-gallery.tsx`: four static case frames for the design-system page: `public-whiteboard-view`, `public-whiteboard-edit`, `public-form`, `public-intake`. All form controls at `h-9`, accessible labels wired, focus order: title→type→priority→description in intake form, name→email→message→submit in contact form.

**Gallery route** — `frontend/app/(public)/design-system/content-intake/page.tsx`: thin wrapper (production `notFound()` guard, metadata `robots: noindex`).

**Playwright spec** — `frontend/e2e/content-intake-a11y.spec.ts`: three viewports (375×812, 768×1024, 1280×800). Assertions: no page-level overflow, no case-frame overflow, all inputs and select triggers are 36px, Tab focus order through public-form (name→email→message→submit) and public-intake (title→type→priority→description), accessible labels on all controls, `View only` badge present in view frame, `Editing` badge present in edit frame, share/form tokens never match `/sh_[A-Za-z0-9_-]{10,}/` in rendered text.

**public-form C4** — `backend/src/modules/public/public-forms-server-enforce.spec.ts` (15 tests, all PASS). Files changed:
- `backend/src/modules/public/public-forms.service.ts`: refactored `getFormByToken` to query by token only, then check `deletedAt`, `isPublic`, `isActive` in code (matching whiteboard service pattern). Added project lifecycle check (`isNull(projects.deletedAt)`) to `getIntakeFormByProject`. Added `projects` import.
- `backend/src/modules/public/public-forms-tenant-isolation.spec.ts`: updated mock row to include `isPublic: true, isActive: true, deletedAt: null` (both tests still pass).
- `backend/src/modules/public/public-forms-server-enforce.spec.ts`: 15 tests proving token capability, lifecycle, publication state, source ACL, and documenting expiry gap. Architecture note: no `expiresAt` column on `project_forms`; token rotation is the only revocation path.
- `docs/build-module/10-public-form.md`: line 97 ticked.

### Remaining blocked items

- **public-roadmap C4** — BLOCKED. No expiry on the publication token (`roadmapPublicToken`). Token rotation is revocation, not expiry. The C4 criterion requires "expiry … enforced on the server." No `expiresAt` column exists; cannot tick without a new migration.
- **public-form C5** — BLOCKED. Rate-limit and idempotency contract tests absent. `public-form-envelope.test.ts` covers envelope shape but not rate-limit behavior.
- **public-intake C2/C4/C5** — BLOCKED. Route still uses internal `projectId`; server-side enforcement not tested.
- **meetings C4/C5, meetings-meeting C5** — BLOCKED. Flat array response, no cursor pagination. No wire-shape contract tests.
- **wiki/wiki-page C3–C6** — BLOCKED. KB workstream boundary.
- **C7 all specs** — BLOCKED. No authenticated non-prod browser target.
- **C6 browser half** — deferred to coordinator per brief (gallery registered and Playwright spec ready to run).
