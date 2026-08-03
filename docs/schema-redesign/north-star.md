---
name: schema-redesign-north-star
status: DRAFT — awaiting verification
supersedes: nothing
extends: docs/schema-change-plan.md
decision: Option A — ideal end-state schema defined greenfield, reached through the existing wave program (no big-bang cutover)
---

# North-star target schema

This document specifies the **ideal end-state schema** with no compatibility compromises in the
*design*. `docs/schema-change-plan.md` remains the authoritative **path** (Waves 0–9); this
document is the **destination** those waves converge on.

Where this document and `schema-change-plan.md` disagree on a *table or column definition*, this
document wins. Where they disagree on *sequencing, migration mechanics, or release gates*,
`schema-change-plan.md` wins.

Read alongside: `CLAUDE.md` §19 (database rules), §21 (RBAC engine), `UI-UX-SYSTEM.md` (UI contract).

---

## 0. Governing rules for this schema

1. **No arrays or JSONB holding collections of entities.** A collection of things that can be
   individually created, indexed, paginated, revoked, or audited is a child table. JSONB is
   permitted only for genuinely opaque, wholly-replaced blobs (user preferences, editor content,
   provider payload snapshots).
2. **Every FK column exactly matches its parent's type.** No integer column referencing a text key.
3. **No polymorphic references.** A column that could point at several different tables becomes
   several typed tables. `resource_grants(resource_type, resource_id)` is replaced by typed grants.
4. **Every tenant-owned parent exposes `UNIQUE (org_id, id)`; every tenant child uses a composite
   FK `(org_id, parent_id)`.** The database must be structurally incapable of representing a
   cross-tenant relationship.
5. **One concept, one table.** Two tables modelling the same real-world thing is a defect, not a
   convenience. Two *different* things sharing a *word* must have different table names.
6. **Every authorization-bearing assignment keys to `organization_membership_id`, never to a global
   `users.id`.** A global user id never proves tenant access.
7. **Soft-delete via `deleted_at`; lifecycle via an explicit `status` enum.** Never overload one for
   the other.
8. **Composite indexes lead with `org_id`.**

---

## 1. Tenancy — verdict and target

### Verdict: keep Organization as the tenant. Do not add a generic Workspace layer.

Your concern was that a person can be invited into several workspaces *and* own their own. That is
exactly what `organizations` + `organization_members` (M:N) already models — a person owns
Organization A, is a member of Organization B, and pays/enables modules separately in each. A flat
model cannot express "these five containers share one bill, one SSO policy, one owner."

Evidence (research, high confidence): Slack shipped flat, then added the Enterprise Grid org layer
above workspaces. At migration, workspace primary owners were **automatically demoted** — ownership
reassignment was non-elective and org policy overrode workspace settings with no opt-out. Retrofitting
the org layer is a forced structural migration, not a gradual one. Starting without it is the
expensive choice.

**A "personal workspace" is not a new concept — it is an Organization with `kind = 'PERSONAL'`.**
This keeps one membership model, one permission resolver, one billing path.

### `organizations`

Retains its current identity. Changes:

| Change | Reason |
|---|---|
| `owner_membership_id` → `NOT NULL`, deferred composite FK → `organization_members(org_id, id)` | Exactly one owner, enforced by the DB |
| DROP `is_owner` from `organization_members` as an authority | Two sources of truth; derive it from the pointer |
| DROP `enabled_modules text[]` | Duplicates `org_modules`. Array anti-pattern |
| DROP `allowed_email_domains text[]` | → `organization_allowed_email_domains` child table |
| `purge_scheduled_by integer` → `text` FK to `users.id` | Type mismatch; cannot join today |
| ADD `kind` enum `('COMPANY','PERSONAL')` | Personal vs company namespace without a second model |
| Merge `status` / `status_v2` into one enum column | Two status columns is a defect |

### New: `organization_allowed_email_domains`

```
id                uuid pk
org_id            text not null → organizations.id
domain            text not null           -- lowercased, punycode-normalised
created_by_membership_id  int not null
created_at        timestamptz not null
UNIQUE (org_id, domain)
```

---

## 2. Ownership and transfer

Today ownership transfer exists, is transactional, and is **org-level only**. Your requirement is
explicitly broader: the HR who set up the platform hands the org to the CEO; the warehouse manager
hands Inventory to the COO; the same for Build, Data, and every other module.

### Design: one authoritative pointer per ownable scope + an accepted handshake

Slack's model (silent, non-elective reassignment) is what you want to *avoid*. GitHub's model — a
pending transfer the recipient must accept — is what your CEO/HR scenario needs, because the CEO
must consent before becoming accountable.

### New: `module_ownerships`

```
id                    uuid pk
org_id                text not null → organizations.id
module_key            text not null → modules.module_key
owner_membership_id   int  not null
created_at            timestamptz not null
updated_at            timestamptz not null
UNIQUE (org_id, module_key)
FK (org_id, owner_membership_id) → organization_members(org_id, id)
FK (org_id, module_key)          → org_modules(org_id, module_key)
```

One owner per module per org. The org owner implicitly outranks every module owner.

### New: `ownership_transfers`

Ownership transfer becomes a first-class, auditable lifecycle entity rather than a single UPDATE.

```
id                     uuid pk
org_id                 text not null → organizations.id
scope                  enum ('ORGANIZATION','MODULE') not null
module_key             text null → modules.module_key    -- non-null iff scope='MODULE'
from_membership_id     int  not null
to_membership_id       int  not null
status                 enum ('PENDING','ACCEPTED','DECLINED','CANCELLED','EXPIRED') not null
initiated_at           timestamptz not null
responded_at           timestamptz null
expires_at             timestamptz not null
reason                 text null
initiated_ip           inet null
FK (org_id, from_membership_id) → organization_members(org_id, id)
FK (org_id, to_membership_id)   → organization_members(org_id, id)
CHECK (module_key IS NOT NULL) = (scope = 'MODULE')
partial UNIQUE (org_id, scope, module_key) WHERE status = 'PENDING'
```

Rules the service enforces:

- Target must be an **active** membership. Cannot transfer to a pending invite.
- Only one pending transfer per scope at a time (the partial unique index).
- Acceptance is a separate authenticated action by the recipient; re-authentication required.
- On accept: single transaction — lock org + both memberships, move the pointer, write audit,
  `bumpPermissionsVersion`, invalidate both users' caches.
- The current owner's membership **cannot** be suspended, removed, or leave while it holds a
  pointer — enforced by a deferred constraint trigger. This is the orphaned-tenant guard.
- Org owner may force-reassign a module owner without handshake (they already outrank it).
- Platform admin may break-glass reassign an org owner, time-bounded and audited.

---

## 3. Access — the module-scoped RBAC target

This is the largest gap. Today `roles` are org-wide with **no module column and no Module Admin
concept**. Five competing role mechanisms coexist. The target collapses them to one coherent model.

### 3.1 Retire these entirely

| Retired | Replaced by |
|---|---|
| `users.role` (global text column) | `role_assignments` |
| `organization_members.role` (text column) | `role_assignments` |
| `role_permissions` (keyed by role *slug*) | `role_permission_grants` (keyed by role id) |
| `user_permissions` (direct user grants) | a personal role, or a typed resource grant |
| `user_roles` (keyed by user id) | `role_assignments` (keyed by membership id) |
| `membership_role_assignments` | `role_assignments` (this is the survivor, renamed) |
| `resource_grants` (polymorphic varchar) | typed grant tables (§3.6) |
| `group_roles` (untyped integer group id) | `group_role_assignments` (§3.5) |

### 3.2 `modules` — a real catalog table

Module keys are currently a hardcoded constant in one place and an UPPERCASE array projection in
another, which is the root of the "two vocabularies" false-403 bug.

```
module_key      text pk               -- lowercase canonical, e.g. 'build', 'hr', 'inventory'
name            text not null
description     text null
is_paid_only    boolean not null default false
sort_order      int not null
status          enum ('ACTIVE','DEPRECATED') not null default 'ACTIVE'
```

`org_modules(org_id, module_key)` FKs to it. **One vocabulary, lowercase, everywhere.** The
UPPERCASE projection is deleted, not translated.

### 3.3 `permissions` — descriptor-driven

```
key                text pk            -- 'module:resource:action', enforced by CHECK
module_key         text not null → modules.module_key
resource           text not null
action             text not null
risk_class         enum ('LOW','MEDIUM','HIGH','CRITICAL') not null
is_delegable       boolean not null default true
requires_resource_binding boolean not null default false
description        text not null
```

### New: `permission_supported_scopes` (replaces what would be an array)

```
permission_key  text not null → permissions.key
scope           data_scope not null       -- all | team | own | none
PRIMARY KEY (permission_key, scope)
```

A permission that only makes sense org-wide simply has one row (`all`). This is the "group with
roles" normalisation you asked for, applied to scopes.

### 3.4 `roles` — module-scoped, ranked, immutable-or-custom

```
id             uuid pk
org_id         text not null → organizations.id
module_key     text null → modules.module_key   -- NULL = org-wide role
slug           text not null                     -- UPPERCASE_SNAKE
name           text not null
description    text null
rank           int not null                      -- see rank ladder below
is_system      boolean not null default false    -- immutable; cannot be edited/deleted/cloned-into
created_by_membership_id int null
created_at / updated_at / deleted_at
UNIQUE (org_id, slug)
INDEX (org_id, module_key)
```

**Rank ladder** (lower number = higher authority):

| Rank | Principal | Scope |
|---|---|---|
| 0 | Organization Owner | derived from `organizations.owner_membership_id`, never a role row |
| 10 | Organization Admin | system role, org-wide |
| 20 | Module Admin | system role, one per module (`module_key` non-null) |
| 30 | Module custom role | created at runtime by a Module Admin, `module_key` non-null |
| 40 | Functional role | org-wide custom role created by Org Admin |

This directly answers your point 6: a **Senior HR** is a rank-30 role in `module_key='hr'` holding
`hr:leaves:approve`; a **Recruitment HR** is a rank-30 role in the same module *without* that key.
The HR Module Admin creates both; neither can touch Inventory.

### 3.5 Assignment and groups

**`role_assignments`** — the single assignment table.

```
id                       uuid pk
org_id                   text not null
organization_membership_id int not null
role_id                  uuid not null → roles.id
assigned_by_membership_id int null
expires_at               timestamptz null
reason                   text null
created_at               timestamptz not null
UNIQUE (org_id, organization_membership_id, role_id)
FK (org_id, organization_membership_id) → organization_members(org_id, id)
INDEX (org_id, organization_membership_id)
```

**`principal_groups`** — replaces the untyped `group_roles.group_id integer`.

```
id          uuid pk
org_id      text not null
kind        enum ('ORG_UNIT','CUSTOM') not null
org_unit_id uuid null → org_units.id     -- typed FK, non-null iff kind='ORG_UNIT'
name        text not null
UNIQUE (org_id, name)
```

**`principal_group_members`** and **`group_role_assignments`** are plain join tables with real FKs.
This is your "group with roles as a separate collection" requirement, with referential integrity —
today's `group_id integer` silently only resolves against the legacy HR `departments` table and is
invisible to the whole `org_*` hierarchy.

### 3.6 Typed resource grants (replaces polymorphic `resource_grants`)

One table per grantable resource type, each with real FKs:

- `pm_project_grants (org_id, project_id, organization_membership_id, permission_key, ...)`
- `pm_workspace_grants (org_id, pm_workspace_id, organization_membership_id, permission_key, ...)`
- `portal_project_grants (org_id, project_id, portal_membership_id, permission_key, ...)`

Add a new one when a new resource genuinely becomes shareable. Typed tables index, join, and cascade
correctly; a polymorphic `varchar resource_id` does none of these.

### 3.7 Grantability — the anti-escalation rule

Every role/grant write is rejected unless **all** hold:

1. Requested permission keys ⊆ caller's own resolved grantable set.
2. Target role `rank` > caller's own best rank (strictly lower authority).
3. If the caller is a Module Admin, every requested key's `permissions.module_key` = their module.
4. Target membership and every referenced resource belong to the caller's org.
5. The module is enabled and the requested scope is in `permission_supported_scopes`.
6. Unknown permission keys are **rejected**, never silently filtered.

Module Admin may appoint a peer Module Admin **only** in their own module. No path allows a Module
Admin to reach `settings:manage`, billing, ownership, or another module's admin role.

### 3.8 Resolution and caching

Single indexed resolution query per `(org_id, membership_id)`:
direct `role_assignments` ∪ `group_role_assignments` → `role_permission_grants` → merge to broadest
scope per key. Cached in Redis under `access:perms:{orgId}:{membershipId}:v{version}`, busted by
`bumpPermissionsVersion(tx, orgId)` in the same transaction as any mutation.

Research confirms the org-scoped cache key is correct: a key omitting tenant context lets a user who
is admin in org A read those permissions while acting in org B.

---

## 4. Directory, workforce, and the membership collapse

Three membership models exist today. Target:

| Table | Means |
|---|---|
| `users` | global login identity only |
| `organization_members` | internal tenant access + lifecycle. **The** membership |
| `organization_people` | tenant-local human record, may have no login (pre-hire, payee, contractor) |
| `workers` + `worker_engagements` | effective-dated employment; HR and Payroll both read this |
| `portal_memberships` | external audience. Never an internal member |

`user_memberships` is **deleted**. Its org-placement columns (`branch_id`, `department_id`,
`team_id`, `business_unit_id`) are typed `integer` against `text` UUID parents and cannot join —
they are dead columns. Placement moves to `organization_people` with correct typed FKs.

### Org structure: one hierarchy, not two

`departments` (HR, serial PK) and `org_departments` (common, UUID PK) both exist; likewise
`org_teams` / `hr_teams` / `project_teams`. Target: a **single** `org_units` table with a
`kind` enum (`BUSINESS_UNIT`, `BRANCH`, `DEPARTMENT`, `TEAM`) and a self-referencing `parent_id`,
plus `org_unit_members`. One hierarchy, arbitrary depth, works for a 5-person startup (zero rows)
and an MNC (business unit → country branch → department → team) without a re-model.

`project_teams` survives as a genuinely different concept — a **Delivery Team** inside Build — and
is renamed `pm_delivery_teams` so it can never be confused with an org unit.

---

## 5. External / client access

Client progress visibility (your point 4) must never be an `organization_members` row — that grants
a seat and internal audience.

- `portal_identities` — external login identity, separate from `users`.
- `portal_memberships` — `(org_id, portal_identity_id, status)`.
- `portal_project_grants` — typed, per-project, explicit.
- Portal requests carry `audience = PORTAL` and **skip the internal RBAC branch entirely**. There is
  no code path where a portal principal falls through to an internal permission check.
- Field allowlists per portal endpoint; a client sees progress, not internal cost or margin.

---

## 6. Invitations

The existing `invitations` table is already correct in shape (normalised, partial unique index on
pending) — your array complaint does not apply here. Two fixes:

- `token` is stored **plaintext** today → store `token_hash` (SHA-256) and drop the plaintext column.
- `revoked_by integer` → `revoked_by_membership_id int` with a real composite FK.

Add `invitation_events` (child table) for the resend/revoke/accept audit trail rather than
overwriting single timestamp columns.

---

## 7. Scale ladder: startup → mid-market → MNC

Single shared-table model with `org_id` on every tenant table, composite indexes leading with
`org_id`, and RLS as a **backstop** (never a replacement for service-layer checks — OWASP A01
requires object-level re-assertion on every read and write; a JWT id comparison is explicitly
insufficient).

The design degrades gracefully in both directions:

- **5-person startup:** zero `org_units`, zero custom roles, one system role each. Nothing to configure.
- **Mid-market:** module admins appear, custom roles per module, org units one or two levels deep.
- **MNC:** full unit hierarchy, delegated module administration, group-based role assignment,
  per-module ownership.
- **Small shop → large factory:** identical — Inventory's warehouse/delivery/quality roles are
  rank-30 module roles; a one-person shop simply has one.

No table changes are required to move between rungs. Per-tenant partitioning or isolated
infrastructure for a single very large tenant is a deployment change, not a schema redesign.

---

## 8. Explicitly rejected

- Dropping Organization / collapsing tenancy onto `users`.
- A generic `workspace` layer above or beside Organization.
- A shared generic `products` table. Managed Product, CRM Offer, Inventory Item and Inventory SKU
  are four distinct concepts — **they are already correctly separated in this repo and must stay so.**
- Keycloak, OpenFGA, SpiceDB, Cerbos or any external authorization runtime — ruled out by the
  Postgres + Redis constraint. Their *models* are borrowed: composite roles (Keycloak), typed
  relation grants (Zanzibar).
- A generic ABAC/JSON policy DSL.
- Arrays or JSONB for any collection of individually-addressable entities.
- Big-bang cutover. The target is reached through the Wave program.
