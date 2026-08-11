# TASKS — Administration (`/settings/*`)

Updated: 2026-08-11 · **Done 24 · Open 17 · Blocked 1 · Deferred 2 · Total 44**
Counts recomputed by script, not from memory.

Legend: `[x]` done with evidence · `[ ]` open · `[!]` blocked · `[~]` deferred with reason.
Evidence = a command or grep run **this session**. No test suite was run.

---

## Security (ADSEC-*)

- [x] ADSEC-001 **P0 privilege escalation** — `addRoleMember` now asserts grantability · Evidence: new `assertMayAssignRole` loads the role's permission grants and runs `assertPermissionsGrantable` with the actor's rank; rank resolver extracted to `common/rbac/resolve-actor-rank.ts` and shared with `roles.service.ts`; BE tsc 0
- [x] ADSEC-004 revoked invitations no longer resurrectable · Evidence: `resend()` outer fetch now `inArray(status, ["PENDING","EXPIRED"])`; enum values read from `enums.ts:371`
- [x] ADSEC-003 webhook SSRF closed — **and my duplicate removed** · Evidence: I first wrote `common/security/safe-external-url.ts`, then found `common/security/ssrf-guard.ts` **already existed** and was strictly better: it normalises the packed `::ffff:7f00:1` form (mine only handled the dotted spelling), strips IPv6 zone ids, blocks `ff00::/8` multicast and `192.0.0.0/24`, returns a typed rejection reason, ships a spec, and was already used by 3 modules. Migrated the schemas to `assertSafeWebhookUrl` and the dispatcher to `checkWebhookUrl` (now logging the typed reason), **deleted my duplicate**, verified 0 remaining references. Dispatcher still re-checks DNS before every send and uses `redirect: "error"`; blocked sends recorded as failed deliveries. A §0.2 reuse-before-create violation I introduced and then corrected
- [x] ADSEC-005 delegation create/revoke audited · Evidence: `audit.logCritical` **inside** the existing `runInTenantTransaction`, so the record commits atomically with the grant
- [x] ADSEC-006 permission catalog gated · Evidence: `GET /rbac/permissions` now `PermissionGuard` + `settings:rbac:manage`; both consumers (`permission-matrix.tsx`, `grant-delegation-sheet.tsx`) already sit behind pages requiring that key
- [x] ADSEC-009 swallowed deferred failures removed · Evidence: 2 request-path notifications → `registerAfterCommit` + logged; `grep -rc 'catch(() => undefined)' src/modules/ownership/` → **0**
- [x] ADSEC-009b 3 more of the same defect the audit missed · Evidence: `ownership-transfer-response.service.ts:184,444,530` now log instead of discarding
- [x] ADSEC-F03 last unguarded settings page · Evidence: 23 of 25 pages already gated; `webhooks/page.tsx` split so the route file can call `requirePermission("settings:webhooks:manage")` (key read from `webhooks.controller.ts:38`). **All 25 now gated**
- [x] ADSEC-002 **refuted, not a P0** · Evidence: `createTenantAwareDb` (`common/tenant/tenant-db.ts`) routes *every* property incl. `transaction` to the ambient tx, so in-request `this.db.transaction()` inherits the GUC. Real severity P3
- [x] ADSEC-F04 **withdrawn** — owner: API tokens are CRM-level only (D-011); my change fully reverted, 0 residual references
- [ ] ADSEC-007 webhook secrets are plaintext at rest — hash + reveal-once + rotate
- [ ] ADSEC-008 `module-access.controller.ts` has no decorator-level guard (service-layer only) — architectural fragility, not exploitable today
- [ ] ADSEC-010 `createRoleSchema.slug` allows digits vs §21's `/^[A-Z_]+$/`

## Functional (ADM-*)

- [x] ADM-001 org hierarchy un-gated from HRMS at all 3 layers · Evidence: controller `@RequireModule("hr")` removed, 8 page wrappers removed, sidebar `module: "hrms"` removed from the Organization group only; **verified after**: `@UseGuards(JwtAuthGuard, PermissionGuard)` intact and **31** `@RequirePermission` unchanged; the 2 genuine HR nav groups keep their gate
- [x] ADM-006 delete dialog states the real blast radius · Evidence: needed a backend change — `getRoleAnalytics` returns only org-wide aggregates, so a per-role `memberCount` was added as a **correlated subquery** (a second `leftJoin` would fan out and corrupt `permissionCount`)
- [x] ADM-007 audit-log user search moved server-side · Evidence: `userSearch` in the list schema; `escapeLike` helper; count query gained the same join. §19 leading-wildcard check passed — `idx_users_name_trgm`/`idx_users_email_trgm` already exist (`0007_search_trgm_indexes.sql`)
- [x] ADGAP-033 audit-log CSV export · Evidence: same `audit-log:read` key (read from `audit-log.controller.ts:17`), streamed via `exportCsvChunks` with a 10k cap, following the `contacts.controller.ts:78-86` pattern
- [x] ADGAP-031 webhook delivery log exposed + retryable · Evidence: `GET /webhooks/:webhookId/logs` reuses `getEndpoint` so a wrong-tenant id 404s; retry calls the existing private `deliver()` after re-validating active + public host
- [ ] ADM-002/003/004 webhook form: `LoadingButton`, RHF+Zod, secret surfacing (003 partly done by the page split)
- [ ] ADM-005 `useUpdateBillingProfile.onError` reads `e.message` raw

## UI conformance (ADS-*)

- [x] ADS-003 42 control-size overrides removed across 11 files · Evidence: agent report + leave-list showing labels/captions/badges/row-actions/skeletons correctly retained
- [x] ADS-014 **all 8 over-500-line files cleared** · Evidence: 6 hierarchy pages 784/688/655/530/482/460 → 468/443/431/370/407/384; `delegations-page` 687→490; `roles-page` 556→318. Verified: **0 files over 500** across `features/crm`, `features/settings`, `components/rbac`, `components/shared`
- [x] ADS-012 6 hierarchy schemas extracted · Evidence: 0 inline `z.object` in any hierarchy page
- [x] ADS-013 18 `aria-label`s added to icon-only controls · Evidence: `title` alone fails WCAG 2.1
- [x] ADS-007 12 hardcoded `min-h-[200px]` → flex-fill chain · Evidence: 0 remain in the hierarchy folder
- [x] ADS-002 **narrowed — mostly not a violation** · Evidence: `PencilIcon`/`ArchiveIcon`/`RotateCcwIcon` return **0** matches in the 248-export `@animateicons/react/dist/lucide.d.ts`; §8 says absent icons fall back to static lucide. Genuine sites remaining: `roles-page.tsx:154,162`, `users-page.tsx:609,641`
- [x] ADUX-005 permission diff-before-apply · Evidence: Save → "Review & save" opens a `ConfirmDialog` diffing `effective` vs `baseline` (granting / revoking / rescoping with `from → to`); file 411 lines. **Audit correction:** the matrix already staged via `draft` + Reset + `role.version` 409 handling — only the preview was missing
- [x] ADUX-006 typed-name confirmation on role delete · Evidence: follows the `org-danger-zone-section.tsx` controlled-state pattern; resets on open/close/success
- [x] Administration → HRMS treatment · Evidence: kit promoted to `components/shared/rich-surface.tsx`, `hr-ui.tsx` re-exports under `Hr*` so all **14** HR importers untouched; `OrgSettingsCard` rebuilt on `RichPanel` so all 9 org sections convert from one edit
- [ ] ADS-001/004/005/006/016/018/019 — `LoadingButton` ×3 · 4 header actions (max 3) · `TABS_CONTENT_PAGE_BODY_CLASS` ×3 · `TabsList` `mb-4` · raw `Popover` where `ResponsivePopover` is required · `bg-white/30` · invalid `StatCard tone="accent"`
- [ ] ADS-010/011 9 `toast.error` literals + 3 `ErrorState` without `getErrorMessage`/`onRetry`
- [~] ADS-017 inline `style` in branding preview + org chart · Reason: live brand-colour preview and computed tree indent are legitimately data-driven; AP-8 bans hardcoded chrome, not computed values

## Capability gaps (ADGAP-*)

- [ ] ADGAP-007 **permission-groups management UI** — largest remaining item. Schema complete (`access.ts:123-230`), zero UI, so group-based access is undiscoverable. **Not blocked** — no migration needed
- [ ] ADGAP-030 webhook signing secret reveal-once + rotate (pairs with ADSEC-007)
- [ ] ADGAP-021 seat-management overview
- [ ] ADGAP-015 admin force-logout of another member
- [ ] ADGAP-011/012 SSO/SAML then SCIM — enterprise table-stakes, large
- [ ] ADGAP-035 per-user GDPR data export (org purge already exists)
- [ ] ADGAP-034/039/040 audit retention policy · org notification preferences · branding preview + domain verification
- [ ] ADUX-004 audit-log client-side filter (superseded by ADM-007 — re-verify then close)
- [ ] ADUX-007 "last changed by / when" provenance on settings sections
- [ ] ADUX-010 new-org setup checklist

## Soft delete (Administration slice)

- [!] Partial indexes on `hr_people`, `hr_employments`, `kb_spaces` — BLOCKED on D-009, and those tables belong to other programs (D-015)
- [~] Build/HR delete violations · Reason: D-015 — actively edited by other sessions; recorded per-program instead
