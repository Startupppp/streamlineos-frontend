# S02 — Sources move to their owning modules

**What to build:** Each event category becomes an adapter in the module that owns its data, and the loader stops importing anyone's tables.

`CalendarEventSourceLoader` imports `leaveRequests`, `interviews`, `tasks`, `tickets`, `projects`, `attendance`, `wfhRequests`, `rosterEntries`, `rosters`, `organizations`, `organizationMembers`, `eventAttendees`, `interviewPanelMembers` and more, at the top of one file. `CalendarModule` imports `AttendancePolicyModule`.

After this, the calendar knows only the interface. HR owns leaves, attendance and WFH; hiring owns interviews; Build owns tickets and projects; tasks owns tasks; the calendar owns its own native events and holidays.

**The equality is what makes this safe:** for a fixed org, user and range, the registry-driven calendar returns the same events as today — asserted per source as each moves, not once at the end.

**Owns (exclusive):**
- `backend/src/modules/calendar/calendar-event-source.loader.ts`
- `backend/src/modules/calendar/calendar-events-aggregate.service.ts`
- `backend/src/modules/hr/**/hr-calendar-source.ts` (new)
- `backend/src/modules/build/**/build-calendar-source.ts` (new)
- `backend/src/modules/tasks/**/tasks-calendar-source.ts` (new)
- the spec files for each of the above

**Blocked by:** S01
**Wave:** 2
**Status:** ready-for-agent

- [ ] An adapter lives in the module that owns its data. **`HrCalendarSource` is in `hr/`, not in `calendar/`** — a registry whose adapters all live in the consumer is the same fan-out with more files, and is a failed version of this ticket.
- [ ] `calendar-event-source.loader.ts` imports no domain table. If any import remains, name it and why.
- [ ] `calendar.module.ts` no longer imports `AttendancePolicyModule`.
- [ ] Each source filters by the caller's own access using its module's existing rules — leaves by requester and approver chain, tickets by project membership, interviews by panel membership. Do not invent new rules here; reuse what the module's own read path enforces.
- [ ] **Per source, a test asserts identical output to the current loader for the same org, user and range.** Migrate one category at a time and land each with its equality test.
- [ ] A test asserts each source returns nothing when its module is unavailable.
- [ ] A test asserts each source returns only rows the caller may see.
- [ ] `calendar.controller.spec.ts` and `calendar.controller.e2e-spec.ts` pass **unchanged**. If they need editing, the response shape changed, which is out of scope — stop and say so.
- [ ] `pnpm test:e2e` is run explicitly for the calendar controller spec. `*e2e-spec` files are excluded from the default run.
- [ ] No new event sources. Birthdays, review cycles and CRM follow-ups come after, and are cheap once this lands — that is the point.
- [ ] `madge --circular` clean on the backend.
- [ ] `tsc --noEmit` exit 0.
- [ ] **Name any `app.module.ts` line you could not write.** New source providers must be wired or they do not exist at runtime.
- [ ] Anything provable only by running the app is left unticked and says so.
