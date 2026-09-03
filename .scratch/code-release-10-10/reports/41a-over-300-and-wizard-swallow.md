# 41a — Two ticket-41 blockers: the over-300 ratchet, and the durable-wizard `update()` swallow

Two items, one per section. Both were framed as blocking ticket 41 (a one-commit release
verification that cannot run against a red tree). One was a real regression and is fixed; the
other was a misdiagnosis and is now recorded as such so it is not re-raised.

Commits: backend `26f7c5b0`-shaped split commit (see `git log -1` in `streamlineos-backend`),
frontend `90315022` (ticket 35 adjudication) and the `file-size-exceptions.md` record.

---

## 1. `pnpm check:over-300` — RED at head, now green with a LOWER baseline

### The characterisation I was asked to verify was wrong

The gap had been described as "the one unjustified historical raise". Measured:

| Commit | Baseline in the gate | Measured count | Gate |
|---|---|---|---|
| `f613bb3d` (gate created) | 392 | 392 | rc=0 |
| `c3f0b73d` ("raise the ratchet to 394 with cause") | 394 | **395** | **rc=1** |
| head, before this pass | 394 | 406 | rc=1 |

Method: `git archive <sha> src \| tar -x -C <tmpdir>` into a scratch tree, then ran **that commit's
own** `check-over-300.mjs` against it — never the shared working tree, so nothing was planted.

There is exactly **one** raise in the gate's history and it **is** justified: `c3f0b73d`'s message
names three crossings with before/after line counts, and the `file-size-exceptions.md` audit trail
records the same three. What is actually wrong with it is different: it **undershot by one**, so the
commit that "fixed" the gate shipped it red. The 12-file gap is **1 undershoot + 11 net new
crossings**, and the churn beneath the net is far larger — **42 files crossed 300 and 31 fell back
below it** between `c3f0b73d` and head. There is no identifiable set of "the twelve files".

### Why the "record it as an exception and decrement the baseline" route does not exist

The gate's own failure message points at `architecture-refactor/final-refactor/issues/file-size-exceptions.md`,
but that file is the **500-line** registry read by a *different* gate, `check-file-sizes.mjs`, and
it **fails closed on any registered path measuring 500 or fewer** ("exception no longer needed").
Adding a 301-line file as a table row would turn `check:file-sizes` red. And mechanically, recording
a file as an exception does not remove it from `check:over-300`'s count, so decrementing the
baseline alongside makes the gate *more* red, not less. The only route to green that is not a
baseline raise is to reduce the count. That is what was done.

### What landed

Baseline **394 → 392**; count **406 → 392**. Fourteen files split along a responsibility seam. Every
extraction is a move of exported plain functions (or, for the fence store, a second implementation
class of the same interface), so **no Nest provider, module registration, DI constructor or public
method signature changed** and **no importer of any of the fourteen services needed an edit**.

`command-fence-store` 304→212 · `gdpr.service` 301→160 · `activities.service` 302→249 ·
`hr-dashboard-reports` 303→140 · `hr-workflow-engine` 305→239 · `work-logs.service` 311→246 ·
`email-outbox.service` 307→214 · `user-permission-grants` 302→246 · `chat-history.service` 304→242 ·
`quality-inspections` 309→207 · `po.service` 305→233 · `billing-payment-activation` 309→209 ·
`labor.service` 308→248 · `timer.service` 317→258.

Per-file seams and the four cohesive catalogues deliberately **not** split
(`notification-events.catalog.ts`, `cache-invalidation-matrix.ts`,
`role-templates-crm-hr.constants.ts`, `import-entities.ts` — each already split by domain, so the
next split is by letter range) are recorded in `file-size-exceptions.md` under
"## The over-300 ratchet (backend) — 2026-09-03". That section is **prose, not a table row**, on
purpose: a table row would be parsed by `check-file-sizes.mjs` and fail closed.

The two 301-line files singled out in the brief were judged separately and the brief's instinct held
on both: `gdpr.service.ts` was orchestration + authorization + six inline table-shape queries and
**was split**; `notification-events.catalog.ts` is a catalogue whose seven domain groups are already
siblings and **was not**.

### Collateral I had to fix, because it was mine

Moving two loops moved two N+1 classification entries out from under their registrations, which red
`check:db-call-count` (2 stale verdicts, 2 unclassified). Both entries were **moved with the loop,
verdict unchanged** — `/email/email-outbox.service.ts` (FALSE-POSITIVE) → `/email/email-outbox-retry.ts`,
`/gdpr/gdpr.service.ts` (ACTIONABLE) → `/gdpr/gdpr-sync-export-fetchers.ts`. The ACTIONABLE file
count stays 34; its call-site count reads 54 rather than 53 because the gdpr loop was previously
recorded under a path where the detector no longer saw it. No debt was reclassified away.

### Commands and exit codes — all run, all read

```
node src/scripts/check-over-300.mjs --self-test      rc=0   15 self-tests passed
node src/scripts/check-over-300.mjs                  rc=0   392 of 3606, baseline 392
pnpm typecheck                                       rc=0   (8 GB heap, via heavy.sh mutex)
pnpm check:spec-typecheck                            rc=0   spec-inclusive typecheck passed
pnpm check:cycles                                    rc=0   5,647 files, no circular dependency
pnpm check:module-di                                 rc=0   218 modules · 1,714 classes · 0 violations
pnpm check:db-call-count                             rc=0   after the two entry moves (rc=1 before)
pnpm check:kebab-case                                rc=0   6,453 entries, 0 violations
pnpm check:import-direction                          rc=0   225 files, 0 new violations
```

**Red at head, and NOT mine** (each names only files absent from my commit):

- `pnpm check:file-sizes` rc=1. Six files over 500 unregistered. Two — `support-tickets.service.ts`
  (520) and `check-declaration-column-drift.ts` (534) — measured **identically at HEAD~1**, proved
  with `git show HEAD~1:<path> | wc -l`. The other four (`kb-indexing` 523, `sign-templates` 507,
  `hr-analytics-plus` 503, `payroll-inputs` 502) appeared **between two runs of the gate minutes
  apart**, i.e. other agents are growing them right now.
- `pnpm check:unbounded-reads` rc=1. 4 unclassified (`chat-channel-member-preview.ts`,
  `crm-custom-fields.service.ts`, `cron-organization.service.ts`, `kb-page-attachment-purge.ts`),
  1 stale (`settings-custom-fields.service.ts`), 1 regression (`kpis.service.ts`). None mine.
- `pnpm check:dead-code` rc=1. `chat-message-sender-shape.ts:SENDER_MEMBERSHIP_ID_ONLY` and a stale
  ledger entry for `tenant-context.ts:getTenantAbortSignal` — the latter went stale because another
  agent added its first consumer (`ai/core/streaming/ai-request-abort.ts`). Neither mine.

### Left open

- **The baseline is at exactly the measured count (392 = 392), zero headroom.** That is deliberate —
  slack in a ratchet is a free regression, the same argument ticket 35 used to lower `TIER2_RATCHET`
  283 → 279 — but it means the **next** file any agent pushes over 300 turns this gate red again.
  Anyone landing one owns the split or a further decrement.
- **The frontend twin is also red and was outside this pass.** `pnpm -C frontend check:over-300`
  reports **520 against a baseline of 519, rc=1** — one file above. Identical ticket-41 blocking
  shape, different territory, needs one split or one owner's decrement.

---

## 2. The reported swallow at `lib/onboarding-gate.ts:33` — NOT a defect

**Verdict: the report is wrong, and the reading that doubted it is right.** Full trace with line
numbers is committed into `issues/35-bite-prove-every-gate.md` under "Adjudication — the two
durable-wizard `update()` swallows"; the claim at ticket 35 line ~162 is annotated in place so the
next pass does not re-raise it.

The one fact that settles it: **`resolveWizardGate` never reads `update()`'s result.** The gate is a
server component (`app/(authenticated)/layout.tsx:31-33`) reading `session.orgOnboardingCompletedAt`,
and that value comes from `lib/auth.ts:178-180` — the NextAuth **`session`** callback (not the `jwt`
callback), which performs a **live `GET /auth/session-data/:userId` on every session read**, with no
dependence on `update()`. `update()` refreshes only the JWT token claim, which is the *fallback*
(`lib/auth.ts:216-223` prefers `fresh?.…`).

So durability has three independent layers, and the swallowed call is the least load-bearing:

1. the DB stamp, awaited **before** `completeOnboardingGate` on all three wizard paths, read live on
   every session read;
2. the JWT token claim — what `update()` refreshes;
3. the scoped cookie, written **before** the race.

The backend's `userSession` cache TTL is **60 seconds** (`auth.service.ts:209-341`) and is
invalidated on complete/skip, so the window the 30-day cookie actually bridges is *sixty seconds of
a possibly-dropped Redis invalidation*. A 30-day cookie guarding a 60-second window is the shape of
deliberate belt-and-braces, not of a durability crutch.

Both questions asked resolve the same way. **Different device / no cookie:** layer 1 answers, and
`lib/wizard-gate.test.ts:114` already pins it ("passes when the DB stamp is present, even without a
cookie"). **After the 30-day cookie expires:** layer 1 answers, and `session.maxAge` is 30 days
(`lib/auth.ts:69`) so the session expires on the same horizon anyway and a fresh sign-in re-mints
the claim from the DB. **Did the server stamp always happen first?** Yes, `await`ed, on all three
paths. Bouncing a completed user needs all three layers unavailable simultaneously — and layer 1
being unavailable means the backend is down, in which case the wizard destination is equally broken.

**No fix was landed and none is warranted.** No test was added: the invariants are already pinned by
`lib/wizard-gate.test.ts` (both directions, including the cross-device re-trap case), and a test for
a non-defect would only pin the current implementation.

### `app/(auth)/invitation/[token]/page.tsx:160` — checked separately, as asked

It does **not** call `completeOnboardingGate`. It is a bare
`await update().catch(() => null); router.push("/dashboard")` with **no cookie and no timeout cap**.
It is still not a bounce: `invitation-acceptance.service.ts:174` invalidates `userSession` and layer
1 supplies the new `orgId` on the next server render (`lib/auth.ts:182-184` takes `fresh.orgId`
whenever `fresh` is non-null). What the swallow genuinely costs is that layer 2 is no longer a
*correct* fallback — if the live read also fails, `orgId` falls back to the stale token `null` and
the user lands on `/org-setup` moments after joining an existing org. That needs a simultaneous
second failure and is a resilience thinness, not the reported durability defect. **Left unfixed
deliberately**: the right fix is a product decision about what `/org-setup` should do for a user
whose invitation the server has already accepted, not a `.catch` change.

### Two real asymmetries found on the way — reported, not fixed

1. **`clearGateCookies()` (`lib/onboarding-gate.ts:18-22`) is dead.** It clears the *unscoped* names
   while `completeOnboardingGate` writes the *scoped* `${base}--${scopeId}`, so its two callers
   (sign-out and org-switch, `hooks/common/auth-hooks.ts:115` and `:147`) clear nothing. Harmless
   today because the cookies are scoped by `orgId`/`userId`. Flagged because "fixing" it to clear
   scoped cookies on org switch would *remove* layer 3, not restore it.
2. **`org-setup.service.ts:231-238`, the non-owner skip branch, stamps nothing** — no
   `onboardingCompletedAt`, no `userSession` invalidation. Not reachable as a bounce because
   `wizard-gate.ts:27` gates org-setup on `isOrgOwner`, but the asymmetry is worth knowing.
