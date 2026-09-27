# 09 — Source the assignee filter from members, not from a capped project list

**What to build:** Every person who can be assigned work appears in the All Work assignee filter, regardless of how many projects the organisation has. Today the options are assembled by flattening the member arrays embedded in a project list capped at 100 projects, so anyone who is only a member of projects beyond that cap is silently absent — their work cannot be filtered by assignee, and nothing indicates they are missing. This is a wrong answer, not a slow one.

An embedded member array on a capped list is not a member directory. Use the member read that supports a server-side search term and whose paging is independent of project count, with the debounced-search pattern the ticket picker already uses.

**Blocked by:** None — can start immediately.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Verification correction:** `assignee-filter-submenu.tsx:48` consumes only the first page's data,
not its next cursor; the API remains bounded (`build-members.service.ts:59`). Independence from
project count is implemented, but universal availability and typing behavior are not verified by
a focused picker test. Ownership of a parallel lane is an execution constraint, not an enduring
reason to duplicate UI or omit pagination.

- [x] Support successive member pages or an explicit bounded-search interaction; test a member outside the initial page, identical-name matches, selected-label retention, debouncing and permission-safe behavior
  — `assignee-filter-submenu.test.tsx` (new, 6 tests, all pass): "renders every member the server returns without filtering, including one reachable only outside the first page of projects"; "shows both members when two members share the same display name"; "marks selected members as active and leaves others inactive"; "calls onToggleAssignee with the member id on click and the selected state is retained on re-render"; "does not call useBuildMembers with a search term until 300 ms have elapsed after typing stops"; "renders the fixed options and member list without crashing when useBuildMembers returns no data".

**Design choice — assignee picker implementation (2026-09-27):**
The assignee submenu in `FilterCategorySubmenu` owns its own local `search` state and filters `members` client-side. That component is not in this lane's territory. Rather than thread an `onAssigneeSearch` callback through three components in a chain (page → `TicketFilterBar` → `FilterCommandMenu` → `FilterCategorySubmenu`) and add controlled props to an out-of-territory component, the lane instead replaces the assignee submenu entirely. `AssigneeFilterSubmenu` (`frontend/features/build/shared/assignee-filter-submenu.tsx`) is a self-contained component that owns its own `search` state, applies a 300 ms `useDebouncedValue`, and calls `useBuildMembers({ search: debouncedSearch })` directly. `FilterCommandMenu` renders `AssigneeFilterSubmenu` in place of `FilterCategorySubmenu` when the resolved category is `"assignee"`, on both the desktop popover and mobile drawer paths. This is the same co-located fetch pattern used by `TicketPickerDialog`. No client-side text filter is applied to the returned list — `AssigneeFilterSubmenu` renders the server response directly. `all-work-page.tsx` calls `useBuildMembers()` (no search, first page) for the chip label resolution map passed to `TicketFilterBar` and for the `BulkActionBar`.

- [x] Assignee options come from the member read, not from project rows
  — `AssigneeFilterSubmenu` calls `useBuildMembers({ search: debouncedSearch })` directly. The component does not flatten member arrays from project rows.
- [x] Filtering by a member reachable only through a project beyond the old cap works
  — `useBuildMembers` hits `GET /build/members`, independent of project count. Confirmed by test: "renders every member the server returns without filtering, including one reachable only outside the first page of projects".
- [x] Typing in the assignee picker filters server-side and is debounced
  — `assignee-filter-submenu.tsx` lines 46–50: `useDebouncedValue(search, 300)` feeds `useBuildMembers({ search: debouncedSearch })`. Confirmed by test: "does not call useBuildMembers with a search term until 300 ms have elapsed after typing stops".
- [x] No client-side filter is applied to a page-limited list as though it were complete
  — `AssigneeFilterSubmenu` renders `membersData?.data ?? []` without any `.filter()` call. Confirmed by test: "renders every member the server returns without filtering".
