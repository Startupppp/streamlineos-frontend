# StreamlineOS Product Bible

# Knowledge Module

# 11_Workflows_Templates_And_Governance.md

## Purpose

Knowledge needs lightweight governance so company documentation stays accurate without slowing down daily note-taking.

## Article Lifecycle

Draft:

- Editable by author/editors.
- Not visible to general viewers unless shared.

In review:

- Submitted for approval.
- Locked from publishing by non-reviewers.

Published:

- Visible according to permissions.
- Eligible for search, AI, public help center if applicable.

Verified:

- Published content has an accountable owner.
- Verification can expire on a date or be indefinite if policy allows.
- Verified status appears in search, article header, mentions, and AI citations.

Archived:

- Hidden from normal lists.
- Restorable by managers.

## Approval Workflows

Configurable by space:

- No approval required.
- Approval required for publish.
- Approval required for public help center.
- Approval required for policy category.

Reviewer assignment:

- Space owner.
- Article owner.
- Specific role.
- Specific user.
- Round-robin team reviewers post-MVP.

## Freshness Reviews

Each article can have:

- Owner.
- Review interval.
- Last verified date.
- Next review date.
- Reviewer.

Default review intervals:

- Policy: 180 days.
- SOP: 90 days.
- Support article: 120 days.
- Runbook: 90 days.
- Notes: none.

Verification rules:

- Updating content after verification changes trust state to unverified unless the editor re-verifies with permission.
- Verification owner defaults to article owner.
- Verification expiry creates a review task.
- AI should prefer verified content.

## Template Governance

System templates:

- Available to all organizations.
- Cannot be edited by organization admins.
- Can be duplicated.

Organization templates:

- Created by authorized users.
- Available based on scope.

Template scopes:

- Private.
- Space.
- Team.
- Organization.
- System.

## Required Templates

- Blank note.
- SOP.
- Policy.
- Meeting notes.
- Decision record.
- Project brief.
- Sales playbook.
- Support article.
- Troubleshooting guide.
- HR onboarding guide.
- Inventory process.
- Incident postmortem.
- Customer escalation summary.
- Release notes.
- Security runbook.

## Suggested Template Sections

SOP:

- Purpose.
- Scope.
- Owner.
- Prerequisites.
- Steps.
- Exceptions.
- Related records.
- Review schedule.

Policy:

- Policy statement.
- Applies to.
- Responsibilities.
- Process.
- Exceptions.
- Effective date.
- Review owner.

Support Article:

- Problem.
- Environment.
- Cause.
- Resolution.
- Related tickets.
- Customer visibility.

Decision Record:

- Context.
- Decision.
- Alternatives.
- Consequences.
- Owner.
- Review date.

## Notifications

Trigger notifications for:

- Mention.
- Share invite.
- Comment.
- Review requested.
- Review approved/rejected.
- Article stale.
- Public article negative feedback threshold.

Use existing notifications infrastructure. If it is broken, create clear TODOs and fallback to in-app notifications rather than silent failure.

## Governance Settings

Space settings:

- Default owner.
- Default review interval.
- Approval required.
- Public publishing allowed.
- AI indexing allowed.
- Template defaults.

Organization settings:

- Knowledge enabled.
- Default company space.
- Version retention.
- Public help center enabled.
- AI enabled.
- Attachment limits.
- Review reminders.
- Verification required by category.
- Duplicate detection strictness.
- Export permissions.
- Trash retention days.

## Acceptance Criteria

- Publishing workflow is clear.
- Stale articles appear in review queue.
- Templates reduce blank-page friction.
- Notifications are emitted for critical workflow events.
- Governance is optional for private notes and lightweight team docs.
