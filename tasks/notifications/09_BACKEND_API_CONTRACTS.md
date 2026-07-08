# Backend API Contracts

## API Principles
- All APIs are organization-scoped.
- All admin APIs require permissions.
- All mutations are audited.
- APIs return typed, predictable responses.
- No provider secrets are returned after creation.

## User Notification APIs

### GET `/notifications`
Query:
- `section`
- `category`
- `priority`
- `sourceModule`
- `eventKey`
- `search`
- `limit`
- `cursor`
- `unreadOnly`

Response:
- items
- nextCursor
- unreadCount

### GET `/notifications/unread-count`
Returns unread count by total and section.

### POST `/notifications/:id/read`
Marks one notification as read.

### POST `/notifications/:id/unread`
Marks one notification as unread.

### POST `/notifications/read-all`
Marks all or filtered notifications as read.

### POST `/notifications/:id/archive`
Archives one notification.

### POST `/notifications/:id/unarchive`
Restores archived notification.

### POST `/notifications/:id/pin`
Pins notification.

### POST `/notifications/:id/unpin`
Unpins notification.

### POST `/notifications/:id/snooze`
Body:
- `snoozedUntil`

### POST `/notifications/bulk`
Body:
- `ids`
- `action`: `read`, `unread`, `archive`, `unarchive`, `pin`, `unpin`, `delete`

## Preference APIs

### GET `/notifications/preferences`
Returns effective user preferences, including inherited admin defaults.

### PATCH `/notifications/preferences`
Updates user preferences.

### GET `/notifications/preferences/events`
Returns user-friendly event preference catalog.

### PATCH `/notifications/preferences/events/:eventKey`
Updates event-specific preference.

## Event Registry APIs

### GET `/notifications/admin/events`
Admin event catalog.

### PATCH `/notifications/admin/events/:eventKey`
Update event policy.

### POST `/notifications/events/emit`
Internal/admin test endpoint only. Product modules should call service directly.

## Provider APIs

### GET `/notifications/admin/providers`
List providers without secrets.

### POST `/notifications/admin/providers`
Create provider config.

### PATCH `/notifications/admin/providers/:id`
Update provider.

### POST `/notifications/admin/providers/:id/test`
Send sandbox test.

### DELETE `/notifications/admin/providers/:id`
Disable or delete provider.

## Template APIs

### GET `/notifications/templates`
List templates.

### POST `/notifications/templates`
Create template.

### PATCH `/notifications/templates/:id`
Update template.

### POST `/notifications/templates/:id/preview`
Preview render.

### POST `/notifications/templates/:id/test`
Test send.

### POST `/notifications/templates/:id/activate`
Activate version.

## Broadcast APIs

### GET `/notifications/broadcasts`
List broadcasts.

### POST `/notifications/broadcasts`
Create draft/scheduled broadcast.

### PATCH `/notifications/broadcasts/:id`
Update draft.

### POST `/notifications/broadcasts/:id/approve`
Approve broadcast.

### POST `/notifications/broadcasts/:id/send`
Send now.

### POST `/notifications/broadcasts/:id/cancel`
Cancel scheduled broadcast.

## Queue APIs

### GET `/notifications/admin/queue`
List queue/deliveries.

### POST `/notifications/admin/queue/:id/retry`
Retry failed/dead item.

### POST `/notifications/admin/queue/bulk-retry`
Bulk retry.

### POST `/notifications/admin/queue/:id/cancel`
Cancel item.

## Analytics APIs

### GET `/notifications/admin/analytics`
Returns totals by channel, category, event, provider, status, date.

### GET `/notifications/admin/audit`
Returns audit logs.

## Backend Acceptance Criteria
- All endpoints validate input with zod or existing validation pattern.
- All admin endpoints enforce permissions.
- All user endpoints enforce org/user isolation.
- API returns no secrets.
- API supports pagination for large lists.
