---
type: wave-4 patch spec (HR)
status: DRAFT
date: 2026-07-26
migration-files: 0200_phase_a_hr_org_id.ts · 0203_phase_b_hr_bare_fks.ts · 0206_phase_c_hr_candidate_keys.ts · 0210_phase_d_hr_composite_fks.ts · 0216_phase_d_validate_hr.ts
depends-on: wave-0-composite-fk-matrix-hr-payroll.md · wave-4-execution-plan.md
source-files-verified: employees.ts · core-org.ts · core-people.ts · leaves.ts · feedback.ts · announcements.ts · learning.ts · engagement-extras.ts · workflow-engine.ts · rosters.ts · attendance-regularizations.ts
---

# Wave 4 — HR Domain Patch Spec (tenant-safe FK)

> This document is the concrete, copy-paste implementation guide for the HR domain's
> Wave 4 work. Every column name, table name, and Drizzle symbol is verified against
> the actual schema files under `backend/src/db/schema/hr/`. Do not edit any source
> file until Phase A SQL has been applied and verified (zero null `org_id` rows).

## Prerequisites confirmed from schema inspection

- All `org_id` columns across HR tables are `text` — zero type-mismatch with `organizations.id text`. ✔
- No HR table uses `foreignKey({columns, foreignColumns})` today — all are bare `.references()`. ✔
- No HR parent table has `unique("...").on(orgId, id)` — must be added in Phase C before any Phase D FK. ✔
- `hrWorkflowSteps` has NO `org_id` column (only `definitionId`). ✔ confirmed in `workflow-engine.ts`.
- `feedbackCycleRequests` has NO `org_id` (only `cycleId`). ✔ confirmed in `feedback.ts`.
- `feedbackCycleResponses` has NO `org_id` (only `requestId`). ✔ confirmed in `feedback.ts`.
- `announcementReads` has NO `org_id` (only `announcementId`). ✔ confirmed in `announcements.ts`.
- `courseEnrollments` has NO `org_id` (only `courseId`). ✔ confirmed in `learning.ts`.
- `hrPollVotes` has NO `org_id` (only `pollId`). ✔ confirmed in `engagement-extras.ts`.
- `hrCommunityMembers` has NO `org_id` (only `communityId`). ✔ confirmed in `engagement-extras.ts`.
- `rosterEntries` has NO `org_id` (only `rosterId`). ✔ confirmed in `rosters.ts`.
- `departmentMembers` has NO `org_id` (only `departmentId`). ✔ confirmed in `employees.ts`.
- `hrAttendanceRegularizations.attendanceId` is bare integer with no `.references()`. ✔ confirmed in `attendance-regularizations.ts`.
- `hrEmployments.jobRoleId`, `jobLevelId`, `locationId` are all bare integers with no `.references()`. ✔ confirmed in `core-people.ts`.
- `hrTeams.parentTeamId` is bare integer with no `.references()`. ✔ confirmed in `core-org.ts`.

---

## Phase A — Add missing `org_id text NOT NULL` columns

**Migration file:** `0200_phase_a_hr_org_id.ts`
**Order invariant:** process parent before child within each transaction batch.

### A-1: `department_members`

Parent: `departments` (has `org_id`). No `org_id` on child today.

**Drizzle edit** (`backend/src/db/schema/hr/employees.ts`):

```typescript
// BEFORE
export const departmentMembers = pgTable("department_members", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => departments.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_dept_members_dept_user").on(table.departmentId, table.userId),
  index("idx_dept_members_user_id").on(table.userId),
]);

// AFTER
export const departmentMembers = pgTable("department_members", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  departmentId: integer("department_id").references(() => departments.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_dept_members_dept_user").on(table.departmentId, table.userId),
  index("idx_dept_members_user_id").on(table.userId),
  index("idx_dept_members_org").on(table.orgId),
]);
```

**Generated SQL:**
```sql
ALTER TABLE department_members ADD COLUMN org_id text;

UPDATE department_members dm
SET org_id = d.org_id
FROM departments d
WHERE d.id = dm.department_id;

-- Verify: must return 0
SELECT COUNT(*) FROM department_members WHERE org_id IS NULL;

ALTER TABLE department_members ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE department_members
  ADD CONSTRAINT department_members_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);

CREATE INDEX idx_dept_members_org ON department_members (org_id);
```

**Quarantine query:**
```sql
SELECT id FROM department_members
WHERE department_id NOT IN (SELECT id FROM departments);
-- Move or delete any returned rows before proceeding.
```

---

### A-2: `roster_entries`

Parent: `rosters` (has `org_id`). No `org_id` on child today.

**Drizzle edit** (`backend/src/db/schema/hr/rosters.ts`):

```typescript
// BEFORE
export const rosterEntries = pgTable("roster_entries", {
  id: serial("id").primaryKey(),
  rosterId: integer("roster_id").references(() => rosters.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  shiftId: integer("shift_id").references(() => shiftTemplates.id),
  date: date("date").notNull(),
  isDayOff: jsonb("is_day_off").$type<boolean>().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_roster_entries_roster").on(table.rosterId),
  index("idx_roster_entries_user_date").on(table.userId, table.date),
]);

// AFTER
export const rosterEntries = pgTable("roster_entries", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  rosterId: integer("roster_id").references(() => rosters.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  shiftId: integer("shift_id").references(() => shiftTemplates.id),
  date: date("date").notNull(),
  isDayOff: jsonb("is_day_off").$type<boolean>().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_roster_entries_roster").on(table.rosterId),
  index("idx_roster_entries_user_date").on(table.userId, table.date),
  index("idx_roster_entries_org").on(table.orgId),
]);
```

**Generated SQL:**
```sql
ALTER TABLE roster_entries ADD COLUMN org_id text;

UPDATE roster_entries re
SET org_id = r.org_id
FROM rosters r
WHERE r.id = re.roster_id;

SELECT COUNT(*) FROM roster_entries WHERE org_id IS NULL;

ALTER TABLE roster_entries ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE roster_entries
  ADD CONSTRAINT roster_entries_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);

CREATE INDEX idx_roster_entries_org ON roster_entries (org_id);
```

**Quarantine query:**
```sql
SELECT id FROM roster_entries WHERE roster_id NOT IN (SELECT id FROM rosters);
```

---

### A-3: `feedback_cycle_requests`

Parent: `feedback_cycles` (has `org_id`). No `org_id` on child today.

**Drizzle edit** (`backend/src/db/schema/hr/feedback.ts`):

```typescript
// BEFORE
export const feedbackCycleRequests = pgTable("feedback_cycle_requests", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").references(() => feedbackCycles.id, { onDelete: "cascade" }).notNull(),
  subjectId: text("subject_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  relationship: text("relationship").notNull(),
  status: text("status").default("PENDING").notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_fb_cycle_req_cycle_sub_rev").on(table.cycleId, table.subjectId, table.reviewerId),
  index("idx_fb_cycle_requests_reviewer").on(table.reviewerId, table.status),
]);

// AFTER
export const feedbackCycleRequests = pgTable("feedback_cycle_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  cycleId: integer("cycle_id").references(() => feedbackCycles.id, { onDelete: "cascade" }).notNull(),
  subjectId: text("subject_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  relationship: text("relationship").notNull(),
  status: text("status").default("PENDING").notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_fb_cycle_req_cycle_sub_rev").on(table.cycleId, table.subjectId, table.reviewerId),
  index("idx_fb_cycle_requests_reviewer").on(table.reviewerId, table.status),
  index("idx_fb_cycle_requests_org").on(table.orgId),
]);
```

**Generated SQL:**
```sql
ALTER TABLE feedback_cycle_requests ADD COLUMN org_id text;

UPDATE feedback_cycle_requests fcr
SET org_id = fc.org_id
FROM feedback_cycles fc
WHERE fc.id = fcr.cycle_id;

SELECT COUNT(*) FROM feedback_cycle_requests WHERE org_id IS NULL;

ALTER TABLE feedback_cycle_requests ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE feedback_cycle_requests
  ADD CONSTRAINT feedback_cycle_requests_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);

CREATE INDEX idx_fb_cycle_requests_org ON feedback_cycle_requests (org_id);
```

**Quarantine query:**
```sql
SELECT id FROM feedback_cycle_requests
WHERE cycle_id NOT IN (SELECT id FROM feedback_cycles);
```

---

### A-4: `feedback_cycle_responses` (two-hop — parent A-3 must land first in same transaction)

Parent: `feedback_cycle_requests` (gets `org_id` in A-3 above).

**Drizzle edit** (`backend/src/db/schema/hr/feedback.ts`):

```typescript
// BEFORE
export const feedbackCycleResponses = pgTable("feedback_cycle_responses", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => feedbackCycleRequests.id, { onDelete: "cascade" }).notNull(),
  responses: jsonb("responses").$type<{ questionId: string; rating?: number; text?: string }[]>().default([]).notNull(),
  overallRating: integer("overall_rating"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fb_cycle_responses_request").on(table.requestId),
]);

// AFTER
export const feedbackCycleResponses = pgTable("feedback_cycle_responses", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  requestId: integer("request_id").references(() => feedbackCycleRequests.id, { onDelete: "cascade" }).notNull(),
  responses: jsonb("responses").$type<{ questionId: string; rating?: number; text?: string }[]>().default([]).notNull(),
  overallRating: integer("overall_rating"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fb_cycle_responses_request").on(table.requestId),
  index("idx_fb_cycle_responses_org").on(table.orgId),
]);
```

**Generated SQL (two-hop — run AFTER A-3 backfill in same migration):**
```sql
ALTER TABLE feedback_cycle_responses ADD COLUMN org_id text;

-- Two-hop: feedback_cycle_requests already has org_id from A-3 above
UPDATE feedback_cycle_responses fcrsp
SET org_id = fcreq.org_id
FROM feedback_cycle_requests fcreq
WHERE fcreq.id = fcrsp.request_id;

SELECT COUNT(*) FROM feedback_cycle_responses WHERE org_id IS NULL;

ALTER TABLE feedback_cycle_responses ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE feedback_cycle_responses
  ADD CONSTRAINT feedback_cycle_responses_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);

CREATE INDEX idx_fb_cycle_responses_org ON feedback_cycle_responses (org_id);
```

**Quarantine query:**
```sql
SELECT id FROM feedback_cycle_responses
WHERE request_id NOT IN (SELECT id FROM feedback_cycle_requests);
```

---

### A-5: `announcement_reads`

Parent: `announcements` (has `org_id`). No `org_id` on child today.

**Drizzle edit** (`backend/src/db/schema/hr/announcements.ts`):

```typescript
// BEFORE
export const announcementReads = pgTable("announcement_reads", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").references(() => announcements.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_announcement_reads_unique").on(table.announcementId, table.userId),
  index("idx_announcement_reads_announcement").on(table.announcementId),
  index("idx_announcement_reads_user").on(table.userId),
]);

// AFTER
export const announcementReads = pgTable("announcement_reads", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  announcementId: integer("announcement_id").references(() => announcements.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_announcement_reads_unique").on(table.announcementId, table.userId),
  index("idx_announcement_reads_announcement").on(table.announcementId),
  index("idx_announcement_reads_user").on(table.userId),
  index("idx_announcement_reads_org").on(table.orgId),
]);
```

**Generated SQL:**
```sql
ALTER TABLE announcement_reads ADD COLUMN org_id text;

UPDATE announcement_reads ar
SET org_id = a.org_id
FROM announcements a
WHERE a.id = ar.announcement_id;

SELECT COUNT(*) FROM announcement_reads WHERE org_id IS NULL;

ALTER TABLE announcement_reads ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE announcement_reads
  ADD CONSTRAINT announcement_reads_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);

CREATE INDEX idx_announcement_reads_org ON announcement_reads (org_id);
```

**Quarantine query:**
```sql
SELECT id FROM announcement_reads
WHERE announcement_id NOT IN (SELECT id FROM announcements);
```

---

### A-6: `course_enrollments`

Parent: `courses` (has `org_id`). No `org_id` on child today.

**Drizzle edit** (`backend/src/db/schema/hr/learning.ts`):

```typescript
// BEFORE
export const courseEnrollments = pgTable("course_enrollments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: text("status").default("ENROLLED").notNull(),
  progressPct: decimal("progress_pct", { precision: 5, scale: 2 }).default("0").notNull(),
  completedAt: timestamp("completed_at"),
  score: decimal("score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_course_enrollments_course_user").on(table.courseId, table.userId),
  index("idx_course_enrollments_user").on(table.userId),
]);

// AFTER
export const courseEnrollments = pgTable("course_enrollments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: text("status").default("ENROLLED").notNull(),
  progressPct: decimal("progress_pct", { precision: 5, scale: 2 }).default("0").notNull(),
  completedAt: timestamp("completed_at"),
  score: decimal("score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_course_enrollments_course_user").on(table.courseId, table.userId),
  index("idx_course_enrollments_user").on(table.userId),
  index("idx_course_enrollments_org").on(table.orgId),
]);
```

**Generated SQL:**
```sql
ALTER TABLE course_enrollments ADD COLUMN org_id text;

UPDATE course_enrollments ce
SET org_id = c.org_id
FROM courses c
WHERE c.id = ce.course_id;

SELECT COUNT(*) FROM course_enrollments WHERE org_id IS NULL;

ALTER TABLE course_enrollments ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE course_enrollments
  ADD CONSTRAINT course_enrollments_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);

CREATE INDEX idx_course_enrollments_org ON course_enrollments (org_id);
```

**Quarantine query:**
```sql
SELECT id FROM course_enrollments WHERE course_id NOT IN (SELECT id FROM courses);
```

---

### A-7: `hr_poll_votes`

Parent: `hr_polls` (has `org_id`). No `org_id` on child today.

**Drizzle edit** (`backend/src/db/schema/hr/engagement-extras.ts`):

```typescript
// BEFORE
export const hrPollVotes = pgTable("hr_poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").references(() => hrPolls.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("uniq_poll_vote_poll_user").on(t.pollId, t.userId),
  index("idx_poll_votes_poll").on(t.pollId),
]);

// AFTER
export const hrPollVotes = pgTable("hr_poll_votes", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  pollId: integer("poll_id").references(() => hrPolls.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("uniq_poll_vote_poll_user").on(t.pollId, t.userId),
  index("idx_poll_votes_poll").on(t.pollId),
  index("idx_poll_votes_org").on(t.orgId),
]);
```

**Generated SQL:**
```sql
ALTER TABLE hr_poll_votes ADD COLUMN org_id text;

UPDATE hr_poll_votes pv
SET org_id = p.org_id
FROM hr_polls p
WHERE p.id = pv.poll_id;

SELECT COUNT(*) FROM hr_poll_votes WHERE org_id IS NULL;

ALTER TABLE hr_poll_votes ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE hr_poll_votes
  ADD CONSTRAINT hr_poll_votes_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);

CREATE INDEX idx_poll_votes_org ON hr_poll_votes (org_id);
```

**Quarantine query:**
```sql
SELECT id FROM hr_poll_votes WHERE poll_id NOT IN (SELECT id FROM hr_polls);
```

---

### A-8: `hr_community_members`

Parent: `hr_communities` (has `org_id`). No `org_id` on child today.

**Drizzle edit** (`backend/src/db/schema/hr/engagement-extras.ts`):

```typescript
// BEFORE
export const hrCommunityMembers = pgTable("hr_community_members", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").references(() => hrCommunities.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: communityMemberRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("uniq_community_member").on(t.communityId, t.userId),
  index("idx_community_members_community").on(t.communityId),
  index("idx_community_members_user").on(t.userId),
]);

// AFTER
export const hrCommunityMembers = pgTable("hr_community_members", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  communityId: integer("community_id").references(() => hrCommunities.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: communityMemberRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("uniq_community_member").on(t.communityId, t.userId),
  index("idx_community_members_community").on(t.communityId),
  index("idx_community_members_user").on(t.userId),
  index("idx_community_members_org").on(t.orgId),
]);
```

**Generated SQL:**
```sql
ALTER TABLE hr_community_members ADD COLUMN org_id text;

UPDATE hr_community_members cm
SET org_id = c.org_id
FROM hr_communities c
WHERE c.id = cm.community_id;

SELECT COUNT(*) FROM hr_community_members WHERE org_id IS NULL;

ALTER TABLE hr_community_members ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE hr_community_members
  ADD CONSTRAINT hr_community_members_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);

CREATE INDEX idx_community_members_org ON hr_community_members (org_id);
```

**Quarantine query:**
```sql
SELECT id FROM hr_community_members WHERE community_id NOT IN (SELECT id FROM hr_communities);
```

---

### A-9: `hr_workflow_steps`

Parent: `hr_workflow_definitions` (has `org_id`). No `org_id` on child today.

**Drizzle edit** (`backend/src/db/schema/hr/workflow-engine.ts`):

```typescript
// BEFORE
export const hrWorkflowSteps = pgTable("hr_workflow_steps", {
  id: serial("id").primaryKey(),
  definitionId: integer("definition_id").references(() => hrWorkflowDefinitions.id, { onDelete: "cascade" }).notNull(),
  stepOrder: integer("step_order").notNull(),
  name: text("name").notNull(),
  approverType: hrWorkflowApproverTypeEnum("approver_type").notNull(),
  approverValue: text("approver_value"),
  mode: hrWorkflowStepModeEnum("mode").default("serial").notNull(),
  slaHours: integer("sla_hours"),
  escalationApproverType: hrWorkflowApproverTypeEnum("escalation_approver_type"),
  escalationApproverValue: text("escalation_approver_value"),
  condition: jsonb("condition").$type<{ field: string; operator: string; value: unknown } | null>(),
}, (table) => [
  index("idx_hr_wf_steps_def_order").on(table.definitionId, table.stepOrder),
]);

// AFTER
export const hrWorkflowSteps = pgTable("hr_workflow_steps", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  definitionId: integer("definition_id").references(() => hrWorkflowDefinitions.id, { onDelete: "cascade" }).notNull(),
  stepOrder: integer("step_order").notNull(),
  name: text("name").notNull(),
  approverType: hrWorkflowApproverTypeEnum("approver_type").notNull(),
  approverValue: text("approver_value"),
  mode: hrWorkflowStepModeEnum("mode").default("serial").notNull(),
  slaHours: integer("sla_hours"),
  escalationApproverType: hrWorkflowApproverTypeEnum("escalation_approver_type"),
  escalationApproverValue: text("escalation_approver_value"),
  condition: jsonb("condition").$type<{ field: string; operator: string; value: unknown } | null>(),
}, (table) => [
  index("idx_hr_wf_steps_def_order").on(table.definitionId, table.stepOrder),
  index("idx_hr_wf_steps_org").on(table.orgId),
]);
```

**Generated SQL:**
```sql
ALTER TABLE hr_workflow_steps ADD COLUMN org_id text;

UPDATE hr_workflow_steps wfs
SET org_id = wfd.org_id
FROM hr_workflow_definitions wfd
WHERE wfd.id = wfs.definition_id;

SELECT COUNT(*) FROM hr_workflow_steps WHERE org_id IS NULL;

ALTER TABLE hr_workflow_steps ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE hr_workflow_steps
  ADD CONSTRAINT hr_workflow_steps_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);

CREATE INDEX idx_hr_wf_steps_org ON hr_workflow_steps (org_id);
```

**Quarantine query:**
```sql
SELECT id FROM hr_workflow_steps WHERE definition_id NOT IN (SELECT id FROM hr_workflow_definitions);
```

---

### A-10 through A-25 — Remaining HR tables (see matrix for full list)

The following tables follow the exact same SQL pattern as A-1 through A-9.
Each: `ALTER TABLE ... ADD COLUMN org_id text` → backfill from parent → verify zero nulls → `SET NOT NULL` → add single-col FK → add index.

| # | Table | Parent FK col | Backfill from | Source file |
|---|-------|--------------|---------------|-------------|
| 10 | `key_results` | `goal_id` | `goals.org_id` | `performance.ts` |
| 11 | `survey_responses` | `survey_id` | `pulse_surveys.org_id` | `performance.ts` |
| 12 | `assessment_attempts` | `assessment_id` | `skill_assessments.org_id` | `performance.ts` (kpis.ts) |
| 13 | `competencies` | `framework_id` | `competency_frameworks.org_id` | `kpis.ts` |
| 14 | `training_attendance` | `program_id` | `training_programs.org_id` | `training.ts` |
| 15 | `team_event_participants` | `event_id` | `team_events.org_id` | `training.ts` |
| 16 | `interview_scorecards` | `interview_id` | `interviews.org_id` | `recruitment.ts` (hiring.ts) |
| 17 | `booking_link_interviewers` | `booking_link_id` | `interview_booking_links.org_id` | `recruitment.ts` |
| 18 | `vault_access_logs` | `vault_document_id` | `candidate_documents_vault.org_id` | `recruitment.ts` |
| 19 | `email_sequence_steps` | `sequence_id` | `email_sequences.org_id` | `recruitment.ts` |
| 20 | `email_sequence_enrollments` | `sequence_id` | `email_sequences.org_id` | `recruitment.ts` |
| 21 | `vendor_candidate_submissions` | `vendor_id` | `recruitment_vendors.org_id` | `staffing.ts` |
| 22 | `job_recruiters` | `job_posting_id` | `job_postings.org_id` | `recruitment.ts` |
| 23 | `onboarding_template_steps` | `template_id` | `onboarding_templates.org_id` | `offboarding.ts` |
| 24 | `exit_checklists` | `resignation_id` | `resignations.org_id` | `offboarding.ts` |
| 25 | `hr_import_rows` | `job_id` | `hr_import_jobs.org_id` | `import-jobs.ts` |

**Note on `hr_import_rows` (row 25):** PK is UUID, not serial. The org_id backfill pattern is identical — UUID PK does not affect the org_id column type or backfill SQL.

**Phase A gate — run for every table in A-1 through A-25 before proceeding:**
```sql
SELECT COUNT(*) FROM <table> WHERE org_id IS NULL;
-- must return 0

SELECT COUNT(*) FROM <table> t
WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = t.org_id);
-- must return 0
```

---

## Phase B — Add missing single-column `.references()` on bare FK columns

**Migration file:** `0203_phase_b_hr_bare_fks.ts`
**Gate:** Phase A must be complete before this phase begins.

### B-1: `hr_employments` — three bare FK columns

These columns (`job_role_id`, `job_level_id`, `location_id`) are all `integer` with no `.references()` on `hrEmployments` in `core-people.ts`.

**Quarantine queries (run before adding constraints):**
```sql
SELECT id FROM hr_employments
WHERE job_role_id IS NOT NULL
  AND job_role_id NOT IN (SELECT id FROM hr_job_roles);
-- Null the column for any returned rows:
UPDATE hr_employments SET job_role_id = NULL WHERE id IN (<returned ids>);

SELECT id FROM hr_employments
WHERE job_level_id IS NOT NULL
  AND job_level_id NOT IN (SELECT id FROM hr_job_levels);
UPDATE hr_employments SET job_level_id = NULL WHERE id IN (<returned ids>);

SELECT id FROM hr_employments
WHERE location_id IS NOT NULL
  AND location_id NOT IN (SELECT id FROM hr_locations);
UPDATE hr_employments SET location_id = NULL WHERE id IN (<returned ids>);
```

**Drizzle edit** (`backend/src/db/schema/hr/core-people.ts`):

```typescript
// BEFORE — three bare integer columns on hrEmployments:
  jobRoleId: integer("job_role_id"),
  jobLevelId: integer("job_level_id"),
  employmentTypeId: integer("employment_type_id"),
  locationId: integer("location_id"),

// AFTER — add .references() to the three with known parents:
  jobRoleId: integer("job_role_id").references(() => hrJobRoles.id, { onDelete: "set null" }),
  jobLevelId: integer("job_level_id").references(() => hrJobLevels.id, { onDelete: "set null" }),
  employmentTypeId: integer("employment_type_id"),  // leave until parent table confirmed
  locationId: integer("location_id").references(() => hrLocations.id, { onDelete: "set null" }),
```

**Note on `employmentTypeId`:** The matrix flags this as ambiguous — no `employment_types` table was confirmed in the schema. Do NOT add a FK until `employment_type_id` target is verified. Leave as bare integer.

**Generated SQL:**
```sql
ALTER TABLE hr_employments
  ADD CONSTRAINT hr_employments_job_role_id_fk
  FOREIGN KEY (job_role_id) REFERENCES hr_job_roles(id) ON DELETE SET NULL;

ALTER TABLE hr_employments
  ADD CONSTRAINT hr_employments_job_level_id_fk
  FOREIGN KEY (job_level_id) REFERENCES hr_job_levels(id) ON DELETE SET NULL;

ALTER TABLE hr_employments
  ADD CONSTRAINT hr_employments_location_id_fk
  FOREIGN KEY (location_id) REFERENCES hr_locations(id) ON DELETE SET NULL;
```

---

### B-2: `hr_teams.parent_team_id` — self-referential bare FK

**Drizzle edit** (`backend/src/db/schema/hr/core-org.ts`):

```typescript
// BEFORE
  parentTeamId: integer("parent_team_id"),

// AFTER
  parentTeamId: integer("parent_team_id").references((): AnyPgColumn => hrTeams.id, { onDelete: "set null" }),
```

**Note:** self-referential `.references()` requires the `(): AnyPgColumn =>` lazy form to avoid circular reference at parse time. Import `AnyPgColumn` from `drizzle-orm/pg-core`.

**Quarantine query:**
```sql
SELECT id FROM hr_teams
WHERE parent_team_id IS NOT NULL
  AND parent_team_id NOT IN (SELECT id FROM hr_teams);
UPDATE hr_teams SET parent_team_id = NULL WHERE id IN (<returned ids>);
```

**Generated SQL:**
```sql
ALTER TABLE hr_teams
  ADD CONSTRAINT hr_teams_parent_team_id_fk
  FOREIGN KEY (parent_team_id) REFERENCES hr_teams(id) ON DELETE SET NULL;
```

---

### B-3: `hr_attendance_regularizations.attendance_id` — bare FK

**Drizzle edit** (`backend/src/db/schema/hr/attendance-regularizations.ts`):

```typescript
// BEFORE
  attendanceId: integer("attendance_id"),

// AFTER
  attendanceId: integer("attendance_id").references(() => attendance.id, { onDelete: "set null" }),
```

**Quarantine query:**
```sql
SELECT id FROM hr_attendance_regularizations
WHERE attendance_id IS NOT NULL
  AND attendance_id NOT IN (SELECT id FROM attendance);
UPDATE hr_attendance_regularizations SET attendance_id = NULL WHERE id IN (<returned ids>);
```

**Generated SQL:**
```sql
ALTER TABLE hr_attendance_regularizations
  ADD CONSTRAINT hr_attendance_regs_attendance_id_fk
  FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE SET NULL;
```

---

### B-4 through B-11 — Remaining bare FK columns

| # | Table | Column | Parent table | Nullable | Action |
|---|-------|--------|-------------|---------|--------|
| 4 | `hr_loan_repayments` | `loan_id` | `salary_loans` | NOT NULL | `.references(() => salaryLoans.id, { onDelete: "restrict" })` |
| 5 | `hr_travel_visit_logs` | `travel_request_id` | `travel_requests` | NOT NULL | `.references(() => travelRequests.id, { onDelete: "restrict" })` |
| 6 | `hr_disciplinary_actions` | `letter_render_id` | `hr_template_renders` | nullable | `.references(() => hrTemplateRenders.id, { onDelete: "set null" })` |
| 7 | `hr_positions` | `job_level_id` | `hr_job_levels` | nullable | `.references(() => hrJobLevels.id, { onDelete: "set null" })` |
| 8 | `hr_hiring_plan_items` | `linked_requisition_id` | `job_requisitions` | nullable | `.references(() => jobRequisitions.id, { onDelete: "set null" })` |
| 9 | `job_requisitions` | `linked_job_id` | `job_postings` | nullable | `.references(() => jobPostings.id, { onDelete: "set null" })` |
| 10 | `hr_templates` | `parent_template_id` | `hr_templates` (self-ref) | nullable | `.references((): AnyPgColumn => hrTemplates.id, { onDelete: "set null" })` |
| 11 | `hr_policies` | `parent_policy_id` | `hr_policies` (self-ref) | nullable | `.references((): AnyPgColumn => hrPolicies.id, { onDelete: "set null" })` |

For each:
1. Run quarantine query (null orphaned rows).
2. Generate SQL: `ALTER TABLE <table> ADD CONSTRAINT <name> FOREIGN KEY (<col>) REFERENCES <parent>(id) ON DELETE <policy>;`

**`hr_time_devices.location_id` and `hr_automation_runs.triggered_by_run_id`** follow the same pattern (see enterprise-comp.ts and automation-engine.ts respectively).

**Phase B gate:**
```sql
-- For every constraint added in B-1 through B-11:
SELECT conname FROM pg_constraint
WHERE conrelid = '<table>'::regclass
  AND contype = 'f'
  AND conname LIKE '%<column>%';
-- must return one row per constraint

SELECT COUNT(*) FROM <table>
WHERE <fk_col> IS NOT NULL
  AND <fk_col> NOT IN (SELECT id FROM <parent>);
-- must return 0
```

---

## Phase C — Add `UNIQUE(org_id, id)` candidate keys on parent tables

**Migration file:** `0206_phase_c_hr_candidate_keys.ts`
**Critical:** Use `unique("constraint_name").on(table.orgId, table.id)` in Drizzle — NOT `uniqueIndex`. PostgreSQL requires a `UNIQUE` constraint (not just a unique index) for a FK to reference the columns.
**Large tables (>500k rows):** Build `UNIQUE INDEX CONCURRENTLY` first, then promote to constraint via `ADD CONSTRAINT ... UNIQUE USING INDEX`.

### C.1-B — HR org structure parents

For each table, add `unique("uniq_<table>_org_id_id").on(t.orgId, t.id)` inside the table's constraints array.

**Drizzle edits:**

```typescript
// departments (employees.ts)
// BEFORE:
}, (table) => [
  uniqueIndex("uniq_departments_org_name").on(table.orgId, table.name),
]);
// AFTER:
}, (table) => [
  uniqueIndex("uniq_departments_org_name").on(table.orgId, table.name),
  unique("uniq_departments_org_id_id").on(table.orgId, table.id),
]);

// hr_job_roles (core-org.ts)
// BEFORE:
}, (table) => [
  uniqueIndex("uniq_hr_job_roles_org_name").on(table.orgId, table.name),
  index("idx_hr_job_roles_org").on(table.orgId),
]);
// AFTER:
}, (table) => [
  uniqueIndex("uniq_hr_job_roles_org_name").on(table.orgId, table.name),
  index("idx_hr_job_roles_org").on(table.orgId),
  unique("uniq_hr_job_roles_org_id_id").on(table.orgId, table.id),
]);

// hr_job_levels (core-org.ts) — same pattern
// hr_locations (core-org.ts) — same pattern
// hr_teams (core-org.ts) — same pattern
// hr_custom_field_definitions (core-org.ts) — same pattern

// hr_people (core-people.ts)
// Add: unique("uniq_hr_people_org_id_id").on(table.orgId, table.id)

// hr_employments (core-people.ts)
// Add: unique("uniq_hr_employments_org_id_id").on(table.orgId, table.id)
```

**Generated SQL pattern (one per parent table):**
```sql
-- For large tables: build concurrently first
CREATE UNIQUE INDEX CONCURRENTLY uniq_departments_org_id_id_idx
  ON departments (org_id, id);
ALTER TABLE departments
  ADD CONSTRAINT uniq_departments_org_id_id
  UNIQUE USING INDEX uniq_departments_org_id_id_idx;

-- For small tables: inline
ALTER TABLE hr_job_roles
  ADD CONSTRAINT uniq_hr_job_roles_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_job_levels
  ADD CONSTRAINT uniq_hr_job_levels_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_locations
  ADD CONSTRAINT uniq_hr_locations_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_teams
  ADD CONSTRAINT uniq_hr_teams_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_custom_field_definitions
  ADD CONSTRAINT uniq_hr_custom_field_definitions_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_people
  ADD CONSTRAINT uniq_hr_people_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_employments
  ADD CONSTRAINT uniq_hr_employments_org_id_id UNIQUE (org_id, id);
```

**Pre-check (verify no duplicates before adding constraint):**
```sql
SELECT org_id, id, COUNT(*) FROM departments GROUP BY org_id, id HAVING COUNT(*) > 1;
-- repeat for each parent; must return 0 rows
```

### C.1-C — HR leave + attendance parents

```sql
ALTER TABLE leave_types
  ADD CONSTRAINT uniq_leave_types_org_id_id UNIQUE (org_id, id);
ALTER TABLE attendance
  ADD CONSTRAINT uniq_attendance_org_id_id UNIQUE (org_id, id);
ALTER TABLE shift_templates
  ADD CONSTRAINT uniq_shift_templates_org_id_id UNIQUE (org_id, id);
ALTER TABLE rosters
  ADD CONSTRAINT uniq_rosters_org_id_id UNIQUE (org_id, id);
```

### C.1-D — HR lifecycle parents

```sql
ALTER TABLE hr_templates
  ADD CONSTRAINT uniq_hr_templates_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_policies
  ADD CONSTRAINT uniq_hr_policies_org_id_id UNIQUE (org_id, id);
ALTER TABLE review_cycles
  ADD CONSTRAINT uniq_review_cycles_org_id_id UNIQUE (org_id, id);
ALTER TABLE goals
  ADD CONSTRAINT uniq_goals_org_id_id UNIQUE (org_id, id);
ALTER TABLE feedback_cycles
  ADD CONSTRAINT uniq_feedback_cycles_org_id_id UNIQUE (org_id, id);
ALTER TABLE pulse_surveys
  ADD CONSTRAINT uniq_pulse_surveys_org_id_id UNIQUE (org_id, id);
ALTER TABLE skill_assessments
  ADD CONSTRAINT uniq_skill_assessments_org_id_id UNIQUE (org_id, id);
ALTER TABLE competency_frameworks
  ADD CONSTRAINT uniq_competency_frameworks_org_id_id UNIQUE (org_id, id);
ALTER TABLE one_on_one_meetings
  ADD CONSTRAINT uniq_one_on_one_meetings_org_id_id UNIQUE (org_id, id);
ALTER TABLE courses
  ADD CONSTRAINT uniq_courses_org_id_id UNIQUE (org_id, id);
ALTER TABLE course_categories
  ADD CONSTRAINT uniq_course_categories_org_id_id UNIQUE (org_id, id);
ALTER TABLE training_programs
  ADD CONSTRAINT uniq_training_programs_org_id_id UNIQUE (org_id, id);
ALTER TABLE team_events
  ADD CONSTRAINT uniq_team_events_org_id_id UNIQUE (org_id, id);
ALTER TABLE announcements
  ADD CONSTRAINT uniq_announcements_org_id_id UNIQUE (org_id, id);
ALTER TABLE rich_documents
  ADD CONSTRAINT uniq_rich_documents_org_id_id UNIQUE (org_id, id);
ALTER TABLE documents
  ADD CONSTRAINT uniq_documents_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_benefit_plans
  ADD CONSTRAINT uniq_hr_benefit_plans_org_id_id UNIQUE (org_id, id);
ALTER TABLE salary_loans
  ADD CONSTRAINT uniq_salary_loans_org_id_id UNIQUE (org_id, id);
ALTER TABLE tax_declarations
  ADD CONSTRAINT uniq_tax_declarations_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_cases
  ADD CONSTRAINT uniq_hr_cases_org_id_id UNIQUE (org_id, id);
ALTER TABLE biometric_devices
  ADD CONSTRAINT uniq_biometric_devices_org_id_id UNIQUE (org_id, id);
ALTER TABLE helpdesk_tickets
  ADD CONSTRAINT uniq_helpdesk_tickets_org_id_id UNIQUE (org_id, id);
ALTER TABLE assets
  ADD CONSTRAINT uniq_assets_org_id_id UNIQUE (org_id, id);
ALTER TABLE travel_requests
  ADD CONSTRAINT uniq_travel_requests_org_id_id UNIQUE (org_id, id);
```

### C — Additional HR parents (recruitment + hiring + engagement)

```sql
-- hiring
ALTER TABLE hiring_flows          ADD CONSTRAINT uniq_hiring_flows_org_id_id UNIQUE (org_id, id);
ALTER TABLE scorecard_templates   ADD CONSTRAINT uniq_scorecard_templates_org_id_id UNIQUE (org_id, id);
ALTER TABLE candidates            ADD CONSTRAINT uniq_candidates_org_id_id UNIQUE (org_id, id);
ALTER TABLE job_postings          ADD CONSTRAINT uniq_job_postings_org_id_id UNIQUE (org_id, id);
ALTER TABLE job_requisitions      ADD CONSTRAINT uniq_job_requisitions_org_id_id UNIQUE (org_id, id);
ALTER TABLE interviews            ADD CONSTRAINT uniq_interviews_org_id_id UNIQUE (org_id, id);
ALTER TABLE interview_booking_links ADD CONSTRAINT uniq_interview_booking_links_org_id_id UNIQUE (org_id, id);
ALTER TABLE candidate_offers      ADD CONSTRAINT uniq_candidate_offers_org_id_id UNIQUE (org_id, id);
ALTER TABLE email_sequences       ADD CONSTRAINT uniq_email_sequences_org_id_id UNIQUE (org_id, id);
ALTER TABLE recruitment_vendors   ADD CONSTRAINT uniq_recruitment_vendors_org_id_id UNIQUE (org_id, id);
ALTER TABLE candidate_documents_vault ADD CONSTRAINT uniq_candidate_documents_vault_org_id_id UNIQUE (org_id, id);
ALTER TABLE calibration_sessions  ADD CONSTRAINT uniq_calibration_sessions_org_id_id UNIQUE (org_id, id);
ALTER TABLE talent_pools          ADD CONSTRAINT uniq_talent_pools_org_id_id UNIQUE (org_id, id);
ALTER TABLE external_referrers    ADD CONSTRAINT uniq_external_referrers_org_id_id UNIQUE (org_id, id);
-- offboarding
ALTER TABLE onboarding_templates  ADD CONSTRAINT uniq_onboarding_templates_org_id_id UNIQUE (org_id, id);
ALTER TABLE document_templates    ADD CONSTRAINT uniq_document_templates_org_id_id UNIQUE (org_id, id);
ALTER TABLE onboarding_template_steps ADD CONSTRAINT uniq_onboarding_template_steps_org_id_id UNIQUE (org_id, id);
ALTER TABLE document_types        ADD CONSTRAINT uniq_document_types_org_id_id UNIQUE (org_id, id);
ALTER TABLE onboarding_documents  ADD CONSTRAINT uniq_onboarding_documents_org_id_id UNIQUE (org_id, id);
ALTER TABLE resignations          ADD CONSTRAINT uniq_resignations_org_id_id UNIQUE (org_id, id);
-- engagement
ALTER TABLE hr_badges             ADD CONSTRAINT uniq_hr_badges_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_polls              ADD CONSTRAINT uniq_hr_polls_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_communities        ADD CONSTRAINT uniq_hr_communities_org_id_id UNIQUE (org_id, id);
-- workflow + policy + template
ALTER TABLE hr_workflow_definitions  ADD CONSTRAINT uniq_hr_workflow_definitions_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_workflow_instances    ADD CONSTRAINT uniq_hr_workflow_instances_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_automation_rules      ADD CONSTRAINT uniq_hr_automation_rules_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_template_renders      ADD CONSTRAINT uniq_hr_template_renders_org_id_id UNIQUE (org_id, id);
-- enterprise
ALTER TABLE hr_comp_cycles           ADD CONSTRAINT uniq_hr_comp_cycles_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_equity_grants         ADD CONSTRAINT uniq_hr_equity_grants_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_time_devices          ADD CONSTRAINT uniq_hr_time_devices_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_accommodation_requests ADD CONSTRAINT uniq_hr_accommodation_requests_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_emergency_events      ADD CONSTRAINT uniq_hr_emergency_events_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_import_jobs           ADD CONSTRAINT uniq_hr_import_jobs_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_compliance_requirements ADD CONSTRAINT uniq_hr_compliance_requirements_org_id_id UNIQUE (org_id, id);
ALTER TABLE hr_legal_holds           ADD CONSTRAINT uniq_hr_legal_holds_org_id_id UNIQUE (org_id, id);
-- cases
ALTER TABLE hr_cases                 ADD CONSTRAINT uniq_hr_cases_org_id_id UNIQUE (org_id, id);
-- webhooks
ALTER TABLE hr_webhook_subscriptions ADD CONSTRAINT uniq_hr_webhook_subscriptions_org_id_id UNIQUE (org_id, id);
-- headcount
ALTER TABLE hr_headcount_plans       ADD CONSTRAINT uniq_hr_headcount_plans_org_id_id UNIQUE (org_id, id);
```

**Phase C gate:**
```sql
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = '<table>'::regclass
  AND contype = 'u'
  AND conname LIKE '%org_id_id%';
-- must return 1 row per parent table

SELECT org_id, id, COUNT(*) FROM <table>
GROUP BY org_id, id HAVING COUNT(*) > 1;
-- must return 0 rows for every parent
```

---

## Phase D — Add composite FKs `(org_id, parent_id) → parent(org_id, id)`

**Migration file:** `0210_phase_d_hr_composite_fks.ts` (NOT VALID) + `0216_phase_d_validate_hr.ts` (VALIDATE)
**Gate:** All Phase A, B, C gates must pass. Use `NOT VALID` on all tables >50k rows; validate separately.
**onDelete policy:** `restrict` for core identity rows; `cascade` for audit/log rows; `set null` for optional cross-refs.

### D-1: `department_members` → `departments`

**Drizzle edit** (`backend/src/db/schema/hr/employees.ts`) — add to table constraints array:

```typescript
import { foreignKey } from "drizzle-orm/pg-core";

// ADD to departmentMembers table constraints:
foreignKey({
  name: "fk_dept_members_org_dept",
  columns: [table.orgId, table.departmentId],
  foreignColumns: [departments.orgId, departments.id],
}).onDelete("cascade"),
```

**Generated SQL:**
```sql
-- Quarantine cross-tenant rows first
BEGIN;
INSERT INTO department_members_cross_tenant_quarantine
  SELECT *, now() AS quarantined_at, 'wave-4-phase-d' AS reason
  FROM department_members dm
  WHERE NOT EXISTS (
    SELECT 1 FROM departments d
    WHERE d.org_id = dm.org_id AND d.id = dm.department_id
  );

DELETE FROM department_members dm
WHERE EXISTS (
  SELECT 1 FROM department_members_cross_tenant_quarantine q WHERE q.id = dm.id
);
COMMIT;

ALTER TABLE department_members
  ADD CONSTRAINT fk_dept_members_org_dept
  FOREIGN KEY (org_id, department_id)
  REFERENCES departments(org_id, id)
  ON DELETE CASCADE
  NOT VALID;
```

**VALIDATE (migration 0216):**
```sql
ALTER TABLE department_members VALIDATE CONSTRAINT fk_dept_members_org_dept;
```

---

### D-2: `hr_custom_field_values` → `hr_custom_field_definitions`

**Drizzle edit** (`backend/src/db/schema/hr/core-org.ts`):

```typescript
foreignKey({
  name: "fk_hr_cfv_org_field_def",
  columns: [table.orgId, table.fieldDefinitionId],
  foreignColumns: [hrCustomFieldDefinitions.orgId, hrCustomFieldDefinitions.id],
}).onDelete("cascade"),
```

**Generated SQL:**
```sql
-- Quarantine
SELECT id FROM hr_custom_field_values
WHERE (org_id, field_definition_id) NOT IN
  (SELECT org_id, id FROM hr_custom_field_definitions)
  AND field_definition_id IS NOT NULL;

ALTER TABLE hr_custom_field_values
  ADD CONSTRAINT fk_hr_cfv_org_field_def
  FOREIGN KEY (org_id, field_definition_id)
  REFERENCES hr_custom_field_definitions(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D-3: `hr_employments` → `hr_job_roles`, `hr_job_levels`, `hr_locations`

**Drizzle edit** (`backend/src/db/schema/hr/core-people.ts`):

```typescript
// ADD to hrEmployments constraints array:
foreignKey({
  name: "fk_hr_emp_org_job_role",
  columns: [table.orgId, table.jobRoleId],
  foreignColumns: [hrJobRoles.orgId, hrJobRoles.id],
}).onDelete("set null"),

foreignKey({
  name: "fk_hr_emp_org_job_level",
  columns: [table.orgId, table.jobLevelId],
  foreignColumns: [hrJobLevels.orgId, hrJobLevels.id],
}).onDelete("set null"),

foreignKey({
  name: "fk_hr_emp_org_location",
  columns: [table.orgId, table.locationId],
  foreignColumns: [hrLocations.orgId, hrLocations.id],
}).onDelete("set null"),
```

**Generated SQL:**
```sql
-- Quarantine cross-tenant job_role refs
SELECT id FROM hr_employments
WHERE job_role_id IS NOT NULL
  AND (org_id, job_role_id) NOT IN (SELECT org_id, id FROM hr_job_roles);
UPDATE hr_employments SET job_role_id = NULL WHERE id IN (<returned ids>);

ALTER TABLE hr_employments
  ADD CONSTRAINT fk_hr_emp_org_job_role
  FOREIGN KEY (org_id, job_role_id)
  REFERENCES hr_job_roles(org_id, id) ON DELETE SET NULL NOT VALID;

-- Quarantine cross-tenant job_level refs
SELECT id FROM hr_employments
WHERE job_level_id IS NOT NULL
  AND (org_id, job_level_id) NOT IN (SELECT org_id, id FROM hr_job_levels);
UPDATE hr_employments SET job_level_id = NULL WHERE id IN (<returned ids>);

ALTER TABLE hr_employments
  ADD CONSTRAINT fk_hr_emp_org_job_level
  FOREIGN KEY (org_id, job_level_id)
  REFERENCES hr_job_levels(org_id, id) ON DELETE SET NULL NOT VALID;

-- Quarantine cross-tenant location refs
SELECT id FROM hr_employments
WHERE location_id IS NOT NULL
  AND (org_id, location_id) NOT IN (SELECT org_id, id FROM hr_locations);
UPDATE hr_employments SET location_id = NULL WHERE id IN (<returned ids>);

ALTER TABLE hr_employments
  ADD CONSTRAINT fk_hr_emp_org_location
  FOREIGN KEY (org_id, location_id)
  REFERENCES hr_locations(org_id, id) ON DELETE SET NULL NOT VALID;
```

---

### D-4: `hr_employee_profiles` → `hr_employments`

```typescript
foreignKey({
  name: "fk_hr_emp_profile_org_emp",
  columns: [table.orgId, table.employmentId],
  foreignColumns: [hrEmployments.orgId, hrEmployments.id],
}).onDelete("cascade"),
```

```sql
SELECT id FROM hr_employee_profiles
WHERE (org_id, employment_id) NOT IN (SELECT org_id, id FROM hr_employments);

ALTER TABLE hr_employee_profiles
  ADD CONSTRAINT fk_hr_emp_profile_org_emp
  FOREIGN KEY (org_id, employment_id)
  REFERENCES hr_employments(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-5: `hr_employee_sensitive_fields` → `hr_employments`

```sql
SELECT id FROM hr_employee_sensitive_fields
WHERE (org_id, employment_id) NOT IN (SELECT org_id, id FROM hr_employments);

ALTER TABLE hr_employee_sensitive_fields
  ADD CONSTRAINT fk_hr_emp_sensitive_org_emp
  FOREIGN KEY (org_id, employment_id)
  REFERENCES hr_employments(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-6: `hr_employment_history` → `hr_employments`

```sql
SELECT id FROM hr_employment_history
WHERE (org_id, employment_id) NOT IN (SELECT org_id, id FROM hr_employments);

ALTER TABLE hr_employment_history
  ADD CONSTRAINT fk_hr_emp_history_org_emp
  FOREIGN KEY (org_id, employment_id)
  REFERENCES hr_employments(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-7: `hr_effective_dated_changes` → `hr_employments`

```sql
SELECT id FROM hr_effective_dated_changes
WHERE (org_id, employment_id) NOT IN (SELECT org_id, id FROM hr_employments);

ALTER TABLE hr_effective_dated_changes
  ADD CONSTRAINT fk_hr_eff_changes_org_emp
  FOREIGN KEY (org_id, employment_id)
  REFERENCES hr_employments(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-8: `hr_reporting_lines` → `hr_employments` (two FKs)

```sql
SELECT id FROM hr_reporting_lines
WHERE (org_id, employment_id) NOT IN (SELECT org_id, id FROM hr_employments);

ALTER TABLE hr_reporting_lines
  ADD CONSTRAINT fk_hr_rpt_lines_org_emp
  FOREIGN KEY (org_id, employment_id)
  REFERENCES hr_employments(org_id, id) ON DELETE CASCADE NOT VALID;

SELECT id FROM hr_reporting_lines
WHERE manager_employment_id IS NOT NULL
  AND (org_id, manager_employment_id) NOT IN (SELECT org_id, id FROM hr_employments);

ALTER TABLE hr_reporting_lines
  ADD CONSTRAINT fk_hr_rpt_lines_org_mgr
  FOREIGN KEY (org_id, manager_employment_id)
  REFERENCES hr_employments(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-9: `hr_teams` → self-referential composite FK

```sql
SELECT id FROM hr_teams
WHERE parent_team_id IS NOT NULL
  AND (org_id, parent_team_id) NOT IN (SELECT org_id, id FROM hr_teams);
UPDATE hr_teams SET parent_team_id = NULL WHERE id IN (<returned ids>);

ALTER TABLE hr_teams
  ADD CONSTRAINT fk_hr_teams_org_parent
  FOREIGN KEY (org_id, parent_team_id)
  REFERENCES hr_teams(org_id, id) ON DELETE SET NULL NOT VALID;
```

---

### D-10: `roster_entries` → `rosters` and `shift_templates`

```sql
SELECT id FROM roster_entries
WHERE (org_id, roster_id) NOT IN (SELECT org_id, id FROM rosters);

ALTER TABLE roster_entries
  ADD CONSTRAINT fk_roster_entries_org_roster
  FOREIGN KEY (org_id, roster_id)
  REFERENCES rosters(org_id, id) ON DELETE CASCADE NOT VALID;

SELECT id FROM roster_entries
WHERE shift_id IS NOT NULL
  AND (org_id, shift_id) NOT IN (SELECT org_id, id FROM shift_templates);
UPDATE roster_entries SET shift_id = NULL WHERE id IN (<returned ids>);

ALTER TABLE roster_entries
  ADD CONSTRAINT fk_roster_entries_org_shift
  FOREIGN KEY (org_id, shift_id)
  REFERENCES shift_templates(org_id, id) ON DELETE SET NULL NOT VALID;
```

---

### D-11: `hr_attendance_regularizations` → `attendance`

```sql
SELECT id FROM hr_attendance_regularizations
WHERE attendance_id IS NOT NULL
  AND (org_id, attendance_id) NOT IN (SELECT org_id, id FROM attendance);
UPDATE hr_attendance_regularizations SET attendance_id = NULL WHERE id IN (<returned ids>);

ALTER TABLE hr_attendance_regularizations
  ADD CONSTRAINT fk_hr_att_regs_org_attendance
  FOREIGN KEY (org_id, attendance_id)
  REFERENCES attendance(org_id, id) ON DELETE SET NULL NOT VALID;
```

---

### D-12: `employee_shift_assignments` → `shift_templates`

```sql
SELECT id FROM employee_shift_assignments
WHERE (org_id, shift_id) NOT IN (SELECT org_id, id FROM shift_templates);

ALTER TABLE employee_shift_assignments
  ADD CONSTRAINT fk_emp_shift_assign_org_shift
  FOREIGN KEY (org_id, shift_id)
  REFERENCES shift_templates(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-13: `biometric_logs` → `biometric_devices`

```sql
SELECT id FROM biometric_logs
WHERE (org_id, device_id) NOT IN (SELECT org_id, id FROM biometric_devices);

ALTER TABLE biometric_logs
  ADD CONSTRAINT fk_biometric_logs_org_device
  FOREIGN KEY (org_id, device_id)
  REFERENCES biometric_devices(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-14: `review_cycles` → `hr_templates`

```sql
SELECT id FROM review_cycles
WHERE template_id IS NOT NULL
  AND (org_id, template_id) NOT IN (SELECT org_id, id FROM hr_templates);
UPDATE review_cycles SET template_id = NULL WHERE id IN (<returned ids>);

ALTER TABLE review_cycles
  ADD CONSTRAINT fk_review_cycles_org_template
  FOREIGN KEY (org_id, template_id)
  REFERENCES hr_templates(org_id, id) ON DELETE SET NULL NOT VALID;
```

---

### D-15: `performance_reviews` → `review_cycles`

```sql
SELECT id FROM performance_reviews
WHERE cycle_id IS NOT NULL
  AND (org_id, cycle_id) NOT IN (SELECT org_id, id FROM review_cycles);
UPDATE performance_reviews SET cycle_id = NULL WHERE id IN (<returned ids>);

ALTER TABLE performance_reviews
  ADD CONSTRAINT fk_perf_reviews_org_cycle
  FOREIGN KEY (org_id, cycle_id)
  REFERENCES review_cycles(org_id, id) ON DELETE SET NULL NOT VALID;
```

---

### D-16: `one_on_one_action_items` → `one_on_one_meetings`

```sql
SELECT id FROM one_on_one_action_items
WHERE (org_id, meeting_id) NOT IN (SELECT org_id, id FROM one_on_one_meetings);

ALTER TABLE one_on_one_action_items
  ADD CONSTRAINT fk_one_on_one_action_items_org_meeting
  FOREIGN KEY (org_id, meeting_id)
  REFERENCES one_on_one_meetings(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-17: `goals` → self-referential composite FK

```sql
SELECT id FROM goals
WHERE parent_goal_id IS NOT NULL
  AND (org_id, parent_goal_id) NOT IN (SELECT org_id, id FROM goals);
UPDATE goals SET parent_goal_id = NULL WHERE id IN (<returned ids>);

ALTER TABLE goals
  ADD CONSTRAINT fk_goals_org_parent_goal
  FOREIGN KEY (org_id, parent_goal_id)
  REFERENCES goals(org_id, id) ON DELETE SET NULL NOT VALID;
```

---

### D-18: `feedback_cycle_requests` → `feedback_cycles`

```sql
SELECT id FROM feedback_cycle_requests
WHERE (org_id, cycle_id) NOT IN (SELECT org_id, id FROM feedback_cycles);

ALTER TABLE feedback_cycle_requests
  ADD CONSTRAINT fk_fb_cycle_requests_org_cycle
  FOREIGN KEY (org_id, cycle_id)
  REFERENCES feedback_cycles(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-19: `feedback_cycle_responses` → `feedback_cycle_requests`

```sql
SELECT id FROM feedback_cycle_responses
WHERE (org_id, request_id) NOT IN (SELECT org_id, id FROM feedback_cycle_requests);

ALTER TABLE feedback_cycle_responses
  ADD CONSTRAINT fk_fb_cycle_responses_org_request
  FOREIGN KEY (org_id, request_id)
  REFERENCES feedback_cycle_requests(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-20: `announcement_targets` → `announcements`

```sql
SELECT id FROM announcement_targets
WHERE (org_id, announcement_id) NOT IN (SELECT org_id, id FROM announcements);

ALTER TABLE announcement_targets
  ADD CONSTRAINT fk_announcement_targets_org_announcement
  FOREIGN KEY (org_id, announcement_id)
  REFERENCES announcements(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-21: `announcement_reads` → `announcements`

```sql
SELECT id FROM announcement_reads
WHERE (org_id, announcement_id) NOT IN (SELECT org_id, id FROM announcements);

ALTER TABLE announcement_reads
  ADD CONSTRAINT fk_announcement_reads_org_announcement
  FOREIGN KEY (org_id, announcement_id)
  REFERENCES announcements(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-22: `courses` → `course_categories`

```sql
SELECT id FROM courses
WHERE category_id IS NOT NULL
  AND (org_id, category_id) NOT IN (SELECT org_id, id FROM course_categories);
UPDATE courses SET category_id = NULL WHERE id IN (<returned ids>);

ALTER TABLE courses
  ADD CONSTRAINT fk_courses_org_category
  FOREIGN KEY (org_id, category_id)
  REFERENCES course_categories(org_id, id) ON DELETE SET NULL NOT VALID;
```

---

### D-23: `course_enrollments` → `courses`

```sql
SELECT id FROM course_enrollments
WHERE (org_id, course_id) NOT IN (SELECT org_id, id FROM courses);

ALTER TABLE course_enrollments
  ADD CONSTRAINT fk_course_enrollments_org_course
  FOREIGN KEY (org_id, course_id)
  REFERENCES courses(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-24: `hr_workflow_steps` → `hr_workflow_definitions`

```sql
SELECT id FROM hr_workflow_steps
WHERE (org_id, definition_id) NOT IN (SELECT org_id, id FROM hr_workflow_definitions);

ALTER TABLE hr_workflow_steps
  ADD CONSTRAINT fk_hr_wf_steps_org_definition
  FOREIGN KEY (org_id, definition_id)
  REFERENCES hr_workflow_definitions(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-25: `hr_workflow_instances` → `hr_workflow_definitions`

```sql
SELECT id FROM hr_workflow_instances
WHERE (org_id, definition_id) NOT IN (SELECT org_id, id FROM hr_workflow_definitions);

ALTER TABLE hr_workflow_instances
  ADD CONSTRAINT fk_hr_wf_instances_org_definition
  FOREIGN KEY (org_id, definition_id)
  REFERENCES hr_workflow_definitions(org_id, id) ON DELETE RESTRICT NOT VALID;
```

---

### D-26: `hr_workflow_step_actions` → `hr_workflow_instances`

```sql
SELECT id FROM hr_workflow_step_actions
WHERE (org_id, instance_id) NOT IN (SELECT org_id, id FROM hr_workflow_instances);

ALTER TABLE hr_workflow_step_actions
  ADD CONSTRAINT fk_hr_wf_actions_org_instance
  FOREIGN KEY (org_id, instance_id)
  REFERENCES hr_workflow_instances(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-27: `hr_badge_awards` → `hr_badges`

```sql
SELECT id FROM hr_badge_awards
WHERE (org_id, badge_id) NOT IN (SELECT org_id, id FROM hr_badges);

ALTER TABLE hr_badge_awards
  ADD CONSTRAINT fk_hr_badge_awards_org_badge
  FOREIGN KEY (org_id, badge_id)
  REFERENCES hr_badges(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-28: `hr_poll_votes` → `hr_polls`

```sql
SELECT id FROM hr_poll_votes
WHERE (org_id, poll_id) NOT IN (SELECT org_id, id FROM hr_polls);

ALTER TABLE hr_poll_votes
  ADD CONSTRAINT fk_hr_poll_votes_org_poll
  FOREIGN KEY (org_id, poll_id)
  REFERENCES hr_polls(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-29: `hr_community_members` → `hr_communities`

```sql
SELECT id FROM hr_community_members
WHERE (org_id, community_id) NOT IN (SELECT org_id, id FROM hr_communities);

ALTER TABLE hr_community_members
  ADD CONSTRAINT fk_hr_community_members_org_community
  FOREIGN KEY (org_id, community_id)
  REFERENCES hr_communities(org_id, id) ON DELETE CASCADE NOT VALID;
```

---

### D-30 through D-70 — Remaining HR composite FKs (abbreviated — same pattern)

Each row follows: quarantine → `ADD CONSTRAINT ... FOREIGN KEY (org_id, <col>) REFERENCES <parent>(org_id, id) NOT VALID`.

| Constraint name | Child table | FK col | Parent table | onDelete |
|---|---|---|---|---|
| `fk_leave_policies_org_leave_type` | `leave_policies` | `leave_type_id` | `leave_types` | restrict |
| `fk_hr_leave_ledger_org_leave_type` | `hr_leave_ledger` | `leave_type_id` | `leave_types` | restrict |
| `fk_hr_helpdesk_comments_org_ticket` | `hr_helpdesk_comments` | `ticket_id` | `helpdesk_tickets` | cascade |
| `fk_hr_probation_reviews_org_emp` | `hr_probation_reviews` | `employment_id` | `hr_employments` | cascade |
| `fk_hr_probation_reviews_org_person` | `hr_probation_reviews` | `person_id` | `hr_people` | cascade |
| `fk_hr_probation_reviews_org_tpl` | `hr_probation_reviews` | `review_template_id` | `hr_templates` | set null |
| `fk_hr_role_skill_req_org_role` | `hr_role_skill_requirements` | `job_role_id` | `hr_job_roles` | cascade |
| `fk_hr_succession_plans_org_role` | `hr_succession_plans` | `job_role_id` | `hr_job_roles` | set null |
| `fk_hr_case_notes_org_case` | `hr_case_notes` | `case_id` | `hr_cases` | cascade |
| `fk_hr_case_docs_org_case` | `hr_case_documents` | `case_id` | `hr_cases` | cascade |
| `fk_hr_disciplinary_org_case` | `hr_disciplinary_actions` | `case_id` | `hr_cases` | cascade |
| `fk_hr_disciplinary_org_render` | `hr_disciplinary_actions` | `letter_render_id` | `hr_template_renders` | set null |
| `fk_hr_work_auth_org_emp` | `hr_work_authorizations` | `employment_id` | `hr_employments` | cascade |
| `fk_hr_contracts_org_emp` | `hr_contracts` | `employment_id` | `hr_employments` | cascade |
| `fk_hr_compliance_events_org_req` | `hr_compliance_events` | `requirement_id` | `hr_compliance_requirements` | restrict |
| `fk_hr_headcount_plans_org_dept` | `hr_headcount_plans` | `department_id` | `departments` | set null |
| `fk_hr_hiring_plan_items_org_plan` | `hr_hiring_plan_items` | `plan_id` | `hr_headcount_plans` | restrict |
| `fk_hr_hiring_plan_items_org_req` | `hr_hiring_plan_items` | `linked_requisition_id` | `job_requisitions` | set null |
| `fk_hr_legal_hold_items_org_hold` | `hr_legal_hold_items` | `hold_id` | `hr_legal_holds` | cascade |
| `fk_hr_positions_org_dept` | `hr_positions` | `department_id` | `departments` | set null |
| `fk_hr_positions_org_level` | `hr_positions` | `job_level_id` | `hr_job_levels` | set null |
| `fk_documents_org_dept` | `documents` | `department_id` | `departments` | set null |
| `fk_documents_org_parent` | `documents` | `parent_document_id` | `documents` | set null |
| `fk_handbook_versions_org_doc` | `handbook_versions` | `document_id` | `rich_documents` | restrict |
| `fk_policy_acknowledgments_org_doc` | `policy_acknowledgments` | `document_id` | `documents` | restrict |
| `fk_hr_benefit_enroll_windows_org_plan` | `hr_benefit_enrollment_windows` | `plan_id` | `hr_benefit_plans` | restrict |
| `fk_hr_benefit_enrollments_org_plan` | `hr_benefit_enrollments` | `plan_id` | `hr_benefit_plans` | restrict |
| `fk_hr_insurance_claims_org_plan` | `hr_insurance_claims` | `plan_id` | `hr_benefit_plans` | restrict |
| `fk_hr_loan_repayments_org_loan` | `hr_loan_repayments` | `loan_id` | `salary_loans` | restrict |
| `fk_investment_proofs_org_decl` | `investment_proofs` | `declaration_id` | `tax_declarations` | restrict |
| `fk_hr_travel_visit_logs_org_tr` | `hr_travel_visit_logs` | `travel_request_id` | `travel_requests` | restrict |
| `fk_asset_returns_org_asset` | `asset_returns` | `asset_id` | `assets` | restrict |
| `fk_feedback_requests_org_cycle` | `feedback_requests` | `cycle_id` | `review_cycles` | restrict |
| `fk_hr_calibration_entries_org_cycle` | `hr_calibration_entries` | `cycle_id` | `review_cycles` | restrict |
| `fk_hiring_flow_rounds_org_flow` | `hiring_flow_rounds` | `flow_id` | `hiring_flows` | restrict |
| `fk_hiring_flow_rounds_org_scorecard` | `hiring_flow_rounds` | `scorecard_template_id` | `scorecard_templates` | set null |
| `fk_job_postings_org_flow` | `job_postings` | `hiring_flow_id` | `hiring_flows` | set null |
| `fk_job_postings_org_dept` | `job_postings` | `department_id` | `departments` | set null |
| `fk_candidates_org_duplicate` | `candidates` | `duplicate_of_id` | `candidates` | set null |
| `fk_candidate_applications_org_candidate` | `candidate_applications` | `candidate_id` | `candidates` | restrict |
| `fk_candidate_applications_org_posting` | `candidate_applications` | `job_posting_id` | `job_postings` | restrict |
| `fk_interviews_org_candidate` | `interviews` | `candidate_id` | `candidates` | restrict |
| `fk_interviews_org_posting` | `interviews` | `job_posting_id` | `job_postings` | restrict |
| `fk_interview_scorecards_org_interview` | `interview_scorecards` | `interview_id` | `interviews` | cascade |
| `fk_interview_scorecards_org_template` | `interview_scorecards` | `template_id` | `scorecard_templates` | set null |
| `fk_interview_booking_links_org_candidate` | `interview_booking_links` | `candidate_id` | `candidates` | restrict |
| `fk_booking_link_interviewers_org_link` | `booking_link_interviewers` | `booking_link_id` | `interview_booking_links` | cascade |
| `fk_candidate_referrals_org_candidate` | `candidate_referrals` | `candidate_id` | `candidates` | restrict |
| `fk_calibration_sessions_org_candidate` | `calibration_sessions` | `candidate_id` | `candidates` | restrict |
| `fk_calibration_participants_org_session` | `calibration_participants` | `session_id` | `calibration_sessions` | cascade |
| `fk_interview_panel_members_org_interview` | `interview_panel_members` | `interview_id` | `interviews` | cascade |
| `fk_candidate_documents_vault_org_candidate` | `candidate_documents_vault` | `candidate_id` | `candidates` | restrict |
| `fk_vault_access_logs_org_vault_doc` | `vault_access_logs` | `vault_document_id` | `candidate_documents_vault` | cascade |
| `fk_candidate_sla_tracking_org_candidate` | `candidate_sla_tracking` | `candidate_id` | `candidates` | cascade |
| `fk_candidate_messages_org_candidate` | `candidate_messages` | `candidate_id` | `candidates` | cascade |
| `fk_candidate_reference_checks_org_candidate` | `candidate_reference_checks` | `candidate_id` | `candidates` | cascade |
| `fk_candidate_offers_org_candidate` | `candidate_offers` | `candidate_id` | `candidates` | restrict |
| `fk_offer_versions_org_offer` | `offer_versions` | `offer_id` | `candidate_offers` | cascade |
| `fk_offer_negotiations_org_offer` | `offer_negotiations` | `offer_id` | `candidate_offers` | cascade |
| `fk_recruiter_activity_org_candidate` | `recruiter_activity_log` | `candidate_id` | `candidates` | set null |
| `fk_recruiter_activity_org_posting` | `recruiter_activity_log` | `job_posting_id` | `job_postings` | set null |
| `fk_headcount_requests_org_dept` | `headcount_requests` | `department_id` | `departments` | restrict |
| `fk_job_recruiters_org_posting` | `job_recruiters` | `job_posting_id` | `job_postings` | cascade |
| `fk_email_sequence_steps_org_sequence` | `email_sequence_steps` | `sequence_id` | `email_sequences` | cascade |
| `fk_email_sequence_enrollments_org_sequence` | `email_sequence_enrollments` | `sequence_id` | `email_sequences` | cascade |
| `fk_vendor_candidate_submissions_org_vendor` | `vendor_candidate_submissions` | `vendor_id` | `recruitment_vendors` | restrict |
| `fk_talent_pool_members_org_pool` | `talent_pool_members` | `pool_id` | `talent_pools` | cascade |
| `fk_talent_pool_members_org_candidate` | `talent_pool_members` | `candidate_id` | `candidates` | restrict |
| `fk_external_referrals_org_referrer` | `external_referrals` | `referrer_id` | `external_referrers` | restrict |
| `fk_external_referrals_org_candidate` | `external_referrals` | `candidate_id` | `candidates` | restrict |
| `fk_job_board_postings_org_posting` | `job_board_postings` | `job_posting_id` | `job_postings` | cascade |
| `fk_candidate_documents_org_candidate` | `candidate_documents` | `candidate_id` | `candidates` | restrict |
| `fk_candidate_documents_org_template` | `candidate_documents` | `template_id` | `document_templates` | set null |
| `fk_doc_template_versions_org_template` | `document_template_versions` | `template_id` | `document_templates` | restrict |
| `fk_onboarding_tpl_steps_org_tpl` | `onboarding_template_steps` | `template_id` | `onboarding_templates` | cascade |
| `fk_onboarding_documents_org_doctype` | `onboarding_documents` | `document_type_id` | `document_types` | restrict |
| `fk_doc_audit_logs_org_onboarding_doc` | `document_audit_logs` | `onboarding_document_id` | `onboarding_documents` | cascade |
| `fk_onboarding_tasks_org_tpl_step` | `onboarding_tasks` | `template_step_id` | `onboarding_template_steps` | set null |
| `fk_exit_checklists_org_resignation` | `exit_checklists` | `resignation_id` | `resignations` | cascade |
| `fk_hr_webhook_deliveries_org_subscription` | `hr_webhook_deliveries` | `subscription_id` | `hr_webhook_subscriptions` | cascade |
| `fk_hr_comp_recommendations_org_cycle` | `hr_comp_recommendations` | `cycle_id` | `hr_comp_cycles` | restrict |
| `fk_hr_comp_budget_pools_org_cycle` | `hr_comp_budget_pools` | `cycle_id` | `hr_comp_cycles` | restrict |
| `fk_hr_comp_budget_pools_org_dept` | `hr_comp_budget_pools` | `department_id` | `departments` | set null |
| `fk_hr_equity_vesting_events_org_grant` | `hr_equity_vesting_events` | `grant_id` | `hr_equity_grants` | restrict |
| `fk_hr_equity_exercises_org_grant` | `hr_equity_exercises` | `grant_id` | `hr_equity_grants` | restrict |
| `fk_hr_device_sync_logs_org_device` | `hr_device_sync_logs` | `device_id` | `hr_time_devices` | cascade |
| `fk_hr_device_emp_mappings_org_device` | `hr_device_employee_mappings` | `device_id` | `hr_time_devices` | cascade |
| `fk_hr_accommodation_tasks_org_request` | `hr_accommodation_tasks` | `request_id` | `hr_accommodation_requests` | cascade |
| `fk_hr_emergency_responses_org_event` | `hr_emergency_responses` | `event_id` | `hr_emergency_events` | cascade |
| `fk_hr_import_rows_org_job` | `hr_import_rows` | `job_id` | `hr_import_jobs` | cascade |
| `fk_hr_automation_runs_org_rule` | `hr_automation_runs` | `rule_id` | `hr_automation_rules` | restrict |
| `fk_hr_automation_runs_org_self` | `hr_automation_runs` | `triggered_by_run_id` | `hr_automation_runs` | set null |
| `fk_hr_template_renders_org_template` | `hr_template_renders` | `template_id` | `hr_templates` | restrict |
| `fk_hr_template_renders_org_emp` | `hr_template_renders` | `rendered_for_employee_id` | `hr_employments` | set null |
| `fk_hr_policy_scopes_org_policy` | `hr_policy_scopes` | `policy_id` | `hr_policies` | cascade |
| `fk_hr_policy_assignments_org_policy` | `hr_policy_assignments` | `policy_id` | `hr_policies` | cascade |
| `fk_hr_policies_org_parent` | `hr_policies` | `parent_policy_id` | `hr_policies` | set null |
| `fk_hr_templates_org_parent` | `hr_templates` | `parent_template_id` | `hr_templates` | set null |
| `fk_job_requisitions_org_posting` | `job_requisitions` | `linked_job_id` | `job_postings` | set null |
| `fk_key_results_org_goal` | `key_results` | `goal_id` | `goals` | cascade |
| `fk_survey_responses_org_survey` | `survey_responses` | `survey_id` | `pulse_surveys` | cascade |
| `fk_assessment_attempts_org_assessment` | `assessment_attempts` | `assessment_id` | `skill_assessments` | cascade |
| `fk_competencies_org_framework` | `competencies` | `framework_id` | `competency_frameworks` | cascade |
| `fk_training_attendance_org_program` | `training_attendance` | `program_id` | `training_programs` | cascade |
| `fk_team_event_participants_org_event` | `team_event_participants` | `event_id` | `team_events` | cascade |
| `fk_fnf_settlements_org_resignation` | `fnf_settlements` | `resignation_id` | `resignations` | set null |

---

### Phase D validate (migration `0216_phase_d_validate_hr.ts`)

For every constraint above, after the NOT VALID migration has been deployed:

```sql
-- Pattern: one statement per constraint during a low-traffic window
ALTER TABLE <child_table> VALIDATE CONSTRAINT <constraint_name>;

-- Verify completion:
SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid = '<child_table>'::regclass
  AND contype = 'f'
  AND conname = '<constraint_name>';
-- convalidated must be TRUE
```

**Phase D gate — run for every composite FK:**
```sql
SELECT COUNT(*) FROM <table> t
WHERE t.<parent_fk_col> IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM <parent> p
    WHERE p.org_id = t.org_id AND p.id = t.<parent_fk_col>
  );
-- must return 0
```

---

## Summary

| Phase | Action | HR table count |
|-------|--------|---------------|
| A | Add `org_id` + backfill | 25 tables |
| B | Add bare `.references()` | 11 FK gaps across 10 tables |
| C | Add `UNIQUE(org_id, id)` candidate key | ~65 parent tables |
| D | Add composite `foreignKey({})` (NOT VALID) | ~105 composite FK declarations |
| D validate | `VALIDATE CONSTRAINT` per FK | ~105 validations |

**Total HR tables touched in Wave 4: 95 distinct tables** (some appear in multiple phases as both parent and child).

**Cross-module FKs excluded from this spec and deferred to the cross-module wave:**
- `expenses.project_id → projects` (W7-H)
- `expense_categories` → `ledger_accounts` (W7-H)

**Payroll tables** (payroll-policies.ts, payroll-workforce.ts, payroll-runs.ts, payroll-payout.ts, payroll.ts) follow the identical Phase A/B/C/D pattern but are batched in migration files `0203_phase_b_hr_bare_fks.ts` and `0210_phase_d_hr_composite_fks.ts` under a payroll sub-section — see `wave-0-composite-fk-matrix-hr-payroll.md` GROUP 29–33 for their specific FK declarations.
