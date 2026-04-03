# Task 08: Calendar & Events Module

## Priority: MEDIUM | Effort: 3-4 days | Dependencies: Task 02 (DB - calendar_events table) | Status: NOT STARTED

---

## PRD

### Problem Statement
There is no dedicated calendar page that aggregates events across all modules:
1. Lead follow-ups, deal deadlines, leave dates, holidays, project deadlines all exist in separate tables
2. No unified view of upcoming events
3. No event creation/editing from calendar
4. No drag-and-drop rescheduling
5. Calendar component exists (`react-day-picker`) but only for date input, not event management

### Goals
- Build unified calendar page aggregating events from all modules
- Support month/week/day views with FullCalendar
- Color-code events by category
- Enable drag-and-drop rescheduling
- Show event details in side panel
- Support custom event creation

### Non-Goals
- Google Calendar sync (future - Task 09 AI/Composio)
- Recurring event rules engine (basic only)
- Resource scheduling (room booking etc.)

### Success Criteria
- Calendar renders with events from all modules
- Events color-coded by category
- Drag-and-drop changes event dates
- Side panel shows full event details
- Month/week/day views available

---

## Implementation Steps

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

---

## Rules to Follow

1. **Lazy Load FullCalendar**: Use dynamic import (large library)
2. **Server-Side Event Fetching**: Fetch events in server component, pass to client
3. **Aggregate in One Query**: Single API call returns events from all sources
4. **Optimistic Updates**: Drag-and-drop updates optimistically, reverts on error
5. **Respect RBAC**: Only show events user has permission to see

---

## Checklist

- [ ] Install FullCalendar packages
- [ ] Create `calendar_events` table (from Task 02)
- [ ] Create `calendar` tRPC router with getEvents, createEvent, updateEvent, deleteEvent
- [ ] Build calendar page as server component
- [ ] Build `CalendarView` client component with FullCalendar
- [ ] Build `EventSidebar` for event detail/editing
- [ ] Build `CreateEventDialog` form
- [ ] Aggregate events from: holidays, leaves, leads, deals, projects
- [ ] Color-code events by category
- [ ] Implement drag-and-drop rescheduling
- [ ] Add month/week/day view toggle
- [ ] Add loading/error/empty states
- [ ] Add calendar link to sidebar navigation
- [ ] `pnpm build` passes

## Acceptance Criteria

1. Calendar renders with events from all modules
2. Color-coded by category
3. Side panel shows full event details
4. Drag-and-drop changes event dates (with optimistic update)
5. Create/edit/delete custom events
6. Month/week/day views available
7. Only shows events user has permission to see

## Testing Plan

1. **Rendering**: Verify events from all sources appear on correct dates
2. **Drag-Drop**: Drag an event to new date, verify DB updated
3. **CRUD**: Create, edit, delete a custom event
4. **RBAC**: Login as sales user, verify HR events not visible
5. **Views**: Switch between month/week/day, verify correct rendering
