# Wave-B-13 requests

## Request 1: Org-level access page test coverage gap

**Filed by:** Wave-B-13 (org-settings-teams-intake)
**Affects:** `docs/build-module/10-settings-access.md` — C3

**Issue:** The spec at `/build/settings/access` (org-level) renders `MembersPage` + `ModuleAccessPage`. The test file `features/build/members/members-page.test.tsx` covers only access-loading and access-denied states (2 describe blocks). It does not test:
- Populated members list (ready state)
- Empty state (no members)
- Error state
- Search URL param (`search`) wiring
- Keyboard shortcuts (`c`, `j/k`, `e`, `?` — none are implemented in `MembersPage`)
- `section` URL param (not implemented)
- The `ModuleAccessPage` integration

`MembersPage` lives in `features/build/members/` — not in Wave-B-13's owned files. Wave-B-13 fixed and expanded tests only for the PROJECT-level `project-settings-access-page.tsx`.

**Ask:**
1. Assign `features/build/members/members-page.test.tsx` to a wave agent to complete: add error/empty/populated state tests, verify `search` URL param drives `useBuildListFilters`, add `useBuildListKeyboard` wiring (which may need to be added to `MembersPage` first).
2. Implement `section` URL param support in `MembersPage` to allow deep-linking to an access section.
3. Once 1+2 are done, re-examine C3 for `10-settings-access.md` to tick it.

---

## Request 2: Integrations page URL-backed section and keyboard shortcuts

**Filed by:** Wave-B-13 (org-settings-teams-intake)
**Affects:** `docs/build-module/10-settings-integrations.md` — C3

**Issue:** `ProjectsGitIntegrationSettings` (`features/build/settings/git-integration-settings.tsx`) manages the active tab (connections/agent) with `useState` instead of a URL parameter. The spec requires `section` to be URL-backed. Keyboard shortcuts are also absent from this component.

Additionally, the `RequireModule("build")` module-denied/disabled state is not tested. A caller who does not have the build module enabled sees `RequireModule`'s denial state, not a `NoPermissionState` from `usePageState`, so the two paths are distinct and both need tests.

**Ask:**
1. Add a `section` URL param to `ProjectsGitIntegrationSettings` (using `useSearchParams` + `router.replace`) to keep the active tab in the URL. Update tests to verify the param is read and written.
2. Wire `useBuildListKeyboard` to `ProjectsGitIntegrationSettings` for connection-row navigation.
3. Add a test that exercises the module-denied state via `RequireModule`.
4. Confirm `enforceRouteAccess("/build/settings/integrations")` is exercised in a route-level test once Server Component testing is feasible.

---

## Request 3: Teams detail page data model and URL-filter gaps

**Filed by:** Wave-B-13 (org-settings-teams-intake)
**Affects:** `docs/build-module/10-teams-team.md` — C3

**Issue:** The spec lists core fields `lead` and `capacity`, and URL params `leadId`, `memberId`, `q`, `cursor`. None of these are supported in the current data model or frontend hook:

1. `lead` field: `ProjectTeamDetail` does not have a `lead` property; no lead is displayed on the team detail page.
2. `capacity` field: Not in `ProjectTeamDetail`; the page shows member count only.
3. `leadId`, `memberId`, `q` URL params: `useTeamMembers` (`/build/teams/[teamId]/members`) accepts only `cursor` and `pageSize`. No search or filter params are exposed.
4. `cursor` URL param: `useCursorPager` is in-memory only.

**Ask:**
1. Backend: Add `lead` (userId + display info of the designated team lead) and `capacity` (numeric, optional target membership size) to the `teams` table and the team-detail response.
2. Backend: Add `search` (q), `leadId` (member filter), `memberId` (member filter) params to `GET /build/teams/:teamId/members`.
3. Frontend: Update `useTeamMembers` to accept the new filter params; update `team-home-page.tsx` to read them from URL via `useBuildListFilters`; display `lead` and `capacity` in the header row.
4. Frontend: URL-back `cursor` via `useBuildListFilters` so the pagination position survives a reload.
5. Once implemented, re-run C3 against the updated row table.

**Note:** Wave-B-13 created 31 passing tests for all currently-implemented criteria. Only the above gaps prevent C3 from closing.

---

## Request 4: Public intake enumeration oracle — proposal only

**Filed by:** Wave-B-13 (org-settings-teams-intake)
**Affects:** `docs/build-module/10-public-intake.md` — C2

**Status:** Analysis and proposal only. No code changes. The spec already contains the BLOCKED note at C2 (measured 2026-09-26). This request elaborates the fix path.

### The oracle — exact location

- **File:** `backend/src/modules/public/intake.service.ts`, method `submitIntake` starting at line 43. The comment at lines 14–42 of that file explicitly names both oracle capabilities and states they cannot be repaired without changing the route address.
- **Route:** `POST /public/intake/:projectId`
- **Oracle mechanism:** The handler calls `app.resolve_project_org_id(projectId)` (line 44–46). If the `projectId` resolves to a live org, execution continues into the tenant transaction; if not, a `BadRequestException` is thrown at line 49. Walking `projectId` from 1 upward yields 201 for existing/enabled projects and 400 for non-existent or disabled ones, across ALL tenants — there is no tenant scope on the resolution.

### What distinguishes the two cases

| Condition | Response |
|---|---|
| Project exists + public intake enabled | 201 (intake submitted) |
| Project does not exist OR intake disabled | 400 (bad request) |

These are distinguishable by an unauthenticated caller with no knowledge of the target org.

### Why the obvious fixes are wrong

1. **Normalising status codes (201→200, 400→same code for both):** Closes the status-code oracle but leaves two side-channel paths open: (a) a submission that lands in triage vs. one silently dropped reveals existence via email notification/acknowledgement; (b) timing differs because a found-and-enabled project does more work (writes a record, fires events).
2. **Randomising the projectId format (e.g., UUID):** Prevents sequential enumeration but does NOT enforce that the submitter was invited. Any caller who learns a project's UUID (e.g., via a shared intake link) can submit without being authorised. The write path has no invitation check.

### The correct fix

The fix has two independent components that must both be present:

**A. Unguessable intake token per project (prevents enumeration):**
- Add an `intake_token` column (`UUID` or `CSPRNG`-derived, default generated, nullable, indexed) to the `projects` table.
- The route becomes `POST /public/intake/:intakeToken` (or `GET /i/:intakeToken` → form, then `POST /i/:intakeToken`).
- A project's intake token is only disclosed to the project's own members, never in any list or public payload.

**B. Invitation / capability check on the write path (prevents uninvited writes):**
- The handler must verify that the intake token exists AND corresponds to a project with public intake enabled.
- An invalid or disabled token receives the same response as a valid one to preserve indistinguishability: use a constant-time lookup with a dummy fallback to avoid timing leaks.

### What this breaks for existing callers

- Any currently-published intake URL of the form `https://.../intake/42` stops working. All existing intake links need to be migrated.
- Any API client or integration that POSTs to `/public/intake/:projectId` must update to the token-based URL.
- No existing test that uses a numeric projectId can pass without update.

### Migration required

1. Write a migration: add `intake_token UUID NOT NULL DEFAULT gen_random_uuid()` to `projects`.
2. Rename the route module from `intake/:projectId` to `intake/:intakeToken` with a path-segment rename in the backend router.
3. Add a redirect at the old numeric path that returns 410 Gone with a `Location` header pointing to the project's settings page (internal callers) or a public "link expired" page (external callers).
4. Update `frontend/app/(public)/intake/[projectId]/page.tsx` and its client code to use the token path. The current `frontend/hooks/api/build/public-intake.ts` also constructs the numeric URL and must be updated.
5. Plant the new column in seeds and update any e2e fixtures that reference the numeric path.

### Decision needed from product owner

The fix requires a breaking URL change on a public-facing surface. The decision is: accept the migration cost, or accept the oracle risk and document it as a known limitation until the Forms feature replaces the intake entirely (per the spec disposition: MERGE/deprecate after migration to published Form tokens).

**Box stays UNTICKED until the product owner decision is made and the fix is implemented.**
