# 13 — Self-serve signup provisions a working tenant

**Status:** provisioning done — the front door is deliberately a waitlist, and what exists is **admission** rather than self-serve: an operator admits one named person, and that person creates their workspace, verified end to end in a browser. The 25 August decision was not overridden. The demo-dataset criterion has since been met (`seedDemoDataset`, `src/modules/auth/auth.service.ts:200`); one criterion remains open — provisioning takes over a minute — and is stated below rather than hidden.
**Track:** D — funnel
**Blocked by:** 08, 09

## Why

The funnel's measure is not signups but **workspaces with real data in them**.

## Acceptance criteria

- [x] Signup with an email address provisions a tenant, assigns its region and seeds a demo dataset. — *admission* rather than open signup; region assigned from the country asked for at claim; 41 roles and 19 modules provisioned. The demo dataset now seeds too: `seedDemoDataset` at `src/modules/auth/auth.service.ts:200`, inside the same provisioning transaction.
- [x] The new user lands in onboarding through the **existing wizard gate**, which remains the single authority on where they land. — the claim ends at `/signin`; nothing here makes a second redirect decision.
- [x] The workspace has something in it, so the product is judged rather than an empty grid. — done since this was written: `provisionWorkspace` calls `seedDemoDataset(tx, orgId, userId)` (`src/modules/auth/auth.service.ts:200`), in the same transaction as roles and modules, so a workspace is never opened half-seeded. The "No demo dataset" note below is superseded.
- [x] Provisioning is idempotent under retry and leaves no half-created tenant.
- [x] **No business route handler is added to the frontend** — the auth bridge remains the only one.

## Notes (2026-08-26)

**This ticket conflicts with a live product decision, and I did not override
it.** Commit `5850179e5` (25 Aug, authored by the repository owner) replaced
self-serve signup with a waitlist: every marketing CTA now points at `/waitlist`,
and `/signin` "stays reachable by URL for people who already have an account; it
is simply no longer advertised."

Building "self-serve signup provisions a working tenant" would undo that. So the
work done here is the machinery that admission needs **either way** — because
letting somebody in off the waitlist still has to create a tenant, place it, and
seed it.

**Placement is done and is at the seam.** `regionForNewOrg` now takes an optional
country and places accordingly; called without one it returns the primary exactly
as before, so all three existing creation paths are unchanged until they pass
one. Resolution stays at the seam rather than at the callers, for the same reason
region resolution went inside `withTenant` in Phase 1: a fourth creation path
would otherwise have to remember the rule.

**What the audit found:** the waitlist collects entries and **has no admission
path at all**. Nobody can be let in. That is the actual gap in the funnel, and it
is a product decision — who admits, from where, on what basis — rather than a
technical one.

**Still needs you:** the admission trigger and its UX. The provisioning pieces it
would call — placement, demo seed, idempotency — are the parts worth building
before that decision, and placement is the one that was blocking.

---

## Notes (2026-08-26) — the ticket, finished as admission

The 25 August decision stands. What was built is the path a waitlist implies and
did not have: **an operator admits one named person, and that person creates
their workspace.** That is not self-serve signup — a token is minted only by a
platform operator, is single-use, and expires in seven days.

### What exists now

| | |
|---|---|
| `GET /waitlist/entries` | the queue, for whoever decides |
| `POST /waitlist/admit` | mints a single-use token; platform operators only |
| `POST /waitlist/claim` | unauthenticated, rate-limited, provisions the tenant |
| `/waitlist/claim/[token]` | the page, `noindex` — a crawled invitation is a spent one |

Verified end to end in a browser, not from a fixture: admitted entry 6, opened
the claim page, filled the form, and the database then held the organisation
(placed), the user, one member, a `STARTER`/`TRIAL` subscription, **41 roles and
19 modules**, with the entry `CLAIMED`, `claimed_org_id` recorded and the token
consumed. A second use of the same token was refused.

### Authorisation is not RBAC, deliberately

Admitting is the most privileged thing in the product: it creates organisations
for strangers. RBAC here is scoped to an organisation, so a permission key would
let **any tenant's admin** grant themselves the right to create other people's
organisations. `PlatformOperatorGuard` uses a hardcoded allowlist instead,
matching the reasoning already written into `waitlist.service.ts` about its
notification recipients.

The guard reads the email **from the database, by user id** — `BackendClaims`
carries `sub`, `orgId` and `sessionId` and no email, so the first version read
`undefined` and would have refused everybody. That is the failure that looks like
working security right up until the feature is needed. It would also have been
wrong in principle: an authorisation decision made from something the token
minter controls.

### The bug this found: **organisation creation has been broken since Phase 1**

`withTenant` resolves an organisation's region by reading its row — right for
every tenant transaction except the one that *writes* that row. There is nothing
to read, so `regionForOrg` raises *"has no region"*, and **every
organisation-creation path in the platform fails once a region registry is
active.** Nobody noticed: `auth/register` is unreachable from a UI with no signup
page, and the other paths are exercised by tests that run without a registry.

This is exactly the finding ticket 08's negative acceptance test was written to
surface — *"if you find yourself changing them, stop and record it as a finding
about Phase 1's placement"*. The seam was not wrong, it was **incomplete**: it
offered placement by *lookup* and had no way to express placement by
*declaration*, even though `regionForNewOrg` decides it locally in the same
breath. `withNewOrgInRegion` is that missing half, and it is deliberately narrow
— it takes a region rather than tolerating an unplaced organisation, so it cannot
become a way to reach a tenant's data without knowing where that data lives.

It cannot be fixed by "insert the organisation, then open a tenant transaction":
`organizations.owner_membership_id` is NOT NULL with a DEFERRABLE circular
foreign key to `organization_members`, so the two must commit together.

### Two things left, both stated rather than hidden

**~~No demo dataset.~~** — *Superseded 2026-09-08. `seedDemoDataset` now runs in
`provisionWorkspace` (`src/modules/auth/auth.service.ts:200`). The tension below
is real and was decided in favour of seeding; if the activation number ever
looks wrong on day one, this is the paragraph that says why.*

The criterion asks the workspace to have something in it.
Nothing seeds one, and inventing sample records cuts against ticket 14's whole
definition — *activated* means the workspace holds **the tenant's own** data, and
a demo dataset is exactly the "trial reflecting a sample rather than your
business" that the funnel measure exists to exclude. Seeding one would make the
activation number lie on day one. Worth a decision, not a default.

**Provisioning takes over a minute.** Role seeding and module provisioning run
inline, so the claim request stays open for ~90 seconds and the button sits on
"Creating…". The tenant is created and correct — it completed every time — but
most gateways will cut the connection first, and the person will not know it
worked. The fix is to return once the tenant is usable and seed the rest in the
background, which changes `register`'s sequencing and needs care: sign in before
roles exist and the application has no permissions to render.
