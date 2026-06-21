# Pass 7 — CASL + plan-gating wired end-to-end

## TL;DR

Took the scaffold from Pass 6 and made it usable across the dashboard. `plan` now flows from `platformSubscriptions` → JWT → session. `<AbilityContextProvider>` wraps the entire dashboard tree. `DashboardGate` migrated internally to CASL with **zero API change** for its 30+ consumers. One AI button (`ai-score-button.tsx`) is now plan-gated as a proof-of-concept. tsc clean.

---

## Shipped

### 1. Plan in the session — `platformSubscriptions` → JWT → session

**Files:** `lib/auth.ts`, `types/next-auth.d.ts`

- JWT callback now reads `platformSubscriptions` for the user's org and stores `plan` on the token. Active subscription → use the DB plan (`STARTER` / `PROFESSIONAL` / `ENTERPRISE`). No subscription → `FREE`.
- Session callback exposes `session.plan`.
- Types extended: `Session.plan?: Plan`, `JWT.plan?: Plan`.
- Cached in Redis alongside the rest of `UserSessionCache` (5-min TTL), so plan changes propagate within 5 minutes without re-login.

### 2. Aligned `lib/billing/feature-gates.ts` to the codebase enum

**File:** `lib/billing/feature-gates.ts`

Renamed `PRO` → `PROFESSIONAL` to match `lib/db/schema/enums.ts` `subscriptionPlanEnum` and the rest of the billing code. Final plan list:

```ts
PLANS = ["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]
```

`PLAN_FEATURES` map unchanged in shape — features per plan are my educated guess (AI features → PROFESSIONAL+, multi-branch / custom RBAC → ENTERPRISE-only). Tweak `lib/billing/feature-gates.ts:31–55` to adjust.

### 3. Ability provider wrapping the dashboard tree

**File:** `components/layout/dashboard-shell.tsx`

`<AbilityContextProvider>` wraps the entire shell. Every component beneath it can call `useAbility()` to get the CASL ability built from the current user's role + DB-loaded permissions.

The provider rebuilds the ability on:
- Session change (login / logout / token refresh)
- Permissions refetch (TanStack Query invalidation when admin/owner edits a role)

So when an admin edits permissions on a custom role via `/api/roles`, all users with that role pick up the change on next refetch — **fully dynamic**, as you asked for.

### 4. `DashboardGate` now uses CASL internally — zero consumer change

**File:** `components/shared/dashboard-gate.tsx`

Same public API (`<DashboardGate permission="hr:employees:view">…`), but internally splits the permission string into `(action, "domain:resource")` and asks `ability.can(...)`. The 30+ consumers don't need any changes. Removed the `usePermissions()` dependency from this file — `useAbility()` is the source of truth.

### 5. Plan-gated AI button (proof-of-concept)

**File:** `features/crm/leads/ai-score-button.tsx`

`useFeature("ai.lead-scoring")` returns `{ enabled, plan, requiredPlan }`. Button is disabled with a tooltip when the org's plan doesn't include the feature. Clicking still shows a toast: `"AI lead scoring requires the PROFESSIONAL plan. Upgrade to unlock."`. Same pattern can be copy-pasted to the ~10 other AI buttons.

---

## Build state

- `pnpm exec tsc --noEmit` — clean for all my changes (one pre-existing `scripts/seed-demo.ts` `INTERVIEWING` typo unrelated to this pass)
- Nothing committed (per rule)
- `.env` untouched (per rule)
- Auth pages untouched (per rule)
- 2 new packages — `@casl/ability@7.0.0`, `@casl/react@7.0.0`

---

## Dynamic roles flow (end-to-end)

This is what you asked for — admin/owner-defined roles + permissions, fully dynamic:

1. Admin/owner uses the existing UI at `/settings/permissions` (or `/api/roles`) to create or edit a role's permissions
2. Server stores `{ role: "MY_CUSTOM_ROLE", permissions: ["hr:employees:view", "crm:leads:update", ...] }` in the `roles` table
3. User assigned to that role logs in
4. JWT callback in `lib/auth.ts` calls `getUserPermissions(userId, orgId)` which reads the DB
5. `usePermissions()` (TanStack Query) exposes them client-side
6. `<AbilityContextProvider>` builds a CASL Ability from those permissions
7. Every gated component (`<DashboardGate permission="..." />`, future `<Can do="..." on="..." />` usage, server `requireFeature(...)` calls) evaluates against that ability
8. Admin changes a permission → query invalidation → ability rebuilds → UI re-renders with new authz

No restart, no redeploy, no code change.

---

## Plan-gating flow (end-to-end)

1. Razorpay (or whoever) writes to `platformSubscriptions` when a plan is purchased / changed
2. JWT callback reads `platformSubscriptions.plan` for the user's org during next session refresh
3. `session.plan` is now `"STARTER" | "PROFESSIONAL" | "ENTERPRISE" | "FREE"`
4. Client: `useFeature("ai.lead-scoring")` → checks `PLAN_FEATURES[session.plan].has(feature)`
5. Server: `requireFeature(session.plan, "ai.lead-scoring")` → returns 402 + `requiredPlan` if not allowed

---

## What still needs human attention

Three things I made reasonable defaults on — flag if any is wrong:

1. **`PLAN_FEATURES` map in `lib/billing/feature-gates.ts:31–55`** — which 22 features belong to which plan. My defaults: AI → PROFESSIONAL+, multi-branch + custom RBAC → ENTERPRISE-only.
2. **FREE plan = no subscription row.** If a different absence-of-subscription state means "STARTER" or "TRIAL" in your billing model, change the `else { plan = "FREE" }` branch in `lib/auth.ts` jwt callback.
3. **Cache TTL is 5 min.** A plan change can take up to 5 min to propagate. If that's too slow for billing flows, call `invalidateUserSession(userId)` from `lib/auth.ts` when a subscription mutates.

---

## Recommended Pass 8 — propagating the pattern

The rails are in place. The next mechanical work is:

| Task | LOC | Effort |
|---|---|---|
| Plan-gate the other ~10 AI buttons (`ai-enrich-lead-button`, `ai-email-dialog`, `ai-churn-risk-button`, `ai-attrition-risk-button`, `ai-summarize-button`, `ai-predict-deal-button`, `ai-next-action-button`, `ai-generate-review-button`, `ai-suggest-reply-button`, `ai-score-candidate-button`) | ~5 LOC each | 1–2 hrs |
| Server-side `requireFeature(...)` on the AI API routes (`/api/ai/*`) so the gate is also enforced server-side | ~3 LOC each | 1 hr |
| Migrate the 30+ `hasPermission(...)` call-sites to `ability.can(...)` (optional — `hasPermission` still works) | 1 line each | 2 hrs |
| Resolve the `ADM_IN` role question from Pass 5 (Is `ADMIN` real? If not, delete the 20+ dead `role === "ADMIN"` guards.) | varies | 1 hr |

Total: ~5–6 hrs of mechanical work to fully exploit the rails.

---

## Files touched this pass

### Modified
- `types/next-auth.d.ts` — added `plan` to Session + JWT types
- `lib/auth.ts` — JWT/session callbacks read `platformSubscriptions.plan`
- `lib/billing/feature-gates.ts` — renamed `PRO` → `PROFESSIONAL`
- `lib/billing/use-feature.ts` — reads `session.plan` not `session.user.plan`
- `components/layout/dashboard-shell.tsx` — wrapped in `<AbilityContextProvider>`
- `components/shared/dashboard-gate.tsx` — uses `useAbility()` internally; same public API
- `features/crm/leads/ai-score-button.tsx` — gated with `useFeature("ai.lead-scoring")`

### Not modified (intentional)
- The 30+ consumers of `<DashboardGate>` — no API change
- Other AI buttons — Pass 8 work
- AI API routes — Pass 8 work
- `lib/rbac/hooks.ts` `usePermissions()` — kept for backward compat with anything still using `hasPermission()` directly

---

## Verification

```bash
pnpm exec tsc --noEmit                                    # clean
grep -nE "useFeature\\(" features/                        # 1 hit (proof-of-concept)
grep -nE "useAbility\\(" components/ lib/                 # AbilityContextProvider + dashboard-gate
grep -nE "session\\.plan\\b" lib/                         # session+use-feature
```
