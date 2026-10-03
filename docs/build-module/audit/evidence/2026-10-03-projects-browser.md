# Projects browser verification — 2026-10-03

Status: Current verified for the observations recorded below. Current unverified for complete Projects acceptance, project detail navigation success, mutations, restricted roles, mobile behavior, and deployment parity.

## Environment and source

The local frontend at `http://localhost:1000` used the deployed API configured in its existing environment. This verifies the changed frontend against that API; it does not verify the new backend source. The browser was signed into the existing organization-owner account. No account, project, ticket, membership, or organization was changed during these observations.

| Slice | Source revision | Checks |
|---|---|---|
| Projects manager filter, scope title, native card link | `3431ff627` | Five focused frontend suites, 29 tests; scoped lint has zero errors. |
| Optional Resume error isolation | `cb7b16fa6` | Three focused frontend suites, 12 tests; scoped lint has zero errors; independent review by `module_grants_resume` found no blocker. |

## Browser observations

1. `/build/projects` displayed the owner title **All Projects** and the two existing project rows.
2. Grid navigation initially failed because the optional Resume read for project `6` returned HTTP 500 and propagated to the collection error boundary. The source fix uses the canonical inline-read error policy. It retains a resume reference for transient errors, and clears it only for denied, missing, or inactive projects.
3. After reloading the changed frontend, `/build/projects?view=grid` displayed both project cards while the optional project-detail request still failed. The collection remained usable.
4. A middle click on the native project-card link opened `/build/6` in another tab and kept the original collection tab at its grid URL. A Control-click attempt in the in-app browser did not create a tab; this is not recorded as a passing modifier-click check.
5. The new detail tab displayed **Something went wrong**. The deployed `/build/6` request returned HTTP 500 with code `INTERNAL_ERROR`; one recorded correlation ID is `20187789-b107-4864-aaed-da269fe3717a`. Project-detail success remains open.

![Projects grid remains visible](2026-10-03-browser/projects-grid.jpg)

![Unresolved project detail error](2026-10-03-browser/project-detail-error.jpg)

## Read-only diagnosis

The configured application database role was used with IAM authentication, `SET TRANSACTION READ ONLY`, a 20-second statement timeout, and the existing organization and INTERNAL audience GUCs. Source column names for Projects, Project statuses, Project members, Organization members, Business parties, and Client party mapping all existed in the target catalog.

The current source's relational project read, including ordered statuses and projected member identity, succeeded for project `6`: one project, four statuses, one member. No record payload, email, credential, token, or connection URL was printed. This narrows the diagnosis; it does not reproduce the entire deployed HTTP path or identify the 500's cause. The local verification runner must exercise the complete current HTTP path before a source repair is selected.

## Remaining acceptance

The Projects requirement stays open. Browser checks still need successful full-page and pane navigation, ordinary and modifier clicks, return history, refresh persistence, manager/status/health filters, pagination, restricted access, 375/768/1280 layouts, and create/import behavior. Backend health/cursor source is being independently revised and needs application-role query-cost evidence. Synthetic signup and permission tests will use local captured mail and real application guards.
