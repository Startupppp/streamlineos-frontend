# StreamlineOS HRMS — QA run hrms-2026-10-14 (HR-B-001 … HR-B-025)

## Status: all 25 bugs closed in code. Only browser verification remains.

Every bug in this brief was confirmed in code before being changed, fixed, and verified by
gates and tests. The bug-by-bug descriptions have been removed as each one closed; what is
left below is the work that is genuinely still outstanding.

Verified by: backend `typecheck` + `typecheck:test`, frontend `type-check` +
`check:test-typecheck` (a hard gate at zero), `check:contract-vendor`, `check:migration-ledger`
(1170/1170, 0 pending), and the HR/expenses/organization/directory suites.

**Migration 2035** (`exit_checklists.termination_id`, exclusive-arc CHECK, two partial indexes)
is **applied to production and verified by query** — FK and CHECK both `convalidated`,
`resignation_id` now nullable, ledger row present. It was rehearsed first inside a rolled-back
production transaction because local Postgres was down.

---

## 1. What still needs a browser

jsdom cannot see real rendering, focus order, paint or a live backend, so these are the items
no automated gate here can close. Run as the owner unless noted.

- [ ] Onboarding single employee: names with `'`, `-`, `.`, accents save (typed **and** pasted); digits and HTML rejected inline; duplicate email still blocked at Next; double-click Submit still creates one record; future DOB still impossible.
- [ ] Employee Edit: designation required/trimmed, 200-char max enforced; unsaved-changes prompt works; `<img onerror>` still rendered as text. Editing a person whose name carries digits (e.g. `adityachalla01`) must still save other fields untouched.
- [ ] Departments: create; duplicate name/code blocked **inline on the field**; blank → one message; archive (unused → archived, used → blockers); "View archived"; dialog shows name + code.
- [ ] Employee directory search: match, no-match (typed **and** fresh URL), clear; status filter + URL sync + "Clear filters". A typed no-match must show the empty state with **no** banner and **no** unfiltered rows.
- [ ] Shifts: create/edit a valid shift; inverted and equal times without Night Shift blocked; night shift allowed; confirm dialog shows the duration.
- [ ] Attendance: clock in/out and cooldown; **times correct in org zone with the browser at both TZ=UTC and TZ=Asia/Kolkata** (tracker, team attendance, daily history, dashboard clock); correction validation; approving another's correction → success toast and applied; own correction → no actions and API 403.
- [ ] Leave: request; own request "Needs another approver"; approve/reject by another approver; balance correct before **and** after; leaves list loads after a write, and a transient read failure degrades inline instead of blanking the route.
- [ ] Policies: create (accrual ≥ 0, ≤ 365, 2dp); edit a draft and see it persist; activate v1; new version → edit → activate v2 supersedes v1; a genuinely overlapping *different* policy still blocks.
- [ ] Expenses: valid claim; 0 / negative / letters / over-limit blocked inline **with the typed text kept** and by the API; edit respects the same rules.
- [ ] Assets: register, assign, log return, confirm → Available and unassigned; counts correct.
- [ ] Bulk upload: the malformed fixture rejected with its line number and no preview; the fixed file lists every row's errors including duplicate email and invalid date; a valid file still creates employees on confirm.
- [ ] Exit/termination: HR records a resignation for another employee; self resignation on `/me` unchanged; termination create → email → complete → employee inactive, sign-in refused, checklist on `/hr/exit`, FnF **draft** (not paid), asset returns created; **repeat complete is idempotent**.
- [ ] List pages (`/hr/asset-returns`, `/hr/cases`, `/directory`): real headers while loading, then empty states.
- [ ] **Role checks must be unchanged.** A Member with no HR role still denied on every `/hr/*` admin route with the same permission; `/hr/employees/{other id}` still denied; allowed routes still work. Members see name/work email only in the directory. An outsider gets `module:hr` org-disabled and "Not found" cross-org. The new actions (record resignation, complete termination, self-approval guard) enforce permissions server-side — a Member calling them directly gets 403. **Org Owner/Admin cannot self-approve a correction** (P1).
- [ ] No raw error text anywhere: no zod library text, no "ApiContractError" toast on a successful write, no JS exception text.

---

## 2. Policy decisions to confirm

These were chosen by this brief and are now implemented. Two change existing behaviour and are
worth an explicit yes or no.

| # | Decision | Note |
|---|---|---|
| **P11** | Expense cap lowered from **₹9,99,99,999 to ₹10,00,000** per claim, plus max 2 decimals, on client and server. | A real behaviour change. Claims already above ₹10,00,000 stay in the database, but editing one will require lowering its amount. No org/category limit is modelled, so none was added. |
| **P2** | Person names reject **digits** (`Numbers are not allowed in names`) and anything outside letters, marks, space, `'`, `’`, `-`, `.`; max 100. | **This reverses the HRMS-006 decision made earlier the same day**, which pinned that a name carrying digits must survive. Reconciled as: an email-derived name is a read-time *display* fallback, not something onboarding may store. Existing rows stay editable because the edit form submits a name only once it is dirty, so the 7 of 11 `organization_people` rows with email-derived names are unaffected unless someone edits the name itself. |
| P1 | Maker-checker on attendance corrections, with **no** Owner/Admin exemption. | As specified. |
| P7 | All attendance/leave/correction/dashboard times formatted in the **organisation** zone; "now" evaluated server-side in org zone; UTC stored. | The dashboard clock shows `—` until the zone resolves, so no browser-zone value is ever shown. |
| P12 | A confirmed asset return unassigns the asset in the same transaction and sets `AVAILABLE`, or `MAINTENANCE` when the condition says so. | There is no `DAMAGED`/`UNDER_REPAIR` status in the enum, so `MAINTENANCE` is the mapping. |
| P15 | Completing a termination archives the membership, revokes standing and sessions, seeds the offboarding checklist, creates the FnF draft and the asset-return rows, idempotently. | **The global `users.isActive` is deliberately left alone** — the user may belong to other organisations, so a global deactivation would be a cross-tenant side effect. Access is revoked at the organisation scope. Confirm this is what you want "sign-in disabled" to mean. |
| P3 | Department name unique per org, case-insensitive, trimmed, among non-archived rows — **checked in code, with no unique index and no migration**. | Production already holds the duplicate rows this QA run created, so a partial unique index could not be created. A concurrent create can therefore still race. |
| P10 | A new policy version supersedes its own lineage, with lineage derived by walking `parent_policy_id` to its root. | Not by name — a rename after v1 would break name matching. No lineage column was added. |

---

## 3. Follow-ups deliberately left out of scope

- **Expense caps elsewhere:** `expenses-import.service` and `travel.schemas.ts` carry their own amount caps, so **bulk import can still create a claim above ₹10,00,000**. Needs a decision on whether the new cap applies there too.
- **Shift type vs flag:** `type === "NIGHT"` is not coupled to `isNightShift` anywhere. P4 names only the flag, so only the flag gates the rule — a NIGHT-type shift with the flag off is still blocked when inverted. Should the type imply the flag?
- **Archived department code reuse:** the existing unique index on `(org_id, kind, code)` is not partial, so reusing an archived department's code still fails with a generic 409 and no field path.
- **Leave rule bounds:** only `accrualAmount` gained min/max/2dp. `maxBalance` and `carryForwardLimit` are unbounded.
- **Slow list reads:** `/hr/cases` and `/directory` took 10–15 s for QA. Not investigated; no obvious waterfall was looked for.
- **HR-U-016** directory membership/email visibility — a product question, deliberately unchanged (P16).
- Remaining UX notes from section 4 of the original brief that were not trivial inside files already touched.

---

## 4. Red gates that are **not** from this work — do not chase

Each was attributed by diffing against this session's baseline (root `18c8cc0d9`,
backend `1bc9c2f66`). None is in a file this brief's lanes own.

- **`check:contract-parity`** — 12 nullability mismatches on `/onboarding/session` and `/onboarding/module-checklists`, 8 undeclared `organizations` columns on `/crm/organizations`, and 66 frozen baseline entries that no longer reproduce (the gate's own remedy is `--update-baseline`, which only prunes). All in CRM and the onboarding wizard, changed by other sessions. The `/hr/assets` violation that *was* in scope is fixed.
- **`check:response-contracts`** — 4 unresolvable routes in `hooks/api/build/client-portal.ts`, `hooks/api/calendar-booking-public.ts`, `hooks/api/calendar-polls-public.ts`, `features/mail/mail-thread-message.tsx`. Three are byte-identical to baseline.
- **backend `typecheck:test`** — 3 errors: `build-automation-trigger-consumer.spec.ts` (its subject file did not exist at baseline, so it is new from the Build work) and `calendar-history.service.spec.ts` ×2 (calendar is another session's active lane).
- **backend suites** — `membership-artifacts.spec.ts`, `membership-artifact-fk-coverage.spec.ts` (every newly detected table and FK is `calendar_*` or `product_*`/`managed_product_*`; `exit_checklists` appears nowhere in them) and `hr-helpdesk-tenant-isolation.spec.ts` (`HrCalendarService` now calls `celebrations.getCalendarCelebrations`, both files changed by another session).
- **frontend suites** — `components/hr/onboarding-enter-guard.test.tsx` (3: the shared `MemberPicker` calls a Build project-members `useQuery` with no `QueryClientProvider`) and `features/hr/expenses/import-validation-preview-rows.test.tsx` (1: a missing "Last page" control). Both are the known pre-existing reds.
- **`frontend` `pnpm lint`** is broken on main independently of any code — the flat config references `react-hooks/*` rules where the plugin is not in scope and `eslint-plugin-react-hooks` is not a declared dependency. Use `npx eslint <paths>`.
