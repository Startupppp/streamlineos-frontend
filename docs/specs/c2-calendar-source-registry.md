# c2 · Give the calendar a source seam

**Status: shipped.** Verified at source 2026-08-25. `CalendarEventSource` is a real interface (`calendar/calendar-event-source.ts`); `CalendarSourceRegistry` dispatches over registered adapters; each owning module registers its own (`hr/hr-calendar.module.ts` → `HrCalendarSource`); `calendar.module.ts` no longer imports `AttendancePolicyModule` or any other module's tables; `CalendarEventSourceLoader` is reduced to native calendar events plus linked-ticket enrichment. This PRD records what shipped, the two things the implementation got right that the review did not ask for, and the one product promise still unmet.

## Problem Statement

The product model says module events — holidays, leaves, birthdays, review cycles, training, travel, interviews — are toggleable **sources** on one unified calendar. The code had no source concept: one loader imported 16 tables from 5 modules and branched per source inside a single fan-out, so "toggleable" was a wish and a sixth source meant widening the loader again. Calendar depended on HR, Hiring, Build, Tasks and Roster; the dependency arrow pointed the wrong way.

**What is still unmet:** the registry now returns a `toggleList` — every registered source's key, label and owning module — but nothing yet *persists a person's choice*. A user cannot turn a source off. The product rule ("module events are toggleable SOURCES from backend aggregates") is half delivered: the sources are real and the list is served; the toggle is not stored, so every enabled source's events arrive on every request.

## Solution

The registry already emits the toggle list. Add the missing half: a per-person, per-organisation preference for which sources are on, applied inside `loadAll` so a disabled source is never loaded rather than loaded and filtered. Because the source key is the stable identifier the registry already publishes, the preference is a set of keys — no new coupling to any module.

## User Stories

1. As a person who does not run interviews, I want to turn the interviews source off, so that my calendar shows the work I actually do.
2. As a person with many sources enabled, I want my choice to persist across sessions and devices, so that I do not re-toggle every morning.
3. As a person, I want a source I turned off to cost nothing, so that hiding events also makes my calendar faster.
4. As a person, I want a newly added source to arrive **on** by default, so that a module I just enabled shows up without me hunting for a switch.
5. As a person, I want my toggles to be mine, so that another person in my organisation is unaffected by what I hide.
6. As a person denied a module, I want its source to be absent from the toggle list entirely, so that I am not offered a switch for something I cannot see.
7. As a person whose organisation disabled a module, I want the same, so that the toggle list reflects availability rather than the full catalogue.
8. As a developer adding a sixth source, I want to implement one interface and register it, so that the calendar never learns my module's name.
9. As a developer, I want a failing source to degrade the calendar rather than break it, so that one module's outage does not blank everyone's month.
10. As a developer, I want to know *which* source failed, so that a partial result is diagnosable.
11. As an operator, I want source loading to stay concurrent, so that adding sources does not add latency linearly.
12. As a security reviewer, I want each source to filter by the asker's access itself, so that the registry never has to know any module's authorization rules.

## Implementation Decisions

**Already shipped — recorded so the next change does not undo them**

- **`CalendarEventSource`** is `{ key, label, module, load(ctx) }`, returning a `CalendarEventProjection[]`. Access filtering is explicitly the source's responsibility; the registry never filters rows it receives. That is the correct division: only the owning module knows its own visibility rules.
- **Availability is checked per source with `moduleAvailability`, not `isModuleEnabled`.** The code carries a comment explaining why: `isModuleEnabled` takes no `userId`, so a person individually denied a module still received its events. This is a real bug the implementation caught and the review did not name.
- **Failure is isolated with `Promise.allSettled`** and reported as `failures: [{ key, error }]`, so one source throwing does not lose the other five. Also not in the review.
- **`toggleList` is emitted from the registry** — the product's "toggleable sources" vocabulary reaching the API surface.
- **Dependency direction is inverted.** `CalendarModule` imports only `IntegrationsModule`. Owning modules import the calendar's interface and register themselves.

**Remaining work — the toggle**

- **Preference storage is a normalized table**, per `(org_id, user_id, source_key, enabled)` — not a JSONB array on a user row. Root constitution §3: lifecycle rows get a table with `org_id`, indexes and their own lifecycle.
- **Absence means enabled.** A source with no row is on. This makes story 4 free and keeps the table small: only deliberate opt-outs are stored.
- **The filter is applied before `load`**, inside `loadAll`, immediately after the availability filter. A disabled source is never called, so story 3 is satisfied by construction rather than by discarding rows.
- **The toggle list is the availability-filtered list.** A source the person cannot see is not offered a switch — stories 6 and 7 fall out of ordering the filters correctly, not from a second check.
- **Unknown keys are ignored, not rejected.** A stored preference for a source that has since been removed is dead data, not a 400.

## Testing Decisions

**What makes a good test here.** Drive the registry with fake sources. The whole point of the interface is that the registry does not know what a source is; a test that registers a real `HrCalendarSource` is testing HR, not the registry. Prior art already exists in this shape: `calendar-source.registry.spec.ts` and `calendar-source-registration.spec.ts`.

- `calendar-source.registry.spec.ts` — a disabled source is never invoked (assert `load` was not called, not that its events are absent; the difference is story 3). An absent preference means enabled. A preference for an unknown key is ignored. The toggle list contains only available sources.
- **Availability ordering** — a person denied a module gets neither its events nor its toggle entry. This is the bug the implementation already fixed; pin it so it stays fixed.
- **Failure isolation** — with three sources where one rejects, the result carries the other two's events and one `failures` entry naming the failed key.
- `calendar-source-registration.spec.ts` — every module that owns calendar-visible events registers exactly one source, and no two sources share a key. This is the test that makes "a sixth source registers itself" enforceable rather than aspirational.
- `calendar.controller.e2e-spec.ts` covers the route's auth and RBAC. It runs only under `pnpm test:e2e`.

## Out of Scope

- External calendar sync (`external-calendar-sync.service.ts`, `external-event-normalizers.ts`) — a different ingestion path with its own normalizers.
- Any module-specific calendar page. The product rule is one calendar at `/calendar`; this candidate exists to make that rule implementable, not to add surfaces.
- Changing what any source returns. Sources are correct; only the dispatch layer is in question.

## Further Notes

- **This is the cleanest of the nine.** The implementation is strictly better than the review's proposal: the review asked for a registry, and what shipped is a registry plus per-user availability filtering plus failure isolation. Both additions are things the review would have raised had it read one level deeper.
- **The comment in `loadAll` is load-bearing documentation.** It records why `moduleAvailability` and not `isModuleEnabled` — a distinction that reads as a needless indirection to anyone who does not know that `user_module_access` denies exist. Do not "simplify" it away.
- **The registry depends on `moduleAvailability`,** which is candidate 4's seam. Two of that seam's three other callers currently feed it a stubbed plan-locked list; the registry feeds it the real one. If c4's residue is fixed, this call site is already correct and needs no change.
