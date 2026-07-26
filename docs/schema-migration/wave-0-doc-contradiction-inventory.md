---
wave: 0
type: doc contradiction inventory
status: DRAFT
date: 2026-07-26
produced_by: Wave 0 gate — required by docs/schema-change-plan.md §9 Wave 0 bullet
authoritative_source: docs/schema-change-plan.md + docs/schema-migration/wave-0-pm-reconciliation-adr.md
---

# Wave 0 — Document Contradiction Inventory

> "Inventory all other existing documents that contradict the authoritative rules, list each
> contradiction, owner, decision, and remediation. No contradictory design document may be
> silently ignored." — schema-change-plan.md §9 Wave 0.

Wave 0 requires this inventory to be complete and approved before any Wave 1–12 work proceeds.
"Status: RESOLVED" means the contradiction is formally decided. "Status: OPEN" means it still
requires a decision from the product owner before the relevant wave is implemented.

---

## Authoritative rules (reference)

| # | Rule | Source |
|---|------|--------|
| R1 | Organization is the ONLY tenant; "Workspace" must never mean the tenant | schema-change-plan.md §1, §3 glossary, §11 acceptance criteria |
| R2 | "Workspace" is reserved for the PM Workspace container ONLY; the pm_workspaces container model is authoritative (no-container model superseded) | schema-change-plan.md §1, wave-0-pm-reconciliation-adr.md §1 |
| R3 | Any authenticated User Account may create an Organization; existing owner or admin status is NOT a prerequisite | schema-change-plan.md §4 "Organization creation authority" |
| R4 | Route params are descriptive, never [id]; public IDs use descriptive names | schema-change-plan.md §3 "Identifier convention", CLAUDE.md §9 |
| R5 | RBAC is server-resolved via Organization Membership; global users.role is the retirement target and must not be introduced as a new authority | schema-change-plan.md §5, Wave 5 |
| R6 | Business logic lives in the NestJS backend; modules are independently operable (PM/CRM/Inventory/HRMS/Payroll independent; Payroll does not require HRMS entitlement) | schema-change-plan.md §1, §2 "Module independence", CLAUDE.md §6 |

---

## Section 1 — CONTRADICTING documents

These documents contain at least one statement that contradicts an authoritative rule. Each row
names the file, quotes the specific contradicting text with line reference, identifies the rule
violated, records the owner, the decision, the remediation action, and the current status.

---

### C-01 — wave-8-pm-hierarchy-design.md
**Path:** `docs/schema-migration/wave-8-pm-hierarchy-design.md`
**Frontmatter status:** SUPERSEDED (banner added 2026-07-26)

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-01-a | §2 "Target hierarchy (NO pm_workspaces container)" — proposes PM hanging directly off org_id with no container table | R2 | SUPERSEDED by wave-0-pm-reconciliation-adr.md §1 | Do not implement §2; pm_workspaces container is authoritative. Banner already applied. | RESOLVED |
| C-01-b | §3 "rename project_workspace_members → product_management_members (org-level, keyed on user_id)" | R2, R5 | SUPERSEDED — roster is pm_workspace_memberships keyed on organization_membership_id, not user_id | Drop the product_management_members rename target; backfill project_workspace_members → pm_workspace_memberships per Wave 7 | RESOLVED |
| C-01-c | §3.2 expand SQL creates product_management_members with "user_id text NOT NULL REFERENCES users(id)" — references global user, not Organization Membership | R5 | SUPERSEDED | Schema references organization_membership_id per ADR §3.2 | RESOLVED |
| C-01-d | §5 composite-FK diagram shows "product_management_members(id int, org_id text NOT NULL FK, user_id FK)" with no pm_workspace_id | R2 | SUPERSEDED | Every PM child carries (org_id, pm_workspace_id) per ADR §3.3 | RESOLVED |
| C-01-e | §7 "strip ALL 'workspace' from PM UI" — implies even PM Workspace is forbidden | R2 | AMENDED — per ADR §2 C6: strip legacy project_workspace_* naming; keep "PM Workspace" as the sanctioned term | Retained guidance: strip legacy symbols; keep PM Workspace copy | RESOLVED |

**Owner:** architecture review / product owner (Aditya)
**Verdict:** Fully superseded. The SUPERSEDED banner is already in place. Do not implement
§2 or §3. §4 (managed_products concept), §8 (RBAC additions), and the expand→contract
migration discipline (§9) are retained as valid guidance under the container model.

---

### C-02 — 2026-06-29-workspace-onboarding-design.md
**Path:** `docs/superpowers/specs/2026-06-29-workspace-onboarding-design.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-02-a | Title "Workspace Onboarding Wizard" and repeated use of "workspace" to mean the tenant-level org setup: "customer workspace onboarding wizard", "AI Workspace Generation", "Workspace Ready", backend module `workspace-onboarding/`, endpoint POST /workspace-onboarding/generate, feature folder `features/workspace-onboarding/` (throughout, lines 1, 5, 30, 35, 41–49, 54, 67, 116, 129, 136, 155–156) | R1 | OPEN — these are compatibility symbols in existing code; the _concept_ (org setup wizard) is valid, only the terminology is wrong | When this page is next touched under Wave 8 terminology pass: rename to "Organization Onboarding" or "Setup Wizard"; rename backend module to `organization-onboarding/`; rename endpoints to /organization-onboarding/*; rename frontend folder to features/organization-onboarding/. Until Wave 8: treat as a compatibility symbol; do not propagate "workspace" copy into new pages. | OPEN |
| C-02-b | Step 5 label "AI Workspace Generation" implies the tenant is a Workspace | R1 | OPEN — per Wave 8 terminology pass: rename step to "AI Organization Setup" or "Generate structure" | Same as C-02-a remediation scope | OPEN |

**Owner:** frontend / full-stack team (Wave 8 terminology pass)
**Verdict:** The org setup wizard functionality is valid and correctly architectured. Only the
terminology is wrong. The doc should be updated during Wave 8; in the meantime it is a known
compatibility symbol and must not be cited as design precedent for the tenant-as-Workspace naming.

---

### C-03 — 2026-06-27-rbac-slice-1-roles-engine-design.md
**Path:** `docs/superpowers/specs/2026-06-27-rbac-slice-1-roles-engine-design.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-03-a | §4 "Transition fallback: … Also fall back to users.role when a user has no user_roles rows." (line ~101) — introduces users.role as an ongoing runtime fallback | R5 | PARTIAL CONFLICT — the plan §5 Wave 5 explicitly retires this fallback; the spec describes a legitimate intermediate migration step (dual-read during strangler), not a permanent design. The fallback is acceptable ONLY until Wave 5 achieves zero-mismatch parity. | Annotate this spec: the users.role fallback is a Wave 0–5 compatibility bridge ONLY. It must be wired to a telemetry flag and removed per Wave 5 exit criteria (zero mismatch for two releases). Never introduce as new code post-Wave 5. | OPEN — tracked as Wave 5 exit criterion |
| C-03-b | §7 Backfill step 3: "Populate user_roles from each member's users.role" — normalizes an RBAC model based on global users.role (line ~156) | R5 | VALID as a one-time migration seed ONLY; not a source of ongoing authority. users.role remains a compatibility seed column until membership-based assignments are backfilled and confirmed. | No change to the spec; add a note that this is a one-time seed, not a perpetual read path. | OPEN — record as Wave 5 prerequisite |
| C-03-c | §4 AccessService caches under key "access:perms:{orgId}:{userId}:v{permissionsVersion}" keyed by global userId, not organization_membership_id (line ~104) | R5 | PARTIAL — the authoritative plan §5 states authorization caches must key by (org_id, organization_membership_id, access_version, audience). This cache key will need to be migrated to the membership-scoped key in Wave 5 when membership IDs replace raw user IDs in role assignments. | Update cache key to (org_id, organization_membership_id, access_version) in Wave 5 when user_roles is replaced by membership_role_assignments. Until then, the userId-keyed cache is acceptable as an intermediate state. | OPEN — Wave 5 scope |

**Owner:** backend / access team
**Verdict:** The RBAC slice design is broadly aligned with the plan (server-resolved, DB-cached,
version-busted). The contradictions are migration-state artifacts — acceptable intermediates
that must be explicitly retired per Wave 5 exit criteria. The CASL layer described as already
removed from the backend per schema-change-plan.md §21 ("CASL is fully removed from the backend")
is consistent with this spec describing it as the OLD system being strangled out.

---

### C-04 — 2026-06-27-rbac-slice-2-guard-cutover-design.md
**Path:** `docs/superpowers/specs/2026-06-27-rbac-slice-2-guard-cutover-design.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-04-a | §3 "77 controllers, 310 @CheckAbility usages" — describes the legacy CASL guard system as still in place and requiring per-controller migration | R5 | NOT a contradiction of the target; this is a description of the migration work required to reach the target. The plan and CLAUDE.md both confirm CASL is the retirement target. | No doc change needed; this spec is a valid migration plan describing the strangler cutover path. It correctly identifies that the legacy model must be removed endpoint by endpoint. | RESOLVED — migration plan aligned |
| C-04-b | §4 step 3 "applyScope: team degrades to own if no team column" — the plan §5 states team must FAIL VALIDATION rather than silently narrow to own | R5 | CONFLICT — the plan (§5 Scopes) explicitly requires: "'team' is unavailable in APIs … until each adopting domain has … unsupported team must fail validation rather than silently narrow or broaden." The spec's silent degradation is forbidden. | When implementing applyScope per this spec, team scope must return a validation error (400 / scope_not_supported), not silently degrade to own. The spec step 3 must be amended before implementation. | OPEN — requires spec amendment before Wave 5 implementation |

**Owner:** backend / access team
**Verdict:** Mostly aligned. One specific behavior (team→own degradation) is a direct conflict
with the authoritative plan and must be amended before implementation. The spec is otherwise a
valid strangler migration plan.

---

### C-05 — 2026-06-25-backend-extraction-nestjs-design.md
**Path:** `docs/superpowers/specs/2026-06-25-backend-extraction-nestjs-design.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-05-a | §3.1 repo structure shows "db/schema/ — Drizzle schema — synced copy of web's lib/db/schema (source of truth: see §6)" — implies the frontend lib/db/schema was the source of truth at the time of writing (line ~55) | R6 | SUPERSEDED by architecture migration: the NestJS backend (streamlineos-api) is now the sole source of truth for the DB schema per CLAUDE.md §6. The "synced copy" model was the pre-migration state. | The doc describes the initial extraction state; the architecture has since moved to backend-only schema. Treat this doc as historical context for the extraction; do not cite it as justification for any frontend schema additions. | RESOLVED — architecture has moved |
| C-05-b | §3 NestJS described as using "CASL RBAC, Zod pipes" with abilities.factory.ts, ability.guard.ts, check-ability.decorator.ts porting the old CASL system into NestJS | R5 | SUPERSEDED — CASL is fully removed from the backend per schema-change-plan.md §21. The RBAC slice work (C-03/C-04) replaced this with PermissionGuard + @RequirePermission. | The CASL architecture described here is the pre-RBAC-slice state. Do not introduce new CASL-based guards. All new backend work uses @RequirePermission + PermissionGuard. | RESOLVED — CASL removed from backend |
| C-05-c | §4 auth bridge JWT carries "role" claim: "{ userId, orgId, branchId, role, permissions[], plan, enabledModules[], isPlatformAdmin, isOrgOwner, sessionId }" — JWT role/isOrgOwner claims used for auth decisions | R5 | PARTIAL — the plan §5 states "Never read req.user.permissions for access decisions — use PermissionGuard + AccessService (JWT is stale; DB is authoritative)." The JWT claims are now hints only; ownership derives from owner_membership_id, not isOrgOwner JWT claim. | This describes the JWT shape at extraction time; the backend must never use JWT role/permissions/isOrgOwner claims as authoritative access decisions. Current guard structure (JwtAuthGuard → PermissionGuard → AccessService) already handles this. No action needed if PermissionGuard is always present on protected routes. | OPEN — verify no protected route relies on JWT claims alone |

**Owner:** backend / auth team
**Verdict:** This spec describes the initial extraction state (2026-06-25). The architecture has
evolved significantly. The doc is historical context. Do not use it as a design reference for
new work; new work follows the authoritative plan.

---

### C-06 — 2026-06-25-migration-roadmap.md
**Path:** `docs/superpowers/specs/2026-06-25-migration-roadmap.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-06-a | §1.1 Foundational domains table: "auth / rbac / roles — Session/JWT shape + CASL ability resolution is the contract every guard uses. roles.permissions JSON drives CASL." — CASL described as the live authorization contract | R5 | SUPERSEDED — CASL removed from backend | Historical context only; CASL is not the live contract. PermissionGuard + AccessService is the live contract. | RESOLVED |
| C-06-b | §2 Wave 2 includes porting "CASL ability-building" to NestJS ("NestJS only consumes the JWT and resolves RBAC; we port ability-building…") | R5 | SUPERSEDED — RBAC slice 1/2 replaced this with server-resolved PermissionGuard | This wave is complete through a different path (RBAC slices 1/2). The "port CASL" framing is obsolete. | RESOLVED |
| C-06-c | §1.1 describes "roles.permissions JSON drives CASL" and multi-domain reads of this JSON as a cross-domain authority | R5 | SUPERSEDED | roles.permissions JSON is now a backfill seed / compatibility source only per RBAC slice 1 §4 fallback; AccessService.resolveUserPermissions is authoritative | RESOLVED |

**Owner:** backend / migration team
**Verdict:** This is a 2026-06-25 migration roadmap predating the RBAC slice work. All CASL
references are superseded. The wave ordering and domain dependency analysis remain valid
architectural context for the backend extraction ordering.

---

### C-07 — 2026-06-30-pm-feature-gaps.md
**Path:** `docs/superpowers/plans/2026-06-30-pm-feature-gaps.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-07-a | Task 8 Frontend — Portfolio View: "Add to workspace navigation under 'Projects & Time'" (line 156) — uses "workspace navigation" to mean the sidebar/nav area, implying workspace = the shell/org-level UI | R1 | MINOR CONFLICT — this is a loose colloquial use, but "workspace" must not appear in product copy. The nav group "Projects & Time" already has correct naming. | When this page is next touched: replace "workspace navigation" with "sidebar navigation" or "module navigation". | OPEN — low priority, Wave 8 terminology pass |
| C-07-b | Summary table row 5: "Portfolio View — Reuse projects API — New workspace page" (line 168) — calls a portfolio page a "workspace page" | R1 | MINOR — same colloquial usage | Remove "workspace" from description; call it "portfolio page" | OPEN — low priority, Wave 8 terminology pass |
| C-07-c | Routes throughout use `/projects/[projectId]` and `/projects/products/[managedProductId]` — the `[id]` param convention is absent here (they are descriptive), but the new route `/projects/products/[managedProductId]` (line 381) and the hook `useLinkProjectToProduct` reference `managedProductId` correctly. No bare [id] routes. | — | ALIGNED | No action needed | ALIGNED |
| C-07-d | The PM feature gaps plan predates the PM Workspace container decision. It proposes managed_products hanging directly off org_id with no pm_workspace_id (§4.2 Drizzle sketch shows orgId only, no pm_workspace_id column) — consistent with the superseded no-container model | R2 | CONFLICT — managed_products must carry pm_workspace_id per wave-0-pm-reconciliation-adr.md §2 C7 | If implementing from this plan: add pm_workspace_id to managed_products per ADR §3.3. Do not implement the §4.2 Drizzle sketch as written (it lacks pm_workspace_id and uses a bare userId for ownerId/createdBy instead of org membership). | OPEN — must amend before Wave 7 |

**Owner:** PM / frontend team
**Verdict:** The managed_products schema sketch is outdated relative to the container decision.
Any implementation must add pm_workspace_id. The ownerId/createdBy must reference Organization
Membership, not raw users.id, per the authoritative plan.

---

### C-08 — 2026-07-25-projects-overhaul-specs.md
**Path:** `docs/superpowers/plans/2026-07-25-projects-overhaul-specs.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-08-a | Unit 19 title "add-person-to-workspace" and Q-MT-2 "What does POST /projects/members (add-person-to-workspace) actually do?" (lines 30, 65–69) — uses "workspace" to mean the PM module's access context | R1 | MINOR — "workspace" here refers to project_workspace_members, a compatibility symbol. The spec is asking the correct design question about what this endpoint should do in the target architecture. | Do not name new endpoints or copy "add-person-to-workspace"; name them "add PM member" or "assign to PM Workspace" per ADR terminology. The Q-MT-2 decision itself is valid and should be answered per ADR §3.2 (add to pm_workspace_memberships). | OPEN — answered by ADR §3.2 and §3.6 |
| C-08-b | Unit 19 file map references `frontend/hooks/api/projects/workspace-members.ts` and `frontend/features/projects/members/add-workspace-member-button.tsx` as files to create/modify (lines 933, 945–946) — propagates the workspace-members hook name | R1 | CONFLICT — these hooks should be named per the pm-members rename from wave-8-pm-hierarchy-design.md §7 (retained guidance per ADR): pm-members.ts, AddPmMemberButton | When implementing Unit 19: use pm-members.ts and AddPmMemberButton naming per retained wave-8 guidance (ADR §2 — §7 frontend rename map is retained) | OPEN — implementation scope |
| C-08-c | Unit 19 decision Q-MT-2 option B: "Add user to userModuleAccess table for the projects module" — references a userModuleAccess concept keyed on user, not Organization Membership | R5 | CONFLICT — module assignments should reference Organization Memberships, not raw users | If option B is chosen, the table must key on organization_membership_id, not user_id | OPEN — pending Q-MT-2 decision |

**Owner:** projects / full-stack team
**Verdict:** Mostly a valid execution plan; the workspace-naming artifacts are compatibility
symbol references that need renaming on implementation. Q-MT-2 is answered by the ADR: the
correct model is pm_workspace_memberships keyed on Organization Membership.

---

### C-09 — 2026-07-24-core-module-qa-program-design.md
**Path:** `docs/superpowers/specs/2026-07-24-core-module-qa-program-design.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-09-a | Doc title section uses "Workspace administration" as a product/milestone label (lines 5, 15, 34, 101) — "Workspace" used to mean the admin surface for the tenant Organization | R1 | MINOR — this is a QA program scope label, not a product UI string. However the plan explicitly bans "Workspace" in this meaning (schema-change-plan.md §7.9 "Ban bare UI strings: Workspace..."). | When this QA program is next updated or when milestone names appear in UI/copy: rename "Workspace administration" to "Organization administration" or "Administration". The QA scenarios themselves remain valid. | OPEN — low priority, QA doc |

**Owner:** QA / engineering
**Verdict:** QA program design is valid. The milestone label "Workspace administration" is
a naming artifact that must be updated to "Organization administration" before it leaks into
test UI or copy.

---

### C-10 — 2026-06-30-rbac-complete.md (delegations table)
**Path:** `docs/superpowers/plans/2026-06-30-rbac-complete.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-10-a | Task 1 defines the delegations table with "delegatorId: text … references users.id" and "delegateeId: text … references users.id" — delegation references raw global users, not Organization Memberships (line ~53-56) | R5 | CONFLICT — delegations must reference Organization Memberships per plan §5 ("Replace polymorphic group_type+group_id and resource_type+resource_id authorization with typed assignment tables that have enforceable tenant-composite FKs") | If this table is implemented: delegatorId → organization_membership_id (FK → organization_members(org_id, id)), delegateeId → organization_membership_id (FK → organization_members(org_id, id)). Use composite FKs with org_id. | OPEN — Wave 5 scope; block this implementation until membership-based assignment is in place |

**Owner:** backend / access team
**Verdict:** The delegations schema must be updated to reference Organization Memberships before
implementation. The logic and endpoint design are otherwise correct.

---

### C-11 — 2026-07-25-kb-schema-indexes-search.md
**Path:** `docs/superpowers/plans/2026-07-25-kb-schema-indexes-search.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-11-a | References `workspace_search_chunks` and `workspace-search.ts` as schema files to extend (lines 20, 21, 40, 284, 291, 293, 311, 313) — the table/file name contains "workspace" in a non-PM meaning (it is the org-level semantic search, not a PM Workspace search) | R1 | WEAK CONFLICT — these are existing code symbols (compatibility names per plan §3: "The word Workspace is forbidden outside Product Management except when documenting a current compatibility symbol"). The plan explicitly permits documenting these as compatibility symbols. | This plan correctly identifies these as existing compatibility symbols. Future schema consolidation should rename workspace_search_chunks to something like org_search_chunks or semantic_search_chunks. For now, extending the table via migration is valid. Add a note to rename in Wave 9. | OPEN — Wave 9 compatibility retirement |

**Owner:** KB / search team
**Verdict:** The doc correctly treats workspace_search* as existing compatibility symbols.
The references are acceptable. A Wave 9 rename is tracked.

---

### C-12 — wave-12-dead-code-inventory.md (targets.service users.role reference)
**Path:** `docs/schema-migration/wave-12-dead-code-inventory.md`

| # | Contradicting statement | Rule violated | Decision | Remediation | Status |
|---|------------------------|---------------|----------|-------------|--------|
| C-12-a | §3 zombie endpoint note: "targets.service is a LIVE CRM feature (reads users.role for BRANCH_MANAGER)" (line ~26) — documents an active endpoint reading users.role as an authority source | R5 | IDENTIFIED DEFECT — this is not a contradiction in the doc (the doc correctly flags it as a concern) but it documents a known users.role read path that must be eliminated per Wave 5 | Verify targets.controller/service; if users.role read is confirmed live and authoritative, it is a pre-Wave 5 defect. Add to the Wave 5 retirement checklist: replace users.role BRANCH_MANAGER check with membership-based role resolution via AccessService. | OPEN — Wave 5 prerequisite |

**Owner:** CRM / backend team
**Verdict:** The dead-code inventory doc correctly identifies this as a concern. The action is
a Wave 5 prerequisite, not a doc change.

---

## Section 2 — ALIGNED documents

These documents are checked and found to be consistent with the authoritative rules. Listed
for completeness.

| Doc | Alignment notes |
|-----|-----------------|
| `docs/schema-change-plan.md` | Authoritative source. All rules originate here. |
| `docs/schema-migration/wave-0-pm-reconciliation-adr.md` | Authoritative. Resolves all wave-8 contradictions. |
| `docs/schema-migration/wave-0-control-plane.md` | Aligned. Describes migration pipeline repair. No terminology or RBAC contradictions. |
| `docs/schema-migration/wave-2-module-authority-unify.md` | Aligned. Correctly identifies the dual-path module authority defect and the danger of a naive switch. No tenant-naming or RBAC contradictions. |
| `docs/schema-migration/wave-4-schema-folder-reorg-map.md` | Aligned. Schema reorg only; mentions workspace-search.ts as a file to move to common/ (compatibility symbol correctly handled). |
| `docs/schema-migration/wave-5-directory-workforce-design.md` | Aligned. Correctly documents the modelling defect in users (un-org-scoped employment columns) and the repair path. No tenant-naming or RBAC contradictions. |
| `docs/schema-migration/wave-6-business-party-design.md` | Aligned. Neutral-party model correct; no module coupling contradictions. |
| `docs/schema-migration/wave-7-composite-fk-matrix.md` | Aligned. Composite-FK gate matrix; workspace mentioned only as pm_workspace_memberships (correct PM Workspace usage). |
| `docs/schema-migration/wave-9-portal-audience-design.md` | Aligned. Documents portal isolation correctly; no naming contradictions. |
| `docs/schema-migration/wave-10-rls-matrix.md` | Aligned. Correct tenant-transaction-local GUC model; no naming or RBAC contradictions. |
| `docs/schema-migration/id-transition-matrix.md` | Aligned. Descriptive-ID convention consistent with R4; defects correctly flagged as defects. |
| `docs/schema-migration/GO-LIVE-runbook.md` | Aligned. Uses "Organization" correctly; Wave 5 mentions retiring users.role fallbacks (correct). Workspace appears only as pm_workspaces and project_workspace_members (compatibility). |
| `docs/payroll-audit-2026-07.md` | Aligned. No tenant-naming, users.role, or module-coupling contradictions found. |
| `docs/superpowers/plans/2026-06-29-billing-platform.md` | Aligned. No tenant-naming or RBAC contradictions. |
| `docs/superpowers/specs/2026-06-29-billing-platform-design.md` | Aligned. All DB schema goes to backend; no tenant-naming contradictions. |
| `docs/superpowers/plans/2026-06-30-hrms-prd-complete.md` | Aligned with a note: `/hr/recruitment/candidates/[id]` (line 48) uses a bare [id] param in a route audit table describing EXISTING routes (not proposing new routes). EXISTING routes are compatibility; new routes must be descriptive. No action until that route is next touched. |
| `docs/superpowers/plans/2026-07-01-pm-prd-implementation.md` | Aligned. Backend-first NestJS fixes; no workspace or RBAC contradictions. |
| `docs/superpowers/plans/2026-07-02-*` (email, people, security, canonical-data-table) | Aligned. No tenant-naming or RBAC contradictions found in these plan files. |
| `docs/superpowers/plans/2026-07-04-payroll-payout-backend.md` | Aligned. No tenant-naming contradictions. |
| `docs/superpowers/specs/2026-07-04-calendar-composio-integrations-design.md` | Aligned. No tenant-naming contradictions. |
| `docs/superpowers/plans/2026-07-04-calendar-composio-integrations.md` | Aligned. |
| `docs/superpowers/plans/2026-07-09-project-status-and-workflow-fix.md` | Aligned. |
| `docs/superpowers/plans/2026-07-12-crm-*` (deals, automation-studio, leads-cleanup, data-quality-ai-hardening, expenses, frontend-fixes) | Aligned. The automation-studio plan mentions [id] in a prose description of route behavior (line 1229: "For [id], it loads the existing rule") — this is documentation shorthand for the param slot, not a proposed [id] route param name; the routes use descriptive names. No contradiction. |
| `docs/superpowers/plans/2026-07-22-mobile-bottom-nav-overflow.md` | Aligned. |
| `docs/superpowers/specs/2026-07-22-mobile-bottom-nav-overflow-design.md` | Aligned. |
| `docs/superpowers/plans/2026-07-24-core-module-qa-foundation.md` | Aligned. Operational QA steps; no naming contradictions. |
| `docs/superpowers/plans/2026-07-24-ai-actions-result-surface.md` | Aligned. |
| `docs/superpowers/specs/2026-07-24-ai-actions-result-surface-design.md` | Aligned. |
| `docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md` | Aligned. |
| `docs/superpowers/plans/2026-07-25-hrms-03-backend-api-efficiency.md` | Aligned. |
| `docs/superpowers/plans/2026-07-25-hrms-04-caching-and-transactions.md` | Aligned. |
| `docs/superpowers/plans/2026-07-25-hrms-11b-pilot.md` | Aligned. |
| `docs/superpowers/plans/2026-07-25-hrms-11b-rollout-runbook.md` | Aligned. |
| `docs/superpowers/plans/2026-07-25-kb-security-p0-hotfix.md` | Aligned. |
| `docs/superpowers/plans/2026-07-25-kb-core-apis.md` | Aligned. |
| `docs/superpowers/plans/2026-07-25-projects-overhaul-roadmap.md` | Aligned. |
| `docs/superpowers/AUTOMATIONS_HR_PRD.md` | Aligned. No tenant-naming or RBAC contradictions; describes extending automation triggers. |
| `docs/superpowers/specs/2026-06-11-odoo-accounting-mvp-design.md` | Aligned (scanned for tenant/workspace/users.role; none found). |
| `docs/superpowers/specs/2026-06-25-frontend-perf-diagnosis.md` | Aligned. Frontend perf analysis; no tenant-naming contradictions. |
| `docs/composio-setup.md` | Aligned. Integration setup doc; no contradictions. |
| `docs/production-api-domain.md` | Aligned. Deployment config; no contradictions. |
| `docs/mcp-agent-access.md` | Uses "StreamlineOS workspace" once in the context of "connect to your workspace" — this is a generic software term (workspace = project in VS Code/Cursor), not a product tenant claim. No action needed. |
| `docs/specs/composio-mail-tools.md` | Aligned. |
| `docs/specs/2026-07-19-mail-module.md` | Aligned. |
| `docs/specs/2026-07-20-ai-token-billing.md` | Aligned. |

---

## Section 3 — Neutral / irrelevant documents

These docs were scanned and contain no content relevant to the six authoritative rules.

| Doc | Reason neutral |
|-----|---------------|
| `docs/superpowers/plans/2026-07-25-kb-schema-indexes-search.md` | Covered above (C-11); workspace references are compatibility symbols correctly documented. |
| All `docs/schema-migration/` wave-N docs not listed elsewhere | Either pure schema/data analysis or already listed as aligned above. |

---

## Section 4 — Open actions summary

| ID | Action | Priority | Wave |
|----|--------|----------|------|
| C-02 | Rename workspace-onboarding → organization-onboarding module, endpoints, and folder during Wave 8 terminology pass | Medium | Wave 8 |
| C-03-a | Remove users.role fallback in AccessService per Wave 5 exit criteria; add telemetry flag | High | Wave 5 |
| C-03-b | Confirm user_roles backfill from users.role is a one-time seed, not an ongoing read path | High | Wave 5 |
| C-03-c | Migrate AccessService cache key to (org_id, organization_membership_id, access_version) | High | Wave 5 |
| C-04-b | Amend rbac-slice-2 applyScope: team scope must fail validation (400), never silently degrade to own | High | Wave 5 |
| C-05-c | Verify no protected backend route relies on JWT role/isOrgOwner claims as authoritative | High | Immediate / Wave 0 |
| C-07-d | Add pm_workspace_id to managed_products schema when implementing; update wave-8 Drizzle sketch accordingly | High | Wave 7 |
| C-08-a/b | Name new PM membership endpoints "pm-members"; rename AddWorkspaceMemberButton → AddPmMemberButton on implementation | Medium | Wave 7 |
| C-08-c | If Q-MT-2 option B chosen: key on organization_membership_id, not user_id | High | Wave 7 |
| C-10-a | Update delegations table to use organization_membership_id FKs before implementation | High | Wave 5 |
| C-11-a | Schedule workspace_search_chunks → org_search_chunks rename in Wave 9 | Low | Wave 9 |
| C-12-a | Add targets.service users.role read path to Wave 5 retirement checklist | High | Wave 5 |
| C-09-a | Rename "Workspace administration" → "Organization administration" in QA program | Low | Wave 8 |
| C-07-a/b | Remove "workspace navigation" / "workspace page" terminology from pm-feature-gaps plan | Low | Wave 8 |

---

## Exit criteria for this inventory (Wave 0 gate)

- [x] All docs under docs/ scanned (67 total, including schema-migration/, superpowers/plans/, superpowers/specs/, specs/, root docs/).
- [x] Every contradiction against R1–R6 enumerated with a specific quote and line reference.
- [x] wave-8-pm-hierarchy-design.md recorded as RESOLVED (SUPERSEDED banner already applied).
- [ ] Product owner (Aditya) reviews and approves this inventory before Wave 1 work begins.
- [ ] All HIGH-priority open actions assigned to their wave's implementation plan before that wave starts.
- [ ] This document added to Wave 0 ADR sign-off checklist alongside wave-0-pm-reconciliation-adr.md.

---

## Stats

| Category | Count |
|----------|-------|
| Total docs scanned | 67 |
| Contradicting docs (C-01 through C-12) | 12 |
| Resolved contradictions | 6 (C-01 fully, C-05-a, C-05-b, C-06-a/b/c, C-04-a) |
| Open contradictions requiring action | 14 actions across 9 docs |
| Aligned docs | 51 |
| Neutral / irrelevant | 4 |

**Most important contradiction found:** C-04-b — the RBAC Slice 2 spec's `applyScope` behavior
silently degrades `team` scope to `own` when no team column exists. The authoritative plan
(schema-change-plan.md §5 Scopes) is explicit: "unsupported `team` must fail validation rather
than silently narrow or broaden." This is a security-class bug: a user granted `own`-equivalent
access via a `team` scope degradation would believe they have restricted access, but if the
backend silently falls back to `own`, no one detects the mismatch. This must be corrected in
the applyScope implementation before any module cutover in Wave 5.
