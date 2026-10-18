# Task: Fix all open NON-FRONTEND issues in the StreamlineOS HRMS module

You are a coding agent working in the **StreamlineOS** repository. Your job is to fix the **backend / API / data / authorization / validation / business-logic** defects that QA still reports as open in the HRMS (HR) module, and add the automated tests that prove each fix. This prompt includes everything you need. QA evidence comes from production testing on 2026-10-13/14 (IST) in the TEST org "QA Build Org 1012b" (web: `https://www.streamlineos.in`, API: `https://api.streamlineos.in`). **Do not run anything against production.** Work only in the repo and in local/test environments.

---

## 0. Before you write any code

1. **Find out the stack first. Do not assume it.** Work out the backend language and framework, ORM and migration tool, database, auth/permission model (look for strings like `hr:employees:update`, `payroll:salaries:view`, `module:hr`), multi-tenancy (org scoping), how requests are validated (QA saw Zod-style messages like "Invalid input: expected string, received undefined", so it may be TypeScript plus Zod), test frameworks (unit and API integration), the notifications SSE implementation, and where CORS and edge/proxy config live. Record what you find in a short "Stack notes" section at the top of your final report.
2. Map each issue below to the code that serves it: routes such as `POST /hr/leaves/{id}/approve`, `/me/expenses`, `/hr/expenses`, holidays, attendance regularization, onboarding/employees, invites, departments, permissions, notifications stream. If you can't find an endpoint, say so. Don't invent one.
3. Run the existing test suite once and write down the baseline (pass/fail counts) before you change anything.

## 1. Global rules (must follow)

- **Make the smallest safe change.** Fix root causes. Don't refactor unrelated code.
- **Reuse existing patterns** for validation, error envelopes, permission checks, soft delete, idempotency, pagination, and test fixtures. If the codebase already has an error-code convention, use it. The error codes below are *suggested* names, so map them onto the existing convention.
- **No secrets.** Don't hard-code, log, or commit credentials, tokens, invite tokens, or PII. Don't log full invite tokens or sensitive field values.
- **Migrations must be reversible**, with working up and down steps. Before you add a unique constraint, check for existing duplicate rows (prod already has duplicates for holidays and expenses). Write a data-safe migration plan (backfill or dedupe report) and **don't delete data automatically**.
- **Discuss tradeoffs before big changes.** This is the user's preference. If a fix needs a schema redesign, a new subsystem (e.g. a new permission service), changes to a public API contract beyond adding fields, or a choice between options with real tradeoffs (marked **DECIDE** below), stop and write a short proposal: options, recommendation, risk, and migration impact. Then wait, or carry on with the clearly safest option only if it is small and reversible.
- **Don't touch frontend code.** The only exception is shared API contract types/schemas (e.g. shared DTO or Zod schemas, OpenAPI types) when a backend contract change requires it. List any such edits.
- Every authorization check must happen **on the server**, scoped by **org/tenant**. Never trust client-supplied org IDs, roles, or user IDs.
- Errors must be 4xx with a stable machine `code` plus a human `message`. **No 500 for validation or business-rule failures.** 500 means a real bug, and it must be logged with a correlation ID.
- Timezone: compute in the **org's configured timezone** (default/QA org: `Asia/Kolkata`, UTC+5:30, no DST). The code must not assume IST. It must work for any IANA zone, including DST zones.
- Treat everything as untrusted input. Store injection strings (`'; DROP TABLE x;--`, `<script>alert(1)</script>`, `{{7*7}}`) **verbatim and safely** via parameterised queries, and never execute or interpret them.
- At the end, produce the **summary table** and **verification checklist** (section 5).

### Standard edge cases to consider for every issue (apply wherever relevant)
Concurrency and double submit; duplicates within the same request burst; races between two approvers; self-approval; deleted, terminated, or deactivated users; cross-org/tenant IDs (IDOR: return 404, not 403, for other-org resources unless the codebase convention differs); role downgrade mid-session (permissions must be checked per request, not cached in a long-lived token without revalidation); timezone boundaries at midnight IST vs midnight UTC (18:30 UTC); configurable org TZ; Unicode, emoji, RTL, combining marks; max lengths; negative, zero, huge, and decimal-precision amounts; currency; leap years (29 Feb); overlapping leaves; half days; weekends and holidays; zero balance; expired, reused, or forwarded invite tokens; email case and whitespace normalisation; plus-addressing; conflicts with soft-deleted records; pagination limits; malformed JSON; missing or extra fields; wrong types; injection strings stored safely.

---

## 2. Issues to fix (ordered by priority)

Status legend from QA (the Retest 2 column of `retest_2026-10-14.md` is authoritative): **STILL OPEN**, **PARTIALLY FIXED**, **INTERMITTENT**, **BLOCKED** (QA couldn't verify, so you must verify in code/tests and fix if the defect is present), **NOT REPRODUCED** (unproven: add a regression test only unless the code shows a defect), **NEW** (found in Retest 2 or cleanup).

---

### P0: Authorization and data protection

#### BE-01: Server must expose effective permissions; all HR admin endpoints must enforce them (HRMS-008, STILL OPEN; HRMS-024, BLOCKED; UX-15, BLOCKED) — VERIFIED IN CODE: enforcement present via assertModuleAccessPolicy (resolveModuleStanding checks hr:access:view from resolved permissions; users without it get level "none" → 403); sidebar filters via requiredPermission; page guard via requirePermission; spec covers denial; HR member role narrowed (commit 258079a9b). NEEDS PRODUCT DECISION: per-resource capabilities hint (e.g. capabilities: { canEdit } on employee detail response) requires scope design decision.
**Evidence (observed):**
- An HR Module **Member** (QA Employee) sees the full admin sidebar: HR configuration, Access & governance, HR access, People analytics, Cases, Expenses, Compensation & Benefits. Many items redirect to Access Restricted when opened (e.g. custom-fields, approvals).
- `/hr/access` is readable by the Member: role groups and full permission lists (e.g. "Owner 144/144"), read-only.
- A Manager saw an editable Edit tab on a non-report's profile. Saving was rejected by the server with toast `Missing permission: hr:employees:update`. Server enforcement worked for that write.
- The access-denied page puts raw permission keys in the URL and body: `/access-denied?required=module:hr, hr:custom-fields:manage`.

**Root-cause hypotheses (verify):**
- H1: the UI builds navigation from a static list because no API returns the caller's effective permissions.
- H2: read endpoints behind admin pages (roles/permission groups, audit log, analytics, custom fields, compensation) check only `module:hr`, not the specific permission.
- H3: manager scope ("direct/indirect reports") isn't computed server-side for profile reads/edits, or is computed but not exposed.

**Required behaviour:**
- Add or extend an endpoint such as `GET /me/permissions` (reuse an existing session/me endpoint if there is one). It returns `{ orgId, roles: [...], permissions: ["hr:employees:read", ...], scopes: { "hr:employees:update": "all" | "reports" | "self" | "none", ... }, version }`. Compute it per request from current role assignments. Give it a short TTL at most, and invalidate it on role change.
- Add a per-resource capability hint where cheap. Example: the employee detail response includes `capabilities: { canEdit, canViewSensitive, canApprove... }` evaluated server-side for that caller and that record.
- **Every** HR admin endpoint, read and write, enforces its specific permission. Write a route-to-permission matrix test covering every HR route. Members get `403 {code:"FORBIDDEN"}` on `/hr/access` role/permission data and on audit log, unless product decides Members may read role definitions. **DECIDE**: recommend deny.
- Manager editing a non-report: `403 {code:"FORBIDDEN", message:"You don't have permission to edit this employee."}`. Reports-scope applies only to actual current reports.
- 403 response bodies must **not** list internal permission keys to end users. Use a generic message plus an optional `requiredCapability` that is a human label (e.g. "Custom fields"). If the API currently returns keys that the UI then puts in the URL, remove or replace them in the API response. Note the contract change.

**Edge cases:** role downgraded mid-session (next request must reflect it), user deactivated or terminated mid-session (401/403), cross-org IDs (404), a manager whose report moves to another manager mid-session, an owner with every permission, a custom role with partial permissions, the HR module disabled for the org (every HR endpoint returns `403 {code:"MODULE_DISABLED"}`), a stale cached permission list.

**Acceptance criteria:** the permission API reflects role changes on the very next request. The route-matrix test passes for Owner, HR Admin, Manager, and Member. No 403 body contains raw `module:`/`hr:` keys. Manager edits of a non-report are denied, and `capabilities.canEdit=false` is returned for that profile.

**Tests:** unit tests for permission resolution (role → permissions → scopes). API integration tests: a table-driven role × route matrix (200/403/404), `GET /me/permissions` per role, downgrade-mid-session, cross-org IDOR, and a 403 body snapshot with no raw keys.

### P1: Broken core workflows

#### BE-03: `/hr/leaves?tab=approvals` fails with "Failed to load leaves data" (NEW, Retest 2) — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

leaves.service.ts:541 schema mismatch displayName→userName fixed; leaves-approval.service.ts null-safe serialization in place.
**Evidence:** "Leaves Error - Failed to load leaves data. Please try again." appears on repeated loads and after Try Again (owner session). The same page loaded fine earlier in the pass. It started after a QA Employee leave (Oct 21) was approved and other leaves were cancelled or rejected.
**Hypotheses:** H1: the approvals query throws on a record in a newly reached state (approved/cancelled leave with null approver, missing reporting manager, deleted leave type, or a worker removed from the directory, e.g. "QA Neg Test" removed but worker record kept). H2: a serialization error on a null relation. H3: a timeout or unbounded query. H4: a permission check error turned into a 500.
**Required behaviour:** the approvals list endpoint returns 200 with a paginated list (default 25, max 100) of items the caller may act on. Records with missing or deleted relations are serialized with null-safe fields and never crash the list. Failures return a 4xx/5xx with a correlation ID, and the root cause is logged.
**Edge cases:** an employee removed from the directory, terminated, or deleted; a deleted leave type; a leave with no approver; zero items; more than 100 items; cross-org.
**Acceptance / tests:** reproduce with fixtures that mirror the QA data (approved, cancelled, and rejected leaves, a directory-removed worker, no reporting manager). Add an integration test asserting 200 and correct shape, plus a unit test for the null-safe serializer.

#### BE-04: Owner's own leave appears in their own approval queue; self-approval must be impossible (HRMS-025, PARTIALLY FIXED; relates to UX-14) — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

leave-inbox-reads.ts ne(leaveRequests.userMembershipId, approverMembershipId) excludes own requests from both queue queries (commits 0442a0791, ba9ef9981).
**Evidence:** inline Approve/Reject buttons were removed, but the owner's own Casual Leave (Oct 27-28) and Sick Leave (Oct 29-30) are still in the owner's Approvals queue ("Approvals 2"). The server already rejects with `You cannot approve your own leave request`.
**Hypotheses:** H1: the queue query selects "pending, caller is in the approver group" without excluding `requester = caller`. H2: when the requester has no reporting manager, routing falls back to the HR group that includes the requester.
**Required behaviour:** the approval queue excludes items where the caller is the requester. Approve/reject on own request returns `403 {code:"SELF_APPROVAL_NOT_ALLOWED", message:"You cannot approve your own leave request."}`. Routing for a requester who is the only approver (e.g. the owner) must be defined. **DECIDE**: options are (a) route to another HR admin, (b) auto-approve owner leave with an audit entry, or (c) leave pending with an explicit "no eligible approver" state. Recommend (a) with fallback to (c), and expose `approver` (name/role) on the leave so the UI can show the real approver (UX-14).
**Edge cases:** the owner is the only admin, the requester becomes an approver mid-flow, delegation, the same applies to expenses and attendance corrections (check those queues too), two approvers acting concurrently.
**Tests:** queue excludes own items (leave, expense, attendance correction); self-approve returns 403; routing when the requester is the sole approver.

#### BE-06: Leave can be submitted with zero balance (NEW) — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

leaves-write.service.ts checks available balance (entitlement − pending) before insert; leaves-write-balance.spec.ts regression suite (commit 0442a0791).
**Evidence:** QA observed leave submission accepted with zero available balance.
**Hypotheses:** balance not validated server-side, or validated only in the UI. Pending requests not counted against available balance.
**Required behaviour:** on submit, compute requested days (excluding weekends and holidays per the org/location calendar, half days = 0.5) and compare with `available = entitlement + carry-forward - approved - pending`. If insufficient: `422 {code:"INSUFFICIENT_LEAVE_BALANCE", message:"Insufficient Earned Leave balance: requested 2, available 0.5."}`, unless the leave type allows negative balance or is unpaid (respect existing policy flags). Re-check on approval. Reject overlap with existing pending/approved leave: `409 {code:"LEAVE_OVERLAP"}`.
**Edge cases:** zero balance, exactly-equal balance, half day on the last 0.5, a range spanning a weekend or holiday (0 working days returns `422 {code:"NO_WORKING_DAYS"}`), a range across 29 Feb in a leap year, a range across a year boundary (which year's balance?), the org TZ "today" for past-date checks, two concurrent submits that each fit alone but not together (serialize per employee), end before start, more than the max range length.
**Tests:** unit tests for the day-count and balance calculator (weekends, holidays, half days, leap year, year boundary). Integration tests for zero balance (422), the concurrent-submit race, and overlap (409).

#### BE-07: Expense amount must be validated server-side with a clear max (HRMS-011, STILL OPEN) — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

EXPENSE_AMOUNT_MAX=1_000_000 validated in expense-amount.spec.ts; decimal/zero/negative/over-max all covered.
**Evidence:** typing `99999999999999999999` was silently truncated to 999999999 and saved as EXP-2026-003, Travel, **Rs 99,99,99,999**, Pending, with no message. An earlier build turned it into 0 with "Amount must be greater than 0".
**Hypotheses:** H1: the server accepts any number up to a column limit. H2: the client parses or clips, and the server trusts it. H3: the float/number type loses precision for large values.
**Required behaviour:** the server validates amount as a decimal string or integer minor units (no floats). It must be > 0, have at most 2 decimal places (or the currency's minor units), and be ≤ a configurable max (suggest `org.expenseMaxAmount`, default **₹10,00,000** per claim; **DECIDE** the value). On violation: `422 {code:"AMOUNT_OUT_OF_RANGE", message:"Amount must be between ₹0.01 and ₹10,00,000.", details:{min, max, currency}}`. Never clamp or truncate. Return the max in a config/policy endpoint so the UI can show it. Currency must be from the allowed list.
**Edge cases:** 0, negative, `-0`, `0.001`, `1e9`, `"1,000"`, `NaN`, `Infinity`, a value as a string vs number, more than 15 significant digits, exactly the max, max + 0.01, other currencies, edits to an existing claim (same rule), a 20-digit string.
**Tests:** unit tests for the amount validator (table-driven). Integration tests for create and edit with out-of-range values (422, nothing persisted).

#### BE-08: Duplicate expense/leave on double submit: idempotency (HRMS-012, BLOCKED; HRMS-021 server side) — FIXED (0c2e12e34), PENDING_BROWSER_VERIFICATION

@Idempotent added to POST /me/time-off (leave create), POST /me/expenses (expense create), PATCH .../approve, PATCH .../reject.
**Evidence:** re-submitting created duplicate EXP-2026-002. The queue shows two identical Rs 500 "QA synthetic expense claim" items (Oct 13). The leave double-click left the drawer open (UI), and the server side is unverified.
**Hypotheses:** no idempotency key and no duplicate guard on `POST /me/expenses` (and leave submit).
**Required behaviour:** accept an `Idempotency-Key` header (reuse an existing mechanism if there is one) on create endpoints for expenses, leave requests, and attendance corrections. The same key plus the same caller within 24 h returns the original response (same ID, 200/201). The same key with a different payload returns `422 {code:"IDEMPOTENCY_KEY_REUSED"}`. If no key is sent, consider a short duplicate window (same employee, amount, category, date, description within 60 s) returning `409 {code:"DUPLICATE_SUBMISSION", details:{existingId}}`. **DECIDE** whether to enforce that. Implement it atomically with a unique index on (org, user, key), not check-then-insert.
**Edge cases:** two parallel requests with the same key (exactly one record), a retry after timeout, a key reused across users (must not collide), a key reused across orgs.
**Tests:** integration tests for parallel same-key creates (1 record), replay returns the same ID, a different payload with the same key, and the duplicate window behaviour.

#### BE-09: Invite link "expired" immediately or after verification; resend email not delivered (HRMS-005, NOT REPRODUCED from 1 invite; HRMS-026, BLOCKED; resend delivery, NEW/open) — FIXED (2d16d3d2d), PENDING_BROWSER_VERIFICATION

invitation-acceptance.service.ts validates status=PENDING, expiresAt>now, acceptedAt IS NULL; token consumed on POST only, not GET. GET /organization/invitations/validate now answers 409 INVITE_ALREADY_ACCEPTED for a consumed link (404 stays for unknown/expired/revoked/declined), and the page shows "Already a member" instead of "expired" after the post-verify remount.
**Evidence:** the link showed "expired" immediately while the member list showed Pending. After verification it showed a skeleton, then "expired", even though the account worked. Retest 2: one fresh magic link was valid. The PIN step wasn't covered (one PIN digit was dropped once). The resend email was not delivered (also the HR Admin OTP per QA open questions).
**Hypotheses:** H1: the token expiry comparison uses mixed timezones or units (seconds vs ms, local vs UTC). H2: the token is consumed or invalidated at verification, so the post-verify redirect re-checks a consumed token and shows "expired". H3: resend rotates the token but the email holds the old one, or resend never enqueues mail (check queue/provider logs and error handling). H4: link prefetchers (email scanners) consume single-use tokens on GET.
**Required behaviour:** token validity = `status=PENDING AND now_utc < expires_at_utc AND not revoked`. Invite status and link validity must always agree. Verify consumes the token **once**, inside a transaction, and redirects into the app. A re-visit by the same now-member shows "already accepted, sign in", not "expired". GET of the link must not consume it; consume on POST/verify. Resend: creates or rotates the token, invalidates the old one, enqueues the email, returns `202`, and surfaces provider failure as `502 {code:"EMAIL_DELIVERY_FAILED"}` or a retriable job with status visible to the admin. Rate-limit resend (e.g. 5/hour per invite → `429`). Errors: `410 {code:"INVITE_EXPIRED"}`, `409 {code:"INVITE_ALREADY_ACCEPTED"}`, `404 {code:"INVITE_NOT_FOUND"}` (also used for revoked or other-org tokens, to avoid enumeration). PIN: verification accepts exactly N digits (strip whitespace), with constant-time compare and attempt limiting.
**Edge cases:** expired token, token reused after acceptance, token forwarded to and opened by a different signed-in user (must not attach the invite to the wrong account; require email match or explicit confirmation), the old token after resend, invite email case or whitespace differences, plus-addressing, the invitee already a member of another org, an invite revoked after send, clock skew, expiry exactly at the boundary, an email-scanner GET.
**Tests:** unit tests for the token validity function (boundaries, timezone). Integration tests for the full flow (create → GET doesn't consume → verify → redirect → re-visit), expired, reused, resend invalidates the old token and enqueues mail (mock provider asserts send called, and a failure path), and the rate limit.

#### BE-10: Duplicate-email check inconsistent: member vs invitee vs employee (HRMS-017, PARTIALLY FIXED) — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

employees.service.ts checkEmail returns {exists, status, memberStatus} with conflict kinds; employees.controller.ts throws ConflictException({code:"EMAIL_ALREADY_EXISTS"}) on onboard. Frontend still advances on advisory warning — frontend fix needed.
**Evidence:** existing member `qaadm1012d@…` was blocked: "belongs to a member of your organization". New invitee `ggbdpvlg@…` showed "already belongs to an employee" **but still advanced** to Job Details. Earlier, `qa.happy1@example.com` was blocked while a listed employee's email passed.
**Hypotheses:** H1: there are two different lookups (users/members table vs worker/employee table vs pending invites) with different blocking semantics. H2: the duplicate check is advisory (warning), not enforced on the final create. H3: missing normalization.
**Required behaviour:** one server-side rule, enforced on the check endpoint **and** on final employee create/invite. Normalize: trim, lowercase the whole address (**DECIDE**: recommend lowercase full address; do **not** strip plus-tags, so `a+1@x.com` ≠ `a@x.com`, but document this). Conflict when the normalized email matches, within the same org, an active employee/worker, an active member, or a pending invite → `409 {code:"EMAIL_ALREADY_EXISTS", details:{kind:"employee"|"member"|"invite", id}}` with one consistent message per kind. Soft-deleted or archived records: **DECIDE** between block-with-restore-option and allow (recommend returning `409` with `kind:"archived_employee"` and a restore hint). Back this with a unique partial index on (org_id, normalized_email) for active records.
**Edge cases:** case or whitespace variants, Unicode/IDN domains, plus-addressing, the same email in another org (allowed), two concurrent creates with the same email (one wins), an email belonging to a terminated employee.
**Tests:** unit tests for normalization. Integration tests: each kind returns 409 on both check and create, the concurrent create race, and cross-org allowed.

#### BE-11 — HR-B DOMAIN: person-name.schema.ts claimed by HR-B; HR-A cannot edit. Name validation rejects hyphen and parentheses with "Numbers are not allowed in names" (NEW; follow-up to HRMS-006, FIXED)
**Evidence:** Last Name "Retest-2 (QA)" → "Numbers are not allowed in names". Unicode ("Zoë 李 😀 Ann", "आदित्य") is now preserved. QA didn't test a clean hyphenated name such as "Smith-Jones" without the digit.
**Hypotheses:** a single regex reports a fixed message for any failure, or the allowed set excludes `-`, `(`, `)`, `.`.
**Required behaviour:** server rule: NFC-normalize and trim. Length 1-100 per name part (**DECIDE** max). Allowed characters: Unicode letters `\p{L}`, marks `\p{M}`, spaces, apostrophes (`'` and `’`), hyphen, period. Parentheses: **DECIDE** (recommend reject, since names shouldn't carry annotations; if rejected, give a specific message). Digits are rejected with "Numbers are not allowed in names". Other disallowed characters get "Names can only contain letters, spaces, hyphens, apostrophes and periods". Emoji: **DECIDE** (HRMS-006's fix currently keeps them; recommend reject with a specific message, or keep if product wants). Messages must name the actual offending class. Collapse repeated internal spaces. Reject names that are only punctuation. Apply the same validator to all name fields (onboarding, profile edit, invite).
**Edge cases:** "Smith-Jones", "O'Brien", "D’Souza", "Jr.", RTL (Arabic/Hebrew), combining marks (decomposed é), zero-width characters (strip or reject), 1 character, max+1, script tags (rejected or safely stored), leading or trailing hyphen.
**Tests:** a table-driven unit test for the validator with the exact expected message per case, and an integration test on the create endpoint.

#### BE-12 — HR-B DOMAIN: reporting-manager-people.ts claimed by HR-B; HR-A cannot edit. Reporting-manager eligibility rule (HRMS-007, PARTIALLY FIXED)
**Evidence:** the picker now says "6 people cannot be selected - complete their job details". QA Manager is still not selectable, and earlier only the owner was listed.
**Hypotheses:** eligibility requires a complete employment record (department, title, start date…), and QA Manager's record is missing a field. Or eligibility wrongly also requires a manager role.
**Required behaviour:** define and document the rule server-side, e.g. eligible = same org, active (not terminated or deleted), has a worker record, not the employee themself, and not creating a cycle. **DECIDE** whether "complete job details" is truly required (recommend requiring only an active worker record). Provide an endpoint (or extend the existing one) that returns candidates with `eligible:boolean` and `ineligibleReasons:["MISSING_JOB_DETAILS:department", ...]` per person. Setting an ineligible manager returns `422 {code:"MANAGER_NOT_ELIGIBLE", message:"QA Manager can't be a reporting manager: missing department.", details:{reasons}}`. Cycles return `422 {code:"MANAGER_CYCLE"}`.
**Edge cases:** self as manager, A→B→A cycle (and deeper), a terminated manager, a manager in another org (404), a manager deleted after assignment (reports reassigned or flagged), many candidates (paginate or search).
**Tests:** unit tests for the eligibility and cycle detection. Integration tests: a QA-Manager-like fixture with missing job details shows explicit reasons and is selectable once details are completed.

#### BE-13: Attendance correction "later than current time" must compare in org timezone (HRMS-014, BLOCKED) — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

attendance-regularization-timezone.spec.ts FROZEN_UTC=2026-10-13T17:23:00Z; fromWallClockUtc + org timezone in attendance-regularization.service.ts.
**Evidence:** at 22:53 IST (17:23 UTC) on 13 Oct, a correction with check-in 18:00 for 13 Oct was rejected: "Check-in cannot be later than the current time". At 00:20 IST (18:50 UTC) the same entry was accepted. This pattern fits comparing IST wall time to UTC "now" (hypothesis, not proven).
**Hypotheses:** H1: the date and time are combined without a zone (treated as UTC), then compared to `now()`. H2: the server compares a local naive time to UTC now. H3: the client sends a naive time and the server assumes UTC.
**Required behaviour:** interpret the submitted date and time in the org's timezone (or the employee's work-location timezone if one exists; **DECIDE**), convert to an instant, and compare with the current instant. Reject future instants with `422 {code:"TIME_IN_FUTURE", message:"Check-in cannot be later than the current time (Asia/Kolkata)."}`. Check-out must be after check-in (`422 {code:"INVALID_TIME_RANGE"}`). Allow an overnight shift if the domain supports it. Store as UTC plus the zone.
**Edge cases:** submissions at 23:59 IST and 00:01 IST, at 05:29/05:31 IST (the UTC date boundary), the org TZ set to `America/New_York` across a DST change, a correction for a future date, check-in = now exactly, a date older than the policy window.
**Tests:** unit tests with an injected clock (freeze at 2026-10-13T17:23:00Z, submit 18:00 on 13 Oct in Asia/Kolkata → accepted; submit 23:00 → rejected), plus DST-zone cases and an integration test.

#### BE-14: Duplicate holiday on the same date (and location) must be rejected (HRMS-013, BLOCKED) — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

hr-holidays.service.ts:111,150 throws ConflictException({code:"HOLIDAY_DATE_CONFLICT"}).
**Evidence:** Dec 25 2026 had 3 holidays ("QA Test Holiday", "QA Dup Holiday", "QA P3 Dup Retest"), all saved with "Holiday added". QA deleted them afterwards.
**Required behaviour:** reject creating or updating a holiday when a non-deleted holiday exists with the same (org, calendar/location, date): `409 {code:"HOLIDAY_DATE_CONFLICT", message:"A holiday already exists on 25 Dec 2026 (QA Test Holiday).", details:{existingId}}`. "All locations" conflicts with any location-specific holiday on that date, and vice versa. **DECIDE** (recommend conflict). Back this with a unique partial index. The migration must first report existing duplicates without deleting them. Leave-day calculation must count a date only once even if legacy duplicates exist.
**Edge cases:** soft-deleted holiday on the same date (allowed), an update moving onto a taken date, two concurrent creates, a leap-day holiday, name with Unicode or injection characters, name max length (QA saw a 300-char name error; keep the existing max).
**Tests:** integration tests for conflict (409), soft-deleted allowed, the concurrent race, location vs all-locations, and a leave calculation with legacy duplicates.

#### BE-15 — FIXED (backend 11da24bf0 + frontend 434bd7cd3), PENDING_BROWSER_VERIFICATION. Department archive dependency check fails: "app is out of date with the API" (NEW, cleanup)
Root cause (H2): the frontend `dependencyPreviewContract` required `mode` since f404b05f1 while `GET /org-hierarchy/dependencies/:unitKind/:unitId` did not return it, so the parse failed with the "out of date" message (`lib/api-envelope.ts:80`). Backend 11da24bf0 returns `mode: "archive"` (`org-hierarchy.service.ts:249`) and `org-hierarchy.service.spec.ts:160` pins it against the response schema (passes); frontend 434bd7cd3 adds `.catch("archive")` (`hooks/api/org-hierarchy-schema.ts:180`). Archive goes through org-hierarchy, not `hr-departments.controller.ts` (list/create only); e2e502902 is the unrelated person-name change.
**Evidence:** clicking Archive on department "QA Test Dept" twice gave "Could not check dependencies… out of date with the API". Nothing changed. A worker record (directory-removed employee) still points to it.
**Hypotheses:** H1: the dependency-check endpoint is missing, renamed, or versioned differently (404/400 mapped to the "out of date" message). H2: a schema/contract mismatch in the response. H3: it crashes on a worker that was removed from the directory.
**Required behaviour:** `GET /hr/departments/{id}/dependencies` (or the existing equivalent) returns 200 `{employees:{active:n, inactive:n}, positions:n, ...}`. Archive with active dependents returns `409 {code:"DEPARTMENT_HAS_DEPENDENCIES", details:{...}}` unless a reassignment target is given. Archive is a soft state change and reversible (unarchive). Make sure the contract matches what the client calls, and update shared contract types if needed.
**Edge cases:** dependents only inactive or terminated (archive allowed?) (**DECIDE**: recommend allowed), double click (idempotent), cross-org, already archived (200 idempotent or 409 `INVALID_STATE`), a parent department with children.
**Tests:** integration tests for dependencies with mixed workers, archive blocked or allowed, unarchive, idempotent repeat, and a contract test against the shared schema.

#### BE-16 — VERIFIED IN CODE (employee-expenses.controller.ts:92 withdraw, rehire.controller.ts:45, departments-page.tsx:71,117), PENDING_BROWSER_VERIFICATION. No way to withdraw expense claims or delete/archive employees and departments (NEW, cleanup)
**Evidence:** claims only offer Edit (EXP-2026-001…004 stuck Pending, with no withdraw or delete). An employee can only be "Removed from directory" (the worker record stays in HR > People). There's no delete or archive for departments that works (see BE-15). Assets have Retire (which works as an archive equivalent).
**Decision (proposed; confirm before large changes):**
- **Expense claims:** add `POST /me/expenses/{id}/withdraw`, allowed by the claimant only while status is `PENDING` (or `DRAFT`). It moves to `WITHDRAWN`, is removed from approver queues, and is audited. Non-pending returns `409 {code:"INVALID_STATE"}`, someone else's claim returns 404/403. No hard delete.
- **Employees:** no hard delete. Provide archive/soft-delete (`archivedAt`, `archivedBy`) separate from termination, hidden from lists by default (`?includeArchived=true` for admins), restorable, and requiring `hr:employees:delete` or the equivalent. Keep history and audit. Make "Remove from directory" vs "archive" semantics explicit and documented.
- **Departments:** archive/unarchive per BE-15.
**Edge cases:** withdraw racing with approve (exactly one wins via conditional update), withdrawing a claim that's mid-reimbursement, archiving an employee who is a manager (reports flagged or require reassignment), archiving an employee with pending approvals assigned to them, re-creating an employee with the email of an archived one (see BE-10), list and pagination excluding archived records, cross-org.
**Tests:** integration tests for withdraw (pending OK, approved 409, others' 404/403, withdraw/approve race), archive/restore employee, and archived records excluded from queues and pickers.

---

### P2: Reliability and performance

#### BE-17: Notifications event stream drops (ERR_HTTP2_PROTOCOL_ERROR) and intermittent CORS failures (HRMS-023, BLOCKED; HRMS-022, NOT REPRODUCED but unproven) — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

HEARTBEAT_INTERVAL_MS=15_000 in notification-event.service.ts; SSE timing spec + teardown spec; cors-production-origins.spec.ts covers apex/www/evil.
**Evidence:** console showed `ERR_HTTP2_PROTOCOL_ERROR` / `ERR_CONNECTION_CLOSED` on the notifications stream. Once, about 16 endpoints on `api.streamlineos.in` failed with "No 'Access-Control-Allow-Origin'" (hr/hub, billing, organization…), coinciding with a blank /hr hub (HRMS-016). Not reproduced on later passes.
**Hypotheses:** H1: no SSE keepalive, so the proxy/LB idle timeout kills the stream mid-HTTP/2. H2: the response is buffered or compressed by the proxy. H3: CORS headers are missing on error responses (5xx/502 from the edge, or on preflight), so failures look like CORS. H4: the allowlist includes only `www.streamlineos.in` or only the apex, not both. H5: the `Vary: Origin` header is missing, so a CDN caches one origin's headers.
**Required behaviour (server/infra config in repo only):** SSE sends `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no` (if nginx), no compression, a heartbeat comment (`: ping`) every 15-25 s (below the smallest proxy idle timeout), `retry:` hint, and `id:` plus `Last-Event-ID` resume if supported. Clean shutdown on client disconnect (no leaked listeners). The SSE endpoint is authorized per org. CORS: an explicit allowlist covering `https://www.streamlineos.in` and `https://streamlineos.in` (and configured dev/staging origins from env), never `*` with credentials, CORS headers on **all** responses including 4xx/5xx and preflight, and `Vary: Origin`. Document any proxy/LB timeout changes needed outside the repo.
**Edge cases:** an origin not in the allowlist (no ACAO header), `null` origin, the origin with a trailing slash or different case, a long-lived stream past 10 minutes, a token expiring mid-stream, the user's org switch mid-stream.
**Tests:** integration tests: SSE emits a heartbeat within N s with a fake clock, the correct headers, and cleanup on disconnect. CORS tests per origin (allowed apex and www, disallowed evil.com) on 200, 404, 500, and OPTIONS.

#### BE-18: Slow list/load endpoints: pagination and indexes (HRMS-020 audit log ~20 s, NOT REPRODUCED in Retest 2 (~1 s); HRMS-016 hub blank, INTERMITTENT; /hr/employees 4-10 s skeleton) — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

boundHrReadLimit in hr-read-limits.ts caps all HR list reads at 100; DEFAULT_HR_READ_LIMIT=100.
**Evidence:** the access audit log drawer took about 20 s (P1/P3) and about 1 s in Retest 2. /hr hub showed header plus skeletons for 15+ s on one load and rendered in 3.2 s on others. The employee directory took 4-10 s. /hr/employees once took 6.6 s.
**Hypotheses:** unpaginated queries, N+1 queries (per-employee permission or relation lookups), missing indexes on (org_id, created_at) / (org_id, status), a hub endpoint aggregating many queries serially, or a hub endpoint failing (CORS/500) and the UI rendering blank.
**Required behaviour:** all HR list endpoints (employees, audit log, leaves, expenses, approvals, holidays) use cursor or limit/offset pagination (default 25, max 100, `limit>100` → clamp or 400 per convention), stable ordering, and org-scoped indexes. Remove N+1 queries. Hub: aggregate in parallel and return partial data with per-widget error flags instead of failing as a whole. Target p95 < 500 ms server time on seeded data (e.g. 5k employees, 50k audit rows). Add indexes in reversible migrations (concurrently, if Postgres).
**Edge cases:** `limit=0`, negative, huge, or non-numeric; invalid cursor (400); a page past the end (empty); an org with zero records; ordering ties.
**Tests:** integration tests for pagination contracts and a query-count assertion (no N+1) where the stack supports it. Optionally a perf smoke test on seeded data (report numbers; don't make CI flaky).

## 3. NOT REPRODUCED / unproven: regression tests only (no code change unless the code shows a defect)
- **HRMS-005** invite expiry: covered by BE-09 tests.
- **HRMS-022** CORS: covered by BE-17 tests.
- **HRMS-020** audit log latency: covered by BE-18 pagination/query-count tests.
- **HRMS-019** settings sub-pages wrong content and **HRMS-018** React #441 error boundary are client-side. If a backend endpoint behind those pages returns inconsistent data, add a contract test. Otherwise leave them out of scope.

## 4. Out of scope (frontend), do not change
HRMS-010 (no nav at 768px), HRMS-015 (phone field focus jump), HRMS-018 (React #441 error boundary), HRMS-019 (settings sub-page routing), HRMS-021 UI part (drawer stays open after double-click), HRMS-027 (keyboard to /settings/billing), HRMS-016 UI part (skeleton/blank rendering), UX-03 (sign-in email messages), UX-05 (date picker keyboard), UX-06 (skip link/tab order), UX-07 (Dialog descriptions), UX-08 (asset form sequential validation display), UX-09 (375px layout), UX-10 (contrast), UX-14 copy (backend only exposes the approver; see BE-04), UX-15 display copy (backend only stops leaking keys; see BE-01), UX-16 (skeleton progress copy). Already FIXED and not regressed: HRMS-001, 002, 003, 004, 006, 009, UX-01, 02, 04, 11, 12, 13 (no work needed beyond BE-11 for names).

---

## 5. Deliverables (put these in your final report)

### 5.1 Summary table (fill in)
| ID | QA ref | Priority | Root cause found (confirmed / hypothesis rejected) | Files changed | Migration? (reversible Y/N) | Contract change | Unit tests added | Integration tests added | Status (Fixed / Verified-not-present / Needs decision) |
|---|---|---|---|---|---|---|---|---|---|
| BE-01 | HRMS-008/024, UX-15 | P0 | | | | | | | |
| … | | | | | | | | | |

Also list: every **DECIDE** item with your recommendation and what you did, any API contract changes (new fields, codes, endpoints) for the frontend team, and any infra changes needed outside the repo (proxy/LB timeouts, CORS at the edge, email provider).

### 5.2 Verification checklist
- [ ] Stack notes written. Baseline test results recorded before changes.
- [ ] Full test suite passes. New tests fail on the old code and pass on the new code (show this for at least BE-03, BE-04, BE-06, BE-07, BE-08, BE-13, BE-14).
- [ ] Role × route matrix test covers every HR endpoint (Owner, HR Admin, Manager, Member, cross-org).
- [ ] `GET /me/permissions` (or equivalent) is documented and reflects role changes on the next request.
- [ ] No 403 body or URL hint contains raw permission keys. No sensitive values in responses for unauthorized roles (tested with populated data).
- [ ] No business-rule failure returns 500. Every new error has a stable `code` plus a human `message`.
- [ ] Approvals list loads with QA-like fixtures (directory-removed worker, no manager, cancelled/approved leaves).
- [ ] Self-approval is impossible, and own items are excluded from every approval queue (leave, expense, attendance).
- [ ] Parallel approve and parallel submit tests prove single-winner behaviour and single balance deduction.
- [ ] Zero-balance, overlap, weekend/holiday, half-day, and leap-year leave tests pass.
- [ ] Expense amount: max enforced and exposed via config, no truncation, decimal-safe.
- [ ] Idempotency: the same key never creates two records under parallel requests.
- [ ] Invite: GET doesn't consume, verify is single-use, re-visit doesn't show "expired", resend invalidates the old token and the email send is asserted.
- [ ] Duplicate email rule is identical on check and create, normalized, and backed by a unique index.
- [ ] Name validator messages match the offending character class. "Smith-Jones" and "O'Brien" pass.
- [ ] Attendance future-time check is correct at 22:53 IST with a frozen clock, and works in a DST zone.
- [ ] Holiday same-date (+location) conflict returns 409. Legacy duplicates are reported, not deleted.
- [ ] Department dependency check returns 200, and archive/unarchive works.
- [ ] Expense withdraw works for pending only. Employee archive/restore works. Nothing is hard-deleted.
- [ ] SSE heartbeat and headers are present. CORS is correct for apex and www on success, error, and preflight.
- [ ] List endpoints are paginated (max 100), with no N+1 queries and indexes added via reversible migrations.
- [ ] Migrations tested up → down → up on a copy of the schema.
- [ ] No frontend files changed (except listed shared contract types). No secrets added. Lint and typecheck pass.
