# Lane 2 → orchestrator

Changes Lane 2 needs in files outside its territory. Each names the exact file and change.
Nothing here was edited by Lane 2.

---

## 1. c25-01 — 107 routes still carry no exposure declaration

`pnpm check:route-classification` (new, `backend/src/scripts/route-classification-report.mjs`) is the
authoritative list and reproduces it on demand. Current state:

| | count |
|---|---|
| total handlers | 3,508 |
| public | 202 |
| permissioned | 3,165 |
| in-service | 33 |
| universal | 1 |
| **UNDECLARED** | **107** |

Lane 2 classified the 33 + 1 in its own territory (`module-access`, `storage`). The 107 below are in
other lanes' modules. **`REQUIRE_ROUTE_CLASSIFICATION=true` must not be turned on until this reaches
zero** — every one of these currently 403s under enforcement, and the first group is platform core.

The fourth declaration is new: `@AuthorizedInService("<what checks it>")`, from
`backend/src/common/auth/authorized-in-service.decorator.ts`. Use it where authorization is real but
lives downstream of the guard and cannot be expressed as a permission key.

### 1a. `@Universal()` — named platform core in root `CLAUDE.md` §8

High confidence: §8 names these surfaces explicitly, and `backend/CLAUDE.md` §2 already cites
`calendar.controller` and `directory.controller` as the worked examples of this shape. Note §2's
rule — **making a route universal means moving the guard, not deleting the key**: put
`@UseGuards(JwtAuthGuard)` on the class and `@UseGuards(PermissionGuard)` on any handler that stays
gated.

| File | Handlers | §8 clause |
|---|---|---|
| `me/me.controller.ts` | `me`, `getAccess`, `getOrgDisplay`, `getProfile`, `updateProfile`, `getLoginHistory`, `getAuthAnalytics` | "Canonical routes `/me/*`" |
| `modules/calendar/calendar.controller.ts` | `getEvents`, `getExternalEvents`, `createEvent`, `updateEvent`, `removeEvent`, `rsvp`, `upsertOccurrenceException`, `cancelOccurrence`, `getSources`, `setSourcePreference` | "One unified calendar. `/calendar` serves everyone" |
| `modules/notifications/notifications.controller.ts` | all 17 | "notifications" |
| `modules/notifications/notification-preferences.controller.ts` | all 10 | own preferences |
| `modules/notifications/broadcasts.controller.ts` | `listInbox`, `dismiss` | own inbox |
| `modules/dashboard/dashboard.controller.ts` | all 8 | "dashboard" |
| `modules/directory/directory.controller.ts` | `listPeople`, `getPerson` | "people directory" |
| `modules/organization/setup/announcements.controller.ts` | `list`, `markRead` | "announcements" |
| `modules/chat/chat-actions.controller.ts` | `createTaskFromMessage` | "chat" |
| `modules/chat/chat-entity-actions.controller.ts` | `availableActions`, `actionOptions`, `submitAction` | "chat" |
| `modules/hr/onboarding/core/onboarding.controller.ts` | all 9 | "their own … employment documents"; self-service onboarding |
| `modules/sessions/sessions.controller.ts` | `list`, `revokeOne`, `revokeAllOthers` | own sessions |
| `modules/mfa/mfa.controller.ts` | `setup`, `verify`, `disable`, `status` | own credential |
| `modules/auth/auth.controller.ts` | `logout` | own session |
| `modules/push/push.controller.ts` | `subscribe`, `unsubscribe` | own device |
| `modules/organization/setup/org.controller.ts` | `getSetupSession`, `complete`, `skip` | §8 workspace gating; the wizard must stay reachable before any role exists |

**84 handlers.**

### 1b. `@Universal()` — own-scope reads, needs the owning lane to confirm the handler derives its subject from `@CurrentUser()`

| File | Handlers | Note |
|---|---|---|
| `modules/rbac/rbac.controller.ts` | `getAccessSnapshot` | this is the caller's own access set; §5 says it is served by `GET /me/access` |
| `modules/organization/core/organization.controller.ts` | `listOrganizations`, `switchOrg`, `leaveOrg` | own memberships. `POST /organization/switch` is membership-checked per root §5 |
| `modules/billing/core/billing.controller.ts` | `getEntitlements` | own org's entitlements; root §8 says the frontend reads this via `useEntitlements` |
| `modules/search/search.controller.ts` | `globalSearch` | universal surface, but confirm results are filtered by the asker's access **in the SQL predicate** (`backend/CLAUDE.md` §4) before marking it universal |
| `modules/realtime/realtime.controller.ts` | `iceServers` | call infrastructure; every member can place a call |

**7 handlers.**

### 1c. `@RequirePermission(...)` — administrative, must not become universal

| File | Handlers | Why |
|---|---|---|
| `modules/organization/core/organization.controller.ts` | `createOrganization`, `restoreOrg`, `listArchivedOrganizations` | org lifecycle; root §8 makes hierarchy archive/restore an administrative action |
| `modules/rbac/rbac.controller.ts` | `getDiscoveryPermissions`, `getDiscoveryGrantable` | exposes the permission catalog and what the caller may delegate |
| `modules/rbac/roles.controller.ts` | `templates` | role templates |
| `modules/hr/config/hr-document-types.controller.ts` | `list`, `getOne` | HR configuration, not self-service |
| `modules/hr/hub/hr-hub.controller.ts` | `getSnapshot` | HR administration |
| `modules/hr/enterprise-ops/emergency/emergency.controller.ts` | `respond` | enterprise ops |
| `modules/record-layouts/record-layouts.controller.ts` | `get` | layout configuration |
| `modules/billing/core/billing.controller.ts` | `getPlans`, `getMarketplace` | plan catalog — could also be `@Public()` if genuinely pre-auth; the owning lane should decide which |

**13 handlers.**

### 1d. Needs the owning lane's decision — a different authentication subject

| File | Handlers | Why |
|---|---|---|
| `modules/portal/client/portal-client.controller.ts` | `listProjects`, `getProjectOverview`, `submitChangeRequest` | these authenticate a **portal** user (`req.portalUser`), not an `organization_members` login. None of the four declarations describes that cleanly. Likely `@AuthorizedInService("<portal guard/service>")` once someone confirms where the portal's authorization actually happens. |

**3 handlers.**

84 + 7 + 13 + 3 = **107**, the full undeclared set. Three controllers appear in two groups each —
`organization.controller` (own memberships vs org lifecycle), `rbac.controller` (own access vs
catalog discovery) and `billing.controller` (own entitlements vs plan catalog) — so classify those
per handler, not per file. `pnpm check:route-classification` is authoritative; re-run it rather than
trusting this table after any change.

---

## 2. c25-02 — the KB seam site

`backend/src/modules/kb/**` belongs to the orchestrator lane. Lane 2 did not edit it.

**Status: not analysed.** The subagent assigned this terminated on an account-level API limit before
producing the file-and-line change, and Lane 2 chose not to substitute a guess for it. The
acceptance-criterion box in
[`c25-02`](../c25-authorization-cannot-be-omitted/issues/02-object-access-and-scope-share-one-query-seam.md)
stays unticked with this named as the blocker.

What the analysis needs to answer, for each record-by-id read/write in `modules/kb/**`: does one SQL
query compose `org_id = ctx.orgId` AND `deleted_at IS NULL` AND the DataScope predicate from
`req.rbacScope` AND the space/audience ACL — or does it fetch and then check in application code? A
miss must return `null`, surfaced as **404, never 403** (`backend/CLAUDE.md` §4: a 403 on another
org's id is an existence oracle).

---

## 3. Not a request — recorded so it is not rediscovered

**`backend/src/common/auth/verify-permission-catalog.mjs` is now redundant.** It does the same job as
the new `backend/src/scripts/check-permission-keys.mjs` (enumerate `@RequirePermission` keys, check
both catalogs) and its own header says "to be wired by the CI lane". The new script supersedes it: it
reports file **and line**, has a `--self-test`, and is wired into
`backend/.github/workflows/ci.yml:61`.

Lane 2 did **not** delete it, because `verify:permissions` in `package.json` still points at it and
`package.json` was being edited concurrently by two other agents at the time. The cleanup is: delete
`src/common/auth/verify-permission-catalog.mjs`, repoint `verify:permissions` at
`src/scripts/check-permission-keys.mjs`, or drop that script entry. **Whichever is chosen, the new
one is the canonical implementation** — two implementations of the same security predicate is the
exact defect c15-06 exists to prevent.
