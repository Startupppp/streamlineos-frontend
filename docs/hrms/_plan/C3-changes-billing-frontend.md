# C3 — Billing/Entitlements + Frontend Change-Map

> Lane C3 · Phase-2 Planning · 2026-07-31
> READ-ONLY planning document. No production code changed.
> Every `path:line` citation confirmed by opening the file this session.
> Rule refs: CLAUDE.md §n; brief codes BILLING §1–13 / FRONTEND §1–21.

---

## Row Format

`ID | Layer | Target file:line | Category | Severity | Current | Problem (+rule ref) | Fix | Breaking?+migration | Blast radius | Depends on | Batch`

---

## Section 1 — Billing / Entitlements (Backend)

### BILLING-01
`BILLING-01 | Backend | backend/src/modules/ai/core/billing/feature-gates.ts:79-99 | Security/Entitlement | P0 | requireFeature(u.plan, feature) reads plan from JWT claim; 20+ AI controller sites call it | Stale JWT = paywall bypass on downgrade; upgrade doesn't unlock until re-login. Second entitlement engine with wrong data source. BILLING §1, CLAUDE.md §0.4 | Delete PLAN_FEATURES map + requireFeature() + canUseFeature(); add checkFeature(orgId, feature): boolean to PlanLimitsService delegating to getEntitlements().features[feature]; update all 20+ AI controller call sites to call this.planLimitsService.checkFeature(req.user.orgId, feature) | Non-breaking; plan is NOT stripped from JWT yet (BILLING-02 is next) | All AI feature endpoints (crm-ai, hr-ai, projects-ai, feedbucket) | None | Batch A`

### BILLING-02
`BILLING-02 | Backend | backend/src/common/auth/jwt-auth.guard.ts:184 | Security/Auth | P1 | JWT payload includes a plan field read by requireFeature() | After BILLING-01 deletes requireFeature(), this claim is dead weight that misleads future maintainers and creates drift risk if anything re-reads it. BILLING §1 | Remove plan claim from JwtPayload type and from the JWT minting site (jwtSign call); verify zero remaining read sites | Non-breaking after BILLING-01; sessions must be re-issued (force logout on deploy or accept 30min JWT TTL decay) | JWT consumers; existing active sessions have stale claim but it is ignored | BILLING-01 complete | Batch A`

### BILLING-03
`BILLING-03 | Backend | backend/src/modules/billing/core/plan-limits.service.ts:205 | Entitlement/UX | P0 | throw new ForbiddenException("Your X plan allows Y…") — HTTP 403, no machine-readable code | Frontend cannot distinguish RBAC denial (403) from quota exceeded; no upgrade prompt possible. BILLING §2, CLAUDE.md §15 | Add PaymentRequiredException extends HttpException to common/http/api-exceptions.ts; in assertWithinLimit() replace ForbiddenException with throw new PaymentRequiredException({ code: "QUOTA_EXCEEDED", limitKey: key, used, limit, upgradePath: nextPlanFor(plan) }); return HTTP 402 | Non-breaking for backend; frontend must handle 402 (FE-12 wires EntitlementGate) | All assertWithinLimit call sites; all create endpoints | None | Batch A`

### BILLING-04
`BILLING-04 | Backend | backend/src/common/http/api-exceptions.ts:6 | Entitlement/UX | P0 | ModuleDisabledException constructor passes HttpStatus.NOT_FOUND (404) | "Module not on this plan" looks like a routing 404 to clients and SEO bots. Correct code is 402 Payment Required. BILLING §2 | Change HttpStatus.NOT_FOUND to HttpStatus.PAYMENT_REQUIRED; change code from MODULE_DISABLED to MODULE_NOT_ENABLED; add upgradePath field if locked by plan vs just disabled | Non-breaking for existing API consumers (semantically more correct); update frontend isApiError status checks | All ModuleGuard throw sites | None | Batch A`

### BILLING-05
`BILLING-05 | Backend | backend/src/modules/billing/core/plan-limits.service.ts:63-65 | Cache | P1 | bust(orgId) deletes only in-memory tierCache; Redis key billing:entitlements:${orgId} is never invalidated | After upgrade payment, entitlements are stale for up to 60s (ENTITLEMENTS_CACHE_TTL). BILLING §3 | In bust(orgId), also call await this.cache.del("billing:entitlements:" + orgId); rename bust → bustEntitlements and update all call sites (billing.service.ts:verifyAndActivate) | Non-breaking; adds one Redis DEL per plan change | All billing.service verifyAndActivate call sites | CacheService.del() must exist (verify) | Batch A`

### BILLING-06
`BILLING-06 | Backend | backend/src/modules/billing/core/plan-limits.service.ts:300-304 | Data Integrity | P1 | fetchCount("acctInvoices"): SELECT COUNT(*)::int FROM invoices WHERE org_id = ${orgId} — no deleted_at IS NULL filter | Voided invoices count against quota; voiding doesn't free the user's limit. BILLING §4 | Add AND deleted_at IS NULL to the acctInvoices count query at line 302; also add AND deleted_at IS NULL to the fetchAllCounts bulk query at line 156 | Non-breaking | Invoice creation path | None | Batch D`

### BILLING-07
`BILLING-07 | Backend | backend/src/modules/billing/core/plan-limits.service.ts:270-274 | Data Integrity | P1 | fetchCount("crmDeals"): SELECT COUNT(*)::int FROM deals WHERE org_id = ${orgId} — no deleted_at IS NULL | Inconsistent with crmLeads/crmContacts which filter soft-deletes. BILLING §4 | Add AND deleted_at IS NULL to crmDeals count query at line 272 and to bulk fetchAllCounts query at line 151 | Non-breaking | Deal creation path | None | Batch D`

### BILLING-08
`BILLING-08 | Backend | backend/src/modules/billing/core/plan-limits.service.ts:225-238 + backend/src/modules/billing/core/billing.service.ts:488 | Data Integrity | P1 | fetchCount("members") for enforcement uses members+pending-invites; getSeatInfo() display uses members only; platform_subscriptions.seatCount is never updated | Three seat definitions; user sees "4 used" but enforcement counts 5 causing confusing 402 on 5th invite. BILLING §4 | (a) Make getSeatInfo() match enforcement definition: SELECT members + pending-unexpired-invites; (b) add a seat_ledger table to record MEMBER_JOINED/LEFT/INVITE_SENT/EXPIRED events; (c) deprecate platform_subscriptions.seatCount (BILLING-09); seat display label: "4 active + 1 pending invite = 5 of 10" | Non-breaking; schema additive (seat_ledger table is new) | Billing UI seat display; invite flow | BILLING-09 | Batch D`

### BILLING-09
`BILLING-09 | Backend/Schema | backend/src/db/schema/common/platform.ts:100 | Data Quality | P2 | platform_subscriptions.seatCount integer default 1 — column never updated, never read in enforcement | Dead field creates false audit trail; diverges from all three live seat definitions. BILLING §4 | Mark column as deprecated in a code comment (do NOT drop yet — await seat_ledger being the canonical source for 1 billing cycle); add a migration comment; add seat_ledger table (schema additive) | Non-breaking; eventual DROP in a future migration once ledger is authoritative | None once BILLING-08 provides ledger | BILLING-08 | Batch D`

### BILLING-10
`BILLING-10 | Backend | backend/src/db/schema/common/enums.ts:118 + billing codebase | Revenue | P0 | PAST_DUE status defined in subscription_status enum but never set anywhere in production code; no payment failure handler exists | Failed Razorpay charge leaves subscription ACTIVE indefinitely; revenue leak per failed renewal. BILLING §5 | (a) In billing/core/razorpay-webhook.controller.ts add handler for Razorpay subscription.charged failure event; transition subscription to PAST_DUE via billing.service; (b) add processPaymentFailures() to cron-billing.service.ts: PAST_DUE orgs past grace period (D+14) → SUSPENDED; (c) define SUSPENDED in enum or use CANCELLED with isSuspended flag | Schema additive (new status value or flag column); webhook handler is new code | cron-billing-controller, billing.service, dunning email templates | BILLING-11, L-jobs (dunning emails) | Batch C`

### BILLING-11
`BILLING-11 | Backend | backend/src/modules/cron/cron-billing.service.ts:(no processDunning found) | Revenue | P1 | No dunning flow exists; confirmed absent in Lane L §8 | Failed payment → no retry, no email, no degradation. Subscriber cancels; we get no recovery window. BILLING §5 | Add processDunning() to cron-billing.service: (a) query PAST_DUE subscriptions; (b) send D+1/D+3/D+7 reminder emails via NotificationDispatchService; (c) trigger Razorpay retry via razorpay.service; (d) at D+14 call transitionToSuspended(); add /cron/dunning-flush endpoint | Non-breaking (new cron endpoint, must register with external scheduler) | razorpay.service, email templates, cron-billing.controller | BILLING-10, L-jobs | Batch C`

### BILLING-12
`BILLING-12 | Backend | backend/src/modules/billing/core/ai-credits-reservation.service.ts:110-178 | Financial Integrity | P1 | settle(reservationId, actualMilli): no idempotency check; if called twice inserts two USAGE transactions and double-debits lifetimeConsumed | Double-settle causes credit accounting errors; customer disputes. BILLING §6 | (a) Add idempotency_key text UNIQUE column to ai_credit_transactions schema; (b) in settle(), before doing anything: check reservation.status; if SETTLED return early (idempotent replay); (c) use INSERT ... ON CONFLICT (idempotency_key) DO NOTHING for the USAGE transaction insert; forward reservation.idempotencyKey to transaction insert | Schema migration (add column with UNIQUE); application non-breaking | AI credit consumers; all AI endpoint paths | None | Batch C`

### BILLING-13
`BILLING-13 | Backend | backend/src/modules/cron/cron-billing.service.ts:119-154 | Financial Integrity | P2 | Auto top-up same-day guard uses YYYY-MM-DD UTC date string as the idempotency key; wallets at threshold near UTC midnight can be topped up twice in one business day (IST midnight ≠ UTC midnight) | Double top-up charge for IST users near midnight. BILLING §6 | Change same-day guard date key from UTC to IST (Asia/Kolkata): new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) or store lastAutoTopUpAt as a timestamptz and compare DATE_TRUNC('day', now() AT TIME ZONE 'Asia/Kolkata') | Non-breaking | Auto top-up cron path | None | Batch C`

### BILLING-14
`BILLING-14 | Backend | backend/src/modules/billing/payments/payment-webhooks-public.controller.ts:(handler body) | Reliability/Audit | P1 | After HMAC verification, only a redacted summary (id, status, amount) is persisted; raw request body is NOT stored | Cannot reconstruct events for dispute resolution; reconciliation impossible without original payload; SHA-256 fallback for missing event_id requires raw body. BILLING §7 | In webhook handler, after HMAC verify but before any business logic: INSERT INTO payment_webhook_events (raw_payload = rawBody) ON CONFLICT DO NOTHING; then return 200 immediately; move business processing to async cron worker. payment_webhook_events table already exists (billing.ts:97 — verify raw_payload column exists or add bytea column) | Schema migration if raw_payload column absent; response contract: 200 before processing | webhook handler, payment_webhook_events schema | None | Batch E`

### BILLING-15
`BILLING-15 | Backend | backend/src/modules/cron/(no reconciliation found) | Reliability | P1 | No daily reconciliation job comparing Razorpay settlement list vs platform_payments | Silent payment discrepancies; discovered only on customer complaint. BILLING §7 | Add processPaymentReconciliation() to cron-billing.service: (a) query Razorpay /settlements endpoint for D-1; (b) compare against platform_payments by razorpay_payment_id; (c) emit alert notification for any gap > threshold; add /cron/payment-reconcile endpoint | Non-breaking new cron; must register with external scheduler | razorpay.service, notification dispatch | BILLING-14 (raw payload for cross-ref) | Batch E`

### BILLING-16
`BILLING-16 | Backend | backend/src/modules/invoices/invoices-write.service.ts:96-104 | Compliance | P1 [UNVERIFIED — accountant sign-off required] | Invoice numbering: const nextNum = (countRows[0]?.count ?? 0) + 1; const invoiceNumber = "INV-" + new Date().getFullYear() + "-" + String(nextNum).padStart(4,"0"); Year is calendar year (Jan 1 reset) not Indian FY (Apr 1 reset); COUNT(*)+1 is gap-prone on hard-delete | Indian GST Rule 46 requires consecutive numbering per financial year (Apr 1–Mar 31). Calendar year prefix creates ambiguity across FYs. [UNVERIFIED — requires CA confirmation] BILLING §9 | Replace with a DB sequence per org-per-FY: store fy_invoice_sequences(org_id, fy_label, next_val) with a composite unique; use advisory lock + UPDATE ... RETURNING for atomic increment; prefix INV-FY2627-NNNN (Apr 2026–Mar 2027 = FY2627). Requires a new schema table. | Schema migration; existing invoice numbers are not retroactively changed | Invoice creation; all invoice number consumers | **USER + ACCOUNTANT DECISION REQUIRED** before implementation | Batch F`

### BILLING-17
`BILLING-17 | Backend | backend/src/modules/billing/core/billing.service.ts:(createOrder/charge path) | Compliance | P1 [UNVERIFIED — accountant sign-off required] | Platform billing (StreamlineOS charging orgs) does not add 18% GST to PLAN_PRICES_PAISE; billing_profiles.gstin column exists but is never used to compute CGST/SGST/IGST at charge time | If GST-registered with turnover above threshold, every platform invoice is under-collecting tax by 18%. [UNVERIFIED — requires CA confirmation] R3 §4A | Surface the question to the user/CA: "Is StreamlineOS GST-registered? If yes, platform invoices must add 18% GST (CGST+SGST intra-state, IGST inter-state) and GSTIN must appear on receipts." Do NOT change tax calculations without CA sign-off. | **USER + ACCOUNTANT DECISION REQUIRED** — do not implement tax changes without explicit sign-off | Platform billing charge flow | CA confirmation | Batch F`

### BILLING-18
`BILLING-18 | Product | backend/src/modules/billing/core/plan-entitlements.constants.ts:43-58 | Product Gap | P1 [PRODUCT DECISION] | STARTER plan limits (members=10, projects=25, chatChannels=50…) and PROFESSIONAL limits (members=50, chatChannels=200…) both resolve to PlanTier="PAID" via PlanLimitsService; PLAN_FEATURE_FLAGS["PAID"] is a single set — STARTER and PROFESSIONAL get identical feature flags | Commercial gap: two paid plans priced differently (₹999 vs ₹2499/mo) but delivering the same feature flags. Customers have no feature differentiation incentive to upgrade between them. BILLING §1 | **PRODUCT DECISION REQUIRED**: define which PLAN_FEATURE_FLAGS differ between STARTER and PROFESSIONAL; update PLAN_FEATURE_FLAGS to be keyed by EffectivePlan ("STARTER"/"PROFESSIONAL") not PlanTier; update PlanLimitsService.computeEntitlements to use plan not tier for feature lookup | Breaking — changes what STARTER users can do; requires customer communication plan | Feature gating across all AI/advanced feature endpoints | **USER DECISION REQUIRED** on feature differentiation | Batch F`

### BILLING-19
`BILLING-19 | Backend | backend/src/modules/billing/core/plan-limits.service.ts:192-209 | UX | P1 | assertWithinLimit fires only on create operations; no threshold notification mechanism exists; no 80%/100% alert at any point | Users hit quota walls with zero warning; support cost; churn. BILLING §8 | In assertWithinLimit(), after computing used+limit, if used / limit >= 0.8 (and not already at 100%), enqueue a throttled quota-alert notification via NotificationDispatchService with code QUOTA_WARNING; at 100% emit QUOTA_REACHED; throttle: one notification per limitKey per org per 24h via existing notification deduplication (idempotencyKey = orgId + key + "quota-alert" + dateBucket) | Non-breaking additive; may send a burst of alerts on first deploy (acceptable) | notificationDispatchService, existing event catalog | L-jobs (notification pipeline) | Batch E`

---

## Section 2 — HR Direct Onboarding Seat Bypass

### BILLING-20
`BILLING-20 | Backend | backend/src/modules/hr/lifecycle/(employee creation service — assertWithinLimit not found) | Enforcement | P1 | assertWithinLimit("members") checked only in invitations.service.ts:160. Direct HR employee creation via hr/lifecycle/ does not call it; HR admin can onboard employees beyond seat limit bypassing the invitation flow | Seat limit bypassed for direct onboarding. E-billing §3 | Add assertWithinLimit("members") call at the start of the HR employee creation service method (before INSERT into users/employees); verify with Lane C2/D for the exact service and line in hr/lifecycle/ | Non-breaking (identical guard logic to invitation flow) | HR employee creation; onboarding API | None | Batch A`

---

## Section 3 — Frontend Gates (Server-Side)

### FE-01
`FE-01 | Frontend-Page | frontend/app/(authenticated)/hr/layout.tsx:1 | Security | P1 | Layout has no requirePermission — wraps only in HrProvider, HrPathTracker, HrWelcomeDialog; ~60 "use client" HR pages have zero server-side permission gate, only session check from top layout | Any authenticated user can navigate directly to any HR URL. CLAUDE.md §0.5 / FRONTEND §2 | hr/layout.tsx cannot do requirePermission for all children (different pages need different keys). Pattern: each high-risk page must be converted from CC to SC (thin server shim + requirePermission + delegate to feature client component), matching payroll pattern. Priority list: /hr/employees, /hr/termination, /hr/settings/*, /hr/compensation-planning, /hr/equity, /hr/workforce-cost | Non-breaking (more restrictive); non-owner users hitting restricted pages get redirect to /hr instead of data | Each converted page; layout unchanged | None | Batch B`

### FE-02
`FE-02 | Frontend-Page | frontend/app/(authenticated)/billing/page.tsx:1 | Security | P1 | Billing page: CC with no gate; any authenticated user can view subscription/payment/plan tabs | Subscription data exposed to non-admin employees. FRONTEND §2 | Convert to SC thin shim with requirePermission("settings:view") (matches useSubscription gate in hooks); delegate to existing BillingPageClient | Non-breaking | billing page, all tabs | None | Batch B`

### FE-03
`FE-03 | Frontend-Page | frontend/app/(authenticated)/billing/ai-credits/page.tsx:1 | Security + LOC | P0 | CC, no gate, 564 LOC in route file | Entitlement/credit data accessible to all; entire UI in route file violates §9 file-size cap. FRONTEND §2 + CLAUDE.md §9 | (a) Add requirePermission("settings:view") SC shim; (b) extract all UI to features/billing/ai-credits-page.tsx (new feature file); route file becomes 10-line SC delegator | Non-breaking | ai-credits UI; billing feature folder | None | Batch B`

### FE-04
`FE-04 | Frontend-Page | frontend/app/(authenticated)/billing/invoices/new/page.tsx:1 | LOC + Security | P0 | CC, no gate, 678 LOC; Zod schema inline in route file | No permission gate on invoice creation; §9 LOC violation; §7 inline schema violation | Extract to features/billing/invoices/new-invoice-page.tsx; Zod schema → features/billing/invoices/new-invoice-schema.ts; add requirePermission("accounting:create") server shim | Non-breaking | billing/invoices feature | None | Batch F`

### FE-05
`FE-05 | Frontend-Page | frontend/app/(authenticated)/settings/delegations/page.tsx:1 | LOC | P0 | CC, DashboardGate("settings:rbac:manage") client-only, 734 LOC | Client-side-only gate is bypassable; §9 LOC violation. FRONTEND §2 | Convert to SC shim with requirePermission("settings:rbac:manage"); extract UI to features/settings/delegations/delegations-page.tsx | Non-breaking | settings/delegations feature | None | Batch F`

### FE-06
`FE-06 | Frontend-Page | frontend/app/(authenticated)/settings/roles/page.tsx:49 | LOC + Security | P0 | CC, DashboardGate("settings:rbac:manage") client-only, 544 LOC | Client-side gate; LOC violation. FRONTEND §2 | SC shim + requirePermission("settings:rbac:manage"); extract to features/settings/roles/roles-page.tsx | Non-breaking | Roles management feature | None | Batch F`

### FE-07
`FE-07 | Frontend-Page | frontend/app/(authenticated)/settings/audit-log/page.tsx:10 | LOC + Security | P0 | CC, DashboardGate("audit-log:read") client-only, 529 LOC | Audit log is highly sensitive; client-side-only gate is bypassable. FRONTEND §2 | SC shim + requirePermission("audit-log:read"); extract to features/settings/audit-log/audit-log-page.tsx | Non-breaking | audit-log feature | None | Batch F`

### FE-08
`FE-08 | Frontend-Page | frontend/app/(authenticated)/hr/termination/page.tsx:1 | LOC + Security | P0 | CC, no gate, 516 LOC | Termination workflow completely ungated; any employee can navigate to it. FRONTEND §2 | SC shim + requirePermission("hr:exit:manage"); extract to features/hr/termination/termination-page.tsx | Non-breaking | termination feature | None | Batch B`

### FE-09
`FE-09 | Frontend-Page | frontend/app/(authenticated)/payroll/me/page.tsx:9 + payroll/team/page.tsx:9 + payroll/settings/import-export/page.tsx:9 | Security | P1 | Three payroll pages use requireSession() instead of requirePermission(); any authenticated user can access own-payroll, team-payroll, and import-export | requireSession() bypasses RBAC entirely. FRONTEND §2 | Replace requireSession() with appropriate requirePermission() keys: /payroll/me → "self:payroll"; /payroll/team → "payroll:salaries:view"; /payroll/settings/import-export → "payroll:settings:manage" | Non-breaking | payroll pages | None | Batch B`

---

## Section 4 — Query Hook Gates (F3 Mismatches)

### FE-10
`FE-10 | Frontend-Hook | frontend/hooks/api/hr/employees.ts:122 | Security | P0 | useHrEmployees: enabled: options?.enabled ?? true — NO useCan gate; backend requires @RequirePermission("hr:employees:read") | 403-spams for all non-HR users on any page that mounts this hook. CLAUDE.md §11 | Add const canRead = useCan("hr:employees:read"); merge: enabled: canRead && (options?.enabled ?? true) — BEFORE the ...options spread to avoid CLOBBER bug | Non-breaking (reduces 403 noise; HR users unaffected) | useHrEmployees callers (~many) | None | Batch A`

### FE-11
`FE-11 | Frontend-Hook | frontend/hooks/api/hr/employees.ts:133 | Security | P1 | useHrEmployeeOptions: useCan("hr:employees:view") but backend requires "hr:employees:read" — distinct catalog keys | Wrong user set blocked (view-only) or allowed (read-only). F3 mismatch 1. CLAUDE.md §11 | Change gate key from "hr:employees:view" to "hr:employees:read" | Non-breaking | useHrEmployeeOptions callers | None | Batch A`

### FE-12
`FE-12 | Frontend-Hook | frontend/hooks/api/hr/termination.ts:98 | Data | P1 | useTerminations: useCan("hr:exit:manage") but list GET requires only "hr:exit:view" | View-only HR managers never see terminations list. F3 mismatch 2 | Change gate from "hr:exit:manage" to "hr:exit:view" | Non-breaking | termination list UI | None | Batch A`

### FE-13
`FE-13 | Frontend-Hook | frontend/hooks/api/access/user-module-access.ts:7 | Cache Integrity | P1 | userModuleAccessKey = ["access", "user-module-access", userId] — missing "streamlineos" root prefix | queryClient.invalidateQueries({ queryKey: queryKeys.access.me() }) never matches this key; module toggle leaves stale access in cache forever. F3 §2 | Change line 12 to: ["streamlineos", "access", "user-module-access", userId] as const | Non-breaking (only changes the key; mutation's invalidation must also use the new key) | useUserModuleAccess, useSetUserModuleAccess mutation | None | Batch A`

### FE-14
`FE-14 | Frontend-Hook | frontend/hooks/api/hr/cases.ts:84 | Cache Integrity | P2 | caseKeys.all = ["streamlineos", "hr-cases"] — non-standard segment; queryKeys.hr.all prefix invalidation misses it | HR-wide invalidation after org changes never clears case data. F3 §2 | Change segment: ["streamlineos", "hr", "cases"] as const; update all caseKeys derivations in the same file | Non-breaking after consistent update | useHrCases and all case mutations | None | Batch D`

### FE-15
`FE-15 | Frontend-Hook | frontend/hooks/api/hr/analytics.ts:26,42,61,81,99,156,187,199,215,234 | Security | P0 | 10 analytics hooks have NO useCan gate; backend controller-level requires "hr:analytics:read" | 403-spam for all non-HR users on analytics surfaces. F3 mismatch 5 | Add const canRead = useCan("hr:analytics:read"); enabled: canRead to all 10 hooks | Non-breaking | HR analytics page callers | None | Batch A`

### FE-16
`FE-16 | Frontend-Hook | frontend/hooks/api/hr/attendance.ts:20,31,174,184,250,290 | Security | P0 | 6 attendance hooks have NO useCan gate; backend requires "hr:attendance:view" | 403-spam for all non-HR users. F3 mismatch 6 | Add const canView = useCan("hr:attendance:view"); enabled: canView to all 6 hooks | Non-breaking | Attendance page callers | None | Batch A`

### FE-17
`FE-17 | Frontend-Hook | frontend/hooks/api/access/org-modules.ts:31 | Security | P0 | useOrgModules: no useCan gate; backend requires "settings:manage" | Fires for every user; any non-admin triggers 403 on every render that mounts this hook. F3 mismatch 4 | Add const canManage = useCan("settings:manage"); enabled: canManage | Non-breaking | Settings/modules page, any component using useOrgModules | None | Batch A`

### FE-18
`FE-18 | Frontend-Hook | frontend/hooks/api/hr/employees.ts:159 | Security | P1 | useHrOrgChart: no useCan gate; backend requires "hr:employees:view" | 403-spam on org-chart page for users without HR access. F3 mismatch 7 | Add const canView = useCan("hr:employees:view"); enabled: canView | Non-breaking | HR org-chart page | None | Batch A`

### FE-19
`FE-19 | Frontend-Hook | frontend/hooks/api/hr/leaves.ts:223 | Security | P1 | useHrLeaveApprovals: no useCan gate (caller-bool only); backend requires "hr:leaves:view" | Leave approvals fire for users without hr:leaves:view. F3 mismatch 8 | Add const canView = useCan("hr:leaves:view"); merge: enabled: canView && (options?.enabled ?? true) | Non-breaking | Leave approvals page | None | Batch A`

### FE-20
`FE-20 | Frontend-Hook | frontend/hooks/api/access/user-module-access.ts:19 | Data Integrity | P2 | useSetUserModuleAccess onSuccess calls setQueryData with no onError rollback | On error, wrong module access state is cached forever until next manual refetch. F3 §5 | Add onError handler: queryClient.invalidateQueries({ queryKey: userModuleAccessKey(userId) }) to force refetch and clear the optimistic write | Non-breaking | Module access toggle UI | FE-13 (key must be correct first) | Batch D`

### FE-21
`FE-21 | Frontend-Hook | frontend/hooks/api/hr/employees.ts:146 | Data | P2 | useUpdateProfile invalidates only queryKeys.hr.employees() list; does not invalidate queryKeys.hr.employee(userId) detail cache | After profile edit, detail page shows stale data. F3 §5 | In onSuccess, also call qc.invalidateQueries({ queryKey: queryKeys.hr.employee(userId) }) and qc.invalidateQueries({ queryKey: queryKeys.hr.employeeStats(userId) }) | Non-breaking | Employee detail page | None | Batch D`

---

## Section 5 — API Client

### FE-22
`FE-22 | Frontend-Lib | frontend/lib/api-client.ts:(fetch calls throughout) | Reliability | P1 | No request timeout or AbortController on any fetch call; a hung backend connection blocks indefinitely | Page renders and mutations hang forever on backend timeouts. FRONTEND §14 | Wrap each fetch with AbortSignal.timeout(15_000) (15s default, configurable); update download helper separately (it uses blob()); update server-side axios client with timeout: 15000 as well | Non-breaking; may surface previously-silently-hung requests as explicit errors | All API calls; error handling paths | None | Batch E`

---

## Section 6 — Frontend Business Logic

### FE-23
`FE-23 | Frontend-Feature | frontend/features/payroll/salary-structures/salary-structure-template-sheet.tsx:56-84 | Architecture | P0 | CtcPreview component calculates HRA = basic × hraPercent/100; gross = basic+HRA+…; PF = basic × pfPercent/100; estimatedNet = gross - PF - profTax entirely in UI | Payroll arithmetic is backend business logic. CLAUDE.md §0.4 / §6 | Add GET /payroll/salary-structures/preview endpoint to backend that accepts basic+components+percents and returns {hra, gross, pfDeduction, estimatedNet}; replace CtcPreview calculation with useQuery or useMutation calling that endpoint; show loading state | Non-breaking UX (preview result same); removes incorrect frontend formula | salary-structure-template-sheet, backend salary-structures controller | Backend preview endpoint must be created first | Batch F`

### FE-24
`FE-24 | Frontend-Feature | frontend/features/payroll/employees/employee-detail-page.tsx:261-266 | Architecture | P0 | monthlyGross = earningSum > 0 ? earningSum : parseFloat(activeProfile.annualCtc)/12; estimatedNet = monthlyGross - deductionSum computed in UI component | Payroll computation in frontend. CLAUDE.md §0.4 / §6 | Backend should return computed monthly/annual summaries in the employee salary profile endpoint response; remove the frontend arithmetic; display server-returned values | Non-breaking | employee-detail-page | Backend salary-profile endpoint change | Batch F`

---

## Section 7 — EntitlementGate Component

### FE-25
`FE-25 | Frontend-Component | frontend/components/(does not exist) | UX | P1 | No EntitlementGate component exists; useEntitlements() hook exists at hooks/api/entitlements.ts but only plan-usage-meters.tsx calls it; no upsell/paywall state on any HR/payroll surface | Without an EntitlementGate, 402 responses from BILLING-03 result in generic error toasts rather than upgrade prompts. FRONTEND §16 | Create components/entitlement-gate.tsx: accepts limitKey or featureKey; reads useEntitlements(); if limit exceeded renders upsell card (upgrade path from BILLING-03 response) with plan name, limit, and upgrade CTA; otherwise renders children; drives all paywall UX off machine-readable code field. Use isApiError(e) && e.status === 402 && e.data.code === "QUOTA_EXCEEDED" in queryFn onError | Non-breaking additive; wiring to each surface is a separate step | All HR/payroll creation surfaces; plan page | BILLING-03 (machine code must exist) | Batch E`

---

## Section 8 — Shared Primitives & Duplication

### FE-26
`FE-26 | Frontend-Lib | frontend/features/payroll/shared/payroll-format.ts:1 | DRY | P2 | formatMoney(amount, currency) lives in features/payroll/shared/ — HR cannot naturally discover it, causing 15+ HR bypass sites using inline toLocaleString. F2 §3 | Move formatMoney + formatMonth to lib/format-money.ts; update all 25+ payroll import sites and all 15+ HR bypass sites; add a shared formatDate(date, pattern?) to lib/format-date.ts | Non-breaking (pure rename); import paths change | All payroll and HR money-rendering sites | None | Batch F`

### FE-27
`FE-27 | Frontend-Feature | frontend/features/billing/invoice-detail.tsx:38-53 + frontend/features/billing/invoice-detail.tsx:71 + frontend/features/billing/invoice-line-items.tsx:26 + frontend/features/billing/record-payment-dialog.tsx:44 + frontend/features/billing/components/payments-tab.tsx:23 + frontend/features/billing/components/plan-card.tsx:86,91 | DRY | P2 | 5 billing files define local fmt() / toLocaleString formatters duplicating formatMoney; plan-card.tsx:55 hard-codes * 0.8 instead of PRICING.annualDiscountPct/100; invoice-detail.tsx uses raw AlertDialog bypassing ConfirmDialog | CLAUDE.md §0.9 / F2 §3 | (a) Replace all local fmt() with lib/format-money.formatMoney() after FE-26; (b) fix plan-card.tsx:55 to Math.round(config.monthlyPrice * 12 * (1 - PRICING.annualDiscountPct / 100)); (c) replace AlertDialog in invoice-detail.tsx:23-29 with ConfirmDialog from components/ui/confirm-dialog.tsx | Non-breaking | billing feature files | FE-26 | Batch F`

### FE-28
`FE-28 | Frontend-Feature | frontend/features/billing/invoice-detail.tsx:1 | LOC | P0 | 592 LOC in features file — hard cap exceeded. F2 §5 | Split by responsibility: extract InvoiceStatusBadge to features/billing/invoice-status-badge.tsx; extract InvoiceLineItems to its own file (already exists: features/billing/invoice-line-items.tsx — verify); extract RecordPaymentDialog; target ≤300 lines each | Non-breaking | invoice-detail consumers | None | Batch F`

### FE-29
`FE-29 | Frontend-Feature | frontend/features/hr/leaves/components/leaves-shared.tsx:1 | LOC | P0 | 540 LOC in features file. F2 §5 | Split: extract LeaveStatusBadge (should delegate to SemanticBadge — see FE-30); extract leave-balance rendering logic; target ≤300 per file | Non-breaking | leaves UI | None | Batch F`

### FE-30
`FE-30 | Frontend-Feature | frontend/features/hr/leaves/components/leave-status-badge.tsx:1 + frontend/features/hr/shared/hr-ui.tsx:269 | DRY | P2 | Hand-rolls Tailwind color CSS (bg-amber-100 text-amber-700 etc.) instead of delegating to SemanticBadge. 18 badge files total. F2 §2a | Update leave-status-badge.tsx and HrStatusBadge in hr-ui.tsx to delegate to SemanticBadge from components/ui/semantic-badge.tsx; verify tone mapping matches existing colors | Non-breaking visually (SemanticBadge uses same color scale) | Leave list, HR status displays | None | Batch F`

### FE-31
`FE-31 | Frontend-Feature | frontend/features/hr/attendance/manage-holidays-card.tsx:297,320,332 + frontend/features/hr/document-review/review-sheet.tsx:312,319 + ~18 other sites | DRY | P2 | disabled={mutation.isPending} without LoadingButton spinner on ~20 table-cell / icon-only action buttons. F2 §2f | Replace with AnimatedIconButton forwardRef sub-component pattern per CLAUDE.md §8; for icon-only cells in DataTable create a small named forwardRef that calls useAnimatedIcon | Non-breaking UX | Each affected button site | None | Batch F`

### FE-32
`FE-32 | Frontend-Feature | frontend/features/hr/work-logs/work-log-advanced-filters-sheet.tsx:151 | Responsive | P2 | Raw Sheet used for multi-section advanced filters panel; mobile shows side-slide, not bottom Drawer | CLAUDE.md §14 mobile-overlay rule. FRONTEND §19 | Wrap with ResponsivePopover from components/ui/responsive-popover.tsx; Drawer on < md, keep Sheet behaviour on md+ | Non-breaking | work-log filter UI | None | Batch F`

### FE-33
`FE-33 | Frontend-Component | frontend/components/ui/route-error-boundary.tsx:1 | DRY | P3 | RouteErrorBoundary exists but is not used anywhere in HR/payroll/billing; features use ad-hoc ErrorState | CLAUDE.md §0.9 | Adopt RouteErrorBoundary in each converted SC shim (FE-01 through FE-09 pages) as the error.tsx pattern; wire existing ErrorState for within-feature query errors | Non-breaking | all converted pages | None | Batch F`

### FE-34
`FE-34 | Frontend-Component | frontend/components/ai/ai-usage-chip.tsx:1 | Missing Adoption | P3 | AiUsageChip exists but is never rendered on any HR/payroll AI surface | CLAUDE.md §16 every AI result surface must render AiUsageChip | On each AI action result rendered via AiActionsMenu (employee-details-view.tsx:305, ess-payslips-section.tsx:121 and any future AI surfaces), add AiUsageChip below the result using aiUsage from the response meta | Non-breaking | AI result surfaces in HR/payroll | None | Batch F`

### FE-35
`FE-35 | Frontend-Hook | frontend/hooks/api/hr/import-export.ts:95 + frontend/hooks/api/hr/hr-webhooks.ts:50 | Data | P2 | Hardcoded ?page=1&limit=20 in import-export hook; hardcoded limit=50 in webhooks hook; caller cannot paginate | CLAUDE.md §14 never hardcode pagination params. FRONTEND §5 | import-export.ts:95 — accept { page, limit } params; webhooks.ts:50 — accept limit param; update all callers | Non-breaking with default values matching current hardcodes | HR import-export UI, webhooks UI | None | Batch D`

---

## Section 9 — Missing Route States

### FE-36
`FE-36 | Frontend-Page | frontend/app/(authenticated)/hr/** (~50 pages) | UX | P2 | Approximately 50 of 125 HR pages lack loading.tsx; approximately 95 of 125 lack error.tsx. F1 §12 | Create loading.tsx (skeleton matching real layout) and error.tsx (RouteErrorBoundary + retry) for each page following the payroll pattern. Priority: pages with server gates (SC) first as they trigger Suspense; client pages handle loading/error in feature components via TanStack Query. Specific missing loading.tsx: /hr/onboarding/[userId], /hr/onboarding/my-tasks, /hr/access, /hr/setup, /hr/workforce, /hr/simulator — and all HR settings pages | Non-breaking | HR route segments | None | Batch F`

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Early-warning signal |
|---|---|---|---|---|
| Gate change locks out legitimate users | HIGH (BILLING-03/04 change HTTP status; FE-10–19 add enabled guards) | HIGH — users suddenly see 402/403/disabled hooks on features they could access | (a) Deploy backend status changes before frontend guard additions; (b) test each gate key against the backend permission catalog before shipping; (c) keep org-owner/platform-admin bypass in place (they always bypass) | Spike in 402/403 in frontend error tracker on deploy |
| Paywall change blocks a paying customer | MEDIUM (BILLING-03 changes assertWithinLimit from 403→402) | HIGH — paying customer on STARTER/PROFESSIONAL suddenly sees upgrade prompts on resources they already have | Ensure assertWithinLimit only fires when used+increment > limit (already the case); the change is HTTP status only, not the limit logic | Customer support tickets about "can't create X" on deploy day |
| JWT plan removal breaks AI features during rollout window | HIGH (BILLING-01/02 are sequential; if 02 deployed before 01, u.plan becomes null) | HIGH — all AI features return "plan not found" | Always deploy BILLING-01 (delete requireFeature) before BILLING-02 (remove JWT claim); single deploy if possible | AI feature 402 errors across all orgs immediately after deploy |
| settle() idempotency fix creates migration downtime | LOW (BILLING-12 adds UNIQUE column to ai_credit_transactions) | MEDIUM — unique constraint creation on a large table can lock writes | Build index CONCURRENTLY; add unique constraint using the index (BILLING §19 §4 rule) | Migration hang in Neon console |
| Seat definition unification confuses UI (BILLING-08) | MEDIUM | LOW — users see different seat count on billing page | Show "4 active + 1 pending invite" label with tooltip; deploy with explainer copy change | Customer support tickets about seat count |
| FY invoice sequence adds gap risk during cutover (BILLING-16) | LOW | MEDIUM (compliance) | Run sequence migration at FY start (April 1); backfill existing invoices with new format before go-live | Accountant sign-off blocks implementation |
| Outbox deliver() stub (Lane L P0) causes silent event loss | HIGH (already happening) | HIGH — domain events (onboarding, workflow triggers) silently dropped | This is a pre-existing P0 not in C3 scope; flag as dependency blocker for any feature relying on outbox events | Onboarding workflows not triggering after employee creation |

---

## Sequencing Constraints

```
Batch A (Critical security/revenue — ship first):
  BILLING-01 → BILLING-02 (MUST BE ORDERED: 01 before 02)
  BILLING-03 → (triggers FE-25 EntitlementGate, can be parallel after 03 ships)
  BILLING-04 (independent)
  BILLING-05 (independent)
  BILLING-20 (independent)
  FE-10,11,12,13,15,16,17,18,19 (hook gates — all independent of each other)

Batch B (Page server-gates — after Batch A hook gates):
  FE-01,02,03,08,09 (page gates; 03 also has LOC work)

Batch C (Subscription lifecycle):
  BILLING-10 → BILLING-11 (PAST_DUE must be setable before dunning can use it)
  BILLING-12 (independent)
  BILLING-13 (independent)

Batch D (Data quality):
  BILLING-06,07 (independent)
  BILLING-08 → BILLING-09 (seat ledger before deprecating dead column)
  FE-14 (independent)
  FE-20 → depends on FE-13 (key fix)
  FE-21,FE-35 (independent)

Batch E (Reliability/UX):
  BILLING-14 → BILLING-15 (raw storage before reconciliation reads it)
  BILLING-19 (independent)
  FE-22 (independent)
  FE-25 → depends on BILLING-03 (machine code must exist)

Batch F (Debt/compliance — last):
  FE-26 → FE-27 (move formatMoney before billing sites use it)
  FE-23,24 → backend preview endpoint must ship first
  FE-04,05,06,07 (LOC + client→SC conversions)
  FE-28,29,30,31,32,33,34,36 (can be parallelized)
  BILLING-16,17,18 (USER/ACCOUNTANT decision gated — do not start until decision received)
```

---

## Rows Requiring USER or ACCOUNTANT Decision

| ID | Decision needed | Blocked action |
|---|---|---|
| BILLING-16 | CA sign-off: does Indian GST Rule 46 require consecutive per-FY numbering for our customer invoices? If yes, which FY start (Apr 1) and what prefix format (INV-FY2627-NNNN)? | Invoice numbering migration |
| BILLING-17 | CA + USER: Is StreamlineOS currently GST-registered? If yes, do platform invoices (us charging orgs) need to add 18% GST above listed PLAN_PRICES_PAISE? | Platform invoice tax logic |
| BILLING-18 | USER (product): Which PLAN_FEATURE_FLAGS should differ between STARTER and PROFESSIONAL? Currently identical, defeating the pricing differentiation. Define the feature delta before any code change. | Feature gate differentiation |
| BILLING-11 | USER: Confirm dunning grace period (D+1/3/7/14) and what "suspension" means: read-only access or module lockout? Payroll history must always remain readable per CLAUDE.md. | Dunning timeline + suspension definition |

---

## Appendix A — Verified File Paths

All paths confirmed open this session:

| Claim | Verified path |
|---|---|
| requireFeature reads JWT plan | `backend/src/modules/ai/core/billing/feature-gates.ts:91-99` |
| assertWithinLimit throws ForbiddenException | `backend/src/modules/billing/core/plan-limits.service.ts:205` |
| bust() evicts only in-memory | `backend/src/modules/billing/core/plan-limits.service.ts:63-65` |
| ModuleDisabledException returns 404 | `backend/src/common/http/api-exceptions.ts:6` |
| acctInvoices count no soft-delete filter | `backend/src/modules/billing/core/plan-limits.service.ts:300-304` |
| crmDeals count no soft-delete filter | `backend/src/modules/billing/core/plan-limits.service.ts:270-274` |
| userModuleAccessKey missing root | `frontend/hooks/api/access/user-module-access.ts:7,12-13` |
| caseKeys non-standard segment | `frontend/hooks/api/hr/cases.ts:83-84` |
| useHrEmployeeOptions wrong gate key | `frontend/hooks/api/hr/employees.ts:133` |
| useTerminations wrong gate key | `frontend/hooks/api/hr/termination.ts:98` |
| useHrEmployees no gate | `frontend/hooks/api/hr/employees.ts:110-123` |
| billing/ai-credits/page.tsx 564 LOC no gate | `frontend/app/(authenticated)/billing/ai-credits/page.tsx:1` |
| settings/delegations/page.tsx 734 LOC | `frontend/app/(authenticated)/settings/delegations/page.tsx:47` |
| billing/invoices/new/page.tsx 678 LOC | `frontend/app/(authenticated)/billing/invoices/new/page.tsx:1` |
| settings/roles/page.tsx 544 LOC | `frontend/app/(authenticated)/settings/roles/page.tsx:49` |
| settings/audit-log/page.tsx 529 LOC | `frontend/app/(authenticated)/settings/audit-log/page.tsx:10` |
| hr/termination/page.tsx 516 LOC no gate | `frontend/app/(authenticated)/hr/termination/page.tsx:1` |
| payroll salary arithmetic in UI | `frontend/features/payroll/salary-structures/salary-structure-template-sheet.tsx:56-84` |
| monthly gross computation in UI | `frontend/features/payroll/employees/employee-detail-page.tsx:261-266` |
| invoice-detail.tsx 592 LOC | `frontend/features/billing/invoice-detail.tsx` |
| leaves-shared.tsx 540 LOC | `frontend/features/hr/leaves/components/leaves-shared.tsx` |
| formatMoney in features/payroll not lib/ | `frontend/features/payroll/shared/payroll-format.ts` |
| invoice numbering COUNT(*)+1 | `backend/src/modules/invoices/invoices-write.service.ts:94-104` |
