# Build role model and open risks

Status: implementation-ready target; current conformance requires verification

## 1. Vocabulary

| Term | Meaning |
|---|---|
| Organization entitlement | The organization has paid for or otherwise enabled Build. Stored separately from a person's access. |
| Organization standing | Owner, Admin, or Member relationship to the organization. |
| Module standing | Owner, Admin, or Member relationship to Build. |
| Permission | Capability to attempt an operation, such as viewing or updating tickets. |
| Scope | Breadth of a permission: own, team, or all, where the permission is declared scopable. |
| Reachability | Whether the principal can reach a specific project or record. |
| Field policy | Which fields the principal may see or mutate after reaching the record. |
| Client grant | Explicit, expiring access for an external principal to named client-safe surfaces. |
| Effective access | Intersection of organization state, module entitlement, principal standing, permissions, reachability, field policy, and current revocation state. |

`Owner`, `Admin`, and `Member` must always be qualified in implementation names and UI copy. Use `Organization Admin`, `Build Admin`, or `Project Member`; do not show an ambiguous `Admin` label.

## 2. Confirmed target role model

### 2.1 Organization standings

| Standing | Enabled-module access | Build effect | Limits |
|---|---|---|---|
| Organization Owner | Broad access to every enabled module | Effective Build Owner baseline | Ownership transfer and organization-critical actions remain owner controlled; plan and security policy still apply |
| Organization Admin | Broad administrative access to every enabled module | Effective Build Admin baseline | Cannot perform Owner-only organization actions; explicit separation-of-duty policies may restrict finance/security actions outside Build |
| Organization Member | No automatic access to optional modules | Must receive explicit Build standing | Sees no Build navigation, search result, notification body, API data, or AI context before assignment |

Organization Owner is structural: exactly one active owner must exist unless the organization lifecycle explicitly supports multiple owners. Organization Admin is a delegatable role. Organization Member is the base membership and carries no implicit Build grant.

### 2.2 Build standings

| Standing | Purpose | Default access | Administrative ability |
|---|---|---|---|
| Build Owner | Accountable owner for the module | All internal Build projects and records, subject to security policy | Assign Build Admin/Member, manage module policy, transfer Build ownership, configure client visibility and destructive retention rules |
| Build Admin | Operates Build for the organization | All internal Build projects and records by default | Manage projects, workflows, teams, members, templates, imports, integrations, automations, reports, and grants; cannot transfer Build ownership unless delegated by policy |
| Build Member | Performs normal work | Only projects/teams/work queues explicitly assigned or made discoverable by policy | Create and update within granted projects and workflow rules; cannot manage module access, security, retention, or broad client grants |

An Organization Owner maps to an effective Build Owner while Build is enabled. An Organization Admin maps to an effective Build Admin. These effective mappings need not create duplicate role-assignment rows, but the resolved access snapshot must expose their origin so audits and the UI can explain the decision.

An Organization Member obtains Build access through an explicit module role assignment, normally created by an invitation, member-management action, group rule, or approved just-in-time workflow. Assignment to a project without a Build module standing is invalid and must be rejected.

### 2.3 Project roles

Project roles refine Build reachability and behavior:

| Project role | Reachability | Typical actions |
|---|---|---|
| Project Owner | One project and its internal surfaces | project settings, member/manager assignment, normal project administration |
| Project Manager | One project | plan, assign, transition, manage milestones/releases/risks within policy |
| Project Member | Assigned project | create/read/update ordinary work according to permissions and workflow |
| Team Member | Projects linked to the team | same as member where team policy grants reachability |
| Watcher/participant | Named record only | read/comment or receive updates only when an explicit record policy grants it |

The canonical Build reachability owner is `backend/src/modules/build/core/project-crud/project-access.ts`. Callers add operation permissions; they do not re-query project membership tables.

### 2.4 External client principals

External clients are never converted into ordinary organization members for portal convenience. A client principal contains:

- portal audience and principal kind;
- client/party reference;
- grant set or grant-version reference;
- organization and permitted project IDs;
- allowed surface and action codes;
- issued, expires, revoked, and last-used facts;
- session/token ID and authentication assurance.

Default client surfaces are approved progress, milestones, deliverables, client-safe files, decisions awaiting the client, change requests, feedback/intake, and approved invoice/payment projections when Accounting permits them.

Never expose internal estimates, margin, staff rates, private notes, internal comments, security details, credentials, unapproved roadmap items, incident internals, other customers, unrestricted user directory, or raw audit logs.

## 3. Effective authorization algorithm

Execute these checks in order. A later check cannot restore access denied earlier.

```text
1. Authenticate the principal for the route audience.
2. Resolve active user, organization, membership, session/revocation, and MFA state.
3. Resolve organization Build entitlement.
4. Resolve principal module standing:
   a. Organization Owner -> effective Build Owner.
   b. Organization Admin -> effective Build Admin.
   c. Organization Member -> explicit Build role assignment required.
   d. External client -> active grant required; never use internal role fallback.
   e. System job -> declared permission ceiling and tenant binding required.
5. Resolve operation permission and scope.
6. Resolve project/record reachability through the canonical owner.
7. Apply workflow-state, ownership, field, sensitivity, and client-visibility policy.
8. Recheck expected revision and execution-time authority for deferred work.
9. Execute inside the tenant transaction and write audit evidence.
```

Use `404` when acknowledging the record would disclose another tenant or inaccessible project. Use `403` when the caller may know the record but lacks the requested operation. Do not reveal record titles, assignees, client names, or permission details in denial messages.

## 4. Role and permission bundles

The permission catalog remains fine grained. Standard standings are versioned bundles generated from that catalog, not hand-maintained lists copied into UI code.

### 4.1 Capability families

At minimum, bundle and test these Build families:

- module: view, manage, restore;
- projects: view, create, update, archive, restore, settings manage;
- tickets: view, create, update, delete/archive, restore, rank, assign, comment;
- members/teams: view and manage;
- managed products: view, create, update, delete;
- workflow/states: view and manage;
- cycles, epics, roadmap, goals, releases, milestones;
- approvals and change requests;
- client portal and client visibility;
- intake, forms, feedback, and product discovery;
- QA, bugs, incidents, risks, and decisions;
- files, meetings, updates, automations, webhooks, and integrations;
- budgets and cross-module projections;
- reports: view, create, share, export;
- imports and exports;
- AI: read assist, propose, execute ordinary, execute sensitive;
- retention, audit, and privileged recovery.

### 4.2 Default bundle policy

| Capability | Build Owner | Build Admin | Build Member | Client |
|---|---:|---:|---:|---:|
| Enter Build | Yes | Yes | Yes | Portal only |
| View all internal projects | Yes | Yes | No | No |
| Create project | Yes | Yes | By custom grant | No |
| Manage module roles | Yes | Yes, except owner transfer | No | No |
| Manage project members | Yes | Yes | Project owner/manager policy | No |
| Create/update ordinary tickets | Yes | Yes | In reachable project | No by default |
| Decide internal approval | Yes | Yes or approval policy | Named approver | No |
| Decide client approval | Internal override only by explicit audited policy | Internal override only by explicit audited policy | No | Named grant |
| Manage client grants/visibility | Yes | Yes | No | No |
| Export internal data | Yes | Yes with export policy | Explicit bounded grant | Client-safe export only if granted |
| Delete/archive/restore | Yes | Yes within retention policy | Explicit narrow grant | No |
| Use AI | Yes | Yes | Within own effective access | Portal assist only if separately approved |

Build Member is not a viewer. It is the productive default role. A view-only user should receive a custom Viewer role or a narrow client/stakeholder grant.

## 5. Data model and invariants

### 5.1 Authoritative records

- `org_modules` answers whether Build is available to the organization.
- organization membership answers whether an internal human belongs to the tenant.
- module ownership identifies the Build Owner.
- role assignments and grants answer which Build standing/permissions an Organization Member has.
- invitation module access carries the intended Build standing before acceptance.
- project membership/team/manager records answer record reachability through `project-access.ts`.
- portal grant records answer external reachability and action/field visibility.
- permission and grant versions invalidate access caches and long-lived sessions.

### 5.2 Required constraints

1. A module role assignment references an active organization membership and enabled module in the same organization.
2. A Build Owner references an active membership in the same organization.
3. Exactly one active Build Owner exists unless the ownership model explicitly adopts co-owners.
4. An Organization Member cannot be added to a Build project without an effective Build standing.
5. Removing Build standing revokes project reachability, saved views, notifications with private content, AI tools, and active Build sessions.
6. Disabling Build invalidates all Build access and pauses Build workers for the organization without deleting data.
7. Portal grants have typed project/surface/action relationships; authorization-bearing grant scope is not stored only in JSON.
8. Portal grant expiry and revocation are indexed and included in the grant-version check.
9. Invitation acceptance verifies organization, email/account binding, invitation state, expiration, and intended module standing in one transaction.
10. Every access mutation bumps the organization permission version and emits an auditable event.

The current `user_module_access` source documents a deny-only override. It cannot implement the accepted rule that Organization Members require an explicit Build grant by flipping `enabled=true`. The grant must come from a Build role assignment or another positive, auditable assignment relation; the override can continue to remove access.

## 6. Administration APIs

All mutations require an idempotency key, strict schema, expected revision where applicable, transaction, permission-version bump, audit record, and outbox event.

| Endpoint | Purpose | Minimum authority |
|---|---|---|
| `GET /access/modules/build/members` | List effective Build principals and assignment origin | Build Admin |
| `POST /access/modules/build/invitations` | Invite Organization Member with Build standing | Build Admin; Owner standing only by Build Owner |
| `PUT /access/modules/build/members/:membershipId/standing` | Assign/change Owner, Admin, Member | Build Admin; owner transfer uses dedicated flow |
| `DELETE /access/modules/build/members/:membershipId` | Revoke Build access | Build Admin; cannot remove final owner |
| `POST /access/modules/build/ownership-transfer` | Start transfer | Build Owner plus recent authentication |
| `POST /access/modules/build/ownership-transfer/:id/accept` | Accept transfer | named recipient plus recent authentication |
| `GET /build/projects/:projectId/access` | List project reachability and origin | Build Admin or project manager policy |
| `PUT /build/projects/:projectId/access/:membershipId` | Set project role | Build Admin or project owner/manager policy |
| `GET /build/client-grants` | List grants without raw secret tokens | Build Admin |
| `POST /build/client-grants` | Create typed client grant | Build Admin and client-visibility permission |
| `POST /build/client-grants/:id/revoke` | Revoke grant immediately | Build Admin and client-visibility permission |
| `POST /build/client-grants/:id/rotate-link` | Invalidate previous link and issue replacement | Build Admin plus recent authentication where policy requires |
| `POST /build/client-access-requests` | Ask a grantable administrator to review client access for a reachable project | Build Member with project reach; does not confer grant authority |
| `GET /build/client-access-requests` | Show own requests or a scoped administrator review queue | requester sees own; grantable administrator sees authorized projects |
| `POST /build/client-access-requests/:id/decide` | Approve for separate grant review or decline with reason | grantable administrator; cannot directly issue grant without the grant command |
| `POST /access/explain` | Safe access explanation for admins | Organization Admin or Build Admin; response is redacted |

The client-access-request paths are **Planned** target operations, not current controller claims. Before adding a table, the owning package checks whether the existing Approval record can represent a typed access request with project scope, requester, intended client/contact reference, reason, state, reviewer, decision reason, revision, timestamps, and optional resulting grant reference. The request operation is idempotent per requester/project/client/purpose while open, rate limited, and audited. The recipient list contains only administrators who can actually review that project. A decision never silently creates a portal grant; it opens the separately authorized grant preview/confirmation command. Requester and reviewer receive only their permitted status projection. Revocation, changed project reach, or disabled Build cancels outstanding request actions without disclosing other clients.

The API returns `effectiveStanding`, `assignmentOrigin`, `scopeSummary`, `permissionVersion`, and `revision`. It never returns password hashes, raw magic-link tokens, provider secrets, or hidden record titles.

## 7. UI behavior

### 7.1 Member management

The Build access page shows:

- name/email or pending invitation address;
- organization standing and Build standing as separate columns;
- assignment origin: organization standing, direct, group, invitation, temporary delegation;
- project coverage summary;
- status: active, invited, expired, suspended, revoked;
- last changed by/time and a link to safe audit detail;
- actions allowed for the current administrator.

Filters: status, organization standing, Build standing, assignment origin, project, team, group, invited by, and changed date. Search uses prefix/full-text rules without disclosing inaccessible users.

Role changes use a review drawer that lists capabilities gained/lost, affected projects, client grants that remain, and whether sessions/jobs will be revoked. High-impact actions require recent authentication and an explicit final action label such as `Transfer Build ownership`.

### 7.2 Navigation

- Organization Owner/Admin see Build when the organization entitlement is active.
- Organization Member sees Build only after an effective Build assignment.
- Build Member sees only reachable projects, records, command results, search results, notifications, dashboards, and reports.
- Client principals enter the client portal and never receive the internal Build sidebar.
- Removing access updates all navigation surfaces from one permission-filtered navigation model and invalidates cached routes.

### 7.3 Access errors

Use distinct states:

- module unavailable for the organization;
- membership pending or suspended;
- Build invitation required;
- project not reachable;
- action not permitted;
- client link expired or revoked;
- step-up authentication required;
- access changed while editing.

Messages provide a safe next action and correlation ID. They do not confirm the existence of hidden records.

## 8. Client grant policy

Each grant is the intersection of:

- organization and client/party;
- one or more projects;
- surfaces such as overview, deliverables, files, approval, feedback, change request, invoice summary;
- actions such as view, comment, upload, submit, approve, reject;
- field visibility policy and comment channel;
- issue and expiry times;
- optional email/domain/device/session restrictions;
- grant revision and revocation status.

Magic-link exchange rules:

1. Store only a hash of the bearer secret.
2. Bind the token to the portal audience and exact grant.
3. Apply short expiry and one-time exchange where practical; issue a narrower portal session after exchange.
4. Rate limit issuance and redemption without revealing whether an email or project exists.
5. Revoke previous tokens on rotation and bump the grant version.
6. Recheck the active grant on every privileged action and signed-file request.
7. Record issue, exchange, failure category, use, expiry, rotation, and revocation in audit logs.

Client comments and feedback are client-visible channels. An internal reply is private unless an authorized user explicitly publishes it. Client-created feedback enters Intake by default; policy may allow direct ticket creation through the same canonical command after validation.

## 9. AI and non-human principals

### 9.1 AI

AI inherits the caller's effective Build access. The tool registry filters tools before context retrieval and rechecks permission, reachability, field policy, proposal expiry, and source revisions before execution. An AI proposal cannot authorize itself.

Always require confirmation for:

- inviting, revoking, or changing a role;
- changing project/client visibility;
- generating or rotating a client link;
- publishing externally;
- exporting data;
- deletion, archival, restore, bulk mutation, or workflow administration;
- any Accounting action or external communication.

AI audit must connect the human actor, proposal, policy decision, confirmation, canonical commands, and results.

### 9.2 Automations, integrations, imports, and jobs

- A system principal has a named job type, organization binding, and a fixed permission ceiling from the catalog.
- An automation stores its creator/owner and declared action set. Execution resolves current policy; the creator's former access is not permanently copied.
- Imports use the requesting actor for preview and a bounded job principal for execution. Each target command rechecks organization and project scope.
- Integration callbacks authenticate the provider, map to an organization/project through owned mappings, and invoke canonical Build commands with an integration principal.
- Jobs do not receive blanket Organization Owner or Build Owner standing.

## 10. Cache and revocation

Authorization caches are keyed by user/membership, organization, module, principal kind, role/grant version, and policy schema version. Project reachability adds project ID and project-access revision. Portal caches add grant ID and grant version.

Access mutation sequence:

1. lock and validate the authoritative assignment/grant;
2. write the mutation and audit row in one tenant transaction;
3. increment the organization permission version and relevant module/project/grant revision;
4. write the outbox event in the same transaction;
5. commit;
6. invalidate affected cache namespaces and active sessions where required;
7. consumers remove private notifications/search projections and stop future jobs.

Mutations and privileged reads fail closed when revocation state cannot be established. A safe low-risk read may fall back to the authoritative database. Never accept a stale positive portal grant or permission cache during an outage.

## 11. Audit events

At minimum record:

- `build.access.invited`, `build.access.accepted`, `build.access.revoked`;
- `build.access.standing_changed`, including old/new standing and assignment origin;
- `build.ownership.transfer_started`, `accepted`, `cancelled`, `expired`;
- `build.project_access.changed`;
- `build.client_grant.created`, `changed`, `rotated`, `revoked`, `expired`;
- `build.client_visibility.changed`;
- privileged export, restore, retention, impersonation, and AI execution.

Audit is append-only, tenant scoped, permission protected, redacted, and exportable to an authorized administrator. Record stable IDs and change summaries; do not duplicate bearer tokens or sensitive content.

## 12. Confirmed architecture versus open verification

### 12.1 Confirmed design

- Four-layer decision: module, permission, record, field.
- Organization Owner/Admin broad access to enabled Build.
- Organization Member explicit Build assignment.
- Build Owner/Admin/Member standard ladder.
- Client access through separate grant principals.
- Request-scoped authorization facts through `AuthContext`.
- Project reachability through `project-access.ts`.
- Tenant transaction and RLS as database boundaries.
- Permission/grant version invalidation and canonical command paths.

### 12.2 Current source evidence

- The repository has an organization module entitlement model and per-membership module override in `backend/src/db/schema/common/access-modules.ts`.
- Invitation module standings and module-scoped role records exist in `backend/src/db/schema/common/auth.ts`.
- Build permission definitions exist in `backend/src/modules/rbac/permissions/build.ts`.
- System role generation includes organization roles and module Admin/Owner/Member ladders in `backend/src/modules/rbac/seed-system-roles.ts`.
- Request fact memoization, scoped reads, portal authentication, and canonical project reachability have dedicated source paths and ADRs.

This evidence confirms architecture intent in source. It does not confirm every database is migrated/backfilled, every route is classified, every role is correctly seeded, every cache invalidates, or every deployment enforces the design.

### 12.3 Historical and open risks

| Risk | Why it matters | Required closure evidence |
|---|---|---|
| Org Admin broad Build access may differ from current seeded grant semantics | Current seed code builds Org Admin from settings/access keys while module roles carry module permissions | Target-role test against a migrated database plus resolver tests showing effective Build Admin mapping |
| `user_module_access` is documented as deny-only | Treating `enabled=true` as a grant could give Organization Members implicit access | Positive grants only from role/module assignment; negative tests for unassigned Org Member |
| Existing tenants may have stale role bundles | New seed definitions do not prove old organizations were reconciled | Reconciler/backfill report, permission-version bump, sampled and full invariant query |
| Build route surface is large | One missing permission decorator or wrong alternate key can expose a path | Route census, OpenAPI `x-exposure` check, controller tests, runtime negative tests |
| Permission is sometimes confused with reachability | `build:*:view` alone could expose unrelated projects | Canonical project-access conformance grep/test and cross-project negative tests |
| Direct table reads can bypass module ownership | Build currently has known direct CRM/Timesheets schema dependencies | Replace with injected interfaces and enforce dependency checks |
| Portal projection can leak internal fields | A client-safe page is a different projection, not a hidden internal page | Field allow-list tests, snapshot diff, browser/network inspection with client account |
| Grant revocation may be cached across replicas | A revoked magic link could remain useful | distributed invalidation test, version mismatch test, maximum revocation SLO measurement |
| Background work may outlive actor access | Export/import/AI/automation can run after revocation | execution-time policy recheck and job cancellation/denial tests |
| Signed file URLs can outlive grants | A revoked client could retain file access | short-lived URLs, issuance recheck, storage audit, expiry/revocation tests |
| Search, notifications, reports, and caches are secondary leak paths | Main API protection does not scrub already-built projections | removal/invalidation consumers, replay tests, browser and direct API negative tests |
| UI role labels may hide assignment origin | Admins can remove the wrong grant or misunderstand inherited access | effective-access explanation API and UI tests |
| RLS evidence may be absent on the target database | Source policies and unit tests do not prove deployed database enforcement | runtime-role target-DB tests for cross-tenant select/update/delete |
| Owner transfer can produce zero or multiple owners | Locks and uniqueness are required during concurrent transfer | concurrent database test and recovery procedure |
| Custom roles can exceed the grantor | Delegation can become privilege escalation | rank/grantability test, forbidden self-elevation, audit proof |

## 13. Verification matrix

For each action below, run allow and deny cases for Organization Owner, Organization Admin, unassigned Organization Member, Build Owner, Build Admin, Build Member in-project, Build Member out-of-project, external client with grant, external client without/expired grant, and cross-tenant actor:

- enter Build and load navigation;
- list/search projects and tickets;
- open full ticket and split pane;
- create/update/assign/transition/archive/restore a ticket;
- manage project settings and membership;
- view/manage workflows, approvals, releases, risks, incidents, QA, forms, automations, integrations, budgets, and reports;
- view CRM, time, and accounting projections;
- invite/change/revoke Build standing;
- create/rotate/revoke a client grant;
- view/comment/upload/approve as a client;
- run AI read, proposal, confirmed mutation, denied mutation, and stale proposal;
- start and resume import/export/background work after access changes.

Evidence levels are recorded separately:

1. source and ADR;
2. static catalog/route/dependency gates;
3. focused service/controller tests;
4. target-database migration, RLS, concurrency, and cache tests;
5. browser action, persistence, network, and console evidence;
6. deployed multi-replica revocation, worker, alert, and recovery evidence.

Release requires every applicable level. A passing lower level does not imply a higher one.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Bind every internal route to active organization membership, enabled Build entitlement, an effective module standing, operation permission, canonical project/record reachability, and field policy; distinguish safe 403 from non-disclosing 404.
- [ ] Resolve Org Owner as effective Build Owner and Org Admin as effective Build Admin for enabled Build; require a positive auditable assignment for Org Members and reject project membership without Build standing.
- [ ] Reconcile seeded Owner/Admin/Member bundles with the current permission catalog and migrated organizations; test productive Build Member work, Viewer restrictions, Owner-only transfers, and grantability/self-elevation limits.
- [ ] Enforce same-tenant active-membership constraints, exactly-one-owner transfer rules, typed portal grants, invitation acceptance binding, and permission/grant revision bumps in transactions.
- [ ] Implement versioned Build member, invitation, standing, ownership transfer, project access, grant, rotation, and safe access-explanation APIs with strict schemas, idempotency, audit, and outbox emission.
- [ ] Decide whether a typed Approval can own client-access requests before introducing a new table; a request decision must lead to separate grant preview/confirmation, never silently issue access.
- [ ] Build the member-management page with distinct org/Build standing, assignment origin, project coverage, status, audit link, filters, and gained/lost capability review; make denied, changed-access, and expired-link states actionable without disclosing hidden records.
- [ ] Verify client magic-link hashing, audience binding, one-time exchange, narrow portal session, exact surface/action/field projection, signed-file recheck, rotation, and immediate revocation.
- [ ] Give AI, automation, import, integration, export, and jobs named bounded principals and execution-time authorization; require human confirmation for access, publication, finance, export, destructive, and bulk effects.
- [ ] Invalidate permission, project, and grant caches plus private search/notification/job effects after a revocation; measure propagation across replicas and fail closed on uncertain privileged reads.
- [ ] Record the named access, ownership, project, grant, visibility, export, restore, retention, and AI audit events without tokens or sensitive content.
- [ ] Complete the verification matrix with source, static, focused, target-database/RLS/concurrency, browser, and deployed multi-replica evidence; leave each historical risk open until its stated closure proof exists.
