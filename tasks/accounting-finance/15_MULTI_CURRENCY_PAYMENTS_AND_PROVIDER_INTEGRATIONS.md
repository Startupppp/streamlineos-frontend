# Multi-Currency, Payments And Provider Integrations

## Existing Baseline
- Payments module exists.
- Payment provider setup exists.
- Razorpay billing exists.

## Multi-Currency
Backend:
- Organization base currency.
- Transaction currency.
- Exchange rate.
- Base amount.
- Realized gain/loss.
- Unrealized revaluation later.

Frontend:
- Currency selector where applicable.
- Exchange rate display.
- Base currency equivalent.

## Payment Integrations
Support:
- Razorpay
- Stripe later
- Manual bank transfer
- UPI
- Cash
- Card
- Cheque

## Payment Provider Use Cases
- Customer invoice payment links.
- Vendor payment records.
- Subscription billing already separate but can feed ledger.

## Acceptance Criteria
- Payment provider events are idempotent.
- Customer payment posts to ledger.
- Provider fees post to expense account.
- Multi-currency gain/loss posts correctly.

