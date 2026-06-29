# Billing Platform Design — 2026-06-29

## Scope
Complete the StreamlineOS commercial billing engine: marketplace, checkout, AI credits, seats, add-ons, affiliates, referrals, revenue analytics, enterprise quotations.

## Current State (35% complete)
- ✅ Subscription plans (STARTER/PROFESSIONAL/ENTERPRISE) with Razorpay checkout
- ✅ Invoice/GST CRUD with CGST/SGST/IGST
- ✅ Coupon validation + redemption
- ✅ Trial banner + status tracking
- ❌ Marketplace (empty), Add-ons (throws), AI Credits (0%), Affiliates (0%), Referrals (0%), Revenue Analytics (10%)

## Architecture Decisions
- Provider abstraction stays Razorpay-only for now; interface allows Stripe/Chargebee later
- Business logic stays in backend services; frontend is TanStack Query + UI only
- No new `app/api/**` routes except auth-bridge
- All DB schema changes go to `backend/src/db/schema/` only

---

## Phase 1 — Database Schema

### New enums (enums.ts)
```
appInstallStatusEnum: TRIALING | ACTIVE | CANCELLED
aiCreditTxnTypeEnum: PURCHASE | USAGE | REFUND | PLAN_GRANT | EXPIRY
affiliateStatusEnum: PENDING | ACTIVE | SUSPENDED
commissionStatusEnum: PENDING | APPROVED | PAID | CANCELLED
referralStatusEnum: PENDING | SIGNED_UP | ACTIVATED | REWARDED | EXPIRED
revenueEventTypeEnum: new_subscription | upgrade | downgrade | churn | reactivation | addon_purchase | refund
```

### New tables (backend/src/db/schema/billing.ts — new file)
1. **billing_profiles** — Per-org billing settings (GSTIN, billing address, tax exemption)
2. **marketplace_apps** — App catalog (slug, name, category, pricing, features, screenshots)
3. **app_installations** — Per-org installed apps with status + trial tracking
4. **ai_credit_packs** — Credit pack definitions (name, credits, price, bonus)
5. **org_ai_credits** — Per-org credit wallet (balance, auto top-up settings)
6. **ai_credit_transactions** — Credit ledger (purchase/usage/refund/plan_grant)
7. **affiliates** — Affiliate partners (referral code, commission type/rate)
8. **affiliate_commissions** — Commission per referred subscription
9. **referrals** — Customer referral tracking (referrer → referred org)
10. **revenue_events** — MRR event log (new_sub, upgrade, churn, etc.)

---

## Phase 2 — Backend Services/Controllers

All in `backend/src/modules/billing/`:

### MarketplaceService (marketplace.service.ts)
- `listApps(orgId)` — apps + per-org install status
- `installApp(orgId, userId, appId)` — create app_installation record
- `uninstallApp(orgId, userId, appId)` — cancel installation
- `startAppTrial(orgId, userId, appId)` — TRIALING status, sets trialEndsAt

### AiCreditsService (ai-credits.service.ts)
- `getWallet(orgId)` — current balance + recent transactions
- `listPacks()` — available credit packs
- `purchasePack(orgId, userId, packId)` — create Razorpay order for credits
- `verifyPackPurchase(orgId, userId, packId, paymentData)` — verify + credit wallet
- `consumeCredits(orgId, userId, amount, feature)` — deduct + log (atomic)
- `grantPlanCredits(orgId, plan)` — called when subscription activates

### AffiliateService (affiliate.service.ts)
- `register(userId, orgId)` — create affiliate record, generate referral code
- `getDashboard(userId)` — commission summary, pending payout
- `requestPayout(affiliateId, amount)` — create payout request
- `trackClick(referralCode)` — log referral link click
- `creditCommission(referralCode, orgId, subscriptionId, amount)` — calculate + record commission

### ReferralService (referral.service.ts)
- `createReferral(referrerId, orgId, email)` — send invite, create referral record
- `processSignup(referralCode, newOrgId)` — mark SIGNED_UP
- `activateReferral(orgId)` — mark ACTIVATED, trigger reward grant

### RevenueAnalyticsService (revenue-analytics.service.ts)
- `recordEvent(type, orgId, mrr, amount, plan, previousPlan)` — append revenue_events
- `getMrr()` — sum of active subscription MRR
- `getMetrics()` — MRR, ARR, ARPU, estimated LTV, churn rate, trial conversion
- `getTimeSeriesData(period)` — monthly MRR/new subs/churn for charts

### Extend BillingService
- `purchaseAddon(orgId, userId, addonId, quantity)` — AI credit pack purchase via ai-credits service
- `getBillingProfile(orgId)` — get/create billing profile
- `updateBillingProfile(orgId, data)` — update GSTIN, address
- `getSeatInfo(orgId)` — seat count, used, available

### New BillingController routes
- GET `/billing/marketplace` — list apps with install status
- POST `/billing/marketplace/:appId/install` — install app
- DELETE `/billing/marketplace/:appId/install` — uninstall app
- POST `/billing/marketplace/:appId/trial` — start trial
- GET `/billing/ai-credits` — wallet + packs
- POST `/billing/ai-credits/purchase` — purchase pack order
- PATCH `/billing/ai-credits/purchase` — verify pack purchase
- POST `/billing/ai-credits/auto-topup` — configure auto top-up
- GET `/billing/profile` — get billing profile
- PATCH `/billing/profile` — update billing profile
- GET `/billing/seats` — seat utilization
- POST `/billing/affiliate/register` — become affiliate
- GET `/billing/affiliate` — affiliate dashboard
- POST `/billing/referrals` — create referral invite
- GET `/billing/analytics` — revenue metrics (platform admin only)

---

## Phase 3 — Frontend

### New TanStack Query Hooks (frontend/lib/api/hooks/billing.ts — extend existing)
- `useMarketplace()` — apps + install status
- `useInstallApp()` — mutation
- `useUninstallApp()` — mutation
- `useStartAppTrial()` — mutation
- `useAiCreditsWallet()` — wallet balance + recent txns
- `useAiCreditPacks()` — available packs
- `usePurchaseAiCreditPack()` — mutation
- `useAffiliate()` — affiliate dashboard data
- `useRegisterAffiliate()` — mutation
- `useRevenueMetrics()` — platform admin
- `useBillingProfile()` — org billing profile
- `useUpdateBillingProfile()` — mutation

### New Frontend Pages

1. **`/marketplace`** — App catalog
   - Category tabs (All, Sales, People, Operations, Finance, Support, AI)
   - App cards: name, description, price, Install/Trial/Uninstall button
   - Loading skeletons, empty state per category

2. **`/billing/checkout`** — Multi-step checkout wizard
   - Step 1: Plan selector + billing cycle toggle
   - Step 2: Seat count slider with live pricing
   - Step 3: Add-ons (AI Credit packs, extra storage)
   - Step 4: Review order + coupon code
   - Step 5: Tax calculation summary
   - Step 6: Razorpay payment
   - Step 7: Confirmation + redirect

3. **`/billing/ai-credits`** — AI Credits management
   - Balance card (remaining / total)
   - Auto top-up toggle + pack selector
   - Credit pack purchase cards
   - Usage history table (feature, amount, date)

4. **`/billing/analytics`** (platform admin only) — Revenue Dashboard
   - KPI cards: MRR, ARR, ARPU, Trial Conversion, Churn Rate
   - MRR trend chart (recharts BarChart)
   - New vs churned subs over time

5. **`/billing/affiliate`** — Affiliate Dashboard
   - Referral code + copy link
   - Commission summary (earned, pending, paid)
   - Commission history table
   - Request payout button

---

## Permissions Catalog Additions
```
billing:marketplace:view
billing:marketplace:install
billing:ai-credits:view
billing:ai-credits:purchase
billing:analytics:view   (platform admin only)
billing:affiliate:manage
billing:profile:update
```

---

## What Stays Out (Phase 2 Roadmap per task 23)
- Multi-currency
- Regional pricing
- Usage-based billing
- Reseller portal
- App marketplace revenue sharing
- Gift cards

## Definition of Done
- All backend endpoints have @RequirePermission, ZodValidation, RBAC
- All financial writes in DB transactions
- AI credit consume/reserve is atomic (reserve before LLM call)
- No N+1 queries — joins or batch loads
- Frontend has loading/error/empty states per page
- `pnpm -C backend build` + `pnpm -C frontend build` pass
