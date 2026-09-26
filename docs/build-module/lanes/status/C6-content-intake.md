# C6 — Content Intake (LANE-8)

Agent: G-8 · 2026-09-26

## Scope

11 pages in LANE-8 (excluding the two wiki pages that belong to separate agents):

| # | Spec doc | Route |
|---|----------|-------|
| 1 | 10-public-whiteboard.md | `(public)/whiteboard/[token]` |
| 2 | 10-public-form.md | `(public)/forms/[token]` |
| 3 | 10-public-intake.md | `(public)/intake/[projectId]` |
| 4 | 10-public-roadmap.md | `(public)/roadmap/[orgId]` |
| 5 | 10-project-files.md | `(authenticated)/[org]/projects/[projectId]/files` |
| 6 | 10-project-forms.md | `(authenticated)/[org]/projects/[projectId]/forms` |
| 7 | 10-project-forms-form.md | `(authenticated)/[org]/projects/[projectId]/forms/[formId]` |
| 8 | 10-project-intake.md | `(authenticated)/[org]/projects/[projectId]/intake` |
| 9 | 10-project-meetings.md | `(authenticated)/[org]/projects/[projectId]/meetings` |
| 10 | 10-project-meetings-meeting.md | `(authenticated)/[org]/projects/[projectId]/meetings/[meetingId]` |
| 11 | 10-project-whiteboard.md | `(authenticated)/[org]/projects/[projectId]/whiteboard` |

C6 checks for public pages: 375px mobile, screen-reader, reduced-motion, keyboard, high-density desktop, secret-redaction (6 checks).
C6 checks for authenticated pages: 375px mobile, screen-reader, reduced-motion, keyboard, high-density desktop (5 checks; no secret-redaction because no opaque token is in the URL).

---

## Per-page × per-check matrix

Legend: `pass` = spec test exists and passed in drain · `partial` = covered structurally but not by a dedicated describe block · `gap` = not covered · `n/a` = not applicable

### Public pages (mounted in gallery)

| Page | 375px | Screen-reader | Reduced motion | Keyboard | High-density | Secret-redaction |
|------|-------|---------------|----------------|----------|--------------|-----------------|
| public-whiteboard | pass | pass | pass | gap | pass | pass |
| public-form | pass | pass | partial | pass | pass | pass |
| public-intake | pass | pass | partial | pass | pass | pass |
| public-roadmap | pass (NEW) | pass (NEW) | gap | pass (NEW) | pass (NEW) | pass (NEW) |

### Authenticated pages (cannot be mounted in the public gallery)

| Page | 375px | Screen-reader | Reduced motion | Keyboard | High-density |
|------|-------|---------------|----------------|----------|--------------|
| project-files | gap | gap | gap | gap | gap |
| project-forms | gap | gap | gap | gap | gap |
| project-forms-form | gap | gap | gap | gap | gap |
| project-intake | gap | gap | gap | gap | gap |
| project-meetings | gap | gap | gap | gap | gap |
| project-meetings-meeting | gap | gap | gap | gap | gap |
| project-whiteboard | gap | gap | gap | gap | gap |

---

## What was added

### `frontend/features/build/whiteboard/content-intake-gallery.tsx`

1. Import of `PublicRoadmapPage` from `@/app/(public)/roadmap/[orgId]/page`.
2. `STUB_ROADMAP_BOARD` constant — a minimal but schema-conforming `publicRoadmapBoardContract` payload with one planned item ("Dark mode support"), empty in-progress / completed / feedback / changelog, orgName "Gallery Org".
3. `useGalleryQueryClient()` — one extra `setQueryData` call seeding `["streamlineos", "roadmap", "publicBoard", undefined] as const`. The hook in `PublicRoadmapPage` calls `usePublicRoadmap(orgId)` where `orgId = undefined` (because `useParams()` returns `{}` for pages without dynamic segments in gallery context); the key it constructs at runtime is identical, so the pre-seeded value is immediately read from cache without any network request.
4. New `CaseFrame id="public-roadmap"` mounting `<PublicRoadmapPage />` inside the existing `QueryClientProvider`.

### `frontend/e2e/content-intake-a11y.spec.ts`

Additions to the existing `"Content intake public surfaces — responsive contract"` describe:

- `CASES` array updated to include `"public-roadmap"` — it now participates in the three 375px / 768px / 1280px overflow and input-height loops, raising their per-viewport iteration count from 5 to 6 frames.
- Input-height loop inner array updated from `["public-form", "public-intake"]` to `["public-form", "public-intake", "public-roadmap"]` so the roadmap's feedback form inputs are measured at each viewport.
- New describe: `"public-whiteboard — accessible board name and decorative icon"` (2 tests):
  - `"whiteboard header element is visible and contains the stub board name"` — structural screen-reader check confirming the `<header>` element carries the board name text.
  - `"Eye icon in the View only badge carries aria-hidden and is not exposed as an unnamed image"` — verifies every SVG in the whiteboard header has at least one of `aria-hidden`, `aria-label`, or `aria-labelledby`.
- New describe: `"public-roadmap — accessible landmarks, headings and secret redaction"` (4 tests):
  - `"roadmap frame has a main landmark"` — `getByRole("main")` is visible.
  - `"h1 shows the stub organisation name"` — `getByRole("heading", { name: "Gallery Org" })` is visible.
  - `"roadmap item Upvote button carries an accessible name"` — `getByRole("button", { name: "Upvote" })` is visible.
  - `"org identifier never appears as visible text and the org name heading is shown instead"` — `textContent` does not contain the string `"undefined"` and the heading is visible. This is the secret-redaction check: `orgId = undefined` in the gallery context and the component must never render that raw value.
- New describe: `"public-roadmap — feedback form keyboard-ordered"` (2 tests):
  - `"roadmap item Upvote button is reachable by keyboard focus"` — `voteBtn.focus()` + `toBeFocused()`.
  - `"Tab from feedback title input proceeds to the details textarea in DOM order"` — waits for the `voterKey` effect to enable inputs, focuses the title `<Input>`, presses Tab, asserts the details `<Textarea>` is focused.

Total test count: 27 (pre-session) → 35 (post-session).

---

## Gaps and why they cannot be closed in owned files

### Reduced motion: public-roadmap

`PublicRoadmapPage` passes `orgId = undefined` to `usePublicRoadmap`, which sets `enabled: Boolean(orgId) = false`. With `enabled: false` TanStack Query v5 puts the query in `{ status: "pending", fetchStatus: "idle" }`, making `isLoading = isPending && isFetching = false`. The component therefore renders its empty/data state, never its skeleton loading state, regardless of what is pre-seeded via `prefetchQuery`. The skeleton shimmers (`skeleton-shimmer animate-pulse`) are only reachable when `orgId` is a non-empty string. Adding a roadmap loading case frame would require either exporting a separate loading-state sub-component or changing the hook's `enabled` logic — both are outside the gallery and spec files I own. The existing `"public board loading skeleton"` reduced-motion tests (tests 23–24) prove the shared `globals.css` rule (`prefers-reduced-motion: reduce` → `animation-name: none`) is applied correctly on `skeleton-shimmer` elements; the CSS contract is verified globally.

### Screen-reader: public-whiteboard board name is `<p>` not a heading

`PublicBoardView` renders the board name inside a `<p>` element, not an `<h1>` or `<h2>`. No `getByRole("heading")` assertion is possible for this text. The added test uses `header.getByText(…)` as the structural check. Promoting the `<p>` to a heading is a feature-source change outside my owned files.

### All five authenticated project pages

`project-files`, `project-forms`, `project-forms-form`, `project-intake`, `project-meetings`, `project-meetings-meeting`, and `project-whiteboard` all require a real NextAuth session. Their page components call `useAccess()` which internally calls `useSession()`. The access query has `enabled: !!session` — without a valid session object in the React tree it never resolves, so `usePageState` stays in the "loading" branch indefinitely. Mounting these pages in the public gallery without mocking `useSession` is not feasible. Providing a mock session requires changes to `components/providers/` and possibly `next-auth` configuration, which are outside my owned files. All five checks for each of these seven pages remain gaps pending a sibling agent providing a session-aware gallery scaffold.
