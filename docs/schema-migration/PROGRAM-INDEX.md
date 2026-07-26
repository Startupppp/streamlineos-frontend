---
type: program index — canonical wave map + critical-path execution checklist
status: LIVING
date: 2026-07-26
authority: docs/schema-change-plan.md §9 (waves 0–9) is canonical
---

# Platform redesign — program index & critical path

> **One source of truth for "what runs next."** The authoritative wave numbering is
> `docs/schema-change-plan.md` §9 — a **10-wave program (0–9)**. Older topic-design docs use a
> divergent numbering (they go up to `wave-12`); §1 below maps them so nothing is orphaned.
> Tags: **[DB]** needs the user's Neon (AI cannot run) · **[CODE]** implementable now ·
> **[TIME]** elapsed-time observation gate · **[COLLISION]** user is actively editing these files.

---

## 1. Canonical wave map (reconciles both numbering schemes)

| Canonical wave (schema-change-plan §9) | Execution plan (this session) | Related topic-design docs (older numbering) |
|---|---|---|
| **0 — Migration control plane** | `wave-0-baseline-migration-runbook` **[DB]** | `wave-0-control-plane`, `wave-0-pm-reconciliation-adr`, `wave-0-rls-matrix`, `wave-0-composite-fk-matrix-{hr-payroll,inventory-finance,crm-projects-misc}`, `wave-0-id-transition-matrix-modules`, `wave-0-doc-contradiction-inventory`, `wave-4-schema-folder-reorg-map`, `id-transition-matrix` |
| **1 — Tenant invariants** | `wave-1-execution-plan` | — |
| **2 — Module authority** | `wave-2-6-execution-plan` (part 1) | `wave-2-module-authority-unify` |
| **3 — Directory & Workforce** | `wave-3-execution-plan` | `wave-5-directory-workforce-design` ⚠️ *(older doc numbered this "wave 5")* |
| **4 — Tenant-safe FKs** | `wave-4-execution-plan` | `wave-7-composite-fk-matrix`, the three `wave-0-composite-fk-matrix-*` |
| **5 — RBAC correctness** | `wave-5-execution-plan` | — *(note: name-collides with the older `wave-5-directory` doc, which is really Wave 3)* |
| **6 — Business Party** | `wave-2-6-execution-plan` (part 2) | `wave-6-business-party-design` |
| **7 — PM + module boundaries** | `wave-7-execution-plan` | `wave-8-pm-hierarchy-design` *(SUPERSEDED → pm-reconciliation-adr)* |
| **8 — Administration & portal UX** | `wave-8-execution-plan` | `wave-9-portal-audience-design` ⚠️ *(older doc numbered portal "wave 9")* |
| **9 — Contract & retirement** | `wave-9-infra-retirement-plan` | `wave-10-rls-matrix` *(overlaps `wave-0-rls-matrix`)*, `wave-12-dead-code-inventory`, `GO-LIVE-runbook` |

**Reconciliation actions (housekeeping, user's call):**
- Keep `wave-0-rls-matrix` (54 KB, 134 tables) as canonical; fold/retire `wave-10-rls-matrix` (5 KB).
- The older `wave-5-directory-workforce-design` is really canonical **Wave 3**; cross-reference or rename.
- The older `wave-9-portal-audience-design` is canonical **Wave 8** (portal UX) + feeds **Wave 9** (portal-auth).

---

## 2. Critical-path execution checklist (dependency-ordered)

### GATE 0 — must run before anything downstream  **[DB]**
- [ ] **0.1** Create `prod-recon-baseline` Neon branch (backup). *(single most important safety step)*
- [ ] **0.2** Reconcile journal drift: journal the 3 un-journaled SQL files, fix out-of-order idx, convert `branch-sync-project-teams.sql` into a real migration. → `wave-0-baseline-migration-runbook`
- [ ] **0.3** Generate + apply migrations for the 5 code-only tables (`organization_people`, `workers`, `worker_engagements`, `pm_workspaces`, `pm_workspace_memberships`).
- [ ] **0.4** Prove a clean DB reaches the same head reproducibly (Wave 0 exit criterion).
- [ ] **0.5** **Neon pooler transaction-locality test** — prove `set_config(...,true)` is transaction-local under the actual pooler. *(hard gate for ALL RLS)* → `wave-0-rls-matrix` NT-07

### TIER 1 — unblocked immediately after GATE 0 (candidate keys already exist)  **[CODE]+[DB]**
- [ ] **7.G3+G1** Journal `pm_workspaces` migration + add composite FK on `pm_workspace_memberships.organization_membership_id → organization_members(org_id, id)`. *One `db:generate` pass.* → `wave-7-execution-plan`
- [ ] **3.1–3.3** Directory migration + `worker_engagements` EXCLUSION overlap constraint (`btree_gist`) + employer legal entity. → `wave-3-execution-plan`
- [ ] **1.1–1.6** Owner-pointer: `NOT VALID` composite FK → bootstrap repair → `VALIDATE` → `NOT NULL`; rejoin partial-unique. → `wave-1-execution-plan`
- [ ] **5.A–5.C** `membership_role_assignments` table + dual-write + backfill. → `wave-5-execution-plan`

### TIER 2 — the FK foundation (blocks Wave 6 + RLS)  **[DB]**
- [ ] **4.A** Add `org_id` to ~68 tables that lack it (chat 8, inv lines 18, HR 25, junctions 27). → `wave-4-execution-plan`
- [ ] **4.B** Add ~54 missing single-column `.references()` (referential integrity).
- [ ] **4.C** Add `UNIQUE(org_id, id)` candidate keys to ~110 parents (anchor-first).
- [ ] **4.D** Add ~270 composite FKs (`NOT VALID` → `VALIDATE`), quarantine invalid rows first.
- [ ] **4.E** ~~Billing int→text~~ **DONE** by user (commit `0c8e21b`).
- [ ] **4.F** RLS pilot on one low-risk table after its Phase-D FKs validate.

### TIER 3 — parallelizable after their deps
- [ ] **2.1–2.7** Module authority: backfill `org_modules` for all orgs → switch guards → drop `enabled_modules`. **Closes the verified module-gate inconsistency.** → `wave-2-6-execution-plan`
- [ ] **6.1–6.11** Business Party consumer migration (`clients.id` int → `business_parties.party_id` text) — needs Wave 4 party FKs; **highest-risk step = invoice/purchase_bills type change**. → `wave-2-6-execution-plan`
- [ ] **5.D–5.N** RBAC: retire `users.role` fallback, explicit DENY, typed resource grants, discovery endpoints, `ModuleAccessController` guard. *(delegations + team-fail-closed already DONE, `9c78440`.)*
- [ ] **7.G2/G4/G5/G6** PM: provisioning on enable, `pm_workspace_id` NOT NULL + composite FKs, managed-product strategy fields, delivery-team membership proof.

### TIER 4 — UX + infra + retirement
- [ ] **9.infra** Domain-event outbox/inbox (greenfield), `email_outbox` org-scoping, idempotency coverage expansion, **portal-auth runtime** (`PortalJwtAuthGuard` + `aud` claim — currently absent). → `wave-9-infra-retirement-plan`
- [ ] **8.1–8.10** Admin/portal UX: People/Membership split, PM route aliases, terminology pass, **portal isolation** (biggest, needs 9.infra portal-auth first). *(module-switcher renames already DONE.)* → `wave-8-execution-plan`
- [ ] **9.RLS** Full RLS rollout (shadow → ENABLE → test → FORCE) after 4.C/4.D validate + GATE 0.5 passes.
- [ ] **9.retire** Stop legacy writes, retirement telemetry, dead-code removal. → `wave-12-dead-code-inventory`

### TIME GATES (cannot be shortcut by code)  **[TIME]**
- [ ] Each cutover: **≥7-day shadow-read parity** before switching reads.
- [ ] Each contract: **≥30 days / 2 releases** zero legacy use before dropping.

---

## 3. Already done (this program, both parties)
- **Security:** membership-gated access + suspend/reactivate (`daa8303`); per-request membership re-check + api-tokens RBAC (`c14ea9a`).
- **User, in parallel:** billing int→text (`0c8e21b`); delegations + team fail-closed (`9c78440`); CRM↔Inventory fulfillment bridge (`016d016`); PM Workspaces module (`7fcc9b9`, `08b07dc`); Administration IA rename; module-switcher renames.
- **Design surface:** 8 Wave-0 gate docs + 8 execution plans + this index — every wave specified to step/SQL level.

## 4. Verified findings (medium; already sequenced, no emergency)
- **Module-gate inconsistency** — `@RequireModule` denies-on-absent (JWT array) vs `@RequirePermission` allows-on-absent (`org_modules`, `entitlements.service.ts:132`). Not a bypass/BOLA; closed by Wave 2 backfill.
- **Portal-auth runtime absent** — portal schema complete but no `PortalJwtAuthGuard`/`aud` claim; internal guard doesn't reject portal tokens. Sequenced in Wave 9.

## 5. What only the user can do
Every migration execution, the Neon pooler RLS test, and all `[TIME]` observation gates. The AI can write any migration/code against these plans, but cannot touch the database or compress elapsed-time gates.
