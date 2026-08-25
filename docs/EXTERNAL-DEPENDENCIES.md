# External dependencies

Four clocks run independently of build progress. Each one is weeks of somebody
else's process, none can be shortened by writing code, and every one of them
gates something already built. They are tracked here because a dependency
nobody is watching is a launch date that slips without anybody noticing.

**Start them all now.** The build being ready is not the constraint.

---

## 1. Google restricted-scope OAuth verification — *gates ticket 11*

**Status: not started.** Blocks production use of the Gmail adapter.

Reading a user's mail requires `gmail.readonly`, which Google classifies as a
**restricted** scope. That means:

- an OAuth consent screen submitted for verification, with a demo video showing
  exactly what the app does with the data;
- a **third-party security assessment** by a Google-approved assessor —
  a real engagement, priced in thousands, taking weeks;
- an annual re-assessment thereafter;
- a privacy policy and limited-use disclosure that survive review.

**Consequence for the build:** the adapter, the sweep and the seam all work
against fixture payloads and can be exercised end to end today. What cannot
happen without this is a real user connecting a real mailbox in production.

**What to do now:** create the Google Cloud project, configure the consent
screen, and get the assessment quoted. The assessment is the long pole and it
cannot start until the consent screen exists.

*Testing note:* up to 100 test users can use restricted scopes without
verification. That is enough for internal validation and a design partner, and
nowhere near enough to launch.

## 2. Microsoft Graph — *gates ticket 11 (Outlook)*

**Status: not started.** Lower barrier than Google.

`Mail.Read` is not a restricted scope in the same sense, but publisher
verification is required for a multi-tenant app, and tenant administrators will
need to grant consent for their organisation. Days to weeks, not months.

## 3. Email domain warming — *gates outbound, Phase 4*

**Status: not started.** Weeks of elapsed time, unavoidable.

Sending from a cold domain lands in spam. Reputation is built by sending
gradually increasing volume to engaged recipients over several weeks; there is
no way to buy or accelerate it, and starting late means the domain is still cold
when everything else is ready.

Nothing in Phase 1 sends cold outbound — the quote path (ticket 14) sends to an
existing customer, which is transactional. But the clock should start now
because Phase 4 cannot begin until it has run.

## 4. Payment provider verification — *gates Phase 3*

**Status: not started.** Business verification is weeks.

Taking money needs a verified business entity, bank details and, for Indian
entities, KYC. Out of scope for Phase 1 entirely; recorded so it is not
discovered at the start of Phase 3.

---

## Also outstanding, and smaller

| Item | Gates | Status |
|---|---|---|
| Sentry (or equivalent) DSN | Ticket 01 — error tracking | Port built, nothing attached |
| OpenTelemetry collector endpoint | Ticket 01 — span export | Port built, nothing attached |

Both are one call at boot once an endpoint exists: `setErrorReporter` and
`setSpanExporter`. Neither blocks anything else.
