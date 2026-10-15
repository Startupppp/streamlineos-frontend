# 08: Page connected Google and Outlook windows

**What to build:** Load complete or explicitly partial event windows independently for every connected Google and Outlook account.

**Blocked by:** 03: Expand the Calendar projection contract; 04: Enforce source-owner access and scoped identity.

**Status:** ready-for-agent

- [ ] Each provider adapter follows its verified continuation format until exhausted or a documented request budget is reached.
- [ ] More than 100 valid events remain reachable and the response never claims completeness before provider exhaustion.
- [ ] Cancelled or malformed rows do not cause a short normalized page to be mistaken for end-of-feed.
- [ ] One account's failure or reauthentication state does not hide healthy accounts.
- [ ] Tests cover 101+ events, partial-page failure, rate limiting, repeated continuation, invalid rows, organization switch, and two accounts sharing an event ID.

