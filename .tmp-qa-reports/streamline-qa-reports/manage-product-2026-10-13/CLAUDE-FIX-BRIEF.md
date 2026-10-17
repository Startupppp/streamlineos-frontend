# Claude Code fix brief: StreamlineOS Manage Product module (QA run manage-product-2026-10-13)

Paste this whole file into Claude Code at the root of the StreamlineOS repository.

## 1. Role and instructions

You are fixing confirmed bugs in the **Manage Product** module of StreamlineOS. The frontend is a Next.js/React app (`frontend/`) served at https://www.streamlineos.in. The API (`backend/`, NestJS-style) is served at https://api.streamlineos.in. File paths were not known when this brief was written. Find code with the search hints given: UI routes `/build/managed-products`, `/build/managed-products/:id/{feedback,insights,goals,projects,roadmap,releases,settings}`, API endpoints under `/build/managed-products/...` (for example `POST /build/managed-products/:id/releases`, `GET /build/managed-products/:id/summary`), `/feedbucket/...`, and the exact UI strings in quotes. Use `rg` for the exact strings first.

The bug list below is final (MP-B-001 to MP-B-027). Fix only these bugs. Do not fix, refactor or restyle anything else, even if you notice it.

Rules:

1. **Work in priority order:** Critical, then High, then Medium, then Low. Within a severity, follow the order in this file. Fix each shared root cause (section 2) once, when you reach the first bug that needs it, and then confirm the other bugs in that group.
2. **Verify in code first.** Before changing anything for a bug, find the code path and confirm the cause described under "Likely cause". Causes are inferred from browser behaviour and network logs, not from source. If the code shows a different cause, fix the real one and say so in your summary.
3. **Make the smallest correct change.** Fix the root cause, not the symptom. Do not redesign components, rename APIs, change response shapes other callers rely on, or add libraries unless a bug cannot be fixed otherwise (say why if you do).
4. **Fix shared root causes once, in one shared place** (section 2): one submit in-flight guard; one invalidation helper/pattern per resource; one error-to-message mapper; one title-length constant (200) shared by client and server; one not-found/denied handling path for the product shell.
5. **Tests:** where the repo has tests for the touched area (API unit/e2e, component tests, Playwright), add or update tests that cover the acceptance criteria. Do not create a new test framework. Run the existing test, lint and type-check commands and keep them passing.
6. **Do not change unrelated behaviour.** Everything in section 5 (regression checklist) must keep working.
7. **Policy defaults** (section 1a) are the behaviours chosen for this brief where the QA report left a choice open. Implement them and list them in your summary under "Policy decisions to confirm".
8. **MP-B-027 is needs-recheck:** do not write a speculative fix. Re-test it after MP-B-002 is fixed and report the result.
9. **No secrets.** Do not put passwords, OTP codes, share tokens, invite tokens or keys in code, tests, fixtures, logs or your summary. QA account names below are for reference only.
10. If you cannot reproduce or fix a bug with a reasonable change, stop on that bug, write what you found, and continue with the next one.
11. **Final output:** end with a table with one row per bug ID:

    | ID | Severity | Fixed (yes / partial / no / needs-recheck) | Root cause confirmed in code? | Files changed | How verified (test name, manual steps, or reason not verified) |
    |---|---|---|---|---|---|

    After the table add: "Policy decisions to confirm", "Follow-ups" (anything deliberately left out), and the commands you ran with their results.

**Test context.** QA product: id 3, key QAMP1013, name "QA MP 1013 Renamed <i>x</i>" (the HTML is literal test text), org "QA Build Org 1012b". Accounts: owner qaown1012b (org Owner), qaadm1012d (product Admin), qamem1012c (product Member), qaview1012e (org viewer, not a product member), qaout1012g (outsider, second tenant). Linked projects: "QA Project Alpha", "QA Project Delta (QZG)". Feedbucket is NOT enabled for the QA org (returns 402). Record ids quoted below come from the QA run; create your own local data. Titles containing `<script>`/`<b>` are intentional; they were stored and rendered as text (correct, keep it that way).

### 1a. Policy defaults chosen for this brief

| # | Topic | Default chosen | Bugs |
|---|---|---|---|
| P1 | Title length | **200 characters** (the existing server limit on roadmap items) for opportunity titles and roadmap item titles, enforced in client and server from one shared constant. Counter shown in the form. | MP-B-004, MP-B-014 |
| P2 | Legacy over-long titles | Existing records with titles >200 stay readable. The Edit form shows the inline title error with a counter so the user can shorten it; the auto-created roadmap title from an opportunity accept is truncated to 200 chars (with "…") server-side. No data migration. | MP-B-014 |
| P3 | Optional release fields | Client omits empty optional fields; server also accepts `null` for optional fields (tolerant on both sides). "QA state: None" = field omitted. | MP-B-013 |
| P4 | Feedbucket not enabled | Do not enable the module. Hide/disable "Capture feedback" / "Collect via Feedbucket" and show the existing "Module not enabled" gate up front; any 402 is shown as a plain message. | MP-B-002, MP-B-027 |
| P5 | Last product Admin | Removing (or demoting) the last product Admin is **blocked** server-side with 409/400 and the message "Can't remove the last Admin. Add or promote another Admin first." shown in the dialog. Adding a role selector is optional (only if trivial); report it as a follow-up otherwise. | MP-B-015 |
| P6 | Summary for restricted roles | Goal summary aggregates use the same read filter as the list. If the actor cannot list goals, tiles show the same visible count (0) or are hidden. | MP-B-018 |
| P7 | Outsider / unknown product | One state for every product route: "Product not found" (404 contract), no write buttons, no tiles. | MP-B-020, MP-B-021 |
| P8 | Accepted opportunity RICE | The roadmap item uses the opportunity's numeric impact mapping (same scale) and carries the override score when present, with a "Source: opportunity (overridden)" label. | MP-B-010 |
| P9 | Evidence approval block | Show the release QA state in the evidence sheet ("QA state: Approved"); if approval is a separate workflow, label it "Release approval: Not set" separately. | MP-B-026 |
| P10 | Raw permission keys on the /access-denied page | Out of scope (treated as design choice in RBAC.md). Only the toast in MP-B-019 changes. | MP-B-019 |

---

# 2. Shared root causes

Fix each group once. A bug may appear in more than one group.

## G1 Stale lists after mutation (missing query invalidation)
- **IDs:** MP-B-001, MP-B-012, MP-B-016, MP-B-022, MP-B-024, MP-B-025 (also MP-B-011 post-create path; UX MP-U-008)
- **Root cause:** Mutations succeed (toast shows) but do not invalidate/update the queries that display the record: product directory list, goals list + goals summary, linked-projects list, members list, product summary (overview).
- **Fix once:** For each managed-product resource, on mutation success invalidate (or `setQueryData`) every query keyed on that product: list, summary, detail. Use the data-fetching library already in the repo (e.g. TanStack Query `invalidateQueries` with a shared key prefix like `['managed-products', id, ...]`). Prefer a small helper `invalidateManagedProduct(id, parts)` used by all mutations.

## G2 No double-submit guard
- **IDs:** MP-B-009, MP-B-011, MP-B-006 (Accept form stays enabled)
- **Root cause:** Submit buttons show "Saving…" but still accept a second click; forms do not close on success.
- **Fix once:** One reusable in-flight guard (ref set synchronously on first call + `disabled` while pending, released on settle). Apply to every create/save button in the module (product, opportunity, score, override, accept, decline, roadmap item, goal, release, post update, link project, add/remove member). Close the sheet on success.

## G3 Raw server errors / silent 4xx/5xx
- **IDs:** MP-B-002, MP-B-003, MP-B-005, MP-B-011, MP-B-013, MP-B-014, MP-B-015, MP-B-019, MP-B-021 (sheet stays open on "Not found")
- **Root cause:** Some mutations swallow non-2xx (402, 400, 409) with no UI; others print raw text ("e.items is not iterable", "title: Too big: expected string…", "Missing permission: build:goals:manage"). Bad numeric input reaches the server and causes 500.
- **Fix once:** One error mapper: `VALIDATION_FAILED` details → inline field errors with friendly labels; 402 → "This module isn't enabled for your organisation"; 403 → "You don't have permission to do this"; 404 → "This product isn't available"; 409 → server message; anything else → generic message (never the JS exception text). Server validates numeric fields and returns 400, never 500, for user input.

## G4 Summary schema mismatch (client contract vs summary payload)
- **IDs:** MP-B-023 (also MP-B-024, MP-B-012/018/022 summary tiles)
- **Root cause:** `GET /build/managed-products/:id/summary` returns `previews.releases[]` in a shorter shape than the client release schema (missing `recordRevision`, `ownerUserId`, `deploymentEvidenceUrl`, `projectReleaseId`, `projectRelease`, `allowedActions`, `linkedRoadmapItemCount`, and a `qaState` value outside the enum). The client throws `ApiContractError CONTRACT_VIOLATION` and the page-level boundary replaces the whole Overview.
- **Fix once:** Make the summary preview use the same serializer as the release list (or give the preview its own narrower client schema) and reconcile the `qaState` enum. Scope error boundaries to widgets so one bad section does not blank the page.

## G5 Title length 200 consistency
- **IDs:** MP-B-004, MP-B-014 (UX MP-U-003)
- **Root cause:** Opportunity create has no cap; roadmap item has a 200 cap server-side only; accept copies the long title into a roadmap item that then cannot be saved.
- **Fix once:** Shared `TITLE_MAX = 200` used by opportunity and roadmap DTOs and forms (counter + inline error), accept path truncates (P1/P2), and table cells truncate with ellipsis + tooltip.

## G6 Not-found / denied state consistency
- **IDs:** MP-B-020, MP-B-021, MP-B-018, MP-B-019
- **Root cause:** Each product route handles a missing/unauthorised product differently; the product shell renders action buttons and tiles before (and regardless of) the product lookup result; UI controls are not gated by the same permission the server checks.
- **Fix once:** The product layout resolves the product first; on 404/403 render one "Product not found" state and nothing else. Roadmap and releases loaders map 404/403 to that state instead of throwing. Gate write CTAs (New Goal, Link existing goal, Link existing project, etc.) on the same permission keys the server uses (`build:goals:manage`, …), and apply list read filters to summary aggregates.

## G7 Keyboard accessibility
- **IDs:** MP-B-017, MP-B-008 (filter options not keyboard-toggleable)
- **Fix once:** Clickable rows/cards get `role="button"`/`tabIndex=0` (or a real button/link on the title) and Enter/Space handlers calling the same open handler; multi-select options use the component library's checkbox item with `onSelect` toggling.

## Stand-alone bugs
- MP-B-007 (deep link), MP-B-010 (RICE carry-over), MP-B-026 (evidence approval state), MP-B-027 (needs-recheck).

---

# 3. Bugs, in severity order

Counts: **Critical 2, High 5, Medium 8, Low 12 (one of them, MP-B-027, needs-recheck). Total 27.**

# Critical

## MP-B-013: "New release" cannot be created: POST /releases returns 400 VALIDATION_FAILED when optional fields are blank; no message shown
**Severity:** Critical | **Groups:** G3 | **Policy:** P3

**Where:** /build/managed-products/3/releases → "New release" side-sheet → "Create release". Actor: owner.

**Steps:**
1. Open Releases (no releases). Click "New release".
2. Name "QA R1013 Alpha", Version "1013.0", leave other fields at defaults.
3. Click "Create release".

**Expected:** Release created and listed under active/upcoming releases; optional fields omitted.

**Actual:** Sheet stays open, no visible error, no row. `POST /build/managed-products/3/releases` → 400 `VALIDATION_FAILED` with details: `description`, `releaseDate`, `ownerUserId` "expected string, received null"; "QA state: None" sent as an invalid option (allowed: pending|in_review|approved|rejected); empty Deployment evidence URL rejected; even with every field filled, `projectReleaseId` "expected number, received null" when Canonical project release is blank. 5 attempts, nothing created.

**Likely cause:** Form serialises unset optional fields as `null`/`""` and "None" as a literal; the server zod/DTO schema marks them `optional()` but not `nullable()`.

**Fix:** Client: strip `null`/`""` optional keys before submit and map QA state "None" to omitted. Server: accept `null` for optional fields (`.nullish()`), treat empty URL as absent. Show validation errors inline via the G3 mapper. Search: "New release", "Create release", `projectReleaseId`, `deploymentEvidenceUrl`, `qaState`.

**Acceptance criteria:**
- Name + Version only → 201, sheet closes, release appears without reload.
- Each optional field (description, date, owner, QA state, URL, canonical project release) can be set or left blank independently.
- API test: POST with optional fields `null` and with them omitted both succeed; invalid URL returns 400 with field error shown inline.

## MP-B-023: Product Overview crashes to "Something went wrong" once a release exists (summary contract violation)
**Severity:** Critical | **Groups:** G4

**Where:** /build/managed-products/3 (Overview), query `GET /build/managed-products/3/summary`. Any actor with access.

**Steps:**
1. Create a release with all fields (works with MP-B-013 workaround), optionally edit it (QA state In review).
2. Open or reload the Overview (or Post update).

**Expected:** Overview renders, release counted in Upcoming and shown in the Releases preview.

**Actual:** Error boundary "Something went wrong — An error occurred while loading this data." "Try again" does not recover. Console: `ApiContractError CONTRACT_VIOLATION endpoint /build/managed-products/3/summary` (HTTP 200), issues on `previews.releases.0`: `recordRevision`, `ownerUserId`, `deploymentEvidenceUrl`, `projectReleaseId`, `projectRelease`, `allowedActions`, `linkedRoadmapItemCount` undefined; `qaState` not in enum. Releases page itself loads the same release fine. Archiving the release restores the Overview.

**Likely cause:** Summary builds release previews with a separate, shorter select/serializer and a different qaState value; client reuses the full release schema for previews; boundary is page-level.

**Fix:** Return previews via the same release serializer (or define a narrower `ReleasePreview` client schema that matches what summary sends — choose whichever is the smaller change, do not break other summary consumers); reconcile qaState values; wrap each Overview widget in its own boundary. Search: `ApiContractError`, `CONTRACT_VIOLATION`, `previews`, `summary`.

**Acceptance criteria:**
- With 1+ releases (each QA state, with and without owner/project release), Overview loads and shows the release in the preview.
- Contract/e2e test: create release → GET summary → parses with client schema.
- Forcing one widget's data to fail shows an error only in that widget; Post update / Mark reviewed / Edit product remain usable.

# High

## MP-B-002: "Capture feedback" fails silently (HTTP 402) with no message
**Severity:** High | **Groups:** G3 | **Policy:** P4

**Where:** /build/managed-products/3/feedback → "Capture feedback" → "Capture". Actor: owner. Feedbucket not enabled for the org.

**Steps:** 1. Open Feedback. 2. "Capture feedback". 3. Message (any, incl. `<script>` text and emoji), Source Support, Type Bug, Theme Exports. 4. "Capture".

**Expected:** Success, or a visible plain explanation (module not enabled; admin can enable in Settings → Modules). CTA hidden/disabled when the module is off.

**Actual:** No toast or inline message; sheet stays open. `POST /feedbucket/submissions/capture` → 402. `/feedbucket/submissions`, `/facets`, `/customer-impact` also 402; the "Module not enabled" gate appears only after the failed call (before that a loading skeleton).

**Likely cause:** Capture mutation has no onError UI; module-enabled state is not checked before rendering CTAs; route gate is derived from a later failed query.

**Fix:** Check module entitlement up front (existing org modules/entitlement query) and render the gate immediately, hiding "Capture feedback"/"Collect via Feedbucket". Map 402 to a plain message via G3 in the sheet. Do not enable the module.

**Acceptance criteria:**
- Module off: gate shows on first render, no capture CTA, no 402 spam from the page.
- If a 402 still occurs, a plain message shows in the sheet and toast.
- Module on (test env/mocked): capture succeeds, sheet closes, list updates.

## MP-B-008: Opportunity "State" filter does not apply; one click crashed Insights to the error boundary
**Severity:** High | **Groups:** G7

**Where:** /build/managed-products/3/insights?view=discovery → Opportunities → "State" filter. Actor: owner.

**Steps:** 1. Have 2 opportunities (Declined, Accepted). 2. Click "State". 3. Click "Declined" (mouse or ArrowDown+Enter).

**Expected:** Option checked, label "State (1)", list shows only Declined, URL carries the filter.

**Actual:** Option never checks, list unchanged, no URL param. Once, the click replaced the whole Insights page with "Something went wrong"; "Try again" did not recover; reload did.

**Likely cause:** Multi-select item not wired to state (wrong handler/value type, e.g. click on label vs `onSelect`), possibly throwing on an undefined value; boundary wraps the whole page.

**Fix:** Use a controlled checkbox item with `onSelect` toggling a Set of states; sync to URL (`state=declined,...`) and read it on load; scope the boundary to the list.

**Acceptance criteria:**
- Mouse and keyboard toggle options; label shows count; list filters; URL updates and survives reload; clearing restores all.
- Rapid repeated clicks do not crash; any list error does not unmount the page header/tabs.
- Component test for toggle + filtering.

## MP-B-009: Double-click "Create Item" creates duplicate roadmap items
**Severity:** High | **Groups:** G2

**Where:** /build/managed-products/3/roadmap (timeline or board) → "New Item" → "Create Item". Actor: owner.

**Steps:** 1. "New Item". 2. Title, Outcome, Horizon Now, Status Planned. 3. Double-click "Create Item".

**Expected:** Exactly one item; button disabled while saving.

**Actual:** Two identical items created (Now count 2); "Saving…" for several seconds.

**Likely cause:** Disabled state depends on async `isPending` which is not set before the second click.

**Fix:** Apply G2 guard; optionally an idempotency key per sheet session if the API supports it cheaply.

**Acceptance criteria:** Double/triple click creates one item (test asserts one POST); button disabled until settle; re-enabled on error.

## MP-B-011: "New Goal" saves but sheet stays open with raw "e.items is not iterable"; re-submit creates duplicates
**Severity:** High | **Groups:** G1, G2, G3

**Where:** /build/managed-products/3/goals → "New Goal" → "Create Goal". Actor: owner.

**Steps:** 1. Goals (empty). 2. "New Goal", Title "QA GOAL 1013 linked", Company, Not Started. 3. "Create Goal". 4. Click "Create Goal" again.

**Expected:** Sheet closes on success, goal appears once, success toast.

**Actual:** Goal appears, but sheet stays open with red toast "e.items is not iterable"; second click creates a duplicate.

**Likely cause:** onSuccess handler updates the cache with `[...old.items, new]` (or similar) where the cached shape lacks `items` (list vs paginated shape mismatch), throws, so close never runs and the error text is toasted.

**Fix:** Replace the manual cache spread with invalidation (G1) or guard the shape; close sheet before/independent of cache updates; G2 guard; G3 mapper so JS exception text is never shown.

**Acceptance criteria:** One click → one goal, sheet closes, success toast, list + "Total Goals" update immediately; no raw error text; double click creates one goal.

## MP-B-014: Roadmap item with title >200 chars cannot be edited; raw "title: Too big…" toast
**Severity:** High | **Groups:** G5, G3 | **Policy:** P1, P2

**Where:** /build/managed-products/3/roadmap?view=board → edit pencil on the item auto-created from accepted opportunity → change Public (or any field) → "Save Changes". Actor: owner.

**Steps:** 1. Accept an opportunity whose title is ~480 chars (allowed by MP-B-004). 2. Edit the auto-created roadmap item. 3. Turn on Public. 4. Save.

**Expected:** Inline title error with counter before submit (or title accepted); after shortening, any change saves.

**Actual:** "Saving…", then toast "title: Too big: expected string to have <=200 characters"; nothing saved; no counter/inline error.

**Likely cause:** 200-char cap exists only on the roadmap server schema; opportunity create and the accept path don't enforce it; client form has no matching rule; zod messages toasted raw.

**Fix:** Shared `TITLE_MAX=200` in opportunity + roadmap forms and DTOs; accept path truncates the roadmap title to 200 ("…"); edit form shows counter + inline error; G3 field mapping.

**Acceptance criteria:**
- Accepting a long-title opportunity yields a roadmap item with title ≤200 that can be edited/published.
- For a legacy >200 item, Edit shows the inline error on Title and saves after shortening.
- No raw zod text in any toast. API test for 201 at 200 chars and 400 at 201.

# Medium

## MP-B-001: New product list does not refresh after create
**Severity:** Medium | **Groups:** G1

**Where:** /build/managed-products → "New product" sheet → "Create Product". Actor: owner, org with zero products.

**Steps:** 1. Empty state "Start with a product". 2. "New product", Name "QA MP 1013", Key "QAMP1013". 3. "Create Product".

**Expected:** Sheet closes; new row appears immediately; success toast linking to the product.

**Actual:** Sheet closes; empty state remains until full reload. No toast.

**Likely cause:** Create mutation does not invalidate the directory list query (all filter variants).

**Fix:** Invalidate the managed-products list prefix on success; add success toast with link.

**Acceptance criteria:** Row appears without reload (empty and non-empty lists, any filter); toast shown; e2e/component test.

## MP-B-003: Opportunity create with non-numeric Baseline returns 500
**Severity:** Medium | **Groups:** G3

**Where:** /build/managed-products/3/insights?view=discovery → "New opportunity" → "Create opportunity". Actor: owner.

**Steps:** 1. "New opportunity". 2. Title "QA MP 1013 onboarding friction". 3. Baseline "abc". 4. Create.

**Expected:** Inline "Enter a number" before submit, or 400 with field error; nothing created.

**Actual:** Toast "Something went wrong on our end." `POST /build/managed-products/3/opportunities` → 500. Blank baseline works.

**Likely cause:** Baseline/Target sent as strings; server casts/inserts into a numeric column without DTO validation.

**Fix:** Client: numeric inputs (`inputMode="decimal"`) with validation; server: validate numeric (optional) fields and return 400.

**Acceptance criteria:** "abc" blocked inline; API returns 400 (not 500) for non-numeric baseline/target; valid numbers save; API test.

## MP-B-005: Override RICE score accepts negative values; server 400 not shown
**Severity:** Medium | **Groups:** G3

**Where:** /build/managed-products/3/insights?view=discovery&opportunity=1 → "Override score" → "Save override". Actor: owner.

**Steps:** 1. Open opportunity. 2. "Override score". 3. Score -5, any reason. 4. Save.

**Expected:** Client validation "Score must be 0 or greater" with no request, or visible server message.

**Actual:** Spinner several seconds, modal stays, no message. `POST …/opportunities/1/score-override` → 400. Score unchanged.

**Likely cause:** Missing `min=0` in the form schema; mutation onError not surfaced.

**Fix:** Add min 0 to the shared rule (client); keep server check; surface 400 inline via G3.

**Acceptance criteria:** -5 blocked inline without network call; bypassed client still gets 400 shown inline; valid override saves and closes.

## MP-B-010: Accepted opportunity's RICE values don't carry over to the roadmap item
**Severity:** Medium | **Groups:** stand-alone | **Policy:** P8

**Where:** /build/managed-products/3/roadmap?view=timeline&item=1 vs /insights?view=discovery&opportunity=1. Actor: owner.

**Steps:** 1. Score opportunity Reach 1000, Impact "Medium (1)", Confidence 0.8, Effort 2 (= 400.00). 2. Override to 250. 3. Validate and accept (Horizon Next). 4. Open the linked roadmap item.

**Expected:** Item reflects accepted score (250 override) or at least same Impact (→ 400), with the source shown.

**Actual:** Item shows Impact 3 → "RICE 1200"; opportunity shows 250.00 (overridden). No explanation.

**Likely cause:** Accept handler maps impact label/enum to a different numeric scale (or a default 3) and ignores the override.

**Fix:** Use one impact mapping shared by opportunity and roadmap; copy the override score to the item and show "Source: opportunity (overridden)".

**Acceptance criteria:** After accept, roadmap impact equals the opportunity's numeric impact; displayed RICE equals the opportunity's effective score (250 here) with source label; unit test for the mapping.

## MP-B-015: Removing the last product Admin is a silent no-op
**Severity:** Medium | **Groups:** G3, G1 | **Policy:** P5

**Where:** /build/managed-products/3/settings?tab=members → X on "qaadm1012d (Admin)" → "Remove". Actor: owner. qaadm1012d is the only product Admin; product Owner unassigned.

**Steps:** 1. Members tab. 2. X on the Admin. 3. Confirm "Remove". 4. Reload.

**Expected:** Either removal succeeds and list refreshes, or a visible message "Can't remove the last Admin. Add or promote another Admin first."

**Actual:** Dialog closes, no toast, row remains (also after reload). No role control. Members list shows an empty body ~6 s after reload before rows appear.

**Likely cause:** Server rejects (or no-ops) the last-admin removal and the client ignores the response; list has no loading state.

**Fix:** Server returns 409/400 with the P5 message; client keeps the dialog open and shows it; show a loading state (skeleton) instead of an empty list. (Role selector only if trivial; otherwise follow-up.)

**Acceptance criteria:** Removing the last Admin shows the message in the dialog and nothing changes; removing a non-last Admin succeeds and the row disappears immediately; loading shows a skeleton, not an empty list; API test for the rule.

## MP-B-017: Roadmap items cannot be opened from the keyboard
**Severity:** Medium (accessibility) | **Groups:** G7

**Where:** /build/managed-products/3/roadmap?view=list, ?view=board, ?view=timeline. Actor: owner.

**Steps:** 1. List view, Tab to a row (focus ring shows). 2. Enter, then Space. 3. Board/Timeline: Tab through the page.

**Expected:** Enter/Space opens the detail sheet (URL gains `&item=<id>`), focus moves into the sheet; Board/Timeline cards are focusable.

**Actual:** List: Enter/Space do nothing (mouse click works). Board/Timeline: no card receives focus. (Escape returns focus to the trigger — keep this.)

**Likely cause:** Rows use `onClick` only on a focusable `tr`; cards are plain divs.

**Fix:** Add Enter/Space handling (or a real button/link on the title) to rows; cards get `role="button"`, `tabIndex={0}`, accessible name, same handler.

**Acceptance criteria:** Keyboard opens items in all three views, URL updates, focus enters the sheet and returns on Escape; test with keyboard events.

## MP-B-018: Member sees "Total Goals 2" while list says "No goals yet"
**Severity:** Medium | **Groups:** G6 | **Policy:** P6

**Where:** /build/managed-products/3/goals. Actor: qamem1012c (product Member).

**Steps:** 1. Sign in as the Member. 2. Open goals. 3. Reload.

**Expected:** Tiles and list reflect the same visible goals (or both hidden/zero).

**Actual:** Tiles: Total 2, On Track 0, At Risk 0, Avg 0%, Stale 0; list: "No goals yet — Create a goal or link an existing org goal…". Owner sees 2 goals.

**Likely cause:** Summary aggregate query lacks the read-permission filter applied to the list.

**Fix:** Apply the same filter/permission to the summary endpoint; hide tiles if the actor has no goal read.

**Acceptance criteria:** As Member, tile counts match the list; as owner/admin unchanged; API test with a Member principal.

## MP-B-024: "Post update" shows success but the update appears nowhere on Overview
**Severity:** Medium | **Groups:** G1, G4

**Where:** /build/managed-products/3 → "Post update" → "Post update". Actor: owner.

**Steps:** 1. Overview → Post update. 2. Empty → "Body is required" (OK). 3. Enter text → Post. 4. Read Overview, then reload.

**Expected:** Update shown on overview (sheet copy: "It will appear on this product's overview.") with author/time.

**Actual:** Toast "Product update posted.", sheet closes, no trace on Overview (before/after reload). Insights "Days since product update" shows 0, so it is stored.

**Likely cause:** Overview has no latest-update widget (or summary omits it), and summary isn't invalidated.

**Fix:** Render the latest update(s) on the Overview from existing data (summary field or updates endpoint), invalidate summary on success. If no data source exists without a new endpoint, change the sheet copy and report as follow-up.

**Acceptance criteria:** Posted update appears immediately with author and time and persists after reload.

# Low

## MP-B-004: Opportunity title has no length limit; long title overflows the table
**Severity:** Low | **Groups:** G5 | **Policy:** P1

**Where:** /build/managed-products/3/insights?view=discovery. **Steps:** Create opportunity with ~480-char title. **Expected:** Max-length message; title truncated with ellipsis in the table, full text on hover/detail. **Actual:** Saved in full; row overflows the card with no ellipsis. (Literal `<b>` rendered as text — correct.) **Likely cause:** No max on opportunity DTO/form; cell lacks `truncate`. **Fix:** TITLE_MAX=200 in form (counter) and DTO; `truncate` + `title` tooltip in table cells (also roadmap list, MP-U-003). **Acceptance criteria:** 201 chars rejected inline and by API (400); long titles truncate in tables at 1280 px with tooltip.

## MP-B-006: Score/Override/Accept spinners last seconds; Accept form stays open after success
**Severity:** Low | **Groups:** G2

**Where:** /insights?view=discovery&opportunity=1. **Steps:** Save score / Save override / Accept. **Expected:** Form closes promptly with toast; button not stuck. **Actual:** Spinner 4–10 s; after Accept succeeded (state Accepted) the Accept form remained with Accept enabled. **Likely cause:** Success handler doesn't reset/close the sub-form; endpoints slow. **Fix:** Close form + toast on success, G2 guard; note endpoint latency as follow-up (don't optimise backend unless an obvious N+1 is found). **Acceptance criteria:** After each action the form closes, toast shows, Accept cannot be submitted twice.

## MP-B-007: Deep link ?opportunity=1 does not reopen the detail sheet on load
**Severity:** Low | **Groups:** stand-alone

**Where:** /build/managed-products/3/insights?view=discovery&opportunity=1. **Steps:** Open an opportunity, reload or open the URL directly. **Expected:** Sheet opens for that id. **Actual:** No sheet though URL keeps the param (sometimes appears after another in-app navigation). **Likely cause:** Sheet open state initialised from click only, or read before router/search params are ready and not re-synced. **Fix:** Derive open state from the search param (`useSearchParams`) and open once data is loaded; show not-found inside the sheet for unknown ids. **Acceptance criteria:** Reload and direct link open the sheet; closing removes the param; invalid id shows a friendly message.

## MP-B-012: Goals "Total Goals" not refreshed after unlink
**Severity:** Low | **Groups:** G1

**Where:** /goals → Goal actions → "Unlink from product". **Steps:** With 2 goals, unlink one. **Expected:** List and Total Goals show 1. **Actual:** List shows 1, tile stays 2 until refresh. **Likely cause:** Only list invalidated. **Fix:** Invalidate goals summary with list on link/unlink/create. **Acceptance criteria:** Tile updates immediately after link and unlink.

## MP-B-016: Linked Projects list stale after "Link project"; no primary indicator
**Severity:** Low | **Groups:** G1

**Where:** /build/managed-products/3/projects → "Link existing project" → pick project → "Link project". **Steps:** Link QA Project Delta while QA Project Alpha is linked. **Expected:** Toast and table shows both; primary product indicated. **Actual:** Toast shows; new row only after reload (unlink refreshes fine). No Primary label / Set primary control. **Likely cause:** Link mutation does not invalidate the linked-projects query (unlink does). **Fix:** Invalidate on link (mirror unlink). Show a "Primary" badge if the data is already in the response; "Set primary" action is a follow-up unless trivial. **Acceptance criteria:** New row appears immediately on link and relink; badge shown where data exists.

## MP-B-019: Member sees "New Goal"; create fails with raw "Missing permission: build:goals:manage"
**Severity:** Low | **Groups:** G6, G3 | **Policy:** P10

**Where:** /goals as qamem1012c. **Steps:** Click "New Goal" (header or empty state), fill, Create. **Expected:** Button hidden/disabled for Member; if attempted, friendly message. **Actual:** Button shown; toast with raw permission key; sheet stays open; nothing created. **Likely cause:** CTA not gated by `build:goals:manage`. **Fix:** Gate both CTAs (and empty-state copy) on the permission; 403 → "You don't have permission to create goals on this product". **Acceptance criteria:** Member sees no New Goal / create copy; admin/owner unchanged; forced 403 shows friendly text.

## MP-B-020: Outsider gets generic error boundary on /roadmap and /releases
**Severity:** Low | **Groups:** G6 | **Policy:** P7

**Where:** /build/managed-products/3/roadmap and /releases. Actor: qaout1012g (other tenant). **Steps:** Open both routes; compare /feedback, /insights, /settings. **Expected:** "Product not found" like other routes. **Actual:** "Managed Product — Something went wrong" boundary; retry doesn't help. No data leaked. **Likely cause:** These loaders throw on 404/403 (or API returns 500 for cross-tenant). **Fix:** API returns 404 for cross-tenant ids on roadmap/releases endpoints; loaders map 404/403 to the shared not-found state. **Acceptance criteria:** Both routes show "Product not found" for an outsider and for a non-existent id; API e2e asserts 404 (not 500).

## MP-B-021: Outsider sees action buttons and tiles on product pages that return "Not found"
**Severity:** Low | **Groups:** G6 | **Policy:** P7

**Where:** /build/managed-products/3/goals, /projects, Overview shell. Actor: qaout1012g. **Steps:** Open /goals, /projects; click "New Goal", submit. **Expected:** Only not-found state; no write controls, no tiles. **Actual:** "New Goal", "Link existing goal", "Link existing project", zero tiles render above "Not found"; submit hits the API ("Not found" toast, sheet stays); switcher shows the outsider's own product name. **Likely cause:** Shell renders before/independently of product lookup. **Fix:** Product layout short-circuits to the not-found state on lookup failure; don't render the switcher's product name for an unknown id. **Acceptance criteria:** As outsider no CTA/tiles/sheets render on any product route; no mutation requests can be made from the UI.

## MP-B-022: After Admin "Create Goal", list and Total Goals stale until reload
**Severity:** Low | **Groups:** G1

**Where:** /goals as qaadm1012d. **Steps:** New Goal "RBAC qaadm 1013" → Create. **Expected:** Sheet closes, toast, list + Total Goals (3) update. **Actual:** Sheet closes, no toast, list/tile stale until reload; created once. **Likely cause:** Same as MP-B-011/MP-B-012. **Fix:** Covered by G1 (list + summary invalidation) and success toast. **Acceptance criteria:** Goal appears once immediately with toast; tile updates.

## MP-B-025: Removed member stays listed for several seconds
**Severity:** Low | **Groups:** G1

**Where:** /settings?tab=members → X on a Member → "Remove". **Steps:** Remove qamem1012c; watch list ~6 s. **Expected:** Row disappears at once. **Actual:** Toast "Member removed." but row stays ≥6 s (same lag on Add member). Server state correct. **Likely cause:** No invalidation/optimistic update; list refetched only by polling/focus. **Fix:** Invalidate (or optimistically update) members query on add and remove. **Acceptance criteria:** Add/remove reflected immediately; rollback on error.

## MP-B-026: Evidence sheet shows "Approval state: Not set" while QA state is Approved/In review
**Severity:** Low | **Groups:** stand-alone | **Policy:** P9

**Where:** /releases → row "Actions" → "View evidence". **Steps:** Release with QA state Approved, then In review; view evidence. **Expected:** Approval block reflects QA state or explains the difference. **Actual:** "Approval state: Not set" for both; row chip shows QA state. **Likely cause:** Evidence sheet reads a different (unused) approval field. **Fix:** Show "QA state: <value>" in the block; if a separate approval field exists, label it distinctly. **Acceptance criteria:** Evidence shows the same QA state as the row chip.

## MP-B-027: Feedback route showed generic error boundary at 300% zoom — NEEDS RECHECK
**Severity:** Low (needs re-check) | **Groups:** possibly G3 / MP-B-002

**Where:** /build/managed-products/3/feedback at 300% zoom (~427 CSS px). Actor: qaadm1012d session. **Steps:** Zoom 300%, navigate Overview → Feedback or open URL. **Expected:** List/CTA or the Feedbucket gate. **Actual:** "Something went wrong — An unexpected error occurred…" with no retry; not reproduced at 100%. **Likely cause:** Unconfirmed; possibly the unhandled 402 path from MP-B-002. **Fix:** **Do not write a speculative fix.** After MP-B-002, re-test at 100% and ~427 px width (with Feedbucket off). If it reproduces, find the throwing component and fix it minimally; otherwise report "not reproduced after MP-B-002". **Acceptance criteria:** At ~427 px and 100% the route shows the gate (module off) or the list (module on); report the recheck result as `needs-recheck` → `fixed` / `not reproduced`.

---

# 4. UX suggestions (do only if trivial and inside files you already touch; otherwise list as follow-ups)

- MP-U-001: auto-suggest product Key from Name; show format hint before submit.
- MP-U-002: label the RICE source on roadmap items (covered by MP-B-010).
- MP-U-003: truncate roadmap list Title column with tooltip; keep Horizon/Status visible (covered by MP-B-004/014).
- MP-U-004: move "Public" toggle near Status in Edit Roadmap Item.
- MP-U-005: push a history entry per committed directory filter/view change.
- MP-U-006: filter chips use select labels ("Status: Archived"), not raw enum values.
- MP-U-007: Publishing "Expires — No expiry" with no way to set expiry: add expiry choice or hide the row.
- MP-U-008: show pending state on Unpublish and update the panel on completion (G1).
- MP-U-009: directory at narrow widths: switch to grid or pin Name + Actions.
- MP-U-010: hide existing members from the Add member picker.
- MP-U-011: release row shows owner name, not the literal "Owner".
- MP-U-012: release create "Creating…" for 6–10 s: spinner + immediate list update.
- MP-U-013: sidebar "Draft awaiting review: NNNN…" placeholder: show the draft title, truncated.
- MP-U-014: Overview "Measured outcomes": add or link schedule/complete review actions.
- MP-U-015: floating companion covers header actions at narrow widths; collapse by default.

---

# 5. Final regression checklist

Run these after all fixes (owner unless noted):

- [ ] Directory: create product → row appears immediately; search, status filter, grid/list view still work.
- [ ] Product Overview loads with 0 releases and with 1+ releases (each QA state); Edit product, Post update (appears on overview), Mark reviewed, Record opportunity work.
- [ ] Feedback: with Feedbucket off, gate shows immediately and no capture CTA; at ~427 px width no generic boundary (MP-B-027 recheck).
- [ ] Insights discovery: create opportunity (valid numbers, blank numbers, non-numeric blocked, 200-char title limit); score, override (≥0), start validating, accept, decline; each closes its form once; State filter works by mouse and keyboard and via URL; `?opportunity=<id>` deep link opens on reload.
- [ ] Accepted opportunity → roadmap item has title ≤200, matching impact, effective score with source label, and is editable/publishable.
- [ ] Roadmap: create item (double-click → one item); open items by keyboard in list/board/timeline; edit/save; Public toggle; publish/rotate/unpublish and anonymous public view shows only public fields.
- [ ] Goals: create (one click → one goal, toast, list + tiles update), link existing goal, unlink (tiles update).
- [ ] Projects: link → row appears immediately; unlink still refreshes; relink works.
- [ ] Releases: create with only Name + Version; with all fields; edit; archive; view evidence shows QA state.
- [ ] Settings members: add/remove reflected immediately; last Admin removal blocked with message; loading shows skeleton.
- [ ] RBAC: Member — read-only views, no New Goal, goal tiles match list, feedback route denied; Org viewer — every route denied (unchanged); Product Admin — all write controls work; Outsider — every product route shows "Product not found", no CTAs/tiles, API returns 404 (not 500) on roadmap/releases.
- [ ] No raw error text anywhere (no JS exception messages, no raw zod paths, no raw permission keys in toasts).
- [ ] User-entered `<script>`/`<b>` text is still rendered as literal text everywhere.
- [ ] Existing test, lint and type-check commands pass.
