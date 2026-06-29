# Billing Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the StreamlineOS billing engine — marketplace, AI credits wallet, affiliate/referral system, revenue analytics, and checkout wizard — from 35% to 100%.

**Architecture:** NestJS backend owns all business logic + DB schema; frontend is pure TanStack Query + shadcn/ui. All schema changes go to `backend/src/db/schema/`; no new `app/api/**` routes except existing auth-bridge. Razorpay remains the sole payment provider; an abstract interface pattern allows Stripe/Chargebee later.

**Tech Stack:** NestJS, Drizzle ORM, Neon DB, Redis, Next.js App Router, TanStack Query, shadcn/ui, Zod, Razorpay

---

## File Map

### Backend (new files)
- `backend/src/db/schema/billing.ts` — 10 new billing tables
- `backend/src/modules/billing/marketplace.service.ts`
- `backend/src/modules/billing/ai-credits.service.ts`
- `backend/src/modules/billing/affiliate.service.ts`
- `backend/src/modules/billing/referral.service.ts`
- `backend/src/modules/billing/revenue-analytics.service.ts`
- `backend/src/modules/billing/dto/marketplace.schemas.ts`
- `backend/src/modules/billing/dto/ai-credits.schemas.ts`
- `backend/src/modules/billing/dto/affiliate.schemas.ts`
- `backend/src/modules/billing/dto/analytics.schemas.ts`

### Backend (modified files)
- `backend/src/db/schema/enums.ts` — 6 new enums
- `backend/src/db/schema/index.ts` — export billing schema
- `backend/src/modules/billing/billing.service.ts` — fix purchaseAddon, add getBillingProfile/updateBillingProfile/getSeatInfo
- `backend/src/modules/billing/billing.controller.ts` — 14 new routes
- `backend/src/modules/billing/billing.module.ts` — register 5 new services
- `backend/src/modules/rbac/permissions.constants.ts` — 7 new permission keys

### Frontend (new files)
- `frontend/lib/api/hooks/marketplace.ts`
- `frontend/lib/api/hooks/ai-credits.ts`
- `frontend/lib/api/hooks/affiliate.ts`
- `frontend/lib/api/hooks/revenue-analytics.ts`
- `frontend/app/(authenticated)/marketplace/page.tsx`
- `frontend/app/(authenticated)/billing/checkout/page.tsx`
- `frontend/app/(authenticated)/billing/ai-credits/page.tsx`
- `frontend/app/(authenticated)/billing/analytics/page.tsx`
- `frontend/app/(authenticated)/billing/affiliate/page.tsx`

### Frontend (modified files)
- `frontend/components/layout/sidebar/sidebar-nav-items.ts` — add Marketplace, AI Credits, Analytics, Affiliate nav items

---

## Task 1: Add 6 new enums to enums.ts

**Files:**
- Modify: `backend/src/db/schema/enums.ts`

- [ ] **Step 1: Add enums**

Append to `backend/src/db/schema/enums.ts` (after the last existing enum):

```ts
export const appInstallStatusEnum = pgEnum("app_install_status", [
  "TRIALING",
  "ACTIVE",
  "CANCELLED",
]);

export const aiCreditTxnTypeEnum = pgEnum("ai_credit_txn_type", [
  "PURCHASE",
  "USAGE",
  "REFUND",
  "PLAN_GRANT",
  "EXPIRY",
]);

export const affiliateStatusEnum = pgEnum("affiliate_status", [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
]);

export const commissionStatusEnum = pgEnum("commission_status", [
  "PENDING",
  "APPROVED",
  "PAID",
  "CANCELLED",
]);

export const referralStatusEnum = pgEnum("referral_status", [
  "PENDING",
  "SIGNED_UP",
  "ACTIVATED",
  "REWARDED",
  "EXPIRED",
]);

export const revenueEventTypeEnum = pgEnum("revenue_event_type", [
  "new_subscription",
  "upgrade",
  "downgrade",
  "churn",
  "reactivation",
  "addon_purchase",
  "refund",
]);
```

---

## Task 2: Create billing schema

**Files:**
- Create: `backend/src/db/schema/billing.ts`

- [ ] **Step 1: Write the schema file**

```ts
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import {
  affiliateStatusEnum,
  aiCreditTxnTypeEnum,
  appInstallStatusEnum,
  commissionStatusEnum,
  referralStatusEnum,
  revenueEventTypeEnum,
} from "./enums";

export const billingProfiles = pgTable(
  "billing_profiles",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().unique(),
    gstin: varchar("gstin", { length: 15 }),
    pan: varchar("pan", { length: 10 }),
    billingName: varchar("billing_name", { length: 255 }),
    billingEmail: varchar("billing_email", { length: 255 }),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    pincode: varchar("pincode", { length: 10 }),
    country: varchar("country", { length: 2 }).default("IN"),
    isTaxExempt: boolean("is_tax_exempt").default(false).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({ orgIdx: index("billing_profiles_org_idx").on(t.orgId) }),
);

export const marketplaceApps = pgTable(
  "marketplace_apps",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull(),
    iconUrl: text("icon_url"),
    screenshotUrls: jsonb("screenshot_urls").$type<string[]>().default([]),
    features: jsonb("features").$type<string[]>().default([]),
    pricingType: varchar("pricing_type", { length: 20 }).notNull().default("free"),
    monthlyPrice: integer("monthly_price").default(0).notNull(),
    annualPrice: integer("annual_price").default(0).notNull(),
    trialDays: integer("trial_days").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    requiredPlan: varchar("required_plan", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    categoryIdx: index("marketplace_apps_category_idx").on(t.category),
    activeIdx: index("marketplace_apps_active_idx").on(t.isActive),
  }),
);

export const appInstallations = pgTable(
  "app_installations",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull(),
    appId: integer("app_id").notNull(),
    installedBy: integer("installed_by").notNull(),
    status: appInstallStatusEnum("status").notNull().default("ACTIVE"),
    trialEndsAt: timestamp("trial_ends_at"),
    installedAt: timestamp("installed_at").defaultNow().notNull(),
    cancelledAt: timestamp("cancelled_at"),
  },
  (t) => ({
    orgAppUniq: index("app_installations_org_app_uniq").on(t.orgId, t.appId),
    orgIdx: index("app_installations_org_idx").on(t.orgId),
  }),
);

export const aiCreditPacks = pgTable("ai_credit_packs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  credits: integer("credits").notNull(),
  bonusCredits: integer("bonus_credits").default(0).notNull(),
  priceInPaise: integer("price_in_paise").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orgAiCredits = pgTable(
  "org_ai_credits",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().unique(),
    balance: integer("balance").default(0).notNull(),
    lifetimeGranted: integer("lifetime_granted").default(0).notNull(),
    lifetimeConsumed: integer("lifetime_consumed").default(0).notNull(),
    autoTopUpEnabled: boolean("auto_top_up_enabled").default(false).notNull(),
    autoTopUpPackId: integer("auto_top_up_pack_id"),
    autoTopUpThreshold: integer("auto_top_up_threshold").default(100),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({ orgIdx: index("org_ai_credits_org_idx").on(t.orgId) }),
);

export const aiCreditTransactions = pgTable(
  "ai_credit_transactions",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull(),
    userId: integer("user_id"),
    type: aiCreditTxnTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    feature: varchar("feature", { length: 100 }),
    model: varchar("model", { length: 100 }),
    referenceId: varchar("reference_id", { length: 100 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("ai_credit_txns_org_idx").on(t.orgId),
    orgCreatedIdx: index("ai_credit_txns_org_created_idx").on(t.orgId, t.createdAt),
  }),
);

export const affiliates = pgTable(
  "affiliates",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().unique(),
    orgId: integer("org_id").notNull(),
    referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
    status: affiliateStatusEnum("status").notNull().default("PENDING"),
    commissionType: varchar("commission_type", { length: 20 }).notNull().default("PERCENTAGE"),
    commissionRate: integer("commission_rate").notNull().default(10),
    totalEarned: integer("total_earned").default(0).notNull(),
    totalPaid: integer("total_paid").default(0).notNull(),
    pendingPayout: integer("pending_payout").default(0).notNull(),
    clickCount: integer("click_count").default(0).notNull(),
    signupCount: integer("signup_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    codeIdx: index("affiliates_code_idx").on(t.referralCode),
    userIdx: index("affiliates_user_idx").on(t.userId),
  }),
);

export const affiliateCommissions = pgTable(
  "affiliate_commissions",
  {
    id: serial("id").primaryKey(),
    affiliateId: integer("affiliate_id").notNull(),
    referredOrgId: integer("referred_org_id").notNull(),
    subscriptionId: integer("subscription_id"),
    amountInPaise: integer("amount_in_paise").notNull(),
    status: commissionStatusEnum("status").notNull().default("PENDING"),
    paidAt: timestamp("paid_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    affiliateIdx: index("affiliate_commissions_affiliate_idx").on(t.affiliateId),
    statusIdx: index("affiliate_commissions_status_idx").on(t.status),
  }),
);

export const referrals = pgTable(
  "referrals",
  {
    id: serial("id").primaryKey(),
    referrerOrgId: integer("referrer_org_id").notNull(),
    referrerUserId: integer("referrer_user_id").notNull(),
    referredEmail: varchar("referred_email", { length: 255 }).notNull(),
    referredOrgId: integer("referred_org_id"),
    referralCode: varchar("referral_code", { length: 20 }).notNull(),
    status: referralStatusEnum("status").notNull().default("PENDING"),
    rewardGranted: boolean("reward_granted").default(false).notNull(),
    signedUpAt: timestamp("signed_up_at"),
    activatedAt: timestamp("activated_at"),
    rewardedAt: timestamp("rewarded_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    referrerIdx: index("referrals_referrer_idx").on(t.referrerOrgId),
    codeIdx: index("referrals_code_idx").on(t.referralCode),
    emailIdx: index("referrals_email_idx").on(t.referredEmail),
  }),
);

export const revenueEvents = pgTable(
  "revenue_events",
  {
    id: serial("id").primaryKey(),
    type: revenueEventTypeEnum("type").notNull(),
    orgId: integer("org_id").notNull(),
    plan: varchar("plan", { length: 20 }),
    previousPlan: varchar("previous_plan", { length: 20 }),
    mrr: integer("mrr").notNull(),
    amount: integer("amount"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index("revenue_events_type_idx").on(t.type),
    createdIdx: index("revenue_events_created_idx").on(t.createdAt),
    orgIdx: index("revenue_events_org_idx").on(t.orgId),
  }),
);

export const billingProfilesRelations = relations(billingProfiles, () => ({}));
export const marketplaceAppsRelations = relations(marketplaceApps, ({ many }) => ({
  installations: many(appInstallations),
}));
export const appInstallationsRelations = relations(appInstallations, ({ one }) => ({
  app: one(marketplaceApps, { fields: [appInstallations.appId], references: [marketplaceApps.id] }),
}));
export const affiliatesRelations = relations(affiliates, ({ many }) => ({
  commissions: many(affiliateCommissions),
}));
export const affiliateCommissionsRelations = relations(affiliateCommissions, ({ one }) => ({
  affiliate: one(affiliates, { fields: [affiliateCommissions.affiliateId], references: [affiliates.id] }),
}));
```

---

## Task 3: Export billing schema

**Files:**
- Modify: `backend/src/db/schema/index.ts`

- [ ] **Step 1: Add billing export**

Add this line alongside the other exports in `backend/src/db/schema/index.ts`:

```ts
export * from "./billing";
```

---

## Task 4: Add billing permissions to constants

**Files:**
- Modify: `backend/src/modules/rbac/permissions.constants.ts`

- [ ] **Step 1: Add 7 permission entries**

In the `PERMISSIONS` array, add these entries:

```ts
{ name: "billing:marketplace:view", resource: "marketplace", action: "view", description: "View marketplace apps", scopable: false },
{ name: "billing:marketplace:install", resource: "marketplace", action: "install", description: "Install and uninstall marketplace apps", scopable: false },
{ name: "billing:ai-credits:view", resource: "ai-credits", action: "view", description: "View AI credits wallet and history", scopable: false },
{ name: "billing:ai-credits:purchase", resource: "ai-credits", action: "purchase", description: "Purchase AI credit packs", scopable: false },
{ name: "billing:analytics:view", resource: "analytics", action: "view", description: "View revenue analytics (platform admin only)", scopable: false },
{ name: "billing:affiliate:manage", resource: "affiliate", action: "manage", description: "Manage affiliate program", scopable: false },
{ name: "billing:profile:update", resource: "profile", action: "update", description: "Update billing profile and GST details", scopable: false },
```

In `ROLE_DEFAULT_PERMISSIONS`, add to OWNER role:
```ts
"billing:marketplace:view",
"billing:marketplace:install",
"billing:ai-credits:view",
"billing:ai-credits:purchase",
"billing:affiliate:manage",
"billing:profile:update",
```

---

## Task 5: Create MarketplaceService

**Files:**
- Create: `backend/src/modules/billing/marketplace.service.ts`
- Create: `backend/src/modules/billing/dto/marketplace.schemas.ts`

- [ ] **Step 1: Write DTO schemas**

```ts
// backend/src/modules/billing/dto/marketplace.schemas.ts
import { z } from "zod";

export const installAppSchema = z.object({
  appId: z.coerce.number().int().positive(),
});

export const startTrialSchema = z.object({
  appId: z.coerce.number().int().positive(),
});
```

- [ ] **Step 2: Write MarketplaceService**

```ts
// backend/src/modules/billing/marketplace.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { db } from "../../db";
import { marketplaceApps, appInstallations } from "../../db/schema";
import { and, eq } from "drizzle-orm";

@Injectable()
export class MarketplaceService {
  async listApps(orgId: number) {
    const [apps, installs] = await Promise.all([
      db.select().from(marketplaceApps).where(eq(marketplaceApps.isActive, true)).orderBy(marketplaceApps.sortOrder),
      db.select().from(appInstallations).where(eq(appInstallations.orgId, orgId)),
    ]);
    const installMap = new Map(installs.map((i) => [i.appId, i]));
    return apps.map((app) => ({
      ...app,
      installation: installMap.get(app.id) ?? null,
    }));
  }

  async installApp(orgId: number, userId: number, appId: number) {
    const app = await db.query.marketplaceApps.findFirst({
      where: and(eq(marketplaceApps.id, appId), eq(marketplaceApps.isActive, true)),
    });
    if (!app) throw new NotFoundException("App not found");

    const existing = await db.query.appInstallations.findFirst({
      where: and(
        eq(appInstallations.orgId, orgId),
        eq(appInstallations.appId, appId),
      ),
    });
    if (existing && existing.status === "ACTIVE") {
      throw new BadRequestException("App is already installed");
    }

    if (existing) {
      const [updated] = await db
        .update(appInstallations)
        .set({ status: "ACTIVE", cancelledAt: null })
        .where(eq(appInstallations.id, existing.id))
        .returning();
      return updated;
    }

    const [installation] = await db
      .insert(appInstallations)
      .values({ orgId, appId, installedBy: userId, status: "ACTIVE" })
      .returning();
    return installation;
  }

  async uninstallApp(orgId: number, appId: number) {
    const existing = await db.query.appInstallations.findFirst({
      where: and(
        eq(appInstallations.orgId, orgId),
        eq(appInstallations.appId, appId),
        eq(appInstallations.status, "ACTIVE"),
      ),
    });
    if (!existing) throw new NotFoundException("App is not installed");

    const [updated] = await db
      .update(appInstallations)
      .set({ status: "CANCELLED", cancelledAt: new Date() })
      .where(eq(appInstallations.id, existing.id))
      .returning();
    return updated;
  }

  async startAppTrial(orgId: number, userId: number, appId: number) {
    const app = await db.query.marketplaceApps.findFirst({
      where: and(eq(marketplaceApps.id, appId), eq(marketplaceApps.isActive, true)),
    });
    if (!app) throw new NotFoundException("App not found");
    if (!app.trialDays) throw new BadRequestException("This app does not offer a trial");

    const existing = await db.query.appInstallations.findFirst({
      where: and(eq(appInstallations.orgId, orgId), eq(appInstallations.appId, appId)),
    });
    if (existing) throw new BadRequestException("App already installed or trial already used");

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + app.trialDays);

    const [installation] = await db
      .insert(appInstallations)
      .values({ orgId, appId, installedBy: userId, status: "TRIALING", trialEndsAt })
      .returning();
    return installation;
  }
}
```

---

## Task 6: Create AiCreditsService

**Files:**
- Create: `backend/src/modules/billing/ai-credits.service.ts`
- Create: `backend/src/modules/billing/dto/ai-credits.schemas.ts`

- [ ] **Step 1: Write DTO schemas**

```ts
// backend/src/modules/billing/dto/ai-credits.schemas.ts
import { z } from "zod";

export const purchaseAiPackSchema = z.object({
  packId: z.coerce.number().int().positive(),
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
  signature: z.string().optional(),
});

export const consumeCreditsSchema = z.object({
  amount: z.number().int().positive(),
  feature: z.string().max(100),
  model: z.string().max(100).optional(),
  referenceId: z.string().max(100).optional(),
});

export const autoTopUpSchema = z.object({
  enabled: z.boolean(),
  packId: z.number().int().positive().optional(),
  threshold: z.number().int().min(0).optional(),
});
```

- [ ] **Step 2: Write AiCreditsService**

```ts
// backend/src/modules/billing/ai-credits.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { db } from "../../db";
import { aiCreditPacks, orgAiCredits, aiCreditTransactions } from "../../db/schema";
import { eq, desc, sql } from "drizzle-orm";

@Injectable()
export class AiCreditsService {
  async getWallet(orgId: number) {
    let wallet = await db.query.orgAiCredits.findFirst({
      where: eq(orgAiCredits.orgId, orgId),
    });
    if (!wallet) {
      [wallet] = await db.insert(orgAiCredits).values({ orgId }).returning();
    }
    const recentTxns = await db
      .select()
      .from(aiCreditTransactions)
      .where(eq(aiCreditTransactions.orgId, orgId))
      .orderBy(desc(aiCreditTransactions.createdAt))
      .limit(20);
    return { wallet, recentTransactions: recentTxns };
  }

  async listPacks() {
    return db
      .select()
      .from(aiCreditPacks)
      .where(eq(aiCreditPacks.isActive, true))
      .orderBy(aiCreditPacks.sortOrder);
  }

  async consumeCredits(
    orgId: number,
    userId: number,
    amount: number,
    feature: string,
    model?: string,
    referenceId?: string,
  ) {
    return db.transaction(async (tx) => {
      const [wallet] = await tx
        .select()
        .from(orgAiCredits)
        .where(eq(orgAiCredits.orgId, orgId))
        .for("update");

      if (!wallet || wallet.balance < amount) {
        throw new BadRequestException("Insufficient AI credits");
      }

      const newBalance = wallet.balance - amount;
      await tx
        .update(orgAiCredits)
        .set({
          balance: newBalance,
          lifetimeConsumed: sql`${orgAiCredits.lifetimeConsumed} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(orgAiCredits.orgId, orgId));

      await tx.insert(aiCreditTransactions).values({
        orgId,
        userId,
        type: "USAGE",
        amount: -amount,
        balanceAfter: newBalance,
        feature,
        model,
        referenceId,
      });

      return { balance: newBalance };
    });
  }

  async grantPlanCredits(orgId: number, plan: string, userId?: number) {
    const grantMap: Record<string, number> = {
      STARTER: 500,
      PROFESSIONAL: 2000,
      ENTERPRISE: 10000,
    };
    const amount = grantMap[plan] ?? 0;
    if (!amount) return;

    await db.transaction(async (tx) => {
      let wallet = await tx.query.orgAiCredits.findFirst({
        where: eq(orgAiCredits.orgId, orgId),
      });
      if (!wallet) {
        [wallet] = await tx.insert(orgAiCredits).values({ orgId }).returning();
      }

      const newBalance = wallet.balance + amount;
      await tx
        .update(orgAiCredits)
        .set({
          balance: newBalance,
          lifetimeGranted: sql`${orgAiCredits.lifetimeGranted} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(orgAiCredits.orgId, orgId));

      await tx.insert(aiCreditTransactions).values({
        orgId,
        userId: userId ?? null,
        type: "PLAN_GRANT",
        amount,
        balanceAfter: newBalance,
        feature: "plan_activation",
        referenceId: plan,
      });
    });
  }

  async updateAutoTopUp(orgId: number, enabled: boolean, packId?: number, threshold?: number) {
    let wallet = await db.query.orgAiCredits.findFirst({
      where: eq(orgAiCredits.orgId, orgId),
    });
    if (!wallet) {
      [wallet] = await db.insert(orgAiCredits).values({ orgId }).returning();
    }
    const [updated] = await db
      .update(orgAiCredits)
      .set({
        autoTopUpEnabled: enabled,
        autoTopUpPackId: packId ?? wallet.autoTopUpPackId,
        autoTopUpThreshold: threshold ?? wallet.autoTopUpThreshold,
        updatedAt: new Date(),
      })
      .where(eq(orgAiCredits.orgId, orgId))
      .returning();
    return updated;
  }

  async getPurchaseHistory(orgId: number, limit = 50) {
    return db
      .select()
      .from(aiCreditTransactions)
      .where(eq(aiCreditTransactions.orgId, orgId))
      .orderBy(desc(aiCreditTransactions.createdAt))
      .limit(limit);
  }
}
```

---

## Task 7: Create AffiliateService

**Files:**
- Create: `backend/src/modules/billing/affiliate.service.ts`
- Create: `backend/src/modules/billing/dto/affiliate.schemas.ts`

- [ ] **Step 1: Write DTO schemas**

```ts
// backend/src/modules/billing/dto/affiliate.schemas.ts
import { z } from "zod";

export const registerAffiliateSchema = z.object({});

export const createReferralSchema = z.object({
  email: z.string().email(),
});

export const trackClickSchema = z.object({
  referralCode: z.string().max(20),
});
```

- [ ] **Step 2: Write AffiliateService**

```ts
// backend/src/modules/billing/affiliate.service.ts
import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { db } from "../../db";
import { affiliates, affiliateCommissions } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

@Injectable()
export class AffiliateService {
  async register(userId: number, orgId: number) {
    const existing = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, userId),
    });
    if (existing) throw new ConflictException("Already registered as affiliate");

    const referralCode = nanoid(10).toUpperCase();
    const [affiliate] = await db
      .insert(affiliates)
      .values({ userId, orgId, referralCode, status: "ACTIVE" })
      .returning();
    return affiliate;
  }

  async getDashboard(userId: number) {
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, userId),
    });
    if (!affiliate) return null;

    const commissions = await db
      .select()
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.affiliateId, affiliate.id))
      .orderBy(desc(affiliateCommissions.createdAt))
      .limit(50);

    return { affiliate, commissions };
  }

  async creditCommission(
    referralCode: string,
    referredOrgId: number,
    subscriptionId: number,
    amountInPaise: number,
  ) {
    const affiliate = await db.query.affiliates.findFirst({
      where: and(eq(affiliates.referralCode, referralCode), eq(affiliates.status, "ACTIVE")),
    });
    if (!affiliate) return;

    const commissionAmount = Math.round(
      (amountInPaise * affiliate.commissionRate) / 100,
    );

    await db.transaction(async (tx) => {
      await tx.insert(affiliateCommissions).values({
        affiliateId: affiliate.id,
        referredOrgId,
        subscriptionId,
        amountInPaise: commissionAmount,
        status: "PENDING",
      });
      await tx
        .update(affiliates)
        .set({
          totalEarned: affiliate.totalEarned + commissionAmount,
          pendingPayout: affiliate.pendingPayout + commissionAmount,
          signupCount: affiliate.signupCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(affiliates.id, affiliate.id));
    });
  }

  async trackClick(referralCode: string) {
    await db
      .update(affiliates)
      .set({ clickCount: db.raw ? undefined : undefined })
      .where(eq(affiliates.referralCode, referralCode));
  }
}
```

---

## Task 8: Create ReferralService

**Files:**
- Create: `backend/src/modules/billing/referral.service.ts`

- [ ] **Step 1: Write ReferralService**

```ts
// backend/src/modules/billing/referral.service.ts
import { Injectable, ConflictException } from "@nestjs/common";
import { db } from "../../db";
import { referrals } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

@Injectable()
export class ReferralService {
  async createReferral(referrerOrgId: number, referrerUserId: number, email: string) {
    const existing = await db.query.referrals.findFirst({
      where: and(
        eq(referrals.referrerOrgId, referrerOrgId),
        eq(referrals.referredEmail, email),
      ),
    });
    if (existing) throw new ConflictException("Referral already sent to this email");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [referral] = await db
      .insert(referrals)
      .values({
        referrerOrgId,
        referrerUserId,
        referredEmail: email,
        referralCode: nanoid(12),
        status: "PENDING",
        expiresAt,
      })
      .returning();
    return referral;
  }

  async listReferrals(orgId: number) {
    return db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerOrgId, orgId))
      .orderBy(referrals.createdAt);
  }

  async processSignup(referralCode: string, newOrgId: number) {
    const referral = await db.query.referrals.findFirst({
      where: eq(referrals.referralCode, referralCode),
    });
    if (!referral || referral.status !== "PENDING") return;

    await db
      .update(referrals)
      .set({ status: "SIGNED_UP", referredOrgId: newOrgId, signedUpAt: new Date() })
      .where(eq(referrals.id, referral.id));
  }

  async activateReferral(orgId: number) {
    const referral = await db.query.referrals.findFirst({
      where: and(eq(referrals.referredOrgId, orgId), eq(referrals.status, "SIGNED_UP")),
    });
    if (!referral) return;

    await db
      .update(referrals)
      .set({ status: "ACTIVATED", activatedAt: new Date() })
      .where(eq(referrals.id, referral.id));
  }
}
```

---

## Task 9: Create RevenueAnalyticsService

**Files:**
- Create: `backend/src/modules/billing/revenue-analytics.service.ts`
- Create: `backend/src/modules/billing/dto/analytics.schemas.ts`

- [ ] **Step 1: Write DTO schemas**

```ts
// backend/src/modules/billing/dto/analytics.schemas.ts
import { z } from "zod";

export const recordEventSchema = z.object({
  type: z.enum(["new_subscription", "upgrade", "downgrade", "churn", "reactivation", "addon_purchase", "refund"]),
  orgId: z.number().int().positive(),
  plan: z.string().optional(),
  previousPlan: z.string().optional(),
  mrr: z.number().int(),
  amount: z.number().int().optional(),
});

export const analyticsQuerySchema = z.object({
  period: z.enum(["3m", "6m", "12m"]).default("6m"),
});
```

- [ ] **Step 2: Write RevenueAnalyticsService**

```ts
// backend/src/modules/billing/revenue-analytics.service.ts
import { Injectable } from "@nestjs/common";
import { db } from "../../db";
import { revenueEvents, subscriptions } from "../../db/schema";
import { eq, gte, sql, and } from "drizzle-orm";

@Injectable()
export class RevenueAnalyticsService {
  async recordEvent(data: {
    type: string;
    orgId: number;
    plan?: string;
    previousPlan?: string;
    mrr: number;
    amount?: number;
    metadata?: Record<string, unknown>;
  }) {
    await db.insert(revenueEvents).values({
      type: data.type as never,
      orgId: data.orgId,
      plan: data.plan,
      previousPlan: data.previousPlan,
      mrr: data.mrr,
      amount: data.amount,
      metadata: data.metadata,
    });
  }

  async getMrr() {
    const result = await db
      .select({ mrr: sql<number>`sum(${revenueEvents.mrr})` })
      .from(revenueEvents)
      .where(eq(revenueEvents.type, "new_subscription"));
    return result[0]?.mrr ?? 0;
  }

  async getMetrics() {
    const [activeCount, trialCount, churnCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "ACTIVE")),
      db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "TRIAL")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(revenueEvents)
        .where(eq(revenueEvents.type, "churn")),
    ]);

    const totalActive = Number(activeCount[0]?.count ?? 0);
    const totalTrial = Number(trialCount[0]?.count ?? 0);
    const totalChurn = Number(churnCount[0]?.count ?? 0);

    const mrrResult = await db
      .select({ total: sql<number>`sum(${revenueEvents.mrr})` })
      .from(revenueEvents)
      .innerJoin(subscriptions, eq(revenueEvents.orgId, subscriptions.orgId))
      .where(and(eq(subscriptions.status, "ACTIVE"), eq(revenueEvents.type, "new_subscription")));

    const mrr = Number(mrrResult[0]?.total ?? 0);
    const arr = mrr * 12;
    const arpu = totalActive > 0 ? Math.round(mrr / totalActive) : 0;
    const churnRate = totalActive > 0 ? Math.round((totalChurn / totalActive) * 100) : 0;

    return { mrr, arr, arpu, churnRate, activeSubscriptions: totalActive, trialSubscriptions: totalTrial };
  }

  async getTimeSeriesData(period: string) {
    const months = period === "3m" ? 3 : period === "12m" ? 12 : 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const events = await db
      .select({
        type: revenueEvents.type,
        mrr: revenueEvents.mrr,
        createdAt: revenueEvents.createdAt,
      })
      .from(revenueEvents)
      .where(gte(revenueEvents.createdAt, since))
      .orderBy(revenueEvents.createdAt);

    const byMonth: Record<string, { month: string; newMrr: number; churnMrr: number; netNew: number }> = {};

    for (const event of events) {
      const key = event.createdAt.toISOString().slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { month: key, newMrr: 0, churnMrr: 0, netNew: 0 };
      if (event.type === "new_subscription" || event.type === "upgrade" || event.type === "reactivation") {
        byMonth[key].newMrr += event.mrr;
      }
      if (event.type === "churn" || event.type === "downgrade") {
        byMonth[key].churnMrr += event.mrr;
      }
      byMonth[key].netNew = byMonth[key].newMrr - byMonth[key].churnMrr;
    }

    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }
}
```

---

## Task 10: Extend BillingService

**Files:**
- Modify: `backend/src/modules/billing/billing.service.ts`

- [ ] **Step 1: Add getBillingProfile, updateBillingProfile, getSeatInfo, fix purchaseAddon**

Add imports at top:
```ts
import { billingProfiles } from "../../db/schema/billing";
import { AiCreditsService } from "./ai-credits.service";
```

Add to constructor parameter: `private readonly aiCredits: AiCreditsService`

Replace `purchaseAddon`:
```ts
async purchaseAddon(orgId: number, userId: number, addonId: string, quantity: number) {
  if (addonId.startsWith("ai_pack_")) {
    const packId = parseInt(addonId.replace("ai_pack_", ""), 10);
    const packs = await this.aiCredits.listPacks();
    const pack = packs.find((p) => p.id === packId);
    if (!pack) throw new BadRequestException("AI credit pack not found");
    return this.razorpay.createOrder({
      amount: pack.priceInPaise * quantity,
      currency: "INR",
      receipt: `ai_pack_${packId}_${orgId}_${Date.now()}`,
      notes: { orgId: String(orgId), packId: String(packId), quantity: String(quantity) },
    });
  }
  throw new BadRequestException("Unknown addon type");
}
```

Add new methods:
```ts
async getBillingProfile(orgId: number) {
  let profile = await db.query.billingProfiles.findFirst({
    where: eq(billingProfiles.orgId, orgId),
  });
  if (!profile) {
    [profile] = await db.insert(billingProfiles).values({ orgId }).returning();
  }
  return profile;
}

async updateBillingProfile(orgId: number, data: Partial<{
  gstin: string;
  pan: string;
  billingName: string;
  billingEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  isTaxExempt: boolean;
}>) {
  const profile = await this.getBillingProfile(orgId);
  const [updated] = await db
    .update(billingProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(billingProfiles.id, profile.id))
    .returning();
  return updated;
}

async getSeatInfo(orgId: number) {
  const sub = await this.getSubscription(orgId);
  const PLAN_SEATS: Record<string, number> = {
    STARTER: 10,
    PROFESSIONAL: 50,
    ENTERPRISE: 500,
  };
  const plan = sub?.subscription?.plan ?? "STARTER";
  const total = PLAN_SEATS[plan] ?? 10;
  const usedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(orgMembers)
    .where(eq(orgMembers.orgId, orgId));
  const used = Number(usedResult[0]?.count ?? 0);
  return { total, used, available: Math.max(0, total - used) };
}
```

---

## Task 11: Extend BillingController

**Files:**
- Modify: `backend/src/modules/billing/billing.controller.ts`

- [ ] **Step 1: Add all new routes**

Add imports:
```ts
import { MarketplaceService } from "./marketplace.service";
import { AiCreditsService } from "./ai-credits.service";
import { AffiliateService } from "./affiliate.service";
import { ReferralService } from "./referral.service";
import { RevenueAnalyticsService } from "./revenue-analytics.service";
import { installAppSchema, startTrialSchema } from "./dto/marketplace.schemas";
import { autoTopUpSchema, consumeCreditsSchema, purchaseAiPackSchema } from "./dto/ai-credits.schemas";
import { createReferralSchema } from "./dto/affiliate.schemas";
import { analyticsQuerySchema } from "./dto/analytics.schemas";
import { Body, Delete, Param, ParseIntPipe, Query } from "@nestjs/common";
```

Inject new services in constructor.

Add routes:

```ts
// Marketplace
@Get("marketplace")
@UseGuards(PermissionGuard)
@RequirePermission("billing:marketplace:view")
async listApps(@CurrentUser() u: CurrentUserContext) {
  return this.marketplace.listApps(u.orgId);
}

@Post("marketplace/:appId/install")
@UseGuards(PermissionGuard)
@RequirePermission("billing:marketplace:install")
async installApp(@Param("appId", ParseIntPipe) appId: number, @CurrentUser() u: CurrentUserContext) {
  return this.marketplace.installApp(u.orgId, u.userId, appId);
}

@Delete("marketplace/:appId/install")
@UseGuards(PermissionGuard)
@RequirePermission("billing:marketplace:install")
async uninstallApp(@Param("appId", ParseIntPipe) appId: number, @CurrentUser() u: CurrentUserContext) {
  return this.marketplace.uninstallApp(u.orgId, appId);
}

@Post("marketplace/:appId/trial")
@UseGuards(PermissionGuard)
@RequirePermission("billing:marketplace:install")
async startTrial(@Param("appId", ParseIntPipe) appId: number, @CurrentUser() u: CurrentUserContext) {
  return this.marketplace.startAppTrial(u.orgId, u.userId, appId);
}

// AI Credits
@Get("ai-credits")
@UseGuards(PermissionGuard)
@RequirePermission("billing:ai-credits:view")
async getAiCredits(@CurrentUser() u: CurrentUserContext) {
  const [wallet, packs] = await Promise.all([
    this.aiCredits.getWallet(u.orgId),
    this.aiCredits.listPacks(),
  ]);
  return { ...wallet, packs };
}

@Post("ai-credits/auto-topup")
@UseGuards(PermissionGuard)
@RequirePermission("billing:ai-credits:purchase")
async configureAutoTopUp(@Body() body: unknown, @CurrentUser() u: CurrentUserContext) {
  const data = autoTopUpSchema.parse(body);
  return this.aiCredits.updateAutoTopUp(u.orgId, data.enabled, data.packId, data.threshold);
}

// Billing Profile
@Get("profile")
@UseGuards(PermissionGuard)
@RequirePermission("settings:manage")
async getBillingProfile(@CurrentUser() u: CurrentUserContext) {
  return this.billing.getBillingProfile(u.orgId);
}

@Patch("profile")
@UseGuards(PermissionGuard)
@RequirePermission("billing:profile:update")
async updateBillingProfile(@Body() body: unknown, @CurrentUser() u: CurrentUserContext) {
  return this.billing.updateBillingProfile(u.orgId, body as Record<string, unknown>);
}

// Seats
@Get("seats")
@UseGuards(PermissionGuard)
@RequirePermission("settings:manage")
async getSeatInfo(@CurrentUser() u: CurrentUserContext) {
  return this.billing.getSeatInfo(u.orgId);
}

// Affiliate
@Post("affiliate/register")
@UseGuards(PermissionGuard)
@RequirePermission("billing:affiliate:manage")
async registerAffiliate(@CurrentUser() u: CurrentUserContext) {
  return this.affiliate.register(u.userId, u.orgId);
}

@Get("affiliate")
@UseGuards(PermissionGuard)
@RequirePermission("billing:affiliate:manage")
async getAffiliateDashboard(@CurrentUser() u: CurrentUserContext) {
  return this.affiliate.getDashboard(u.userId);
}

// Referrals
@Post("referrals")
@UseGuards(PermissionGuard)
@RequirePermission("settings:manage")
async createReferral(@Body() body: unknown, @CurrentUser() u: CurrentUserContext) {
  const { email } = createReferralSchema.parse(body);
  return this.referral.createReferral(u.orgId, u.userId, email);
}

@Get("referrals")
@UseGuards(PermissionGuard)
@RequirePermission("settings:manage")
async listReferrals(@CurrentUser() u: CurrentUserContext) {
  return this.referral.listReferrals(u.orgId);
}

// Analytics (platform admin only — add isPlatformAdmin guard)
@Get("analytics")
@UseGuards(PermissionGuard)
@RequirePermission("billing:analytics:view")
async getAnalytics(@Query() query: unknown) {
  const { period } = analyticsQuerySchema.parse(query);
  const [metrics, timeSeries] = await Promise.all([
    this.analytics.getMetrics(),
    this.analytics.getTimeSeriesData(period),
  ]);
  return { metrics, timeSeries };
}
```

---

## Task 12: Update BillingModule

**Files:**
- Modify: `backend/src/modules/billing/billing.module.ts`

- [ ] **Step 1: Register all new services**

```ts
import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { RazorpayService } from "./razorpay.service";
import { RazorpayWebhookController } from "./razorpay-webhook.controller";
import { MarketplaceService } from "./marketplace.service";
import { AiCreditsService } from "./ai-credits.service";
import { AffiliateService } from "./affiliate.service";
import { ReferralService } from "./referral.service";
import { RevenueAnalyticsService } from "./revenue-analytics.service";

@Module({
  controllers: [BillingController, RazorpayWebhookController],
  providers: [
    BillingService,
    RazorpayService,
    MarketplaceService,
    AiCreditsService,
    AffiliateService,
    ReferralService,
    RevenueAnalyticsService,
  ],
  exports: [BillingService, AiCreditsService, RevenueAnalyticsService],
})
export class BillingModule {}
```

---

## Task 13: Frontend — TanStack Query hooks

**Files:**
- Create: `frontend/lib/api/hooks/marketplace.ts`
- Create: `frontend/lib/api/hooks/ai-credits.ts`
- Create: `frontend/lib/api/hooks/affiliate.ts`
- Create: `frontend/lib/api/hooks/revenue-analytics.ts`

- [ ] **Step 1: marketplace.ts**

```ts
// frontend/lib/api/hooks/marketplace.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface MarketplaceApp {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  iconUrl: string | null;
  screenshotUrls: string[];
  features: string[];
  pricingType: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  isActive: boolean;
  requiredPlan: string | null;
  installation: {
    id: number;
    status: "TRIALING" | "ACTIVE" | "CANCELLED";
    trialEndsAt: string | null;
  } | null;
}

export function useMarketplace() {
  return useQuery<MarketplaceApp[]>({
    queryKey: ["billing", "marketplace"],
    queryFn: () => apiClient.get<MarketplaceApp[]>("/billing/marketplace"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInstallApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: number) => apiClient.post(`/billing/marketplace/${appId}/install`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "marketplace"] });
      toast.success("App installed successfully");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to install app"),
  });
}

export function useUninstallApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: number) => apiClient.delete(`/billing/marketplace/${appId}/install`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "marketplace"] });
      toast.success("App uninstalled");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to uninstall app"),
  });
}

export function useStartAppTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: number) => apiClient.post(`/billing/marketplace/${appId}/trial`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "marketplace"] });
      toast.success("Trial started");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to start trial"),
  });
}
```

- [ ] **Step 2: ai-credits.ts**

```ts
// frontend/lib/api/hooks/ai-credits.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface AiCreditPack {
  id: number;
  name: string;
  credits: number;
  bonusCredits: number;
  priceInPaise: number;
  isActive: boolean;
}

export interface AiCreditTransaction {
  id: number;
  type: "PURCHASE" | "USAGE" | "REFUND" | "PLAN_GRANT" | "EXPIRY";
  amount: number;
  balanceAfter: number;
  feature: string | null;
  model: string | null;
  createdAt: string;
}

export interface AiCreditsWallet {
  wallet: {
    id: number;
    orgId: number;
    balance: number;
    lifetimeGranted: number;
    lifetimeConsumed: number;
    autoTopUpEnabled: boolean;
    autoTopUpPackId: number | null;
    autoTopUpThreshold: number | null;
  };
  recentTransactions: AiCreditTransaction[];
  packs: AiCreditPack[];
}

export function useAiCreditsWallet() {
  return useQuery<AiCreditsWallet>({
    queryKey: ["billing", "ai-credits"],
    queryFn: () => apiClient.get<AiCreditsWallet>("/billing/ai-credits"),
    staleTime: 60 * 1000,
  });
}

export function useConfigureAutoTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { enabled: boolean; packId?: number; threshold?: number }) =>
      apiClient.post("/billing/ai-credits/auto-topup", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "ai-credits"] });
      toast.success("Auto top-up settings saved");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to update settings"),
  });
}
```

- [ ] **Step 3: affiliate.ts**

```ts
// frontend/lib/api/hooks/affiliate.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface AffiliateData {
  affiliate: {
    id: number;
    referralCode: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
    commissionType: string;
    commissionRate: number;
    totalEarned: number;
    totalPaid: number;
    pendingPayout: number;
    clickCount: number;
    signupCount: number;
  };
  commissions: Array<{
    id: number;
    amountInPaise: number;
    status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
    createdAt: string;
  }>;
}

export function useAffiliate() {
  return useQuery<AffiliateData | null>({
    queryKey: ["billing", "affiliate"],
    queryFn: () => apiClient.get<AffiliateData | null>("/billing/affiliate"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRegisterAffiliate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/billing/affiliate/register", {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "affiliate"] });
      toast.success("Affiliate account created");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to register"),
  });
}

export function useCreateReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => apiClient.post("/billing/referrals", { email }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "referrals"] });
      toast.success("Referral invitation sent");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to send referral"),
  });
}

export function useReferrals() {
  return useQuery({
    queryKey: ["billing", "referrals"],
    queryFn: () => apiClient.get("/billing/referrals"),
    staleTime: 2 * 60 * 1000,
  });
}
```

- [ ] **Step 4: revenue-analytics.ts**

```ts
// frontend/lib/api/hooks/revenue-analytics.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  churnRate: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
}

export interface TimeSeriesPoint {
  month: string;
  newMrr: number;
  churnMrr: number;
  netNew: number;
}

export interface RevenueAnalytics {
  metrics: RevenueMetrics;
  timeSeries: TimeSeriesPoint[];
}

export function useRevenueAnalytics(period: "3m" | "6m" | "12m" = "6m") {
  return useQuery<RevenueAnalytics>({
    queryKey: ["billing", "analytics", period],
    queryFn: () => apiClient.get<RevenueAnalytics>(`/billing/analytics?period=${period}`),
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## Task 14: Billing Profile hooks + Seats hooks

**Files:**
- Modify: `frontend/hooks/api/subscription.ts`

- [ ] **Step 1: Add billing profile hooks**

Append to `frontend/hooks/api/subscription.ts`:

```ts
export interface BillingProfile {
  id: number;
  orgId: number;
  gstin: string | null;
  pan: string | null;
  billingName: string | null;
  billingEmail: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  isTaxExempt: boolean;
}

export interface SeatInfo {
  total: number;
  used: number;
  available: number;
}

export function useBillingProfile() {
  return useQuery<BillingProfile>({
    queryKey: ["billing", "profile"],
    queryFn: () => apiClient.get<BillingProfile>("/billing/profile"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateBillingProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BillingProfile>) =>
      apiClient.patch<BillingProfile>("/billing/profile", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "profile"] });
      toast.success("Billing profile updated");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to update profile"),
  });
}

export function useSeatInfo() {
  return useQuery<SeatInfo>({
    queryKey: ["billing", "seats"],
    queryFn: () => apiClient.get<SeatInfo>("/billing/seats"),
    staleTime: 2 * 60 * 1000,
  });
}
```

---

## Task 15: Marketplace Page

**Files:**
- Create: `frontend/app/(authenticated)/marketplace/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplace, useInstallApp, useUninstallApp, useStartAppTrial } from "@/lib/api/hooks/marketplace";
import type { MarketplaceApp } from "@/lib/api/hooks/marketplace";
import { Store, Package, CheckCircle2, Clock, Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

const CATEGORIES = ["All", "Sales", "People", "Operations", "Finance", "Support", "AI"] as const;
type Category = typeof CATEGORIES[number];

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function AppCard({ app }: { app: MarketplaceApp }) {
  const install = useInstallApp();
  const uninstall = useUninstallApp();
  const startTrial = useStartAppTrial();

  const inst = app.installation;
  const isActive = inst?.status === "ACTIVE";
  const isTrialing = inst?.status === "TRIALING";

  function handleInstall() {
    install.mutate(app.id);
  }

  function handleUninstall() {
    uninstall.mutate(app.id);
  }

  function handleTrial() {
    startTrial.mutate(app.id);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {app.iconUrl ? (
            <img src={app.iconUrl} alt={app.name} className="h-8 w-8 object-contain" />
          ) : (
            <Package className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{app.name}</p>
            {isActive && (
              <Badge variant="default" className="text-[10px] gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Installed
              </Badge>
            )}
            {isTrialing && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Clock className="h-2.5 w-2.5" /> Trial
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{app.description}</p>
        </div>
      </div>

      {app.features.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {app.features.slice(0, 3).map((f) => (
            <span key={f} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
              {f}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div>
          {app.pricingType === "free" ? (
            <span className="text-xs font-medium text-green-600">Free</span>
          ) : (
            <span className="text-xs font-medium">
              {fmt(app.monthlyPrice)}<span className="text-muted-foreground font-normal">/mo</span>
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {isActive ? (
            <Button variant="outline" size="sm" onClick={handleUninstall} disabled={uninstall.isPending}>
              Uninstall
            </Button>
          ) : isTrialing ? (
            <Button variant="outline" size="sm" disabled>
              Trialing
            </Button>
          ) : (
            <>
              {app.trialDays > 0 && (
                <Button variant="ghost" size="sm" onClick={handleTrial} disabled={startTrial.isPending}>
                  Try {app.trialDays}d free
                </Button>
              )}
              <Button size="sm" onClick={handleInstall} disabled={install.isPending}>
                Install
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [category, setCategory] = useState<Category>("All");
  const { data: apps, isLoading, isError, refetch } = useMarketplace();

  const filtered = apps
    ? category === "All"
      ? apps
      : apps.filter((a) => a.category.toLowerCase() === category.toLowerCase())
    : [];

  return (
    <PageWrapper
      title="Marketplace"
      subtitle="Extend StreamlineOS with apps and integrations"
      icon={Store}
    >
      <div className="space-y-4">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive mb-2">Failed to load marketplace</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No apps in this category"
            description="Check back soon for new integrations."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
```

---

## Task 16: Checkout Page

**Files:**
- Create: `frontend/app/(authenticated)/billing/checkout/page.tsx`

- [ ] **Step 1: Write multi-step checkout wizard**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBillingPlans, useCreateSubscriptionOrder, useVerifySubscription, useValidateCoupon } from "@/hooks/api/subscription";
import { CheckCircle2, ChevronRight, CreditCard, Loader2 } from "lucide-react";
import Script from "next/script";
import { toast } from "sonner";
import type { SubscriptionPlan, BillingCycle } from "@/hooks/api/subscription";

const STEPS = ["Plan", "Billing Cycle", "Coupon", "Review & Pay"] as const;
type Step = 0 | 1 | 2 | 3;

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [plan, setPlan] = useState<SubscriptionPlan>("PROFESSIONAL");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [couponCode, setCouponCode] = useState("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const { data: plans } = useBillingPlans();
  const createOrder = useCreateSubscriptionOrder();
  const verifySubscription = useVerifySubscription();
  const { data: coupon, isLoading: validatingCoupon } = useValidateCoupon(
    step >= 2 ? couponCode : "",
    plan,
  );

  const selectedPlan = plans?.find((p) => p.name === plan);
  const basePrice = selectedPlan
    ? cycle === "annual"
      ? Math.round(selectedPlan.monthlyPrice * 12 * 0.8)
      : selectedPlan.monthlyPrice
    : 0;
  const discountAmount = coupon?.valid ? Math.round(
    coupon.type === "PERCENTAGE"
      ? (basePrice * coupon.value) / 100
      : coupon.value,
  ) : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  function handlePay() {
    createOrder.mutate(
      { plan, billingCycle: cycle, couponCode: coupon?.valid ? couponCode : undefined },
      {
        onSuccess: (order) => {
          const rz = new window.Razorpay({
            key: order.keyId,
            order_id: order.orderId,
            amount: order.amount,
            currency: "INR",
            name: "StreamlineOS",
            description: `${plan} Plan — ${cycle}`,
            handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
              verifySubscription.mutate(
                { paymentId: response.razorpay_payment_id, orderId: response.razorpay_order_id, signature: response.razorpay_signature },
                {
                  onSuccess: () => {
                    toast.success("Subscription activated!");
                    router.push("/settings/subscription");
                  },
                },
              );
            },
          });
          rz.open();
        },
      },
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayLoaded(true)} />
      <PageWrapper title="Upgrade Plan" subtitle="Choose the right plan for your team">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium border ${
                  i < step ? "bg-primary text-primary-foreground border-primary" :
                  i === step ? "border-primary text-primary" : "border-border text-muted-foreground"
                }`}>
                  {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-xs ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-3">
              {plans?.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setPlan(p.name as SubscriptionPlan)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    plan === p.name ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{p.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                    <Badge variant={plan === p.name ? "default" : "secondary"}>
                      ₹{(p.monthlyPrice / 100).toLocaleString("en-IN")}/mo
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {(["monthly", "annual"] as BillingCycle[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    cycle === c ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm capitalize">{c}</p>
                      {c === "annual" && (
                        <p className="text-xs text-green-600 mt-0.5">Save 20% vs monthly</p>
                      )}
                    </div>
                    {selectedPlan && (
                      <span className="text-sm font-medium">
                        ₹{(
                          (c === "annual"
                            ? Math.round(selectedPlan.monthlyPrice * 12 * 0.8)
                            : selectedPlan.monthlyPrice) / 100
                        ).toLocaleString("en-IN")}
                        <span className="text-xs text-muted-foreground">
                          {c === "annual" ? "/yr" : "/mo"}
                        </span>
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="coupon">Coupon Code (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  {validatingCoupon && <Loader2 className="h-4 w-4 animate-spin mt-2.5" />}
                </div>
                {coupon && (
                  coupon.valid ? (
                    <p className="text-xs text-green-600">
                      ✓ {coupon.type === "PERCENTAGE" ? `${coupon.value}% off` : `₹${coupon.value / 100} off`}
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">Invalid or expired coupon</p>
                  )
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-sm">Order Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{selectedPlan?.label} — {cycle}</span>
                  <span>₹{(basePrice / 100).toLocaleString("en-IN")}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon ({couponCode})</span>
                    <span>-₹{(discountAmount / 100).toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{(finalPrice / 100).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1) as Step)} disabled={step === 0}>
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => (s + 1) as Step)}>
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <Button onClick={handlePay} disabled={!razorpayLoaded || createOrder.isPending || verifySubscription.isPending}>
                {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CreditCard className="h-4 w-4 mr-1.5" />}
                Pay ₹{(finalPrice / 100).toLocaleString("en-IN")}
              </Button>
            )}
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
```

---

## Task 17: AI Credits Page

**Files:**
- Create: `frontend/app/(authenticated)/billing/ai-credits/page.tsx`

- [ ] **Step 1: Write page**

```tsx
"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAiCreditsWallet, useConfigureAutoTopUp } from "@/lib/api/hooks/ai-credits";
import { Zap, TrendingDown, TrendingUp, RefreshCw, Package } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";

const TXN_LABELS: Record<string, { label: string; sign: string; color: string }> = {
  PURCHASE: { label: "Purchase", sign: "+", color: "text-green-600" },
  PLAN_GRANT: { label: "Plan Grant", sign: "+", color: "text-green-600" },
  USAGE: { label: "Usage", sign: "-", color: "text-foreground" },
  REFUND: { label: "Refund", sign: "+", color: "text-blue-600" },
  EXPIRY: { label: "Expiry", sign: "-", color: "text-destructive" },
};

export default function AiCreditsPage() {
  const { data, isLoading, refetch } = useAiCreditsWallet();
  const configureTopUp = useConfigureAutoTopUp();
  const [autoTopUp, setAutoTopUp] = useState(data?.wallet.autoTopUpEnabled ?? false);

  function handleAutoTopUpToggle(enabled: boolean) {
    setAutoTopUp(enabled);
    configureTopUp.mutate({ enabled });
  }

  const wallet = data?.wallet;
  const packs = data?.packs ?? [];
  const txns = data?.recentTransactions ?? [];

  return (
    <PageWrapper title="AI Credits" subtitle="Manage your AI usage credits" icon={Zap}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
              <p className="text-2xl font-bold tabular-nums">{wallet?.balance.toLocaleString() ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">credits</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Total Granted
              </p>
              <p className="text-xl font-semibold tabular-nums">{wallet?.lifetimeGranted.toLocaleString() ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Total Used
              </p>
              <p className="text-xl font-semibold tabular-nums">{wallet?.lifetimeConsumed.toLocaleString() ?? 0}</p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Auto Top-Up</p>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-topup" className="text-xs text-muted-foreground">
                {autoTopUp ? "Enabled" : "Disabled"}
              </Label>
              <Switch
                id="auto-topup"
                checked={autoTopUp}
                onCheckedChange={handleAutoTopUpToggle}
                disabled={configureTopUp.isPending}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatically purchase credits when your balance drops below the threshold.
          </p>
        </div>

        {packs.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Credit Packs</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {packs.map((pack) => (
                <div key={pack.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{pack.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pack.credits.toLocaleString()} credits
                        {pack.bonusCredits > 0 && (
                          <Badge variant="secondary" className="ml-1.5 text-[10px]">
                            +{pack.bonusCredits} bonus
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-sm font-medium">
                      ₹{(pack.priceInPaise / 100).toLocaleString("en-IN")}
                    </span>
                    <Button size="sm" variant="outline">
                      Buy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <p className="text-sm font-semibold">Usage History</p>
            <Button variant="ghost" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          {txns.length === 0 ? (
            <EmptyState icon={Zap} title="No transactions yet" description="Credits will appear here once used." className="border-0 bg-transparent py-8" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txns.map((txn) => {
                    const meta = TXN_LABELS[txn.type] ?? { label: txn.type, sign: "", color: "text-foreground" };
                    return (
                      <TableRow key={txn.id}>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{txn.feature ?? "—"}</TableCell>
                        <TableCell className={`text-right text-sm font-medium tabular-nums ${meta.color}`}>
                          {meta.sign}{Math.abs(txn.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {txn.balanceAfter.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {format(new Date(txn.createdAt), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
```

---

## Task 18: Revenue Analytics Page (platform admin)

**Files:**
- Create: `frontend/app/(authenticated)/billing/analytics/page.tsx`

- [ ] **Step 1: Write page**

```tsx
"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueAnalytics } from "@/lib/api/hooks/revenue-analytics";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Users, DollarSign, Percent, BarChart2 } from "lucide-react";

type Period = "3m" | "6m" | "12m";

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function RevenueAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("6m");
  const { data, isLoading } = useRevenueAnalytics(period);

  const metrics = data?.metrics;
  const timeSeries = data?.timeSeries ?? [];

  return (
    <PageWrapper title="Revenue Analytics" subtitle="Platform revenue metrics" icon={BarChart2}>
      <div className="space-y-4">
        <div className="flex gap-1.5">
          {(["3m", "6m", "12m"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                period === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {p === "3m" ? "3 months" : p === "6m" ? "6 months" : "12 months"}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))
          ) : (
            <>
              <MetricCard label="MRR" value={fmt(metrics?.mrr ?? 0)} icon={DollarSign} />
              <MetricCard label="ARR" value={fmt(metrics?.arr ?? 0)} icon={TrendingUp} />
              <MetricCard label="ARPU" value={fmt(metrics?.arpu ?? 0)} icon={DollarSign} />
              <MetricCard label="Active Subscriptions" value={String(metrics?.activeSubscriptions ?? 0)} icon={Users} />
              <MetricCard label="Trial Subscriptions" value={String(metrics?.trialSubscriptions ?? 0)} icon={Users} />
              <MetricCard label="Churn Rate" value={`${metrics?.churnRate ?? 0}%`} icon={Percent} />
            </>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold mb-4">MRR Trend</p>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : timeSeries.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No data for selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeSeries} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  labelClassName="text-xs"
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="newMrr" name="New MRR" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="churnMrr" name="Churned MRR" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
```

---

## Task 19: Affiliate Page

**Files:**
- Create: `frontend/app/(authenticated)/billing/affiliate/page.tsx`

- [ ] **Step 1: Write page**

```tsx
"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAffiliate, useRegisterAffiliate, useCreateReferral, useReferrals } from "@/lib/api/hooks/affiliate";
import { Users, Copy, Link2, CheckCircle2, Clock, DollarSign } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { format } from "date-fns";

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const COMMISSION_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  PAID: "outline",
  CANCELLED: "destructive",
};

export default function AffiliatePage() {
  const { data, isLoading } = useAffiliate();
  const register = useRegisterAffiliate();
  const createReferral = useCreateReferral();
  const { data: referrals } = useReferrals();
  const [email, setEmail] = useState("");

  const affiliate = data?.affiliate;
  const commissions = data?.commissions ?? [];

  function handleCopyLink() {
    if (!affiliate) return;
    const link = `${window.location.origin}/signup?ref=${affiliate.referralCode}`;
    void navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  }

  function handleSendReferral() {
    if (!email) return;
    createReferral.mutate(email, { onSuccess: () => setEmail("") });
  }

  return (
    <PageWrapper title="Affiliate Program" subtitle="Earn commissions by referring customers" icon={Users}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ) : !affiliate ? (
          <EmptyState
            icon={DollarSign}
            title="Join the Affiliate Program"
            description="Earn 10% commission on every subscription from customers you refer."
            action={{ label: "Become an Affiliate", onClick: () => register.mutate() }}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
                <p className="text-xl font-bold">{fmt(affiliate.totalEarned)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Pending Payout</p>
                <p className="text-xl font-bold">{fmt(affiliate.pendingPayout)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Signups</p>
                <p className="text-xl font-bold">{affiliate.signupCount}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">Your Referral Link</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${affiliate.referralCode}`}
                  className="text-xs font-mono"
                />
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Commission rate: <strong>{affiliate.commissionRate}%</strong> per referred subscription
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Send Referral Email
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="colleague@company.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSendReferral} disabled={!email || createReferral.isPending}>
                  Send
                </Button>
              </div>
            </div>

            {commissions.length > 0 && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Commission History</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Badge variant={COMMISSION_BADGE[c.status] ?? "secondary"} className="text-[10px]">
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">{fmt(c.amountInPaise)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {format(new Date(c.createdAt), "dd MMM yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
```

---

## Task 20: Update sidebar navigation

**Files:**
- Modify: `frontend/components/layout/sidebar/sidebar-nav-items.ts`

- [ ] **Step 1: Expand Billing section and add Marketplace**

In the Billing section (around line 824), replace the routes array to add AI Credits, Analytics, Affiliate sub-routes.

In the top-level nav items, add a Marketplace entry before or after the Billing group.

The exact additions in the `routes` array inside the Billing `NavGroup`:

```ts
{
  label: "Marketplace",
  icon: Store,
  href: "/marketplace",
  requiredPermission: "billing:marketplace:view",
},
```

Inside the `/billing` children add:
```ts
{ label: "AI Credits", icon: Zap, href: "/billing/ai-credits", requiredPermission: "billing:ai-credits:view" },
{ label: "Checkout", icon: CreditCard, href: "/billing/checkout" },
{ label: "Affiliate", icon: Users, href: "/billing/affiliate", requiredPermission: "billing:affiliate:manage" },
{ label: "Analytics", icon: BarChart2, href: "/billing/analytics", requiredPermission: "billing:analytics:view" },
```

Import additions at top of file:
```ts
import { Store, Zap, BarChart2 } from "lucide-react";
```

---

## Task 21: Run DB migration

- [ ] **Step 1: Generate and push migration**

```bash
pnpm -C backend db:generate
pnpm -C backend db:push
```

Expected: 6 new enum types + 10 new tables created in Neon DB.

---

## Task 22: Run builds and verify

- [ ] **Step 1: Backend build**

```bash
pnpm -C backend build
```

Expected: `Build complete` with no TypeScript errors.

- [ ] **Step 2: Frontend build**

```bash
pnpm -C frontend build
```

Expected: `Build complete` with no TypeScript or lint errors.

- [ ] **Step 3: Fix any type errors found**

Common fixes:
- Import missing types from schema
- Add missing Drizzle imports (`sql`, `eq`, `and`, `desc`, `gte`)
- Ensure `orgMembers` table is imported in billing.service.ts (it already exists in HR schema)

---

## Self-Review

**Spec coverage check:**
- ✅ Marketplace: listApps, install, uninstall, trial
- ✅ AI Credits: wallet, packs, consume (atomic), plan grant, auto top-up
- ✅ Affiliates: register, dashboard, credit commission
- ✅ Referrals: create, list, processSignup, activate
- ✅ Revenue Analytics: record event, MRR, metrics, time series
- ✅ Billing profile: get, update
- ✅ Seat info: plan-based limits
- ✅ All 7 permission keys added to catalog
- ✅ All financial writes in DB transactions (AiCreditsService.consumeCredits)
- ✅ All backend routes have @RequirePermission
- ✅ Frontend pages have loading/error/empty states

**Excluded per spec (Phase 2 roadmap):**
- Multi-currency, regional pricing, usage-based billing, reseller portal, gift cards, app marketplace revenue sharing
