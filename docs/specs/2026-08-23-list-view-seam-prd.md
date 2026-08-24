# PRD — The list-view module exists; give it a door

Status: ready-for-agent
Date: 2026-08-23
Scope: candidate C3 from the re-verified 2026-08-20 architecture review (`architecture-review-20260820-2.html`)
Corrects: the original C3 card, which specified building a list-view module from scratch — one already exists
Sequenced after: nothing. This is independent of the access work and can run in parallel.

## Problem Statement

Nearly every screen in the product is a list: employees, tickets, deals, invoices, stock items, payroll runs, timesheets, tickets again in three other shapes. Each of those lists needs the same six things — a search box that does not fire on every keystroke, filters that survive a page refresh, a way to show which filters are active, a way to reach the seventh filter when only three fit across the screen, a neutral "all" value that means no filter, and a usable version of all of that on a phone.

Two things are true at once, and the tension between them is the problem.

**Those six things are already solved, extremely well, in one place.** Build has a filter family of eleven files and roughly 2,400 lines: a command menu, category submenus with overflow, a flat search across categories, active-filter chips, a trigger button, and a hook that syncs the whole state to the URL. It handles the overflow case that everything else fails at.

**Nothing outside Build can use any of it.** Files outside the Build feature folder that import any part of that family: zero. The only two importers live in Build's own views folder. Meanwhile, across the web app, 106 files hand-sync filter state to the URL, 94 hand-debounce their search, and 129 hand-handle the "all" sentinel — each one a slightly different set of decisions, each one a place where a filter bar can grow past the width available with nobody owning what happens next.

The wall is not technical. It is naming and location. The module is filed under a product module and its public surface speaks in tickets — the URL hook is named for tickets, the category union lists sprints and cycles, the state object has a field for the sprint parameter. A payroll run list would work perfectly well behind that machinery, and no reasonable developer would import it.

For a user this shows up as inconsistency: filters behave one way in Build and five other ways elsewhere, and on narrow screens some of them are simply unreachable. For a developer it shows up as writing the same debounce for the ninety-fifth time. For a coding agent it shows up as no obvious right answer to "add a filter to this page".

## Solution

Lift the existing machinery out of Build, and give it a declarative door.

The interaction layer — command menu, submenus, overflow, chips, flat search, trigger, category rows — moves to a neutral home essentially unchanged. It is already generic; only its address is not.

The type layer and the URL hook do need real work, and this is the part the architecture review undersold when it called the change "a move plus one rename". Today the category set is a closed union of Build's nine categories, the filter state is an object with nine named Build fields, and the URL hook takes no arguments and knows Build's parameter names by heart. None of that can serve a payroll run list.

So the door is a **list spec**: the page declares its categories, how each one draws its options, and how each one serialises to the URL. The module takes the spec and returns the state, the handlers and the rendered bar. Build's nine categories become Build's spec — the first caller, not the definition.

The result is one place that decides overflow, chips, debounce, URL sync, the neutral value and the mobile drawer, and a list page that declares what it filters by instead of implementing how filtering works.

## Goals

- One module owns list filtering, search and URL state for the whole web app.
- Its interface is a declarative spec, so a page states what it filters by, not how.
- Build's existing behaviour is preserved exactly — it is the reference implementation, not a casualty.
- Overflow has an owner, so a filter bar cannot grow past the viewport with nothing deciding what happens.
- Adopting it on a page removes code from that page.
- Adoption is incremental and reversible; no big-bang migration of every list.

## Non-Goals

- Redesigning how filters look. The existing Build treatment is the target, not a starting point for a redesign.
- Changing any API contract, query parameter or backend filter semantics.
- Replacing the table, pagination, page wrapper or search input primitives, which are already shared and already correct.
- Migrating every list page in this change.
- Server-side filter state or saved views.

## User Stories

1. As a user, I want filters to work the same way on every list in the product, so that learning one screen teaches me all of them.
2. As a user, I want to see at a glance which filters are currently applied, so that I understand why the list is showing what it shows.
3. As a user, I want to remove a single active filter without opening a menu, so that narrowing and widening a search is quick.
4. As a user, I want every filter a screen offers to be reachable, so that a narrow window does not hide options from me.
5. As a user, I want to filter a list on my phone, so that I can use the product away from my desk.
6. As a user, I want my filters to survive a page refresh, so that I do not lose my place.
7. As a user, I want to share a filtered list by copying the URL, so that a colleague sees exactly what I see.
8. As a user, I want the back button to return me to my previous filter state, so that browsing feels like the web.
9. As a user, I want typing in a search box not to make the list flicker on every keystroke, so that searching feels calm.
10. As a user, I want clearing a filter to mean "show everything" rather than "show nothing", so that the neutral value behaves the way I expect.
11. As a user, I want to clear all filters in one action, so that I can start over without undoing each one.
12. As a user, I want to find a filter option by typing its name rather than hunting through categories, so that a long option list is not a maze.
13. As a user, I want a filtered list to tell me it is filtered when it is empty, so that I do not think the data is missing.
14. As a user with a keyboard, I want to open, navigate and apply filters without a mouse, so that I can work quickly.
15. As a user with a screen reader, I want active filters announced, so that I know the state of the list.
16. As a developer, I want to add a list page by declaring its filters, so that I do not reimplement debounce and URL sync.
17. As a developer, I want to add a filter to an existing list by adding one entry to a spec, so that the change is proportional to the request.
18. As a developer, I want overflow behaviour to be somebody else's decision, so that I cannot accidentally ship a bar that runs off the screen.
19. As a developer, I want the neutral "all" value handled by the module, so that the sentinel bug class disappears.
20. As a developer working in Build, I want my filter behaviour unchanged after the move, so that the lift costs me nothing.
21. As a coding agent, I want one obvious module to reach for when a task says "add a filter", so that I do not invent a twelfth pattern.
22. As a coding agent, I want the spec to be typed, so that an incomplete filter declaration fails at build rather than at runtime.
23. As a designer, I want filter treatment to be consistent by construction, so that consistency does not depend on catching it in review.
24. As a QA engineer, I want filter behaviour tested once at the module, so that I am not re-testing debounce on every screen.
25. As a QA engineer, I want a page's filter contract expressed as data, so that I can enumerate what a screen filters by without reading its component.

## Implementation Decisions

### What moves unchanged, and what has to be reshaped

This distinction is the whole risk in the work and must not be glossed:

**Generic already — move it.** The command menu, category submenus and their internals, the category list and row, the flat cross-category search, the option leading adornment, the trigger button and the active-filter chips. This is the overflow and interaction machinery and it is roughly four fifths of the line count.

**Build-specific — must be parameterised.** The type layer holds a closed union of Build's nine categories, a state object with nine named Build fields, and Build's own priority and type enumerations. The URL hook takes no arguments and hard-codes Build's parameter names. The ticket filter bar composes the two. None of these can be moved as-is; they define the module's door and the door currently only opens onto Build.

### The spec is the interface

A page supplies a list of category declarations. Each declaration carries its key, its label, how to obtain its options, whether it is single- or multi-valued, and how it serialises to and from a URL parameter. The module returns the current state, the change handlers and the rendered control.

The filter state becomes a record keyed by category key rather than an object with named fields. This is the change that makes the union open. Build's nine categories become one spec object and the closed union becomes Build's own type, derived from its spec.

The URL hook takes the spec. Serialisation is declared per category rather than baked in, which is what lets a payroll run list use dates where a ticket list uses a sprint.

### Where it lives and what it is called

A neutral shared location, named for lists rather than for a product module, using the repository's kebab-case file convention. Nothing in its public surface should mention tickets, sprints, cycles or projects.

Build's existing imports change path. That is the entire cost to Build, and it must be verified by Build's screens behaving identically, not by the types compiling.

### Adoption order

Incremental, and driven by work already happening rather than as a sweep. Adopt on pages that are being touched anyway, starting with the list pages whose filter bars are known to overflow. Each adoption should delete more lines from the page than it adds.

The 106 URL-syncing files, 94 debouncing files and 129 sentinel-handling files are the size of the opportunity, not a task list. Nothing in this spec requires touching all of them.

### Relationship to the existing shared primitives

The table, table pagination, cursor page controls, search input, filter pill and page wrapper primitives are already shared and already correct. This module composes them; it does not replace them. If the module ends up reimplementing one of them, that is a signal the boundary is drawn in the wrong place.

## Testing Decisions

A good test here drives the module the way a user drives it — declare a spec, render it, interact, assert what the URL and the visible state became. It does not assert which internal component rendered, or that a particular hook was called.

**Seam 1 — the module's public interface, given a spec.** This is the highest seam and should carry nearly all the coverage. Because the spec is data, a single suite can cover the whole behaviour surface:

- A spec with more categories than fit produces a bounded bar; the surplus is reachable rather than clipped.
- Selecting a filter writes it to the URL; a URL with filters present hydrates the state on first render.
- Clearing a filter removes its parameter rather than writing a neutral sentinel into it.
- The neutral value means unfiltered, and does not appear in the URL.
- Search input is debounced: rapid input produces one settled state, not one per keystroke.
- Active filters render as chips, and dismissing a chip removes exactly that filter.
- Clear-all returns the URL to its unfiltered form.
- Keyboard navigation opens, moves through and applies a filter without a pointer.
- A single-valued category replaces rather than accumulates; a multi-valued one accumulates.

**Seam 2 — Build's list screens, as a regression fence.** Build is the reference implementation and the only current consumer, so the risk in this work is regressing it. Its existing screen-level tests must pass unchanged after the move. If Build has no such coverage today, add a thin one before the move rather than after — the move is only safe if something proves it changed nothing.

Prior art: follow whatever the existing component tests in the web app do for rendering and interaction. Because the module's interface is a spec object, prefer table-driven tests over one test per category — that is what makes the coverage proportional to the behaviour rather than to the number of product modules.

Per the standing instruction, tests are not run as part of routine verification and must be reported as not run unless explicitly requested.

## Out of Scope

- Migrating all list pages. Adoption is incremental and driven by other work.
- Saved views, shareable named filters, or persisting filter state server-side.
- Any change to sorting, pagination or column selection.
- Redesigning the visual treatment of filters.
- The backend query parameters each list accepts.
- Server components. This module is client state and stays client state.

## Further Notes

**On the original card's numbers.** The 2026-08-20 review claimed 219 files import the filter row. That does not reproduce — the closest defensible figure is 15 files importing something named like a filter bar. The other three figures re-measured within range and are the ones quoted here: 106 URL-syncing, 94 debouncing, 129 handling the neutral sentinel. The finding survives comfortably on those; the 219 should not be repeated.

**On "reuse before you create".** The original card specified building this module from scratch. It already exists and is good. The correction matters beyond this spec: the reason it was missed is that a search for a shared list abstraction looked in the shared component folders and not inside a product module. A well-built module filed under a product name is invisible to exactly the search that would want it — which is itself the argument for the move.

**Why this is worth doing without being urgent.** It unblocks nothing and secures nothing. It pays off as leverage: one spec, applied to the pages phase one touches anyway, with each application removing code. It is the safest item in the review's queue and the easiest to stop half-way through without leaving damage.
