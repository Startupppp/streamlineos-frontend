---
wave: 0
type: ADR (reconciliation gate)
title: PM hierarchy reconciliation — pm_workspaces container is authoritative
status: ACCEPTED
date: 2026-07-26
supersedes: wave-8-pm-hierarchy-design.md (§2 no-container model, §3 roster rename target)
decided_by: product owner (Aditya) — explicit decision 2026-07-26
governs: all Product Management (Wave 7) schema, API, UI, and migration work
---

# ADR — Product Management hierarchy: the PM Workspace container is authoritative

> **Wave 0 gate.** The platform redesign plan (`docs/schema-change-plan.md`, §6/§7 and Wave 0)
> states that **no PM implementation may begin until a reconciliation ADR resolves
> `wave-8-pm-hierarchy-design.md` against the redesign plan.** This is that ADR. It is authoritative
> over any prior PM design note. Where they conflict, this document wins.

---

## 1. Decision

Adopt the **PM Workspace container** hierarchy:

```
Organization
└── Product Management            (StreamlineOS Module; org-scoped entitlement)
    └── PM Workspace              (pm_workspaces — the collaboration/access container; NOT the tenant)
        ├── Managed Product       (pm_products / managed_products — strategy, roadmap, outcomes)
        │     └── Project(s)      (optional association; a Project may have 0..1 Managed Product)
        ├── Delivery Team         (project_teams, workspace-scoped)
        └── Project               (delivery record) → Initiatives/Epics → Tickets
```

The competing **"no container"** model in `wave-8-pm-hierarchy-design.md` §2 — Product Management
hanging directly off `org_id` with `project_workspace_members` renamed to `product_management_members`
— is **SUPERSEDED**. It is not implemented.

Rationale: the redesign plan (§3 glossary, §6, §7) makes the PM Workspace the mandatory access
boundary for all PM work ("Product Management module permission **plus active PM Workspace
Membership** is the mandatory entry boundary"). Delivery Team / Project / client-grant access all
narrow *within* an active PM Workspace Membership. A flat org-scoped roster cannot express that
boundary, cannot host more than one PM collaboration space per org, and cannot carry the
`pm_workspace_id` composite-FK spine the plan requires on every PM child. The container is already
implemented in code (`08b07dc`, `pm_workspaces` + `pm_workspace_memberships`).

---

## 2. Contradiction ledger — wave-8 doc vs. redesign plan

Every point where `wave-8-pm-hierarchy-design.md` conflicts with `docs/schema-change-plan.md`, and the decision:

| # | Topic | wave-8 doc position | Redesign plan (§6/§7) | **Decision** |
|---|---|---|---|---|
| C1 | Container table | §2: **NO `pm_workspaces`**; PM hangs off `org_id` | `Organization → Product Management → PM Workspace → …` | **Plan wins.** `pm_workspaces` is authoritative. |
| C2 | Top PM roster | §3: rename `project_workspace_members → product_management_members` (org-level, keyed on `user_id`) | `pm_workspace_memberships`, workspace-scoped, keyed on **Organization Membership** | **Plan wins.** Roster = `pm_workspace_memberships` (references `organization_members.id`, not `user_id`). `product_management_members` rename target is **dropped**. |
| C3 | Membership principal | §3.2/§5: roster references `user_id → users` | Plan §5: internal PM tables accept **Organization Memberships only**, never raw user id | **Plan wins.** `organization_membership_id`. |
| C4 | Child tenancy spine | §5: children carry `org_id` only | Plan §5/§7: every PM child carries **`org_id` AND `pm_workspace_id`** with composite FK to `pm_workspaces(org_id, id)` | **Plan wins.** `pm_workspace_id` added to projects/teams/managed_products/client-grants (nullable now → NOT NULL + composite FK post-backfill). |
| C5 | Provisioning | §2: none (no container to provision) | Plan §6: **exactly one default PM Workspace iff PM enabled or PM data retained**, transactional + idempotent, partial-unique `(org_id, is_default)` | **Plan wins.** Provision default workspace on PM enable. |
| C6 | Terminology | §7: strip **all** "workspace" from PM | Plan §3: "Workspace" is **forbidden outside PM** — but **"PM Workspace" is the sanctioned term** | **Amend.** Strip legacy `project_workspace_*` naming; **keep** "PM Workspace" for the container. |
| C7 | Managed Product | §4: `managed_products` hangs off `org_id` | Plan §6: Managed Product lives **inside a PM Workspace** | **Amend.** `managed_products` gains `pm_workspace_id`. |

**Retained from wave-8 (not in conflict — carry forward):** the expand→contract migration discipline
(§3.2, §9), the Managed Product concept + `UNIQUE(org_id, key)` tenant-composite key (§4), the RBAC
key additions (§8), the "strip legacy workspace symbols from the frontend" file list (§7), and the
collision-gate discipline (§6). These remain valid guidance under the container model.

---

## 3. Decided rules (authoritative)

### 3.1 Containment
- `Organization → Product Management (module) → PM Workspace → { Managed Product, Delivery Team, Project }`.
- `pm_workspaces` is the container and access boundary; it is **never** the tenant.
- A Project belongs to exactly one PM Workspace and **0..1** Managed Product (a client-delivery
  Project with no Managed Product is first-class, not incomplete).
- Managed Product owns strategy/roadmap/outcomes; Project owns Initiatives/Epics → Tickets → delivery.

### 3.2 Membership
- `pm_workspace_memberships.organization_membership_id → organization_members.id` (**membership, never `user_id`**).
- Product Management module entitlement **+ active PM Workspace Membership** is the mandatory entry
  boundary for every PM read/write. Delivery-Team and Project grants narrow access only *after* an
  active PM Workspace Membership is confirmed.
- Revoking a PM Workspace Membership immediately invalidates all downstream PM access (bump access
  version; the guard/permission layers already re-check per request).

### 3.3 Foreign keys / tenant safety
- `pm_workspaces` exposes candidate key `UNIQUE(org_id, pm_workspace_id)` (composite-FK target). ✔ present.
- Every PM child carries `(org_id, pm_workspace_id)` and a composite FK
  `(org_id, pm_workspace_id) → pm_workspaces(org_id, pm_workspace_id)`.
- Nested PM children (Initiative/Epic, Ticket, memberships, grants) use workspace-qualified parent
  candidates `(org_id, pm_workspace_id, parent_id)` so cross-workspace references are impossible.
- `pm_workspace_memberships.organization_membership_id` uses a composite FK
  `(org_id, organization_membership_id) → organization_members(org_id, id)` — a single-column FK +
  separate `org_id` is **insufficient** per plan §5.

### 3.4 Provisioning invariant
- An **eligible** Organization (PM enabled OR retaining PM data) has **exactly one** default PM
  Workspace; an ineligible Organization has **zero**.
- Schema enforces *at most one* via partial unique `(org_id) WHERE is_default = true` (✔ present).
- Service enforces *exactly one*: enabling Product Management (`EntitlementsService.setModuleEnabled`)
  transactionally + idempotently creates the default workspace **before the enablement commits**;
  a retry re-reads the unique default row rather than creating a second.
- Migration backfills a default workspace only for eligible orgs, then backfills existing
  projects/rosters/teams/managed-products into it before `pm_workspace_id` becomes NOT NULL.

### 3.5 Navigation / routing / terminology
- Canonical PM routes are path-based: `/product-management/workspaces/[pmWorkspaceId]/…`; keep
  `/projects/**` as validated aliases until the route-alias matrix gates removal.
- The server resolves the active Organization from the session and validates the route workspace
  belongs to it + PM enabled + active PM Workspace Membership before returning any PM data.
- "PM Workspace" is the **only** sanctioned use of "Workspace". A single default workspace renders a
  context chip; a switcher appears only when the caller can select more than one. Legacy
  `project_workspace_*` symbols are compatibility-only and must not surface in product copy.

### 3.6 Legacy data / migration
- `project_workspace_members` (org-level roster) is **compatibility data**: backfill into
  `pm_workspace_memberships` under the org's default workspace, resolving `user_id →
  organization_members.id` (drop rows whose user has no active membership; log them). It is **not**
  renamed to `product_management_members`; that wave-8 target is dropped.
- `project_client_grants.pm_workspace_id` (already present, nullable text) is backfilled to the
  default workspace and gains the composite FK.
- Every table lands via `db:generate` → `db:migrate` (no `db:push`, no side-channel SQL — the
  existing `docs/schema-migration/branch-sync-project-teams.sql` must be converted to a real,
  journaled migration as part of the Wave 0 baseline reconciliation).

---

## 4. Gaps in landed code (`08b07dc`) to close

The container schema landed correctly for the **expand** phase. Remaining work to reach the decided rules:

| # | Gap | File | Fix | Phase |
|---|---|---|---|---|
| G1 | `organization_membership_id` uses single-column FK + separate `org_id` | `projects/pm-workspace-memberships.ts` | Add composite FK `(org_id, organization_membership_id) → organization_members(org_id, id)` (candidate key `uniq_org_members_org_id` exists) | now (schema) |
| G2 | `pm_workspace_id` is bare nullable text, no FK | `projects/core.ts`, `project-teams.ts`, `projects/managed-products.ts`, `portal-access/project-client-grants.ts` | After backfill: composite FK `(org_id, pm_workspace_id) → pm_workspaces` + NOT NULL | after backfill |
| G3 | No generated migration (schema-only) | `pm_workspaces`, `pm_workspace_memberships` | `db:generate` + journal the migration (Wave 0 gate) | now |
| G4 | Provisioning not wired | `access/entitlements.service.ts` `setModuleEnabled` | Transactional idempotent default-workspace creation on PM enable; migration backfill for existing eligible orgs | Wave 7 |
| G5 | Managed Product still lacks strategy/roadmap fields + workspace composite FK | `projects/managed-products.ts` | Add PM-owned strategy/roadmap columns (or child tables) + `(org_id, pm_workspace_id)` composite FK | Wave 7 |
| G6 | Delivery-Team / Project membership don't yet prove active PM Workspace Membership | `project-teams.ts`, project membership tables | Composite FK / deferred constraint to an active `pm_workspace_memberships` row | Wave 7 |

G1 and G3 are the immediate, low-risk closers (schema + one migration). G2/G4/G5/G6 follow the
expand → backfill → constrain sequence and are Wave 7 execution items.

---

## 5. Definition of done (this ADR's gate)
- [x] Decision recorded: PM Workspace container is authoritative; wave-8 no-container model superseded.
- [x] Every wave-8↔plan contradiction enumerated with a decision (§2).
- [x] Containment / membership / FK / provisioning / navigation / legacy-data rules published (§3).
- [x] Landed-code gaps catalogued with fixes + phase (§4).
- [ ] `wave-8-pm-hierarchy-design.md` banner-marked SUPERSEDED (done alongside this ADR).
- [ ] G1 + G3 closed (composite membership FK + generated migration) — first Wave 7 slice.
