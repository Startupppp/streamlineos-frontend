# Wave 2 — Module-authority unification (the delicate remaining piece)

> Status: **DESIGN + DANGER ANALYSIS. Do NOT execute autonomously.** Requires a booted
> app + e2e verification. This doc exists so nobody "just switches the source" and causes a
> security regression or a tenant-wide lockout.

## TL;DR

Module enablement is enforced by **two independent runtime paths that read different stores
with INVERTED default semantics and DIFFERENT key vocabularies.** They are kept loosely in
sync by `EntitlementsService.setModuleEnabled` (dual-write), but they are NOT interchangeable.
Unifying them is an expand → backfill → converge → contract migration, not a one-line edit.

## The two enforcement paths (verified in-repo)

| | Path A — `@RequireModule` | Path B — `@RequirePermission` |
|---|---|---|
| Guard | `ModuleGuard` (`common/rbac/module.guard.ts:21`), per-controller `@UseGuards(JwtAuthGuard, ModuleGuard)` | `PermissionGuard` → `authorize.ts:20` (`access.isModuleEnabled`) |
| Store read | `organizations.enabled_modules` **text[] array** | `org_modules` table |
| Source into request | `jwt-auth.guard.ts:261` `fetchOrgContext` selects `organizations.enabledModules` into `req.user.enabledModules` (server-resolved, TTL-cached — NOT baked in the JWT) | `EntitlementsService.getModuleMap` (`entitlements.service.ts:102`), Redis + 15s local cache |
| Default when unconfigured | **DENY** — module enabled only if its name is present in the array (allowlist) | **ALLOW** — `isModuleEnabled` returns `true` when the key is absent from the map (`entitlements.service.ts:132`) |
| Vocabulary | UPPERCASE org-module names: `HR`,`CRM`,`PROJECTS`,`FINANCE`,`HELPDESK`,`SURVEYS`,`PAYROLL`,`SIGN` | lowercase module keys: `hr`,`crm`,`projects`,`accounting`,`support`,`surveys`,`payroll`,`sign` |
| Mapping | — | `MODULE_KEY_TO_ORG_MODULE` (`entitlements.service.ts:30`) maps key→array-name (`accounting→FINANCE`, `support→HELPDESK`); core keys (`kb`) have no array name and are always-on |

`ModuleGuard` compares case-insensitively (`m.toUpperCase() === required.toUpperCase()`), so
`@RequireModule("projects")` matches array entry `PROJECTS`. But `@RequireModule("accounting")`
would need array entry `ACCOUNTING` — the array actually stores `FINANCE`. Any controller that
mixes the two vocabularies is a latent bug; audit `@RequireModule(...)` call-sites against the
mapping before converging.

## Why a naive switch is dangerous

Live data (2026-07-26, `neondb`): **`org_modules` has 2 rows across 12 orgs.** So for 10 orgs
`getModuleMap` is empty → `isModuleEnabled` returns `true` for everything (allow-by-default),
while `enabled_modules` is a populated allowlist that genuinely denies unlisted modules.

- **Switch `ModuleGuard`/`fetchOrgContext` to read `org_modules`** → those 10 orgs go from
  "only allowlisted modules" to "ALL modules enabled" = **silent privilege/module-exposure
  regression** (a paid/disabled module becomes reachable).
- **Switch `isModuleEnabled` to read the array** → allow-by-default becomes deny-by-default =
  every org that never populated the array **loses access** to modules it currently uses = lockout.

Neither store is a safe drop-in for the other until they are **reconciled to identical contents
under one chosen semantic.**

## Safe unification (expand → backfill → converge → contract)

Pick **`org_modules` as the single canonical store** (it is a real table: per-row `enabled`,
FK to `organizations` [added 2026-07-26 `fk_org_modules_org`], auditable `enabled_by`/`enabled_at`,
already the billing/entitlements authority). Choose **explicit opt-out** semantics (a row per
non-core module per org; absence = allow only as a migration-safety fallback, eliminated at contract).

1. **Backfill (data migration, idempotent):** for every org, materialize `org_modules` rows from
   the current effective state so both stores agree BEFORE changing any read path. For each
   non-core module key `k` with array-name `A = MODULE_KEY_TO_ORG_MODULE[k]`:
   `enabled = (A = ANY(organizations.enabled_modules))`. Insert `(org_id, k, enabled, 'system')`
   `ON CONFLICT (org_id, module_key) DO NOTHING` (never clobber an explicit admin toggle).
   Core keys (`kb`, and anything with no array-name) are always-on — no row. After this,
   `getModuleMap` is fully populated and its opt-out default never fires in practice.
2. **Verify parity (read-only):** for all orgs, assert `ModuleGuard`'s array verdict ==
   `isModuleEnabled`'s verdict for every catalog module. Zero mismatches gate step 3.
3. **Converge reads:** point `fetchOrgContext` (`req.user.enabledModules`) at `org_modules`
   (emit the UPPERCASE array-names for the modules whose `org_modules` verdict is enabled, so
   `ModuleGuard`'s existing comparison keeps working unchanged) — OR refactor `ModuleGuard` to
   call `isModuleEnabled` directly (async guard; inject `AccessService`). Keep `setModuleEnabled`
   dual-writing the array during the overlap window so a rollback is trivial.
4. **Contract:** once both paths read `org_modules` in prod and parity holds for ≥1 release,
   stop writing `enabled_modules`, drop it from `fetchOrgContext`, and (later, Wave 9) drop the
   column. Remove the vocabulary mapping's array half.

## Measured parity (neondb, 2026-07-26, 12 orgs) — read-only

Ran the STEP-0 parity check live. Per non-core module, counting orgs where the two paths disagree:

| module | array=ON, org_modules=OFF | array=OFF, org_modules=ALLOW (the gap) |
|---|---|---|
| payroll | 0 | **12 / 12** |
| surveys | 0 | 11 |
| sign | 0 | 11 |
| support | 0 | 7 |
| inventory | 0 | 7 |
| accounting | 0 | 7 |
| crm | 0 | 5 |
| projects | 0 | 3 |
| hr | 0 | 3 |

**Two conclusions:**
1. **`array=ON & org_modules=OFF` is ZERO everywhere** → converging every read path onto `org_modules`
   would NEVER revoke a module an org's allowlist currently grants. The convergence direction is safe.
2. **The gap is real and large.** For every (org, module) in the right column, an endpoint gated ONLY by
   `@RequirePermission("<module>:*")` (no `@RequireModule`) is reachable even though the org's allowlist
   excludes that module — because `isModuleEnabled` allow-by-defaults an absent key. **This is an A05
   (Broken Function-Level Authorization) finding**, independent of the redesign: module-gating via the
   PermissionGuard path does not enforce enablement for unconfigured modules. The backfill (materializing
   explicit `enabled=false` rows) is what closes it. Endpoints that ALSO carry `@RequireModule` are already
   denied by `ModuleGuard`(array), so for those the backfill is a behavior-preserving no-op; the true blast
   radius is exactly the `@RequirePermission`-only endpoints of these modules — audit those before applying.

## Code touch-points

- `common/auth/jwt-auth.guard.ts:261` — `fetchOrgContext` array select (the source of `req.user.enabledModules`).
- `common/rbac/module.guard.ts:21` — the array allowlist check.
- `modules/access/authorize.ts:20` — the `isModuleEnabled` (org_modules) check.
- `modules/access/entitlements.service.ts` — `getModuleMap` / `isModuleEnabled` / `setModuleEnabled` / `MODULE_KEY_TO_ORG_MODULE` / `CORE_MODULE_KEYS`.

## Tests required before "done" (§27)

- Unit: `ModuleGuard` allows/denies correctly when fed an `org_modules`-derived `enabledModules`;
  `isModuleEnabled` opt-out default; vocabulary mapping for `accounting→FINANCE`, `support→HELPDESK`.
- Migration: backfill is idempotent, never clobbers an explicit `enabled=false` row, and produces
  zero parity mismatches on a snapshot of prod data.
- e2e (needs booted app): an org with module X disabled gets 403/ModuleDisabled on both an
  `@RequireModule("X")` route and an `@RequirePermission("X:*")` route; enabling X flips both.

## Do-not

- Do NOT change any read path before the backfill + parity check pass.
- Do NOT assume `org_modules` is populated — it is sparse today (2/12 orgs).
- Do NOT drop `enabled_modules` until both paths read `org_modules` in prod for a full release.
