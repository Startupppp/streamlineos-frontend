# Frontend Notification Center

## Goal
Build a clean notification inbox that feels premium, fast, and easy. It should not look like a raw table.

## Routes
- `/notifications`
- `/notifications/preferences`
- `/notifications/templates`
- `/notifications/queue`
- `/notifications/analytics`
- `/notifications/audit`
- `/notifications/broadcasts`
- `/notifications/admin/events`
- `/notifications/admin/providers`

## Notification Bell
Requirements:
- Live unread count.
- Dropdown preview of latest unread notifications.
- Empty state.
- Mark all read.
- View all.
- High/critical visual treatment.
- Does not block navigation.

## Notification Center Layout
Recommended layout:
- Left rail: sections and saved filters.
- Main pane: notification list.
- Right detail drawer: selected notification.

Sections:
- All
- Unread
- Mentions
- Assigned to me
- Approvals
- Broadcasts
- Snoozed
- Pinned
- Archived
- System

## Notification Card
Each card shows:
- Icon by category/source module
- Title
- Message preview
- Source module
- Priority
- Time
- Read/unread state
- Pin/snooze/archive quick actions
- Primary action button if actionable

## Detail Drawer
Shows:
- Full title/message
- Metadata
- Why did I get this?
- Delivery channels used
- Read/action status
- Entity link
- Action buttons
- Audit mini timeline

## Filters
Filters:
- Category
- Module
- Priority
- Channel
- Date range
- Read status
- Assigned/mention/approval
- Search

## Bulk Actions
- Select all visible
- Mark read
- Mark unread
- Archive
- Pin
- Snooze
- Delete

## Toasts
Use toasts only for:
- High priority events
- Critical events
- Direct mentions
- Approval requests
- User-triggered confirmation

Avoid toast spam for normal low-value updates.

## Empty States
Empty states must be helpful:
- "No unread notifications"
- "No approvals waiting"
- "No archived notifications"

Do not use marketing hero style.

## Responsive Requirements
Desktop:
- Three-column layout supported.

Tablet:
- Left rail collapses.
- Detail opens as drawer.

Mobile:
- Single-column list.
- Filters in sheet.
- Detail full screen.

## Accessibility
- Keyboard navigation.
- Screen-reader labels.
- Focus state.
- Color is not the only priority indicator.
- Bulk actions reachable by keyboard.

## Acceptance Criteria
- User can process 50 notifications quickly.
- No layout shift on hover/action.
- Notification count updates live.
- User can understand why a notification exists.
- Mobile view has no overlapping text/actions.
