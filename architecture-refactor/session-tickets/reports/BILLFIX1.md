# BILLFIX1 — billing.controller.ts split

## What was done

`billing-marketplace.controller.ts` and `billing-enterprise.controller.ts` existed on disk but were not registered and contained only duplicate handlers — every route they declared also appeared verbatim in `billing.controller.ts`.

### Step 1 — route diff

| New controller | Routes it holds | Status in billing.controller.ts before this fix |
|---|---|---|
| `billing-marketplace.controller.ts` | `GET marketplace/apps`, `POST/DELETE marketplace/:appId/install`, `POST marketplace/:appId/trial`, `GET/GET/GET ai-credits/…`, `POST ai-credits/auto-topup`, `POST ai-credits/purchase` (9 routes) | All 9 present — duplicates |
| `billing-enterprise.controller.ts` | affiliate (3), referrals (2), analytics (1), enterprise-quotes (8) = 14 routes | All 14 present — duplicates |

No net-new routes in either new controller.

### Step 2 — removed migrated routes from billing.controller.ts first

Before registering the new controllers, all 23 duplicated handlers were removed from `billing.controller.ts` along with their now-unused imports (`MarketplaceService`, `AiCreditsService`, `AiCreditsUsageService`, `PaymentProviderResolver`, `AffiliateService`, `ReferralService`, `RevenueAnalyticsService`, `EnterpriseQuotesService`) and schema imports (`ai-credits.schemas`, `affiliate.schemas`, `analytics.schemas`, `enterprise-quotes.schemas`). The `appIdParams` and `quoteIdParams` local schema constants were also removed (no remaining callers).

### Step 3 — registered both controllers

Added `BillingMarketplaceController` and `BillingEnterpriseController` to the `controllers:` array in `billing.module.ts`.

## Results

| Metric | Before | After |
|---|---|---|
| `billing.controller.ts` lines | 516 | 214 |
| Duplicate route declarations | 23 | 0 |

### Final `controllers:` array in `billing.module.ts`

```ts
controllers: [BillingController, BillingMarketplaceController, BillingEnterpriseController, RazorpayWebhookController],
```

### Route-duplication check

```
grep -hE "@(Get|Post|Patch|Delete|Put)\(" billing.controller.ts billing-marketplace.controller.ts billing-enterprise.controller.ts | sort | uniq -d
```

Output: (empty — zero duplicate path+method pairs)

## Authorization check

Both new controllers declare `@UseGuards(JwtAuthGuard)` at class level, and every handler carries `@UseGuards(PermissionGuard)` + `@RequirePermission(...)` — identical to what existed in `billing.controller.ts` before this change. No handler lost its guard during the move.

## Files changed

- `backend/src/modules/billing/core/billing.controller.ts` — trimmed to subscription/coupon/profile/seat/plan routes only (214 lines)
- `backend/src/modules/billing/core/billing.module.ts` — controllers array updated
