# HRM-06 — Forms, Zod, and API Validation PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

Every HRMS form states requiredness truthfully, validates with Zod on the
client, and enforces the same business contract on the API. Optional labels that
are actually required are treated as product defects.

## Ownership Boundary

Owns form schemas, API DTOs, required/optional matrix, unsaved guards, and
error mapping. Page existence is HRM-02. Performance of writes is HRM-07.

## Current Source Findings

- Feature schemas live under `features/hr/**/*-schema.ts` (leave, expenses,
  assets, travel, employee form, onboarding, exit, holidays, performance,
  recruitment boundary, etc.).
- Backend has ~112 `*.schemas.ts` under `modules/hr`; strong on mutations.
- Gaps: dashboard, service-delivery, leave-policy-summary controllers without
  Validate import; many list GETs without query schemas; `check-email` manual
  guard.
- `employee-form-schema` marks designation/phone/gender/joiningDate optional
  via empty string — product may intend required for onboard.
- Legacy `lib/validation/hr` still referenced from `components/hr/_onboarding`.
- HR underuses `EntityFormSheet` shared validation chrome.

## Global Validation Rules

1. One Zod schema per form in `*-schema.ts`; types via `z.infer` only.
2. API DTO is the source of requiredness for persisted fields; UI must match.
3. Empty string for optional strings is normalized to `null`/`undefined` at the
   boundary — never stored as `""` when DB is nullable.
4. Dates are ISO; ranges check order.
5. Money is integer minor units or documented decimal with scale — never float
   ambiguity.
6. Enums reject unknown values (no silent coerce to default that widens access).
7. Files: type, size, virus-scan hook if platform provides it.
8. Cross-field rules use `.superRefine` / `.refine` with field paths.
9. Server returns field-level errors; client maps to RHF `setError`.
10. Unsaved dirty guards on full pages and sheets that mutate.

## Required vs Optional Matrix (canonical)

Repair UI labels and schemas to this matrix unless Phase 0 overrides.

### Employee create / onboard

| Field | Required | Notes |
|-------|----------|-------|
| Legal first / last name | Yes | |
| Work email | Yes | Unique per org |
| Joining date | Yes | Onboard |
| Employment type | Yes | |
| Department | Yes for onboard | Optional on draft invite if product allows draft |
| Designation / title | Yes for onboard | Fix optional label if currently shown optional |
| Manager | Optional | Required when policy says |
| Phone | Optional | E.164 when present |
| Gender | Optional | |
| Location | Optional | Required if attendance geofence by location |
| Date of birth | Optional on HR create; required on self profile when policy | Privacy |

### Leave request

| Field | Required |
|-------|----------|
| Leave type | Yes |
| Start / end | Yes |
| Reason | Yes (min length per schema, currently 10) |
| Half-day markers | When type allows |
| Attachment | When policy requires |

### WFH request

| Field | Required |
|-------|----------|
| Date or date range | Yes (HRM-13 multi-day expand) |
| Reason | Yes |
| Approver | Yes unless auto-approve policy |
| Notes | Optional (max length enforced) |

### Attendance regularize

| Field | Required |
|-------|----------|
| Date | Yes |
| Requested times | Yes |
| Reason | Yes |
| Evidence | When policy requires |
| Work location context | Display WFO/WFH; do not allow illegal status without approval |

### Expense

| Field | Required |
|-------|----------|
| Category | Yes |
| Amount | Yes |
| Date | Yes |
| Custom category | When category is Other |
| Receipt | When policy / amount threshold |

### Travel

| Field | Required |
|-------|----------|
| Destination | Yes |
| Dates | Yes |
| Purpose | Yes |
| Estimated cost | Per policy |

### Document upload

| Field | Required |
|-------|----------|
| Type | Yes |
| File or template | Yes |
| Subject employee | When not org-wide |
| Expiry | When type requires |

### Exit / termination

| Field | Required |
|-------|----------|
| Employee | Yes |
| Last working day | Yes |
| Reason code | Yes |
| Initiator notes | Optional |
| Checklist assignment | Yes on confirm |

### Holiday

| Field | Required |
|-------|----------|
| Name | Yes |
| Date | Yes |
| Optional / mandatory | Yes |
| Locations | When location-scoped calendar |

### Benefit enrollment

| Field | Required |
|-------|----------|
| Plan | Yes |
| Effective date | Yes |
| Dependents | When plan requires |

### Performance goal

| Field | Required |
|-------|----------|
| Title | Yes |
| Owner | Yes |
| Cycle | When org uses cycles |
| Due date | Optional |
| Key results | Optional |

### Helpdesk / case

| Field | Required |
|-------|----------|
| Subject | Yes |
| Category | Yes |
| Description | Yes |
| Priority | Default allowed |

- [ ] **HRM-06-001** audit every HRMS form label for optional/required mismatch
  against API DTO; fix employee onboard fields first.
- [ ] **HRM-06-002** align `employee-form-schema` with onboard API requiredness.
- [ ] **HRM-06-003** delete legacy `lib/validation/hr` after onboarding migration.
- [ ] **HRM-06-004** add `@Validate` query/body schemas to dashboard,
  service-delivery, leave-policy-summary, leave team/types, org directory, and
  remaining list GETs in scope.
- [ ] **HRM-06-005** replace manual `check-email` with Zod query schema.
- [ ] **HRM-06-006** every mutation response error maps to fields; toast only for
  non-field failures.
- [ ] **HRM-06-007** unsaved guards on employee edit, leave request, expense,
  travel, document editor, case create, termination.
- [ ] **HRM-06-008** backend `@ResponseSchema` matches actual service payloads
  (no silent strip of fields the UI needs).

## Per-Form Checklist (implementation)

For each form below, close only when client Zod, API DTO, and label requiredness
match:

- [ ] **HRM-06-009** Employee create / edit / onboard
- [ ] **HRM-06-010** Leave request (self + admin)
- [ ] **HRM-06-010a** WFH request (self + admin) — full checklist in HRM-13
- [ ] **HRM-06-011** Leave policy create / edit (include `wfh` policy type)
- [ ] **HRM-06-012** Attendance check-in / regularize (WFO/WFH contract)
- [ ] **HRM-06-013** Shift / roster forms
- [ ] **HRM-06-014** Expense create / edit
- [ ] **HRM-06-015** Travel request
- [ ] **HRM-06-016** Document upload / template
- [ ] **HRM-06-017** Holiday create
- [ ] **HRM-06-018** Asset assign / create
- [ ] **HRM-06-019** Case / helpdesk create
- [ ] **HRM-06-020** Goal / KPI / feedback forms
- [ ] **HRM-06-021** Benefit enroll / claim
- [ ] **HRM-06-022** Termination / exit / FnF initiation
- [ ] **HRM-06-023** Directory person / worker engagement forms
- [ ] **HRM-06-024** HR settings: custom fields, forms builder, workflows
- [ ] **HRM-06-025** Announcement create / edit
- [ ] **HRM-06-026** Onboarding wizard steps (bank, personal, documents)

## Acceptance Checks

- [ ] **HRM-06-027** contract tests: missing required fields 400 on API with
  paths.
- [ ] **HRM-06-028** browser proof: optional chrome never appears on required
  employee onboard fields.
- [ ] **HRM-06-029** no `any` / cast hacks introduced in schema wiring.
