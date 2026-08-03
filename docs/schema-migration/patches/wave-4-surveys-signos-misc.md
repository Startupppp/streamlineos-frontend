---
type: wave-4 patch spec (surveys+signos+misc)
status: DRAFT
date: 2026-07-26
covers: surveys/ (all 7 sub-files), signos/ (all 9 sub-files), blog.ts, automation/
verification: party/ directory/ portal-access/ composite FK audit
wave-ref: W7-G (surveys + signos), W7-H (automation), EXEMPT (blog)
---

# Wave 4 — Patch Spec: Surveys + SignOS + Blog + Automation + Misc

> **Scope.** This document is the implementation-ready migration spec for Wave 4 of the composite-FK
> program. It covers every table in `surveys/`, `signos/`, `blog.ts`, and `automation/rules.ts` where
> work is needed. It also contains a verification table for `party/`, `directory/`, and
> `portal-access/` — those clusters were built to standard; this section confirms they require no
> action.
>
> **Before reading the per-table patches:** every composite FK in this wave is gated on the parent
> table first having a `unique(org_id, id)` constraint. This document records both sides: the
> **parent unique constraint** (where it is missing today) and the **child composite FK declaration**
> that becomes possible after that constraint lands.
>
> **SQL convention in this doc.**
> - All `ADD CONSTRAINT … NOT VALID` statements can run online (no lock beyond a brief metadata
>   take). Run `VALIDATE CONSTRAINT` separately, ideally in a low-traffic window, to let Postgres
>   scan existing rows without holding an AccessExclusiveLock.
> - Backfill and quarantine sections assume a migration script; they are not inline SQL that runs
>   automatically with the constraint.

---

## SECTION A — SURVEYS

### A0 — Observed schema reality (verified 2026-07-26)

All seven survey sub-files were read directly. Key observations:

| File | Tables | org_id? | Bare single-col FKs (no composite) | Missing org_id |
|---|---|---|---|---|
| `forms.ts` | `survey_forms`, `survey_versions` | ✔ both | `survey_versions.survey_id → survey_forms.id` | none |
| `structure.ts` | `survey_sections`, `survey_questions`, `survey_question_choices`, `survey_logic_rules` | ✔ all | all parent refs are bare single-col | none |
| `distribution.ts` | `survey_collectors`, `survey_participants` | ✔ both | bare single-col on all cross-table refs | none |
| `responses.ts` | `survey_response_sessions`, `survey_answers` | ✔ both | bare single-col on all cross-table refs | none |
| `assessments.ts` | `survey_assessment_attempts`, `survey_certificates` | ✔ both | bare single-col on all cross-table refs | none |
| `live-sessions.ts` | `survey_live_sessions` | ✔ | bare single-col | none |
| `automation.ts` | `survey_automation_events` | ✔ | bare single-col | none |

**Critical finding — `survey_forms.active_version_id` circular reference:**
`survey_forms.activeVersionId` is `integer("active_version_id")` with **no `.references()` declared
at all**. `survey_versions.surveyId` points back to `survey_forms.id`. Declaring a composite FK on
`active_version_id → survey_versions(org_id, id)` would be a circular reference between the two
tables. The correct resolution is:

1. Leave `active_version_id` as a bare application-enforced pointer (no DB FK — as it stands today).
2. Add a `CHECK` that `active_version_id IS NULL OR EXISTS (SELECT 1 FROM survey_versions WHERE id =
   active_version_id AND survey_id = survey_forms.id)` — validated server-side on every publish.
3. Document this explicitly in the Drizzle file as intentional (no comment needed per CLAUDE.md §7,
   but a link to this spec is appropriate in the migration file header).

**No table in the surveys cluster is missing `org_id`.** Every table already carries a non-nullable
`orgId` with `.references(() => organizations.id)`. The gap is exclusively that all cross-table FKs
are single-column (`references(() => parentTable.id)`) with no composite-FK enforcement of the
`org_id` corridor.

---

### A1 — Dependency order for survey composite FKs

The survey tables form a strict DAG. Composite FKs must land in this order (parent's
`unique(org_id, id)` must exist before the child FK):

```
survey_forms           ← root (direct org anchor)
  └── survey_versions       (survey_id → survey_forms)
        └── survey_sections      (survey_id, version_id → survey_forms, survey_versions)
              └── survey_questions   (survey_id, version_id, section_id)
                    └── survey_question_choices  (question_id)
                    └── survey_logic_rules       (survey_id, version_id, source_question_id)
survey_collectors      (survey_id → survey_forms)
  └── survey_participants   (survey_id, collector_id)
        └── survey_response_sessions (survey_id, version_id, collector_id, participant_id)
              └── survey_answers         (session_id, survey_id, version_id, question_id)
              └── survey_assessment_attempts (survey_id, version_id, participant_id, session_id)
                    └── survey_certificates   (survey_id, participant_id, attempt_id)
survey_live_sessions   (survey_id, version_id, current_question_id)
survey_automation_events (survey_id, session_id)
```

---

### A2 — Per-table patches

#### A2.1 — `survey_forms` → add `unique(org_id, id)` (enables all downstream FKs)

`survey_forms` is the root table. Currently the only constraint on `(org_id)` is the single-column
`.references(() => organizations.id)` and the `idx_survey_forms_org_status_mode` index. No
`unique(org_id, id)` candidate key exists, so no child can declare a composite FK to it.

**Drizzle before:**
```ts
// forms.ts — table constraints array
(table) => [
  index("idx_survey_forms_org_status_mode").on(table.orgId, table.status, table.mode),
]
```

**Drizzle after:**
```ts
import { ..., unique } from "drizzle-orm/pg-core";

(table) => [
  unique("uniq_survey_forms_org_id").on(table.orgId, table.id),
  index("idx_survey_forms_org_status_mode").on(table.orgId, table.status, table.mode),
]
```

**Generated SQL:**
```sql
-- Step 1: add unique constraint NOT VALID (online, no full-table scan)
ALTER TABLE survey_forms
  ADD CONSTRAINT uniq_survey_forms_org_id UNIQUE (org_id, id) NOT VALID;

-- Step 2: validate (separate migration / maintenance window)
ALTER TABLE survey_forms VALIDATE CONSTRAINT uniq_survey_forms_org_id;
```

**Backfill/quarantine:** This is a candidate-key uniqueness constraint on `(org_id, id)` where `id`
is a serial primary key — by definition no two rows can share the same `id`, so `(org_id, id)` is
trivially unique. There are no orphan or duplicate rows to quarantine; `NOT VALID → VALIDATE` will
pass immediately. No pre-migration data audit required.

---

#### A2.2 — `survey_versions` → unique(org_id, id) + composite FK to survey_forms

`survey_versions` needs:
1. Its own `unique(org_id, id)` so `survey_sections` and others can point back to it.
2. A composite FK `(org_id, survey_id) → survey_forms(org_id, id)`.

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_versions_survey").on(table.surveyId),
  unique("uq_survey_versions_survey_number").on(table.surveyId, table.versionNumber),
]
```

**Drizzle after:**
```ts
import { ..., unique, foreignKey } from "drizzle-orm/pg-core";

(table) => [
  unique("uniq_survey_versions_org_id").on(table.orgId, table.id),
  unique("uq_survey_versions_survey_number").on(table.surveyId, table.versionNumber),
  index("idx_survey_versions_survey").on(table.surveyId),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_versions_org_survey",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_survey_forms_org_id must already exist (A2.1)

ALTER TABLE survey_versions
  ADD CONSTRAINT uniq_survey_versions_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE survey_versions
  ADD CONSTRAINT fk_survey_versions_org_survey
    FOREIGN KEY (org_id, survey_id)
    REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE
    NOT VALID;

-- Validate in a separate step:
ALTER TABLE survey_versions VALIDATE CONSTRAINT uniq_survey_versions_org_id;
ALTER TABLE survey_versions VALIDATE CONSTRAINT fk_survey_versions_org_survey;
```

**Backfill/quarantine:** Run before adding FK:
```sql
-- Identify survey_versions rows pointing to a survey_form in a different org (should be zero)
SELECT v.id, v.org_id AS version_org, f.org_id AS form_org
FROM survey_versions v
JOIN survey_forms f ON f.id = v.survey_id
WHERE v.org_id <> f.org_id;
```
If any rows are returned, they are cross-tenant data errors. Move them to a `_quarantine` table and
alert before proceeding. Expected: 0 rows.

---

#### A2.3 — `survey_sections` → composite FKs to survey_forms + survey_versions

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_sections_version").on(table.surveyId, table.versionId, table.sortOrder),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uniq_survey_sections_org_id").on(table.orgId, table.id),
  index("idx_survey_sections_version").on(table.surveyId, table.versionId, table.sortOrder),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_sections_org_survey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.versionId],
    foreignColumns: [surveyVersions.orgId, surveyVersions.id],
    name: "fk_survey_sections_org_version",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_survey_forms_org_id + uniq_survey_versions_org_id

ALTER TABLE survey_sections
  ADD CONSTRAINT uniq_survey_sections_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE survey_sections
  ADD CONSTRAINT fk_survey_sections_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_sections
  ADD CONSTRAINT fk_survey_sections_org_version
    FOREIGN KEY (org_id, version_id) REFERENCES survey_versions (org_id, id)
    ON DELETE CASCADE NOT VALID;

-- Validate separately:
ALTER TABLE survey_sections VALIDATE CONSTRAINT uniq_survey_sections_org_id;
ALTER TABLE survey_sections VALIDATE CONSTRAINT fk_survey_sections_org_survey;
ALTER TABLE survey_sections VALIDATE CONSTRAINT fk_survey_sections_org_version;
```

**Backfill/quarantine:** Same cross-org audit pattern — confirm `sections.org_id = forms.org_id =
versions.org_id` for all rows. Expected: 0 cross-org rows.

---

#### A2.4 — `survey_questions` → composite FKs to forms, versions, sections + unique(org_id, id)

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_questions_section").on(table.surveyId, table.versionId, table.sectionId, table.sortOrder),
  unique("uq_survey_questions_version_key").on(table.versionId, table.questionKey),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uniq_survey_questions_org_id").on(table.orgId, table.id),
  unique("uq_survey_questions_version_key").on(table.versionId, table.questionKey),
  index("idx_survey_questions_section").on(table.surveyId, table.versionId, table.sectionId, table.sortOrder),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_questions_org_survey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.versionId],
    foreignColumns: [surveyVersions.orgId, surveyVersions.id],
    name: "fk_survey_questions_org_version",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.sectionId],
    foreignColumns: [surveySections.orgId, surveySections.id],
    name: "fk_survey_questions_org_section",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_survey_forms_org_id, uniq_survey_versions_org_id, uniq_survey_sections_org_id

ALTER TABLE survey_questions
  ADD CONSTRAINT uniq_survey_questions_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE survey_questions
  ADD CONSTRAINT fk_survey_questions_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_questions
  ADD CONSTRAINT fk_survey_questions_org_version
    FOREIGN KEY (org_id, version_id) REFERENCES survey_versions (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_questions
  ADD CONSTRAINT fk_survey_questions_org_section
    FOREIGN KEY (org_id, section_id) REFERENCES survey_sections (org_id, id)
    ON DELETE CASCADE NOT VALID;

-- Validate separately (each validate is a sequential scan):
ALTER TABLE survey_questions VALIDATE CONSTRAINT uniq_survey_questions_org_id;
ALTER TABLE survey_questions VALIDATE CONSTRAINT fk_survey_questions_org_survey;
ALTER TABLE survey_questions VALIDATE CONSTRAINT fk_survey_questions_org_version;
ALTER TABLE survey_questions VALIDATE CONSTRAINT fk_survey_questions_org_section;
```

---

#### A2.5 — `survey_question_choices` → composite FK to survey_questions + unique(org_id, id)

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_question_choices_question").on(table.questionId, table.sortOrder),
  unique("uq_survey_question_choices_question_key").on(table.questionId, table.choiceKey),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uniq_survey_question_choices_org_id").on(table.orgId, table.id),
  unique("uq_survey_question_choices_question_key").on(table.questionId, table.choiceKey),
  index("idx_survey_question_choices_question").on(table.questionId, table.sortOrder),
  foreignKey({
    columns: [table.orgId, table.questionId],
    foreignColumns: [surveyQuestions.orgId, surveyQuestions.id],
    name: "fk_survey_question_choices_org_question",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_survey_questions_org_id

ALTER TABLE survey_question_choices
  ADD CONSTRAINT uniq_survey_question_choices_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE survey_question_choices
  ADD CONSTRAINT fk_survey_question_choices_org_question
    FOREIGN KEY (org_id, question_id) REFERENCES survey_questions (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_question_choices VALIDATE CONSTRAINT uniq_survey_question_choices_org_id;
ALTER TABLE survey_question_choices VALIDATE CONSTRAINT fk_survey_question_choices_org_question;
```

---

#### A2.6 — `survey_logic_rules` → composite FKs to forms, versions, questions

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_logic_rules_source").on(table.surveyId, table.versionId, table.sourceQuestionId),
]
```

**Drizzle after:**
```ts
(table) => [
  index("idx_survey_logic_rules_source").on(table.surveyId, table.versionId, table.sourceQuestionId),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_logic_rules_org_survey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.versionId],
    foreignColumns: [surveyVersions.orgId, surveyVersions.id],
    name: "fk_survey_logic_rules_org_version",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.sourceQuestionId],
    foreignColumns: [surveyQuestions.orgId, surveyQuestions.id],
    name: "fk_survey_logic_rules_org_source_question",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_survey_forms_org_id, uniq_survey_versions_org_id, uniq_survey_questions_org_id

ALTER TABLE survey_logic_rules
  ADD CONSTRAINT fk_survey_logic_rules_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_logic_rules
  ADD CONSTRAINT fk_survey_logic_rules_org_version
    FOREIGN KEY (org_id, version_id) REFERENCES survey_versions (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_logic_rules
  ADD CONSTRAINT fk_survey_logic_rules_org_source_question
    FOREIGN KEY (org_id, source_question_id) REFERENCES survey_questions (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_logic_rules VALIDATE CONSTRAINT fk_survey_logic_rules_org_survey;
ALTER TABLE survey_logic_rules VALIDATE CONSTRAINT fk_survey_logic_rules_org_version;
ALTER TABLE survey_logic_rules VALIDATE CONSTRAINT fk_survey_logic_rules_org_source_question;
```

---

#### A2.7 — `survey_collectors` → composite FK to survey_forms + unique(org_id, id)

`survey_collectors.versionId` is nullable (set null on delete) — the composite FK is still
declarable but must be nullable on the child side.

**Drizzle before:**
```ts
(table) => [
  unique("uq_survey_collectors_token").on(table.token),
  index("idx_survey_collectors_survey_status").on(table.surveyId, table.status),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uniq_survey_collectors_org_id").on(table.orgId, table.id),
  unique("uq_survey_collectors_token").on(table.token),
  index("idx_survey_collectors_survey_status").on(table.surveyId, table.status),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_collectors_org_survey",
  }).onDelete("cascade"),
]
```

Note: `versionId` is nullable and references `survey_versions` with `onDelete: "set null"`. A
composite FK on a nullable column is valid in Postgres (NULLs are not matched by FK checks). The
Drizzle declaration for the nullable version link:

```ts
  foreignKey({
    columns: [table.orgId, table.versionId],
    foreignColumns: [surveyVersions.orgId, surveyVersions.id],
    name: "fk_survey_collectors_org_version",
  }).onDelete("setNull"),
```

Include this only if Drizzle supports nullable columns in `foreignKey()` — it does; Postgres FK
machinery skips the check when any FK column is NULL. Both FK declarations are safe.

**Generated SQL:**
```sql
ALTER TABLE survey_collectors
  ADD CONSTRAINT uniq_survey_collectors_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE survey_collectors
  ADD CONSTRAINT fk_survey_collectors_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_collectors
  ADD CONSTRAINT fk_survey_collectors_org_version
    FOREIGN KEY (org_id, version_id) REFERENCES survey_versions (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE survey_collectors VALIDATE CONSTRAINT uniq_survey_collectors_org_id;
ALTER TABLE survey_collectors VALIDATE CONSTRAINT fk_survey_collectors_org_survey;
ALTER TABLE survey_collectors VALIDATE CONSTRAINT fk_survey_collectors_org_version;
```

---

#### A2.8 — `survey_participants` → composite FKs to forms, collectors + unique(org_id, id)

Cross-module refs (`contacts`, `leads`, `clientAccounts`) are all nullable and single-col. Those
tables are in the CRM cluster (Wave C) and will not have `unique(org_id, id)` until that wave
lands. Do **not** attempt composite FKs to CRM tables in this wave. Leave those as bare single-col
FKs for now and flag them for the Wave-C follow-on.

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_participants_org_survey_status").on(table.orgId, table.surveyId, table.status),
  unique("uq_survey_participants_access_token_hash").on(table.accessTokenHash),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uniq_survey_participants_org_id").on(table.orgId, table.id),
  unique("uq_survey_participants_access_token_hash").on(table.accessTokenHash),
  index("idx_survey_participants_org_survey_status").on(table.orgId, table.surveyId, table.status),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_participants_org_survey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.collectorId],
    foreignColumns: [surveyCollectors.orgId, surveyCollectors.id],
    name: "fk_survey_participants_org_collector",
  }).onDelete("setNull"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_survey_forms_org_id, uniq_survey_collectors_org_id

ALTER TABLE survey_participants
  ADD CONSTRAINT uniq_survey_participants_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE survey_participants
  ADD CONSTRAINT fk_survey_participants_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_participants
  ADD CONSTRAINT fk_survey_participants_org_collector
    FOREIGN KEY (org_id, collector_id) REFERENCES survey_collectors (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE survey_participants VALIDATE CONSTRAINT uniq_survey_participants_org_id;
ALTER TABLE survey_participants VALIDATE CONSTRAINT fk_survey_participants_org_survey;
ALTER TABLE survey_participants VALIDATE CONSTRAINT fk_survey_participants_org_collector;
```

**Deferred cross-module FKs** (add once Wave C lands):
- `(org_id, contact_id) → contacts(org_id, id)`
- `(org_id, lead_id) → leads(org_id, id)`
- `(org_id, client_id) → client_accounts(org_id, id)`

---

#### A2.9 — `survey_response_sessions` → composite FKs to forms, versions, collectors, participants

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_response_sessions_survey_submitted").on(table.orgId, table.surveyId, table.submittedAt),
  index("idx_survey_response_sessions_collector").on(table.collectorId),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uniq_survey_response_sessions_org_id").on(table.orgId, table.id),
  index("idx_survey_response_sessions_survey_submitted").on(table.orgId, table.surveyId, table.submittedAt),
  index("idx_survey_response_sessions_collector").on(table.collectorId),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_response_sessions_org_survey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.versionId],
    foreignColumns: [surveyVersions.orgId, surveyVersions.id],
    name: "fk_survey_response_sessions_org_version",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.collectorId],
    foreignColumns: [surveyCollectors.orgId, surveyCollectors.id],
    name: "fk_survey_response_sessions_org_collector",
  }).onDelete("setNull"),
  foreignKey({
    columns: [table.orgId, table.participantId],
    foreignColumns: [surveyParticipants.orgId, surveyParticipants.id],
    name: "fk_survey_response_sessions_org_participant",
  }).onDelete("setNull"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_survey_forms_org_id, uniq_survey_versions_org_id,
--           uniq_survey_collectors_org_id, uniq_survey_participants_org_id

ALTER TABLE survey_response_sessions
  ADD CONSTRAINT uniq_survey_response_sessions_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE survey_response_sessions
  ADD CONSTRAINT fk_survey_response_sessions_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_response_sessions
  ADD CONSTRAINT fk_survey_response_sessions_org_version
    FOREIGN KEY (org_id, version_id) REFERENCES survey_versions (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_response_sessions
  ADD CONSTRAINT fk_survey_response_sessions_org_collector
    FOREIGN KEY (org_id, collector_id) REFERENCES survey_collectors (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE survey_response_sessions
  ADD CONSTRAINT fk_survey_response_sessions_org_participant
    FOREIGN KEY (org_id, participant_id) REFERENCES survey_participants (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE survey_response_sessions VALIDATE CONSTRAINT uniq_survey_response_sessions_org_id;
ALTER TABLE survey_response_sessions VALIDATE CONSTRAINT fk_survey_response_sessions_org_survey;
ALTER TABLE survey_response_sessions VALIDATE CONSTRAINT fk_survey_response_sessions_org_version;
ALTER TABLE survey_response_sessions VALIDATE CONSTRAINT fk_survey_response_sessions_org_collector;
ALTER TABLE survey_response_sessions VALIDATE CONSTRAINT fk_survey_response_sessions_org_participant;
```

---

#### A2.10 — `survey_answers` → composite FKs to sessions, forms, versions, questions

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_answers_org_question").on(table.orgId, table.questionId),
  index("idx_survey_answers_session").on(table.sessionId),
]
```

**Drizzle after:**
```ts
(table) => [
  index("idx_survey_answers_org_question").on(table.orgId, table.questionId),
  index("idx_survey_answers_session").on(table.sessionId),
  foreignKey({
    columns: [table.orgId, table.sessionId],
    foreignColumns: [surveyResponseSessions.orgId, surveyResponseSessions.id],
    name: "fk_survey_answers_org_session",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_answers_org_survey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.versionId],
    foreignColumns: [surveyVersions.orgId, surveyVersions.id],
    name: "fk_survey_answers_org_version",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.questionId],
    foreignColumns: [surveyQuestions.orgId, surveyQuestions.id],
    name: "fk_survey_answers_org_question",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
ALTER TABLE survey_answers
  ADD CONSTRAINT fk_survey_answers_org_session
    FOREIGN KEY (org_id, session_id) REFERENCES survey_response_sessions (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_answers
  ADD CONSTRAINT fk_survey_answers_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_answers
  ADD CONSTRAINT fk_survey_answers_org_version
    FOREIGN KEY (org_id, version_id) REFERENCES survey_versions (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_answers
  ADD CONSTRAINT fk_survey_answers_org_question
    FOREIGN KEY (org_id, question_id) REFERENCES survey_questions (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_answers VALIDATE CONSTRAINT fk_survey_answers_org_session;
ALTER TABLE survey_answers VALIDATE CONSTRAINT fk_survey_answers_org_survey;
ALTER TABLE survey_answers VALIDATE CONSTRAINT fk_survey_answers_org_version;
ALTER TABLE survey_answers VALIDATE CONSTRAINT fk_survey_answers_org_question;
```

---

#### A2.11 — `survey_assessment_attempts` → composite FKs to forms, versions, participants, sessions

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_assessment_attempts_survey_participant").on(table.surveyId, table.participantId),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uniq_survey_assessment_attempts_org_id").on(table.orgId, table.id),
  index("idx_survey_assessment_attempts_survey_participant").on(table.surveyId, table.participantId),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_assessment_attempts_org_survey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.versionId],
    foreignColumns: [surveyVersions.orgId, surveyVersions.id],
    name: "fk_survey_assessment_attempts_org_version",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.participantId],
    foreignColumns: [surveyParticipants.orgId, surveyParticipants.id],
    name: "fk_survey_assessment_attempts_org_participant",
  }).onDelete("setNull"),
  foreignKey({
    columns: [table.orgId, table.sessionId],
    foreignColumns: [surveyResponseSessions.orgId, surveyResponseSessions.id],
    name: "fk_survey_assessment_attempts_org_session",
  }).onDelete("setNull"),
]
```

**Generated SQL:**
```sql
ALTER TABLE survey_assessment_attempts
  ADD CONSTRAINT uniq_survey_assessment_attempts_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE survey_assessment_attempts
  ADD CONSTRAINT fk_survey_assessment_attempts_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_assessment_attempts
  ADD CONSTRAINT fk_survey_assessment_attempts_org_version
    FOREIGN KEY (org_id, version_id) REFERENCES survey_versions (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_assessment_attempts
  ADD CONSTRAINT fk_survey_assessment_attempts_org_participant
    FOREIGN KEY (org_id, participant_id) REFERENCES survey_participants (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE survey_assessment_attempts
  ADD CONSTRAINT fk_survey_assessment_attempts_org_session
    FOREIGN KEY (org_id, session_id) REFERENCES survey_response_sessions (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE survey_assessment_attempts VALIDATE CONSTRAINT uniq_survey_assessment_attempts_org_id;
ALTER TABLE survey_assessment_attempts VALIDATE CONSTRAINT fk_survey_assessment_attempts_org_survey;
ALTER TABLE survey_assessment_attempts VALIDATE CONSTRAINT fk_survey_assessment_attempts_org_version;
ALTER TABLE survey_assessment_attempts VALIDATE CONSTRAINT fk_survey_assessment_attempts_org_participant;
ALTER TABLE survey_assessment_attempts VALIDATE CONSTRAINT fk_survey_assessment_attempts_org_session;
```

---

#### A2.12 — `survey_certificates` → composite FKs to forms, participants, attempts

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_certificates_survey_participant").on(table.surveyId, table.participantId),
  unique("uq_survey_certificates_number").on(table.certificateNumber),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uq_survey_certificates_number").on(table.certificateNumber),
  index("idx_survey_certificates_survey_participant").on(table.surveyId, table.participantId),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_certificates_org_survey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.participantId],
    foreignColumns: [surveyParticipants.orgId, surveyParticipants.id],
    name: "fk_survey_certificates_org_participant",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.attemptId],
    foreignColumns: [surveyAssessmentAttempts.orgId, surveyAssessmentAttempts.id],
    name: "fk_survey_certificates_org_attempt",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
ALTER TABLE survey_certificates
  ADD CONSTRAINT fk_survey_certificates_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_certificates
  ADD CONSTRAINT fk_survey_certificates_org_participant
    FOREIGN KEY (org_id, participant_id) REFERENCES survey_participants (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_certificates
  ADD CONSTRAINT fk_survey_certificates_org_attempt
    FOREIGN KEY (org_id, attempt_id) REFERENCES survey_assessment_attempts (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_certificates VALIDATE CONSTRAINT fk_survey_certificates_org_survey;
ALTER TABLE survey_certificates VALIDATE CONSTRAINT fk_survey_certificates_org_participant;
ALTER TABLE survey_certificates VALIDATE CONSTRAINT fk_survey_certificates_org_attempt;
```

---

#### A2.13 — `survey_live_sessions` → composite FKs to forms, versions, questions

`currentQuestionId` is nullable (set null on delete).

**Drizzle before:**
```ts
(table) => [
  unique("uq_survey_live_sessions_code").on(table.sessionCode),
  index("idx_survey_live_sessions_survey").on(table.surveyId),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uq_survey_live_sessions_code").on(table.sessionCode),
  index("idx_survey_live_sessions_survey").on(table.surveyId),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_live_sessions_org_survey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.versionId],
    foreignColumns: [surveyVersions.orgId, surveyVersions.id],
    name: "fk_survey_live_sessions_org_version",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.currentQuestionId],
    foreignColumns: [surveyQuestions.orgId, surveyQuestions.id],
    name: "fk_survey_live_sessions_org_current_question",
  }).onDelete("setNull"),
]
```

**Generated SQL:**
```sql
ALTER TABLE survey_live_sessions
  ADD CONSTRAINT fk_survey_live_sessions_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_live_sessions
  ADD CONSTRAINT fk_survey_live_sessions_org_version
    FOREIGN KEY (org_id, version_id) REFERENCES survey_versions (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_live_sessions
  ADD CONSTRAINT fk_survey_live_sessions_org_current_question
    FOREIGN KEY (org_id, current_question_id) REFERENCES survey_questions (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE survey_live_sessions VALIDATE CONSTRAINT fk_survey_live_sessions_org_survey;
ALTER TABLE survey_live_sessions VALIDATE CONSTRAINT fk_survey_live_sessions_org_version;
ALTER TABLE survey_live_sessions VALIDATE CONSTRAINT fk_survey_live_sessions_org_current_question;
```

---

#### A2.14 — `survey_automation_events` → composite FKs to forms + sessions

`sessionId` is nullable.

**Drizzle before:**
```ts
(table) => [
  index("idx_survey_automation_events_org_survey_type").on(table.orgId, table.surveyId, table.eventType),
]
```

**Drizzle after:**
```ts
(table) => [
  index("idx_survey_automation_events_org_survey_type").on(table.orgId, table.surveyId, table.eventType),
  foreignKey({
    columns: [table.orgId, table.surveyId],
    foreignColumns: [surveyForms.orgId, surveyForms.id],
    name: "fk_survey_automation_events_org_survey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.sessionId],
    foreignColumns: [surveyResponseSessions.orgId, surveyResponseSessions.id],
    name: "fk_survey_automation_events_org_session",
  }).onDelete("setNull"),
]
```

**Generated SQL:**
```sql
ALTER TABLE survey_automation_events
  ADD CONSTRAINT fk_survey_automation_events_org_survey
    FOREIGN KEY (org_id, survey_id) REFERENCES survey_forms (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE survey_automation_events
  ADD CONSTRAINT fk_survey_automation_events_org_session
    FOREIGN KEY (org_id, session_id) REFERENCES survey_response_sessions (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE survey_automation_events VALIDATE CONSTRAINT fk_survey_automation_events_org_survey;
ALTER TABLE survey_automation_events VALIDATE CONSTRAINT fk_survey_automation_events_org_session;
```

---

### A3 — Survey cluster migration order summary

Execute in this exact order (each step depends on the previous):

1. `survey_forms` — add `uniq_survey_forms_org_id`
2. `survey_versions` — add `uniq_survey_versions_org_id` + `fk_survey_versions_org_survey`
3. `survey_sections` — add unique + 2 FKs
4. `survey_questions` — add unique + 3 FKs
5. `survey_question_choices` — add unique + 1 FK
6. `survey_logic_rules` — add 3 FKs
7. `survey_collectors` — add unique + 2 FKs (survey + version nullable)
8. `survey_participants` — add unique + 2 FKs (CRM cross-refs deferred)
9. `survey_response_sessions` — add unique + 4 FKs
10. `survey_answers` — add 4 FKs
11. `survey_assessment_attempts` — add unique + 4 FKs
12. `survey_certificates` — add 3 FKs
13. `survey_live_sessions` — add 3 FKs
14. `survey_automation_events` — add 2 FKs

Total survey operations: **14 unique constraints** + **28 composite FK constraints** = **42 DDL
statements** (each run `NOT VALID` then `VALIDATE` separately).

---

## SECTION B — SIGNOS (sign_*)

### B0 — Observed schema reality (verified 2026-07-26)

All signos sub-files were read. Key findings:

| File | Tables | org_id? | Bare single-col cross-table FKs | Missing org_id |
|---|---|---|---|---|
| `templates.ts` | `sign_templates` | ✔ | none (no parent within signos) | none |
| `watermark.ts` | `sign_watermark_policies` | ✔ | none | none |
| `settings.ts` | `sign_org_settings` | ✔ `uniqueIndex` on org | none | none |
| `public-forms.ts` | `sign_public_forms` | ✔ | `template_id → sign_templates.id` (bare) | none |
| `envelopes.ts` | `sign_envelopes` | ✔ | `template_id`, `watermark_policy_id`, `public_form_id` all bare | none |
| `documents.ts` | `sign_documents` | ✔ | `envelope_id → sign_envelopes.id` (bare) | none |
| `recipients.ts` | `sign_recipients` | ✔ | `envelope_id` (bare) + self-ref `delegated_to_recipient_id` | none |
| `fields.ts` | `sign_fields` | ✔ | `envelope_id`, `document_id`, `recipient_id` all bare | none |
| `audit.ts` | `sign_audit_events` | ✔ | `envelope_id` nullable, `recipient_id` nullable — both bare | none |
| `certificates.ts` | `sign_certificates` | ✔ | `envelope_id` (bare) | none |
| `signature-assets.ts` | `sign_signature_assets` | ✔ | `envelope_id`, `recipient_id` both bare | none |
| `bulk-send.ts` | `sign_bulk_send_jobs` | ✔ | `template_id` bare | none |
| `bulk-send.ts` | `sign_bulk_send_rows` | **✗ MISSING** | `job_id` bare, `envelope_id` bare | **YES — no org_id column** |

**Critical finding — `sign_bulk_send_rows` missing `org_id`:**
`sign_bulk_send_rows` has no `orgId` column at all. Before any composite FK can be added, `org_id
text NOT NULL` must be added (backfilled from `sign_bulk_send_jobs.org_id` via the `job_id` FK).

**`sign_org_settings`** has `uniqueIndex("uniq_sign_org_settings_org").on(table.orgId)` — this is a
unique index, not a named unique constraint in Drizzle. For the purposes of this table (one row per
org, org_id is its own discriminator) no child composite FK points into it, so no action required.

**Self-referential FK in `sign_recipients.delegated_to_recipient_id`** — this is an integer pointing
to `sign_recipients.id` with no `.references()` declared today. To add a composite FK it would need
`(org_id, delegated_to_recipient_id) → sign_recipients(org_id, id)`. This is safe because
`sign_recipients` will have its own `unique(org_id, id)` added in this wave. Include it.

---

### B1 — Dependency order for signos composite FKs

```
sign_templates             ← org anchor (no parent within signos)
sign_watermark_policies    ← org anchor
sign_org_settings          ← org anchor (1-row-per-org, no children)
sign_public_forms          ← references sign_templates
sign_envelopes             ← references sign_templates, sign_watermark_policies, sign_public_forms
  sign_documents           ← references sign_envelopes
  sign_recipients          ← references sign_envelopes (+ self-ref)
    sign_fields            ← references sign_envelopes, sign_documents, sign_recipients
    sign_audit_events      ← references sign_envelopes, sign_recipients
    sign_certificates      ← references sign_envelopes
    sign_signature_assets  ← references sign_envelopes, sign_recipients
sign_bulk_send_jobs        ← references sign_templates
  sign_bulk_send_rows      ← references sign_bulk_send_jobs, sign_envelopes
                              (needs org_id added first)
```

---

### B2 — Per-table patches

#### B2.1 — `sign_templates` → add `unique(org_id, id)`

Already has `uniqueIndex("uniq_sign_templates_org_name_version")` on `(org_id, name, version)` and
`index("idx_sign_templates_org_status")`. Needs a candidate key for downstream composite FKs.

**Drizzle before:**
```ts
(table) => [
  index("idx_sign_templates_org_status").on(table.orgId, table.status),
  uniqueIndex("uniq_sign_templates_org_name_version").on(table.orgId, table.name, table.version),
]
```

**Drizzle after:**
```ts
import { ..., unique } from "drizzle-orm/pg-core";

(table) => [
  unique("uniq_sign_templates_org_id").on(table.orgId, table.id),
  index("idx_sign_templates_org_status").on(table.orgId, table.status),
  uniqueIndex("uniq_sign_templates_org_name_version").on(table.orgId, table.name, table.version),
]
```

**Generated SQL:**
```sql
ALTER TABLE sign_templates
  ADD CONSTRAINT uniq_sign_templates_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE sign_templates VALIDATE CONSTRAINT uniq_sign_templates_org_id;
```

---

#### B2.2 — `sign_watermark_policies` → add `unique(org_id, id)`

**Drizzle after adds:**
```ts
unique("uniq_sign_watermark_policies_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
ALTER TABLE sign_watermark_policies
  ADD CONSTRAINT uniq_sign_watermark_policies_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE sign_watermark_policies VALIDATE CONSTRAINT uniq_sign_watermark_policies_org_id;
```

---

#### B2.3 — `sign_public_forms` → unique(org_id, id) + composite FK to sign_templates

**Drizzle before:**
```ts
(table) => [
  uniqueIndex("uniq_sign_public_forms_slug").on(table.slug),
  index("idx_sign_public_forms_org_status").on(table.orgId, table.status),
]
```

**Drizzle after:**
```ts
import { ..., unique, foreignKey } from "drizzle-orm/pg-core";

(table) => [
  unique("uniq_sign_public_forms_org_id").on(table.orgId, table.id),
  uniqueIndex("uniq_sign_public_forms_slug").on(table.slug),
  index("idx_sign_public_forms_org_status").on(table.orgId, table.status),
  foreignKey({
    columns: [table.orgId, table.templateId],
    foreignColumns: [signTemplates.orgId, signTemplates.id],
    name: "fk_sign_public_forms_org_template",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_sign_templates_org_id

ALTER TABLE sign_public_forms
  ADD CONSTRAINT uniq_sign_public_forms_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE sign_public_forms
  ADD CONSTRAINT fk_sign_public_forms_org_template
    FOREIGN KEY (org_id, template_id) REFERENCES sign_templates (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_public_forms VALIDATE CONSTRAINT uniq_sign_public_forms_org_id;
ALTER TABLE sign_public_forms VALIDATE CONSTRAINT fk_sign_public_forms_org_template;
```

---

#### B2.4 — `sign_envelopes` → unique(org_id, id) + composite FKs to templates, watermarks, public_forms

All three parent refs are nullable (`onDelete: "set null"` or `"set null"` semantics).

**Drizzle before:**
```ts
(table) => [
  index("idx_sign_envelopes_org_status").on(table.orgId, table.status),
  index("idx_sign_envelopes_org_sender").on(table.orgId, table.senderUserId),
  index("idx_sign_envelopes_source").on(table.sourceModule, table.sourceEntityType, table.sourceEntityId),
  index("idx_sign_envelopes_expires").on(table.expiresAt),
  uniqueIndex("uniq_sign_envelopes_finalization_key").on(table.finalizationKey),
]
```

**Drizzle after:**
```ts
import { ..., unique, foreignKey } from "drizzle-orm/pg-core";

(table) => [
  unique("uniq_sign_envelopes_org_id").on(table.orgId, table.id),
  uniqueIndex("uniq_sign_envelopes_finalization_key").on(table.finalizationKey),
  index("idx_sign_envelopes_org_status").on(table.orgId, table.status),
  index("idx_sign_envelopes_org_sender").on(table.orgId, table.senderUserId),
  index("idx_sign_envelopes_source").on(table.sourceModule, table.sourceEntityType, table.sourceEntityId),
  index("idx_sign_envelopes_expires").on(table.expiresAt),
  foreignKey({
    columns: [table.orgId, table.templateId],
    foreignColumns: [signTemplates.orgId, signTemplates.id],
    name: "fk_sign_envelopes_org_template",
  }).onDelete("setNull"),
  foreignKey({
    columns: [table.orgId, table.watermarkPolicyId],
    foreignColumns: [signWatermarkPolicies.orgId, signWatermarkPolicies.id],
    name: "fk_sign_envelopes_org_watermark_policy",
  }).onDelete("setNull"),
  foreignKey({
    columns: [table.orgId, table.publicFormId],
    foreignColumns: [signPublicForms.orgId, signPublicForms.id],
    name: "fk_sign_envelopes_org_public_form",
  }).onDelete("setNull"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_sign_templates_org_id, uniq_sign_watermark_policies_org_id, uniq_sign_public_forms_org_id

ALTER TABLE sign_envelopes
  ADD CONSTRAINT uniq_sign_envelopes_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE sign_envelopes
  ADD CONSTRAINT fk_sign_envelopes_org_template
    FOREIGN KEY (org_id, template_id) REFERENCES sign_templates (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE sign_envelopes
  ADD CONSTRAINT fk_sign_envelopes_org_watermark_policy
    FOREIGN KEY (org_id, watermark_policy_id) REFERENCES sign_watermark_policies (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE sign_envelopes
  ADD CONSTRAINT fk_sign_envelopes_org_public_form
    FOREIGN KEY (org_id, public_form_id) REFERENCES sign_public_forms (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE sign_envelopes VALIDATE CONSTRAINT uniq_sign_envelopes_org_id;
ALTER TABLE sign_envelopes VALIDATE CONSTRAINT fk_sign_envelopes_org_template;
ALTER TABLE sign_envelopes VALIDATE CONSTRAINT fk_sign_envelopes_org_watermark_policy;
ALTER TABLE sign_envelopes VALIDATE CONSTRAINT fk_sign_envelopes_org_public_form;
```

---

#### B2.5 — `sign_documents` → unique(org_id, id) + composite FK to envelopes

**Drizzle before:**
```ts
(table) => [
  index("idx_sign_documents_org_envelope").on(table.orgId, table.envelopeId),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uniq_sign_documents_org_id").on(table.orgId, table.id),
  index("idx_sign_documents_org_envelope").on(table.orgId, table.envelopeId),
  foreignKey({
    columns: [table.orgId, table.envelopeId],
    foreignColumns: [signEnvelopes.orgId, signEnvelopes.id],
    name: "fk_sign_documents_org_envelope",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_sign_envelopes_org_id

ALTER TABLE sign_documents
  ADD CONSTRAINT uniq_sign_documents_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE sign_documents
  ADD CONSTRAINT fk_sign_documents_org_envelope
    FOREIGN KEY (org_id, envelope_id) REFERENCES sign_envelopes (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_documents VALIDATE CONSTRAINT uniq_sign_documents_org_id;
ALTER TABLE sign_documents VALIDATE CONSTRAINT fk_sign_documents_org_envelope;
```

---

#### B2.6 — `sign_recipients` → unique(org_id, id) + composite FK to envelopes + self-ref

The `delegatedToRecipientId` is a bare `integer("delegated_to_recipient_id")` with no `.references()`
at all today. After `sign_recipients` has `uniq_sign_recipients_org_id`, the self-referential
composite FK can be declared.

**Drizzle before:**
```ts
(table) => [
  index("idx_sign_recipients_org_envelope").on(table.orgId, table.envelopeId),
  index("idx_sign_recipients_envelope_order").on(table.envelopeId, table.routingOrder),
  uniqueIndex("uniq_sign_recipients_token_hash").on(table.signingTokenHash),
]
```

**Drizzle after:**
```ts
import { ..., unique, foreignKey } from "drizzle-orm/pg-core";

(table) => [
  unique("uniq_sign_recipients_org_id").on(table.orgId, table.id),
  uniqueIndex("uniq_sign_recipients_token_hash").on(table.signingTokenHash),
  index("idx_sign_recipients_org_envelope").on(table.orgId, table.envelopeId),
  index("idx_sign_recipients_envelope_order").on(table.envelopeId, table.routingOrder),
  foreignKey({
    columns: [table.orgId, table.envelopeId],
    foreignColumns: [signEnvelopes.orgId, signEnvelopes.id],
    name: "fk_sign_recipients_org_envelope",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.delegatedToRecipientId],
    foreignColumns: [signRecipients.orgId, signRecipients.id],
    name: "fk_sign_recipients_org_delegated_to",
  }).onDelete("setNull"),
]
```

Note: The Drizzle relations file already declares the self-reference via `one(signRecipients, ...)`.
The self-referential `foreignKey()` in the table constraints is additive and safe.

**Generated SQL:**
```sql
-- Requires: uniq_sign_envelopes_org_id

ALTER TABLE sign_recipients
  ADD CONSTRAINT uniq_sign_recipients_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE sign_recipients
  ADD CONSTRAINT fk_sign_recipients_org_envelope
    FOREIGN KEY (org_id, envelope_id) REFERENCES sign_envelopes (org_id, id)
    ON DELETE CASCADE NOT VALID;

-- Self-referential: can only be declared after uniq_sign_recipients_org_id exists (same migration step is fine — Postgres evaluates the reference after the constraint is created)
ALTER TABLE sign_recipients
  ADD CONSTRAINT fk_sign_recipients_org_delegated_to
    FOREIGN KEY (org_id, delegated_to_recipient_id) REFERENCES sign_recipients (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE sign_recipients VALIDATE CONSTRAINT uniq_sign_recipients_org_id;
ALTER TABLE sign_recipients VALIDATE CONSTRAINT fk_sign_recipients_org_envelope;
ALTER TABLE sign_recipients VALIDATE CONSTRAINT fk_sign_recipients_org_delegated_to;
```

**Backfill/quarantine for `delegated_to_recipient_id`:** Check that any non-null values reference a
recipient in the same org:
```sql
SELECT r.id, r.org_id, r.delegated_to_recipient_id, d.org_id AS delegated_org
FROM sign_recipients r
JOIN sign_recipients d ON d.id = r.delegated_to_recipient_id
WHERE r.delegated_to_recipient_id IS NOT NULL
  AND r.org_id <> d.org_id;
```
If rows are found, NULL the `delegated_to_recipient_id` for cross-org rows and log them before
validating the constraint.

---

#### B2.7 — `sign_fields` → composite FKs to envelopes, documents, recipients

**Drizzle before:**
```ts
(table) => [
  index("idx_sign_fields_org_envelope").on(table.orgId, table.envelopeId),
  index("idx_sign_fields_document").on(table.documentId),
  index("idx_sign_fields_recipient").on(table.recipientId),
]
```

**Drizzle after:**
```ts
(table) => [
  index("idx_sign_fields_org_envelope").on(table.orgId, table.envelopeId),
  index("idx_sign_fields_document").on(table.documentId),
  index("idx_sign_fields_recipient").on(table.recipientId),
  foreignKey({
    columns: [table.orgId, table.envelopeId],
    foreignColumns: [signEnvelopes.orgId, signEnvelopes.id],
    name: "fk_sign_fields_org_envelope",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.documentId],
    foreignColumns: [signDocuments.orgId, signDocuments.id],
    name: "fk_sign_fields_org_document",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.recipientId],
    foreignColumns: [signRecipients.orgId, signRecipients.id],
    name: "fk_sign_fields_org_recipient",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_sign_envelopes_org_id, uniq_sign_documents_org_id, uniq_sign_recipients_org_id

ALTER TABLE sign_fields
  ADD CONSTRAINT fk_sign_fields_org_envelope
    FOREIGN KEY (org_id, envelope_id) REFERENCES sign_envelopes (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_fields
  ADD CONSTRAINT fk_sign_fields_org_document
    FOREIGN KEY (org_id, document_id) REFERENCES sign_documents (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_fields
  ADD CONSTRAINT fk_sign_fields_org_recipient
    FOREIGN KEY (org_id, recipient_id) REFERENCES sign_recipients (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_fields VALIDATE CONSTRAINT fk_sign_fields_org_envelope;
ALTER TABLE sign_fields VALIDATE CONSTRAINT fk_sign_fields_org_document;
ALTER TABLE sign_fields VALIDATE CONSTRAINT fk_sign_fields_org_recipient;
```

---

#### B2.8 — `sign_audit_events` → composite FKs to envelopes (nullable), recipients (nullable)

Both `envelopeId` and `recipientId` are nullable in this append-only table.

**Drizzle before:**
```ts
(table) => [
  index("idx_sign_audit_events_org_envelope_created").on(table.orgId, table.envelopeId, table.createdAt),
  index("idx_sign_audit_events_recipient").on(table.recipientId),
  index("idx_sign_audit_events_type").on(table.eventType),
]
```

**Drizzle after:**
```ts
(table) => [
  index("idx_sign_audit_events_org_envelope_created").on(table.orgId, table.envelopeId, table.createdAt),
  index("idx_sign_audit_events_recipient").on(table.recipientId),
  index("idx_sign_audit_events_type").on(table.eventType),
  foreignKey({
    columns: [table.orgId, table.envelopeId],
    foreignColumns: [signEnvelopes.orgId, signEnvelopes.id],
    name: "fk_sign_audit_events_org_envelope",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.recipientId],
    foreignColumns: [signRecipients.orgId, signRecipients.id],
    name: "fk_sign_audit_events_org_recipient",
  }).onDelete("setNull"),
]
```

**Generated SQL:**
```sql
ALTER TABLE sign_audit_events
  ADD CONSTRAINT fk_sign_audit_events_org_envelope
    FOREIGN KEY (org_id, envelope_id) REFERENCES sign_envelopes (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_audit_events
  ADD CONSTRAINT fk_sign_audit_events_org_recipient
    FOREIGN KEY (org_id, recipient_id) REFERENCES sign_recipients (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE sign_audit_events VALIDATE CONSTRAINT fk_sign_audit_events_org_envelope;
ALTER TABLE sign_audit_events VALIDATE CONSTRAINT fk_sign_audit_events_org_recipient;
```

---

#### B2.9 — `sign_certificates` → composite FK to envelopes

**Drizzle before:**
```ts
(table) => [
  uniqueIndex("uniq_sign_certificates_number").on(table.certificateNumber),
  index("idx_sign_certificates_org_envelope").on(table.orgId, table.envelopeId),
]
```

**Drizzle after:**
```ts
(table) => [
  uniqueIndex("uniq_sign_certificates_number").on(table.certificateNumber),
  index("idx_sign_certificates_org_envelope").on(table.orgId, table.envelopeId),
  foreignKey({
    columns: [table.orgId, table.envelopeId],
    foreignColumns: [signEnvelopes.orgId, signEnvelopes.id],
    name: "fk_sign_certificates_org_envelope",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
ALTER TABLE sign_certificates
  ADD CONSTRAINT fk_sign_certificates_org_envelope
    FOREIGN KEY (org_id, envelope_id) REFERENCES sign_envelopes (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_certificates VALIDATE CONSTRAINT fk_sign_certificates_org_envelope;
```

---

#### B2.10 — `sign_signature_assets` → composite FKs to envelopes + recipients

**Drizzle before:**
```ts
(table) => [
  index("idx_sign_signature_assets_recipient").on(table.recipientId),
  index("idx_sign_signature_assets_org_envelope").on(table.orgId, table.envelopeId),
]
```

**Drizzle after:**
```ts
(table) => [
  index("idx_sign_signature_assets_recipient").on(table.recipientId),
  index("idx_sign_signature_assets_org_envelope").on(table.orgId, table.envelopeId),
  foreignKey({
    columns: [table.orgId, table.envelopeId],
    foreignColumns: [signEnvelopes.orgId, signEnvelopes.id],
    name: "fk_sign_signature_assets_org_envelope",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.recipientId],
    foreignColumns: [signRecipients.orgId, signRecipients.id],
    name: "fk_sign_signature_assets_org_recipient",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
ALTER TABLE sign_signature_assets
  ADD CONSTRAINT fk_sign_signature_assets_org_envelope
    FOREIGN KEY (org_id, envelope_id) REFERENCES sign_envelopes (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_signature_assets
  ADD CONSTRAINT fk_sign_signature_assets_org_recipient
    FOREIGN KEY (org_id, recipient_id) REFERENCES sign_recipients (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_signature_assets VALIDATE CONSTRAINT fk_sign_signature_assets_org_envelope;
ALTER TABLE sign_signature_assets VALIDATE CONSTRAINT fk_sign_signature_assets_org_recipient;
```

---

#### B2.11 — `sign_bulk_send_jobs` → unique(org_id, id) + composite FK to templates

**Drizzle before:**
```ts
(table) => [
  index("idx_sign_bulk_send_jobs_org_status").on(table.orgId, table.status),
]
```

**Drizzle after:**
```ts
(table) => [
  unique("uniq_sign_bulk_send_jobs_org_id").on(table.orgId, table.id),
  index("idx_sign_bulk_send_jobs_org_status").on(table.orgId, table.status),
  foreignKey({
    columns: [table.orgId, table.templateId],
    foreignColumns: [signTemplates.orgId, signTemplates.id],
    name: "fk_sign_bulk_send_jobs_org_template",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
ALTER TABLE sign_bulk_send_jobs
  ADD CONSTRAINT uniq_sign_bulk_send_jobs_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE sign_bulk_send_jobs
  ADD CONSTRAINT fk_sign_bulk_send_jobs_org_template
    FOREIGN KEY (org_id, template_id) REFERENCES sign_templates (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_bulk_send_jobs VALIDATE CONSTRAINT uniq_sign_bulk_send_jobs_org_id;
ALTER TABLE sign_bulk_send_jobs VALIDATE CONSTRAINT fk_sign_bulk_send_jobs_org_template;
```

---

#### B2.12 — `sign_bulk_send_rows` — ADD org_id column first, then composite FKs

**This is the only table in the signos cluster missing `org_id`.** The fix requires three steps:

**Step 1 — Add nullable org_id column:**
```sql
ALTER TABLE sign_bulk_send_rows
  ADD COLUMN org_id text;
```

**Step 2 — Backfill from parent job:**
```sql
UPDATE sign_bulk_send_rows r
SET org_id = j.org_id
FROM sign_bulk_send_jobs j
WHERE j.id = r.job_id
  AND r.org_id IS NULL;
```

**Step 3 — Set NOT NULL + add FKs:**
```sql
ALTER TABLE sign_bulk_send_rows
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE sign_bulk_send_rows
  ADD CONSTRAINT fk_sign_bulk_send_rows_org
    FOREIGN KEY (org_id) REFERENCES organizations (id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE sign_bulk_send_rows
  ADD CONSTRAINT fk_sign_bulk_send_rows_org_job
    FOREIGN KEY (org_id, job_id) REFERENCES sign_bulk_send_jobs (org_id, id)
    ON DELETE CASCADE NOT VALID;

-- envelope_id is nullable (set null on delete)
ALTER TABLE sign_bulk_send_rows
  ADD CONSTRAINT fk_sign_bulk_send_rows_org_envelope
    FOREIGN KEY (org_id, envelope_id) REFERENCES sign_envelopes (org_id, id)
    ON DELETE SET NULL NOT VALID;

ALTER TABLE sign_bulk_send_rows VALIDATE CONSTRAINT fk_sign_bulk_send_rows_org;
ALTER TABLE sign_bulk_send_rows VALIDATE CONSTRAINT fk_sign_bulk_send_rows_org_job;
ALTER TABLE sign_bulk_send_rows VALIDATE CONSTRAINT fk_sign_bulk_send_rows_org_envelope;
```

**Drizzle after (bulk-send.ts — `signBulkSendRows` table):**
```ts
export const signBulkSendRows = pgTable(
  "sign_bulk_send_rows",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),  // ADD
    jobId: integer("job_id").references(() => signBulkSendJobs.id, { onDelete: "cascade" }).notNull(),
    rowNumber: integer("row_number").notNull(),
    rawDataJson: jsonb("raw_data_json").$type<Record<string, unknown>>().notNull(),
    status: signBulkRowStatusEnum("status").default("pending").notNull(),
    envelopeId: integer("envelope_id").references(() => signEnvelopes.id, { onDelete: "set null" }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_sign_bulk_send_rows_job").on(table.jobId, table.rowNumber),
    index("idx_sign_bulk_send_rows_status").on(table.jobId, table.status),
    foreignKey({
      columns: [table.orgId, table.jobId],
      foreignColumns: [signBulkSendJobs.orgId, signBulkSendJobs.id],
      name: "fk_sign_bulk_send_rows_org_job",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.orgId, table.envelopeId],
      foreignColumns: [signEnvelopes.orgId, signEnvelopes.id],
      name: "fk_sign_bulk_send_rows_org_envelope",
    }).onDelete("setNull"),
  ],
);
```

**Quarantine:** After backfill, verify 0 rows have `org_id IS NULL` before setting NOT NULL.
```sql
SELECT COUNT(*) FROM sign_bulk_send_rows WHERE org_id IS NULL;
```
Expected: 0.

---

### B3 — Signos migration order summary

1. `sign_templates` — add `uniq_sign_templates_org_id`
2. `sign_watermark_policies` — add `uniq_sign_watermark_policies_org_id`
3. `sign_public_forms` — add unique + FK to templates
4. `sign_envelopes` — add unique + 3 FKs (templates, watermarks, public_forms)
5. `sign_documents` — add unique + FK to envelopes
6. `sign_recipients` — add unique + FK to envelopes + self-ref FK
7. `sign_fields` — add 3 FKs (envelopes, documents, recipients)
8. `sign_audit_events` — add 2 FKs (nullable envelopes, nullable recipients)
9. `sign_certificates` — add FK to envelopes
10. `sign_signature_assets` — add 2 FKs (envelopes, recipients)
11. `sign_bulk_send_jobs` — add unique + FK to templates
12. `sign_bulk_send_rows` — ADD org_id column + backfill + 3 FKs

Total signos operations: **7 unique constraints** + **17 composite FK constraints** + **1 column
addition** = **25 DDL statements** (each FK run NOT VALID then VALIDATE separately).

---

## SECTION C — BLOG (`blog.ts`)

### C0 — Status: EXEMPT (no action required)

The `blog.ts` file was read and confirmed. All three blog tables — `blog_authors`, `blog_categories`,
`blog_posts` — are **global platform-level content with no org_id**. Posts are public marketing
pages at `/blogs` with no organization context. The `blog_posts` table has internal FKs to
`blog_categories` and `blog_authors` which are global-scope single-column refs and correct as-is.

| Table | org_id? | Composite FK needed? | Status |
|---|---|---|---|
| `blog_authors` | ✗ global | No | ✔ EXEMPT |
| `blog_categories` | ✗ global | No | ✔ EXEMPT |
| `blog_posts` | ✗ global | No | ✔ EXEMPT |

This matches the Wave 0 matrix PART J verdict. No migration work for blog in any wave.

---

## SECTION D — AUTOMATION (`automation/rules.ts`)

### D0 — Observed schema reality

`automation_rules` has `orgId: text("org_id").references(() => organizations.id)` — direct bare
single-column FK to org (correct anchor). `automation_runs` has the same `orgId` reference plus
`ruleId: integer("rule_id").references(() => automationRules.id)` — a bare single-column FK with
no composite FK enforcement.

### D1 — `automation_rules` → add `unique(org_id, id)`

**Drizzle after adds:**
```ts
unique("uniq_automation_rules_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
ALTER TABLE automation_rules
  ADD CONSTRAINT uniq_automation_rules_org_id UNIQUE (org_id, id) NOT VALID;

ALTER TABLE automation_rules VALIDATE CONSTRAINT uniq_automation_rules_org_id;
```

### D2 — `automation_runs` → composite FK to automation_rules

**Drizzle before (automation/rules.ts — automationRuns table):**
```ts
(table) => [
  index("idx_automation_runs_rule").on(table.ruleId),
  index("idx_automation_runs_org_status").on(table.orgId, table.status),
]
```

**Drizzle after:**
```ts
import { ..., foreignKey } from "drizzle-orm/pg-core";

(table) => [
  index("idx_automation_runs_rule").on(table.ruleId),
  index("idx_automation_runs_org_status").on(table.orgId, table.status),
  foreignKey({
    columns: [table.orgId, table.ruleId],
    foreignColumns: [automationRules.orgId, automationRules.id],
    name: "fk_automation_runs_org_rule",
  }).onDelete("cascade"),
]
```

**Generated SQL:**
```sql
-- Requires: uniq_automation_rules_org_id

ALTER TABLE automation_runs
  ADD CONSTRAINT fk_automation_runs_org_rule
    FOREIGN KEY (org_id, rule_id) REFERENCES automation_rules (org_id, id)
    ON DELETE CASCADE NOT VALID;

ALTER TABLE automation_runs VALIDATE CONSTRAINT fk_automation_runs_org_rule;
```

**Backfill/quarantine:**
```sql
-- Confirm no cross-org runs exist (should be 0)
SELECT r.id, r.org_id AS run_org, ar.org_id AS rule_org
FROM automation_runs r
JOIN automation_rules ar ON ar.id = r.rule_id
WHERE r.org_id <> ar.org_id;
```

---

## SECTION E — VERIFICATION: Party / Directory / Portal-Access

> These clusters were flagged in wave-0 as already compliant. This section verifies each table
> directly against the actual Drizzle schema files read on 2026-07-26.

### E1 — party/ cluster

| Table | File | org_id present & NOT NULL? | Unique(org_id, pk) constraint declared? | Composite FK to parent? | Verdict |
|---|---|---|---|---|---|
| `business_parties` | `party/business-parties.ts` | ✔ `organizationId text NOT NULL .references(organizations.id)` | ✔ `unique("uniq_business_parties_org_party").on(organizationId, partyId)` | N/A — direct org anchor | ✔ COMPLIANT |
| `party_contacts` | `party/party-contacts.ts` | ✔ `organizationId text NOT NULL .references(organizations.id)` | ✔ `unique("uniq_party_contacts_org_contact").on(organizationId, partyContactId)` | ✔ `foreignKey("fk_party_contacts_org_party")` on `(organizationId, partyId) → business_parties(organizationId, partyId)` with cascade | ✔ COMPLIANT |
| `party_addresses` | `party/party-addresses.ts` | ✔ `organizationId text NOT NULL .references(organizations.id)` | ✗ No `unique(org, pk)` declared (partyAddressId is PK) | ✔ `foreignKey("fk_party_addresses_org_party")` on `(organizationId, partyId) → business_parties(organizationId, partyId)` with cascade | ⚠ PARTIAL — missing own `unique(org_id, party_address_id)` (no downstream child tables require it currently; mark for future if a child ever references party_addresses) |

**party_addresses note:** `party_addresses` is a leaf table — nothing declares a composite FK to it
as a parent. The missing own-candidate-key is harmless today. If a child table is ever added, add
`unique("uniq_party_addresses_org_id").on(organizationId, partyAddressId)` then.

### E2 — directory/ cluster

| Table | File | org_id present & NOT NULL? | Unique(org_id, pk)? | Composite FK to parent? | Verdict |
|---|---|---|---|---|---|
| `organization_people` | `directory/organization-people.ts` | ✔ `organizationId text NOT NULL .references(organizations.id)` | ✔ `unique("uniq_org_people_org_person").on(organizationId, organizationPersonId)` | N/A — direct org anchor | ✔ COMPLIANT |
| `workers` | `directory/workers.ts` | ✔ `organizationId text NOT NULL .references(organizations.id)` | ✔ `unique("uniq_workers_org_worker").on(organizationId, workerId)` | ✔ `foreignKey("fk_workers_org_person")` on `(organizationId, organizationPersonId) → organization_people(organizationId, organizationPersonId)` with restrict | ✔ COMPLIANT |
| `worker_engagements` | `directory/worker-engagements.ts` | ✔ `organizationId text NOT NULL .references(organizations.id)` | ✔ `uniqueIndex("uniq_worker_engagements_org_engagement").on(organizationId, workerEngagementId)` | ✔ `foreignKey("fk_worker_engagements_org_worker")` on `(organizationId, workerId) → workers(organizationId, workerId)` with cascade | ✔ COMPLIANT |

**directory observation:** `worker_engagements.departmentId`, `businessUnitId`, `branchId`,
`locationId`, `teamId`, `managerEngagementId`, `jobRoleId`, `jobLevelId`, `employmentTypeId` are
all bare FKs to HR org-structure tables. These are tracked under the HR cluster wave (W7-B) and are
not in scope for this document.

### E3 — portal-access/ cluster

| Table | File | org_id? | Unique(org_id, pk)? | Composite FK to parent? | Verdict |
|---|---|---|---|---|---|
| `portal_memberships` | `portal-access/portal-memberships.ts` | ✔ `organizationId text NOT NULL .references(organizations.id)` | ✔ `unique("uniq_portal_memberships_org_membership")` on `(organizationId, portalMembershipId)` + `unique("uniq_portal_memberships_org_membership_contact")` on `(org, membership, contact)` | ✔ `foreignKey("fk_portal_memberships_org_contact")` on `(organizationId, partyContactId) → party_contacts(organizationId, partyContactId)` with restrict | ✔ COMPLIANT |
| `portal_invitations` | `portal-access/portal-invitations.ts` | ✔ `organizationId text NOT NULL .references(organizations.id)` | ✔ `uniqueIndex("uniq_portal_invitations_org_invitation")` on `(organizationId, portalInvitationId)` | ✔ two composite FKs: `fk_portal_invitations_org_contact` → `party_contacts` and `fk_portal_invitations_org_accepted_membership` → `portal_memberships` | ✔ COMPLIANT |
| `project_client_grants` | `portal-access/project-client-grants.ts` | ✔ `organizationId text NOT NULL .references(organizations.id)` | ✔ `uniqueIndex("uniq_project_client_grants_org_grant")` on `(organizationId, projectClientGrantId)` | ✔ two composite FKs: `fk_project_client_grants_org_membership_contact` (3-col) → `portal_memberships` + `fk_project_client_grants_org_contact` → `party_contacts`. Also bare single-col `projectId → projects.id` (no composite FK to projects yet — projects lacks `unique(org_id, id)` until Wave D). | ⚠ PARTIAL — `(organizationId, projectId) → projects(org_id, id)` composite FK blocked until Wave D adds `unique(org_id, id)` to projects |

**project_client_grants note:** The bare `integer("project_id").references(() => projects.id)` is
the only gap. It will become the composite `foreignKey({ columns: [organizationId, projectId],
foreignColumns: [projects.orgId, projects.id], name: "fk_project_client_grants_org_project" })`
once Wave D adds `uniq_projects_org_id`. Record as a Wave D follow-on task.

### E4 — Verification summary table

| Cluster | Tables fully compliant | Tables partially compliant | Tables non-compliant | Action this wave |
|---|---|---|---|---|
| party/ | `business_parties`, `party_contacts` | `party_addresses` (leaf — no own unique, harmless) | — | None (leaf gap deferred) |
| directory/ | `organization_people`, `workers`, `worker_engagements` | — | — | None |
| portal-access/ | `portal_memberships`, `portal_invitations` | `project_client_grants` (projects FK gap only) | — | Follow-on in Wave D |

**Overall verdict:** The party/directory/portal-access clusters are substantially compliant as
documented in wave-0. Two edge-case gaps exist — `party_addresses` missing its own candidate key
(harmless leaf today) and `project_client_grants` missing the composite FK to `projects` (blocked
on Wave D). Neither requires action in Wave 4.

---

## COUNTS AND SUMMARY

| Domain | Unique constraints to add | Composite FKs to add | Columns to add | Tables needing work |
|---|---|---|---|---|
| Surveys | 14 | 28 | 0 | 13 (survey_forms, survey_versions, survey_sections, survey_questions, survey_question_choices, survey_logic_rules, survey_collectors, survey_participants, survey_response_sessions, survey_answers, survey_assessment_attempts, survey_certificates, survey_live_sessions, survey_automation_events) |
| SignOS | 7 | 17 | 1 (sign_bulk_send_rows.org_id) | 12 (all signos tables except sign_org_settings) |
| Blog | 0 | 0 | 0 | 0 (EXEMPT — global content) |
| Automation | 1 | 1 | 0 | 2 (automation_rules, automation_runs) |
| **TOTAL** | **22** | **46** | **1** | **27** |

**Party/Directory/Portal-Access verification result:**
- party/ — ✔ CONFIRMED COMPLIANT (leaf gap `party_addresses` deferred, not blocking)
- directory/ — ✔ CONFIRMED FULLY COMPLIANT
- portal-access/ — ✔ SUBSTANTIALLY COMPLIANT; one deferred gap in `project_client_grants` for the
  projects FK (Wave D dependency)

**Key architectural decisions recorded in this spec:**
1. `survey_forms.active_version_id` circular ref — intentionally left as bare application-enforced
   pointer; no DB FK declared (correct, as documented).
2. `sign_bulk_send_rows` is the only table in Wave 4 requiring a DDL column addition (`org_id`) before
   FK work can begin.
3. CRM cross-refs from `survey_participants` (`contact_id`, `lead_id`, `client_id`) are deferred to
   Wave C when those parent tables gain their `unique(org_id, id)` candidate keys.
4. `sign_recipients.delegated_to_recipient_id` self-reference gets its composite FK in the same
   migration step as `uniq_sign_recipients_org_id` (Postgres resolves the self-ref after the
   constraint is created in the same transaction).
