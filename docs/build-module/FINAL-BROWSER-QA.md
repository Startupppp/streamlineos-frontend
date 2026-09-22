# Final closure — browser verification checklist

**Owner: Codex.** Claude opened no browser, took no screenshot and verified no UI in the session that
produced this list. Nothing below is a result; every row is a thing to check.

**Run only after the code is merged AND deployed.** Several rows exercise contracts that changed in this
session; against an older deployment they will fail for the wrong reason.

Record per failure: route, viewport, exact steps, expected vs actual, console output, and whether any
request 4xx/5xx'd. Distinguish **BLOCKED** (cannot run — precondition unmet) from **FAIL**.

Viewports: **desktop 1440×900** and **mobile 375×812**. Every section is to be run at both unless a row
says otherwise.

---

## 0. Preconditions

| # | Check | Expected |
|---|---|---|
| 0.1 | The deployed build contains the merge commits listed in `IMPLEMENTATION-STATUS.md` | matching commit sha |
| 0.2 | `GET /health` and `/ready` | 200, database and cache up |
| 0.3 | Sign in as a user who is a **member** of the test project | Build loads |
| 0.4 | Have a second account in the **same org** who is **not** a member of that project, and a third in a **different org** | needed by §6 |

---

## 1. Cycles — the legacy sprint identity is gone

The API no longer accepts or returns `sprintId`. `cycleId` is the only iteration identity, and the
`build.sprints` REST surface is frozen at HTTP 410.

| # | URL / action | Expected |
|---|---|---|
| 1.1 | `/build/{projectId}/cycles` | List renders. No console error. |
| 1.2 | `/build/{projectId}/cycles/{cycleId}` | Detail renders with its tickets. |
| 1.3 | Create Cycle sheet — open, then **cancel** | Opens, traps focus, closes on Escape and on backdrop click. Do not submit. |
| 1.4 | `/build/{projectId}/sprints` | **Redirects** to `/build/{projectId}/cycles`. Must not 404. |
| 1.5 | Ticket detail → the iteration field in the right sidebar | Offers **cycles**. Selecting one persists after reload. |
| 1.6 | `/build/{projectId}/backlog` → bulk-select → assign to an iteration | Writes, and the rows reflect it after reload. |
| 1.7 | `/build/{projectId}/workload` → the iteration filter | Filters by cycle. Chip label reads Cycle, not Sprint. |
| 1.8 | Any board/list/table URL that previously carried `?sprintId=` | **Known breaking change.** A stale bookmark or saved view holding `sprintId` no longer filters. Confirm the page still renders rather than erroring, and report what it shows. |
| 1.9 | `/build/{projectId}/reports` → Velocity and Burnup | Both render. The iteration selector drives them. |
| 1.10 | DevTools Network — any request carrying `sprintId` | There should be none. If one exists, it will 400, because every body schema is `.strict()`. Report the caller. |

**Risk to watch:** a saved view is server-persisted and replays its stored filters on load. If any saved
view still holds `sprintId`, §1.8 is where it surfaces.

---

## 2. Bugs — canonical work items

Bugs are `tickets` of type `BUG` joined to `work_item_qa_details`. The legacy `build.bugs` writer is
deleted. `/build/{projectId}/bugs` remains the canonical user-facing surface.

| # | URL / action | Expected |
|---|---|---|
| 2.1 | `/build/{projectId}/bugs` | List renders with rows. |
| 2.2 | Open a bug | Detail renders; QA fields (state, severity) populated. |
| 2.3 | Create a bug | Succeeds. New row carries a **ticket number**, and appears in the list after reload. |
| 2.4 | Edit a bug's status and severity | Persists across reload. |
| 2.5 | `/build/{projectId}/qa` → open a test run → mark a result failed → create a bug from it | Creates a **ticket**, and the result links to it. |
| 2.6 | The bug created in 2.5, seen from `/build/{projectId}/bugs` | Appears, with QA fields populated rather than blank. |
| 2.7 | Empty state — a project with no bugs | Renders an empty state, not a spinner and not an error. |

**Risk to watch:** a BUG ticket created outside the canonical surface has no QA sidecar and shows null QA
fields. If 2.6 shows blanks, say which path created it.

---

## 3. Invoices — timesheet traceability

An invoice line may now cite an approved timesheet entry.

| # | URL / action | Expected |
|---|---|---|
| 3.1 | Open an existing invoice | Renders. Line items show. No console error. |
| 3.2 | Create an invoice with a line citing an **approved** timesheet entry | Succeeds; the line persists the link. |
| 3.3 | Reload that invoice | The link survives. |
| 3.4 | Edit that **draft** invoice — change an unrelated field and save | **The link must survive.** This is the regression most worth checking; before this session an edit silently cleared it. |
| 3.5 | Attempt a line citing a **voided** or **non-approved** entry | Rejected with a clear message, and no invoice is created. |
| 3.6 | Attempt a line citing an entry from **another organization** | Rejected. Must not say the id exists. |

---

## 4. Modal accessibility — the console warning

| # | Action | Expected |
|---|---|---|
| 4.1 | Load any authenticated Build route, open DevTools console, filter on `Missing` | **No** `Missing \`Description\` or \`aria-describedby\`` warning. |
| 4.2 | Open the command palette (Cmd/Ctrl-K) and close it | No such warning. |
| 4.3 | Open the org switcher, product switcher, quick-create, user avatar menu, notification bell | No such warning from any. |
| 4.4 | Mobile 375 px — open the mobile nav drawer and the "More" sheet | No such warning. |
| 4.5 | The Feedbucket widget — open and close it | Panel has an accessible name, traps focus, closes on Escape. |
| 4.6 | Screen reader (or the accessibility inspector) on the command palette | Announces both a name and a description. |

**Known and accepted:** roughly 215 dialog/sheet/drawer sites elsewhere in the app still lack a
description. They are held by the `check:dialog-descriptions` ratchet and are out of scope here. Only
report a missing-description warning if it fires on a route in this checklist.

**Note on scope:** `notification-bell-panel.tsx` was deliberately left untouched because another session
was mid-rewrite of it. Its drawer may still lack a description; that is expected, not a regression.

---

## 5. The surfaces that were already passing — confirm no regression

Run these because the sprint contract change touched shared ticket read paths.

| # | URL | Expected |
|---|---|---|
| 5.1 | `/build/{projectId}` — board | Renders. Card click **opens the ticket**. |
| 5.2 | `/build/{projectId}/issues` — board, list, table, timeline | All four render. |
| 5.3 | Ticket detail | Loads; comments post; time logs. |
| 5.4 | `/build/my-work`, `/build/all-work` | Load with rows. |
| 5.5 | `/build/{projectId}/meetings` | Loads. Opening a meeting shows its iteration. |
| 5.6 | `/build/{projectId}/change-requests` | Loads. |
| 5.7 | `/build/{projectId}/backlog`, `/files`, `/analytics`, `/releases` | Load. |
| 5.8 | Command Center | Loads. |

---

## 6. Authorization — the Feedbucket fix

Converting a Feedbucket submission into a ticket now requires **membership of the target project**, not
merely that the project is in the org.

| # | Actor | Action | Expected |
|---|---|---|---|
| 6.1 | Member of project P, holding `feedbucket:submissions:manage` | Convert a submission whose widget targets P | Succeeds. |
| 6.2 | **Non-member** of P, same org, holding `feedbucket:submissions:manage` | Convert a submission targeting P | **403.** Before this session it succeeded. |
| 6.3 | Non-member of P | Convert with an explicit project override naming P | **403.** The override must not bypass the check. |
| 6.4 | Different org | Any of the above | **404**, never 403. |
| 6.5 | Member of P | AI "create ticket from analysis" on a submission targeting P | Succeeds. |
| 6.6 | Non-member of P | Same | **403.** |

**This is a deliberate behaviour change.** If a triager legitimately needs to file into projects they are
not a member of, 6.2 will read as a regression — report it as a product question rather than a defect.

---

## 7. Per-route state matrix

For each of `/build/{projectId}/cycles`, `/bugs`, `/qa`, `/backlog`, `/workload`, `/reports`:

| State | How to produce | Expected |
|---|---|---|
| Loading | Throttle to Slow 3G, hard reload | A skeleton, not a blank pane and not a spinner that never resolves |
| Empty | A project with no rows of that kind | A purpose-built empty state |
| Error | Block the request in DevTools | An error state with a retry, not an empty state |
| Permission denied | Sign in as a user lacking the route's key | A denial state, **not** an empty list |
| Navigation | Sidebar → the route → browser Back | Returns to the prior surface with its state intact |
| URL state | Apply a filter, copy the URL, open in a new tab | The filter is restored |

The permission-denied row matters most: this codebase's recurring defect is a denial rendering as
"nothing here yet", which tells a refused user the data does not exist.

---

## 8. Console and accessibility sweep

| # | Check |
|---|---|
| 8.1 | Zero **application** console errors across every route above. Third-party noise is out of scope — name the source. |
| 8.2 | Zero React key warnings and zero hydration mismatches. |
| 8.3 | No request 4xx/5xx other than the deliberate denials in §6. |
| 8.4 | Run the accessibility inspector on Cycles, Bugs and the create sheets — report violations with their rule id. |
| 8.5 | At 375 px: no horizontal overflow, focus order follows visual order, and no control is unreachable by keyboard. |

jsdom cannot observe layout overflow, real focus order, or paint — §8.5 is the part automated tests in
this repo structurally cannot cover, so it carries the most new information.

---

## 9. Explicitly NOT to be done

- Do not run any destructive migration. `a-sprint-cycle-04-detach.sql`, `-05-drop.sql`,
  `b-qa-bug-04-contract-freeze.sql` and `b-qa-bug-05-contract-drop.sql` remain unapplied.
- Do not run `scripts/db-query.mjs` or `scripts/apply-migration-file.mjs` without an explicit `--url`.
  Both call `dotenv.config()` internally and default to **production**.
- Do not create, edit or delete production records beyond what a row explicitly requires, and undo
  anything you do create.
