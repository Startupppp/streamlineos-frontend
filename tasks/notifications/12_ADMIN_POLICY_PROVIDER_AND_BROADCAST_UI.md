# Admin Policy, Provider And Broadcast UI

## Goal
Give owners/admins full control over notification behavior, providers, costs, templates, and broadcasts.

## Admin Navigation
Admin pages:
- Event Catalog
- Policy Defaults
- Providers
- Templates
- Broadcasts
- Queue
- Analytics
- Audit Logs

## Event Catalog
Admin can:
- Search events.
- Filter by module/category/priority.
- View default channels.
- See whether event is mandatory.
- Enable/disable non-mandatory event.
- Set priority.
- Set default channels.
- Configure quiet-hour behavior.
- Configure dedupe/rate limit.
- Decide user override permissions.

## Policy Defaults
Scopes:
- Organization
- Role
- Department
- Team
- Project

Admin can:
- Set default channels.
- Apply to new users.
- Apply to existing users optionally.
- Lock critical policies.
- Preview effective policy for a sample user.

## Providers
Admin can:
- Add provider.
- Configure provider safely.
- Enable sandbox mode.
- Send test notification.
- Set daily send limit.
- Set monthly cost limit.
- View health status.
- Disable provider.

Providers:
- Email SMTP/SendGrid
- SMS Twilio
- WhatsApp Twilio/Meta
- Web Push
- Slack
- Teams
- Webhook

## Broadcasts
Admin can create:
- Company announcement
- Emergency alert
- Feature update
- Policy update
- Maintenance notice
- HR announcement

Broadcast builder:
- Title
- Message
- Priority
- Channels
- Audience
- Schedule
- Preview
- Approval
- Send test
- Send now

Audience builder:
- All users
- Roles
- Departments
- Teams
- Specific users
- Locations
- Project members
- Customer segments if customer notifications are later supported

## Queue Monitor
Admin can:
- See failed sends.
- Retry.
- Cancel.
- Filter by provider/channel/status.
- Open provider response.
- View cost.

## UX Requirements
- Admin UI should be dense but clean.
- Use tables for queue/audit.
- Use cards only for repeated summary metrics or provider cards.
- Avoid marketing-style hero sections.
- Every dangerous action requires confirmation.

## Acceptance Criteria
- Admin can configure a provider and send test message.
- Admin can change default event policy.
- Admin can create and schedule broadcast.
- Admin can debug failed delivery without database access.
