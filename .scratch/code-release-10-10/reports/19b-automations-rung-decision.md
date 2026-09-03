# 19b — Custom fields moved; automations needs a rung nobody can invent

Ticket 19's Settings box named fifteen module surfaces sitting at a global `/settings/*` path.
Six moved in pass 3, four moved here, and **five are left — all of them automations, and they are
left because the answer is a product decision, not because the mechanism is missing.**

---

## Closed here — custom fields (4 routes)

`/settings/custom-fields[…]` is now `CrmCustomFieldsModule` behind `crm:custom-fields:view|manage`.

Why this one was mechanical and automations is not: `custom_field_definitions` is one table serving
CRM, Support (`ticket`), HR (`employee`) and Build, but **these four routes constrain both their
reads and their writes to `lead | deal | contact`** — the entity enum in the request schema and the
predicate on every read, update and delete. The route is provably CRM-only in both directions, so a
CRM-namespaced key is not a judgement call.

The sharp edge that ruled out the cheap fix, recorded so it is not retried: **do not widen the global
rung.** `settings:custom-fields:manage` is not module-scoped, so adding it to `CRM_MODULE_ADMIN`
would have let a CRM admin manage HR's and Support's field definitions through the same global path.
That trades a 403 for a cross-module privilege. Naming the keys in the `crm` namespace is what puts
them on the module rung: `moduleScopedPermissions("crm")` picks them up with no
`MODULE_ADMIN_EXTRA_KEYS` entry, and `RoleGrantReconcilerService` delivers them to organisations that
already exist — **no backfill migration**, which is also why none was written (see the last box).

Every old path survives one release on `SettingsDeprecatedRoutesController` under the shared
`SETTINGS_ALIAS_SUNSET`, with a `Link` header to the canonical path.

---

## Open — automations (6 routes, 5 not shared with the above)

`GET|POST /settings/automations`, `GET|PATCH|DELETE /settings/automations/:ruleId`,
`GET /settings/automations/:ruleId/runs`, behind `settings:automations:view|manage` — a pair held by
**ORG_ADMIN and OWNER only: no seeded rung, no role template**. A `CRM_MODULE_ADMIN` cannot open the
automations screen for CRM's own rules today.

### Why no single module rung fits

Counted from `automationTriggerSchema` in `settings.schemas.ts` — **48 triggers across four modules**:

| module | triggers | examples |
|---|---:|---|
| HR | 27 | `candidate.*`, `interview.*`, `offer.*`, `onboarding.*`, `leave.*`, `attendance.*`, `resignation.*`, `employee.*`, `certification.*`, `review.*` |
| CRM | 8 | `lead.created`, `lead.status_changed`, `deal.stage_changed`, `deal.won` |
| Support | 7 | `ticket.created`, `ticket.escalated`, `sla.breached` |
| Accounting | 6 | `invoice.overdue`, `invoice.paid`, `expense.submitted`, `reimbursement.approved` |

Actions cut across too: alongside the generic `notify_roles` / `notify_all` / `email` /
`create_task` / `webhook` there are four Support-specific ones (`support_assign_ticket`,
`support_set_priority`, `support_add_tag`, `support_internal_note`). **A rule is one row with one
trigger, so the surface is per-rule module-scoped while the routes are not.**

### The four options

**Option 1 — leave it global, and give the global rung a home.**
Keep `settings:automations:*`; add it to no module rung. Automations stay an org-admin capability.
- Costs nothing, changes nothing, and is honest: a rule that fires on `sla.breached` and creates a
  CRM task genuinely is a cross-module object.
- Forecloses per-module delegation forever. A CRM admin cannot manage CRM's own rules without
  org-admin, which is the complaint that opened this box.

**Option 2 — derive the module from the trigger and gate per row.**
Routes move to `/<module>/settings/automations`; the list filters on the trigger's module prefix; the
write routes resolve the module from `triggerEvent` and require `<module>:automations:manage`.
- The only option that actually delegates. Four new key pairs, one mapping table
  (trigger prefix → module key), and the mapping becomes a contract: a new trigger with an unmapped
  prefix must **fail closed**, not fall through to a default.
- Two real hazards. A `PATCH` that changes `triggerEvent` moves the row between modules, so it must
  require `manage` on **both** the old and the new module or it is a privilege-escalation seam. And
  the four `support_*` actions mean a CRM-triggered rule can act on Support data, so the action set
  needs its own check or a CRM admin gets a Support write.

**Option 3 — a first-class `automations` module key.**
`automations:view|manage` with its own module rung and an `AUTOMATIONS_MODULE_ADMIN`.
- Clean, no cross-module seam, no per-row resolution.
- Adds a module to `modules_catalog` and to entitlements, and creates a new admin persona for what is
  a configuration screen. Note the live hazard: organisation creation already raises `23503` when a
  module key has no `modules_catalog` row (found in pass 3), so this option carries a seeding step
  that must land before the key is referenced anywhere.

**Option 4 — split by ownership: generic rules global, module-specific rules module-scoped.**
Rejected on inspection rather than offered as a real choice: there is no field on the rule that says
which it is, so "generic" would have to be inferred from the trigger — which is Option 2 with an
extra state.

### Recommendation, and what it does not decide

**Option 2**, because it is the only one that answers the complaint, and because the mapping it needs
already exists implicitly in the trigger vocabulary. It is not adopted here: the trigger→module map,
the re-trigger `PATCH` rule and the `support_*` action check are all product calls with security
consequences, and the brief's instruction was to record the options, not to invent a rung.

**Whichever option is chosen, do not write a permission or template backfill migration.**
`RoleGrantReconcilerService` delivers template key additions at boot, so a backfill produces a dead
migration and carries a slug trap. `backend/CLAUDE.md` §5 still instructs one — **that instruction is
wrong and should be corrected by whoever owns that constitution file.** It is reported here rather
than edited, because a constitution file is not this ticket's to change.
