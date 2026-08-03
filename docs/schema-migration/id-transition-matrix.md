# ID-transition matrix (T0.3 seed) — release gate before Wave 7

> Per-table record of ID types + the transition to descriptive names (§0 rule: no bare `id`) and
> tenant-composite FKs. This SEED holds the facts verified 2026-07-26; each wave fills in its tables
> before Wave 7 introduces constraints. **A cast between mismatched `org_id` types is a defect, not a
> convention** — those rows are the priority repairs.

## Canonical tenant key
`organizations.id` = **`text`** (`backend/src/db/schema/auth.ts:10`). Every tenant child's `org_id`
must be `text` with an FK to it (global-identity/auth tables excepted).

## Confirmed rows (verified in-repo)

| Table | Current PK | Current `org_id` | Matches tenant? | FK present? | Target PK (descriptive) | Notes / repair |
|-------|-----------|------------------|-----------------|-------------|-------------------------|----------------|
| `organizations` | `id text` | — | — | — | `organization_id text` | canonical tenant |
| `organization_members` | `id serial` (int) | `org_id text` | ✅ | ✅ | `organization_membership_id` | already stable int PK; add `status` (Wave 1) + `UNIQUE(org_id,id)` |
| `users` | `id text` | (global) | n/a | n/a | `user_id text` | global identity; also carries legacy `department_id int`, `branch_id int`, `org_department_id text` → collapse (Wave 4) |
| `invitations` | `id text` | `org_id text` | ✅ | ✅ | `invitation_id` | token plaintext → hash (Wave 4) |
| `user_memberships` | `id text` | `org_id text` | ✅ | ✅ | (retire — placement source) | Wave 5 |
| `org_modules` | `id uuid` | `org_id varchar(36)` | ⚠️ type≠text | ❌ **no FK** | `org_module_id` | add FK + standardize (Wave 3/7) |
| `billing_profiles` | `id serial` | **`org_id integer`** | ❌ **int≠text** | ❌ | `billing_profile_id` | **DEFECT** — Wave 7 T7.2 |
| `app_installations` | `id serial` | **`org_id integer`** | ❌ | ❌ | — | **DEFECT** — Wave 7 T7.2 |
| `affiliates` | `id serial` | **`org_id integer`** | ❌ | ❌ | — | **DEFECT** — Wave 7 T7.2 |
| `revenue_events` | `id serial` | **`org_id integer`** | ❌ | ❌ | — | **DEFECT** — Wave 7 T7.2 |
| `org_ai_credits` | `id` | `org_id text` | ✅ | ✅ | — | OK |
| `ai_credit_transactions` | `id` | `org_id text` | ✅ | ✅ | — | OK |
| `enterprise_quotes` | `id` | `org_id text` | ✅ | ✅ | — | OK |
| finance AR/AP (`finance-ar-ap.ts`) | various | `org_id text` | ✅ | ✅ | — | OK (the plan's "AR mismatch" was wrong; defect is in `billing.ts`) |
| org hierarchy (`organization.ts`) | `id text` | `org_id text` | ✅ | ✅ | descriptive | OK |
| `groupRoles` (`access.ts`) | — | — | — | polymorphic `group_id int`, **no FK** | typed table | Wave 7 T7.4 |
| `resourceGrants` (`access.ts`) | — | — | — | polymorphic `resource_id`/`principal_id`, **no FK** | typed table | Wave 7 T7.4 |

## To inventory (each wave adds its tables)
- projects/* (`workItemRelations` reportedly lacks `org_id`; `ticketCommentReactions.orgId`,
  `projectAutomations.orgId` bare text, no FK — per prior Projects audit; re-verify in Wave 8).
- crm/*, inventory/*, hr/*, payroll/*, accounting/*, support/*, kb/*, surveys/*, signos/*.

## Method (per table, before Wave 7)
Record: child table/column · parent table/key · tenant ownership · current & target ID type ·
required candidate key · composite FK definition · nullability · invalid-row repair/quarantine query ·
migration wave · validation state · cutover owner. Native-UUID conversion of the core graph is a
**separate later program** (shadow columns) — not part of Waves 0–12.
