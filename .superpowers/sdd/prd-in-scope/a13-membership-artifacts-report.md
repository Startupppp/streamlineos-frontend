# A13 — Membership Artifacts Report

## Summary

Added 20 tables to `MEMBERSHIP_ARTIFACT_TABLES`, pinned 18 new excluded columns in `KNOWN_EXCLUDED_COLUMNS`, wired cleanup code for 4 no-FK tables into `revokeOrgScopedAccess`, and added 6 regression tests.

**Classification: 13 AUTHORITY / 7 ATTRIBUTION**
**Security findings: 13**

---

## Table Classification

| Table | Column(s) | FK / ON DELETE | Type | onRemoval | onSuspension | Notes |
|---|---|---|---|---|---|---|
| event_attendees | membership_id | RESTRICT (explicit) | AUTHORITY | blocks-removal | retain | SF-1 |
| tickets | assignee_membership_id / reporter_membership_id | RESTRICT x2 | AUTHORITY | blocks-removal | retain | SF-2 |
| ticket_assignees | membership_id | RESTRICT | AUTHORITY | blocks-removal | retain | SF-3 |
| project_members | membership_id | RESTRICT | AUTHORITY | blocks-removal | retain | SF-4 |
| project_approvals | approver_membership_id | RESTRICT | AUTHORITY | blocks-removal | retain | SF-5 |
| wfh_requests | approver_membership_id | RESTRICT | AUTHORITY | blocks-removal | retain | SF-6 |
| helpdesk_tickets | assignee_membership_id | RESTRICT | AUTHORITY | blocks-removal | retain | SF-7 |
| leave_requests | approver_membership_id | RESTRICT | AUTHORITY | blocks-removal | retain | SF-8 |
| performance_reviews | reviewer_membership_id | RESTRICT | AUTHORITY | blocks-removal | retain | SF-9 |
| chat_channel_members | membership_id | NO ACTION (RESTRICT) | AUTHORITY | blocks-removal | retain | SF-10 |
| chat_messages | sender_membership_id | NO FK | ATTRIBUTION | set-null | retain | FIXED in code |
| chat_message_reactions | membership_id | NO ACTION (RESTRICT) | AUTHORITY | blocks-removal | retain | SF-11 |
| chat_saved_messages | membership_id | NO FK | ATTRIBUTION | delete | retain | FIXED in code |
| chat_reply_reminders | recipient_membership_id / sender_membership_id | NO FK | AUTHORITY | delete | retain | FIXED in code |
| chat_huddle_participants | membership_id | NO FK to org_members | AUTHORITY | delete | retain | FIXED in code |
| kb_pages | owner_membership_id | NO ACTION (RESTRICT) | AUTHORITY | blocks-removal | retain | SF-12 |
| kb_page_favorites | membership_id | NO ACTION (RESTRICT) | ATTRIBUTION | blocks-removal | retain | SF-13 |
| kb_page_visits | membership_id | NO ACTION (RESTRICT) | ATTRIBUTION | blocks-removal | retain | SF-13 |
| kb_page_reviews | reviewer_membership_id | SET NULL | AUTHORITY | set-null | retain | DB handles |
| expenses | approver_membership_id | RESTRICT | AUTHORITY | blocks-removal | retain | SF-5 |

---

## SECURITY FINDINGS

All 13 findings share the same root cause: `RESTRICT` or `NO ACTION` foreign keys prevent `DELETE FROM organization_members`, and the catch in `removeMember` translates every `23503` error as "Cannot remove a member who owns a module" — a misleading message that hides the real blocker. The migrations lane must ship the following SQL before any of these can be revoked cleanly.

### SF-1 through SF-13: RESTRICT FK tables block member removal

Any member who has ever: attended an event (SF-1), been assigned to or reported a ticket (SF-2), been assigned to a ticket via ticket_assignees (SF-3), been a project member (SF-4), been named as an approver on a project_approval, wfh_request, leave_request, or expense (SF-5/6/8/expenses), been assigned to a helpdesk ticket (SF-7), been named as a reviewer on a performance review (SF-9), been in any chat channel (SF-10), reacted to any message (SF-11), owned a KB page (SF-12), or favorited / visited any KB page (SF-13) — **cannot be removed**. The error returned is misleading.

### Required SQL (migrations lane — do NOT apply here)

```sql
-- event_attendees: cascade link rows
ALTER TABLE event_attendees DROP CONSTRAINT IF EXISTS event_attendees_membership_id_fkey;
ALTER TABLE event_attendees DROP CONSTRAINT fk_event_attendees_org_membership;
ALTER TABLE event_attendees ADD CONSTRAINT fk_event_attendees_org_membership
  FOREIGN KEY (org_id, membership_id) REFERENCES organization_members(org_id, id) ON DELETE CASCADE;

-- tickets: set null so attribution survives
ALTER TABLE tickets DROP CONSTRAINT fk_tickets_assignee_actor;
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_assignee_actor
  FOREIGN KEY (org_id, assignee_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;
ALTER TABLE tickets DROP CONSTRAINT fk_tickets_reporter_actor;
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_reporter_actor
  FOREIGN KEY (org_id, reporter_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;

-- ticket_assignees: cascade link rows
ALTER TABLE ticket_assignees DROP CONSTRAINT fk_ticket_assignees_member_actor;
ALTER TABLE ticket_assignees ADD CONSTRAINT fk_ticket_assignees_member_actor
  FOREIGN KEY (org_id, membership_id) REFERENCES organization_members(org_id, id) ON DELETE CASCADE;

-- project_members: cascade link rows
ALTER TABLE project_members DROP CONSTRAINT fk_project_members_member_actor;
ALTER TABLE project_members ADD CONSTRAINT fk_project_members_member_actor
  FOREIGN KEY (org_id, membership_id) REFERENCES organization_members(org_id, id) ON DELETE CASCADE;

-- project_approvals: set null, attribution survives
ALTER TABLE project_approvals DROP CONSTRAINT fk_project_approvals_approver_actor;
ALTER TABLE project_approvals ADD CONSTRAINT fk_project_approvals_approver_actor
  FOREIGN KEY (org_id, approver_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;

-- wfh_requests: set null
ALTER TABLE wfh_requests DROP CONSTRAINT fk_wfh_requests_approver_actor;
ALTER TABLE wfh_requests ADD CONSTRAINT fk_wfh_requests_approver_actor
  FOREIGN KEY (org_id, approver_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;

-- helpdesk_tickets: set null
ALTER TABLE helpdesk_tickets DROP CONSTRAINT fk_helpdesk_tickets_assignee_actor;
ALTER TABLE helpdesk_tickets ADD CONSTRAINT fk_helpdesk_tickets_assignee_actor
  FOREIGN KEY (org_id, assignee_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;

-- leave_requests: set null for authority + both attribution columns
ALTER TABLE leave_requests DROP CONSTRAINT fk_leave_requests_approver_actor;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_approver_actor
  FOREIGN KEY (org_id, approver_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;
ALTER TABLE leave_requests DROP CONSTRAINT fk_leave_requests_created_actor;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_created_actor
  FOREIGN KEY (org_id, created_by_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;
ALTER TABLE leave_requests DROP CONSTRAINT fk_leave_requests_updated_actor;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_updated_actor
  FOREIGN KEY (org_id, updated_by_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;

-- performance_reviews: set null
ALTER TABLE performance_reviews DROP CONSTRAINT fk_performance_reviews_reviewer_actor;
ALTER TABLE performance_reviews ADD CONSTRAINT fk_performance_reviews_reviewer_actor
  FOREIGN KEY (org_id, reviewer_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;

-- chat_channel_members: cascade link rows
ALTER TABLE chat_channel_members DROP CONSTRAINT fk_chat_channel_members_org_membership;
ALTER TABLE chat_channel_members ADD CONSTRAINT fk_chat_channel_members_org_membership
  FOREIGN KEY (org_id, membership_id) REFERENCES organization_members(org_id, id) ON DELETE CASCADE;

-- chat_message_reactions: cascade
ALTER TABLE chat_message_reactions DROP CONSTRAINT fk_chat_message_reactions_org_membership;
ALTER TABLE chat_message_reactions ADD CONSTRAINT fk_chat_message_reactions_org_membership
  FOREIGN KEY (org_id, membership_id) REFERENCES organization_members(org_id, id) ON DELETE CASCADE;

-- kb_pages owner: set null (require ownership transfer or auto-clear)
ALTER TABLE kb_pages DROP CONSTRAINT fk_kb_pages_org_owner_membership;
ALTER TABLE kb_pages ADD CONSTRAINT fk_kb_pages_org_owner_membership
  FOREIGN KEY (org_id, owner_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;
-- also fix the attribution columns on kb_pages that carry RESTRICT (pre-existing):
ALTER TABLE kb_pages DROP CONSTRAINT fk_kb_pages_org_created_membership;
ALTER TABLE kb_pages ADD CONSTRAINT fk_kb_pages_org_created_membership
  FOREIGN KEY (org_id, created_by_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;
ALTER TABLE kb_pages DROP CONSTRAINT fk_kb_pages_org_edited_membership;
ALTER TABLE kb_pages ADD CONSTRAINT fk_kb_pages_org_edited_membership
  FOREIGN KEY (org_id, last_edited_by_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;
ALTER TABLE kb_pages DROP CONSTRAINT fk_kb_pages_org_deleted_membership;
ALTER TABLE kb_pages ADD CONSTRAINT fk_kb_pages_org_deleted_membership
  FOREIGN KEY (org_id, deleted_by_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;
ALTER TABLE kb_pages DROP CONSTRAINT fk_kb_pages_org_verified_membership;
ALTER TABLE kb_pages ADD CONSTRAINT fk_kb_pages_org_verified_membership
  FOREIGN KEY (org_id, verified_by_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;

-- kb_page_favorites and kb_page_visits: cascade (personal data, no authority)
ALTER TABLE kb_page_favorites DROP CONSTRAINT fk_kb_page_favorites_org_membership;
ALTER TABLE kb_page_favorites ADD CONSTRAINT fk_kb_page_favorites_org_membership
  FOREIGN KEY (org_id, membership_id) REFERENCES organization_members(org_id, id) ON DELETE CASCADE;
ALTER TABLE kb_page_visits DROP CONSTRAINT fk_kb_page_visits_org_membership;
ALTER TABLE kb_page_visits ADD CONSTRAINT fk_kb_page_visits_org_membership
  FOREIGN KEY (org_id, membership_id) REFERENCES organization_members(org_id, id) ON DELETE CASCADE;

-- expenses: set null
ALTER TABLE expenses DROP CONSTRAINT fk_expenses_approver_actor;
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_approver_actor
  FOREIGN KEY (org_id, approver_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL;
```

Note: `leave_requests.created_by_membership_id` and `leave_requests.updated_by_membership_id` are excluded from the inventory scan (attribution) but carry the same RESTRICT FK and also block removal — include them in the same migration.

---

## 18 Pinned Excluded Columns

All 18 match `_by_membership_id$`, `^actor_membership_id$`, or are portal columns — all genuine attribution or structural non-grant fields:

| Column | Justification |
|---|---|
| audit_logs.actor_membership_id | Records who performed the audited action; matches `^actor_membership_id$` |
| calendar_events.created_by_membership_id | Attribution of event creator; matches `_by_membership_id$` |
| chat_channel_invite_links.created_by_membership_id | Attribution of link creator |
| chat_channels.created_by_membership_id | Attribution of channel creator |
| chat_huddles.started_by_membership_id | Attribution of huddle initiator |
| chat_org_settings.updated_by_membership_id | Attribution of settings editor |
| chat_pinned_messages.pinned_by_membership_id | Attribution of who pinned a message |
| expense_export_jobs.requested_by_membership_id | Attribution of export requester |
| kb_page_reviews.requested_by_membership_id | Attribution of review requester |
| kb_pages.created_by_membership_id | Attribution of page creator |
| kb_pages.deleted_by_membership_id | Attribution of soft-delete actor |
| kb_pages.last_edited_by_membership_id | Attribution of last editor |
| kb_pages.verified_by_membership_id | Attribution of content verifier |
| payroll_approvals.acted_by_membership_id | Attribution of payroll approver |
| payroll_runs.approved_by_membership_id | Attribution of run approver |
| reimbursements.approved_by_membership_id | Attribution of reimbursement approver |
| timesheet_periods.approved_by_membership_id | Attribution of period approver |
| timesheets.approved_by_membership_id | Attribution of timesheet approver |

---

## Bite-Proof Result

Removed `chat_huddle_participants` entry from MEMBERSHIP_ARTIFACTS, ran tests:

```
FAIL src/modules/organization/core/membership-artifacts.spec.ts
  × names every membership-keyed table in the inventory
    + "chat_huddle_participants",
```

Restored entry. All 52 tests pass.

---

## Validation Results

### 1. Test suite
```
node ./node_modules/jest/bin/jest.js --testPathPattern="membership-artifacts|revocation" --maxWorkers=1

PASS src/modules/organization/core/membership-artifacts.spec.ts (11 tests)
PASS src/modules/organization/core/membership-revocation.spec.ts (39 tests)
PASS src/modules/sessions/sessions-revocation-tombstone.spec.ts (2 tests)

Tests: 52 passed, 52 total
```

### 2. Typecheck
Pre-existing failures in `settings.controller.ts` (SettingsService missing methods from a concurrent lane change) exist both before and after this lane's work. My 4 changed files introduce zero new type errors.

### 3. verify:membership-revocation
Requires a live Neon DB connection — fails with `relation "permissions" does not exist`. Not run against live DB. Reported not passing.

---

## Code Changes

| File | Change |
|---|---|
| `membership-artifacts.ts` | +20 entries (385 lines total — cohesive inventory, justified exception to 300-line target) |
| `membership-artifacts.spec.ts` | `KNOWN_EXCLUDED_COLUMNS` expanded from 33 to 51 entries |
| `org-membership-access-revocation.ts` | +4 imports, +28 lines of cleanup in `isGrantCleanupCause` block |
| `membership-revocation.spec.ts` | +6 regression tests for chat session artifact cleanup |

## Fixes Applied

`revokeOrgScopedAccess` now clears four no-FK tables on removal/left (by `orgId` + `memberUserId`, which is available even after the membership row is hard-deleted):
- `chat_messages.sender_membership_id` → SET NULL
- `chat_saved_messages` → DELETE
- `chat_reply_reminders` (recipient or sender) → DELETE
- `chat_huddle_participants` → DELETE

These cleanups are correctly skipped on suspension (reversible, org gate denies access).
