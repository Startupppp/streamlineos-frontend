# Existing Codebase Gap Analysis

## Existing Backend Strengths
The current backend already contains:

- `notifications.service.ts`
- `notifications.controller.ts`
- `notification-preferences.controller.ts`
- `notification-preferences.service.ts`
- `notification-templates.controller.ts`
- `notification-templates.service.ts`
- `notification-queue.controller.ts`
- `notification-queue.service.ts`
- `notification-analytics.controller.ts`
- `notification-analytics.service.ts`
- `broadcasts.controller.ts`
- `broadcasts.service.ts`
- `notification-event.service.ts`
- DTO schemas for notifications, preferences, queue, broadcasts, and templates.

## Existing Frontend Strengths
The frontend already contains:

- Notification types.
- Notification center route.
- Preferences route.
- Templates route.
- Queue route.
- Analytics route.
- Audit route.
- Broadcast route.
- Notification bell.
- Notification card.
- Notification filters.
- Notification hooks.

## Existing Domain Emitters
Notifications are already touched by:

- Chat
- Projects
- Recruitment
- Payroll
- CRM
- Payments
- Onboarding
- Cron jobs
- Support
- Dashboard

## Key Gaps

### Backend Gaps
- No formal event registry.
- No single routing engine that decides channels using event policy, user preferences, urgency, quiet hours, provider availability, and fallback.
- Preferences exist but need richer policy hierarchy: organization defaults, role/team defaults, user overrides, event-level overrides.
- Delivery queue needs stronger idempotency, retry, provider response, and dead-letter behavior.
- Provider abstraction should be explicit and testable.
- Need domain event catalog for every product module.
- Need cost tracking for SMS and WhatsApp.
- Need mandatory notification rules for security/compliance events.
- Need notification suppression and deduplication rules.
- Need digest builder.
- Need AI grouping/summarization layer.

### Frontend Gaps
- Notification center must feel like a real inbox, not only a list.
- Preferences need a simple mode and advanced mode.
- Admin configuration screens need provider setup, event policy, template editor, queue monitor, broadcasts, and analytics.
- User should understand why a notification was sent.
- Actionable notifications need first-class UI.
- Mobile responsive behavior must be polished.

## Implementation Rule
Do not duplicate existing backend/frontend modules. Extend them. Keep old API behavior where possible and add new APIs where needed.

## Compatibility Requirement
Existing call sites that create notifications directly should continue working, but new code should prefer event-based creation:

```ts
notificationEvents.emit("project.task.assigned", {
  orgId,
  actorUserId,
  targetUserIds,
  entityType: "project_task",
  entityId: taskId,
  variables: { taskTitle, projectName }
});
```
