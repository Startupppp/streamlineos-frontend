# Spec — A module contributes calendar events through an interface

Status: **ready-for-agent**
Date: 2026-08-23
Stream: S · Tickets S01, S02
Testing prerequisite: `2026-08-23-seeded-e2e-harness-prd.md`

## Problem Statement

The product promises one calendar for everyone, with each kind of event — holidays, leave, interviews, shifts, deadlines — as a source you can switch on or off. That promise is not what the calendar is.

There is no such thing as a source. The calendar reaches directly into leave records, interviews, tasks, tickets, projects, attendance, working-from-home requests and shift rosters, all in one place, and decides what to show with a series of conditions. Switching a kind of event on or off is a branch in that code rather than a thing you can pick.

For someone using the calendar this shows up as absences. Birthdays are not there. Review cycles are not there. Training and travel are not there. CRM follow-ups are not there. Each is not a small addition but a change to the one piece of code that already knows about eight other things, so each is expensive and each makes the next one more expensive.

For someone running the company it shows up as a calendar that is not the calendar. People keep a second one elsewhere for the things this one does not carry, which defeats the point of having one.

There is a structural version of the same problem. The calendar depends on HR, on hiring, on project delivery and on rostering. None of them depends on the calendar. Every team that wants to put something on the shared calendar has to change a file owned by the calendar, and the calendar's own tests get larger every time anyone does.

## Solution

Turn the relationship around. Define what a calendar source is; let each part of the product bring one.

A source says what it is called, which module it belongs to, and how to fetch its events for a person and a date range. The calendar knows only that shape. It asks every source the person has switched on, merges the results and returns them.

HR brings leave, attendance and working-from-home. Hiring brings interviews. Delivery brings ticket and project dates. The calendar brings its own events and holidays. Nobody's tables are imported by the calendar.

Switching a source on or off becomes real, because the list of sources is the list of things registered rather than a set of conditions someone wrote. And the missing kinds of events become cheap: a birthday source is one small piece of code in the part of the product that knows about birthdays.

## User Stories

1. As an employee, I want one calendar that shows everything relevant to me, so that I do not keep a second calendar elsewhere.
2. As an employee, I want to switch a kind of event off, so that I can reduce noise without losing it permanently.
3. As an employee, I want my switches remembered, so that I set them once.
4. As an employee, I want my own leave and shifts on my calendar without any special permission, so that my own working life is always visible to me.
5. As an employee, I want to see colleagues' approved absences, so that I can plan around them.
6. As an employee, I want not to see the reason for someone's absence, so that privacy is preserved while availability is shared.
7. As an employee, I want company holidays on my calendar, so that I do not plan work on a closed day.
8. As an employee, I want my interview panels on my calendar, so that I do not miss one.
9. As an employee, I want interviews I am not on kept off my calendar, so that hiring activity stays confidential.
10. As an employee, I want my assigned work's due dates on my calendar, so that deadlines and meetings sit together.
11. As an employee, I want a source belonging to a module I cannot use to be absent, so that I am not offered something I cannot open.
12. As a manager, I want my team's approved leave on my calendar, so that I can see coverage.
13. As a manager, I want leave awaiting my approval to be distinguishable from approved leave, so that I can act on it.
14. As a recruiter, I want interviews I am running on my calendar, so that scheduling is in one place.
15. As an HR administrator, I want holidays and shifts to reach everyone entitled to see them, so that the calendar is the source of truth.
16. As an HR administrator, I want a new kind of HR event added without asking the calendar team, so that we are not blocked on another team.
17. As a project manager, I want milestones and sprint dates on the shared calendar, so that delivery is visible alongside everything else.
18. As an organisation owner, I want a company-wide event to reach everyone, so that announcements are seen.
19. As a person in another organisation, I want never to see another organisation's events, so that tenancy holds.
20. As an employee, I want one broken kind of event not to blank my whole month, so that a fault in one area does not take the calendar down.
21. As an employee, I want to be told a source failed rather than silently shown less, so that I do not plan around a gap I cannot see.
22. As a developer, I want one interface a source implements, so that contributing events is obvious.
23. As a developer, I want my source to live in my own module, so that I own it and its tests.
24. As a developer, I want the calendar to import none of my tables, so that my schema changes do not break the calendar.
25. As a developer, I want to add a source by registering it, so that I do not edit a shared file.
26. As a developer, I want to test my source on its own, so that I do not construct the whole calendar to test one query.
27. As a developer, I want one event shape shared by every source, so that the client renders them uniformly.
28. As a developer, I want to attach information specific to my source without widening the shared shape, so that one source's needs do not become everyone's.
29. As a developer, I want the interface to state that filtering by the person's access is my responsibility, so that I do not assume the calendar does it.
30. As a developer, I want a source whose module is unavailable to not be asked at all, so that I do not fetch rows that are then discarded.
31. As a developer, I want the migration proven source by source, so that a mistake is caught while it is small.
32. As a developer, I want a test that the new calendar returns exactly what the old one returned, so that nobody has to trust the migration.
33. As a reviewer, I want each source's access rules to be the ones its own module already enforces, so that no new rules are invented in this work.
34. As a security reviewer, I want each source to filter in its query rather than the calendar filtering after, so that rows a person may not see are never fetched.
35. As a security reviewer, I want a source unable to return another organisation's rows, so that tenancy is enforced per source.
36. As a security reviewer, I want an allow case beside every deny case for each source, so that a source returning nothing is not mistaken for a source that is filtering.
37. As an operator, I want sources fetched concurrently, so that the calendar's speed is its slowest source rather than their sum.
38. As an operator, I want a failing source reported, so that an outage is visible.
39. As an operator, I want no change to the calendar's response shape, so that no client needs updating.

## Implementation Decisions

**A source declares itself.** A name, a label, the module it belongs to, and a way to load events for a given organisation, person and date range. That is the whole interface.

**One event shape for every source.** Anything specific to a source travels in a typed extra field, never by widening the shared shape. The client keeps rendering one thing.

**Access filtering belongs inside the source, in its query.** Each source applies the rules its own module already enforces — leave by the requester and their approval chain, tickets by project membership, interviews by panel membership. The registry never receives rows it then has to filter. A source that returns rows the person may not see has already failed, and the interface says so. No new access rules are invented here; the existing ones are reused.

**Availability is checked before a source is asked, not after.** A source whose module is unavailable to the person is not called. This consults the same availability function the module stream introduces, if it has landed, and the existing module check otherwise — and whichever it uses must be stated, so the two do not fork.

**Registration lives in the owning module.** The HR source lives with HR. This is the point of the change: a registry whose sources all live in the calendar is the same tangle with more files, and would be a failed version of this work.

**Sources are gathered concurrently and failures are isolated.** One source failing degrades that source and is reported; the rest still return and the month still renders.

**The migration is one source at a time, behind an equality.** Each source, as it moves, is proven to return exactly what the current code returns for the same organisation, person and date range. That equality is what makes this safe, and it is asserted per source rather than once at the end.

**No new sources in this work.** Birthdays, review cycles, training, travel and CRM follow-ups are the reason to do this and are not part of it. They become cheap afterwards, which is the payoff.

**The calendar stays universal.** It serves every active member and is not made module-gated. A person's own calendar is part of the basic workspace.

**External calendar synchronisation is untouched.** It is a separate concern with its own seam.

**Watch for cycles.** A registry that modules register into is a classic way to introduce a circular dependency. It must be proven acyclic, and the escape hatch that hides a cycle rather than removing it is not available.

## Testing Decisions

**A good test here states the person, the date range and what exists, and asserts which events came back.** It does not assert how many queries ran or in what order.

**The primary seam is the controller**, against seeded data, depending on the seeded harness spec. A calendar controller e2e spec already exists and is the model for shape — but it runs against the harness that stubs the access services and has no database, so it cannot currently prove that a person sees their own leave and not someone else's.

**The equality is the spine of this work.** For a seeded organisation, person and date range, the registry-driven calendar returns the same events as the current implementation. Asserted **per source as each one moves**, not once at the end — a single equality at the end tells you something broke without telling you which source.

**Per-source seeded coverage, for every source that moves:**

- The person sees the events they are entitled to.
- The person does not see the equivalent events belonging to someone else — asserted in the same test, so a source that returns nothing cannot pass.
- Events from another organisation never appear.
- When the source's module is unavailable, the source contributes nothing and is not asked.

**Registry coverage, provable without seeding:**

- Two registered sources are both asked and their results merge.
- A source whose module is unavailable is not asked — not called and then discarded.
- A source that throws is isolated: the other still returns and the failure is reported. **This is the mutation check** — make the gathering fail-fast instead of fault-tolerant and this test must fail.
- The list of switchable sources is derived from what is registered.
- Unregistering a source removes its events and leaves the rest.

**The response shape must not change.** The existing calendar controller specs are the regression net and should pass unedited. If they need editing, the shape changed and that is out of scope — stop rather than adapt them.

**A trap.** These specs run only under the dedicated end-to-end command, so the calendar spec must be run explicitly to count as coverage.

## Out of Scope

- New event sources of any kind.
- Changing what the calendar renders or the shape of its response.
- External calendar synchronisation.
- Calendar write paths. This is about what the calendar reads.
- Making the calendar module-gated.

## Further Notes

Two tickets, deliberately ordered: the interface and registry first, changing nothing, then the migration source by source. The first is small and safe; the second is where the care is needed, and the per-source equality is what keeps it safe.

The test of whether this succeeded is not that the calendar still works. It is whether adding birthdays afterwards is a small piece of code in the part of the product that knows about birthdays. If it still requires touching the calendar, the seam is in the wrong place.
