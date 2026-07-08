# Testing, QA And Acceptance

## Backend Unit Tests
Test:
- Event registry validation.
- Routing rules.
- Quiet hours.
- Preference hierarchy.
- Mandatory event protection.
- Suppression rules.
- Dedupe/idempotency.
- Template rendering.
- Provider abstraction.
- Queue retry.
- Dead-letter behavior.
- Cross-org isolation.

## Backend Integration Tests
Test:
- Emit event -> notification row -> delivery rows -> queue jobs.
- Queue worker sends sandbox provider.
- Failed provider retries.
- Invalid recipient suppresses.
- Broadcast schedule/send/cancel.
- Template preview/test send.
- Provider config validation.

## Frontend Tests
Test:
- Notification center render.
- Filters.
- Bulk actions.
- Detail drawer.
- Preference updates.
- Mandatory locked events.
- Provider setup form.
- Template preview.
- Broadcast builder.
- Queue retry action.
- Mobile layout.

## E2E Flows
1. User receives project assignment notification.
2. User changes preference to digest.
3. Admin makes security event mandatory.
4. Critical event bypasses quiet hours.
5. Email provider fails and queue retries.
6. Broadcast sent to role audience.
7. WhatsApp disabled because no consent.
8. User snoozes notification and it reappears later.
9. Admin views analytics and audit logs.

## Acceptance Checklist
- No duplicate external sends for same idempotency key.
- Notification bell updates live.
- Notification center loads under 1 second for normal data size.
- Admin can configure and test provider.
- User can configure preferences in simple mode.
- Advanced event matrix works.
- Queue monitor can debug failed sends.
- Mandatory events cannot be disabled.
- All external sends have delivery logs.
- All admin changes have audit logs.
