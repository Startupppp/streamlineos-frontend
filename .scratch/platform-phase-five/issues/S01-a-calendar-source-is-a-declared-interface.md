# S01 — A calendar source is a declared interface

**What to build:** `CalendarEventSource` and a registry, so a module can contribute events without the calendar importing its tables.

The product model says module events are toggleable **sources**. There is no source concept in the code: `CalendarEventSourceLoader` imports sixteen tables from five modules and queries them in one `Promise.all`, and `CalendarModule` imports `AttendancePolicyModule`, making the HR dependency a compile-time fact.

This ticket builds the seam and moves nothing. S02 migrates the sources.

**Owns (exclusive):**
- `backend/src/modules/calendar/calendar-event-source.ts` (new)
- `backend/src/modules/calendar/calendar-source.registry.ts` (new)
- `backend/src/modules/calendar/calendar-source.registry.spec.ts` (new)
- `backend/src/modules/calendar/calendar.module.ts`

**Blocked by:** nothing
**Wave:** 1
**Status:** ready-for-agent

- [ ] `CalendarEventSource` declares `key`, `label`, `module` and `load(ctx)`. `ctx` carries `orgId`, `userId`, the date range and the caller's scope — everything a source needs, so none reaches for request state.
- [ ] One `CalendarEventProjection` type serves every source. Module-specific payload goes in a typed `meta`, never by widening the shared type.
- [ ] Sources register against an injection token, so a module contributes one without the calendar naming it.
- [ ] The registry asks a source only when its module is available to the caller. Use `moduleAvailability` if R01 has landed, `isModuleEnabled` otherwise — **and say which**, so the two do not fork.
- [ ] The registry collects with `Promise.allSettled`. One failing source degrades that source and reports it; the month still renders.
- [ ] A source that returns rows the caller may not see has already lost — **access filtering belongs inside the source**, using its own module's rules. The registry never filters rows it is handed. State this on the interface.
- [ ] The toggle list is derived from registered sources, so a source that exists is a source you can turn off.
- [ ] A test registers two fake sources and asserts both are asked, results merge, and the toggle list names both.
- [ ] A test asserts a source whose module is unavailable is **not asked** — not called and then discarded.
- [ ] A test asserts a thrown source is isolated: the other still returns and the failure is reported. **This is the mutation check** — swap `allSettled` for `all` and it fails.
- [ ] `calendar.module.ts` gains the registry. **Name the `app.module.ts` line you could not write, if any** — the orchestrator owns that file, and an unregistered provider compiles green and does not exist at runtime.
- [ ] Nothing in `calendar-event-source.loader.ts` or `calendar-events-aggregate.service.ts` changes. S02 owns those.
- [ ] `madge --circular` clean — a registry that modules register into is the classic place to introduce a cycle. `forwardRef` hides a cycle; it does not remove one, and is banned in new code.
- [ ] `tsc --noEmit` exit 0.
