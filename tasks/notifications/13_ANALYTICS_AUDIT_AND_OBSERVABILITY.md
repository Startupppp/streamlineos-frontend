# Analytics, Audit And Observability

## Analytics Goals
Admins should know:
- Are notifications being delivered?
- Which channels perform best?
- Which notifications are ignored?
- Which providers are failing?
- Are users overwhelmed?
- How much are SMS/WhatsApp costing?

## Metrics
Overview:
- Total notifications
- In-app created
- External queued
- Sent
- Delivered
- Read
- Clicked
- Actioned
- Failed
- Suppressed
- Average delivery latency

By dimension:
- Channel
- Provider
- Category
- Module
- Event key
- Priority
- User/team/department
- Date range

## Fatigue Metrics
- Notifications per user per day.
- Unread backlog.
- Muted categories.
- High ignored event types.
- Duplicate suppression count.
- Digest engagement.

## Cost Metrics
- SMS sends and estimated cost.
- WhatsApp sends and estimated cost.
- Cost by module/event/team.
- Monthly limit usage.

## Audit Logs
Audit:
- Preference changes.
- Admin policy changes.
- Provider config changes.
- Template changes.
- Broadcast creation/approval/send/cancel.
- Queue retry/cancel.
- Mandatory event changes.

## Observability
Backend must log:
- Event emitted.
- Routing decision.
- Suppression reason.
- Queue job status.
- Provider response.
- Failures and retries.

## Frontend Analytics UI
Dashboards:
- Delivery overview
- Channel performance
- Event performance
- Provider health
- Cost dashboard
- Fatigue dashboard

## Acceptance Criteria
- Admin can see failed channel/provider quickly.
- Every admin mutation has audit row.
- Analytics can filter by date/channel/module.
- Cost dashboard appears for paid channels.
