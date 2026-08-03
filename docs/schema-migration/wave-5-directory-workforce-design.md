---
wave: 5
title: Directory / Workforce seam
status: DESIGN — awaiting approval before implementation
author: architect review 2026-07-26
depends_on: Wave 4 complete (schema-folder reorg, dual-departmentId collapse)
---

# Wave 5 — Directory / Workforce seam

> Design document for `docs/schema-change-plan.md §10` tickets T5.1–T5.5.
> Inspect, plan, confirm, then implement. No source files are modified here.

---

## 1. Existing model — verified facts

### 1.1 `users` table (`backend/src/db/schema/auth.ts`)

The global auth identity. Relevant employment-flavoured columns still live here and are
actively consumed by downstream modules. They are the **primary migration targets**:

| Column | Type | Notes |
|---|---|---|
| `department_id` | integer | Legacy numeric FK — no explicit FK constraint, references `departments.id` |
| `org_department_id` | text | Newer text FK — references text-keyed org hierarchy |
| `designation` | text | Free-text job title |
| `monthly_salary` | decimal(15,2) | Plain-text salary on the global user row |
| `employee_id` | text | Tenant-scoped badge number but stored globally |
| `bank_details` | text | Plaintext — not even JSONB |
| `tax_id` | text | National tax ID |
| `joining_date` | date | Employment start |
| `reporting_to` | text | Self-referencing FK (`users.id`) — no org scoping |
| `branch_id` | integer | Bare integer, no FK constraint |
| `team` | text | Free text |

None of these columns are org-scoped. A user who joins two orgs cannot have two
different salaries, designations, or managers. This is the core modelling defect Wave 5
repairs.

### 1.2 `organization_members` (`auth.ts`)

- `id` serial PK, unique per `(user_id, org_id)`.
- `role` text default `"ENGINEERING"` — the job-title legacy value (being retired in Wave 2).
- `status` via `membershipStatusEnum` — already exists with `ACTIVE/INVITED/SUSPENDED/LEFT`.
- Carries no placement fields (no dept, no manager, no designation).

### 1.3 `user_memberships` (`backend/src/db/schema/user-management.ts`)

A **separate placement table** that duplicates the membership seam:

- `(org_id, user_id)` — unique, so one placement per org per user.
- Fields: `business_unit_id` text, `branch_id` int, `department_id` int, `team_id` text, `manager_user_id` text → `users.id`.
- `is_primary` boolean default true.

This table was added to hold placement data that `organization_members` does not.
It is the structure Wave 5 replaces; retirement is the goal once `workers` +
`worker_engagements` absorbs its data.

### 1.4 HR people + employment tables (`backend/src/db/schema/hr/core-people.ts`)

These are the real names — no `hr_employees` table exists with that exact name.

**`hr_people`** — the HR module's person record:

| Column | Type | Nullability |
|---|---|---|
| `id` | serial | PK |
| `org_id` | text | NOT NULL |
| `user_id` | text | **NULLABLE** — login is optional |
| `first_name`, `last_name` | text | NOT NULL |
| `work_email` | text | NOT NULL; `uniqueIndex(org_id, work_email)` |
| `personal_email`, `phone` | text | nullable |
| `date_of_birth`, `gender`, `nationality` | mixed | nullable |
| `address`, `emergency_contact` | jsonb | nullable |
| `avatar_url` | text | nullable |
| `deleted_at` | timestamp | soft-delete |

Login-optional is **already modelled here** — `user_id` is nullable (`SET NULL` on cascade).

**`hr_employments`** — the employment record hanging off `hr_people`:

| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `org_id` | text | NOT NULL |
| `person_id` | integer | FK → `hr_people.id` NOT NULL |
| `employee_number` | text | `uniqueIndex(org_id, employee_number)` |
| `lifecycle_status` | enum | `CANDIDATE/PRE_JOINING/ONBOARDING/ACTIVE/PROBATION/CONFIRMED/NOTICE/EXITED/ALUMNI/SUSPENDED` |
| `worker_type` | enum | `FULL_TIME/PART_TIME/CONTRACTOR/CONSULTANT/INTERN/TEMPORARY/AGENCY/FREELANCER` |
| `department_id` | integer | FK → `departments.id` |
| `job_role_id`, `job_level_id`, `employment_type_id`, `location_id` | integer | soft FKs (no explicit constraint in Drizzle) |
| `designation` | text | nullable |
| `joining_date`, `probation_end_date`, `confirmation_date` | date | nullable |
| `notice_start_date`, `expected_last_day`, `last_working_day`, `exit_date` | date | nullable |
| `exit_reason` | text | nullable |
| `is_primary` | boolean | default true |
| `deleted_at` | timestamp | soft-delete |

Supporting tables: `hr_employee_profiles` (skills, LinkedIn, education — 1:1 with employment),
`hr_employee_sensitive_fields` (salary cents, bank details, national ID, BGV — 1:1, access-gated),
`hr_employment_history` (lifecycle status log), `hr_effective_dated_changes` (org unit changes),
`hr_reporting_lines` (primary/matrix/dotted manager links between employments).

Also defined in `core-people.ts`: enums `hr_employment_lifecycle_status`,
`hr_worker_type`, `hr_effective_dated_change_type`, `hr_effective_dated_change_status`,
`hr_reporting_line_type`, `hr_custom_field_type`.

**`departments`** table is in `backend/src/db/schema/hr/employees.ts` (not `core-people.ts`), with a
`department_members(department_id, user_id)` join table — both reference `users.id`.

### 1.5 Downstream consumers of `users.id` for employment data

These modules FK into `users.id` for employment-domain data and will each need a phased
migration to `worker_id`/`organization_person_id` after Wave 5 lands:

- **Payroll:** `payrolls.user_id`, `employee_salary_profiles.user_id` (`payroll-workforce.ts`)
- **Leave:** `leave_balances.user_id`, `leave_requests.user_id/approver_id/covering_employee_id`
- **Attendance:** `attendance.user_id`, `wfh_requests.user_id/approver_id`
- **Departments:** `departments.manager_id`, `department_members.user_id`
- Many more HR sub-tables (shifts, rosters, training, performance, KPIs, etc.) all carry `user_id` → `users.id`.

Wave 5 **does not migrate these** — it only introduces the new tables and DTO adapters,
leaving existing FKs in place. Downstream migration is per-module, post-Wave 5.

---

## 2. Problem statement

Three overlapping person models exist with no single authority:

```
users.employment_fields         (global, org-unscoped)
user_memberships                (org-scoped placement, login-required)
hr_people + hr_employments      (HR module's own person/employment model, login-optional)
```

A person who works at Org A as an employee but consults for Org B cannot be represented
without data collision on `users`. A contractor or payee who has no login cannot hold an
`organization_members` row. A pre-hire candidate in the ATS exists in `hr_people` but
should be promotable to a full employment record without a second insert.

The seam Wave 5 establishes:

```
organization_people   ← safe contact/profile directory (no login required)
    └── workers       ← marks a person as labour in the org
            └── worker_engagements   ← effective-dated employment/contract terms
```

`organization_members` remains the auth/access membership for people who do log in.
The link between a membership and a person is optional in both directions.

---

## 3. New tables — Drizzle-style sketches

All new tables follow the Wave 4+ naming convention: descriptive PKs, composite
tenant indexes, text org FKs, no bare `id` in exported symbols or DTO param names.

### 3.1 `organization_people`

Org-local human directory. Login is optional. A person row can exist for a
pre-hire, an offline worker, a payee, an emergency contact, or any human the org
needs to track before (or instead of) giving them a login.

```ts
// target path: common/directory/organization-people.ts  (post Wave-4 reorg)

export const organizationPeople = pgTable("organization_people", {
  organizationPersonId: text("organization_person_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),

  // Optional link to a global login. NULL = person exists without credentials.
  // SET NULL on cascade so the person record survives if the auth row is deleted.
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" }),

  // Optional link to the membership row when the person also has access.
  // Enforced unique: one person per membership in each org.
  organizationMembershipId: integer("organization_membership_id")
    .references(() => organizationMembers.id, { onDelete: "set null" }),

  // Core identity
  firstName: text("first_name").notNull(),
  lastName:  text("last_name").notNull(),
  displayName: text("display_name"),     // computed on write; fallback for display
  preferredName: text("preferred_name"),

  // Contact points
  workEmail:     text("work_email"),
  personalEmail: text("personal_email"),
  phone:         text("phone"),
  whatsappNumber: text("whatsapp_number"),

  // Profile
  avatarUrl:   text("avatar_url"),
  dateOfBirth: date("date_of_birth"),
  gender:      text("gender"),
  nationality: text("nationality"),
  timezone:    text("timezone"),
  languageCode: text("language_code").default("en"),

  // Address + emergency contact (safe contact data, not sensitive payroll data)
  address: jsonb("address").$type<{
    line1?: string; line2?: string; city?: string;
    state?: string; country?: string; postalCode?: string;
  }>(),
  emergencyContact: jsonb("emergency_contact").$type<{
    name?: string; relationship?: string; phone?: string; email?: string;
  }>(),

  // Social / professional links (non-sensitive, directory-visible)
  linkedinUrl: text("linkedin_url"),
  githubUrl:   text("github_url"),
  bio:         text("bio"),

  // Lifecycle
  deletedAt:  timestamp("deleted_at"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  // Composite PK for tenant-safe FK targets from child rows
  uniqueIndex("uniq_org_people_org_person")
    .on(table.organizationId, table.organizationPersonId),

  // A user appears at most once per org in the directory
  uniqueIndex("uniq_org_people_org_user")
    .on(table.organizationId, table.userId)
    .where(sql`user_id IS NOT NULL`),

  // A membership is linked to at most one person per org
  uniqueIndex("uniq_org_people_org_membership")
    .on(table.organizationId, table.organizationMembershipId)
    .where(sql`organization_membership_id IS NOT NULL`),

  // Work email unique within org (allows NULL for offline workers with none)
  uniqueIndex("uniq_org_people_org_work_email")
    .on(table.organizationId, table.workEmail)
    .where(sql`work_email IS NOT NULL`),

  index("idx_org_people_org").on(table.organizationId),
  index("idx_org_people_user").on(table.userId),
  index("idx_org_people_membership").on(table.organizationMembershipId),
]);
```

**Key decisions:**

- `organizationPersonId` is text UUID — descriptive, matches §0 rule.
- `userId` nullable — the loginless-person case is first-class, not a bolt-on.
- `organizationMembershipId` nullable — a person can exist before they ever get access; a membership can exist (platform admin added) before HR creates their person record.
- `workEmail` is the org-scoped identifier for email-bearing people, unique within org when present.
- Sensitive data (salary, bank, tax, national ID) does NOT live here — it belongs in `hr_employee_sensitive_fields` (HRMS) or the future payroll payee profile, not in the plain directory.

### 3.2 `workers`

Marks a person as labour — i.e., a subject of Payroll, Attendance, Leave, and HR
lifecycle management. Not every org person is a worker (a board member or external contact
is a person but not necessarily a worker). One worker row per person per org.

```ts
// target path: common/workforce/workers.ts

export const workers = pgTable("workers", {
  workerId: text("worker_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  organizationPersonId: text("organization_person_id")
    .references(() => organizationPeople.organizationPersonId, { onDelete: "restrict" })
    .notNull(),

  // Stable badge / employee number for this org (replaces users.employee_id)
  workerNumber: text("worker_number"),

  // Lifecycle: ACTIVE means at least one active engagement; INACTIVE = no
  // current engagement; EXITED = all engagements ended with no return expected.
  // Derived on transition; authoritative state lives in worker_engagements.
  status: text("status")
    .$type<"ACTIVE" | "INACTIVE" | "EXITED">()
    .default("INACTIVE")
    .notNull(),

  // Whether this worker can receive payroll runs (becomes a Payroll Payee)
  isPayee: boolean("is_payee").default(false).notNull(),

  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  // Composite tenant key for child FK targets
  uniqueIndex("uniq_workers_org_worker")
    .on(table.organizationId, table.workerId),

  // One worker per person per org
  uniqueIndex("uniq_workers_org_person")
    .on(table.organizationId, table.organizationPersonId),

  // Worker number unique within org when present
  uniqueIndex("uniq_workers_org_number")
    .on(table.organizationId, table.workerNumber)
    .where(sql`worker_number IS NOT NULL`),

  index("idx_workers_org").on(table.organizationId),
  index("idx_workers_person").on(table.organizationPersonId),
  index("idx_workers_org_status").on(table.organizationId, table.status),
]);
```

**Key decisions:**

- `RESTRICT` on delete of the parent person — a worker row blocks person deletion; HR
  must explicitly exit/archive first. This prevents silent orphan payroll data.
- `isPayee` is a Payroll gate flag. Payroll module reads `workers.is_payee = true` to
  determine who is eligible for a run, without requiring HRMS to be enabled.
- `workerNumber` replaces `users.employee_id`. It is org-scoped (composite unique).
- Status is denormalised from engagements for efficient list queries; maintained by a
  service trigger on engagement status transitions.

### 3.3 `worker_engagements`

Effective-dated employment or contract terms. Each row is a non-overlapping interval
`[starts_on, ends_on)` for a worker. At most one engagement may be the "active primary"
at any point in time.

```ts
// target path: common/workforce/worker-engagements.ts

export const workerEngagementStatusEnum = pgEnum("worker_engagement_status", [
  "PLANNED",    // future start, not yet active
  "ACTIVE",     // current, starts_on <= today <= ends_on (or ends_on IS NULL)
  "COMPLETED",  // ends_on passed, normal close
  "TERMINATED", // ended early with cause
  "CANCELLED",  // planned engagement that never started
]);

export const workerEngagements = pgTable("worker_engagements", {
  workerEngagementId: text("worker_engagement_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  workerId: text("worker_id")
    .references(() => workers.workerId, { onDelete: "cascade" })
    .notNull(),

  // Effective date range — half-open interval [starts_on, ends_on)
  // ends_on NULL means "open-ended / until further notice"
  startsOn: date("starts_on").notNull(),
  endsOn:   date("ends_on"),    // NULL = open-ended

  // Employment / contract classification
  workerType: text("worker_type")
    .$type<
      | "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "CONSULTANT"
      | "INTERN" | "TEMPORARY" | "AGENCY" | "FREELANCER"
    >()
    .notNull(),
  status: workerEngagementStatusEnum("status").default("PLANNED").notNull(),

  // Exactly one engagement per worker may be isPrimary=true and status=ACTIVE.
  // Enforced via partial unique index + service-layer check; exclusion constraint
  // added in a follow-up migration once pg exclusion extension is confirmed available.
  isPrimary: boolean("is_primary").default(false).notNull(),

  // Placement — references the text-keyed org hierarchy (Wave 4+ hierarchy)
  departmentId: text("department_id"),      // FK → org_departments.id (text, Wave 4)
  businessUnitId: text("business_unit_id").references(() => orgBusinessUnits.id, { onDelete: "set null" }),
  branchId: text("branch_id"),              // FK → org_branches.id (text, Wave 4)
  locationId: text("location_id"),          // FK → hr_locations.id when HRMS is on
  teamId: text("team_id"),                  // FK → hr_teams.id when HRMS is on

  // Org chart
  // Points to another worker_engagement (the manager's current primary engagement)
  // NULL = no manager assigned
  managerEngagementId: text("manager_engagement_id"),

  // Role / level
  designation: text("designation"),
  jobRoleId:   integer("job_role_id"),   // FK → hr_job_roles.id (HRMS optional)
  jobLevelId:  integer("job_level_id"),  // FK → hr_job_levels.id (HRMS optional)

  // Legal / contract
  employmentTypeId: integer("employment_type_id"),  // FK → hr_employment_types when HRMS on
  probationEndsOn:  date("probation_ends_on"),
  noticePeriodDays: integer("notice_period_days"),

  // Termination detail (populated on TERMINATED/COMPLETED)
  terminationReason: text("termination_reason"),
  terminationNotes:  text("termination_notes"),

  // Audit
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  // Composite tenant key
  uniqueIndex("uniq_worker_engagements_org_engagement")
    .on(table.organizationId, table.workerEngagementId),

  // At most one active primary engagement per worker
  uniqueIndex("uniq_worker_engagements_active_primary")
    .on(table.organizationId, table.workerId)
    .where(sql`is_primary = true AND status = 'ACTIVE'`),

  // ends_on > starts_on enforced via check constraint
  // (added as raw SQL in the migration since Drizzle check() is table-level)

  index("idx_worker_engagements_org").on(table.organizationId),
  index("idx_worker_engagements_worker").on(table.workerId),
  index("idx_worker_engagements_org_status").on(table.organizationId, table.status),
  index("idx_worker_engagements_org_starts").on(table.organizationId, table.startsOn),
  index("idx_worker_engagements_manager").on(table.managerEngagementId),
]);
```

**Key decisions:**

- Half-open interval `[starts_on, ends_on)` is the standard temporal pattern. A
  non-overlap exclusion constraint (`EXCLUDE USING gist (worker_id WITH =, daterange(...) WITH &&)`)
  should be added in the migration SQL when `pg_exclusion` is confirmed available on
  Neon; until then, the service validates overlap before insert.
- `isPrimary` partial unique index enforces the "at most one active primary" invariant
  at the DB level for the happy-path; the exclusion constraint closes the race.
- HRMS-specific FK fields (`jobRoleId`, `locationId`, `teamId`, etc.) are nullable —
  they are populated only when HRMS is enabled, satisfying the HRMS-optional requirement
  from §10.
- `managerEngagementId` self-references `worker_engagements` (via a service-level soft
  FK; a physical FK is deferred until descriptive-PK migration completes in Wave 7).
- Salary and bank details are NOT stored here — they belong in
  `hr_employee_sensitive_fields` (HRMS) or a future Payroll payee profile.

---

## 4. Membership ↔ person optional link

The link is bidirectional-optional, expressed as a single nullable FK on
`organization_people.organization_membership_id`:

```
organization_members (id)
        ↑
        │  0..1
organization_people (organization_membership_id)   nullable FK
        ↓
     0..1
    workers
        ↓
     0..*
worker_engagements
```

**Rules:**
1. A membership may exist without a person record (platform admin added before HR onboarding).
2. A person may exist without a membership (offline worker, pre-hire, payee with no login).
3. When a membership IS linked to a person, the person's `user_id` must equal the
   membership's `user_id` — enforced by the service on link-creation, not a DB check
   (would require a cross-table check constraint or trigger; deferred to Wave 7 RLS/triggers).
4. Unlinking a membership from a person (e.g. on offboarding) sets
   `organization_membership_id = NULL`; the person row is retained for payroll/audit history.

---

## 5. Backfill plan from existing data

Wave 5 backfill runs in an idempotent migration transaction with a quarantine table for
ambiguous rows. **No destructive moves until shadow-reads confirm parity (Wave 5 completion criterion).**

### 5.1 Sources (in priority order)

| Source | Condition | Action |
|---|---|---|
| `hr_people` (has `user_id`) | user exists, single org membership | Create `organization_people`, link `user_id` + membership; create `workers` + active `worker_engagement` from the corresponding `hr_employments` row |
| `hr_people` (no `user_id`) | offline worker/payee | Create `organization_people` with `user_id = NULL`; create `workers` + engagement |
| `user_memberships` | no matching `hr_people` row | Create `organization_people` from `users` profile fields; create `workers`; create an `ACTIVE` engagement from `users` employment fields (salary/dept/designation); note: engagement `workerType` defaulted to `FULL_TIME` |
| `organization_members` (no `user_memberships`) | clean auth-only membership | Create `organization_people` linked to membership; no `workers` row (not every member is a worker) |

### 5.2 Quarantine conditions

Rows are written to a `_wave5_quarantine` migration log (not a permanent table) when:

- `hr_people` has a `user_id` that maps to **multiple org memberships** (should not
  happen given the `uniq_user_memberships_user_org` constraint, but data imported before
  that constraint existed may violate it).
- `hr_people` row and `user_memberships` row both exist for the same `(org_id, user_id)`
  but have **conflicting placement data** (different `department_id`, `manager_user_id`).
  Resolution: `hr_people`/`hr_employments` is the authoritative HR record; `user_memberships`
  is the secondary. Log the diff, prefer HR data, flag for manual review.
- A `users` row has `employee_id` that collides with an existing `hr_employments.employee_number`
  in the same org with a **different person identity**. Flag; do not merge silently.
- A person appears in `hr_people` in org A and in `user_memberships` for org B only —
  create two separate `organization_people` rows (multi-org is valid).

### 5.3 Idempotency

Every backfill insert uses `INSERT … ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`
with a stable deterministic key. The migration is re-runnable.

---

## 6. DTO adapters — preserving the old `users` employment fields

The columns `monthlySalary`, `employeeId`, `designation`, `departmentId`,
`orgDepartmentId`, `reportingTo`, `branchId`, `joiningDate`, `taxId`, `bankDetails`
on `users` are still read by:

- HRMS leave/attendance/payroll services
- The frontend `users` profile API
- The RBAC access service (for manager resolution)

These columns must stay on `users` with their current values until all consumers have
migrated to read from `organization_people` / `workers` / `worker_engagements` /
`hr_employee_sensitive_fields`.

**Adapter pattern:** Each service that reads these fields gets a compatibility shim:

```ts
// backend/src/modules/directory/adapters/user-employment-adapter.service.ts
//
// Reads the new tables; falls back to users.* columns when the new row does not
// yet exist. Once all callers are migrated and the backfill is verified, the shim
// is deleted and users.* columns are dropped (Wave 12 dead-code sweep).

async getEmploymentView(orgId: string, userId: string): Promise<EmploymentViewDto> {
  const person = await db.query.organizationPeople.findFirst({
    where: and(
      eq(organizationPeople.organizationId, orgId),
      eq(organizationPeople.userId, userId),
    ),
    with: { worker: { with: { activeEngagement: true } } },
  });

  if (person?.worker?.activeEngagement) {
    return mapEngagementToView(person, person.worker.activeEngagement);
  }

  // Fallback: read legacy columns from users
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return mapLegacyUserToView(user);
}
```

**`EmploymentViewDto`** is the stable contract both paths produce:

```ts
interface EmploymentViewDto {
  organizationPersonId: string | null;   // null = not yet migrated
  workerId: string | null;
  designation: string | null;
  departmentId: string | null;           // text key (Wave 4+ hierarchy)
  businessUnitId: string | null;
  branchId: string | null;
  managerUserId: string | null;          // resolved for display; raw user id
  joiningDate: string | null;            // ISO date
  workerType: string | null;
  employeeNumber: string | null;
}
```

Sensitive fields (salary, bank, tax) are **not** in `EmploymentViewDto` — they flow
through a separate `SensitiveEmploymentViewDto` gated by `hr:employees:sensitive:view`.

### 6.1 Users columns retired ONLY after consumers migrate

| Column | Can retire after |
|---|---|
| `users.employee_id` | All payroll / HR consumers read `workers.worker_number` |
| `users.designation` | All HR/directory consumers read `worker_engagements.designation` |
| `users.department_id` (int) | Collapsed in Wave 4; done |
| `users.org_department_id` (text) | All consumers read engagement `department_id` |
| `users.branch_id` (int) | All consumers read engagement `branch_id` |
| `users.reporting_to` | All consumers read `worker_engagements.manager_engagement_id` resolved to user |
| `users.joining_date` | All consumers read `worker_engagements.starts_on` |
| `users.monthly_salary` | All consumers read `hr_employee_sensitive_fields.salary_amount_cents` |
| `users.bank_details` | All consumers read `hr_employee_sensitive_fields.bank_details` |
| `users.tax_id` | All consumers read `hr_employee_sensitive_fields.tax_id` |
| `users.team` | All consumers read engagement `team_id` → `hr_teams` |

**Retirement gates:** grep for direct column reads → typecheck → backfill complete + shadow
comparison → drop in a Wave 12 migration. Not before.

---

## 7. Edge cases

| Case | How the model handles it |
|---|---|
| **Pre-hire / candidate** | `organization_people` row exists; `workers` row exists; no `worker_engagements` row yet (or a `PLANNED` row with future `starts_on`). The `hr_people` row with `lifecycle_status = CANDIDATE` maps directly. |
| **Offline worker / payee with no login** | `organization_people.user_id = NULL`; `organization_people.organization_membership_id = NULL`. Valid `workers` + `worker_engagements` row. `workers.is_payee = true` if they receive payroll. |
| **Contractor** | `worker_engagements.worker_type = CONTRACTOR`; `endsOn` is the contract end date (not NULL). A new row is added on renewal — history is preserved. |
| **Same person joins Org A (employee) and Org B (consultant)** | Two separate `organization_people` rows (one per org), each with a `workers` row scoped to that org. `users` row is shared (global identity). No data collision. |
| **Multi-engagement (two concurrent roles, e.g. employee + board member)** | Two `worker_engagements` rows. Only one may be `is_primary = true AND status = ACTIVE`. The second is `is_primary = false`. |
| **Owner/Admin with no HR record** | `organization_members` row exists; no `organization_people` row (or one created lazily when HR runs onboarding). The membership works independently of the directory. |
| **HR creates a person before invite is accepted** | `organization_people` row with `user_id = NULL` and `organization_membership_id = NULL`. On invite acceptance, service links `user_id` and `organization_membership_id`. |
| **Offboarding: engagement ends, membership stays** | `worker_engagements` row transitions to `COMPLETED/TERMINATED`; `workers.status → EXITED`; `organization_members` status transitions to `SUSPENDED/LEFT` (Wave 1). The `organization_people` row persists for audit. |
| **Engagement gap (between two employment periods)** | Multiple `worker_engagements` rows with non-overlapping date ranges. The exclusion/partial-unique constraint rejects overlapping active engagements. A gap (no row covering today) means `workers.status = INACTIVE`. |
| **`user_memberships` placement data conflicts with `hr_people` data** | Quarantined during backfill (§5.2). HR data wins; diff logged; flagged for manual review. `user_memberships` is retired only after all conflicts are resolved. |

---

## 8. Relationship with existing HR tables

`hr_people` and `hr_employments` are NOT deleted in Wave 5. The approach is:

1. Wave 5 adds `organization_people` / `workers` / `worker_engagements`.
2. `hr_people` gets an optional FK column `organization_person_id` pointing to the new
   table, populated during backfill.
3. `hr_employments` gets an optional FK column `worker_engagement_id` pointing to the
   new table, populated during backfill.
4. HRMS services continue to read `hr_employments` for HRMS-specific lifecycle fields
   (probation dates, confirmation date, notice dates, exit fields, BGV status).
5. Workforce-common data (org unit placement, manager chain, worker type, dates) is
   progressively migrated to `worker_engagements` and read through the adapter.
6. `hr_employments` eventually becomes an HRMS extension of `worker_engagements`
   (1:1, `worker_engagement_id` FK, HRMS-module-only fields retained).
   This physical collapse is a post-Wave-5 HRMS-internal cleanup, not part of Wave 5.

---

## 9. Acceptance criteria for Wave 5

- `organization_people`, `workers`, `worker_engagements` tables exist in the DB with
  the correct constraints; Drizzle migration generated and applied.
- `organization_people.user_id` is nullable; a person row without a `users` reference
  is accepted by the DB and all create/update service methods.
- `workers` enforces one-per-person-per-org (unique constraint).
- `worker_engagements` partial unique index prevents two `is_primary=true/ACTIVE` rows
  for the same worker; overlap validation is in the service layer.
- Backfill run is idempotent; quarantine log has zero unresolved ambiguous rows in the
  dev seed data.
- DTO adapter returns identical data to the legacy `users.*` read for all currently-active
  worker records (shadow-read comparison passes).
- `user_memberships` is NOT dropped — it becomes a named "legacy placement table" with
  a deprecation comment; retirement is Wave 12 after all callers migrate.
- `users` employment columns are NOT dropped — adapter shim covers them; retirement is Wave 12.
- Build ✓ lint ✓ types ✓ for both repos.
- A minimal People/Directory admin surface (T5.5) exists: list `organization_people`
  by org, create/edit a person, optionally link to a membership. Gated on
  `directory:people:view` / `directory:people:manage` permissions (new keys added to
  `permissions.constants.ts`). No HRMS permission required.

---

## 10. New RBAC permission keys (to add in `permissions.constants.ts`)

```
directory:people:view       — list/read organization_people for the org
directory:people:manage     — create/edit/link organization_people
workforce:workers:view      — list/read workers + engagements
workforce:workers:manage    — create/edit worker engagements
workforce:workers:terminate — end/terminate a worker engagement
```

These are available to `ADMIN`, `HR_ADMIN` (once Wave 2 lands), and `OWNER` by default.
They do NOT require HRMS to be enabled — the directory and workforce base are
org-level capabilities, not HRMS-module capabilities.

---

## 11. Files to create / modify (Wave 5 only)

**Create (new):**
- `backend/src/db/schema/common/directory/organization-people.ts` (post Wave 4 reorg) or
  `backend/src/db/schema/organization-people.ts` (pre reorg — create here if Wave 4 not yet done)
- `backend/src/db/schema/common/workforce/workers.ts`
- `backend/src/db/schema/common/workforce/worker-engagements.ts`
- `backend/src/modules/directory/directory.module.ts` + controller + service
- `backend/src/modules/directory/adapters/user-employment-adapter.service.ts`
- `backend/src/modules/directory/dto/` (person create/update, DTO types)
- `frontend/features/directory/` (People admin surface — T5.5)

**Modify (backfill link columns only — no drops):**
- `backend/src/db/schema/hr/core-people.ts` — add nullable `organization_person_id` to `hr_people`,
  nullable `worker_engagement_id` to `hr_employments`
- `backend/src/modules/rbac/permissions.constants.ts` — add new directory/workforce keys
- Drizzle migration: new tables + new nullable columns + constraints

**Do NOT modify yet (consumer migration is post-Wave 5):**
- `backend/src/db/schema/auth.ts` — `users` employment columns stay
- `backend/src/db/schema/user-management.ts` — `user_memberships` stays (deprecated, not dropped)
- HR leave/attendance/payroll tables — `user_id` FKs stay until per-module migration
