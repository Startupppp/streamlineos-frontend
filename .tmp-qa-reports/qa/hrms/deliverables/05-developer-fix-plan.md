# 05 Developer fix plan
Ordering by risk. "Likely layer" only where evidenced; otherwise investigation steps.

## Sprint 0 (before release)
1. HRMS-001 Sensitive tab access. Investigate: which permission gates the Sensitive tab vs Pay tab (payroll:salaries:view gates Pay). Add server-side check on sensitive-data read endpoints and hide the tab client-side. Test: Member with populated dummy values gets 403 + no tab. Add automated authz test per role.
2. HRMS-002 Leave approve 500. Pull server logs for POST /hr/leaves/{id}/approve around 14 Oct 00:2x IST (QA Employee Nov 16 leave) and 13 Oct ~22:55-23:15 IST (id 3). Note: leave has no reporting manager and is in HR queue with 2 approvers. Return 4xx with reason for any validation failure. Test: approve and reject paths, own vs others.
3. HRMS-004 Expenses not visible to HR. Trace EXP-2026-001..003 from POST /me/expenses (201) to the HR list query and approval routing. Test: new claim visible in /hr/expenses and Action Center.
4. HRMS-003 Optimistic concurrency on asset update (version/updatedAt check, 409 + UI prompt). Audit other full-form edit endpoints (employees, settings).
5. HRMS-005 Invite link validity: reconcile token-expiry check with invite status; check post-verify redirect. Also check email delivery logs for resend and HR Admin OTP (06).

## Sprint 1
6. HRMS-006 Remove character stripping from name inputs; allow Unicode letters (\p{L}\p{M}), spaces, apostrophe, hyphen; validate server-side with message.
7. HRMS-007 Document and fix reporting-manager eligibility; show reason for ineligible people.
8. HRMS-008 / HRMS-024 / HRMS-025 Permission-driven rendering: filter sidebar, hide Edit and self-Approve affordances; restrict /hr/access for Members.
9. HRMS-009 Draft persistence or beforeunload guard for onboarding.
10. HRMS-010 Add tablet navigation pattern 768-1023px.
11. HRMS-011/012 Amount max validation, submit-in-flight disable, success toast.
12. HRMS-013 Duplicate holiday warning. HRMS-014 compare correction times in org timezone (confirm hypothesis first with logs). HRMS-015 phone input focus. HRMS-017 duplicate email rule.

## Sprint 2 (stability, UX, a11y)
HRMS-016/018/019/020/022/023 (capture with RUM/error tracking: React #441 digest 605193880; CORS headers on api.streamlineos.in on error responses; SSE stability), HRMS-021, HRMS-026, HRMS-027, UX-01..16.

## Regression set after fixes
TC-14, 15, 19, 21, 30, 31, 32, 34, 38, 41, 45, 51, 55 plus full HR Admin matrix.
