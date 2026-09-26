# Lane 5 — Collaboration & client-facing portals

Read [`LANE-COMMON.md`](./LANE-COMMON.md) first. It is binding.

Migration range: **1260–1264**. Status file: `status/LANE-5-STATUS.md`. Requests: `requests/LANE-5.md`.

## Your page specs (10 — 4 at 7 boxes, 6 at 6 boxes = 64 checkboxes)

| Spec | Route |
|---|---|
| `docs/build-module/10-project-client-portal.md` | `/build/[projectId]/client-portal` |
| `docs/build-module/10-project-change-requests.md` | `…/change-requests` |
| `docs/build-module/10-project-chat.md` | `…/chat` |
| `docs/build-module/10-project-updates.md` | `…/updates` |
| `docs/build-module/10-settings-client-access.md` | `/build/settings/client-access` |
| `docs/build-module/10-external-client-invitation.md` | portal invitation |
| `docs/build-module/10-external-client-portal.md` | portal root |
| `docs/build-module/10-external-client-portal-project.md` | portal project |
| `docs/build-module/10-internal-portal-projects.md` | internal portal projects |
| `docs/build-module/10-internal-portal-project.md` | internal portal project |

## Territory

**Frontend features:** `frontend/features/build/{client-portal,change-requests,updates}/**`, plus the chat surface reached only from `/build/[projectId]/chat`.

**Frontend routes:** `frontend/app/(authenticated)/build/[projectId]/{client-portal,change-requests,chat,updates}/**`, `frontend/app/(authenticated)/build/settings/client-access/**`, and the portal/public client routes reached only by your five portal specs.

**Frontend hooks:** `frontend/hooks/api/build/{client-portal,client-portal-schema,client-portal-schema.test,change-requests,change-request-affected-items,project-updates,project-updates-schema,comment-drafts,comment-drafts-schema,comment-drafts-schema.test,comment-draft-offline-buffer,comment-mutations,comment-permalink,reactions}.*`

**Backend:** `backend/src/modules/build/client-portal/**`, `backend/src/modules/build/updates/**`, `backend/src/modules/build/comment-drafts/**`, and in `backend/src/modules/build/core/`: `projects-customers.*`, `projects-ticket-comments.*`, `projects-ticket-associations.controller.ts`, `projects-ticket-links.service.ts`, `projects-ticket-relations.service.ts`, plus each file's `*.spec.ts`.

## Lane-specific hazards, measured

- **`@Public()` webhook and portal routes raise `42501` on RLS lookup.** The fix is a
  `SECURITY DEFINER` function — copy the pattern from migration `1057`. This is the defining trap of
  your lane: an unauthenticated portal route that reads tenant data through the normal RLS path
  fails with what looks like a permission bug.
- **Missing RLS is a silent cross-tenant hole**, and an unauthenticated probe is **vacuous** unless
  you pair it with a bogus-route control — a 401/404 on both proves nothing about the guard. Pair
  every negative with a positive control that can actually render.
- Client portal is client-visible: **a projection must preserve source ACL, source freshness and
  source ownership.** A grant table with no writer means "shared with me" is always empty — that is
  a missing feature, not a seeding problem. Check that any grant surface you rely on has a writer.
- Change Request release, client visibility and affected-ticket linkage already exist:
  `backend/src/db/schema/build/change-requests.ts`,
  `client-portal/change-request-affected-items.service.ts`,
  `frontend/hooks/api/build/change-request-affected-items.ts`. Verify and cite; do not rebuild.
- **Chat notifications never persist**, so nothing downstream can observe them. If a chat criterion
  depends on a durable notification, record the gap.
- Confirmable AI actions never worked in production. If a portal criterion routes through one,
  measure it before citing it.
- Streaming handlers commit early and after-commit hooks have **no tenant context** — a portal
  notification fired after commit cannot read tenant-scoped rows.
- `x-exposure` is not a published contract. Do not build client visibility on it.
- Guest/client permissions in every spec's table are "explicit grant projection only" and
  "bounded request/comment only". Controls **fail closed while access is loading**. Missing,
  deleted, cross-tenant and unauthorized detail records must return **indistinguishable 404s**.
- Being an organization owner makes a *denied*-state cell unreachable. Construct a genuinely
  unprivileged principal or mark the denied criterion NOT-RUN — never stub `/me/access`.
- CORS is registered after the body parser; a portal origin problem can present as a 404 preflight.
