# 09 — Source the assignee filter from members, not from a capped project list

**What to build:** Every person who can be assigned work appears in the All Work assignee filter, regardless of how many projects the organisation has. Today the options are assembled by flattening the member arrays embedded in a project list capped at 100 projects, so anyone who is only a member of projects beyond that cap is silently absent — their work cannot be filtered by assignee, and nothing indicates they are missing. This is a wrong answer, not a slow one.

An embedded member array on a capped list is not a member directory. Use the member read that supports a server-side search term and whose paging is independent of project count, with the debounced-search pattern the ticket picker already uses.

**Blocked by:** None — can start immediately.

**Status:** done

**Design choice — assignee picker implementation (2026-09-27):**
The assignee submenu in `FilterCategorySubmenu` owns its own local `search` state and filters `members` client-side. That component is not in this lane's territory. Rather than thread an `onAssigneeSearch` callback through three components in a chain (page → `TicketFilterBar` → `FilterCommandMenu` → `FilterCategorySubmenu`) and add controlled props to an out-of-territory component, the lane instead replaces the assignee submenu entirely. `AssigneeFilterSubmenu` (`frontend/features/build/shared/assignee-filter-submenu.tsx`) is a self-contained component that owns its own `search` state, applies a 300 ms `useDebouncedValue`, and calls `useBuildMembers({ search: debouncedSearch })` directly. `FilterCommandMenu` renders `AssigneeFilterSubmenu` in place of `FilterCategorySubmenu` when the resolved category is `"assignee"`, on both the desktop popover and mobile drawer paths. This is the same co-located fetch pattern used by `TicketPickerDialog`. No client-side text filter is applied to the returned list — `AssigneeFilterSubmenu` renders the server response directly. `all-work-page.tsx` calls `useBuildMembers()` (no search, first page) for the chip label resolution map passed to `TicketFilterBar` and for the `BulkActionBar`.

- [x] Assignee options come from the member read, not from project rows
  — `frontend/features/build/all-work/all-work-page.tsx` line 89: `const { data: buildMembersData } = useBuildMembers();` replaces the `allProjects.flatMap((p) => p.members)` path. `AssigneeFilterSubmenu` also fetches independently via `useBuildMembers` with a search term.
- [x] Filtering by a member reachable only through a project beyond the old cap works
  — `useBuildMembers` hits `GET /build/members`, which is the build-module member directory independent of project count. A member absent from all projects in the first 100 will appear in the picker provided they are a build module member.
- [x] Typing in the assignee picker filters server-side and is debounced
  — `frontend/features/build/shared/assignee-filter-submenu.tsx` lines 35–38: `useDebouncedValue(search, 300)` feeds `useBuildMembers({ search: debouncedSearch })`. Typing fires a new server request after 300 ms of inactivity.
- [x] No client-side filter is applied to a page-limited list as though it were complete
  — `AssigneeFilterSubmenu` renders `members` (the server response) without any `.filter()` call on the list. The old `allProjects.flatMap(...).filter(...)` derivation in `all-work-page.tsx` is deleted.
