# Milestone 1 — Projects journeys, RBAC, API, feature gaps

> Per-type approvals: `QA-M1-J-030..037`. Edges: `J-026..029` (hardened AC). Idempotency: `A-007/A-008`.

| ID | Module | Route / Area | Type | Priority | Status | Est | Role | Acceptance criteria | StreamlineOS |
|----|--------|--------------|------|----------|--------|-----|------|---------------------|--------------|
| QA-M1-A-001 | Projects | `projects controller e2e` | api | P0 | todo | L | n/a | ``projects.controller.e2e-spec`` / scope e2e green or gaps filed. | QA-79 |
| QA-M1-A-002 | Projects | `approvals API contract` | api | P0 | todo | L | n/a | Approvals create/decide endpoints: auth, validation, tenant scope. | QA-80 |
| QA-M1-A-003 | Projects | `client portal API contract` | api | P0 | todo | L | n/a | Portal endpoints: invite, list, approve CR; no internal fields. | QA-81 |
| QA-M1-A-004 | Projects | `execution tickets pagination` | api | P1 | todo | M | n/a | Ticket list paginated ≤100; no unbounded parent-detail embed. | QA-82 |
| QA-M1-A-005 | Projects | `teams members API` | api | P1 | todo | M | n/a | Teams/members CRUD tenant-scoped + permissioned. | QA-83 |
| QA-M1-A-006 | Projects | `comment drafts API` | api | P2 | todo | M | n/a | Drafts autosave endpoints tenant + user scoped. | QA-84 |
| QA-M1-A-007 | Projects | `ticket create idempotency` | api | P0 | todo | L | n/a | POST create ticket twice with same Idempotency-Key (or product equivalent) → one ticket; mismatch body → 409; missing key may create two (document). Capture status codes. | QA-247 |
| QA-M1-A-008 | Projects | `approval decision idempotency` | api | P0 | todo | L | n/a | POST approve/reject twice with same Idempotency-Key → one transition; second replay returns same result; double-click without key does not corrupt state (or 409). | QA-249 |
| QA-M1-G-001 | Projects | `Linear parity triage` | feature-gap | P2 | todo | M | PM | Document triage gaps vs Linear; ticket only with user+outcome+AC. | QA-85 |
| QA-M1-G-002 | Projects | `Jira release/versioning` | feature-gap | P3 | todo | M | PM | Compare releases/versions; file validated gaps only. | QA-86 |
| QA-M1-G-003 | Projects | `Asana milestones UX` | feature-gap | P3 | todo | M | PM | Milestone UX competitive notes → tickets with AC. | QA-87 |
| QA-M1-G-004 | Projects | `ClickUp automations depth` | feature-gap | P3 | todo | M | admin | Automation depth gaps documented. | QA-88 |
| QA-M1-G-005 | Projects | `Agency client portal parity` | feature-gap | P1 | todo | L | PM | Portal vs agency tools: approvals, files, CR — file gaps with AC. | QA-89 |
| QA-M1-G-006 | Projects | `approval engine completeness` | feature-gap | P1 | todo | L | PM | Research complete when types mapped to QA-M1-J-030..037; any unsupported type files a feature-gap product ticket (ID linked) — do not mark done by soft-close alone. | QA-90 |
| QA-M1-J-001 | Projects | `create project from template` | journey | P0 | todo | XL | owner | Owner creates project from template; members PM+contributor added; project appears for both. | QA-91 |
| QA-M1-J-002 | Projects | `milestone + sprint + ticket` | journey | P0 | todo | XL | PM | PM creates milestone, sprint/cycle, ticket; contributor can update ticket fields. | QA-92 |
| QA-M1-J-003 | Projects | `ticket lifecycle transitions` | journey | P0 | todo | XL | contributor | Status transitions follow workflow; invalid transition rejected with clear error. | QA-93 |
| QA-M1-J-004 | Projects | `inline edit board/list` | journey | P0 | todo | XL | contributor | Assignee/status/priority/labels/dates edit inline; optimistic UI; survives refresh. | QA-94 |
| QA-M1-J-005 | Projects | `comments + attachments` | journey | P1 | todo | L | contributor | Comment create/edit/delete; attachment upload; names shown not raw IDs. | QA-95 |
| QA-M1-J-006 | Projects | `approval submit approve` | journey | P0 | todo | XL | approver | Contributor submits approval; approver approves; entity reflects decision; Inbox notified if product emits. | QA-96 |
| QA-M1-J-007 | Projects | `approval request changes` | journey | P0 | todo | XL | approver | Approver requests changes; requester can resubmit; history retained. | QA-97 |
| QA-M1-J-008 | Projects | `approval reject cancel` | journey | P1 | todo | L | approver | Reject and cancel paths work; cancelled item not re-approvable without new request. | QA-98 |
| QA-M1-J-009 | Projects | `approval edge: self/inactive` | journey | P0 | todo | XL | PM | Requester=approver, inactive approver, and entity-changed-during-approval behave per product rules without crash. | QA-99 |
| QA-M1-J-010 | Projects | `approval multi-level/delegate` | journey | P1 | todo | L | approver | Multi-level OR delegation path: configure → second approver decides; if product has neither, FAIL and file DEF-* + product ticket (no soft-close). | QA-100 |
| QA-M1-J-011 | Projects | `change request client flow` | journey | P0 | todo | XL | client | Client-visible CR created; client approves/rejects in portal; internal notes never visible. | QA-101 |
| QA-M1-J-012 | Projects | `client portal invite revoke` | journey | P0 | todo | XL | PM | Invite, access, expiry/revoke; revoked client gets 403 and no data. | QA-102 |
| QA-M1-J-013 | Projects | `client portal leak check` | journey | P0 | todo | XL | client | Client cannot open internal tickets/chat/budget/settings via URL or API. | QA-103 |
| QA-M1-J-014 | Projects | `QA run + bug + release` | journey | P1 | todo | L | PM | Create QA run, log bug, create release; permissions gate manage actions. | QA-104 |
| QA-M1-J-015 | Projects | `incident + risk + decision` | journey | P2 | todo | M | PM | CRUD for incidents/risks/decisions; detail pages load; delete confirms. | QA-105 |
| QA-M1-J-016 | Projects | `forms intake feedbucket` | journey | P1 | todo | L | PM | Form create/submit; intake visible; feedbucket submission detail works. | QA-106 |
| QA-M1-J-017 | Projects | `automations + webhooks` | journey | P1 | todo | L | admin | Create/toggle automation; webhook CRUD; failure surfaces; permission gated. | QA-107 |
| QA-M1-J-018 | Projects | `teams + members` | journey | P1 | todo | L | PM | Project teams/members add/remove; lastSeen/teams display names; denied user cannot manage. | QA-108 |
| QA-M1-J-019 | Projects | `inbox deep link` | journey | P0 | todo | XL | contributor | Notification opens correct ticket preview; inaccessible entity does not leak. | QA-109 |
| QA-M1-J-020 | Projects | `drafts autosave` | journey | P2 | todo | M | contributor | Comment draft autosaves; clear-all works; list shows ticket context. | QA-110 |
| QA-M1-J-021 | Projects | `goals portfolios roadmap` | journey | P2 | todo | M | PM | Goal/portfolio CRUD + roadmap view; empty/error states filled. | QA-111 |
| QA-M1-J-022 | Projects | `reports analytics budget` | journey | P2 | todo | M | PM | Reports/analytics/budget load under realistic data; no 500; export if present. | QA-112 |
| QA-M1-J-023 | Projects | `project chat embed` | journey | P1 | todo | L | contributor | Project chat tab messaging works (not dead redirect); membership enforced. | QA-113 |
| QA-M1-J-024 | Projects | `wiki in project` | journey | P2 | todo | M | contributor | Wiki list/detail in project scope; private pages not leaked. | QA-114 |
| QA-M1-J-025 | Projects | `first-slice e2e from spec` | journey | P0 | todo | XL | multi | Spec First execution slice steps 1–7 pass with evidence for Org Alpha + Beta denial. | QA-115 |
| QA-M1-J-026 | Projects | `approval escalation` | journey | P1 | todo | L | approver | With SLA/escalation configured: after breach, escalated approver can decide and original cannot (or state shows escalated). If product has no escalation: FAIL + file feature-gap ticket with evidence of missing config/API — not done until gap ticket exists. | QA-116 |
| QA-M1-J-027 | Projects | `approval reminders` | journey | P2 | todo | M | approver | Pending approval past reminder threshold: exactly one reminder notification per window; Inbox deep link opens approval; no duplicate spam rows. Capture notification ids as evidence. | QA-117 |
| QA-M1-J-028 | Projects | `approval sequential routing` | journey | P1 | todo | L | approver | Two-step sequential chain: step-2 user API decide returns 403/409 before step-1; after step-1 approve, step-2 can decide; final entity state = approved only after last step. | QA-118 |
| QA-M1-J-029 | Projects | `approval conditional routing` | journey | P2 | todo | M | PM | Conditional rule (e.g. amount/type) selects chain A vs B for two fixtures; wrong chain cannot decide. If no conditional engine: FAIL + feature-gap ticket with missing rule UI/API cited. | QA-119 |
| QA-M1-J-030 | Projects | `approval type: task` | journey | P0 | todo | XL | approver | Ticket/task approval: submit → approve → ticket reflects approved; reject path leaves ticket not-approved; Inbox item for approver. | QA-248 |
| QA-M1-J-031 | Projects | `approval type: milestone` | journey | P1 | todo | L | approver | Milestone approval: submit on milestone → approve/reject; milestone status/fields match decision; denied role cannot decide. | QA-250 |
| QA-M1-J-032 | Projects | `approval type: budget` | journey | P1 | todo | L | approver | Budget approval: submit budget figure → approve updates budget state; reject preserves prior; money shown as cents/formatted currency not raw float bugs. | QA-251 |
| QA-M1-J-033 | Projects | `approval type: release` | journey | P1 | todo | L | approver | Release approval: submit release → approve gates ship fields; reject blocks; permission `projects` release manage respected. | QA-252 |
| QA-M1-J-034 | Projects | `approval type: change request` | journey | P0 | todo | L | approver | Change-request approval (internal): CR submit → approver decide; client-visible fields unchanged unless CR flow; history retained. | QA-253 |
| QA-M1-J-035 | Projects | `approval type: client` | journey | P0 | todo | XL | client | Client approval type: client portal actor approves/rejects; internal notes never in client payload (HAR check). | QA-254 |
| QA-M1-J-036 | Projects | `approval type: document` | journey | P1 | todo | L | approver | Document approval: attach/doc entity submit → approve/reject; revoked access cannot open doc after deny. | QA-255 |
| QA-M1-J-037 | Projects | `approval type: timesheet` | journey | P1 | todo | L | approver | Timesheet approval: period/entry submit → approve/reject; payroll/export not unlocked on reject; approver≠submitter happy path. | QA-256 |
| QA-M1-J-038 | Projects | `client portal file exchange matrix` | journey | P1 | todo | L | client | Numbered cases: client upload allowed types; blocked MIME rejected; expiry/revoke removes download; multi-project client sees only invited projects' files. | QA-257 |
| QA-M1-R-001 | Projects | `projects:view matrix` | rbac | P0 | todo | L | denied | Denied user: nav hidden; direct URL denied; GET list/detail 403. | QA-120 |
| QA-M1-R-002 | Projects | `projects:create/update/delete` | rbac | P0 | todo | L | contributor | Contributor cannot create/delete project if ungated; API 403 matches UI. | QA-121 |
| QA-M1-R-003 | Projects | `ticket mutations permissions` | rbac | P0 | todo | L | denied | Denied cannot PATCH ticket; cross-project ticket id 403/404. | QA-122 |
| QA-M1-R-004 | Projects | `approvals permission keys` | rbac | P0 | todo | L | contributor | Approve/reject only for roles with approve permission; UI+API agree. | QA-123 |
| QA-M1-R-005 | Projects | `client portal scope` | rbac | P0 | todo | L | client | Client role limited to portal endpoints; internal endpoints deny. | QA-124 |
| QA-M1-R-006 | Projects | `releases manage gate` | rbac | P1 | todo | M | contributor | Release manage actions gated; matches backend keys. | QA-125 |
| QA-M1-R-007 | Projects | `automations/webhooks manage` | rbac | P1 | todo | M | contributor | Manage endpoints 403 for contributor without manage. | QA-126 |
| QA-M1-R-008 | Projects | `teams permissions` | rbac | P1 | todo | M | denied | projects:teams:* allow/deny verified UI+API. | QA-127 |
| QA-M1-R-009 | Projects | `AI ticket draft gate` | rbac | P2 | todo | M | contributor | projects:ai:use gated; 402/403 surfaces via AiActionsMenu. | QA-128 |
| QA-M1-R-010 | Projects | `cross-tenant Org Beta ids` | rbac | P0 | todo | L | owner | Org Alpha user cannot read/write Org Beta project/ticket/approval/portal ids. | QA-129 |
| QA-M1-R-011 | Projects | `data scope own/team/all` | rbac | P1 | todo | M | contributor | Where scope applies, own-only user cannot list others tickets. | QA-130 |
| QA-M1-R-012 | Projects | `module disabled PROJECTS` | rbac | P0 | todo | L | member | With PROJECTS module off, surfaces redirect/lock and APIs ModuleGuard deny. | QA-131 |
| QA-M1-X-001 | Projects | `automate first-slice journey` | automation | P1 | todo | XL | n/a | After J-025 passes, add browser/API regression for first slice. | QA-132 |
| QA-M1-X-002 | Projects | `automate cross-tenant deny` | automation | P0 | todo | XL | n/a | API test Alpha→Beta denial for project+ticket+approval. | QA-133 |


**Count:** 66 tickets (66 active · 0 cancelled · 0 deferred) · est **211sp / 290h** · done: 0 · % complete: 0%
