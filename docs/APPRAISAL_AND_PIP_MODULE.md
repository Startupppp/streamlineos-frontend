# Appraisal & Performance Improvement Plan (PIP) module

This document describes what was implemented for the **Appraisal** and **PIP** workflows on **HR → Performance** (`/hr/performance`), how it maps to the product plan, and where to find the code.

It is a **delivery summary** for engineers and operators. It does **not** replace the original questionnaire plan file (that file was not edited as part of implementation).

---

## 1. Product scope

- **Information architecture**: Two new tabs on the existing Performance page — **Appraisals** and **PIP** — alongside Reviews, Goals, 1-on-1s, and Cycles.
- **Questionnaire alignment**: Green (finalized) items from the Appraisal/PIP questionnaire were implemented; **red / TBD** items remain **placeholders** or are documented in `OPEN_QUESTIONS.md` (see §8).
- **Legacy**: Existing “Reviews” and related tables remain for the basic Reviews tab; new **dedicated** appraisal and extended PIP tables power the new tabs.

---

## 2. Milestones (M1–M5) — what shipped

### M1 — Schema, enums, migration

- **Enums** (and related): appraisal types, appraisal stages, rating types, cycle/stage row statuses, PIP reason/frequency/progress/final outcome, PIP status including **`DRAFT`**, etc. — in `lib/db/schema/enums.ts` (and used from `lib/db/schema/hr.ts`).
- **New tables** (conceptual): appraisal categories, cycles, appraisals, category ratings, stages, acknowledgements; extended `performance_improvement_plans`; `pip_goals`, `pip_check_ins`, `pip_check_in_goal_progress`.
- **Migration**: `drizzle/0104_appraisal_pip_module.sql` (journal entry in `drizzle/meta/_journal.json`).

**Operator note:** Apply migration **0104** (and any follow-on HR migrations in your branch) to each environment before relying on the new APIs/UI.

### M2 — Appraisals core

- Anniversary-oriented cycle seeding (server action + cron).
- Appraisal list/detail, categories, ratings (self vs manager), stage completion for early workflow stages.
- Client hooks and **Appraisals** tab UI.

### M3 — Full appraisal chain & exports

- Stage machine through **CLOSED** (CEO / compensation / final approval / employee ack per design).
- **Reopen** workflow for HR/CEO.
- **PDF export** for authorized users.
- **Outcome notes** and **confidentiality note** as **placeholders** (PATCH on appraisal).
- **Trigger PIP** from a **closed** appraisal (prefill + navigate to PIP tab).

### M4 — PIP

- Full **create** (draft) with structured fields + goals.
- **Acknowledge** → **ACTIVE** for employee.
- **Check-ins** API (create/update) with per-goal progress.
- **Final outcome** (SUCCESS / EXTENDED / FAILED) with status alignment on PATCH.
- **PIP** tab UI (list, create sheet, detail sheet).

### M5 — Notifications, reminders, RBAC, retention notes

- Email templates and send helpers for appraisals and PIP events.
- **Daily cron** for **1-day-before** appraisal stage due dates and PIP check-in reminders.
- **`isManagerOf`** helper for manager-scoped authorization.
- **OPEN_QUESTIONS** entries for retention (Q36) and exited-employee access (Q37/Q38).

---

## 3. Key file map

### 3.0 Client-safe role checks

**`@/lib/auth-helpers`** pulls **`next-auth`** (`lib/auth.ts`) → **`lib/email`** → **Sendgrid** (uses Node `fs`). **Do not** import `auth-helpers` from Client Components.

Use **`@/lib/auth-role-guards`** for `isAdminOrOwner`, `isCEO`, and `isExpenseAdmin` in `"use client"` modules. `auth-helpers` re-exports the same helpers for server-only code.

### 3.1 Database & domain logic

| Area | Location |
|------|-----------|
| HR schema (tables, relations) | `lib/db/schema/hr.ts` |
| Shared enums | `lib/db/schema/enums.ts` |
| Appraisal workflow (stages, assignees, ratings helpers) | `lib/hr/appraisal-workflow.ts` |
| Complete stage transaction | `lib/hr/appraisal-complete-stage.ts` |
| Create appraisal bundle | `lib/hr/create-appraisal.ts` |
| Cycle seed (anniversary window) | `server/actions/appraisal-cycle-seed.ts` |
| RBAC: manager chain | `lib/rbac/manager.ts` |
| Validations | `lib/validations/hr-appraisals.ts`, `lib/validations/hr-pip.ts` |
| PIP → Appraisal prefill (session storage contract) | `lib/hr/pip-prefill-storage.ts` |

### 3.2 HTTP API (App Router)

**Appraisals** (under `/api/hr/performance/appraisals`):

- `GET/POST` — `app/api/hr/performance/appraisals/route.ts`
- `GET/PATCH` — `app/api/hr/performance/appraisals/[id]/route.ts`
- `GET` — `app/api/hr/performance/appraisals/categories/route.ts`
- `PATCH` — `app/api/hr/performance/appraisals/[id]/ratings/route.ts`
- `POST` — `app/api/hr/performance/appraisals/[id]/complete-stage/route.ts`
- `POST` — `app/api/hr/performance/appraisals/[id]/reopen/route.ts`
- `POST` — `app/api/hr/performance/appraisals/[id]/export/route.ts`

**PIP** (under `/api/hr/performance/pip`):

- `GET/POST` — `app/api/hr/performance/pip/route.ts`
- `GET/PATCH` — `app/api/hr/performance/pip/[pipId]/route.ts`
- `POST` — `app/api/hr/performance/pip/[pipId]/acknowledge/route.ts`
- `POST` — `app/api/hr/performance/pip/[pipId]/check-ins/route.ts`
- `PATCH` — `app/api/hr/performance/pip/[pipId]/check-ins/[checkInId]/route.ts`

**Crons**

- `app/api/cron/appraisal-cycle-seed/route.ts` — seeds cycles/appraisals where configured.
- `app/api/cron/appraisal-pip-reminders/route.ts` — appraisal stage + PIP check-in **due tomorrow** reminders.

Cron paths are registered in **`vercel.json`**.

### 3.3 Email

| Concern | Location |
|---------|-----------|
| HTML templates (appraisal + PIP) | `lib/email-templates/appraisal.ts` (re-exported from `lib/email-templates/index.ts`) |
| Send / schedule helpers | `lib/email/hr-appraisal-pip.ts` |

**Wiring (high level):**

- After appraisal **create** / **stage complete** / **reopen** → assignee or closed fan-out emails (async helper so HTTP handlers are not blocked).
- After PIP **draft create** → employee notified; after **acknowledge** → manager “activated” style email.
- After PIP **final outcome** set → employee outcome email.
- Cron invokes reminder scanners for **tomorrow’s** due dates.

**Config:** Email delivery depends on existing app mail configuration (`lib/email/sender` and environment variables used there).

### 3.4 Client (React)

| UI | File |
|----|------|
| Performance page tabs (includes Appraisals + PIP) | `app/(dashboard)/hr/performance/page.tsx` |
| Appraisals tab | `features/hr/performance/appraisals-tab.tsx` |
| PIP tab | `features/hr/performance/pip-tab.tsx` |

**Hooks & query keys**

- `lib/api/hooks/hr/appraisals.ts` — list, detail, create, ratings, complete stage, reopen, export blob, **patch meta** (outcome/confidentiality).
- `lib/api/hooks/hr/pip.ts` — list, detail, create, update, acknowledge, check-in mutation.
- Exports: `lib/api/hooks/hr/index.ts`
- Keys: `lib/query-keys.ts` (HR appraisal keys as added).

### 3.5 UI / UX polish (follow-up pass)

The Appraisals and PIP sheets were aligned with the same structural pattern as **`HrSheet`**: fixed header, scrollable body, consistent `px-4 py-4` content padding, separators between major sections, and clearer labels. List rows show humanized stage/status text. **Export PDF** in the Appraisals UI matches **reviewer/manager + HR** capability consistent with the export API.

---

## 4. Authorization (RBAC) — rules of thumb

- **HR / CEO** (`isAdminOrOwner` and org membership): broad access for appraisals and PIPs where the API allows it.
- **Manager scope**: `isManagerOf(actor, targetUser)` for create/filter paths; appraisal export also allows **direct reviewer** and chain manager per export route.
- **Employee**: Own appraisal read; manager scores/comments hidden until **`EMPLOYEE_ACK`** or **`CLOSED`** (enforced in GET + mirrored in the ratings form).
- **PIP**: Employee read + acknowledge + check-in participation; HR/manager create and manage; **final outcome** restricted to HR/CEO in API.

Exact checks live per route — always treat the **API** as the source of truth.

---

## 5. Cross-tab “Trigger PIP” flow

1. User opens a **closed** appraisal as **HR/CEO** or **reviewing manager**.
2. Clicks **Trigger PIP** → payload `{ userId, linkedAppraisalId }` is written to **`sessionStorage`** under the key in `lib/hr/pip-prefill-storage.ts` (`PIP_CREATE_PREFILL_STORAGE_KEY`).
3. Router navigates to `?tab=pip`.
4. Opening **New PIP** reads and **removes** the storage entry; the create API receives **`linkedAppraisalId`**.
5. Closing the sheet without creating **clears** `linkedAppraisalId` state so stale links do not appear.

---

## 6. PIP status vs final outcome (PATCH)

When **`finalOutcome`** is set via PATCH:

| `finalOutcome` | `status` set to |
|----------------|-----------------|
| `SUCCESS` | `COMPLETED` |
| `EXTENDED` | `EXTENDED` |
| `FAILED` | `TERMINATED` |

Email notification fires when the outcome **changes** to one of these values.

---

## 7. Testing checklist (manual)

Because environments require authentication, automated browser E2E was not run in-repo without credentials. Suggested manual order:

1. **Appraisals** — list, **My actions**, **New appraisal** create.
2. **Detail** — stages timeline, save ratings (self / manager as appropriate), **Complete stage** through the chain.
3. **Outcome / confidentiality** — save; verify reload shows persisted text.
4. **Closed** — **Trigger PIP** → PIP tab shows prefill; create PIP; verify **`linked_appraisal_id`** in DB or linked banner in UI.
5. **PIP** — employee **Acknowledge**; HR **Mark success / extended / failed**; verify status badges.
6. **Export PDF** — as HR and as **reviewing manager**.
7. **Crons** — hit reminder and seed endpoints with valid **cron auth** in staging (see `lib/cron-auth`).

---

## 8. Documentation & open items

| Document | Purpose |
|----------|---------|
| `OPEN_QUESTIONS.md` | **OPEN-12** (Q36 — no automatic purge), **OPEN-13** (Q37/Q38 — exited employees, HR access, soft deactivation). |
| This file | Implementation map and operational notes. |

**Still placeholders / client TBD (not fully productized):**

- Formal **outcome catalog** and authority (Q16).
- **Salary increment** bands (Q17).
- **Confidentiality visibility** rules hidden from employee (Q18) — only a free-text note exists today.
- **Retention purge duration** (Q36).

---

## 9. Related types

Shared HR TypeScript types were extended as needed — see `types/hr.ts` for structures consumed by hooks/UI where applicable.

---

## 10. Changelog-style summary (single list)

- Added appraisal + PIP **schema** and **0104** migration.
- Added appraisal **CRUD-ish** API surface, ratings, stage completion, reopen, PDF export.
- Added PIP **list/create/detail/patch**, acknowledge, check-ins.
- Added **cycle seed** and **reminder** crons; registered in `vercel.json`.
- Added **email templates** + **`lib/email/hr-appraisal-pip.ts`** senders; wired from routes and cron.
- Added **`isManagerOf`** RBAC helper.
- Added **Appraisals** and **PIP** tabs with sheets, visibility rules, Trigger PIP prefill, and UI layout polish.
- Documented **Q36 / Q37 / Q38** gaps in `OPEN_QUESTIONS.md`.

---

*Last updated: implementation and UI pass as of the Appraisal & PIP module delivery.*
