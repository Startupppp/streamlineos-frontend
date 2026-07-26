---
wave: 9
status: DESIGN — not yet implemented
author: architecture review 2026-07-26
supersedes: docs/schema-change-plan.md §9 (client progress portal)
---

# Wave 9 — Client portal audience isolation: design

> This document covers T9.1–T9.5 from the delivery program in `docs/schema-change-plan.md`.
> No source file is modified here. The design is grounded in the actual repo as of 2026-07-26.
> Implementation requires an approved schema review before the first migration.

---

## 1. Current state — verified facts

### 1.1 Portal backend: internal JWT + RBAC, no separate audience

`backend/src/modules/projects-client-portal/client-portal.controller.ts` is decorated:

```ts
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("projects:portal:view")
```

It uses the **same `JwtAuthGuard`** that protects every internal endpoint. The guard
resolves `CurrentUserContext` from the tenant JWT, verifies the session via Redis, and
expects an `organizationMembers` row (`org_id` FK) to exist for the caller.

The service narrows access with `WHERE projects.client_id = userId`, but `client_id`
is a plain `text` FK into `users.id` (`backend/src/db/schema/projects/core.ts:33`)
meaning it still expects a **full internal user account with org membership** — not an
external contact with a separate credential.

### 1.2 No portal-specific tables exist today

A grep of every file under `backend/src/db/schema/` found **zero rows or references** for:

- `portal_memberships`
- `portal_invitations`
- `project_client_grants`

The concepts do not exist in the DB.

### 1.3 No separate portal session or JWT audience

`backend/src/common/auth/backend-claims.ts` defines a single `BackendClaims` shape
with no `audience` field. There is one JWT guard, one PAT guard, and one session
revocation namespace (`revoked:session:<id>`). No `aud` claim is validated anywhere.

### 1.4 Frontend: portal routes live inside `(authenticated)` shell

```
frontend/app/(authenticated)/projects/portal/page.tsx          → PortalListPage
frontend/app/(authenticated)/projects/portal/[projectId]/page.tsx → PortalDashboardPage
```

Both pages are inside the `(authenticated)` layout which wraps them in `DashboardShell`
and requires a NextAuth session. The portal UI is visually indistinguishable from the
internal shell and carries the full sidebar/header chrome.

### 1.5 Existing `projects.client_id` model

`projects.client_id` is a **nullable FK → `users.id`** (one internal user per project).
This is a 1:1 design that cannot represent multiple contacts watching the same project
and conflates an external stakeholder with an internal employee identity.

---

## 2. Design decisions before schema

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Portal principal = separate audience | Yes — `audience = CLIENT_PORTAL` in JWT | OWASP A01/A05: an external stakeholder MUST NOT inherit any internal org-member permission, role, or data scope. Guard-level audience check before RBAC prevents privilege drift regardless of implementation mistakes later. |
| Portal principal linked to global `users` row | Yes, optional | A contact who already has an internal account (e.g. an agency employee who is also a CRM contact) shares one `users.id`. The portal membership is the audience boundary; the shared user row is just identity. |
| Portal principal linked to CRM `contacts` row | Yes, required | The CRM `contacts` table (`backend/src/db/schema/crm/contacts.ts:129`) is the correct party-contact master — name, email, phone, company, `org_id` (it is org-scoped). Portal membership references a `contacts.id` rather than inventing a parallel contact store. |
| Grant granularity | Per-contact, per-project, field-level allowlist | A contact sees only the projects they are explicitly granted, and only the visibility classes (milestones/tasks/files/comments/CRs) their grant allows. Internal `client_visible` flags remain as the content fence; grants are the access fence. |
| `projects.client_id` fate | Soft-deprecate in Wave 9; remove in Wave 12 | Existing internal users set as `client_id` continue to use the current internal portal path until Wave 9 cutover. See §7. |

---

## 3. Schema: `portal_memberships`

A portal membership is the **access credential** that binds a global user identity to an
external audience within one organization. It is never an organization membership and can
never carry internal roles.

```typescript
// backend/src/db/schema/portal-access/portal-memberships.ts

import {
  pgTable, pgEnum, text, serial, timestamp, integer, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../common/identity";
import { contacts } from "../crm/contacts";

export const portalAudienceEnum = pgEnum("portal_audience", [
  "CLIENT_PORTAL",
  // reserved for future: VENDOR_PORTAL, PARTNER_PORTAL
]);

export const portalMembershipStatusEnum = pgEnum("portal_membership_status", [
  "PENDING",    // invited, not yet accepted
  "ACTIVE",     // accepted + usable
  "SUSPENDED",  // access blocked; membership preserved for audit
  "REVOKED",    // hard-disabled; cannot be reinstated
]);

export const portalMemberships = pgTable(
  "portal_memberships",
  {
    portalMembershipId: serial("portal_membership_id").primaryKey(),
    organizationId: text("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),

    // Audience tag — guards REJECT tokens whose audience ≠ the endpoint's required audience
    audience: portalAudienceEnum("audience").notNull().default("CLIENT_PORTAL"),

    // The global login identity (nullable until invite is accepted and a user account exists)
    userId: text("user_id")
      .references(() => users.id, { onDelete: "set null" }),

    // The CRM contact record this membership represents (the party-contact master)
    // Required: a portal principal is always a named contact in the org's CRM.
    contactId: integer("contact_id")
      .references(() => contacts.id, { onDelete: "restrict" })
      .notNull(),

    status: portalMembershipStatusEnum("status").notNull().default("PENDING"),

    // Audit fields
    invitedByUserId: text("invited_by_user_id")
      .references(() => users.id, { onDelete: "set null" }),
    suspendedAt: timestamp("suspended_at"),
    suspendedByUserId: text("suspended_by_user_id")
      .references(() => users.id, { onDelete: "set null" }),
    revokedAt: timestamp("revoked_at"),
    revokedByUserId: text("revoked_by_user_id")
      .references(() => users.id, { onDelete: "set null" }),
    revokedReason: text("revoked_reason"),

    // Session epoch — bump on suspend/revoke/contact-unlink/org-archive; invalidates all active tokens
    sessionEpoch: integer("session_epoch").notNull().default(0),

    activatedAt: timestamp("activated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (t) => [
    // Composite tenant uniqueness: (org, membership) referenced by child tables
    uniqueIndex("uniq_portal_memberships_org_id")
      .on(t.organizationId, t.portalMembershipId),

    // One active/pending portal membership per contact per audience per org
    uniqueIndex("uniq_portal_memberships_org_contact_audience")
      .on(t.organizationId, t.contactId, t.audience)
      .where(sql`status NOT IN ('REVOKED')`),

    // One active/pending user account per audience per org
    uniqueIndex("uniq_portal_memberships_org_user_audience")
      .on(t.organizationId, t.userId, t.audience)
      .where(sql`user_id IS NOT NULL AND status NOT IN ('REVOKED')`),

    index("idx_portal_memberships_org_status").on(t.organizationId, t.status),
    index("idx_portal_memberships_user").on(t.userId),
    index("idx_portal_memberships_contact").on(t.organizationId, t.contactId),
  ],
);
```

**Invariant enforced at the service layer:** a `userId` that already appears in
`organization_members` for this `organizationId` may exist on a portal membership ONLY
if the contact is a known external stakeholder of that org — the guard's audience check
prevents the internal credential from accessing portal endpoints as a portal user (and
vice versa). The portal membership is never treated as an internal membership for any
RBAC resolution.

**Status lifecycle:**

```
PENDING → ACTIVE       (invite accepted, user account linked/created)
ACTIVE  → SUSPENDED    (admin action; grants paused, sessionEpoch bumped)
SUSPENDED → ACTIVE     (admin re-enables)
ACTIVE|SUSPENDED → REVOKED  (permanent, no reinstatement; sessionEpoch bumped)
```

---

## 4. Schema: `portal_invitations`

An invitation is a **one-time, hashed bearer token** that creates exactly one portal
membership upon acceptance. It is NOT a reusable link and is never replayed.

```typescript
// backend/src/db/schema/portal-access/portal-invitations.ts

import {
  pgTable, pgEnum, text, serial, timestamp, integer, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../common/identity";
import { portalMemberships } from "./portal-memberships";
import { contacts } from "../crm/contacts";
import { portalAudienceEnum } from "./portal-memberships";

export const portalInvitationStatusEnum = pgEnum("portal_invitation_status", [
  "PENDING",   // sent, not yet acted on
  "ACCEPTED",  // consumed; portal membership created
  "EXPIRED",   // past expiry without acceptance
  "REVOKED",   // admin cancelled before acceptance
]);

export const portalInvitations = pgTable(
  "portal_invitations",
  {
    portalInvitationId: serial("portal_invitation_id").primaryKey(),
    organizationId: text("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),

    // The CRM contact being invited
    contactId: integer("contact_id")
      .references(() => contacts.id, { onDelete: "cascade" })
      .notNull(),

    // Email at time of invite (denormalized for audit even if contact.email changes)
    email: text("email").notNull(),

    audience: portalAudienceEnum("audience").notNull().default("CLIENT_PORTAL"),

    // SHA-256 hex of the raw one-time bearer token (raw token is in the email only)
    tokenHash: text("token_hash").notNull(),

    // The internal org member who sent the invite
    invitedByMembershipId: integer("invited_by_membership_id").notNull(),
    // Denormalized user reference for fast join
    invitedByUserId: text("invited_by_user_id")
      .references(() => users.id, { onDelete: "set null" }),

    status: portalInvitationStatusEnum("status").notNull().default("PENDING"),

    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedByUserId: text("revoked_by_user_id")
      .references(() => users.id, { onDelete: "set null" }),

    // Set when accepted — links back to the created membership
    acceptedPortalMembershipId: integer("accepted_portal_membership_id")
      .references(() => portalMemberships.portalMembershipId, { onDelete: "set null" }),
    acceptedAt: timestamp("accepted_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // Tenant composite — referenced by acceptance flow
    uniqueIndex("uniq_portal_invitations_org_id")
      .on(t.organizationId, t.portalInvitationId),

    // One pending invite per contact per audience per org (prevents spam re-invites)
    uniqueIndex("uniq_portal_invitations_org_contact_audience_pending")
      .on(t.organizationId, t.contactId, t.audience)
      .where(sql`status = 'PENDING'`),

    // One pending invite per email per audience per org
    uniqueIndex("uniq_portal_invitations_org_email_audience_pending")
      .on(t.organizationId, t.email, t.audience)
      .where(sql`status = 'PENDING'`),

    // Lookup by token hash (acceptance flow)
    uniqueIndex("uniq_portal_invitations_token_hash").on(t.tokenHash),

    index("idx_portal_invitations_org_status").on(t.organizationId, t.status),
    index("idx_portal_invitations_contact").on(t.organizationId, t.contactId),
    index("idx_portal_invitations_expires").on(t.expiresAt),
  ],
);
```

### 4.1 Invite creation

1. Caller must hold `projects:portal:manage` permission (internal org member).
2. Validate: `contactId` exists and belongs to `organizationId`; no `PENDING` invite
   already exists for this `(org, contact, audience)` (the partial unique index prevents
   it at DB level anyway).
3. Generate 32-byte cryptographically random raw token; store `SHA-256(token)` as
   `tokenHash`. The raw token is embedded in the email link only — **never stored**.
4. Set `expiresAt = now() + 72h` (configurable per org; max 7d for security).
5. `INSERT` into `portal_invitations`; return the invite ID (not the raw token) to the
   caller. The email delivery service receives the raw token.

### 4.2 Invite acceptance (atomic, single transaction)

```
POST /portal/invitations/accept  { token: "<raw>" }
```

The accept endpoint is `@Public` (no auth guard) and is rate-limited.

```
BEGIN TRANSACTION (SERIALIZABLE or FOR UPDATE on the invite row)

1. Compute tokenHash = SHA-256(token)
2. SELECT ... FROM portal_invitations WHERE token_hash = ? FOR UPDATE
   → 404 if not found
   → 410 GONE if status != 'PENDING' (already accepted/revoked)
   → 410 GONE if expires_at < now()
3. SELECT ... FROM organizations WHERE id = invitation.organization_id
   → 404/410 if org deleted or archived
4. Find or create users row for invitation.email
   → If user exists and already has ACTIVE portal membership for same (org, audience):
     fail with 409 Conflict
5. INSERT INTO portal_memberships (organization_id, audience, user_id, contact_id,
   status='ACTIVE', invited_by_user_id, activated_at=now(), session_epoch=0)
   → composite unique index enforces exactly-one-active per (org, contact, audience)
6. UPDATE portal_invitations SET status='ACCEPTED', accepted_at=now(),
   accepted_portal_membership_id=<new membership id>
7. Bump sessionEpoch on any PENDING stale membership for same (org, user, audience) = 0
   (edge case: double-click acceptance)
8. INSERT audit_log (action='portal_invite.accepted', ...)

COMMIT
```

The token is valid for one trip only — step 6 marks it `ACCEPTED` before the response
returns, so a replay attempt hits step 3's `status != PENDING` check.

A portal acceptance **NEVER** creates an `organization_members` row.

---

## 5. Schema: `project_client_grants`

A grant is the per-contact authorization to see a specific project (and optionally a
specific managed product). It carries a field-level visibility allowlist that supplements
the internal `client_visible` content flags.

```typescript
// backend/src/db/schema/portal-access/project-client-grants.ts

import {
  pgTable, pgEnum, text, serial, timestamp, integer, boolean, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations } from "../common/identity";
import { portalMemberships } from "./portal-memberships";
import { contacts } from "../crm/contacts";
import { projects } from "../product-management/core"; // target path post Wave 4/11

export const clientGrantStatusEnum = pgEnum("client_grant_status", [
  "ACTIVE",
  "SUSPENDED",   // paused; membership may still be ACTIVE
  "REVOKED",     // hard-removed; new grant required to restore
  "EXPIRED",     // past explicit expiry date
]);

export const projectClientGrants = pgTable(
  "project_client_grants",
  {
    projectClientGrantId: serial("project_client_grant_id").primaryKey(),
    organizationId: text("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),

    // Composite FK into portal_memberships — enforces tenant consistency
    portalMembershipId: integer("portal_membership_id").notNull(),
    // (organization_id, portal_membership_id) → portalMemberships(organization_id, portal_membership_id)
    // implemented as a table-level foreignKey in Drizzle:
    // foreignKey({ columns: [organizationId, portalMembershipId], foreignColumns: [portalMemberships.organizationId, portalMemberships.portalMembershipId] })

    // The CRM contact (denormalized for direct query without the membership join)
    contactId: integer("contact_id")
      .references(() => contacts.id, { onDelete: "restrict" })
      .notNull(),

    // The project being shared
    projectId: integer("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),

    // Optional: pin to a specific managed product when PM ships Wave 11 pm_products
    // managedProductId: integer("managed_product_id"),

    status: clientGrantStatusEnum("status").notNull().default("ACTIVE"),

    // Field-level visibility allowlist (what this contact can see in the portal)
    // These are AND-ed with the internal client_visible flags on individual records.
    canViewMilestones: boolean("can_view_milestones").notNull().default(true),
    canViewTasks: boolean("can_view_tasks").notNull().default(true),
    canViewAttachments: boolean("can_view_attachments").notNull().default(false),
    canViewComments: boolean("can_view_comments").notNull().default(false),
    canSubmitChangeRequests: boolean("can_submit_change_requests").notNull().default(true),

    // Optional hard-expiry (null = no expiry)
    expiresAt: timestamp("expires_at"),

    grantedByUserId: text("granted_by_user_id"),
    revokedAt: timestamp("revoked_at"),
    revokedByUserId: text("revoked_by_user_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (t) => [
    // Tenant composite uniqueness — child tables can reference (org, grant)
    uniqueIndex("uniq_project_client_grants_org_id")
      .on(t.organizationId, t.projectClientGrantId),

    // One active/suspended grant per contact per project per org
    uniqueIndex("uniq_project_client_grants_org_contact_project")
      .on(t.organizationId, t.contactId, t.projectId)
      .where(sql`status NOT IN ('REVOKED', 'EXPIRED')`),

    // Fast lookup: which projects can a portal membership see?
    index("idx_project_client_grants_membership").on(t.organizationId, t.portalMembershipId, t.status),

    index("idx_project_client_grants_project").on(t.organizationId, t.projectId, t.status),
    index("idx_project_client_grants_contact").on(t.organizationId, t.contactId),
    index("idx_project_client_grants_expires").on(t.expiresAt),
  ],
);
```

**Service enforcement:** before serving any portal project endpoint, the service runs:

```sql
SELECT pcg.project_client_grant_id, pcg.can_view_milestones, pcg.can_view_tasks,
       pcg.can_view_attachments, pcg.can_view_comments, pcg.can_submit_change_requests
FROM project_client_grants pcg
JOIN portal_memberships pm
  ON pm.portal_membership_id = pcg.portal_membership_id
  AND pm.organization_id = pcg.organization_id
WHERE pcg.organization_id = $orgId
  AND pm.user_id           = $portalUserId
  AND pcg.project_id       = $projectId
  AND pcg.status           = 'ACTIVE'
  AND pm.status            = 'ACTIVE'
  AND (pcg.expires_at IS NULL OR pcg.expires_at > now())
LIMIT 1
```

A 404 is returned if no row is found (BOLA-safe: no "access denied" vs "not found"
signal leak to external callers).

---

## 6. Separate portal session audience + guards

### 6.1 JWT `aud` claim

When a portal membership is authenticated (post-acceptance, magic link, or password
login via a separate portal sign-in page), the backend issues a **separate JWT** that
carries:

```json
{
  "sub":           "<users.id>",
  "aud":           "CLIENT_PORTAL",
  "orgId":         "<organization.id>",
  "portalMembershipId": 42,
  "sessionEpoch":  0,
  "sessionId":     "portal:<uuid>",
  "iat": ..., "exp": ...
}
```

There are **no** `role`, `permissions`, `enabledModules`, `isPlatformAdmin`, or
`isOrgOwner` claims. A portal token cannot be used on any internal endpoint.

### 6.2 New guards

```
PortalJwtAuthGuard   — verifies aud='CLIENT_PORTAL', loads portal membership + epoch
InternalJwtAuthGuard — verifies aud is absent or 'INTERNAL' (existing JwtAuthGuard, renamed)
```

**Cross-audience rejection is the first check in each guard:**

```typescript
// PortalJwtAuthGuard
const aud = claims.aud;
if (aud !== "CLIENT_PORTAL") throw new UnauthorizedException("Audience mismatch");

// After signature verification, check session epoch against Redis
const storedEpoch = await redis.get(`portal:epoch:${claims.portalMembershipId}`);
if (storedEpoch !== null && Number(storedEpoch) > claims.sessionEpoch) {
  throw new UnauthorizedException("Portal session invalidated");
}
```

```typescript
// InternalJwtAuthGuard (existing JwtAuthGuard)
const aud = claims.aud;
if (aud === "CLIENT_PORTAL") throw new ForbiddenException("Portal tokens not accepted here");
```

Portal routes use `PortalJwtAuthGuard` exclusively. Internal routes use
`InternalJwtAuthGuard` exclusively. No endpoint accepts both audiences.

### 6.3 Session invalidation events

Every event below **atomically** increments `portal_memberships.session_epoch` in the
DB **and** sets `SET portal:epoch:<portalMembershipId> <new_epoch> EX <token_ttl+60>`
in Redis within the same service transaction. Tokens carrying a lower epoch are rejected
at the guard.

| Event | Who triggers | Scope |
|-------|-------------|-------|
| Membership suspended | Internal admin | All sessions for this membership |
| Membership revoked | Internal admin | All sessions for this membership |
| Contact unlinked from CRM | Service layer | All portal memberships tied to that contact |
| Org archived / deleted | Org lifecycle service | All portal memberships for that org |
| Grant revoked (all projects) | Internal admin or service | Membership-level epoch bump optional — grant check covers it |
| Portal password changed | Portal auth flow | All sessions for this membership |
| Explicit portal sign-out | Portal front-end | Revoke the specific `sessionId` via `portal:revoked:<sessionId>` |

### 6.4 Portal session storage

Portal sessions are stored in a **namespaced Redis key space** separate from internal
sessions: `portal:session:<sessionId>` vs the existing `revoked:session:<sessionId>`.
The `JwtAuthGuard` (renamed `InternalJwtAuthGuard`) must never look up portal session
keys — the namespace prefix prevents accidental overlap.

### 6.5 Portal shell — separate frontend layout

```
frontend/app/(portal)/
  layout.tsx           — loads PortalSession (no DashboardShell, no sidebar, no header)
  login/page.tsx       — portal sign-in (magic link or password)
  portal/page.tsx      — project list
  portal/[projectId]/page.tsx
```

The `(portal)` layout is entirely independent of `(authenticated)`. It:
- Validates the portal NextAuth session (a separate NextAuth `provider` entry or a
  custom portal session cookie) and redirects to `/(portal)/login` on missing session.
- Renders a stripped shell: org logo, contact name, sign-out only — **no sidebar, no
  module nav, no admin chrome**.
- Never imports `DashboardShell`, `MobileModuleBottomNav`, or any internal shell component.

The portal NextAuth config uses a separate **`PORTAL_JWT_SECRET`** and a separate
`session.strategy = "jwt"` with `maxAge` matching the portal token TTL. The portal
session cookie name is `__portal_session` (distinct from `__session`).

---

## 7. Migration / rollout: transition from internal portal to isolated audience

### 7.1 Current state summary

- `projects.client_id` FK → `users.id`: points at an internal user acting as a client.
- `ClientPortalController` behind `JwtAuthGuard` + `projects:portal:view`.
- Frontend at `(authenticated)/projects/portal/` inside the internal shell.

### 7.2 Phase 0 — Preparation (non-breaking, ships first)

1. **Add new tables.** `pnpm -C backend db:generate` → `db:migrate` for
   `portal_memberships`, `portal_invitations`, `project_client_grants`.
2. **Backfill from `projects.client_id`:** for each project where `client_id IS NOT NULL`,
   find or create a `contacts` row for the user's email (idempotent), then create an
   `ACTIVE` portal membership + `ACTIVE` project_client_grant for all visibility fields
   enabled. Run as a one-off script; log every row created. No existing auth flow changes.
3. **Deploy `PortalJwtAuthGuard` + updated `InternalJwtAuthGuard`** — at this point no
   route uses `PortalJwtAuthGuard` yet, so no behavior change.

### 7.3 Phase 1 — New portal routes (additive)

1. Add `(portal)/` layout + portal sign-in page.
2. Add `POST /portal/auth/magic-link` and `POST /portal/invitations/accept` under a new
   `PortalAuthModule` (no internal guards).
3. Add portal-scoped versions of the data endpoints:
   - `GET /portal/projects` — reads from `project_client_grants` (not `projects.client_id`)
   - `GET /portal/projects/:projectId/overview`
   - `GET /portal/projects/:projectId/change-requests`
   - `POST /portal/projects/:projectId/change-requests`
   All behind `PortalJwtAuthGuard`. No `PermissionGuard` (portal principals have no
   internal permissions). BOLA is re-asserted by the grant lookup in every service method.
4. Internal members who previously used `projects:portal:view` continue to use the OLD
   `(authenticated)/projects/portal/` path during transition. No regression.

### 7.4 Phase 2 — Invite flow + UI (additive)

1. Build portal invitation UI inside the internal shell:
   - `POST /projects/:projectId/portal/invite` — internal member invites a CRM contact.
   - UI: `features/projects/client-portal/portal-invite-dialog.tsx`.
2. Build grant management UI:
   - `GET/POST/PATCH/DELETE /projects/:projectId/portal/grants`.
   - UI: `features/projects/client-portal/portal-grant-manager.tsx`.
3. New contacts invited via this flow use the `(portal)` shell exclusively.

### 7.5 Phase 3 — Cutover + deprecation

1. For all existing `projects.client_id` users: send a portal invitation email with a
   magic link. After acceptance, the `(authenticated)/projects/portal/` path serves a
   redirect notice ("Your portal has moved — check your email").
2. After 30-day grace: add a **feature flag** (`portalAudienceIsolated`) and, when set,
   remove the `@RequirePermission("projects:portal:view")` endpoints from
   `ClientPortalController` (return 410 Gone).
3. Wave 12 dead-code sweep: remove `projects.client_id`, `ClientPortalController`,
   `ClientPortalService`, the `(authenticated)/projects/portal/` routes, and the
   `projects:portal:view` / `projects:changerequests:*` permission keys (or re-scope
   them to internal admin use only if change-request management remains in the shell).

### 7.6 Rollback plan

Phases 0 and 1 are fully additive — dropping the new tables and the new route module
restores the prior state exactly. Phase 2 is additive until Phase 3 cutover. Phase 3 is
gated behind a feature flag; disabling the flag keeps the old path alive.

---

## 8. RBAC: new permission keys

```
projects:portal:manage       — invite contacts, manage grants, revoke memberships
projects:portal:view         — (existing; keep for internal staff viewing the portal data in the shell)
projects:clientgrants:create — create a project_client_grant
projects:clientgrants:update — update field-level allowlist
projects:clientgrants:delete — revoke a grant
```

Portal principals have **no RBAC permissions**. Their access is determined entirely by
`project_client_grants`. `PermissionGuard` is never applied to portal endpoints.

---

## 9. Security invariants (OWASP A01, A02, A05)

| Invariant | Enforcement |
|-----------|-------------|
| A portal JWT cannot access an internal endpoint | `InternalJwtAuthGuard` rejects `aud=CLIENT_PORTAL` as the first check |
| An internal JWT cannot access a portal endpoint | `PortalJwtAuthGuard` rejects any token without `aud=CLIENT_PORTAL` as the first check |
| A portal contact can only see projects explicitly granted | `project_client_grants` lookup before every data fetch; 404 on no grant (BOLA-safe) |
| A portal contact never sees another org's data | `organizationId` on all tables + composite FK chain; every query scoped by `organizationId` |
| Stale portal sessions are invalidated within seconds | `sessionEpoch` in Redis; checked on every portal request |
| A portal accept flow cannot create an org membership | Acceptance service only inserts into `portal_memberships`; `organization_members` is never touched |
| Invite token is non-replayable | `tokenHash` stored; raw token emailed once; status set `ACCEPTED` atomically before response |
| Token is not stored in the DB | Only `SHA-256(token)` is stored; raw token is ephemeral in memory during generation |
| A Module Admin cannot manage portal auth | `projects:portal:manage` is gated to `projects` module; module admin grantability list enforced by §6 of the overall design |

---

## 10. Acceptance criteria (Wave 9 is done when)

- [ ] Migration: `portal_memberships`, `portal_invitations`, `project_client_grants` tables exist; backfill from `projects.client_id` ran without error.
- [ ] A portal token with `aud=CLIENT_PORTAL` is rejected with 403 on any internal endpoint.
- [ ] An internal JWT is rejected with 403 on any portal endpoint.
- [ ] A portal member sees only projects where an `ACTIVE` `project_client_grants` row exists for their membership.
- [ ] Suspending a portal membership revokes all active portal sessions within one TTL cycle.
- [ ] Revoking a portal invite before acceptance returns 410 on the acceptance URL.
- [ ] Accepting a revoked or expired invite returns 410.
- [ ] Double-accepting (replay) returns 409.
- [ ] The `(portal)` frontend layout renders no internal sidebar, header, or admin chrome.
- [ ] Existing internal members using `(authenticated)/projects/portal/` continue to work unchanged.
- [ ] Build + lint + types all pass.
- [ ] Controller e2e specs cover: accepted invite → portal session → data access allowed; portal token → internal endpoint → 403; internal token → portal endpoint → 403; cross-tenant project access → 404; suspended membership → 401.
