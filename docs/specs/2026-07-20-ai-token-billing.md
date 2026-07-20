# AI Token-Metered Billing (Cursor-style) — 2026-07-20

Approved design: keep the credits wallet; burn credits proportional to actual tokens used.
Margin decision (Aditya): **1.5×** provider list price. Credit value: **1 credit = $0.01**.

## Units

- DB stores integer **milli-credits** (1 credit = 1000 milli) in `org_ai_credits.balance/lifetime_granted/lifetime_consumed/auto_top_up_threshold`, `ai_credit_reservations.credits`, `ai_credit_transactions.amount/balance_after`.
- Every API response denominates in **fractional credits** (number, ≤3 decimals) — conversion at the service boundary. Frontend never sees milli.
- Pack/plan/trial grant constants stay in whole credits; converted ×1000 at write time.
- `cost_usd` fields = raw provider list cost (no margin). Margin affects credits only.

## Charging formula

`backend/src/modules/ai/billing/ai-model-pricing.constants.ts` (single source of truth):

- `MODEL_TOKEN_PRICING`: per-model `{ inputUsdPer1M, outputUsdPer1M }` — gpt-4o-mini 0.15/0.60, gpt-4o 2.50/10.00, gemini-1.5-pro 1.25/5.00, gemini-1.5-flash 0.075/0.30, OpenRouter `openai/…` aliases; unknown model falls back to DEFAULT 0.50/1.50 (normalize by stripping provider prefix first).
- `AI_MARGIN = 1.5`, `CREDIT_USD_VALUE = 0.01`, `MIN_CHARGE_MILLI = 10` (0.01 credit).
- `computeTokenCharge(model, promptTokens, completionTokens) → { costUsd, milliCredits }` where
  `costUsd = (in×inputRate + out×outputRate)/1e6`;
  `milliCredits = max(MIN_CHARGE_MILLI, round(costUsd × AI_MARGIN / CREDIT_USD_VALUE × 1000))`.
- Replaces `COST_PER_1K_TOKENS` in `ai-usage.service.ts` (estimateCost reuses this catalog).

## Ledger flow

- **Reserve** = ceiling estimate: existing `AI_FEATURE_COSTS` flat integers repurposed as reserve estimates → `getReserveEstimateMilli(feature) = flat × 1000`.
- **Settle** = actual token charge from `computeTokenCharge`. If actual < reserved → refund difference. If actual > reserved → debit the overage in the same transaction (balance may go slightly negative, bounded by estimate quality). `lifetime_consumed += actual`. USAGE transaction rows record `prompt_tokens, completion_tokens, total_tokens, cost_usd`.
- Streaming chat (Ask OS, `chat-assistant.service.ts`): capture `usage` in `streamText` `onFinish`, settle to actual, track tokens (today it records 0 tokens and never settles to actual). Keep usage in the data stream finish part so the client can read it.
- `ai_usage_logs` gains `credits_milli` (int, not null, default 0) written by gateway `track()` — the usage endpoint aggregates from this table alone.
- Existing exception types / 402 mapping unchanged.

## Migration

`backend/migrations/0001_ai_token_billing.sql`, applied via `scripts/apply-sql-file.mjs` (journal reconciliation at next TTY db:generate, per repo pattern):

1. `UPDATE org_ai_credits SET balance=balance*1000, lifetime_granted=lifetime_granted*1000, lifetime_consumed=lifetime_consumed*1000, auto_top_up_threshold=auto_top_up_threshold*1000;`
2. `UPDATE ai_credit_reservations SET credits=credits*1000;`
3. `UPDATE ai_credit_transactions SET amount=amount*1000, balance_after=balance_after*1000;`
4. `ALTER TABLE ai_credit_transactions ADD COLUMN prompt_tokens int, completion_tokens int, total_tokens int, cost_usd numeric(12,6);`
5. `ALTER TABLE ai_usage_logs ADD COLUMN credits_milli int NOT NULL DEFAULT 0;`

Drizzle schema files updated to match (`db/schema/billing.ts`, `db/schema/shared.ts`).

## API contract

- `GET /billing/ai-credits` — unchanged shape; all credit amounts now fractional credits. Transactions include `promptTokens, completionTokens, totalTokens, costUsd` (nullable).
- `GET /billing/ai-credits/transactions` — same enrichment.
- `POST /billing/ai-credits/auto-topup` — `threshold` input in credits, ×1000 on write.
- **New** `GET /billing/ai-credits/usage?days=30` (`billing:ai-credits:view`):
  ```ts
  {
    totals: { requests; promptTokens; completionTokens; totalTokens; credits; costUsd };
    byFeature: Array<{ feature; requests; totalTokens; credits; costUsd }>;
    byModel: Array<{ model; requests; promptTokens; completionTokens; totalTokens; credits; costUsd }>;
    daily: Array<{ date: string; requests; totalTokens; credits }>;
  }
  ```
- Gateway exposes `runStructuredWithUsage`/`runTextWithUsage` variants returning `{ data, aiUsage }`; billing-side metering is universal regardless of variant. AI endpoints backing the shared FE primitives attach:
  ```ts
  aiUsage: { model: string; promptTokens: number; completionTokens: number; totalTokens: number; credits: number; costUsd: number }
  ```

## Frontend

- Shared primitives (pre-seeded): `lib/format-ai.ts` (`formatCredits`, `formatTokens`) and `components/ai/ai-usage-chip.tsx` (`AiUsageChip`, exports `AiUsageMeta`). Chip hides itself when usage is absent — safe to wire everywhere.
- `/billing/ai-credits` becomes the Cursor-style usage page: fractional balance, token-burn stat tiles (requests / tokens / credits over selected 7/30/90-day window), daily usage chart, per-model and per-feature breakdown tables, history table with Tokens + Model + fractional Credits columns. Packs/auto-top-up/purchase flows unchanged.
- `AiDraftCard` gains optional `usage` prop → renders `AiUsageChip`. `AiActionsMenu` passes through `aiUsage` from responses. Surfaces: KB article/page AI actions, mail inbox summary, feedbucket AI panel, executive brief, support AI report, research briefs, /ask, knowledge gaps, Ask OS assistant (if the stream protocol exposes the finish-part usage without rework).

## Out of scope

402/quota flows, packs/Razorpay, entitlements semantics, RBAC keys (reuses `billing:ai-credits:view`), feedbucket public widget.
