# REFACTOR-STATE — Access Control / RBAC

> Concurrent programs keep separate trackers. Build → `REFACTOR-STATE.md`. CRM → `REFACTOR-STATE-CRM.md`.
> This file is the platform-wide authorization program.

**Scope:** authorization model, resolution, registry, enforcement, caching, audit, tests — both repos
**Phase:** 0 — Audit (read-only). **Complete.** Gated on decisions D-1…D-4.
**Updated:** 2026-08-10

## Decisions taken

| Question | Decision |
|---|---|
| Brief's "AI is out of scope" contradiction | **Rejected as a false premise** — `CLAUDE.md` mandates AI in §15/§16/§20/§23. No amendment made. |
| Branch / commits | Stay on `main`, no commits until asked (§0.11) |
| Sequencing | This program runs **before** the HRMS/PM/CRM module prompts — they assume one correct access layer |
| CASL | Stays removed. No external policy engine. |
| **D-1** — AI and permission data | Permission data (role names, group membership, org hierarchy, grant history) must not egress to a model provider. AI is barred from the authorization decision path; may never write a permission table; explanations render the deterministic resolution trace, not reason about policy. Tenant free-text is data, never instruction. |
| **D-2** — Org ↔ module precedence | Org admin implies module admin; per-user module denies do not override an org-level grant. The org-admin test must be structural (`organizationMembers.role` / `isOwner`), not permission-derived. The current divergence between structural (`isOwnerOrAdmin`) and `grantsOrgAdmin()` is finding AC-04. |
| **D-3** — Support staff in-tenant access | Impersonation controls (time-boxed, requires reason, visually unmistakable, blocked from sensitive actions, separately audited to an immutable log) must be designed before that feature ships. No impersonation code exists today. |
| **D-4** — `team` DataScope | Approved to go live once materialised — the correlated `org_unit_members` subquery in `apply-scope.ts` must be replaced with a materialised view before exposure (finding AC-P3). |

## Environment (verified)

- `AccessService` `backend/src/modules/access/` · registry `modules/rbac/permissions/` (34 files)
- 496 controllers · **3,357 endpoints** · 3,073 gated · 176 `@Public` · **117 undeclared**
- 648 permission keys, **frontend/backend parity exact (648 = 648)**, zero ghost keys
- 12 entitlement modules vs **35 permission namespaces**
- Global guards: `JwtAuthGuard`, `MfaGuard`, `ModuleGuard`. **`PermissionGuard` is NOT global.**
- No impersonation, no in-tenant platform-staff role. Multi-org yes. Guest/portal/agent tokens yes.
- Sweep tool: `scripts/audit-endpoint-coverage.mjs`

## Findings — open

Full audit with evidence: **`docs/refactor/access-phase0-audit.md`** (16 findings, 12 verified non-findings).

| ID | Sev | One-line |
|---|---|---|
| ~~**AC-02**~~ | ~~**P0**~~ | **FIXED — verified 2026-08-11 by the Notifications program.** `createChatTokenRequest` now issues `chat:${orgId}:${channelId}` per member channel from a DB membership query (`ably.service.ts:35-43`, `chat-channels.service.ts:59-72`); `ably.service.spec.ts:47-57` asserts no wildcard. Residual, tracked in `REFACTOR-STATE-NOTIFICATIONS.md` as RT-005/RT-006: the **support** token still grants `support:${orgId}:*` (`ably.service.ts:91-95`), and Ably tokens have a 1h TTL with no `revokeTokens` call on deactivation |
| AC-03 | High | Emptying a role's grants silently restores its compile-time default set at scope `all` |
| AC-01 | High | `PermissionGuard` not global → a new endpoint fails **open**; 117 undeclared endpoints today |
| AC-04 | High | `settings:manage` / `settings:rbac:manage` = full org superuser, and bypasses per-user module denial |
| AC-06 | Med | 23 of 35 permission namespaces have no entitlement gate and no declared entitlement class |
| AC-10 | Med | Undeclared record-level authz system (`project_members.role`, `chat_channel_members.role`, `kb_space_grants`) with string-literal role checks |
| AC-09 | Med | module-access's 21 endpoints authorize in-service via a dynamic key the registry cannot express → CI can never cover them |
| AC-14 | Med | Field-level restriction is done by splitting endpoints, not by serialization redaction |
| AC-11 | Med | 64 `applyScope` sites for 44 scopable keys; unapplied scope silently behaves as `all` |
| AC-07 | Med | Permission denials are never logged |
| AC-08 / 08b | Med | Revocation lags 5s (perms) / 15s (membership) cross-node; invalidation fires pre-commit |
| AC-P3 | Med | `team` scope runs a correlated `org_unit_members` subquery per request — not materialised |
| AC-05 | Low | `rbacScope ?? "all"` in 4 controllers — latent (guards are mounted), fails open if a guard is dropped |
| AC-12 / AC-15 | Low | Last-admin check is outside the transaction (TOCTOU) and disagrees with the AC-03 defaults path |

## Non-findings — verified, do not re-raise

- **Entitlement is checked before the owner bypass** (`authorize.ts:29` precedes `:33`) — entitlement and permission are genuinely separate. Best property of the current design.
- **Permissions are fully normalised** — no arrays, no JSONB, no bitmasks. The brief's "single most important change" is already done.
- Frontend/backend catalog parity exact, test-enforced. Zero ghost keys.
- `POST /public/kb/ask` filters `published`+`public` in SQL and short-circuits before embedding — denial-of-wallet safe.
- Cron / `session-data/:userId` / agent routes are `@Public` but each asserts a secret or a token guard, failing closed.
- Role edits already have optimistic locking (`roles.version` CAS → 409).
- Last-admin protection, `role_assignments.expires_at`, and delegation temporal bounds all exist.

## Phase 0 status

Complete. **Gate: findings + D-1…D-4 need approval before any code change.**
Recommended first slice: **AC-02 alone** (P0, self-contained), then AC-03 → AC-01 → AC-04.

## Not done in Phase 0

- Per-endpoint review of the ~16 residual undeclared endpoints (`search`, `storage`, `storage-vault`, `hr-document-types`, `announcements`, `emergency/respond`, `portal-client`)
- Per-tenant permission matrix export (needs AC-03 fixed to be truthful)
- p95 attribution for authorization cost (Build baseline does not isolate it)
- Background-job permission capture, webhook/API-key scoping, export rate-limiting — enumerated but not traced
