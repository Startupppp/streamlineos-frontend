# Task 05: Notification System Overhaul

## Priority: 🟠 HIGH

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

**Acceptance Criteria**:
- Desktop push notifications work in Chrome/Firefox/Edge
- Notification bell shows real-time unread count
- Users can configure notification preferences
- Service worker registered and active
