# RBAC.md — StreamlineOS Manage Product RBAC round (2026-10-13, IST)
Product: id 3 "QA MP 1013 Renamed <i>x</i>" (key QAMP1013), org "QA Build Org 1012b". Base: https://streamlineos.in
Browser zoom reset to 100% on streamlineos.in (Ctrl+0) before testing.
Each actor signed in via email OTP in its own incognito window session (one actor at a time; sessions kept isolated from owner session). OTP codes not recorded here.

## Actor sessions
| Actor | Email (Guerrilla) | Sign-in | Notes |
|---|---|---|---|
| qamem1012c | qamem1012c@sharklasers.com | OTP OK (1 send) | Product Member on product 3 |
| qaview1012e | qaview1012e@sharklasers.com | OTP OK (2nd send) | Org viewer, not product member |
| qaout1012g | qaout1012g@sharklasers.com | OTP OK (3rd send) | Different org (second tenant) |
| qaadm1012d | qaadm1012d@sharklasers.com | OTP OK (4th send) | Product Admin on product 3 (identity confirmed via account menu) |

## Actor x route matrix

Directory = /build/managed-products. Product = id 3. "Denied" = redirect to /access-denied "Access Restricted" page (required permission named). "Not found" = in-page "Not found / Product not found" state. "Error" = generic error boundary.

| Route (product 3) | qamem1012c (Member) | qaview1012e (Org viewer, not member) | qaout1012g (Outsider, other tenant) | qaadm1012d (Product Admin) |
|---|---|---|---|---|
| Directory /build/managed-products | LISTED: "QA MP 1013 Renamed <i>x</i>" (QAMP1013, Build, Unknown, Unassigned, 2 projects) | DENIED (build:managed-products:view) | Empty state "Start with a product" (no QA data) | not run (listed in owner round) |
| / Overview (/build/managed-products/3) | LOADS: Needs attention, KPIs, Signal to outcome, Delivery progress. No Edit product / Post update / Record opportunity / Mark reviewed | DENIED (build:managed-products:view) | Not found ("This doesn't exist, or you don't have access to it."), shell + BD Product in sidebar, no QA data | LOADS: Edit product, Post update, Record opportunity, Mark reviewed visible |
| /feedback | DENIED (feedbucket:submissions:view) | DENIED (feedbucket:submissions:view) | Product not found (no data) | LOADS: Capture feedback + list (Feedbucket capture not re-tested) |
| /insights (Overview) | LOADS: counts; "CRM customer fields are hidden" note | DENIED (build:managed-products:view) | Product not found (no data) | not separately recorded (LOADS per owner round) |
| /insights?view=discovery | LOADS: 2 opportunities (Declined, Accepted 250.00). No "New opportunity" button | not run (denied at /insights) | not run (Product not found) | not separately recorded |
| /goals | LOADS: header "Total Goals 2" but list "No goals yet" (MP-B-018). "New Goal" visible | DENIED (build:goals:view) | Shell + tiles 0 + Not found (no data) (MP-B-021) | LOADS: 2 goals + "RBAC" goal after create; "New Goal", "Link existing goal" visible |
| Goals mutation: New Goal "RBAC <actor> 1013" -> Create Goal | DENIED: toast "Missing permission: build:goals:manage"; no goal created (MP-B-019) | not reached (route denied) | Rejected: toast "Not found"; not verified in outsider's own org | SUCCEEDED: goal "RBAC qaadm 1013" created; list/tiles stale until reload (MP-B-022) |
| /projects | LOADS (read-only): QA Project Delta, QA Project Alpha; no "Link existing project" | DENIED (build:view) | Shell "Linked Projects" + Not found (no data) (MP-B-021) | LOADS: "Link existing project" visible |
| /roadmap | LOADS (board): Now x2 (QA RM 1013 items), Next (QA MP 1013 item). No New Item / Publish / Preview | DENIED (build:roadmap:view) | Error boundary "Something went wrong" (MP-B-020) | LOADS: Preview, Publish, New Item visible |
| /releases | LOADS: "No releases yet"; no "New release" | DENIED (build:managed-products:view) | Error boundary "Something went wrong" (MP-B-020) | LOADS: "New release" visible |
| /settings (General) | LOADS: 9 text fields and 5 selects editable-looking; NO Save button; "Archive this product" text (no button found). Edit not tested | DENIED (build:managed-products:view) | Product not found (no data) | not run |
| /settings?tab=members | LOADS (after ~10 s): qamem1012c Member, qaadm1012d Admin; no Add member / remove controls | DENIED | Product not found | LOADS: "Add member" visible; list shows both members |
| /settings?tab=publishing | Heading "Client publication" + text only; no publish control | DENIED | Product not found | not run (Publish visible on roadmap) |
| /settings?tab=feedback-channels | Blank body (no controls) | DENIED | Product not found | not run |
| Non-existent product /build/managed-products/99999 | not run | Denied (same as product 3; no existence oracle observed) | not run | not run |

Summary:
- Outsider: no QA data rendered on any product 3 route; denial is "Not found"/"Product not found" on 6 routes but a generic error boundary on /roadmap and /releases (MP-B-020); product shell still renders write CTAs and 0-count tiles (MP-B-021).
- Viewer (org viewer, not a member): no product 3 route renders; every route is denied. Pass.
- Member: read access to overview, insights, goals (count leak, MP-B-018), roadmap, releases, projects, settings tabs; no create/edit/publish/member controls except New Goal (which is denied server-side, MP-B-019). Feedback denied.
- Admin: write controls visible across product routes; goal write succeeded (list stale, MP-B-022).

## Actor detail: qamem1012c (Product Member)
- Signed in: yes (incognito session). Product 3 is listed in directory and opens.
- Allowed/visible: read Overview, Insights (overview + discovery), Goals (summary), Roadmap (board), Releases (empty), Linked projects (read), Product settings (general/members/publishing tabs readable).
- Restricted: Feedback route denied (feedbucket:submissions:view). Create goal denied (build:goals:manage). No Edit product / Post update / Record opportunity / New Item / New release / Link project / Members add-remove / Publish controls visible.
- Mutation attempt: "RBAC qamem 1013" goal create -> Missing permission toast; nothing created. Shows that the UI button is shown but the action is denied (affordance mismatch, see MP-B-019).

## Actor detail: qaview1012e (Org viewer, not a product member)
- Signed in via OTP in a separate incognito session (member session signed out first via Account menu > Sign out).
- Directory /build/managed-products: ACCESS RESTRICTED (`/access-denied?required=build:managed-products:view`). Product not listed.
- Product 3 routes, all denied with the generic "Access Restricted" page (no product data rendered):
  - / and /build/managed-products/3 -> denied, required build:managed-products:view
  - /feedback -> denied, required feedbucket:submissions:view
  - /insights (and ?view=discovery) -> denied, required build:managed-products:view
  - /goals -> denied, required build:goals:view
  - /projects -> denied, required build:view
  - /roadmap -> denied, required build:roadmap:view
  - /releases -> denied, required build:managed-products:view
  - /settings and /settings?tab=members -> denied, required build:managed-products:view
- Non-existent product /build/managed-products/99999 -> same denied page (same required permission). No existence oracle observed for viewer.
- Mutation test: NOT REACHED (no product route renders for viewer; no controls available to try).
- Observation: the denied page text names the permission key (e.g., build:goals:view) to the end user. Low info-disclosure; treated as design choice unless policy says otherwise.

## Actor detail: qaout1012g (Outsider, second tenant)
- Signed in via OTP in a separate incognito session (viewer session signed out first). Org shown in switcher is the outsider's own org, product switcher shows the outsider's own product "BD Product" (not QA data).
- Directory /build/managed-products: "Start with a product — Create one to see delivery in one place" (empty). No QA MP 1013 / QA data listed. NOTE: product switcher in the same session shows "BD Product" while the directory shows empty (inconsistent, see MP-B-021).
- Product 3 routes (no QA data rendered on any route; text grep for QA MP 1013 / QAMP1013 / QA RM / QA GOAL / QA Project / QA Build Org / onboarding friction = no match on each route checked):
  - / and /build/managed-products/3 -> "Product overview" shell + "Not found — This doesn't exist, or you don't have access to it." (no data)
  - /feedback -> "Product not found — This product may have been archived or deleted, or the link is incorrect. Back to products" (no data)
  - /insights -> "Product not found — This product may have been deleted or moved." (no data)
  - /goals -> shell renders with "Link existing goal" and "New Goal" buttons and summary tiles; after load: Total Goals 0 / On Track 0 / At Risk 0 / Avg 0% / Stale 0 and "Not found — This doesn't exist, or you don't have access to it." (no data, counts 0). Inconsistent: summary tiles show 0 but the content is Not found.
  - /projects -> shell ("Linked Projects", "Link existing project") + "Not found — This doesn't exist, or you don't have access to it." (no data)
  - /roadmap -> "Managed Product — Something went wrong — An error occurred while loading this data. Try again" (generic error boundary, not Not found) (MP-B-020)
  - /releases -> same generic "Something went wrong" error boundary (MP-B-020)
  - /settings (and tabs) -> "Product not found — This product may have been archived or deleted, or the link is incorrect."
- Mutation attempt (designated test): on /goals (Not found state) clicked "New Goal", title "RBAC qaout 1013", clicked "Create Goal". Result: toast "Not found — This doesn't exist, or you don't have access to it." Rejected. No QA data returned. Whether a goal was created in outsider's own org was NOT verified (no org-level goals view checked).
- Result: no data leak observed. Route handling is inconsistent (Not found vs Product not found vs generic error boundary) and the "New Goal"/"Link existing goal" controls render on a product the actor cannot access (MP-B-021, MP-B-020).

## Actor detail: qaadm1012d (Product Admin)
- Signed in via OTP in a separate incognito session (outsider session signed out first). Identity confirmed in Account menu.
- Directory and product 3 listed; all product routes load.
- Overview header: "Edit product", "Post update", "Record opportunity" VISIBLE; "Mark reviewed" VISIBLE.
- /feedback: loads (not denied), shows "Capture feedback" and list (Loading results...). Not exercised further (Feedbucket module state unchanged).
- /insights: loads (Overview + Discovery). Opportunity writes not re-tested (covered by owner round).
- /goals: loads; "New Goal" and "Link existing goal" VISIBLE. Mutation: New Goal "RBAC qaadm 1013" (Company, Not Started) -> Create Goal. Result: sheet closed; goal list and "Total Goals" did NOT refresh (still 2 after close); after page reload the goal is present and Total Goals = 3. No success toast captured. Write succeeded (MP-B-022: stale list after create). Record created: TEST-DATA.
- /projects: loads; "Link existing project" VISIBLE (write).
- /roadmap: loads; "Preview", "Publish", "New Item" VISIBLE (writes).
- /releases: loads; "New release" VISIBLE (write); no releases listed.
- /settings?tab=members: loads (after ~10 s); "Add member" VISIBLE; members qamem1012c (Member), qaadm1012d (Admin). Remove/role controls not identified by role-name (not clicked; owner round covered removal).
- Not tested for admin: publish/rotate, feedback capture, release create, project link/unlink, member add/remove (owner round covered these; admin-specific not re-run for budget).

## Round 4 correction (2026-10-13 ~00:20 IST)
- The browser window used for most of Round 4 items 2–6 (incognito window, "Incognito") was signed in as qaadm1012d (product Admin), NOT the owner. Those runs were admin runs. Owner-specific steps were repeated in the owner window (normal profile, qaown1012b) for: Members (remove/add), Post update, Mark reviewed, Edit product (save + revert), Release create/edit/evidence/archive, and the 99999 sweep. See COVERAGE round 4.
