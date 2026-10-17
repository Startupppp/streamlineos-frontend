# TEST-DATA (records created during MP QA round 1, 2026-10-13)
Org: QA Build Org 1012b (owner account qaown1012b)
- Product: "QA MP 1013" key QAMP1013 (created 2026-10-13 ~22:55 IST, owner account, Lifecycle/Health unset)
- Failed feedback capture attempt (402, nothing saved): message "<script>alert(1)</script> QA 1013 export is slow..." — not persisted (server returned 402)
- Opportunity #1: title "QA MP 1013 <b>onboarding</b> friction " x12 (~480 chars), Problem/Hypothesis/Segment/Theme/Outcome/metric blank, Baseline/Target blank. Created on product 3 (insights Discovery)
- Failed opportunity create (500, nothing saved): title "QA MP 1013 onboarding friction..." with Baseline "abc"
- Opportunity #1 scored RICE 400.00 (Reach 1000, Impact Medium, Confidence 0.8, Effort 2 person-weeks) -> overridden to 250 with reason "Sales escalation <script>alert(2)</script> & exec ask" -> started validating -> ACCEPTED (Horizon Next, visible to customers OFF, note "QA accept note 1013"). Created linked roadmap initiative (auto-created by accept).
- Failed override attempt (400, not saved): -5 with reason "QA negative edge <script>alert(2)</script> & test"
- Opportunity #2 "QA MP 1013 decline candidate" (Problem "Problem text for decline test", theme Exports) -> DECLINED, reason "Out of scope for Q4 <i>test</i> & \"quotes\""
- Roadmap item (auto-created when Opportunity #1 was accepted): "QA MP 1013 <b>onboarding</b> friction..." horizon Next, Private, RICE params Reach 1000 / Impact 3 / Confidence 80% / Effort 2 (card shows RICE 1200)
- Roadmap item(s) created by double-click test: "QA RM 1013 <script>alert(3)</script> dblclick test" x2 (Now, Planned, Outcome "Outcome QA 1013") — DUPLICATE, 2 records
- Goal "QA GOAL 1013 linked" (Company level, Not Started, Unassigned) — created TWICE (duplicate, MP-B-011); both linked to QA MP 1013 goals tab. Org-level records.
- Goal 2 (id 2) unlinked then re-linked to QA MP 1013 (no net change). Goal 1 (id 1) still linked to QA MP 1013 (duplicate of goal 2 created by MP-B-011; kept, to be reported for cleanup)
- Releases: NONE created (all attempts 400, see MP-B-013). Attempts: "QA R1013 <b>Alpha</b> & \"x\"" (failed), "QA R1013 Alpha" 1013.0 (failed), "QA R1013 Beta" 1.0.1 (failed, release date 20 Oct 2026 set)
- Linked project: "QA Project Alpha" linked to QA MP 1013 (primary per confirmation sheet) — linked via /projects

## Round 2 (2026-10-13 ~23:10 IST)
- Roadmap item "QA RM 1013 <script>alert(3)</script> dblclick test" (the first of the two duplicates, Now/Planned): set Public = ON (saved). Public flag ON (saved). Board/list show it as public; it appears on the public board when the link is live.
- Roadmap item "QA MP 1013 <b>onboarding</b> friction…" (Next, from accepted Opportunity #1): NOT changed (save blocked by MP-B-014, Public still OFF).
- Product 3 publishing: link issued/rotated/unpublished during test; currently UNPUBLISHED (Publish roadmap button shows). Share tokens are not recorded here (one-time display; both tokens revoked).
- Project link: QA Project Delta (QZG) was linked to product 3 via Link existing project (it had no prior product links, so it became primary per the confirm sheet). Unlinked and relinked; CURRENTLY LINKED to product 3. Not moved from another product.
- Members product 3: qaadm1012d (Admin) removal attempted twice -> no change (still listed). qamem1012c (Member) untouched.
- Publishing product 3: link rotated once and unpublished; no active public link at end of round (both tokens return "Not found"). Tokens are not recorded here.
- Roadmap item edit attempts on the long-title item failed (no change saved).

## RBAC round (2026-10-13 ~23:30 IST, Manage Product RBAC)
Records created in this round:
- Goal "RBAC qaadm 1013" (Level Company, Status Not Started, Owner Unassigned), created by qaadm1012d (product Admin) from product 3 Goals. Appears in product 3 goals after reload; Total Goals went 2 -> 3. Org-level goal in QA Build Org 1012b, linked to product 3. Cleanup candidate (keep as RBAC evidence or unlink).

Attempts that created NOTHING (verified):
- qamem1012c (Member): "New Goal" "RBAC qamem 1013" -> rejected ("Missing permission: build:goals:manage"). Product goals list still empty afterwards.
- qaview1012e (Org viewer): no product route renders (access denied everywhere); no write attempted.

Attempts whose outcome is NOT fully verified:
- qaout1012g (outsider, second tenant): "New Goal" "RBAC qaout 1013" -> UI toast "Not found — This doesn't exist, or you don't have access to it." Sheet stayed open. Expected: nothing created. Not verified in the outsider's own org (not re-checked, to avoid a further cross-tenant probe). If it exists, it would be a goal in the outsider's tenant titled "RBAC qaout 1013" with no link to product 3. Check and clean up if present.

Sessions and mailboxes used (Guerrilla Mail, sharklasers.com):
- qamem1012c@sharklasers.com (1 OTP send), qaview1012e@sharklasers.com (1 OTP send), qaout1012g@sharklasers.com (1 OTP send), qaadm1012d@sharklasers.com (1 OTP send). Total 4 OTP sends this round. Codes not recorded.
- Sign-out performed (Account menu > Sign out) between actors in the incognito window. Owner session in the default window was not signed out.

Zoom: browser zoom on streamlineos.in reset to 100% (Ctrl+0) at start.

## Round 4 (2026-10-13 ~00:00–01:10 IST)
- Owner note: items were first run in the incognito window, which was signed in as qaadm1012d (admin). Owner steps were repeated in the owner window. Nothing else changed.
- Product 3 members: qaadm1012d (Admin) unchanged; qamem1012c (Member) removed once and re-added as Member; qaown1012b added as Member (admin run). Current: qaadm1012d Admin, qamem1012c Member, qaown1012b Member.
- Product 3 posted updates: "QA MP 1013 round 4 update …" (admin run, toast success, not visible on overview), "QA R4 1013 status update plain text" (admin run, toast success), "QA R4 1013 owner-window update …" (owner run, dialog closed; not verified visible). Treat as posted but not visible (MP-B-024).
- Product 3 Mark reviewed: done (state "Reviewed").
- Product 3 Edit product: description temporarily changed and reverted to "Desc QA 1013 product"; health temporarily At risk / Off track and reverted to Unknown. Current values = original.
- Releases created and then ARCHIVED (to keep the Overview usable; they still exist in the Archived view):
  - "QA R1013 Full" (later renamed "QA R1013 Full EDIT"), version 1013.1, owner qaadm1012d, QA state In review, deployment URL https://ci.example.com/build/1013-b, canonical R11 release 1013 (QA Project Alpha), date 20 Oct 2026. Created by admin run; archived.
  - "QA R1013 Owner Full EDIT", version 1013.2, owner qaown1012b, QA state In review, canonical R11 release 1013, date 20 Oct 2026. Created by owner run; archived.
- Product "QA MP 1013 B" (key QAMP1013B): created (admin run), archived and restored (admin run and owner run). Currently ACTIVE. Disposable; can be deleted from the directory row menu if wanted.
- Outsider org (Outsider Org 1012g): goal 'RBAC qaout 1013' NOT present (goal total 0). Nothing created or deleted.
- Accounts: qaout1012g signed in once (2 OTP codes sent; one code page was lost after an accidental "Continue with Google" click, which did not complete). Outsider signed out at the end. Admin qaadm1012d signed out in the incognito window to make room for outsider. Owner qaown1012b still signed in in the normal-profile window. Codes are not recorded.
