# 03 — Prices per currency, not converted

**Status:** not started
**Track:** A — payments and pricing
**Blocked by:** 01

## Why

Prices are monthly amounts in paise — already integer minor units, so the
representation is right and only the currency is missing. A converted price moves
with the exchange rate and makes an invoice impossible to reproduce eighteen
months later, which is exactly when the question arrives.

## Acceptance criteria

- [ ] Each plan carries an **explicit price per supported currency**. Nothing is converted at display or charge time.
- [ ] An unsupported currency falls back to a stated default **with the currency named**, never silently charged in rupees.
- [ ] A prospect sees the price in their currency before entering payment details.
- [ ] A price change is dated, so an existing subscription reproduces the price in force when it was agreed.
- [ ] Money stays integer minor units throughout, per the platform rule.
