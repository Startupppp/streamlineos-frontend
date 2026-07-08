# Routing Preferences And Rules

## Purpose
The routing engine decides who receives a notification, through which channel, when, and with what fallback.

## Backend Requirements
Create `NotificationRoutingService`.

Inputs:
- event definition
- event payload
- target user
- organization policy
- role/team/project defaults
- user preferences
- channel provider availability
- quiet hours
- suppression rules
- priority
- provider cost limits

Outputs:
- in-app notification record
- delivery records for each external channel
- suppressed delivery records with reason

## Preference Hierarchy
Highest priority wins:

1. Mandatory security/compliance policy
2. Organization critical override
3. Event-specific admin policy
4. Project/team/role/department defaults
5. User event preference
6. User category preference
7. User channel preference
8. System fallback defaults

## User Preference Controls
User can configure:

- All notifications on/off by channel
- Categories on/off
- Event types on/off
- Digest mode
- Quiet hours
- Sound
- High-priority bypass
- Mention/assignment focused alerts
- Per-project preferences
- Per-chat/channel preferences

## Admin Policy Controls
Admin can configure:

- Default channels by module/category/event
- Mandatory events
- Whether user can override
- Quiet-hour behavior
- SMS/WhatsApp cost limits
- Allowed providers
- Provider fallback order
- Event rate limits
- Broadcast approval rules

## Routing Rules

### Low Priority
- In-app only by default.
- Eligible for digest.

### Normal Priority
- In-app immediate.
- Email only if user opted in or event requires.
- Eligible for digest.

### High Priority
- In-app immediate.
- Push/email immediate unless disabled.
- Respect quiet hours unless event says `bypass_if_high`.

### Critical Priority
- In-app, push, email immediate.
- SMS/WhatsApp if enabled or required.
- Bypass quiet hours if event is mandatory or policy says so.

## Fallback Rules
- WhatsApp failed -> SMS if SMS enabled.
- Push expired -> email.
- Email bounced -> in-app plus admin-visible warning.
- Provider down -> queue retry, then fallback provider if configured.
- All external channels disabled -> in-app only unless mandatory event requires another verified channel.

## Suppression Rules
Suppress when:
- Duplicate event within dedupe window.
- User muted event/project/chat.
- User unsubscribed from marketing broadcast.
- Recipient address invalid.
- Provider missing and no fallback.
- Rate limit exceeded.
- Quiet hours and event can wait.

## Frontend Requirements
- Preference UI must explain simple choices:
  - "Notify me immediately"
  - "Send in digest"
  - "Only show in app"
  - "Mute"
- Advanced UI can expose per-channel matrix.
- Notification detail must show "Why did I get this?"

## Acceptance Criteria
- Routing output can be unit tested without sending real messages.
- Quiet hours behavior works across timezones.
- Mandatory events cannot be muted completely.
- Suppressed notifications are visible in audit/admin logs.
