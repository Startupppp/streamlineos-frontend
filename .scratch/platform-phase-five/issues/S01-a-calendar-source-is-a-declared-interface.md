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

- [x] `CalendarEventSource` declares `key`, `label`, `module` and `load(ctx)`. `ctx` carries `orgId`, `userId`, the date range and the caller's scope — everything a source needs, so none reaches for request state. — calendar-event-source.ts:3-28.
- [x] One `CalendarEventProjection` type serves every source. Module-specific payload goes in a typed `meta`, never by widening the shared type. — `CalendarEventProjection<TMeta>` generic at calendar-event-source.ts:11-20.
- [ ] Sources register against an injection token, so a module contributes one without the calendar naming it. — SUPERSEDED: the concurrent session replaced the injection-token approach with `CalendarSourceRegistry.register(source)` self-registration called from `OnModuleInit`; sources push themselves in rather than being pulled by a token array.
- [ ] The registry asks a source only when its module is available to the caller. Use `moduleAvailability` if R01 has landed, `isModuleEnabled` otherwise — **and say which**, so the two do not fork. — Functionally the registry skips unavailable sources (calendar-source.registry.ts:25-32), but it calls `isModuleEnabled` (line 28), not `moduleAvailability`, even though R01 has landed. User-level denies (`user_module_access`) are therefore not honoured: a denied user still gets HR sources loaded. No "say which" comment in the file.
- [x] The registry collects with `Promise.allSettled`. One failing source degrades that source and reports it; the month still renders. — calendar-source.registry.ts:35.
- [x] A source that returns rows the caller may not see has already lost — **access filtering belongs inside the source**, using its own module's rules. The registry never filters rows it is handed. State this on the interface. — calendar-event-source.ts:26 comment: "Access filtering is the source's responsibility; the registry never filters the rows it receives."
- [x] The toggle list is derived from registered sources, so a source that exists is a source you can turn off. — calendar-source.registry.ts:23: `toggleList = sources.map(...)` includes all registered sources.
- [x] A test registers two fake sources and asserts both are asked, results merge, and the toggle list names both. — calendar-source.registry.spec.ts:46-58.
- [x] A test asserts a source whose module is unavailable is **not asked** — not called and then discarded. — calendar-source.registry.spec.ts:60-71.
- [x] A test asserts a thrown source is isolated: the other still returns and the failure is reported. **This is the mutation check** — swap `allSettled` for `all` and it fails. — calendar-source.registry.spec.ts:73-89; swapping `allSettled` for `all` would cause the entire `loadAll` call to reject, failing `result.events.length === 1`.
- [x] `calendar.module.ts` gains the registry. **Name the `app.module.ts` line you could not write, if any** — the orchestrator owns that file, and an unregistered provider compiles green and does not exist at runtime. — calendar.module.ts:18-20 registers and exports `CalendarSourceRegistry`; source modules that import `CalendarModule` (HrCalendarModule, BuildCalendarModule, TasksModule) inherit it; no direct app.module.ts edit was required.
- [x] Nothing in `calendar-event-source.loader.ts` or `calendar-events-aggregate.service.ts` changes. S02 owns those. — these files were modified by S02 (not S01); current state is consistent with S01 not having touched them.
- [x] `madge --circular` clean — a registry that modules register into is the classic place to introduce a cycle. `forwardRef` hides a cycle; it does not remove one, and is banned in new code. — madge reports zero circular dependencies across 3403 files.
- [x] `tsc --noEmit` exit 0. — zero errors.
