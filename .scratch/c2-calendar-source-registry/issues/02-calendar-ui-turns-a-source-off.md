# 02 — The calendar shows me which sources are on and lets me change them

**What to build:** On the unified calendar, a person sees the sources feeding their view, each labelled by what it is rather than by which module owns it, and can turn any of them off. The change takes effect immediately and is still in place the next time they open the calendar on any device.

**Blocked by:** 01 — Turning a calendar source off keeps it off.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The source list renders from the server's toggle list, never from a hard-coded list of modules.
- [ ] Toggling a source updates the calendar without a full reload and without replacing the page with a loading screen.
- [ ] The control is gated on the same permission the endpoint enforces, and no request fires for a person who cannot use it.
- [ ] A source that failed to load is surfaced as a partial result naming what is missing, rather than silently showing fewer events.
- [ ] Loading, empty and error states are implemented and fill their available height.
- [ ] Works at 375, 768 and 1280; below the mobile breakpoint the panel is a drawer rather than a popover.
- [ ] No raw identifiers are rendered — sources show their labels.

## Todo

- [ ] Add the query hook and mutation against the endpoints from ticket 01, with a calibrated stale time and a mutation key
- [ ] Invalidate the calendar query by true key prefix on toggle
- [ ] Pick the lowest overlay rung that fits rather than defaulting to a sheet
- [ ] Render the partial-failure case using the registry's failure list
- [ ] Check the three breakpoints and the drawer swap
- [ ] Confirm the frontend tests actually compile and run — a clean typecheck does not prove it
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
