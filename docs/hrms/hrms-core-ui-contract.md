# HRMS core UI contract

Status: binding for HRMS core screens as of 2026-08-18. This closes the
documentation portion of `UI-CONTRACT`; existing deviations remain tracked by
their stable `UI-*` finding in `TASKS.md`.

## Page and navigation contract

- A route is server-gated with `requirePermission` or the appropriate
  self-service gate. Client checks never replace the server or API gate.
- Sidebar visibility uses the same permission catalog and module entitlement as
  the route. Entitlement loading, errors and an empty entitlement set all fail
  closed.
- HR administration and employee self-service are separate navigation jobs.
  Self-service routes do not inherit broad employee-list permissions.
- Pages use the shared page heading and spacing scale. A page has one primary
  action; secondary actions remain visually secondary.

## Query and list contract

- Interactive reads use TanStack Query hooks. Components do not call `fetch` or
  the API client directly.
- Permissioned hooks set `enabled` from the endpoint's exact capability so a
  hidden surface does not generate predictable 403 traffic.
- Growing lists use a bounded server cursor and stable ordering. They render
  `CursorPageControls`; client-side exact totals and deep offset pagination are
  not part of the contract.
- Search and selectors are server-side, debounced and cursor-backed. A selector
  never silently treats the first 100 records as the complete organization.
- Tables use the shared table primitives. Loading preserves the last safe
  result, errors use `ErrorState` plus `getErrorMessage`, and empty state copy
  states what the user can do next.

## Forms and actions

- Forms use react-hook-form with a co-located Zod schema matching the backend
  boundary. Server validation remains authoritative.
- Mutation buttons are hidden without the exact action permission. Read access
  never implies edit, archive, export, approval or sensitive-field access.
- Buttons are disabled while their mutation is pending and keep the dialog or
  sheet open when the server rejects the operation.
- Destructive operations use the shared confirmation flow, name the affected
  record, show dependency conflicts verbatim through `getErrorMessage`, and
  never optimistically remove compliance or payroll state.
- Form actions appear in a consistent footer: Cancel first, primary action last.
  Focus returns to the initiating control when a dialog or sheet closes.

## Sensitive data and documents

- Base employee responses never contain compensation, bank, government-ID,
  medical, grievance or disciplinary fields. Those screens use separate
  field-tier endpoints and capabilities.
- Document upload, edit, review, download and removal each use their exact
  backend capability. A file URL is obtained only through the signed-access
  hook; persistent storage URLs are not rendered directly.
- Sensitive reads and exports have a server-side audit boundary. Hiding a field
  or button is only presentation hardening.

## Responsive and accessible behavior

- Employee self-service screens must work at 375 px without horizontal page
  overflow. Wide tables may scroll inside their labelled container; primary
  actions remain reachable.
- Inputs have visible labels and associated error text. Icon-only actions have
  accessible names and keyboard-visible focus.
- Menus, dialogs and sheets are keyboard operable, trap focus while open, and
  restore focus on close. Status is conveyed by text as well as color.
- Loading and error announcements do not replace the page heading, so assistive
  technology retains route context.

## Verification checklist for a changed HRMS screen

1. Server route gate, endpoint capability and client visibility use the same
   permission key.
2. Unauthorized hooks remain disabled and no sensitive field exists in the
   response body.
3. Loading, error, empty, retry and mutation-conflict states are exercised.
4. Growing data is bounded and ordered; selectors support server search.
5. Keyboard navigation and a 375 px viewport preserve every critical action.
6. Mutation invalidation follows the HRMS cache matrix rather than clearing the
   entire query client.
