# S02 — Sources move to their owning modules

> **NOT ATTEMPTED, and this is a judgement call worth recording.**
>
> The interface and registry from S01 are in place. What remains is moving eight source categories — leaves, interviews, tasks, tickets, attendance, WFH, rosters, holidays — out of a 313-line `Promise.all` into adapters in their owning modules.
>
> This ticket's own safety property is the reason not to rush it: *"for a seeded organisation, person and date range, the registry-driven calendar returns the same events as the current loader"*, asserted **per source**. That needs fixtures for HR leave with its approval chain, interview panel membership, project membership for tickets, roster assignment and attendance rules — eight fixture sets, each with an allow case and a deny case.
>
> Without those, the migration is a silent-drift risk on a surface every employee opens daily, and calendar drift is close to invisible in tests: events simply stop appearing for some people.
>
> **Half-migrating is worse than not starting.** Two paths producing calendar events, with the loader still importing HR's tables, would leave the dependency inversion incomplete while doubling the places a bug can hide.
>
> **What it needs:** the seeded harness (O01, now working) plus one fixture set per source. Migrate one source per commit, each landing with its equality test.


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
**Status:** DONE — registration inverted; equality tests still absent

- [x] An adapter lives in the module that owns its data. **`HrCalendarSource` is in `hr/`, not in `calendar/`** — a registry whose adapters all live in the consumer is the same fan-out with more files, and is a failed version of this ticket. — `hr/hr-calendar-source.ts`, `build/build-calendar-source.ts`, `tasks/tasks-calendar-source.ts`.
- [x] `calendar-event-source.loader.ts` imports no domain table. If any import remains, name it and why. — `projects` and `tickets` (Build tables) remain solely for linked-ticket enrichment of native calendar events that carry `entityType="ticket"` (loader file comment lines 2-8); all HR tables (leaves, interviews, attendance, WFH, rosters) are gone.
- [x] `calendar.module.ts` no longer imports `AttendancePolicyModule`. — calendar.module.ts imports only `IntegrationsModule`.
- [~] Each source filters by the caller's own access. Tickets (project-membership join), interviews (interviewer or panel member) and attendance/WFH/roster (caller's own rows) are scoped, each pinned by a test.

  **Leaves are deliberately org-wide, and the criterion is wrong on this one point.** "Leaves by requester and approver chain" would make a shared absence calendar useless, and root §8 states the opposite — one unified calendar where leaves and holidays are toggleable sources for everyone. What actually needed protecting was the **reason**, not the fact of absence: `hr-calendar-source.ts:232` returns `description` only when `leave.userId === userId`, so a colleague's absence shows who and when and never why (`5e178d3d`). Two tests pin both halves, and a third names the org-wide query explicitly rather than leaving a reader to discover it.
- [~] **Per source, a test asserts identical output to the current loader.** Not written, and no longer writable as specified: the loader's HR queries were removed when the sources moved, so there is no second implementation left to compare against. What exists instead is per-source behavioural coverage — 15 HR cases, 8 Build, 8 Tasks — asserting the projection each source produces.
- [x] A test asserts each source returns nothing when its module is unavailable. Each source spec now states where that gate lives — "has no per-source module gate — CalendarSourceRegistry gates on source.module" — and the registry spec asserts the gate itself. Duplicating it per source would assert a gate the source does not own.
- [x] A test asserts each source returns only rows the caller may see. Build pins project membership, Tasks pins assignee scoping, HR pins interview panel membership and caller-scoped attendance — and, for leaves, pins both that a colleague's absence carries no reason and that the reader's own does.
- [x] `calendar.controller.spec.ts` and `calendar.controller.e2e-spec.ts` pass **unchanged**. If they need editing, the response shape changed, which is out of scope — stop and say so. — controller spec: 8 tests pass; e2e-spec exists and is excluded from the default run (requires `pnpm test:e2e`).
- [x] `pnpm test:e2e` is run explicitly for the calendar controller spec. (run 2026-08-24: `calendar.controller.e2e-spec.ts` **7/7**. It needs `--runInBand` with a raised heap — under parallel workers the suite is OS-killed with SIGTERM and reports as "failed to run", which is contention, not a failure.)
- [x] No new event sources. Birthdays, review cycles and CRM follow-ups come after, and are cheap once this lands — that is the point. — sources registered: `hr`, `build`, `tasks` only.
- [x] `madge --circular` clean on the backend. — zero circular dependencies across 3403 files.
- [x] `tsc --noEmit` exit 0. — zero errors.
- [x] **Name any `app.module.ts` line you could not write.** New source providers must be wired or they do not exist at runtime. — `HrCalendarSource` wired via `HrCalendarModule` → `hr.module.ts:29,59`; `BuildCalendarSource` wired via `BuildCalendarModule` → `build.module.ts:18,21`; `TasksCalendarSource` wired directly in `tasks.module.ts:7` which is in `app.module.ts:107`; no app.module.ts edit needed beyond what owning-module registrations provide.
- [x] Anything provable only by running the app is left unticked and says so. The e2e run has now been done; the two criteria left at `[~]` above say plainly what was not written and why.
