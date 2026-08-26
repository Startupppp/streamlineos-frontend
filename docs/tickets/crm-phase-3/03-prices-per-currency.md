# 03 — Prices per currency, not converted

**Status:** done — four currencies, stated not converted.
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

## Notes (2026-08-26)

Prices are local: what the plan costs in that market, chosen once and changed
deliberately. **The rupee prices are unchanged to the paise**, asserted against
the existing constant — this ticket adds currencies, it does not reprice the
market that already pays us.

A test asserts the INR/USD ratio *differs across plans*, so a later tidy-up
cannot quietly turn the table back into one exchange rate applied three times.
**That test earned its place immediately**: the first prices I wrote failed it,
because they were conversions without my intending them to be.

An unpriced currency falls back to a stated one and the result carries
`isRequestedCurrency: false`, so a caller rendering the amount without naming the
currency is something the type can point at rather than a number nobody questions.

**The `?? "INR"` default is gone.** `currency` is now required on the platform
payment interface — a default there is the currency bug with a longer fuse, since
a caller that forgets charges rupees to somebody quoted dollars and nothing in
the type says so. Removing it made the compiler name all three call sites, which
is what it was for; all three now state INR explicitly, so behaviour is unchanged
and the places that must become tenant-aware with a second provider are visible.

Annual rounds once at the end rather than twelve times.

**Still open:** the charge itself is INR because Razorpay is the only configured
provider. Ticket 02 makes the three call sites read the tenant's currency.