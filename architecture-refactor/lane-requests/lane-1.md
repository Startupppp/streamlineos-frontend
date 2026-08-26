# Requests for Lane 1 (billing & platform)

## From the orchestrator, 2026-08-26 — c26-01's service is registered in no module

**`VersionedCatalogService` (`backend/src/modules/billing/core/versioned-catalog.service.ts:37`) appears exactly once in the entire backend: its own declaration.** Zero importers, zero `providers:` arrays. `BillingModule.providers` (`billing/core/billing.module.ts:22`) lists eleven services and not this one.

Nest cannot instantiate a class it is not given, so **the service is dead at runtime** while `tsc`, `nest build`, `madge` and the test suite all stay green. Found by `pnpm -C backend exec node scripts/unregistered-injectables.mjs src`, which reports it as the only such class out of 940 injectables.

**Why this needs care rather than a one-line fix:** c26-01's row in `c26-commercial-billing-ledger/README.md` says **`done`**, and three of its criteria are ticked citing line numbers inside this file — the entitlement override write at `:135-170`, the cache fill at `:91-98`, the bust at `:131-133`. Those citations are accurate about the source and false about the running system. The code is real; nothing can reach it.

Two other things to reconcile while you are there:

1. **The ticket file and its index row disagree.** `issues/01-versioned-catalog.md` line 3 says `**Status:** in-progress`; the README row says `done`. One of them is wrong.
2. **That status line's reason is now stale.** It says "NO migration creates these tables". Migration `0520_commercial_billing_catalog` does, and it *is* journalled — as `idx` 293, confirmed by `pnpm -C backend db:reconcile-journal`. `APPLY-MIGRATIONS.md` previously claimed 0520–0524 were un-journalled; that claim was wrong and is corrected. The tables remain unapplied, which is a different and weaker blocker than "no migration exists".

**Suggested resolution:** register the service in `BillingModule`, add a spec that instantiates it through the Nest testing module (an import-and-construct unit test would have passed all along and proves nothing about DI), then re-verify c26-01's criteria against the wired system and make the file and its index row agree.

## Standing offer

Once this is registered, `backend/scripts/unregistered-injectables.mjs` returns zero and can become an `app-*.spec.ts` guard alongside `app-route-uniqueness.spec.ts`. It is deliberately **not** a spec yet, because a spec that fails on `main` would break CI for all four lanes. Tell me when it is clean and I will promote it.

Note it reports candidates, not conclusions: a class can legitimately reach the container via `useClass`/`useFactory`, a custom token or a dynamic module. `abstract` classes are excluded — counting them produced a false positive on `HrProjectionSource`.
