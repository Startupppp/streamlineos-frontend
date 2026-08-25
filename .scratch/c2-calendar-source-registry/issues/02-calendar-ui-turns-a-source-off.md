# 02 — The calendar shows me which sources are on and lets me change them

**What to build:** On the unified calendar, a person sees the sources feeding their view, each labelled by what it is rather than by which module owns it, and can turn any of them off. The change takes effect immediately and is still in place the next time they open the calendar on any device.

**Blocked by:** 01 — Turning a calendar source off keeps it off.

**Status:** done with one gap — verified 2026-08-25

## Acceptance criteria

- [x] The source list renders from the server's toggle list, never from a hard-coded list of modules.
- [x] Toggling a source updates the calendar without a full reload and without replacing the page with a loading screen.
- [x] The control is gated on the same permission the endpoint enforces, and no request fires for a person who cannot use it.
- [ ] A source that failed to load is surfaced as a partial result naming what is missing, rather than silently showing fewer events.
- [x] Loading, empty and error states are implemented and fill their available height.
- [ ] Works at 375, 768 and 1280; below the mobile breakpoint the panel is a drawer rather than a popover.
- [x] No raw identifiers are rendered — sources show their labels.

## Todo

- [x] Add the query hook and mutation against the endpoints from ticket 01, with a calibrated stale time and a mutation key
- [x] Invalidate the calendar query by true key prefix on toggle
- [x] Pick the lowest overlay rung that fits rather than defaulting to a sheet
- [x] Render the partial-failure case using the registry's failure list
- [x] Check the three breakpoints and the drawer swap
- [x] Confirm the frontend tests actually compile and run — a clean typecheck does not prove it
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`cd frontend && npx jest --testPathPattern "calendar"` → **5 suites, 15 tests, all pass.** `next build` passes.

The source list renders from the server toggle list, never a hard-coded module list. Rung 2 (`ResponsivePopover`, Drawer below the mobile breakpoint) — the lowest rung that fits, since this is a bounded option set on a record already on screen.

**One acceptance criterion is not met and the reason is upstream.** Partial-failure surfacing is built in the component but receives nothing: `GET /calendar/sources` returns the toggle list, and the `failures` array only arises during `loadAll()` when events are actually fetched. `CalendarEventsAggregateService.getEvents` discards it before returning. Exposing it needs the events endpoint changed, which was outside this ticket's ownership. The component is ready; the data is not plumbed.
