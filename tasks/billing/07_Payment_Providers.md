# 07_Payment_Providers

## Supported
- Stripe
- Razorpay
- Chargebee
- Paddle (future)

## Architecture
Abstract provider layer.

Provider responsibilities:
- Create customer
- Create subscription
- Collect payment
- Handle webhooks
- Refunds

Business logic never depends on a provider.
