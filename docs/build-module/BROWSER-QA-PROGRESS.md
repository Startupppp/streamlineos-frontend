# Browser QA progress — Build module page specs

**Authority:** Signed-in Cursor IDE browser (`cursor-ide-browser`), view `f64219`, `http://localhost:1000`. No Playwright.

**Denominator:** There is no file that lists 224. The checkable set started at **167** `OUT OF SCOPE — browser verification` lines. Keyboard/responsive boxes are ticked only after 1280 and 375 checks on that route. Production boxes stay open when error, denied, and conflict were not triggered without changing data.

## Passed in the Cursor browser this pass

Document overflow was 0 at 1280 and 375 unless noted. `prefers-reduced-motion: reduce` stayed on and the page still rendered. Signed in as the existing session, project 6 (Build QA Sandbox) unless noted.

- `/build/6/cycles` — ready, QA Sprint 01
- `/build/6/releases` — empty, “No releases yet”
- `/build/6/updates` — empty, “No updates yet”
- `/build/6/files` — ready, download.jpg
- `/build/6/meetings` — empty, focus “New Meeting”
- `/build/6/milestones` — ready, MVP Pending, focus “New Milestone”
- `/build/6/workload` — ready board, 22 tickets; page overflow 0; board scrolls inside (375 scroll width 1488)
- `/build/6/client-portal` — empty grants, “No grants”; one resize-during-navigation flash of “Something went wrong”, reload was clean
- `/build/6/wiki` — ready, Untitled draft; detail `/build/6/wiki/860067` and `/history` opened
- `/build/6/whiteboard` — empty, focus “New Board”
- `/build/6/reports` — ready, “No cycle data yet”
- `/build/6/qa` — empty “No test cases”; 1280 search/suite/priority/automation one row; 375 search plus 36px Filters
- `/build/6/modules` — empty, focus “New Module”
- `/build/6/epics` — ready, 1 epic
- `/build/6/decisions` — empty, focus “New Decision”
- `/build/6/incidents` — empty, focus “New Incident”
- `/build/6/intake` — empty, focus “Copy Form URL”
- `/build/6/forms` — ready, FORM-2; detail `/build/6/forms/2` opened (inactive Untitled Form)
- `/build/6/feedbucket` — empty, focus “Create feedback widget”
- `/build/6/chat` — empty, focus “Create chat channel”
- `/build/6/change-requests` — empty, focus “New Change Request”
- `/build/6/budget` — ready, Planned Budget ₹0, focus “Set Budget”
- `/build/6/approvals` — empty, focus “Request approval”
- `/build/6/triage` — ready, BQS-22; pager near the bottom of the 900px pane
- `/build/6/risks` — ready, Open 0; 375 filter row scrolls inside itself
- `/build/6/settings` — ready hub
- `/build/6/settings/workflow` — ready, focus “Save”
- `/build/6/settings/views` — empty, focus “Create view”
- `/build/6/settings/fields` — ready description, focus “Add Custom Field”
- `/build/6/settings/automations` — empty, focus “New Automation”
- `/build/6/settings/agents` — ready, focus “New token”
- `/build/6/settings/access` — ready member list, focus “Member”
- `/build/6/settings/integrations` — ready, focus “Add connection”
- `/build/6/settings/portal` — ready ticket visibility list
- `/build/6/settings/iterations` — ready, default cycle length 2 weeks
- `/build/6/settings/retention` — ready, Policy / Legal Holds
- `/build/6/settings/integrations/webhooks` — empty, focus “Add Webhook”
- `/build/6/settings/agents/credentials` — ready API tokens section

Also checked this pass:

- `/build` — ready list, Build QA Sandbox; 375 search is 343px and Filters/Display/Grid/List are 36px
- `/build/all-work` — ready, 50 tickets, overflow 0 at 1280 and 375
- `/build/my-work` — ready; at 375 the tab list scrolls inside itself
- `/build/goals` — Total Goals 0, focus “New Goal”
- `/build/teams` — empty, “No teams yet”
- `/build/inbox` — empty unread, “All caught up”, focus “Unread”
- `/build/templates` — empty, “No templates yet”. Search labelled “Search templates…” is present. Pressing `/` focused “Search pages, leads, deals, contacts…”, so the keyboard box stays open.

Later the same pass also measured overflow 0 at 1280 and 375 on:

- `/build/6/backlog`, `/build/6/issues` (board scrolls inside at 375), `/build/6`
- `/build/roadmap`, `/build/programs`, `/build/portfolios`, `/build/managed-products`
- `/build/settings/access`, `/build/settings/integrations`, `/build/settings/client-access`
- `/build/6/wiki/860067`, `/build/6/wiki/860067/history`, `/build/6/forms/2`, `/build/6/tickets/BQS-22`, `/build/6/cycles/9`
- `/build/command-center`, `/build/approvals`
- `/portal`, `/portal/6`
- `/client-portal` and `/client-portal/6` both land on `/accept-invitation?reason=no_token` (“No active session”)

## Still open

These keyboard boxes stay open because the route could not be measured without creating data or guessing an id:

- Detail with no record: portfolio, managed product (and its insights, projects, roadmap, goals, feedback), team, meeting, incident, Feedbucket submission, goal, QA run
- Public with no token or published link: `/roadmap/[orgId]`, `/forms/[formToken]`, `/board/[shareToken]`
- `/intake/6` painted “Submit a request”, then the client settled on “Something went wrong” (hydration mismatch)
- `/build/templates`: pressing `/` focuses “Search pages, leads, deals, contacts…” instead of “Search templates…”

Every production evidence box stays open. Ready or empty was seen on the pages above. Error, denied, and conflict were not triggered, and no records were created.

`OUT OF SCOPE — browser verification` no longer appears on the page specs. The phrase remains on three ticket notes (`50`, `51`, `55`) that ask for a before/after visual comparison, plus the historical sentence in `RELEASE-STATUS.md`.
