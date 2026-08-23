# PRD — A module contributes calendar events through an interface

Status: **ready**
Date: 2026-08-23
Stream: S
Source: architecture review 2026-08-23, candidate 2

## Problem

The product model says the unified calendar at `/calendar` serves everyone and that module events — holidays, leaves, birthdays, interviews, review cycles, training, travel — are toggleable **sources**.

There is no source concept in the code. `CalendarEventSourceLoader` imports sixteen tables from five modules at the top of one file (`calendar-event-source.loader.ts:13–33`), queries them in one `Promise.all`, and `CalendarModule` imports `AttendancePolicyModule` so its HR dependency is a compile-time fact. Toggling is an `if` branch in a fan-out that is already the largest function in the module.

The dependency runs the wrong way. Calendar knows HR, hiring, Build, tasks and rostering; none of them knows Calendar. Every new source widens the loader, adds an import to the module, and makes the calendar's test setup larger. CRM follow-ups, survey deadlines and training sessions are all queued behind that.

## Solution

Invert it. Define what a source is; let each module bring one.

```
CalendarEventSource {
  key: string
  label: string
  module: ModuleKey
  load(ctx: { orgId, userId, range, scope }): Promise<CalendarEventProjection[]>
}
```

Sources register against a registry token. The loader becomes a dispatcher: it asks the registry which sources the caller has enabled and awaits them. It imports no domain table.

## Goals

- A module contributes events without the calendar module knowing its name.
- The toggle list is derived from registered sources, so a source that exists is a source you can turn off.
- Adding a source is one adapter in the owning module plus a registration.
- Each source is testable on its own, without constructing the whole calendar.

## Non-Goals

- Changing what the calendar renders, or any event shape the frontend already consumes.
- Adding new sources. Migration first; birthdays and review cycles come after.
- Touching external calendar sync (`external-calendar-sync.service.ts`), which is a different seam.
- Making the calendar module-gated. `/calendar` stays universal; a member's own calendar is platform core.

## Implementation decisions

**One projection type.** Every source returns the same `CalendarEventProjection`. Sources that need module-specific payload carry it in a typed `meta`, never by widening the shared type.

**The source declares its module; the registry applies availability.** A source whose module is unavailable to the caller is not asked. That check goes through `moduleAvailability` (stream R) once it exists, and through `isModuleEnabled` until then — noted so the two do not fork.

**Access stays with the source.** Each source filters by the caller's own access using its module's existing rules — leaves by the requester and their approver chain, tickets by project membership, interviews by panel membership. The registry never sees a row it then has to filter, because a source that returns rows the caller may not see has already lost.

**Registration is per-module, in the owning module's own file.** `HrCalendarSource` lives in `hr/`, not in `calendar/`. This is the whole point; a registry whose adapters all live in the consumer is the same fan-out with more files.

**Failure is per-source.** One source failing degrades that source, not the calendar. The loader collects results with `Promise.allSettled` and reports which sources failed, so a broken HR query does not blank the month.

**Migration is source by source, behind the same output.** Each ticket moves one category and asserts the events it produces are identical to today's for the same input.

## Testing decisions

The property: **for a fixed org, user and range, the registry-driven calendar returns the same events as the current loader.** That equality is what makes the migration safe, and it is asserted per source as each moves, not once at the end.

Per source: it returns nothing when its module is unavailable; it returns only rows the caller may see; a thrown error degrades that source alone and the others still return.

`calendar.controller.spec.ts` and `calendar.controller.e2e-spec.ts` are the regression net and should not need editing — if they do, the response shape changed, which is out of scope.

Mutation check: unregister a source and its events disappear from the aggregate while the rest remain.

## Out of scope

- New event sources.
- The 313-line aggregate's own pagination and range handling, beyond what the split requires.
- Calendar write paths. This is about what the calendar reads.
