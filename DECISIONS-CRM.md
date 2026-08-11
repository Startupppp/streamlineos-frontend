# DECISIONS — CRM & Administration

Assumptions taken to keep work moving without supervision, per the Execution Protocol. Each records rationale and
reversal cost.

> **Concurrent programs keep separate artifacts.** `DECISIONS.md` + `TASKS.md` belong to the **Inventory** program;
> this file and `TASKS-CRM.md` / `TASKS-ADMIN.md` are mine. Status lives in `REFACTOR-STATE-CRM.md` and
> `REFACTOR-STATE-ADMIN.md`. Do not merge them.

---

## D-001 · No `UI-CONTRACT.md`; the contract is `UI-UX-SYSTEM.md` — *owner-confirmed*

A second design document would drift. `UI-UX-SYSTEM.md` was already canonical (CLAUDE.md §14) and covered ~80% of
the required contract; two design docs is the exact failure §9 names for permission catalogs.
**Reversal cost:** trivial.

## D-002 · Design system extracted from Build + Accounting + Inventory, not HR — *owner-confirmed*

HR's gradient/hero treatment is a deliberate exception (§14), so extracting from it would produce a contract wrong
for ink-first modules. Later narrowed by **D-010** for Administration only. **Reversal cost:** low.

## D-003 · No `CLAUDE.md` AI amendment

The program doc's premise ("CLAUDE.md states AI is out of scope") was **false**. CLAUDE.md mandates AI at `:177`,
`:193`, `:274`, `:276`, `:370`; `backend/src/modules/ai/**`, `/crm/settings/ai` and `crm:ai:use` all pre-exist.
**Reversal cost:** none — no change made.

## D-004 · Queued work extends the existing outbox, not BullMQ — *owner-confirmed*

`common/outbox/` already provides writer + publisher + flush controller over `outbox_events`/`inbox_records`
(`schema/common/outbox.ts:29,87`), drained by `cron`. `@upstash/redis` is HTTP REST and cannot back BullMQ.
**Reversal cost:** medium if a real queue is later needed.

## D-005 · Gemini via the existing AI gateway — *owner-confirmed, one caveat outstanding*

Zero-retention terms with Google are **not** confirmed. Per the defaults doctrine ("may data leave to a third-party
provider? assume no"), **no new CRM data-egress path was built.** **Reversal cost:** low now, high once retrieval
indexes tenant content.

## D-006 · Repo conventions beat the program document

`org_id` not `tenant_id` (0 `tenantId` hits in `schema/crm/`, 340 `orgId`); `@RequirePermission` +
`PermissionGuard` + DataScope, not "module-level RBAC". **Reversal cost:** none.

## D-007 · Money left as `decimal` for now

CLAUDE.md §19 wants integer cents; CRM uses `decimal(15,2)`/`decimal(18,4)` nearly everywhere
(`crm_pricebook_entries.unit_price_cents` is the lone conformant column). A money-type change touches every
financial read and write and needs a migration — blocked by **D-009**. Logged as `SCH-006`, not attempted.
**Reversal cost of deferring:** low; of doing it wrong: high.

## D-008 · Dead CRM surfaces deleted rather than stubbed

`deal-orders-section.tsx` and `lead-attachments-section.tsx` called endpoints with **0** controller hits. A control
that 404s silently is worse than an absent feature (§0.9, §16). Non-use proven per §25 before deleting.
**Reversal cost:** trivial — `git` restores them; the backends never existed.

## D-009 · ⛔ Migrations NOT generated — hard external blocker (attempted, evidenced)

`npx drizzle-kit generate` **fails**: `promptNamedWithSchemasConflict` inside `enumsResolver` requires an
interactive TTY, which this environment lacks. Verified afterwards that the journal is **byte-identical** and no
`.sql` was written (168 files → 168; 147 journal entries → 147).
**Compounding:** 7 schema files are staged by concurrent sessions (`build/core.ts`, `build/members.ts`,
`build/relations.ts`, `build/ticket-core.ts`, `build/workflow.ts`, `common/email.ts`,
`common/notifications-delivery.ts`), so a successful generate would also bundle their in-flight work.
**Blocks:** consent tables · partial indexes · `deals`/`quotes`/`crm_campaigns` soft-delete columns · saved views ·
contact↔many-accounts · the money-type change.
**This is the protocol's one legitimate stop condition** — a step only a human at a terminal can complete. All
non-schema work continued.
**To unblock:** run `pnpm -C backend db:generate` interactively, answer the enum prompt, confirm the emitted SQL
contains only the intended objects, then `db:migrate`.

## D-010 · Administration follows the HRMS treatment — *owner instruction*

The HR chrome kit was promoted to `components/shared/rich-surface.tsx` and re-exported from
`features/hr/shared/hr-ui.tsx` under the `Hr*` names, so all 14 HR importers were untouched. `rounded-2xl` and
`backdrop-blur` are sanctioned for HR **and** Administration only, overriding DS-001/AP-4 there.
**Recorded as a living rule** in CLAUDE.md §14 and UI-UX-SYSTEM.md §2.

## D-011 · API tokens are CRM-level only — *owner instruction*

My earlier "fix" (un-gating the controller, inventing `settings:org-api-tokens:*`) was **wrong and fully reverted**;
zero residual references verified. ADSEC-F04 is **withdrawn** — the two surfaces were already correctly separated.
**Keeper:** `settings:api-tokens:read`/`write` are `EMPLOYEE_SELF_SERVICE` keys for *personal* tokens — never reuse
them for anything org-scoped, or any employee can mint org-wide credentials.

## D-012 · Soft delete default, short hard-delete exception list — *owner instruction*

Hard delete only for join/link rows, unsent drafts, terminal invitations, session/token revocation, and explicit
DPDP/GDPR erasure. **Recorded** in CLAUDE.md §19. Audit: `docs/soft-delete-audit-2026-08-11.md`.

## D-013 · Four leads reads deliberately left unfiltered

Merge winner/loser lookups (filtering breaks idempotent retry), the post-commit winner read, and both intake dedupe
scans — a merged phone/email is still "in the system" and a new lead reusing it *should* be flagged.
**Reversal cost:** trivial, but reversing reintroduces a merge bug.

## D-014 · CRM tables measured empty here; production still assumed populated

**Measured, not assumed:** `contacts`, `crm_people`, `crm_companies`, `crm_deals`, `crm_leads`,
`crm_organizations`, `deals`, `leads` all return **0 rows across 0 orgs** — a freshly rebuilt dev DB.
This resolves `OPEN-04` **for this environment only**. Per the defaults doctrine ("assume live production
tenants"), SCH-002 is treated as a **code repoint** safe to make and test here, while a production
backfill/discrepancy check remains **required before deploy**. No figures are rewritten and no table is dropped.
**Reversal cost:** none.

## D-016 · Consolidated onto the pre-existing SSRF guard; deleted my duplicate

I wrote `common/security/safe-external-url.ts` for the webhook SSRF fix without first listing
`common/security/` — where `ssrf-guard.ts` already existed, was used by 3 modules, and was **strictly stronger**:
it normalises the packed `::ffff:7f00:1` spelling (mine only handled the dotted form, so mine had a real bypass),
strips IPv6 zone ids, blocks `ff00::/8` and `192.0.0.0/24`, returns a typed rejection reason, and ships a spec.
**Corrected:** schemas now use `assertSafeWebhookUrl`, the dispatcher uses `checkWebhookUrl` and logs the typed
reason, my file is deleted, 0 references remain, BE typecheck unchanged at 3 pre-existing errors.
**Reversal cost:** none. **Lesson:** list the shared utility folder before writing a helper (§0.2).

## D-015 · Violations outside CRM/Administration recorded, not fixed

Over half the soft-delete violations sit in `build/**` and `hr/**`, actively edited by other sessions (7 staged
schema files; migrations 0146 and 0413 staged by them). Touching those would collide. Recorded per-program in
`docs/soft-delete-audit-2026-08-11.md`. **Reversal cost:** none.
