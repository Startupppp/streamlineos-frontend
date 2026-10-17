# COVERAGE.md
# COVERAGE (MP round 1, owner qaown1012b, org QA Build Org 1012b)
| Area | Status | Notes |
|---|---|---|
| Sign-in | Already signed in as owner session at start; OTP not needed | no OTP used |
| /build/managed-products empty state | Covered | Empty state "Start with a product" shown |
| Create product (empty name/key, valid) | Covered partially | Key required (see MP-U-001); create OK; list stale (MP-B-001) |
| Product overview /managed-products/3 | Covered (read) | Loaded; Unassigned owner; Needs attention |
| /feedback capture: empty + whitespace message validation | Covered | "Message is required" shown |
| /feedback capture: invalid reporter email | Covered | "Invalid email" shown |
| /feedback capture: valid submit | BLOCKED | Feedbucket module not enabled -> HTTP 402 (MP-B-002); not enabled by tester |
| /feedback classify / duplicate / route to intake / link opportunity | NOT REACHED | blocked by Feedbucket module |
| /insights Discovery: new opportunity validation (empty/whitespace title) | Covered | "Title is required" |
| /insights new opportunity: non-numeric baseline | Covered | 500 (MP-B-003) |
| /insights new opportunity: long title | Covered | created; overflow (MP-B-004) |
| /insights opportunity detail: open from table | Covered | opens sheet (Details/Trace tabs) |
| /insights score (RICE) validation: empty reach, conf 1.5, effort 0 | Covered | inline errors OK |
| /insights score save valid -> live RICE & trace | Covered | 400.00 |
| /insights override: empty reason, blank reason, negative | Covered | MP-B-005 |
| /insights override valid + trace | Covered | 250.00 overridden, trace shows score 250 + reason |
| /insights start validating / accept (horizon/note) | Covered | Accepted; roadmap initiative created |
| /insights trace tab | Covered | Evidence 0, Opportunity, Score, Decision with note |
| /insights decline / evidence linking / recommendation evidence | NOT YET (see later) |
| /insights deep link + reload | Covered | MP-B-007 |
| /insights decline (reason required, blank validation, success toast, trace) | Covered | "Opportunity declined." toast; trace shows Declined + reason |
| /insights search q= URL sync | Covered | search works, q=decline in URL |
| /insights State filter | Covered - BUG | MP-B-008 |
| /insights Evidence linking / outcome review schedule | NOT REACHED | needs feedback evidence (Feedbucket blocked) |
| /roadmap views Board/Timeline/List + URL view= sync | Covered | URL view param updates (with lag); List shows Title only + horizontal scroll (MP-U-003) |
| /roadmap item detail via ?item= + Escape closes | Covered (partial) | Escape closes; focus-return NOT verified |
| /roadmap create item: empty title validation | Covered | "Title is required" |
| /roadmap create item: double-click | Covered - BUG | MP-B-009 |
| /roadmap RICE sync from accepted opportunity | Covered - BUG | MP-B-010 |
| /goals create goal | Covered - BUG | MP-B-011 duplicate + raw error |
| /goals unlink (confirm dialog) / link existing | Covered | works; stale totals MP-B-012 |
| /roadmap Publish / Preview / public roadmap | NOT YET |  |
| /releases /projects /settings | NOT YET |  |

## Round 2 (2026-10-13 ~23:10 IST)
| Area | Status | Notes |
|---|---|---|
| Settings > Publishing: Publish roadmap (first publish) | Covered | Token shown once in panel; "Copy this link now" warning shown |
| Public link in private/incognito window (anonymous) | Covered | Shows only the public item (title, Now/Next/Later columns). No outcome/RICE/decision note/internal fields visible. Header shows org name "QA Build Org 1012b", not product name (new note in report) |
| Public flag on roadmap item (Edit sheet, Public toggle) | Covered | Short-title item made public OK; long-title item cannot save (MP-B-014) |
| Rotate share link (confirm "Rotate link") | Covered | New link issued; old link -> "Not found" page |
| New rotated link works | Covered | Shows public item |
| Unpublish (confirm) / revoke | Covered | After reload: "Publish roadmap" (unpublished). Rotated link -> "Not found"; original link -> "Not found" |
| Expired token | NOT REACHABLE | Panel shows "Expires: No expiry" only; no expiry control found in UI |
| Unpublish confirm UI state | Observation | After clicking confirm, panel still showed "Published" for >4 s; state was unpublished after a later click + reload. Not reproduced cleanly (see MP-U-008) |
| Members: last-manager rule | NOT YET | |
| Directory search/filters/URL/back-forward | NOT YET | |
| Projects set primary / unlink / relink | NOT YET | |
| Roadmap detail keyboard + Escape focus return | NOT YET | |
| Narrow 375px overflow sweep | NOT YET | |

### Round 2 continued
| Area | Status | Notes |
|---|---|---|
| Members: remove last Admin (qaadm1012d) | Covered - BUG | MP-B-015: silent no-op, row stays after reload. No role/demote control in UI (NOT REACHABLE) |
| Members: remove a non-admin Member, list refresh | NOT REACHED | Not removed (would need re-add of qamem1012c; avoided) |
| Members: add member / invite | NOT REACHED | |
| Directory search (q=) + URL sync | Covered | ?q= set; empty filtered state "No products match" + "Clear filters" works (Clear filters restores list) |
| Directory status filter (Archived/Active) + chip | Covered | URL ?status=archived / active; chip shows raw lowercase value (MP-U-006) |
| Directory Filters panel (Segment, Tag, Project, Archived, Sort) | Opened only | Escape closes it |
| Directory table <-> grid toggle + URL ?view=grid | Covered | Works |
| Directory Back/Forward | Covered - UX | Back skipped filter steps (MP-U-005) |
| Directory refresh | Covered | state persisted (q, view) |
| Directory "Loading results…" with screenshot | Observation | innerText reads show "Loading" while screenshot shows content; treated as tool/render timing, not logged as bug |
| Projects: link (Delta) confirm sheet "will become primary" | Covered | MP-B-016 stale list after link |
| Projects: unlink (confirm) | Covered | list refresh OK |
| Projects: relink | Covered | OK after reload |
| Projects: "set primary" control | NOT FOUND | no primary badge or action on product projects tab (MP-B-016) |
| Roadmap detail: mouse open -> Escape -> focus returns to row | Covered | focus returns to same row |
| Roadmap detail: keyboard open (Enter/Space on row) | Covered - BUG | MP-B-017 |
| Roadmap Board/Timeline keyboard reach | Covered - BUG | MP-B-017 (cards not tabbable) |
| Narrow ~300% (427px) / 400% zoom: product overview | Covered (partial) | Mobile layout with bottom nav; no overflow seen on header/actions |
| Narrow: insights overview | Covered (partial) | Fits; Overview/Discovery toggle fits |
| Narrow: directory table | Covered - observation | Table header clipped at card edge (scrolls horizontally within card; Actions column off-screen) (MP-U-009) |
| Narrow: roadmap list | Covered - observation | Known horizontal scroll (MP-U-003) |
| Narrow: releases, goals, projects, settings, feedback routes | NOT REACHED | address-bar navigation unreliable in the window; no screenshot captured |
| Publishing: expired token | NOT REACHABLE | "Expires: No expiry", no control (MP-U-007) |

## Round 4 (2026-10-13 ~00:00–01:10 IST, Manage Product, product 3)
Actor note: the window I first used (incognito) was signed in as qaadm1012d, not the owner. Items 2–6 were first run there as ADMIN. Owner-specific steps were repeated in the owner window (qaown1012b, normal profile). See RBAC.md "Round 4 correction".

| Area | Actor | Status | Notes |
|---|---|---|---|
| 1. Outsider: goal 'RBAC qaout 1013' in own org | qaout1012g (OTP, 2 sends) | Covered | Outsider Org 1012g goals: Total 0, "No goals yet". Goal NOT present, nothing deleted. |
| 2. Non-existent product 99999, all suffixes | owner (owner window) + admin | Covered | Overview: "Not found" (no CTAs). /feedback, /insights, /insights?view=discovery, /settings, ?tab=members/publishing/feedback-channels: "Product not found". /goals and /projects: shell with New Goal / Link existing goal / Link existing project + zero tiles + "Not found" (same as MP-B-021). /roadmap and /releases: generic "Something went wrong" boundary (same as MP-B-020). Console: 404 on /build/managed-products/99999 (+ /insights and agent-pulse), 503 on notifications. Same behaviour for owner and admin; confirms MP-B-020/021 are not outsider-specific (no new bug filed). |
| 3. Members: add | owner | Covered | Add member → qaown1012b (done in admin run) and qamem1012c re-added as Member (owner run). Toast "Member added."; row appears after a few seconds (see MP-B-025). Dropdown lists ALL org members including existing product members (see MP-U-010). |
| 3. Members: remove non-admin | owner | Covered - BUG | Removed qamem1012c → "Member removed." → row still listed for ~6 s, gone later/after reload (MP-B-025). Re-added qamem1012c as Member. |
| 3. Members: change role | owner | NOT REACHABLE (no control) / partial | Row has no role control; clicking the row opens nothing. Add-with-role "Admin" for existing member → "This person is already a member of this product." (no role change). Last-admin demotion not testable (MP-B-015). |
| 4. Releases: create with ALL fields | owner + admin | Covered - workaround works | Owner qaown1012b, QA state Approved, Deployment URL, Canonical project release (QA Project Alpha → R11 release 1013), date 20 Oct 2026, description, Status Draft → "Create release" saved (both runs). Sheet shows "Creating…" for ~6–10 s before closing. MP-B-013 still open for blank optional fields (not re-tested with blanks). |
| 4. Releases: edit + refresh persistence | owner + admin | Covered | Name/QA state/URL edit → "Release updated." → persists after reload (In review). |
| 4. Releases: evidence links | owner + admin | Covered - observation | "View evidence" is read-only: Tickets 0, Test runs 0, Incidents 0, Approval state "Not set" (MP-B-026). No add-link control found. Evidence links NOT REACHABLE to add. |
| 4. Outcome review schedule / complete | owner | NOT REACHABLE | No schedule/complete control found: Overview "Measured outcomes" is read-only (Reviews scheduled 0, Completed 0, Latest review "Not measured yet"); goal detail Outcomes tab only says outcome reviews "will appear here"; Insights overview has no review control. |
| 4 (found while verifying) Overview after a release exists | owner + admin | BUG | Overview crashes to "Something went wrong" (MP-B-023, Critical). Fixed by archiving the test release (overview loads again). |
| 5. Overview: Post update | owner + admin | Covered - BUG | Empty body → "Body is required". Post → "Product update posted."; update NOT visible on overview (MP-B-024). |
| 5. Overview: Mark reviewed | admin (+ owner state check) | Covered | "Reviewed just now"; activity "Marked … as reviewed today"; button disappears once reviewed. |
| 5. Overview: Edit product | owner + admin | Covered | Health and description save → "Managed product updated" → persists; reverted (description back, health Unknown). |
| 5. Disposable product 'QA MP 1013 B' | admin (create) + owner (archive/restore) | Covered | Created (key QAMP1013B). Archive (confirm "Archive") → shows in ?status=archived with "Archived" badge; hidden from ?status=active; All statuses shows it with badge. Restore → "Managed product restored" → back in active view. Archive toast not captured. Chip shows raw "Status archived" (MP-U-006). |
| 6. Narrow 300% zoom (Chrome 300%, reset to 100% and verified) | admin window (no actor effect) | Covered - partial | Goals: header actions and tabs fit. Settings: rightmost control within viewport. Projects: Link existing project within viewport. Releases: stats row / header actions appear to extend past the right edge (bounding boxes ≈685 vs ≈640 px viewport); horizontal wheel did not move them; floating companion covers the top-right, so this is NOT conclusive (MP-U-015). Feedback: generic error boundary at 300% (MP-B-027, not reproduced at 100%). Overview not re-checked at 300% after the release-crash fix. |
| Not reached | - | - | Round 4 item 4 evidence-link add and outcome review schedule/complete (no UI found). Blank-optional release create re-test. Member role change (no control). Owner-window re-run of the full Feedback capture (blocked by Feedbucket 402, MP-B-002). |
