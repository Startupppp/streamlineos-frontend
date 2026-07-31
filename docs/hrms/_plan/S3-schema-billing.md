# S3 — Target Schema: Billing, Entitlements, Seats & AI Credits

**Lane:** Design Lane S3  
**Date:** 2026-07-31  
**Branch:** `refactoring-hrms`  
**Status:** Design only — no code changed, no migrations applied.

Evidence notation: `[V]` = verified against source in this session · `[L]` = cited by a recon lane · `[UNVERIFIED]` = requires accountant/operator confirmation.

---

## 0. Problems Being Solved (quick index)

| Ref | Problem | Source |
|-----|---------|--------|
| P-E1 | Two entitlement engines; JWT `plan` claim goes stale | `E-billing-entitlements.md §1-2`; `jwt-auth.guard.ts:184` |
| P-E2 | STARTER and PROFESSIONAL resolve to the same limits | `plan-entitlements.constants.ts:43-58` [V] |
| P-E3 | `PAST_DUE` defined but never set; no dunning | `enums.ts:118` [V]; `L-jobs-notifications.md §8` |
| P-E4 | Three seat definitions; `seatCount` always 1 | `E-billing-entitlements.md §5`; `platform.ts:100` |
| P-E5 | `settle()` not idempotent; `bust()` misses Redis | `ai-credits-reservation.service.ts:110-178` [L]; `plan-limits.service.ts:63` [L] |
| P-E6 | Webhooks inline-processed; raw payload not stored | `payment-webhooks-public.controller.ts` [L]; `R3-billing-patterns.md §6` |
| P-E7 | No platform invoice entity; FY reset never happens | `invoices-write.service.ts:94-104` [V] |
| P-E8 | `org_id` integer/text mismatch in `billing_profiles` + `affiliates` | `B-payroll-billing-schema.md §7` [L] |
| P-E9 | Quota exceeded → 403, not 402; no machine-readable code | `plan-limits.service.ts:205` [L] |

---

## 1. Target ERD

> Column order: PK · FK columns · business columns · timestamps.
> `text CHECK (... IN (...))` is used for new status columns; existing `pgEnum`s are kept.
> All monetary amounts are **integer smallest-unit** (paise for INR, cents for USD).

---

### 1.1 `legal_entities`

One row per legal entity that issues or receives platform invoices. An org typically has one. Enables per-GSTIN per-FY invoice numbering.

```
legal_entities
  id                uuid PK DEFAULT gen_random_uuid()
  org_id            text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
  name              text NOT NULL
  pan               text
  gstin             text                    -- validated ^[0-9]{2}[A-Z]{5}...$ on write
  gstin_state_code  char(2)                 -- derived from GSTIN[0:2]; also the place-of-supply for intra-state supply
  address_line1     text
  address_line2     text
  city              text
  state             text
  pincode           text
  country           char(2) NOT NULL DEFAULT 'IN'
  currency          char(3) NOT NULL DEFAULT 'INR'
  is_primary        boolean NOT NULL DEFAULT true
  created_at        timestamptz NOT NULL DEFAULT now()
  updated_at        timestamptz NOT NULL DEFAULT now()

  INDEX (org_id)
  UNIQUE (org_id, gstin)         -- composite; one GSTIN registration per org
```

---

### 1.2 `products`

Catalog of the products we sell. Currently one row: StreamlineOS SaaS.

```
products
  id           uuid PK DEFAULT gen_random_uuid()
  name         text NOT NULL     -- 'StreamlineOS'
  description  text
  is_active    boolean NOT NULL DEFAULT true
  created_at   timestamptz NOT NULL DEFAULT now()
  updated_at   timestamptz NOT NULL DEFAULT now()
```

---

### 1.3 `plans`

Each row is one plan name. Stable; plan_versions capture the changing limits over time.

```
plans
  id             uuid PK DEFAULT gen_random_uuid()
  product_id     uuid NOT NULL REFERENCES products(id)
  name           text NOT NULL      -- matches EffectivePlan: 'FREE'|'STARTER'|'PROFESSIONAL'|'ENTERPRISE'
  plan_tier      text NOT NULL      -- matches PlanTier: 'FREE'|'PAID'|'ENTERPRISE'
  is_public      boolean NOT NULL DEFAULT true
  sort_order     int NOT NULL DEFAULT 0
  created_at     timestamptz NOT NULL DEFAULT now()

  UNIQUE (product_id, name)
  CHECK (plan_tier IN ('FREE', 'PAID', 'ENTERPRISE'))
  CHECK (name IN ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'))
```

---

### 1.4 `plan_versions` — immutable once used

A plan_version is created when limits or prices change. Subscriptions pin a `plan_version_id` at creation. That version may not be mutated once any subscription references it; changes create a new version.

Grandfathering is the default: an existing subscription keeps its old `plan_version_id` unless a platform admin explicitly migrates it.

```
plan_versions
  id                uuid PK DEFAULT gen_random_uuid()
  plan_id           uuid NOT NULL REFERENCES plans(id)
  version_number    int NOT NULL      -- monotonic per plan_id; starts at 1
  status            text NOT NULL DEFAULT 'DRAFT'
                      -- DRAFT (being assembled) | ACTIVE (new subs get this) | ARCHIVED (superseded)
  limits_snapshot   jsonb NOT NULL
    -- shape: { "members": 10, "projects": 25, "kbPages": 500, "chatChannels": 50,
    --          "crmLeads": 5000, "crmContacts": 5000, "crmDeals": 2500,
    --          "supportTickets": 2000, "automations": 20, "signEnvelopes": 50,
    --          "surveys": 25, "acctInvoices": null, "hrCandidates": 2000, "hrJobPostings": 25 }
    -- null = unlimited; int = cap
  features_snapshot jsonb NOT NULL
    -- shape: { "chatGroupHuddles": false, "kbPublicSharing": false,
    --          "advancedAnalytics": false, "customDomain": false, ... }
  prices_snapshot   jsonb NOT NULL
    -- shape: { "INR": { "MONTHLY": 99900, "ANNUAL": 959040 } }
    -- values in paise
  locked_modules    jsonb NOT NULL DEFAULT '[]'
    -- array of module keys locked at this tier; e.g. ["payroll","inventory"] for FREE
  trial_days        int NOT NULL DEFAULT 0
  effective_from    timestamptz NOT NULL
  notes             text                       -- change log entry
  created_by        text                       -- platform admin user_id
  locked_at         timestamptz                -- set when first subscription references this version
  created_at        timestamptz NOT NULL DEFAULT now()

  UNIQUE (plan_id, version_number)
  CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'))
```

Application rule: when `subscriptions.plan_version_id` is first set, call `lockPlanVersion(plan_version_id)` (sets `locked_at = now()`). Any subsequent attempt to mutate a locked version throws 409.

---

### 1.5 `prices`

Separated from `plan_versions` for currency/interval flexibility. A plan_version can have multiple price rows (INR monthly, INR annual, USD monthly, etc.).

```
prices
  id               uuid PK DEFAULT gen_random_uuid()
  plan_version_id  uuid NOT NULL REFERENCES plan_versions(id)
  currency         char(3) NOT NULL DEFAULT 'INR'
  interval         text NOT NULL          -- 'MONTHLY' | 'ANNUAL'
  amount_paise     bigint NOT NULL        -- in smallest unit for the currency
  is_active        boolean NOT NULL DEFAULT true
  created_at       timestamptz NOT NULL DEFAULT now()

  UNIQUE (plan_version_id, currency, interval)
  CHECK (interval IN ('MONTHLY', 'ANNUAL'))
  CHECK (amount_paise >= 0)
```

---

### 1.6 `subscriptions` — single table (replaces `subscriptions` + `platform_subscriptions`)

The two existing tables (`shared.ts:308`, `platform.ts:92`) [V] are consolidated into one. The `platform_subscriptions` table is dropped in the contract phase. `UNIQUE (org_id)` enforces one subscription per org.

```
subscriptions
  id                        uuid PK DEFAULT gen_random_uuid()
  org_id                    text NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT
  plan_id                   uuid NOT NULL REFERENCES plans(id)
  plan_version_id           uuid NOT NULL REFERENCES plan_versions(id)  -- pinned at creation
  status                    text NOT NULL DEFAULT 'TRIAL'
  grandfathered             boolean NOT NULL DEFAULT false
    -- true = operator has explicitly chosen to keep this org on its current plan_version
    --        even though a newer ACTIVE version exists; migration is deliberate, not automatic
  razorpay_subscription_id  text         -- Razorpay recurring subscription id
  razorpay_plan_id          text         -- Razorpay plan id (for verification)
  currency                  char(3) NOT NULL DEFAULT 'INR'
  interval                  text NOT NULL DEFAULT 'MONTHLY'
  current_period_start      timestamptz
  current_period_end        timestamptz
  trial_ends_at             timestamptz
  past_due_at               timestamptz  -- set when status transitions to PAST_DUE
  suspended_at              timestamptz  -- set when status transitions to SUSPENDED
  cancelled_at              timestamptz
  cancellation_reason       text
  metadata                  jsonb
  created_at                timestamptz NOT NULL DEFAULT now()
  updated_at                timestamptz NOT NULL DEFAULT now()

  UNIQUE (org_id)
  INDEX (status)
  INDEX (trial_ends_at) WHERE status = 'TRIAL'
  INDEX (past_due_at)   WHERE status = 'PAST_DUE'
  CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'))
  CHECK (interval IN ('MONTHLY', 'ANNUAL'))
```

---

### 1.7 `subscription_items`

Line items within a subscription: seat block, per-module add-ons, and any future usage-based lines.

```
subscription_items
  id               uuid PK DEFAULT gen_random_uuid()
  subscription_id  uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE
  type             text NOT NULL          -- 'SEAT' | 'MODULE' | 'ADD_ON'
  quantity         int NOT NULL DEFAULT 1
  unit_price_paise bigint NOT NULL DEFAULT 0
  module_key       text                   -- populated for type = 'MODULE'
  description      text
  created_at       timestamptz NOT NULL DEFAULT now()
  updated_at       timestamptz NOT NULL DEFAULT now()

  INDEX (subscription_id)
  CHECK (type IN ('SEAT', 'MODULE', 'ADD_ON'))
  CHECK (quantity >= 0)
```

---

### 1.8 `entitlement_overrides`

Per-org exceptions: enterprise deals, grandfathered limits, promotional grants. Applied on top of `plan_version.limits_snapshot` / `features_snapshot` by the entitlement service.

```
entitlement_overrides
  id             uuid PK DEFAULT gen_random_uuid()
  org_id         text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
  key            text NOT NULL    -- LimitKey (e.g. 'members') or feature flag key
  override_type  text NOT NULL    -- 'LIMIT' | 'FEATURE_ENABLE' | 'FEATURE_DISABLE' | 'SEATS'
  int_value      int              -- for LIMIT / SEATS overrides (null = unlimited)
  bool_value     boolean          -- for FEATURE_ENABLE / FEATURE_DISABLE
  reason         text NOT NULL    -- 'GRANDFATHERED' | 'ENTERPRISE_DEAL' | 'PROMO' | 'SUPPORT'
  expires_at     timestamptz      -- null = permanent
  created_by     text             -- platform admin user_id
  created_at     timestamptz NOT NULL DEFAULT now()

  INDEX (org_id)
  UNIQUE (org_id, key, override_type)
  CHECK (override_type IN ('LIMIT', 'FEATURE_ENABLE', 'FEATURE_DISABLE', 'SEATS'))
```

---

### 1.9 `seat_ledger`

Append-only record of every seat change. Used for audit, billing disputes, and nightly reconciliation.

```
seat_ledger
  id                   bigint GENERATED ALWAYS AS IDENTITY PK
  org_id               text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
  event                text NOT NULL
  delta                smallint NOT NULL     -- +1 = seat added, -1 = seat released
  actor_id             text                  -- user_id of the actor (admin, system)
  subject_id           text                  -- user_id or invitation_id of the person
  billable_seats_after int NOT NULL          -- snapshot of billable count after this event
  created_at           timestamptz NOT NULL DEFAULT now()

  INDEX (org_id, created_at DESC)    -- seat history per org (query: seat timeline)
  CHECK (event IN ('MEMBER_JOINED', 'MEMBER_LEFT', 'INVITE_SENT', 'INVITE_EXPIRED',
                   'INVITE_ACCEPTED', 'INVITE_REJECTED'))
  CHECK (delta IN (-1, 1))
```

---

### 1.10 `usage_records`

Optional: snapshot of quota utilisation at assertion time. Low-volume; used for dashboards and quota-alert thresholds.

```
usage_records
  id           bigint GENERATED ALWAYS AS IDENTITY PK
  org_id       text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
  metric_key   text NOT NULL              -- LimitKey value
  value        bigint NOT NULL            -- current count at assertion time
  source       text NOT NULL DEFAULT 'ASSERTION'
  recorded_at  timestamptz NOT NULL DEFAULT now()

  INDEX (org_id, metric_key, recorded_at DESC)    -- quota trend per org+key
  CHECK (source IN ('ASSERTION', 'NIGHTLY_RECONCILE', 'OVERRIDE'))
```

---

### 1.11 `platform_invoice_sequences`

Per-legal-entity, per-FY counter. Incremented atomically under advisory lock. Gap-safe: the counter never decreases.

```
platform_invoice_sequences
  id               uuid PK DEFAULT gen_random_uuid()
  legal_entity_id  uuid NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT
  fy_label         text NOT NULL       -- 'FY2627' = April 2026 – March 2027
  last_number      int NOT NULL DEFAULT 0
  updated_at       timestamptz NOT NULL DEFAULT now()

  UNIQUE (legal_entity_id, fy_label)
```

FY label derivation:
```
month >= 4 → fy_start = current_year
month < 4  → fy_start = current_year - 1
fy_label   = 'FY' + fy_start[2:4] + (fy_start+1)[2:4]
```
Example: 2026-11-15 → month=11 ≥ 4 → fy_start=2026 → `FY2627`.

Invoice number format: `SLINV-FY2627-00001`. Prefix is configurable via env `INVOICE_PREFIX`.

Numbering procedure (within a DB transaction):
```sql
SELECT pg_advisory_xact_lock(hashtext($legal_entity_id || '-' || $fy_label));
INSERT INTO platform_invoice_sequences (legal_entity_id, fy_label, last_number)
VALUES ($1, $2, 1)
ON CONFLICT (legal_entity_id, fy_label)
DO UPDATE SET last_number = platform_invoice_sequences.last_number + 1,
              updated_at = now()
RETURNING last_number;
```

---

### 1.12 `platform_invoices`

`[UNVERIFIED — tax fields require accountant sign-off before enabling platform billing with GST]`

```
platform_invoices
  id                   uuid PK DEFAULT gen_random_uuid()
  org_id               text NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT
  legal_entity_id      uuid NOT NULL REFERENCES legal_entities(id)   -- our entity issuing
  subscription_id      uuid REFERENCES subscriptions(id)
  invoice_number       text NOT NULL           -- 'SLINV-FY2627-00001'; immutable once set
  status               text NOT NULL DEFAULT 'DRAFT'

  -- Customer snapshot (captured at issuance; must not change after ISSUED)
  customer_name        text NOT NULL
  customer_gstin       text
  customer_address     text
  customer_state_code  char(2)

  -- Supplier snapshot
  supplier_gstin       text                    -- our GSTIN [UNVERIFIED]
  supplier_state_code  char(2)                 -- our state code for CGST/SGST determination

  -- GST [UNVERIFIED — accountant sign-off required for all tax fields]
  place_of_supply      char(2)                 -- destination state code (B2B: customer GSTIN state; B2C: billing address state)
  is_inter_state       boolean NOT NULL DEFAULT false  -- drives IGST vs CGST+SGST split
  reverse_charge       boolean NOT NULL DEFAULT false
  hsn_sac_code         text NOT NULL DEFAULT '9983'   -- IT services SAC [UNVERIFIED — confirm with CA]

  -- Amounts (all in paise / smallest currency unit) [UNVERIFIED — rates require CA confirmation]
  subtotal_paise       bigint NOT NULL DEFAULT 0
  cgst_rate_bps        int NOT NULL DEFAULT 0          -- basis points; 900 = 9%
  sgst_rate_bps        int NOT NULL DEFAULT 0          -- basis points; 900 = 9%
  igst_rate_bps        int NOT NULL DEFAULT 0          -- basis points; 1800 = 18%
  cgst_paise           bigint NOT NULL DEFAULT 0
  sgst_paise           bigint NOT NULL DEFAULT 0
  igst_paise           bigint NOT NULL DEFAULT 0
  total_paise          bigint NOT NULL DEFAULT 0       -- subtotal + cgst + sgst + igst

  -- Dates
  invoice_date         date NOT NULL
  due_date             date
  period_start         date
  period_end           date

  -- IRP / e-invoicing [UNVERIFIED — required if turnover > ₹5 Cr per CBIC notification Aug 2023]
  irn                  text          -- Invoice Reference Number from IRP
  irn_generated_at     timestamptz

  -- Payment linkage
  paid_at              timestamptz
  payment_id           uuid REFERENCES payments(id)

  notes                text
  created_at           timestamptz NOT NULL DEFAULT now()
  updated_at           timestamptz NOT NULL DEFAULT now()

  UNIQUE (invoice_number)                             -- immutable; gap-safe sequence owns it
  INDEX (org_id, status)                              -- org invoice list
  INDEX (subscription_id)
  INDEX (invoice_date DESC)                           -- provider reconciliation by date
  CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'VOID', 'DISPUTED'))
  CHECK (cgst_paise >= 0 AND sgst_paise >= 0 AND igst_paise >= 0 AND total_paise >= 0)
  CHECK (NOT (cgst_paise > 0 AND igst_paise > 0))    -- can't have both intra+inter-state tax
```

---

### 1.13 `platform_invoice_lines`

```
platform_invoice_lines
  id                uuid PK DEFAULT gen_random_uuid()
  invoice_id        uuid NOT NULL REFERENCES platform_invoices(id) ON DELETE CASCADE
  type              text NOT NULL DEFAULT 'SUBSCRIPTION'
  description       text NOT NULL
  quantity          int NOT NULL DEFAULT 1
  unit_price_paise  bigint NOT NULL
  line_total_paise  bigint NOT NULL        -- quantity × unit_price_paise
  period_start      date
  period_end        date

  INDEX (invoice_id)
  CHECK (type IN ('SUBSCRIPTION', 'SEAT', 'MODULE', 'DISCOUNT', 'CREDIT'))
  CHECK (quantity >= 1)
```

---

### 1.14 `payments`

Canonical payment record. Replaces the fragmented `platform_payments` + `subscription_payments`. All payments are in this table; `platform_payments` / `subscription_payments` become legacy read-only and are dropped in contract phase.

```
payments
  id                          uuid PK DEFAULT gen_random_uuid()
  org_id                      text NOT NULL REFERENCES organizations(id)
  subscription_id             uuid REFERENCES subscriptions(id)
  invoice_id                  uuid REFERENCES platform_invoices(id)
  provider                    text NOT NULL DEFAULT 'razorpay'
  provider_payment_id         text             -- Razorpay payment_id
  provider_order_id           text
  provider_subscription_id    text
  amount_paise                bigint NOT NULL
  currency                    char(3) NOT NULL DEFAULT 'INR'
  status                      text NOT NULL DEFAULT 'PENDING'
  refunded_amount_paise       bigint NOT NULL DEFAULT 0
  failure_reason              text
  failure_code                text
  metadata                    jsonb            -- full provider payload (non-sensitive excerpt)
  received_at                 timestamptz NOT NULL DEFAULT now()
  captured_at                 timestamptz
  refunded_at                 timestamptz

  UNIQUE (provider, provider_payment_id)
  INDEX (org_id, status)
  INDEX (subscription_id, received_at DESC)
  CHECK (status IN ('PENDING', 'CAPTURED', 'FAILED', 'REFUNDED'))
  CHECK (amount_paise > 0)
  CHECK (refunded_amount_paise >= 0 AND refunded_amount_paise <= amount_paise)
```

---

### 1.15 `dunning_attempts`

One row per dunning action (email or charge retry). The dunning scheduler reads `subscriptions WHERE status = 'PAST_DUE'` and generates the schedule on first PAST_DUE entry.

```
dunning_attempts
  id               uuid PK DEFAULT gen_random_uuid()
  subscription_id  uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE
  org_id           text NOT NULL REFERENCES organizations(id)
  attempt_number   int NOT NULL        -- 1..N within the dunning cycle
  attempt_type     text NOT NULL       -- 'EMAIL' | 'RETRY_CHARGE' | 'SUSPEND'
  scheduled_at     timestamptz NOT NULL
  executed_at      timestamptz
  status           text NOT NULL DEFAULT 'PENDING'
  result           jsonb               -- provider response or email send result
  created_at       timestamptz NOT NULL DEFAULT now()

  INDEX (subscription_id, scheduled_at)
  INDEX (status, scheduled_at) WHERE status = 'PENDING'   -- dunning cron query
  CHECK (attempt_type IN ('EMAIL', 'RETRY_CHARGE', 'SUSPEND'))
  CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED'))
```

Dunning schedule from `past_due_at`:

| Day offset | attempt_type | attempt_number |
|---|---|---|
| D+0 | EMAIL | 1 |
| D+1 | RETRY_CHARGE | 2 |
| D+3 | EMAIL | 3 |
| D+3 | RETRY_CHARGE | 4 |
| D+7 | EMAIL | 5 |
| D+7 | RETRY_CHARGE | 6 |
| D+14 | SUSPEND | 7 |

---

### 1.16 `payment_webhook_events` — enhanced schema

Extends the existing table (`payment-providers.ts:97`). New columns added in the expand phase.

**Columns to add:**
```
  raw_payload           bytea NOT NULL            -- original request body bytes; stored immediately on receipt
  provider_event_type   text                      -- e.g. 'payment.captured', 'subscription.charged.failed'
  processing_status     text NOT NULL DEFAULT 'RECEIVED'
  processor_attempts    int NOT NULL DEFAULT 0
  last_error            text
  next_retry_at         timestamptz
  processed_at          timestamptz

  INDEX (processing_status, next_retry_at)
    WHERE processing_status IN ('RECEIVED', 'FAILED')   -- webhook processor queue scan
```

Existing dedupe constraint stays: `UNIQUE (provider_id, environment, provider_event_id)`.

Processing status values: `RECEIVED | PROCESSING | PROCESSED | FAILED | DLQ`

DLQ: after 5 failed attempts, `processing_status = 'DLQ'`; alert fires; operator reviews.

---

### 1.17 `ai_credit_transactions` — idempotency extension

Extend existing table (`billing.ts:137`). One new column:

```
  idempotency_key    text UNIQUE    -- forwarded from ai_credit_reservations.idempotency_key at settle time
  reservation_id     int REFERENCES ai_credit_reservations(id)
```

Unique constraint on `idempotency_key` prevents double-settlement. `ON CONFLICT (idempotency_key) DO NOTHING` in the `settle()` path.

---

### 1.18 Existing tables retained without structural change

- `org_ai_credits` (`billing.ts:118`) — balance row; `SELECT FOR UPDATE` serialisation stays.
- `ai_credit_reservations` (`billing.ts:165`) — already has `idempotency_key UNIQUE`.
- `ai_usage_logs` (`shared.ts:403`) — per-request usage log; no change.
- `ai_credit_packs` (`billing.ts:103`) — pack catalog; no change.
- `coupons` / `coupon_redemptions` (`shared.ts:358,378`) — no change.
- `enterprise_quotes` (`billing.ts:302`) — retain; migrate `negotiated_seats` to `entitlement_overrides` in a later slice.
- `billing_profiles` — retain; `org_id` type mismatch fix described in §11.

---

## 2. Entitlement Resolution

### 2.1 Single-service design

`PlanLimitsService` (`billing/core/plan-limits.service.ts`) is extended to become the **one** entitlement service. `requireFeature()` and `PLAN_FEATURES` in `ai/core/billing/feature-gates.ts` are deleted.

New method added: `checkFeature(orgId, featureKey): Promise<boolean>` — delegates to `getEntitlements()`.

Every AI controller that calls `requireFeature(u.plan, feature)` is updated to call `await this.entitlementService.checkFeature(req.user.orgId, feature)`. The `u.plan` JWT claim is removed entirely from `JwtPayload`.

### 2.2 Entitlement resolution query

```sql
-- Called by PlanLimitsService.getEntitlements(orgId)
-- Returns: plan tier, base limits/features from plan_version, then override layer applied by the service
WITH active_sub AS (
  SELECT
    s.id, s.status, s.plan_version_id, s.grandfathered,
    pv.limits_snapshot, pv.features_snapshot, pv.locked_modules,
    p.plan_tier, p.name AS effective_plan
  FROM subscriptions s
  JOIN plan_versions pv ON pv.id = s.plan_version_id
  JOIN plans p ON p.id = s.plan_id
  WHERE s.org_id = $1
  LIMIT 1
),
overrides AS (
  SELECT key, override_type, int_value, bool_value
  FROM entitlement_overrides
  WHERE org_id = $1
    AND (expires_at IS NULL OR expires_at > now())
)
SELECT sub.*, json_agg(ov) FILTER (WHERE ov.key IS NOT NULL) AS overrides
FROM active_sub sub
LEFT JOIN overrides ov ON true
GROUP BY sub.id, sub.status, sub.plan_version_id, sub.grandfathered,
         sub.limits_snapshot, sub.features_snapshot, sub.locked_modules,
         sub.plan_tier, sub.effective_plan;
```

Service merges: `limits = { ...plan_version.limits_snapshot, ...override_limits }`. `null` = unlimited. Feature flags: enable/disable overrides win over snapshot.

For expired/cancelled subscriptions: `plan_tier = 'FREE'`, `effective_plan = 'FREE'`; `limits_snapshot` from the FREE plan's current ACTIVE version.

### 2.3 Cache layers and `bust()` contract

| Layer | Mechanism | TTL | Busted by |
|---|---|---|---|
| Process-local | `Map<orgId, TierCache>` in `PlanLimitsService` | 30 s | `bust(orgId)` — already implemented |
| Redis | `billing:entitlements:${orgId}` | 60 s | `bust(orgId)` — **missing; must be added** |
| JWT | `u.plan` claim | JWT lifetime | Removed entirely |

`bust(orgId)` after fix:
```ts
// plan-limits.service.ts
async bust(orgId: string): Promise<void> {
  this.tierCache.delete(orgId);                                 // Layer 1
  await this.redis.del(`billing:entitlements:${orgId}`);        // Layer 2 (ADD THIS)
  // Layer 3: no JWT plan claim → nothing to bust
}
```

Effect: an upgrade or downgrade takes effect on the very next request after `bust()` is called. No re-login required. The DB is queried once per 30 s per instance.

---

## 3. Grandfathering

### 3.1 Model

When a new `plan_version` is made ACTIVE, all *existing* subscriptions keep their current `plan_version_id`. `grandfathered = true` is set at that moment. New subscriptions get the new ACTIVE version.

Grandfathered orgs see the old limits until a platform admin explicitly migrates them.

### 3.2 Migration operation

```
PATCH /platform/admin/orgs/:orgId/subscription
  body: { plan_version_id: "uuid-of-target-version" }

1. Validate target version is ACTIVE
2. Update subscriptions SET plan_version_id = $new, grandfathered = false WHERE org_id = $orgId
3. Call bust(orgId)
4. Record in entitlement audit log
```

No automatic migration. All migrations are explicit operator decisions.

### 3.3 New org flow

```
createSubscription(orgId, planName, interval):
  1. Fetch ACTIVE plan_version for planName
  2. INSERT subscriptions(plan_version_id = active_version.id, grandfathered = false, ...)
  3. lockPlanVersion(active_version.id) → sets locked_at if not already set
```

---

## 4. Seat Model

### 4.1 Canonical definitions

| Term | Derivation | Used for |
|---|---|---|
| Billable seats | `COUNT(*) FROM organization_members WHERE org_id=$1 AND status='ACTIVE' AND deleted_at IS NULL` | Display, billing |
| Reserved seats | billable + `COUNT(*) FROM invitations WHERE org_id=$1 AND status='PENDING' AND expires_at > now() AND accepted_at IS NULL` | Enforcement (hard limit for new invites) |
| Seat limit | `getEntitlements(orgId).limits.members` (from plan_version + overrides) | Enforcement threshold |

Enforcement rule: `reserved_seats >= seat_limit` → reject invite with **402** `SEAT_LIMIT_REACHED`.

Billing rule (for future seat-priced plans): billed at billable seats (not reserved). Pending invites reserve but do not bill until accepted.

### 4.2 Seat ledger write sites

| Event | Writes to `seat_ledger` | `delta` |
|---|---|---|
| `invitations.service.ts` — invite created | `INVITE_SENT` | +1 (reserve) |
| `invitations.service.ts` — invite accepted | `INVITE_ACCEPTED` then `MEMBER_JOINED` | 0 then +1 billable |
| `invitations.service.ts` — invite expired | `INVITE_EXPIRED` | -1 (unreserve) |
| `invitations.service.ts` — invite rejected | `INVITE_REJECTED` | -1 (unreserve) |
| `users/user-ops.service.ts` — member removed | `MEMBER_LEFT` | -1 |
| HR direct onboarding (`hr/lifecycle/`) | `MEMBER_JOINED` | +1 |

`billable_seats_after` is a snapshot: run the billable-seat query before writing the ledger row.

### 4.3 Nightly seat reconciliation (cron job)

```
POST /cron/seat-reconciliation

1. For each org with an active subscription:
   a. actual_billable = SELECT COUNT(*) FROM organization_members WHERE org_id=$1 AND status='ACTIVE' AND deleted_at IS NULL
   b. ledger_sum     = SELECT SUM(delta) FROM seat_ledger WHERE org_id=$1 AND event IN ('MEMBER_JOINED','MEMBER_LEFT')
   c. IF ABS(actual_billable - ledger_sum) > 0 → alert + insert usage_record(source='NIGHTLY_RECONCILE')
2. Update subscriptions seat-related metadata if needed
```

Alert threshold: any non-zero discrepancy between actual count and ledger sum triggers a Slack/email alert.

### 4.4 Mid-cycle proration rule

When a seat is added mid-cycle: prorate credit = `(days_remaining / days_in_cycle) × seat_unit_price_paise`. Round half-up. Apply as a `platform_invoice_lines` row of type `SEAT` on the next invoice. This is a future billing feature; the schema supports it via `subscription_items` + `platform_invoice_lines`.

---

## 5. Credit Ledger — Idempotent `settle()`

### 5.1 Idempotent settle procedure

```sql
-- ai-credits-reservation.service.ts: settle(reservationId, actualMilli, idempotencyKey)
BEGIN;

-- Step 1: Lock the reservation row
SELECT id, status, credits, org_id, idempotency_key
FROM ai_credit_reservations
WHERE id = $reservationId
FOR UPDATE;

-- Step 2: Idempotent replay guard
IF reservation.status != 'RESERVED' THEN
  -- Already settled or released — return existing result; do nothing
  ROLLBACK;
  RETURN existing_result;
END IF;

-- Step 3: Compute delta
delta = reservation.credits - actualMilli;  -- positive = refund; negative = additional debit

-- Step 4: Update balance row (serialised by the reservation lock above + org_ai_credits row lock if needed)
UPDATE org_ai_credits
SET balance           = balance + delta,
    lifetime_consumed = lifetime_consumed + actualMilli
WHERE org_id = $orgId;

-- Step 5: Insert USAGE transaction — idempotent via unique constraint
INSERT INTO ai_credit_transactions
  (org_id, type, amount, balance_after, idempotency_key, reservation_id)
VALUES
  ($orgId, 'USAGE', -$actualMilli, (SELECT balance FROM org_ai_credits WHERE org_id=$orgId), $idempotencyKey, $reservationId)
ON CONFLICT (idempotency_key) DO NOTHING;

-- Step 6: Mark reservation SETTLED
UPDATE ai_credit_reservations
SET status = 'SETTLED', updated_at = now()
WHERE id = $reservationId;

COMMIT;
```

### 5.2 Why `CHECK (balance >= 0)` cannot police the ledger

A `CHECK` constraint on `org_ai_credits.balance` validates the column value at the moment of the DML that writes it — it cannot sum across `ai_credit_transactions` rows. The correct enforcement is:

- `SELECT … FOR UPDATE` on the `org_ai_credits` row serializes all concurrent debits for the same org.
- The application-level guard `IF wallet.balance < credits THEN THROW 402` fires before the debit.
- CLAUDE.md §16 permits `balance` to go slightly negative when `actualMilli > reservedMilli` at settle (the estimate was under); this is acceptable and expected.
- A `CHECK (balance >= 0)` would reject legitimate over-settle situations and must NOT be added.

### 5.3 Nightly ledger-vs-balance reconciliation

```
POST /cron/ai-credits-reconciliation

For each org:
  ledger_sum = SELECT SUM(amount) FROM ai_credit_transactions WHERE org_id=$1
  balance_row = SELECT balance FROM org_ai_credits WHERE org_id=$1
  IF ABS(ledger_sum - balance_row) > 100 milli-credits   -- allow ±0.1 credit tolerance
    → alert (Slack + monitoring); log discrepancy with both values
```

Tolerance: 100 milli-credits (0.1 credit) absorbs floating-point edge cases in historical data. Any discrepancy above the threshold is a bug requiring investigation.

---

## 6. Subscription State Machine

```
States:
  TRIAL       — new org; plan access active; trial_ends_at is set
  ACTIVE      — paying; full access per plan_version limits
  PAST_DUE    — payment failed; dunning in progress; access still active (grace period)
  SUSPENDED   — dunning exhausted (D+14 PAST_DUE); READ-ONLY mode
  CANCELLED   — explicit cancellation or voluntary end; FREE tier limits until data purge
  EXPIRED     — trial ended without converting; FREE tier limits

Legal transitions:
  TRIAL      → ACTIVE      — Razorpay payment.captured webhook
  TRIAL      → EXPIRED     — cron trial-expiry; trial_ends_at < now()
  ACTIVE     → PAST_DUE    — Razorpay payment.failed / subscription.charged.failed webhook
  PAST_DUE   → ACTIVE      — dunning retry succeeds (RETRY_CHARGE attempt SUCCEEDED)
  PAST_DUE   → SUSPENDED   — dunning D+14 attempt (SUSPEND attempt executes)
  SUSPENDED  → ACTIVE      — manual reactivation: admin action + payment captured
  ANY        → CANCELLED   — explicit cancellation via platform admin or org owner

Access policy by state:
  TRIAL      → Full access at plan_version limits
  ACTIVE     → Full access at plan_version limits
  PAST_DUE   → Full access (dunning banner shown; no new plan changes)
  SUSPENDED  → READ-ONLY: payroll history readable; new runs, invites, AI, and writes blocked
              → resolveTier returns { tier: FREE, plan: FREE, isSuspended: true }
              → isSuspended flag shown as "Reactivate" banner, NOT as upgrade prompt
  CANCELLED  → FREE tier limits; data retained 30 days then purge scheduled
  EXPIRED    → FREE tier limits; nudge to convert
```

Suspension is read-only, never delete. Payroll runs in LOCKED/PAID/CLOSED status remain readable for auditors and employees.

---

## 7. Webhook Schema & Processing

### 7.1 Five-step processing contract

```
1. VERIFY: HMAC-SHA256(raw_body, RAZORPAY_WEBHOOK_SECRET) — timing-safe compare
   → 400 immediately on failure (no DB write)

2. PERSIST RAW: INSERT INTO payment_webhook_events (raw_payload, provider_event_id, ...)
   ON CONFLICT (provider, environment, provider_event_id) DO NOTHING
   → return HTTP 200 immediately after this step (avoids Razorpay retry storms)

3. DEDUPE: if INSERT affected 0 rows → already persisted; return 200

4. ENQUEUE: the POST /cron/payment-webhook-processor cron picks up
   events WHERE processing_status = 'RECEIVED' ORDER BY received_at LIMIT 50

5. RECONCILE: nightly cron fetches Razorpay settlements API for the past 48h;
   compares against payments table; alerts on gaps > $RECONCILE_THRESHOLD_PAISE
```

### 7.2 Processor retry schedule

| Attempt | Delay |
|---|---|
| 1 | immediate |
| 2 | 5 min |
| 3 | 15 min |
| 4 | 60 min |
| 5 | 360 min |
| > 5 | DLQ; alert |

`next_retry_at` is computed and stored; the processor query is `WHERE processing_status IN ('RECEIVED','FAILED') AND (next_retry_at IS NULL OR next_retry_at <= now())`.

### 7.3 Daily reconciliation job

```
POST /cron/payment-reconciliation

1. Fetch Razorpay settlements for the past 48h via GET /settlements
2. For each Razorpay payment:
   a. Look up in payments table by provider_payment_id
   b. If missing and status = 'captured' → create payments row, investigate
   c. If status mismatch → alert
3. Output: reconciliation report stored as a JSON row in a reconciliation_runs table
   (not designed here — kept simple: log results to structured logger + alert on gaps)
```

---

## 8. India Invoicing

> **All tax values, rates, SAC codes, and thresholds are `[UNVERIFIED — accountant sign-off required before enabling platform GST billing]`.**

### 8.1 GST treatment

| Scenario | Treatment |
|---|---|
| B2B customer (has GSTIN) | Supply to GSTIN state; intra-state → CGST 9% + SGST 9%; inter-state → IGST 18% [UNVERIFIED] |
| B2C customer (no GSTIN) | Supply to billing address state; same rate split [UNVERIFIED] |
| Reverse charge | `reverse_charge = true` on invoice; buyer pays GST; we show 0 collected [UNVERIFIED] |
| Rate | 18% GST on SaaS/OIDAR services (HSN/SAC 9983) [UNVERIFIED — CA to confirm SAC code and applicability] |

Place-of-supply determination:
```ts
// [UNVERIFIED — accountant sign-off required]
const isInterState = legal_entity.gstin_state_code !== customer_state_code;
const cgstRate = isInterState ? 0 : 900;    // bps
const sgstRate = isInterState ? 0 : 900;    // bps
const igstRate = isInterState ? 1800 : 0;   // bps
```

### 8.2 Sequential immutable numbering per FY

- Counter: `platform_invoice_sequences` (§1.11) — advisory-lock + `ON CONFLICT DO UPDATE` increment
- Format: `SLINV-FY2627-00001`
- FY boundary: April 1 – March 31 (not calendar year)
- Once assigned, `invoice_number` is immutable — voiding a `platform_invoice` marks `status = 'VOID'` but keeps the number
- Gaps are prohibited: the counter never decrements; numbers are never recycled
- Hard deletes of `platform_invoices` are prohibited at the application layer; `ON DELETE RESTRICT` on the sequence FK prevents orphaned counters

### 8.3 E-invoicing [UNVERIFIED]

E-invoicing via IRP (Invoice Registration Portal) is required if aggregate turnover > ₹5 Cr per CBIC Notification 10/2023. The `irn` and `irn_generated_at` columns reserve space. IRP integration is out of scope until the turnover threshold is crossed — an operator flag `ENABLE_IRP_INTEGRATION` gates the generation path.

---

## 9. Column + Index Tables

### 9.1 Key indexes by owning query

| Index | Table | Columns | Owning query |
|---|---|---|---|
| `subscriptions_org_id_uniq` | `subscriptions` | `(org_id)` UNIQUE | `PlanLimitsService.resolveTier()` |
| `subscriptions_status_idx` | `subscriptions` | `(status)` | Dunning cron: PAST_DUE sweep |
| `subscriptions_trial_idx` | `subscriptions` | `(trial_ends_at)` WHERE status='TRIAL' | Trial expiry cron |
| `subscriptions_past_due_idx` | `subscriptions` | `(past_due_at)` WHERE status='PAST_DUE' | Dunning schedule generation |
| `plan_versions_plan_status_idx` | `plan_versions` | `(plan_id, status)` | Find ACTIVE version for new subs |
| `entitlement_overrides_org_idx` | `entitlement_overrides` | `(org_id)` | Entitlement resolution overlay |
| `seat_ledger_org_time_idx` | `seat_ledger` | `(org_id, created_at DESC)` | Seat history / audit |
| `usage_records_org_key_idx` | `usage_records` | `(org_id, metric_key, recorded_at DESC)` | Quota trend per org+key |
| `dunning_pending_idx` | `dunning_attempts` | `(status, scheduled_at)` WHERE status='PENDING' | Dunning cron scheduler |
| `payments_org_status_idx` | `payments` | `(org_id, status)` | Payment history page |
| `payments_provider_uniq` | `payments` | `(provider, provider_payment_id)` UNIQUE | Webhook dedup |
| `platform_invoices_org_status_idx` | `platform_invoices` | `(org_id, status)` | Invoice list page |
| `platform_invoices_seq_uniq` | `platform_invoices` | `(invoice_number)` UNIQUE | Sequence integrity |
| `webhook_proc_status_idx` | `payment_webhook_events` | `(processing_status, next_retry_at)` WHERE status IN (...) | Processor queue scan |
| `ai_txn_idem_uniq` | `ai_credit_transactions` | `(idempotency_key)` UNIQUE | settle() conflict guard |
| `ai_usage_org_time_idx` | `ai_usage_logs` | `(org_id, created_at DESC)` | Usage dashboard aggregation |

### 9.2 Access-pattern matrix

| Pattern | Primary table(s) | Index path | Expected volume |
|---|---|---|---|
| `resolveTier(orgId)` | `subscriptions → plan_versions → plans` | PK → `plan_versions(plan_id, status)` | 30s cached; 1 read per cache miss per instance |
| `getEntitlements(orgId)` | Same + `entitlement_overrides` | Above + `entitlement_overrides(org_id)` | 60s Redis-cached |
| `assertWithinLimit(orgId, key)` | Varies by key (e.g. `organization_members`) | Per-key COUNT query + `entitlement_overrides` | Per write-path call; no cache |
| Seat enforcement | `organization_members`, `invitations` | `(org_id, status, deleted_at)` | Per invite creation |
| Dunning sweep | `subscriptions`, `dunning_attempts` | `past_due_idx`, `dunning_pending_idx` | Daily cron, ~O(PAST_DUE subs) |
| Webhook processor | `payment_webhook_events` | `webhook_proc_status_idx` | Per-cron batch of 50 |
| Invoice generation | `platform_invoice_sequences`, `platform_invoices` | Advisory lock + `(legal_entity_id, fy_label)` UNIQUE | Per billing cycle per org |
| AI credit settle | `ai_credit_reservations`, `org_ai_credits`, `ai_credit_transactions` | PK + `FOR UPDATE` | Per AI call |
| Credit dashboard | `ai_usage_logs` | `(org_id, created_at DESC)` | On page load (30s stale OK) |

### 9.3 Capacity estimate

| Table | Growth rate (100 orgs) | Growth rate (100K orgs) | Partition trigger |
|---|---|---|---|
| `ai_credit_transactions` | ~10K rows/day | ~10M rows/day | 500M rows (~6 months at 100K orgs) |
| `ai_usage_logs` | ~10K rows/day | ~10M rows/day | 500M rows (~6 months at 100K orgs) |
| `seat_ledger` | ~500 rows/day | ~500K rows/day | 100M rows (~7 months at 100K orgs) |
| `payment_webhook_events` | ~100 rows/month | ~100K rows/month | No partition needed for years |
| `usage_records` | ~5K rows/day | ~5M rows/day | 100M rows (~20 days at 100K orgs — partition early) |
| `platform_invoices` | ~100 rows/month | ~100K rows/month | No partition needed |

Partitioning strategy: range-partition `ai_credit_transactions`, `ai_usage_logs`, `usage_records`, and `seat_ledger` by `created_at` with monthly partitions. Implement before the tables exceed 200M rows using `pg_partman` or a migration.

---

## 10. Migration Sequence

| Phase | Steps | Reversible? |
|---|---|---|
| **Expand** | Add `plan_versions`, `prices`, `subscription_items`, `entitlement_overrides`, `seat_ledger`, `usage_records`, `legal_entities`, `platform_invoice_sequences`, `platform_invoices`, `platform_invoice_lines`, `payments`, `dunning_attempts` as new tables. Add nullable `plan_version_id uuid` to `subscriptions`. Add `raw_payload bytea`, `processing_status text DEFAULT 'RECEIVED'`, `processor_attempts int DEFAULT 0`, `next_retry_at timestamptz` to `payment_webhook_events`. Add `idempotency_key text UNIQUE`, `reservation_id int REFERENCES ...` to `ai_credit_transactions`. | YES |
| **Backfill** | Seed `products` (one row), `plans` (4 rows: FREE/STARTER/PROFESSIONAL/ENTERPRISE), `plan_versions` (one ACTIVE version per plan from `plan-entitlements.constants.ts` current values). Backfill `subscriptions.plan_version_id` from existing `subscriptions.plan` name → new `plan_versions.id`. Seed `legal_entities` from `billing_profiles`. Fix `billing_profiles.org_id` type: add `org_id_text text NULL`, backfill, then rename (see §10.1). | YES (remove backfilled rows; revert column adds) |
| **Dual-read** | Deploy new `PlanLimitsService` that reads `plan_versions` via join; falls back to constants when `plan_version_id IS NULL`. Deploy `bust()` with Redis eviction. Deploy webhook handler that writes `raw_payload`. Old code paths still compile and run; both tables are live. | YES (revert to prior deploy) |
| **Cutover** | `ALTER TABLE subscriptions ALTER COLUMN plan_version_id SET NOT NULL` — **IRREVERSIBLE**. Remove `requireFeature()` / `PLAN_FEATURES` code paths — **IRREVERSIBLE in git history, revertable by rollback deploy**. Stop writing to `platform_subscriptions`. Start dunning cron. Start seat reconciliation cron. | `NOT NULL` is irreversible; code removal is deploy-reversible |
| **Contract** | Drop `platform_subscriptions` table — **IRREVERSIBLE**. Drop `subscriptions.plan text` (legacy string field) — **IRREVERSIBLE**. Drop `platform_payments` legacy table — **IRREVERSIBLE**. Drop `billing_profiles.org_id` old integer column after type fix is stable — **IRREVERSIBLE**. Drop `platform_subscriptions.seatCount` dead column — **IRREVERSIBLE**. | All drops irreversible |

All irreversible steps are marked with `-- IRREVERSIBLE` in the migration SQL and require a platform maintenance window announcement.

### 10.1 `org_id` integer vs text mismatch fix

`billing_profiles` and `affiliates` have `org_id` of integer type (`B-payroll-billing-schema.md §7` [L]), while `organizations.id` is `text`. Resolution:

```sql
-- Expand phase migration
ALTER TABLE billing_profiles ADD COLUMN org_id_new text;
ALTER TABLE affiliates ADD COLUMN org_id_new text;

-- Backfill phase
UPDATE billing_profiles SET org_id_new = org_id::text;
UPDATE affiliates SET org_id_new = org_id::text;

-- After verifying no application code reads the old integer column:
-- Audit: grep -r 'billing_profiles.org_id' + 'affiliates.org_id' for integer FK references

-- Contract phase (IRREVERSIBLE)
ALTER TABLE billing_profiles DROP COLUMN org_id;
ALTER TABLE billing_profiles RENAME COLUMN org_id_new TO org_id;
ALTER TABLE billing_profiles ADD CONSTRAINT billing_profiles_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE affiliates DROP COLUMN org_id;
ALTER TABLE affiliates RENAME COLUMN org_id_new TO org_id;
ALTER TABLE affiliates ADD CONSTRAINT affiliates_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);
```

Prerequisite: audit all call sites that pass `org_id` to these tables and verify they send a text UUID, not an integer.

---

## 11. Open Questions

| # | Question | Recommended default | Owner |
|---|---|---|---|
| O-1 | GST rate on platform SaaS invoices (OIDAR classification confirmed?) | Assume 18% IGST/CGST+SGST; DO NOT enable platform billing with GST until CA signs off | CA / accountant |
| O-2 | SAC code for IT services — 9983 or another? | Use 9983 as placeholder; CA to confirm | CA / accountant |
| O-3 | STARTER vs PROFESSIONAL feature split (what differentiates them?) | Product decision; P-12 makes it a data change — edit `plan_versions.features_snapshot` | Product owner |
| O-4 | `org_id` type mismatch in `billing_profiles`/`affiliates` — audit full FK graph before dropping | Audit with `\d+ billing_profiles` in psql before contract phase | Backend engineer |
| O-5 | `enterprise_quotes.negotiated_seats` migration to `entitlement_overrides` — timing? | Migrate in the slice after `entitlement_overrides` table is stable | Backend engineer |
| O-6 | Pre-debit notification for UPI Autopay / eNACH — 24h email required by RBI? | Assume yes; implement notification job before enabling recurring Razorpay subscriptions | CA / Razorpay account manager [UNVERIFIED] |
| O-7 | E-invoicing (IRP) — current turnover below ₹5 Cr threshold? | Assume below threshold; add `ENABLE_IRP_INTEGRATION` env flag; revisit when approaching | Operator / Finance |
| O-8 | `subscriptions` vs `platform_subscriptions` Razorpay ID conflict — which row has the live ID? | Query both tables for each org; the one with a real Razorpay subscription ID wins | Backend engineer |
| O-9 | `billing_profiles.org_id` integer vs `organizations.id` text — are all existing billing_profile rows for orgs that still exist? | Run `SELECT bp.org_id FROM billing_profiles bp WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = bp.org_id::text)` to find orphans before migration | Backend engineer |
| O-10 | Monthly plan AI credit grants (STARTER=500, PROFESSIONAL=2000) — move to `plan_versions.features_snapshot` or keep in code? | Add `ai_credits_monthly` key to `limits_snapshot` so changing the grant is a data change, not a deploy | Backend engineer |
