# Rollout, Migration And Agent Prompt

## Rollout Plan

### Phase 1: Foundation
- Add schema/migrations.
- Implement event registry.
- Implement routing service.
- Keep existing notification creation compatible.

### Phase 2: Delivery
- Implement delivery records.
- Implement queue worker.
- Implement provider abstraction.
- Wire email and in-app first.

### Phase 3: Preferences
- Upgrade user preferences.
- Add effective preference API.
- Build simple and advanced preference UI.

### Phase 4: Admin
- Event catalog.
- Policy defaults.
- Provider setup.
- Queue monitor.
- Templates.

### Phase 5: Broadcasts And Analytics
- Broadcast builder.
- Analytics dashboard.
- Audit log UI.

### Phase 6: Paid/External Channels
- SMS.
- WhatsApp.
- Slack.
- Teams.
- Webhooks.

### Phase 7: AI
- Smart grouping.
- Daily briefing.
- Fatigue suggestions.

## Migration Rules
- Preserve existing notification data.
- Do not delete old preference fields.
- Add new fields with safe defaults.
- Backfill event keys where possible.
- Existing modules can keep using `NotificationsService.create` temporarily.
- New module work must use event-based API.

## Agent Prompt
Use this prompt with Claude or another coding agent:

```txt
You are working in the current StreamlineOS branch. Read the entire `notifications/` PRD folder first, in numeric order, before coding.

Goal: Implement the world-class Notifications module described in the PRDs. Use the existing notification backend and frontend modules; do not create a disconnected duplicate system.

Important existing areas:
- Backend: `streamlineos-backend/src/modules/notifications`
- Frontend notification types: `streamlineos-frontend/frontend/types/notifications.ts`
- Frontend features/routes/hooks under `streamlineos-frontend/frontend/features/notifications` and notification routes
- Existing email, push, realtime, chat, projects, payroll, recruitment, CRM, onboarding, payments, and cron notification integrations

Implementation rules:
1. Work PRD by PRD in order.
2. After each meaningful PRD or phase, run relevant lint/typecheck/tests.
3. Commit after each completed phase with a clear message.
4. Push to the current branch after commits.
5. Do not send real SMS, WhatsApp, email, Slack, Teams, or webhooks from local/dev; use sandbox/test mode.
6. Preserve existing APIs unless all call sites are migrated.
7. Add backend and frontend tests for every critical flow.
8. Enforce org isolation and admin permissions.
9. Never expose provider secrets in API responses.
10. Keep UI clean, modern, dense, and practical. Build the actual product screens, not landing pages.

Start by producing a short implementation plan mapped to the PRD files, then begin Phase 1.
```

## Final Definition Of Done
- Backend event registry, routing, preferences, templates, queue, providers, broadcasts, analytics, and audit are implemented.
- Frontend notification center, user preferences, admin policies, provider setup, template editor, queue monitor, broadcasts, analytics, and audit screens are implemented.
- Existing module notifications still work.
- New event-based notifications work.
- Tests pass.
- No real external provider sends happen in dev.
