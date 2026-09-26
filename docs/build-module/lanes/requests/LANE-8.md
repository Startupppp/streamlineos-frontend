# Lane 8 — Content & Intake — Out-of-territory Requests

---

## REQUEST 1 — Add meetings cursor-page contract to meetings-schema.ts

**Ruling: YOURS — completed this session.**

**File:** `frontend/hooks/api/build/meetings-schema.ts`

`meetingPageContract` and `meetingResponseContract` (union) added. `useMeetings` updated with normaliser. 21-test contract suite at `hooks/api/build/meetings-contract.test.ts` passes.

C4 for `10-project-meetings.md` remains BLOCKED: backend `meetings.service.ts` throws `BadRequestException` at 100+ meetings rather than paginating with a cursor — bounded but not cursor-paginated. C5 ticked.

---

## REQUEST 2 — Replace orgId with public slug in public roadmap route

**Ruling: IMPLEMENTED (was HOLD, now COMPLETED).**

**Implementation:**
- `backend/src/modules/public/roadmap.service.ts`: `getRoadmap` now tries `eq(organizations.id, ...)` first, then falls back to `eq(organizations.slug, ...)`. Returns `orgSlug` in response. No migration needed — `organizations.slug` column is NOT NULL UNIQUE and already exists.
- `backend/src/modules/public/dto/public-response.schemas.ts`: `roadmapSchema` now includes `orgSlug: z.string().nullable()`.
- `frontend/hooks/api/build/roadmap-schema.ts`: `publicRoadmapBoardContract` includes `orgSlug: z.string().nullable()`.
- `frontend/app/(public)/roadmap/[orgId]/page.tsx`: after data loads, `useEffect` calls `router.replace('/roadmap/' + data.orgSlug)` when `orgId !== data.orgSlug`. This is a client-side URL replace (not an HTTP 301). No `next.config.ts` change needed.

**No migration needed.** `organizations.slug` already exists with `NOT NULL UNIQUE`.

---

## REQUEST 3 — Replace projectId with form token in public intake route

**Ruling: IMPLEMENTED (was HOLD, now COMPLETED).**

**Implementation:**
- `backend/src/modules/public/public-forms.service.ts`: added `getIntakeFormByProject(projectId)` — uses `app.resolve_project_org_id` SECURITY DEFINER, then `runInTenantTransaction` to find the project's first active public form.
- `backend/src/modules/public/public.controller.ts`: added `GET /public/intake/:projectId/form` endpoint using `@UseRateLimit("public:form-view")`.
- `frontend/hooks/api/build/public-form.ts`: added `useProjectIntakeForm(projectId)` hook.
- `frontend/lib/query-keys/build-work.ts`: added `projectIntakeForm` factory.
- `frontend/app/(public)/intake/[projectId]/page.tsx`: rewritten — uses `DynamicIntakeForm` when the project has a configured intake form (routes through `/public/forms/:token/submit`), falls back to `LegacyIntakeForm` (routes through `/public/intake/:projectId` POST) when no form is configured. URL stays `/intake/[projectId]`, no redirect.
- `frontend/features/build/forms/field-input.tsx`: extracted `FieldInput` component from the forms page, now shared by both forms and intake flows.
- **No-form fallback:** when `useProjectIntakeForm` returns 404, `useDynamicForm` is false and the original legacy form renders. The URL never dead-ends.

---

## REQUEST 4 — Add route-manifest entry for public routes (if required)

**Ruling: ANSWERED — No.** The manifest covers authenticated routes only. Public routes in the `(public)` group are not registered there.

---

## REQUEST 5 — Add contract test for whiteboard wire shapes

**Ruling: YOURS — completed this session.**

`frontend/features/build/whiteboard/whiteboard-contract.test.ts` — 19 tests, all pass. Covers `whiteboardListContract`, `whiteboardDetailContract`, `publicWhiteboardContract`, `publicWhiteboardUpdateContract`, `whiteboardSharingUpdateContract`, `whiteboardSharesContract`.

---

## REQUEST 6 — Register gallery case for public-whiteboard layout check

**Ruling: ACCEPTED — orchestrator applies registry row.** Lane 8 writes the gallery case in the feature directory (pending).

---

## REQUEST 7 — `build-route-manifest.ts`: confirm /build/[projectId]/wiki disposition

**Ruling: CONFIRMED BLOCKED.** The wiki feature component (`wiki-home-page`) is in the KB workstream (`frontend/features/wiki/**`). C3–C5 for both wiki specs stay BLOCKED until the KB workstream owner addresses them.
