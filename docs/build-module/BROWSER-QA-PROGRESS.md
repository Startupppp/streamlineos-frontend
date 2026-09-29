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
- `/build/6/wiki` — ready, Untitled draft; detail link `/build/6/wiki/860067` not opened
- `/build/6/whiteboard` — empty, focus “New Board”
- `/build/6/reports` — ready, “No cycle data yet”
- `/build/6/qa` — empty “No test cases”; 1280 search/suite/priority/automation one row; 375 search plus 36px Filters
- `/build/6/modules` — empty, focus “New Module”
- `/build/6/epics` — ready, 1 epic
- `/build/6/decisions` — empty, focus “New Decision”
- `/build/6/incidents` — empty, focus “New Incident”
- `/build/6/intake` — empty, focus “Copy Form URL”
- `/build/6/forms` — ready, FORM-2; detail `/build/6/forms/2` not opened
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

Issues at 1280 only (overflow 0, heading “Build QA Sandbox”) and backlog at the native ~1044 width (overflow 0, rows BQS-1 onward) were seen earlier and still need the missing viewport.

## Still open

Org routes, detail routes that need a real id, public/portal routes, and the production evidence boxes on the pages above (error, denied, conflict not triggered). Recount `OUT OF SCOPE — browser verification` after this file is saved; that count is the remaining denominator.
