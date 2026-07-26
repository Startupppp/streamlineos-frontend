# GO-LIVE runbook — apply the staged redesign work

> Everything built this engagement is **written, typecheck-verified, and additive/idempotent**, but
> nothing is live because **Neon compute is out of quota** ("exceeded the compute time quota"). This is
> the single ordered sequence to run the moment the database is reachable again. Do it on a **Neon
> branch first**, then repeat on the real DB.

## 0. Prerequisite — restore the database (only you can do this)
The migration attempt failed with `Your account or project has exceeded the compute time quota. Upgrade
your plan to increase limits.` Options, any one:
- Upgrade the Neon plan (raises the compute quota), OR
- Wait for the monthly compute-quota window to reset, OR
- Point `backend/.env` `DATABASE_URL` at a fresh Neon project/branch with quota.
Confirm it's back: `node --env-file-if-exists=backend/.env backend/scripts/apply-migration-file.mjs docs/schema-migration/additive-schema-migration.sql` prints `DB=<name> USER=<name>` instead of the quota error.

## 1. Apply the staged schema (additive, idempotent — safe)
```
node --env-file-if-exists=backend/.env backend/scripts/apply-migration-file.mjs \
  docs/schema-migration/additive-schema-migration.sql \
  docs/schema-migration/wave-1-ownership-migration.sql
```
- `additive-schema-migration.sql` creates: `managed_products` (+ `projects.managed_product_id`), the `directory/` tables (organization_people, workers, worker_engagements), the `party/` tables (business_parties, party_contacts, party_addresses), and the `portal-access/` tables (portal_memberships, portal_invitations, project_client_grants) + their enums/indexes.
- `wave-1-ownership-migration.sql` runs §A (membership status/lifecycle + `owner_membership_id`) + §B (the deterministic owner-pointer bootstrap). Watch the `NOTICE:` lines — they report every org that had multiple owners (collapsed), no owner (elected), or no members (quarantined).

## 2. Verify ownership, then lock it in
Run the `§VERIFY` queries at the bottom of `wave-1-ownership-migration.sql`. Both must return **zero rows**
(no member-having org without an owner; exactly one `is_owner` per org). **Only then** uncomment and run
`§C` in that file (deferred composite FK `(id, owner_membership_id) → organization_members(org_id, id)`,
the `owner_membership_id NOT NULL`, and the owner-lifecycle guard trigger).

## 3. Boot + smoke-test (proves the code side)
```
pnpm -C backend build && pnpm -C backend start:dev
pnpm -C frontend dev   # once the concurrent Inventory/HR/payroll build breakage is resolved
```
Verify end to end:
- Ownership: create 2 orgs, transfer ownership, confirm the former owner loses owner powers next request; a sole owner cannot leave.
- The 5 new admin surfaces: `/directory` (People), `/directory/workers` (Workforce), `/parties` (Business Parties), `/projects/managed-products` (Managed Products), `/client-access` (Client Access) — each does list + create/edit gated by its RBAC key.

## 4. Then the DB-gated waves (I drive these once §1–3 pass)
- **Wave 2 finish** — unify JWT `enabledModules` → `org_modules` (module.guard / jwt-auth.guard); add `org_modules → organizations` FK.
- **Wave 4** — composite tenant FKs `(org_id, id)` + `(org_id, parent_id)`, fix billing integer `org_id`, replace polymorphic groupRoles/resourceGrants (per `wave-7-composite-fk-matrix.md`).
- **Wave 5** — membership-based role assignment tables + backfill from `user_roles.user_id`, retire `users.role` fallbacks, grantable-subset + rank enforcement, real own/team/all scope adapters.
- **Wave 6** — map existing `clients`/`crm_organizations`/`inv_vendors` onto `business_parties` behind adapters; move support tickets out of `crm/billing.ts`.
- **Wave 7** — `pm_workspaces` hierarchy + `pm_workspace_memberships` (rename `project_workspace_members`) + backfill; CRM Offer↔Inventory SKU fulfillment.
- **Wave 8** — the §7 UI IA (Organization/Modules switcher rename, Administration People/Access/Structure, isolated `/portal` shell, ungate `/users`), and the `projects`→`product-management` rename — **only after the concurrent Projects/HR/Inventory sessions are committed/quiet.**
- **Wave 9** — FORCE RLS on the approved table inventory, repo-wide dead-code sweep (`wave-12-dead-code-inventory.md`), contract/retirement.

## Follow-ups noted
- After Wave 7's `pm_workspaces`, add `pm_workspace_id` to `managed_products`/`project_client_grants` + the tenant-composite FKs (deferred plain columns exist now).
- Directory workers/party contacts: add a person/contact picker to the create dialogs (currently accept an id).
