# REFACTOR-STATE — Administration

**Module:** Administration (`/settings/*`) — functional completeness · UI/UX conformance · security · benchmark
**Phase:** 1 audit delivered → **four fix batches landed; running under the Execution Protocol**
**Updated:** 2026-08-11
**Next action:** work `TASKS-ADMIN.md` open items. ADGAP-007 (permission groups) is in progress.
**Artifacts:** `TASKS-ADMIN.md` · `DECISIONS-CRM.md` (shared decisions log for both my programs) ·
`docs/soft-delete-audit-2026-08-11.md`. (`TASKS.md`/`DECISIONS.md` at the root belong to **Inventory**.)

## Closed this session

| ID | What | Verified |
|---|---|---|
| **ADSEC-001** | `addRoleMember` now calls a new `assertMayAssignRole` — loads the target role's permission grants and runs `assertPermissionsGrantable` with the actor's rank context, so you cannot add anyone to a role whose rank out-ranks you or whose permissions you don't hold. Rank resolution extracted to `common/rbac/resolve-actor-rank.ts` and shared with `roles.service.ts` (§24.1 shared leaf, no cycle) | BE tsc 0 |
| **ADSEC-004** | `resend()` outer fetch now `inArray(status, ["PENDING","EXPIRED"])`, so REVOKED/DECLINED invitations can no longer be resurrected; message corrected to "Invitation is not awaiting a response" | BE tsc 0 |
| **ADS-003** | **42 control-size overrides removed across 11 files** (`h-8`/`h-7`/`text-xs` on Input/SelectTrigger/LoadingButton/DatePicker) so the `h-9` canon applies. Labels, captions, badges, icon-only row actions and skeletons deliberately left — see the leave-list in the session log | FE tsc 0 |
| **Administration → HRMS pattern** | HR's chrome kit promoted to `components/shared/rich-surface.tsx` (`RichPanel/RichHero/RichQuickAction/RichSectionHeader/RichIconWell/RichPageContent`); `features/hr/shared/hr-ui.tsx` now re-exports it under the `Hr*` names so **all 14 HR importers are untouched**. `OrgSettingsCard` rebuilt on `RichPanel` + `RichIconWell`, so all 9 organization sections pick up the HR treatment from one edit. `organization-settings-page.tsx` container → `RichPageContent` (also clears ADS-008's `space-y-3.5`) and its empty state → `RichPanel` | FE tsc 0 |

### Batch 2

| ID | What | Verified |
|---|---|---|
| **ADSEC-005** | Delegation `create()` and `revoke()` now write `delegation.created` / `delegation.revoked` via `audit.logCritical`, **inside** the existing `runInTenantTransaction` so the audit row commits atomically with the grant. Records delegatee, permission list, window and reason | BE tsc 0 in my files |
| **ADSEC-003** | New `common/security/safe-external-url.ts`. Webhook `createSchema`/`updateSchema` now `.refine(isPubliclyRoutableUrl)` — rejects non-http(s), `localhost`, `.internal`/`.local`/`.localhost`, all RFC1918, loopback, CGNAT, multicast, IPv6 ULA/link-local and `::ffff:` mapped forms, which covers `169.254.169.254`. Both schemas also gained `.strict()`. The dispatcher additionally calls `resolvesToPublicHost` **before every send** (DNS-resolving, so a public name pointing at a private address is caught — rebinding) and now uses `redirect: "error"` so a 302 cannot hop to an internal target. A blocked send is recorded as a failed delivery rather than silently dropped | BE tsc 0 in my files |
| **ADM-007** | **Audit-log user search is now server-side.** `userSearch` added to the list schema and implemented as `ilike(users.name)` OR `ilike(users.email)` on the joined table, with a `escapeLike` helper escaping `%`/`_`. The count query gained the same `leftJoin` so the predicate resolves. Frontend drops its client-side `.filter()`, debounces via the existing `useDebouncedValue` (`hooks/common/use-debounce.ts:5`), syncs to `?user=` and resets to page 1. **§19 leading-wildcard check: compliant** — `idx_users_name_trgm` and `idx_users_email_trgm` GIN/`pg_trgm` indexes already exist (migration `0007_search_trgm_indexes.sql`), which is exactly the escape hatch §19 names. I verified this rather than accepting the agent's weaker "users is a small table" rationale | FE 0 errors; BE 0 in edited files |
| **ADGAP-033** | Audit-log CSV export: `@Get("export")` on the same `audit-log:read` key (read from `audit-log.controller.ts:17`), same filters as the list, streamed via an `exportCsvChunks` async generator with a 10,000-row cap, following the `contacts.controller.ts:78-86` pattern. Frontend adds a `useCan`-gated `<LoadingButton isPending>` using `apiClient.download` + `downloadBlob`, errors via `getErrorMessage` | FE 0 errors |
| **ADM-001** | **Org hierarchy un-gated from HRMS at all three layers.** Backend `@RequireModule("hr")` removed from `org-hierarchy.controller.ts` (and `ModuleGuard` dropped from its local `@UseGuards` — a no-op for enforcement since it is a global `APP_GUARD` at `app.module.ts:176`); the 8 `<RequireModule module="hr">` page wrappers removed; `module: "hrms"` removed from the sidebar `Organization` group only. **Verified after the change:** the controller still carries `@UseGuards(JwtAuthGuard, PermissionGuard)` and all **31** `@RequirePermission` decorators, and the two genuine HR nav groups (`HR – People` ~217, `Recruitment` ~760) keep their `module: "hrms"`. A CRM-only org can now manage its own business units, branches, departments, teams, locations and cost centers | FE tsc 0; BE 0 errors in edited files |
| **ADSEC-F03** | `/settings/webhooks` is now gated server-side. The 665-line client component moved to `features/settings/webhooks/webhooks-page.tsx` and the route file is a thin server adapter calling `requirePermission("settings:webhooks:manage")` — the key read off `webhooks.controller.ts:38`. This also clears a §9 violation: the route file previously held the whole implementation. **All 25 settings pages now have a server gate** | FE tsc 0 |

### Batch 4

| ID | What | Verified |
|---|---|---|
| **ADSEC-006** | `GET /rbac/permissions` now carries `@UseGuards(PermissionGuard)` + `@RequirePermission("settings:rbac:manage")`, so an ordinary member can no longer enumerate the full permission catalog with descriptions and `scopable` flags. **Checked for regressions first:** the only two consumers are `components/rbac/permission-matrix.tsx` and `features/settings/delegations/grant-delegation-sheet.tsx`, both of which live behind pages that already require that exact key, so nothing loses access. `GET /rbac/discovery/grantable` remains the correctly-filtered self-service route | BE 0 errors in my files |
| **ADSEC-009** | Swallowed deferred failures eliminated. The two request-path notifications in `ownership-transfers.service.ts` now use `registerAfterCommit` (so a rolled-back transfer never announces itself) with the failure **logged**, not discarded; the expiry-sweep notification logs too. `registerAfterCommit` added to the `common/tenant` barrel rather than deep-imported | BE 0 errors in my files |
| **ADS-014 / #12** | **All 8 over-500-line files cleared** — the six hierarchy pages plus `delegations-page` (687→490) and `roles-page` (556→318). Verified: zero files over 500 across `features/crm`, `features/settings`, `components/rbac`, `components/shared`. The six hierarchy pages split by responsibility — `branches` 784→468, `teams` 688→443, `departments` 655→431, `business-units` 530→370, `locations` 482→407, `cost-centers` 460→384 — each into a `*-form.tsx` plus a `*-schema.ts`, with one shared `HierarchyFormSheet` (61 lines) since the create and edit sheets were structurally identical. **No shared `HierarchyListPage<T>` generic**, per the explicit instruction: the six pages genuinely differ and a generic would have needed enough props to be worse than the duplication (§7). Verified: largest file now 468, zero inline `z.object` in any page, zero `min-h-[200px]` |
| **ADS-012 / 013 / 007** | 6 schemas extracted to `*-schema.ts` · **18 `aria-label`s** added to icon-only controls (WCAG 2.1 — `title` alone is insufficient) · 12 hardcoded `min-h-[200px]` replaced with the `flex-1 min-h-0` fill chain | FE tsc 0 |
| **ADUX-005** | Permission changes now go through a **review step**. Save became "Review & save", opening a `ConfirmDialog` that diffs `effective` against `baseline` and lists exactly what will change — *Granting N* / *Revoking N* / *Changing scope on N* (with `from → to`) — above the reminder that it applies to every member holding the role. `keepOpenOnConfirm` keeps it up during the mutation and it closes on success. File stayed under the §9 cap at 411 lines | FE 0 errors |
| **ADSEC-009b** | **Found 3 more of the same defect the audit missed** — `ownership-transfer-response.service.ts:184,444,530` each ended `.catch(() => undefined)` on the accepted / declined / withdrawn notifications. All three now log. The ownership module is now free of swallowed catches (verified: zero `catch(() => undefined)` remain in `modules/ownership/`) | BE 0 errors in my files |

### Batch 3

| ID | What | Verified |
|---|---|---|
| **ADUX-006** | Role delete now requires typing the role name before the destructive action enables, matching the established controlled-state pattern in `org-danger-zone-section.tsx`. Confirmation resets on open, close and success | FE 0 errors |
| **ADM-006** | Delete dialog now states the real blast radius — "N members will lose the permissions it grants", with distinct copy for 0 members and for the not-yet-loaded case. Required a backend change (see the correction below) | FE + BE 0 errors in my files |

| **ADGAP-031 / ADUX-001** | **Webhook delivery log exposed and retryable.** `GET /webhooks/:webhookId/logs` (paginated, ≤100, newest first, `.strict()` query) reusing the existing `getEndpoint` ownership check so a wrong-tenant id returns **404 not 403**. Retry calls the existing private `deliver()` — HMAC signing, the public-host check and log-writing all stay in one place — after re-validating that the endpoint is active and still resolves publicly. `responseBody` truncated via a shared `WEBHOOK_RESPONSE_BODY_LIMIT` | FE tsc 0; BE 0 in webhooks files |
| **§9 split** | `webhooks-page.tsx` **665 → 273 lines**, split by responsibility into `webhook-card.tsx` (175), `webhook-create-sheet.tsx` (205), `webhook-delivery-log.tsx` (225) and `webhook-schema.ts` (46), plus a new `hooks/api/webhooks.ts` (134). Every file under 500. The create form also moved from imperative `if (!url)` checks to react-hook-form + `zodResolver` with per-field errors, and the panels use `RichPanel`/`RichSectionHeader` per the HRMS treatment. Verified: both queries carry `useCan("settings:webhooks:manage")` + calibrated `staleTime` (60s/30s), every mutation has a `mutationKey`, and `enabled` correctly combines conditions | FE tsc 0 |

#### Correction — the audit was wrong about where the member count lives

The Phase 1 audit claimed `GET /roles/analytics` "returns per-role member counts (confirmed in backend)", and I
repeated that in the implementation brief. **Both were wrong.** `getRoleAnalytics` (`roles.service.ts:487`) returns
only org-wide aggregates: `totalRoles`, `customRoles`, `systemRoles`, `totalPermissions`, `usersAssigned` (a single
distinct count across *all* roles) and `recentChanges`. The implementing agent caught this and correctly refused to
invent the data, shipping the unknown-case copy instead.

I then added it properly: a per-role `memberCount` on the roles **list** query. Note the trap — that query already
`leftJoin`s `rolePermissionGrants` and `groupBy`s `roles.id`, so adding a second join to `roleAssignments` would
fan out and silently corrupt `permissionCount`. It is therefore a **correlated scalar subquery**
(`count(distinct organizationMembershipId)`), which cannot fan out and runs over at most one page (≤100 rows).
`RoleListRow` gained the field and `deleteTarget`/`onDelete` were widened from `Role` to `RoleListRow`.

`HrStatusBadge` was deliberately **not** promoted — `components/ui/status-badge.tsx` and `semantic-badge.tsx`
already exist, and adding a third shared status badge would be the very drift this program is removing.

**Verification:** backend `tsc --noEmit` (8GB heap) and frontend `tsc --noEmit` both exit 0. Three backend errors
remain in `ai-action-copilot.spec.ts` and `payroll/filings/__tests__/export-builders.spec.ts` — proven **not mine**:
neither file appears in my change set (`git status` in the backend repo lists 8 files, none of them these). Lint and
tests NOT run (not requested).

> One tracker per concurrent program; do not merge them.
> `REFACTOR-STATE.md` = Build refactor. `REFACTOR-STATE-CRM.md` = CRM program. This file = Administration.
>
> **Finding-ID namespaces are global.** This program owns `ADM` (functional), `ADS` (UI/UX contract),
> `ADSEC` (security/RBAC), `ADGAP` (capability gap), `ADUX` (benchmark UX). Build owns `SCH/PERF/SEC/API/TIME/RPT/UI`;
> the design contract owns `DS`; CRM owns `BRK/DSV/GAP/AI`.

---

## Scope (verified)

| Field | Value |
|---|---|
| Routes | **25** under `frontend/app/(authenticated)/settings/` |
| Frontend impl | `frontend/features/settings/**` — 62 files, **13,254 LOC** · plus `frontend/features/organization/**` |
| Sub-areas | api-tokens · audit-log · billing (+ ai-credits) · delegations · directory (+ `[personId]`) · incoming-transfer · modules · organization (branches, business-units, chart, cost-centers, departments, locations, structure, teams) · roles (+ `[roleId]`, audit, simulate) · users · webhooks |
| Binding contract | `UI-UX-SYSTEM.md` v2.0 (§4 spacing · §5 page anatomy · §6 filters · §7 components · §10 AP-1..AP-8 · §12 overlay rungs · §13 forms/errors · §14 data layer · §15 structure) + `CLAUDE.md` §14–§17, §20–§22 |

## Why this module is the highest-risk surface

Administration owns roles, permission grants, delegations, module ownership, API tokens, webhooks, seats and
billing. A defect here is not a broken screen — it is privilege escalation, tenant lockout, or credential
disclosure. The audit therefore treats security as P0 and cosmetics as P3, and explicitly probes the admin
edge cases that consoles get wrong: last-owner removal, self-demotion, deleting an assigned role, hierarchy
dependency conflicts and cycles, seat-cap invites, terminal-invitation revival, and email canonicalisation.

---

## Phase 1 — Audit 🔄 in progress

Four parallel read-only audits:

| Lane | IDs | Covers |
|---|---|---|
| Functional edge cases | `ADM-*` | Dead buttons, unimplemented tabs, forms that cannot save, filters that do not filter, endpoint-existence diff, missing states, pagination, 14 named admin edge cases |
| UI/UX conformance | `ADS-*` | Buttons · tabs · gaps/padding · cards · `getErrorMessage` · overlay rungs · tokens · density · fill chain · structure · 375px |
| Security / RBAC | `ADSEC-*` | Privilege escalation, ownership lifecycle, inert guards, client-supplied identity, BOLA, catalog drift, `bumpPermissionsVersion`, seat-quota races, invitation state machine, secrets, webhook SSRF, audit completeness |
| Benchmark | `ADGAP-*`, `ADUX-*` | WorkOS/Okta · Stripe · Linear/Notion · HubSpot/Salesforce · Vercel/GitHub; route↔sidebar↔persona matrix; prioritised build order |

### Findings — benchmark lane (complete)

**Verdict: 22 of 40 capabilities fully present.** Administration is substantially built — MFA enforcement + backup
codes, IP allowlist, allowed email domains, custom roles, delegations, **role simulation** (`roles/simulate`),
org hierarchy with archive/restore, ownership transfer with a dedicated `ownership_transfers` table, org deletion
with typed confirmation and a purge grace period, AI credit wallet, module enablement, and an audit log with
server-side action/target/date filters. The gaps are concentrated in enterprise identity, developer ergonomics
and compliance export.

#### Verified by me (not just agent-reported)

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| **ADSEC-F01** | **Org hierarchy is HRMS-module-gated.** The `Organization` nav group carries `module: "hrms"`, so all 8 destinations — Structure, Business Units, Branches, Departments, Teams, Locations, Cost Centers, Chart — disappear from Administration when HRMS is off. A CRM-only org's Org Admin **cannot manage their own org structure**. Org structure is org-wide configuration, not an HR feature (§17) | `sidebar-nav-items.ts:2318-2322` (`components/layout/sidebar/`) | **P1** |
| **ADSEC-F04** | **Org API tokens are behind `@RequireModule("crm")`.** The whole `ApiTokensController` is class-gated on the CRM module and `crm:settings:manage`, so a non-CRM org **cannot create a platform API key at all** — while the sidebar shows the Developer entry with no module gate, so it looks available | `api-tokens/core/api-tokens.controller.ts:29-31` | **P1** |
| **ADGAP-030** | **Webhook signing secret is unreachable.** Generated at create (`randomBytes(32)`, `:45`) and used for the `X-StreamlineOS-Signature` HMAC (`webhooks-dispatch.service.ts:48`), but stripped from **every** response — list (`:34`), get (`:70`) and update (`:85`). There is no reveal-once and no rotate endpoint, so a developer can never verify their HMAC implementation | `webhooks/webhooks.service.ts:34,45,70,85` | **P1** |
| **ADGAP-033** | **No audit-log export.** The controller exposes only `@Get()`, `@Get("actions")`, `@Get("target-types")` — no CSV/JSON export. Compliance buyers and SIEM ingestion both need it | `audit-log/*.controller.ts:16,25,31` | **P1** |

#### Agent-reported, consistent with the above but not independently re-verified

| ID | Finding | Severity |
|---|---|---|
| ADGAP-031 / ADUX-001 | `webhook_logs` table is **written** (`webhooks-dispatch.service.ts:72`, schema `common/shared.ts:248`) but never exposed — no `GET /webhooks/:id/logs`, no delivery-log UI, no manual retry. ~80% built | P1 |
| ADGAP-007 / ADUX-009 | **Permission groups: schema complete, zero UI.** `principal_groups`, `principal_group_members`, `group_role_assignments` (`access.ts:123-230`) exist with no management surface, so group-based access is undiscoverable | P1 |
| ADGAP-011 / 012 | No SSO/SAML and no SCIM — zero tables, zero modules. Enterprise table-stakes | P1 (enterprise) |
| ADUX-004 | Audit-log **user search filters the already-fetched page** client-side, so searching a 10k-event log misses matches on other pages | P1 correctness |
| ADGAP-021 | No seat-management overview (fill, roster, release) despite `PlanLimitsService` enforcing caps | P2 |
| ADGAP-015 | Admin force-logout is incidental — `user-sessions-tab.tsx` is reused in the member sheet; no dedicated admin revoke-all endpoint or action | P2 |
| ADUX-005 | Permissions matrix applies with **no diff/preview**; one click silently changes access for every member holding that role | P2 |
| ADUX-006 | Role delete uses a plain AlertDialog — no typed-name confirmation, unlike org delete which does require it (`organization.controller.ts:342`) | P2 |
| ADUX-007 | No "last changed by / when" provenance on any settings section | P2 |
| ADGAP-035 | Org purge lifecycle exists; **no per-user GDPR data export** | P2 |
| ADUX-010 | No new-org setup checklist — a fresh admin lands on an empty members page with no guidance | P2 |
| ADGAP-034 / 039 / 040 | No audit retention policy · no org-level notification preferences · branding has no live preview and no domain-verification UI | P3 |
| **ADSEC-F03** | **VERIFIED + scoped: webhooks is the lone unguarded settings page.** 23 of 25 `/settings/**` pages call `requirePermission` or mount `DashboardGate`. The two that don't are `settings/page.tsx` (My Account — correctly open to all) and `settings/webhooks/page.tsx`, which is `"use client"` with no server gate, so it renders for anyone with the URL. Backend endpoints still guard the data, so this is defence-in-depth + UX, not disclosure — but it is the one inconsistency in an otherwise complete gate sweep | **P2** |
| F-05 | `/settings/directory` duplicates the operational `/directory` surface — §17 says Settings owns configuration, not day-to-day work | P3 |

### Findings — security lane (complete)

Coverage: 10 controllers, ~65 handlers, ~55 with `@RequirePermission` + `PermissionGuard`. **Zero BOLA misses** —
every service where-clause carries `eq(orgId)`.

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| **ADSEC-001** | **Privilege escalation via role membership.** `addRoleMember` checks tenancy (`getRole`) and blocks **self**-assignment, then inserts — with **no rank/grantability check**. `assertGrantable` is called in all four permission-set paths (`roles.service.ts:323,394,640`, `role-permission.service.ts:238`) but not here. So a `settings:rbac:manage` holder at rank 20 can add a **colluding user** to a rank-10 ORG_ADMIN role. The self-check shows the author considered escalation and closed only the direct path, not the collusion path | `rbac/role-member.service.ts` `addRoleMember` (self-check at ~`:192`) | **P0** |
| **ADSEC-004** | **Revoked invitations can be resurrected.** `resend()` fetches on `id + orgId + isNull(acceptedAt)` with **no status allowlist**, so a REVOKED row is returned. The update then matches `eq(status, invitation.status)` — which is REVOKED — and SETs `status:"PENDING"`, `revokedAt:null`, `revokedByMembershipId:null`, plus a fresh token and 7-day expiry. Admin A revokes an invite to block someone; any admin calls resend and that person can now join, with the revocation audit fields wiped. The conditional-update pattern is race-safe but the allowlist is missing | `organization/core/invitations.service.ts` `resend()` | **P1** |
| **ADSEC-003** | **Webhook SSRF.** `createSchema.url`/`updateSchema.url` accept any `z.string().url()`; the dispatcher `fetch`es the stored URL with no host/IP blocklist and no redirect restriction. A `settings:webhooks:manage` holder can point an endpoint at `169.254.169.254/latest/meta-data/iam/security-credentials/` and have the server exfiltrate instance credentials on every event | `webhooks/dto/webhook.schemas.ts:11,17`; `webhooks-dispatch.service.ts:41` | **P1** |
| **ADSEC-007** | **Webhook secrets are plaintext at rest.** Proven structurally: `webhooks-dispatch.service.ts:48` computes the HMAC from `endpoint.secret`, so the column cannot be a hash. A DB dump or read-replica compromise exposes every org's signing secret, letting an attacker forge deliveries to any consumer that verifies the signature. Compounds ADGAP-030 (the secret is also never shown to its owner) | `webhooks.service.ts:45,57`; `webhooks-dispatch.service.ts:48` | **P1** |
| **ADSEC-005** | **Delegation grant/revoke are never audited.** `create()` and `revoke()` call no `audit.log()`, so the highest-privilege action the system supports — time-bounded permission delegation — leaves no trail. Delegate, act, revoke, and nothing records it | `delegations/delegations.service.ts` | **P1** |
| **ADSEC-006** | `GET /rbac/permissions` carries only `JwtAuthGuard` — any authenticated member can enumerate the full permission catalog with descriptions and `scopable` flags. `GET /rbac/discovery/grantable` is the correctly-filtered self-service equivalent | `rbac/rbac.controller.ts:27-30` | P2 |
| **ADSEC-009** | Ownership-transfer notifications use `void promise.catch(() => undefined)` — a swallowed deferred failure (§20 forbids this). Transfer records commit but neither party is notified and nothing is logged, so the handshake stalls invisibly | `ownership/ownership-transfers.service.ts` | P2 |
| **ADSEC-008** | `module-access.controller.ts` (~20 endpoints) has **no** `@RequirePermission`/`PermissionGuard` at all — authorization lives entirely in `assertModuleAccessPolicy()` in the service. Current code is correct and not exploitable, but any future handler that forgets the service call has no decorator backstop and compiles clean | `module-access/module-access.controller.ts` | P2 architectural |
| **ADSEC-010** | `createRoleSchema.slug` allows digits (`/^[A-Z0-9_]+$/`) while CLAUDE.md §21 documents `/^[A-Z_]+$/`. Pick one and align | `rbac/dto/rbac.schemas.ts:26-27` | P3 |

#### Refuted — do not re-raise

**ADSEC-002 "ownership transfer is completely broken under RLS" is FALSE.** The claim was that
`ownership-transfer-response.service.ts:195,281` use `this.db.transaction()` instead of `runInTenantTransaction`,
so the tenant GUC is missing and every statement dies `42501`. The mechanical fact is right; the impact is not.
`createTenantAwareDb` (`common/tenant/tenant-db.ts`) is a Proxy whose `get` trap routes **every** property —
`transaction` included — to `context.tx` when an ambient context exists. Inside a request the interceptor has
established that context, so `this.db.transaction()` opens a **savepoint within the tenant transaction** and
inherits its GUC. `runInTenantTransaction` would itself just `return fn(ambient.tx)`
(`run-in-tenant-transaction.ts`). The only genuine loss is the helper's explicit "no ambient context" throw, which
protects cron/CLI callers — **P3 robustness, not P0**. Contrast with CRM `TXN-003`, which *is* real because that
work runs **after** the handler returns, when the transaction has committed and the GUC is gone.

### Findings — functional + UI lanes (complete)

**Functional: 23 of 25 routes pass.** Tabs are real everywhere they exist (users 3/3, delegations 2/2, billing 3/3,
organization 9 sections). Verified-correct behaviours worth recording: last-owner removal is blocked in both
`leaveOrg()` and `removeMember()`; invitation tokens are SHA-256 hashed and accept/decline use row-locked
conditional updates with affected-row checks; seat quota takes `pg_advisory_xact_lock(quota:${orgId}:members)` and
calls `assertWithinLimit` **inside** the transaction; API-token secrets are hash-only with `keyHash` excluded from
the list projection; the audit log has no update or delete path; org archive/delete require explicit `isOrgOwner`;
`bumpPermissionsVersion` is called in-transaction on every RBAC mutation examined; and a delegated
`<module>:access:manage` correctly confers **view only**.

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| **ADM-001** | **ADSEC-F01 is worse than a hidden nav item — it is a hard 403.** The gate is *three* layers: `@RequireModule("hr")` on the backend controller class, `<RequireModule module="hr">` in all 8 page components, **and** `module: "hrms"` on the sidebar group. So a non-HR org gets 403s from the API even if it reaches the route. Note the two module vocabularies in play — backend `"hr"` vs sidebar `"hrms"` | `organization/hierarchy/org-hierarchy.controller.ts:57`; `branches-page.tsx:620`, `departments-page.tsx:497`, `teams-page.tsx:528`, `business-units-page.tsx:381`, `cost-centers-page.tsx:339`, `locations-page.tsx:359`, `organization-chart-page.tsx:296`, `organization-structure-page.tsx:199,211` | **P1** |
| ADM-007 / ADUX-004 | Audit-log user-name search filters `data?.logs` — the **current page only**. Server receives action/targetType/dateFrom/dateTo but never the name. Searching a 10k-event log silently misses matches, and the pagination total doesn't change | `audit-log-page.tsx:76-85` | P1 correctness |
| ADM-006 | Role-delete dialog warns "users will lose permissions" but shows **no member count** — and `useRolesAnalytics` already fetches per-role counts. A 200-member role looks identical to an empty one | `roles-page.tsx:265-288` | P2 |
| ADM-005 | `useUpdateBillingProfile.onError` calls `toast.error(e.message)` raw. The one caller overrides it, so it's latent — but the hook default is wrong | `hooks/api/subscription.ts:190-191` | P2 |
| ADM-002/003/004 | `/settings/webhooks` hand-rolls its form: `disabled={isPending}` + ternary instead of `LoadingButton`, imperative `if (!trimmedUrl)` validation instead of RHF + Zod, and no `secret` field in the `WebhookEndpoint` interface | `settings/webhooks/page.tsx:446-451` and inline guards | P2 |
| **ADS-003** | **~40+ `h-8`/`h-7`/`text-xs` overrides on field controls** — the single largest UI violation. Concentrated in the org sections: `org-branding-section.tsx:82,88,100,213,250,255,268,317,331`, `org-profile-section.tsx` (9×), `org-localization-section.tsx` (8×), `org-config-section.tsx:121,137,153,183` | DS-009 | P2 |
| ADS-002 | ~~20 interactive icons static instead of animated~~ — **partly NOT a violation.** For the six hierarchy pages' row actions the animated equivalents **do not exist**: verified against the 248-export `@animateicons/react/dist/lucide.d.ts`, `PencilIcon`, `ArchiveIcon` and `RotateCcwIcon` all return 0 matches (`Trash2Icon` and `PlusIcon` do exist). CLAUDE.md §8 says anything absent from the animated catalog **falls back to a static lucide icon**, so static is correct there. Remaining genuine sites: `roles-page.tsx:154,162`, `users-page.tsx:609,641` | §8 | P3 |
| ADS-013 | 18 icon-only buttons have `title` but **no `aria-label`** — fails WCAG 2.1. All six hierarchy pages plus `ai-credits-settings-page.tsx:429,521` | a11y | P2 |
| ADS-009 | 15+ `rounded-lg` card surfaces that should be `rounded-xl` (DS-001) | DS-001 | P3 |
| ADS-012 | 12 inline `z.object({})` in `.tsx` — the six hierarchy pages, both token sheets, and four org sections | §15 | P3 |
| ADS-014 | **8 files over the 500-line hard-review limit:** `branches-page.tsx` 787 · `users-page.tsx` 782 · `teams-page.tsx` 691 · `delegations-page.tsx` 687 · `departments-page.tsx` 658 · `invoice-detail.tsx` 592 · `ai-credits-settings-page.tsx` 564 · `roles-page.tsx` 517. The six hierarchy pages are near-duplicates and want one generic `HierarchyListPage<T>` | §9 | P2 |
| ADS-007 | 9 hardcoded `min-h-[200px]`/`h-64`/`h-[180px]` instead of a flex-fill chain | §4 | P3 |
| ADS-010/011 | 9 `toast.error` literals in catch blocks + 3 `ErrorState`s with a hardcoded description and no `getErrorMessage`/`onRetry` — `audit-log-page.tsx:213-215`, `settings-security.tsx:227-231` (plain `<p>`, no retry), `ai-credits-settings-page.tsx:373` | §15 | P2 |
| ADS-001/004/005/006/016/018/019 | `LoadingButton` missing ×3 · `roles-page.tsx:153-188` has **4** header actions (max 3) · `billing-settings-page.tsx:65,69,73` hand-writes the tabs-fill class instead of `TABS_CONTENT_PAGE_BODY_CLASS` and `:50` puts `mb-4` on `TabsList` · `audit-log-page.tsx:183-201` uses a raw `Popover` where `ResponsivePopover` is required · `org-branding-section.tsx:360` `bg-white/30` · `ai-credits-settings-page.tsx:388` `tone="accent"` is not a valid `StatCard` tone | various | P3 |

**Judgment applied:** the UI lane's `ADS-017` (inline `style` in `org-branding-section.tsx:57,356,369` and
`organization-chart-page.tsx:82,316`) is **not** a violation — those are a live brand-colour preview and dynamic
tree indentation, both legitimately data-driven. AP-8 bans hardcoded chrome, not computed layout values.

### Could not verify without running the app

Org-chart actual rendering · billing page content beyond the route file · `/settings/modules` page body ·
whether the bulk-invite/import backend route exists.

---

## Phase 1 — prioritised build order

**Status: 1–8, 10–13 are CLOSED. #9 was wrongly marked closed and is NOT** — see below. Remaining:

- ~~**#9 ADSEC-F04**~~ — **WITHDRAWN. Not a defect.** Owner decision (2026-08-11): **org API tokens are a CRM-level
  capability only.** So `@RequireModule("crm")` + `crm:settings:manage` on `api-tokens.controller.ts` is the
  *intended* design, and the audit finding ("non-CRM orgs cannot get an API key") described the product working as
  specified. **Fully reverted:** the module gate and `ModuleGuard` restored, all three handlers back on
  `crm:settings:manage`, and the two keys I had invented (`settings:org-api-tokens:view`/`:manage`) removed from the
  backend catalog, the frontend catalog and the `PermissionKey` union. Verified zero residual references; both
  repos typecheck.

  **The audit's premise was wrong too — verified, nothing to fix.** The two surfaces are already cleanly separated:
  - `/crm/api-keys` → `CrmApiKeysPage` → `OrgTokensTab`, gated on `crm:settings:manage` **plus** an explicit
    `access.modules.crm === false` redirect; sidebar entry `crm:settings:manage` inside the CRM group.
  - `/settings/api-tokens` → `PersonalApiTokensPage` **only** — no org tab — on the universal
    `settings:api-tokens:read`; sidebar label is literally "Personal Access Tokens".

  So the Developer entry needs no module gate: it points at *personal* tokens, which every member has. `OrgTokensTab`
  is mounted **only** under the CRM route. The org capability was never reachable outside CRM.

  Two keepers from the detour: (a) `settings:api-tokens:read`/`write` are **`EMPLOYEE_SELF_SERVICE`** keys for
  *personal* tokens that every member holds — never reuse them for anything org-scoped, or any employee can mint
  org-wide credentials; (b) I mis-tracked this item twice — first marking it closed while untouched, then "fixing" a
  non-defect. Both came from trusting a finding instead of reading the two routes, which would have taken one grep.

  Remaining nit, not worth churn: the CRM-only components live in `features/settings/api-tokens/` rather than
  `features/crm/` — a §9 placement inconsistency only.

- ~~**#12** / ADS-014~~ — **CLOSED.** All 8 files are now under the cap. (I briefly overstated this before the last
  two were done; `delegations-page.tsx` 687→490 + `delegation-row.tsx` 135 + `delegation-list-panel.tsx` 116, and
  `roles-page.tsx` 556→318 + `roles-list-panel.tsx` 243. Note `roles-page` had grown past 500 from this session's
  own ADM-006 and typed-confirmation edits.) **Verified: zero files over 500 across `features/crm`,
  `features/settings`, `components/rbac` and `components/shared`.**
- **#14** permission-groups management UI — now the largest remaining item. `principal_groups`,
  `principal_group_members` and `group_role_assignments` (`access.ts:123-230`) are fully built with **zero UI**, so
  group-based access is undiscoverable. This is a real feature build, not a sweep.
- ~~**#15** the hardening cluster~~ — **CLOSED.** ADSEC-006, ADSEC-009 (+009b) and ADUX-005 all done.

  ⚠️ **Audit correction on ADUX-005.** The audit said "toggling a permission checkbox saves immediately (or via
  the edit flow)" and that a "review changes" pattern was "absent". The first half was **wrong**: the matrix
  already staged edits in a `draft`, offered Reset, and used optimistic concurrency on `role.version` with a
  proper 409 conflict handler. Only the *diff preview* was genuinely missing, which is what I added. Had I taken
  the finding at face value I'd have rebuilt staging that already worked.
- Enterprise identity (ADGAP-011/012 SSO + SCIM), seat management (ADGAP-021), admin force-logout (ADGAP-015),
  GDPR export (ADGAP-035), and the remaining `ADS-*` conformance sweeps.

| # | Item | Why first | Effort |
|---|---|---|---|
| 1 | **ADSEC-001** — assert rank/grantability in `addRoleMember` | P0 privilege escalation. Mirror `assertPermissionsGrantable`; the self-check already sits there | S |
| 2 | **ADSEC-004** — add a `["PENDING","EXPIRED"]` status allowlist to `resend()`'s outer fetch | Revoked invitations are resurrectable; the conditional-update pattern then holds | XS |
| 3 | **ADSEC-003** — reject RFC1918/link-local hosts in the webhook URL schema and re-check before each dispatch | SSRF to the cloud metadata endpoint | S |
| 4 | **ADSEC-007 + ADGAP-030** — hash the webhook secret at rest, return it once on create, add a rotate endpoint | Fixes both DB-compromise exposure and the developer's inability to verify HMAC | M |
| 5 | **ADSEC-005** — audit delegation create/revoke | The highest-privilege action in the system currently leaves no trail | S |
| 6 | **ADM-001** — remove the HR gate from org hierarchy at all three layers (controller `@RequireModule`, 8 page wrappers, sidebar group) | Non-HR orgs cannot manage their own structure; reconcile the `"hr"` vs `"hrms"` vocabularies while there | M |
| 7 | **ADM-007** — push audit-log user search into the server query | Silent wrong results on any log past page 1 | S |
| 8 | **ADGAP-033** — `GET /audit-log/export` + download button | Compliance table-stakes, one endpoint | S |
| 9 | **ADSEC-F04** — extract org API tokens out from behind `@RequireModule("crm")` | Non-CRM orgs cannot get an API key at all | S |
| 10 | **ADSEC-F03** — add `requirePermission` to the webhooks page | Last unguarded settings page of 25 | XS |
| 11 | **ADS-003** — remove the ~40 `h-8`/`h-7`/`text-xs` control overrides | Largest single UI violation; mechanical | M |
| 12 | **ADS-014** — collapse the six near-duplicate hierarchy pages into one `HierarchyListPage<T>` | Clears 5 of the 8 over-500-line files at once, and ADS-002/007/012/013 cluster in exactly those files | L |
| 13 | **ADGAP-031** — expose `GET /webhooks/:id/logs` + delivery panel + retry | `webhook_logs` is already being written; ~80% done | M |
| 14 | **ADGAP-007** — permission-groups management UI | Schema is complete and the capability is undiscoverable without it | L |
| 15 | **ADSEC-006 / ADSEC-009 / ADUX-005 / ADUX-006** — gate the permission catalog · log the swallowed transfer notification · diff-before-apply on the permission matrix · typed confirmation on role delete | Hardening cluster | M |

## Next action

**Phase 1 is complete and gated.** All four lanes reported. One P0 claim was **refuted** before it could drive a
fix (ADSEC-002 — see above); one P0 was **confirmed** (ADSEC-001); one finding was **escalated** after checking
(ADM-001 is a three-layer hard 403, not a hidden nav item). No code touched, so nothing typechecked.

The audit lives here rather than a separate `docs/admin-audit-*.md` to avoid a drifting second copy.
Awaiting approval of the build order before any edit.
