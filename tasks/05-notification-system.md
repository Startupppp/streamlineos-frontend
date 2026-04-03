# Task 05: Notification System Overhaul

## Priority: HIGH | Effort: 5-6 days | Dependencies: Task 02 (DB tables), Task 06 (Redis, Inngest) | Status: NOT STARTED

---

## PRD

### Problem Statement
1. In-app notifications only — no desktop push
2. Email notifications inconsistent (some features send, some don't)
3. No user preferences — can't choose notification channels
4. Polling-based (30s interval), not real-time
5. No notification templates — messages hardcoded
6. No batching/digest for high-frequency events

### Goals
- Web Push API for desktop notifications
- Notification preferences per user per category
- Real-time delivery (SSE or reduced polling)
- Support in-app, email, push channels
- Notification batching for high-frequency events

### Non-Goals
- Novu integration (evaluate later)
- Mobile push (no mobile app)
- WhatsApp (Task 09)

### Success Criteria
- Desktop push works in Chrome, Firefox, Edge
- Users configure preferences per category
- Notifications delivered within 2 seconds
- High-frequency events batched

## Rules to Follow

1. **Opt-in Push**: Always request permission before enabling
2. **Respect Preferences**: Never send disabled notification types
3. **Idempotent Delivery**: No duplicate notifications for same event
4. **Graceful Degradation**: If push fails, fall back to in-app
5. **Rate Limit**: Max 10 push notifications per user per hour
6. **Template-Based**: All messages from templates, not hardcoded

---

### 5.1 Desktop Push Notifications (Web Push API)

**New files**:
- `lib/web-push.ts` — VAPID key management, push sending
- `public/sw.js` — Service worker for push events
- `components/shared/push-prompt.tsx` — Permission request UI
- `app/api/notifications/subscribe/route.ts` — Save push subscription

**Flow**:
1. User logs in → prompt for notification permission
2. On grant → register service worker → get subscription
3. POST subscription to API → save to `push_subscriptions` table
4. On notification event → send push via web-push library

**Dependencies**: `pnpm add web-push`

---

### 5.2 Real-Time Notification Bell

**Current**: Notification bell likely polls on page load only.

**Fix**: SSE endpoint or 30s polling:
- `app/api/notifications/stream/route.ts` — SSE endpoint
- Update `components/layout/notification-bell.tsx` to use EventSource
- Show unread count badge with pulse animation
- Desktop notification sound option

---

### 5.3 Integrate Novu (Optional — Based on User Approval)

**If approved**:
- `pnpm add @novu/node @novu/notification-center`
- `lib/novu.ts` — Novu client configuration
- Migrate all `sendNotification()` calls to use Novu triggers
- Configure Novu workflows for each event type

**Channels**:
- In-app (existing)
- Email (via Novu + Resend/SendGrid)
- Web Push (via our service worker)
- SMS (via Twilio provider in Novu)
- WhatsApp (via Composio or Novu)

---

### 5.4 Notification Events to Implement

| Event | In-App | Email | Push | SMS |
|-------|--------|-------|------|-----|
| Lead assigned | ✅ | ✅ | ✅ | ❌ |
| Lead converted | ✅ | ✅ | ✅ | ❌ |
| Deal stage change | ✅ | ❌ | ✅ | ❌ |
| SLA breach warning | ✅ | ✅ | ✅ | ✅ |
| Leave request | ✅ | ✅ | ❌ | ❌ |
| Leave approved/rejected | ✅ | ✅ | ✅ | ❌ |
| Expense approved | ✅ | ✅ | ❌ | ❌ |
| Payslip generated | ✅ | ✅ | ✅ | ❌ |
| Appraisal due | ✅ | ✅ | ✅ | ❌ |
| Holiday tomorrow | ✅ | ✅ | ✅ | ❌ |
| Document expiring | ✅ | ✅ | ❌ | ❌ |
| Chat message | ✅ | ❌ | ✅ | ❌ |
| Target achieved | ✅ | ✅ | ✅ | ❌ |
| Incentive approved | ✅ | ✅ | ❌ | ❌ |

---

### 5.5 Notification Preferences

**New table**: `notification_preferences`
```typescript
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  eventType: text("event_type").notNull(),
  inApp: boolean("in_app").default(true),
  email: boolean("email").default(true),
  push: boolean("push").default(true),
  sms: boolean("sms").default(false),
});
```

**UI**: Settings page → Notification Preferences matrix

---

## Checklist

- [ ] Generate VAPID keys, add to env
- [ ] Create service worker (`public/sw.js`)
- [ ] Create `usePushNotifications` hook
- [ ] Create push subscription API endpoint
- [ ] Create `lib/notifications/notification-service.ts` (unified sender)
- [ ] Create notification preferences tRPC router (CRUD)
- [ ] Build notification preferences page in Settings
- [ ] Upgrade NotificationBell component (real-time, filters, push status)
- [ ] Enhance notifications page with search/filter/bulk actions
- [ ] Add push notification opt-in prompt (non-intrusive)
- [ ] Implement notification batching via Inngest
- [ ] Add push notifications to all critical events (SLA, approvals, assignments)
- [ ] Add email notifications to all high-priority events
- [ ] Install `web-push` package
- [ ] `pnpm build` passes

## Acceptance Criteria

1. Desktop push notifications appear within 2 seconds
2. Users can toggle channels per category in settings
3. Push prompt appears once on first visit
4. Service worker registered and handles push events
5. High-frequency events batched (max 10 push/hour)
6. Notification page shows full history with filters

## Testing Plan

1. Enable push, trigger lead assignment, verify desktop notification
2. Disable email for "Deal Updates", close deal, verify no email
3. Send 20 chat messages while away, verify batched notification
4. Close browser tab, trigger push from API, verify notification shows
5. Test push in Chrome, Firefox, Edge
6. Verify preferences persist and apply correctly
