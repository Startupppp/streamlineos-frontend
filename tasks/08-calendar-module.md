# Task 08: Calendar & Events Module

## Priority: 🟡 MEDIUM

### 8.1 Calendar Page

**New files**:
- `app/(dashboard)/calendar/page.tsx` — Server component, fetches events
- `app/(dashboard)/calendar/loading.tsx` — Skeleton
- `app/(dashboard)/calendar/error.tsx` — Error boundary
- `components/features/calendar/calendar-view.tsx` — FullCalendar wrapper (client)
- `components/features/calendar/event-sidebar.tsx` — Event detail side panel
- `components/features/calendar/create-event-dialog.tsx` — New event form

**Dependencies**: `pnpm add @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/react`

### 8.2 Event Sources

Aggregate events from:
- Holidays (existing `holidays` table)
- Leave requests (approved)
- Lead follow-up dates (from `leadActivities` + `leadTasks`)
- Deal expected close dates
- Project deadlines (ticket due dates)
- Performance review periods
- Custom events (`calendarEvents` table — Task 02)

### 8.3 Color Coding

```
Leave:        🟢 Green
Holiday:      🔵 Blue
Meeting:      🟣 Purple
Deadline:     🔴 Red
Follow-up:    🟡 Gold
Appraisal:    🟠 Orange
Custom:       ⚪ User-defined
```

### 8.4 Event CRUD via tRPC

```
server/api/routers/calendar.ts
- calendar.getEvents (with date range filter)
- calendar.createEvent (server action)
- calendar.updateEvent (server action, includes drag-and-drop)
- calendar.deleteEvent (server action)
```

**Acceptance Criteria**:
- Calendar renders with all event sources
- Color-coded by category
- Side panel shows full event details
- Drag-and-drop to reschedule
- Create/edit/delete events
- Month/week/day views
