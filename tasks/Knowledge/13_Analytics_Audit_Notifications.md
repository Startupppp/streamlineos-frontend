# StreamlineOS Product Bible

# Knowledge Module

# 13_Analytics_Audit_Notifications.md

## Analytics Goals

Measure whether knowledge is:

- Created.
- Found.
- Trusted.
- Fresh.
- Useful.
- Deflecting support.

## Overview Metrics

- Total spaces.
- Total articles.
- Published articles.
- Draft articles.
- Archived articles.
- Stale articles.
- Verified articles.
- Verification-expired articles.
- Articles created this month.
- Article views.
- Unique viewers.
- Searches.
- Failed searches.
- AI asks.
- AI answer helpfulness.
- Helpfulness ratio.

## Article Metrics

Per article:

- Views.
- Unique viewers.
- Helpful votes.
- Not helpful votes.
- Comments.
- Shares.
- Last edited.
- Last verified.
- Search appearances.
- Search clicks.
- AI citations.
- Verification status.
- Duplicate warnings.

## Space Metrics

Per space:

- Article count.
- Published count.
- Stale count.
- View count.
- Active contributors.
- Failed searches scoped to space.

## Knowledge Gaps

Gap sources:

- Failed searches.
- AI no-context questions.
- Negative article feedback.
- Support tickets without linked articles.
- Repeated chat questions.

Gap status:

- Open.
- Assigned.
- Draft created.
- Published.
- Ignored.

## Audit Events

Audit these actions:

- Space created/updated/archived.
- Article created/updated/published/archived/deleted/restored.
- Permissions changed.
- Public article published/unpublished.
- Template changed.
- Review approved/rejected.
- Export performed.
- Import performed.
- Article verified or verification expired.
- AI asked for sensitive space if auditing is enabled.

Audit payload:

- Actor.
- Organization.
- Action.
- Resource.
- Before/after diff for metadata.
- Timestamp.
- IP/user agent if available.

Do not store full article content in audit logs unless required by enterprise compliance setting.

## Notifications

Notification channels:

- In-app.
- Email where configured.
- Chat notification where relevant.

Events:

- Mentioned in article/comment.
- Article shared with user/team.
- Review assigned.
- Review due soon.
- Review overdue.
- Comment reply.
- Public article negative feedback threshold crossed.
- Article approved/rejected.

## Notification Rules

- Do not notify users who cannot access the article.
- If mention target lacks access, ask author to share first.
- Batch noisy review reminders.
- Respect user notification preferences.

## Reports

Required dashboards:

- Knowledge health.
- Verification health.
- Search gaps.
- Support article performance.
- Stale content.
- Contributor activity.

Exports:

- CSV for analytics tables.
- Article export post-MVP if needed.

## Acceptance Criteria

- Analytics lists are paginated.
- Events are tenant-scoped.
- Notifications never leak titles/content to unauthorized users.
- Audit trail exists for all governance and permission events.
