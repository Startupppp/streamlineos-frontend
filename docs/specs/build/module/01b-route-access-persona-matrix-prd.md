# BLD-01B — Route, Action, Data Scope, and Persona Matrix

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Purpose

This matrix binds every BLD-01A page family to its minimum read gate, separate
action gates, data-scope behavior, and intended personas. A page read key never
authorizes a mutation. Hiding a control never substitutes for backend and
data-layer authorization.

## Persona Codes

- **IC:** internal contributor.
- **PL:** project lead or delivery manager.
- **PM:** product manager.
- **PMO:** program/portfolio/workspace leader.
- **BA:** Build administrator.
- **FIN:** finance-authorized actor.
- **GUEST:** restricted internal/guest member.
- **CLIENT:** external portal identity.

All internal personas also require an active organization membership and Build
entitlement where applicable. CLIENT never inherits employee permissions.

## Organization and Workspace Access

| Stable page IDs | Minimum read gate | Action gates | Data scope and intended personas |
|---|---|---|---|
| `PG-ORG-001` | `build:view` | create `build:create`; edit/archive applicable project keys | Accessible project rows only; IC, PL, PM, PMO, BA |
| `PG-ORG-002`, `013`, `PG-ADD-002` | `build:members:view` | `build:members:manage`; last-owner and no-self-escalation | Explain effective organization/workspace/project scope; BA, scoped PL/PMO |
| `PG-ORG-003`, `PG-WS-002` | `build:tickets:view` | ticket action-specific keys | DataScope and explicit workspace narrowing; IC, PL, PM, PMO, BA, restricted GUEST |
| `PG-ORG-004` | `build:approvals:view` | request/decide/delegate/manage keys | Mine/requested/delegated plus authorized target records; IC through BA |
| `PG-ORG-005`, `PG-ADD-003` | `build:clientvisibility:manage` | grant/invite/revoke require same or stronger policy | Explicit customer/contact/project grant scope; PL, PM, BA |
| `PG-ORG-006` | `build:view` with panel-level gates | each quick action uses its own create/manage key | Panels omit inaccessible domains and counts; all internal Build personas |
| `PG-ORG-007` | `build:customers:view` and required CRM source read | `build:customers:manage`; CRM writes use CRM keys | Only linked CRM records actor may open; PL, PM, PMO, BA |
| `PG-ORG-008` | actor-owned draft read | resume through target action key; discard own draft | Actor-only, organization/source scoped; IC through BA |
| `PG-ORG-009`, `010`, `PG-ADD-006` | `build:goals:view` plus Goals audience | `build:goals:manage` and Goals owner checks | Goal audience and linked-scope intersection; PM, PL, PMO, BA, permitted IC |
| `PG-ORG-011` | recipient-scoped Build inbox read | source action key for resolve/approve/retry | Token-derived recipient and source ACL; all internal Build personas |
| `PG-ORG-012`, `PG-PROD-001`–`006`, `PG-ADD-005` | `build:managed-products:view` plus row-specific source gates | create/update/delete managed-product keys; roadmap/goals/feedback use their owners | Managed-product membership/audience and linked-project intersection; PM, PMO, BA, permitted PL/IC |
| `PG-ORG-014`, `PG-WS-004` | `build:tickets:view` | ticket action-specific keys | Actor derived from token; workspace/project only narrows; IC through BA |
| `PG-ORG-015`, `PG-WS-001`, `005`, `PG-ADD-004` | `build:workspaces:view` | workspace create/update/delete/member keys | Workspace membership for scoped pages; PMO, BA, workspace members |
| `PG-ORG-016`, `017` | `build:portfolios:view` | `build:portfolios:manage` | Only contributing records actor may read; PMO, BA, permitted PM/PL |
| `PG-ORG-018` | `build:programs:view` | `build:programs:manage` | Program and child record intersection; PMO, BA, permitted PM/PL |
| `PG-ORG-019`, `PG-WS-007`, `PG-PROD-006` | `build:roadmap:view` | `build:roadmap:manage` and publication permission | Product/workspace/record scope; PM, PMO, BA, permitted PL/IC |
| `PG-ORG-020` | `build:manage` plus integration source access | connection/configuration/secret actions rechecked server-side | Connection owner, repository grant, organization/project scope; BA, scoped PL |
| `PG-ORG-021`, `022`, `PG-WS-008` | `build:teams:view` | team create/update/delete/manage keys | Team membership plus accessible linked work; IC, PL, PMO, BA |
| `PG-ORG-023` | `build:view` for visible templates | template manage/apply and target mutation keys | Visibility plus target compatibility/access; IC through BA |
| `PG-WS-003`, `PG-PROD-003` | `build:goals:view` plus Goals audience | `build:goals:manage` | Workspace/product scope only narrows; permitted IC, PL, PM, PMO, BA |
| `PG-WS-006` | `build:managed-products:view` | managed-product create/link/manage keys | Workspace membership and product audience; PM, PMO, BA |

## Project Delivery Access

| Stable page IDs | Minimum read gate | Action gates | Data scope and intended personas |
|---|---|---|---|
| `PG-PRJ-001` | `build:view` plus project access | each panel/action owner | Project members, scoped managers, permitted GUEST |
| `PG-PRJ-006`, `008`, `012`, `013`, `015`, `024`, `028`, `029`, `036`–`039`, `041`, `047` | `build:tickets:view` plus project access | ticket create/update/assign/delete; canonical Cycle manage; bulk checks every row | Project/record DataScope; IC, PL, BA, permitted PM/GUEST |
| `PG-PRJ-027`, `032` | `build:view` plus project access | create/edit/publish requires project update and client-visibility policy | Project scope; client publication separately authorized; IC read, PL/BA write |
| `PG-PRJ-040` | `build:updates:view` | `build:updates:manage`; publication also client-visibility policy | Internal/audience/client projection; IC read, PL/PM/BA write |
| `PG-PRJ-018` | `build:files:view` plus Files ACL | `build:files:manage` and source file policy | Project relation never bypasses file ACL; permitted project actors |
| `PG-PRJ-025`, `026` | `build:meetings:view` plus Meetings ACL | `build:meetings:manage` and source event policy | Project relation and attendee/audience intersection |
| `PG-PRJ-010` | project access plus Chat channel ACL | Chat-owned send/manage keys | Channel membership is authoritative; permitted project actors |
| `PG-PRJ-044`, `045` | project access plus Knowledge page ACL | KB-owned create/edit/share/archive keys | Project relation and KB audience intersection |
| `PG-PRJ-043` | project access plus whiteboard read policy | `build:whiteboards:manage` for edit/share/archive | Board participant/project access; public share is separate |
| `PG-PRJ-019`, `020`, `023` | `build:forms:view` | `build:forms:manage`; triage also ticket-create/update | Project/form match; PII projection and submission assignment scope |
| `PG-PRJ-016`, `017` | Feedbucket module plus widget/submission read | Feedbucket manage/link plus ticket action key | Project widget/submission match; signed-media ACL |

## Project Control Access

| Stable page IDs | Minimum read gate | Action gates | Data scope and intended personas |
|---|---|---|---|
| `PG-PRJ-030`, `031` | `build:qa:view` | `build:qa:manage`; execution `build:qa:execute`; BUG action uses ticket key | Project/suite/run/case match; QA, PL, BA |
| `PG-PRJ-004` | `build:approvals:view` | approval request/decide/delegate/manage keys | Project and target-record access; permitted IC through BA |
| `PG-PRJ-009` | `build:changerequests:view` | create/manage keys and approval policy | Project/client grant and affected-record access |
| `PG-PRJ-021`, `022` | `build:incidents:view` | `build:incidents:manage` | Project/incident match; sensitive communication projection |
| `PG-PRJ-034` | `build:risks:view` | `build:risks:manage` | Project and assigned data scope; PL, PMO, BA, permitted IC |
| `PG-PRJ-014` | `build:decisions:view` | `build:decisions:manage` | Project/audience/evidence access; permitted project actors |
| `PG-PRJ-003`, `033` | `build:view` plus every source metric's read access | export requires explicit report/export policy | Aggregates exclude inaccessible records; PL, PM, PMO, BA |
| `PG-PRJ-007` | `build:manage` plus Accounting/Timesheets source access | budget/forecast/lock/export finance policy | Sensitive cost/rate fields separately projected; FIN, PL, BA |
| `PG-PRJ-011` | `build:clientvisibility:manage` | publish/grant/link/revoke rechecked | Employee preview only; selected external grant projection |
| `PG-PRJ-002` | `build:ai:use` plus source record reads | proposal action key, policy, credits, version | Context is intersection of source ACLs; deterministic fallback |

## Final Project Settings Access

| Stable page IDs | Minimum route gate | Section action gate and scope |
|---|---|---|
| `PG-PRJ-035` | `build:update` | General project fields only; project and DataScope match |
| `PG-ADD-001` | `build:view` | Settings landing is navigation only; each section enforces its own key |
| `PG-ADD-007` | `build:members:view` | `build:members:manage`; last-owner/no-self-escalation |
| `PG-PRJ-046`, `PG-ADD-008` | `build:workflow:view` | `build:workflow:manage`; project workflow only |
| `PG-ADD-009` | `build:view` | shared/default administration requires `build:update`; private views remain actor owned |
| `PG-ADD-010` | `build:update` | field/label changes require dependency and data-scope checks |
| `PG-ADD-011` | canonical `build:cycles:view` | canonical `build:cycles:manage`; migrate current Sprint keys without permanent aliases |
| `PG-PRJ-005`, `PG-ADD-012` | `build:manage` | automation configure/dry-run/enable; run actions separately authorized |
| `PG-ADD-013` | `build:manage` plus integration access | connection and mapping actions; provider grant rechecked |
| `PG-PRJ-042`, `PG-ADD-014` | `build:manage` | webhook create/test/rotate/replay/disable separately audited |
| `PG-ADD-015` | `build:clientvisibility:manage` | explicit client grant/publication policy |
| `PG-ADD-016` | `build:ai:use` for readable policy | policy manage requires `build:manage` and billing authority where applicable |
| `PG-ADD-017` | `build:manage` | credential issue/rotate/revoke; secret shown once |
| `PG-ADD-018` | `build:manage` | archive/restore; transfer and purge use stronger lifecycle policy |

`build:cycles:*` is the normative target permission family. Existing
`build:sprints:*` assignments must be migrated atomically with role templates,
custom roles, route gates, backend decorators, and audit events.

## Portal and Public Access

| Stable page IDs | Identity and read authority | Action authority |
|---|---|---|
| `PG-PORTAL-001`, `002` | Employee JWT, `build:portal:view`, project access, selected grant | Preview only; editing opens internal source with its normal key |
| `PG-PORTAL-003`, `004` | Portal JWT plus active explicit grant and field/resource allowlist | Only grant-enabled feedback/change actions; actor from portal token |
| `PG-PORTAL-005` | Single-use unexpired invitation for intended recipient and grant | Atomic consume/exchange; replay denied |
| `PG-PUBLIC-001` | Opaque hashed unexpired board share and field allowlist | No mutation |
| `PG-PUBLIC-002` | Opaque published form token and immutable publish version | Idempotent rate-limited submit only |
| `PG-PUBLIC-003` | Transitional raw-project route | No release until replaced by `PG-PUBLIC-002` |
| `PG-PUBLIC-004` | Opaque roadmap share version, never raw organization ID authority | No mutation; publication owner controls revoke |

## Acceptance

- [ ] **BLD-01B-001** every BLD-01A retained/final page ID appears exactly once
  in this matrix or an explicitly listed shared row.
- [ ] **BLD-01B-002** every read and action key exists verbatim in the backend
  permission catalog and role/custom-role migration.
- [ ] **BLD-01B-003** frontend route gate, navigation visibility, backend
  decorator, service/data-layer scope, and e2e expectation agree.
- [ ] **BLD-01B-004** route reads use the least read key; mutation-only keys do
  not unnecessarily hide readable pages.
- [ ] **BLD-01B-005** owner/admin, contributor, restricted member, guest,
  revoked member, and external client allow/deny tests cover every applicable
  family.
- [ ] **BLD-01B-006** optional filters only narrow scope; actor identity comes
  from the token and wrong-parent/cross-tenant IDs fail without disclosure.
- [ ] **BLD-01B-007** access revocation clears route, server/client cache,
  realtime subscription, portal grant, and outstanding proposal visibility.
