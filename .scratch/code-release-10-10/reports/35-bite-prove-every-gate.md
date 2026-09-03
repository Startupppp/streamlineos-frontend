# 35 — Make every architecture and release gate bite-proven (session S11)

**Ticket:** `issues/35-bite-prove-every-gate.md` · **Status:** 7 of 8 closed, 1 partial.
**Repo:** `streamlineos-backend` (two commits). No frontend file was touched.

S11 closed the two boxes S10 left open: the authorization-deny gate that S10 named as
"buildable and not written", and the nine VOID `db.transaction` doubles.

---

## Box 4 — authorization deny: `check:authz-deny` (NEW)

`check:route-classification` proves every handler DECLARES an exposure; `check:module-gate` /
`check:scope-application` / `check:record-access` gate the source side. Nothing asserted a deny
TEST exists per gated handler. A gate whose deny branch is never exercised is an assertion about
the decorator, not about the guard: the decorator can name a key nobody holds, an earlier
`@Public()` can bypass it, a `@RequireModule` can name the wrong module — all three ship green,
because the only test written is the allow path.

**The population is derived, not listed.** Every HTTP handler in `src/**/*.controller.ts`, parsed
the way `route-classification-report.mjs` parses them (decorator buffer, class flush, handler-first
resolution matching `Reflector.getAllAndOverride`). A handler is gated when its effective
declaration carries one of the authorization decorators **actually present in `src/`** —
`@RequirePermission`, `@RequireModule`, `@RequireOperatorGrant`.

**Exclusions each carry a reason.** `@Public()` — no deny branch exists. `@Universal()` —
authenticated but unkeyed by design (root CLAUDE.md §8); there is no permission to withhold.
`@AuthorizedInService` (57 handlers) — the deny lives in a named service, not a guard, so a
controller-level route test cannot observe it and the weak SYMBOL link is the only one that could
ever fire; counting them would move the ratchet without measuring anything. Reported as INFO.

**The attribution rule is in the script header** so a reader can check it: a file must both assert a
deny (403 / `ForbiddenException` inside a matcher / a cross-tenant 404 in a file that declares
itself an isolation test — the bare *import* of `ForbiddenException` does not count) **and** name
the handler, by ROUTE link or SYMBOL link. `--why <route>` prints the exact spec file and the exact
link behind any single verdict, so no verdict rests on a count.

A hard-coded id segment deliberately does **not** route-link: `.delete("/x/abc")` does not normalise
to `/x/*`, because `/x/given` is just as often a real sibling route and collapsing it would let one
spec falsely cover every parameterised handler on the prefix. The rule therefore **under-counts**
coverage rather than over-counting it — the safe direction for a floor you walk down. Now stated in
the header, after the proof below surfaced it.

### Measurement, two trees

The shared tree is ~110 files dirty with other agents' in-flight work, so both were measured:

| Tree | Controllers | Spec files (deny) | Gated | Covered | Uncovered | rc |
|---|---|---|---|---|---|---|
| **HEAD only** (`git archive HEAD src test`) | 546 | 1,969 (435) | 3,219 | 766 | **2,453** | **0** |
| Working tree | 549 | 1,975 (435) | 3,224 | 767 | 2,457 | 1 |

The ratchet is pinned to the **committed** measurement — that is what CI runs, and it is exactly the
count measured, not zero-with-a-weakened-detector. Three vacuity floors exit 2 if the walk, the
decorator parser or the deny matcher measures nothing.

### Bite proof — both directions, hermetic HEAD tree

| Step | Uncovered | rc |
|---|---|---|
| clean | 2,453 | 0 |
| plant a `@RequirePermission` handler with no deny test | 2,454 | **1**, naming `GET /access/delegations/zzz-planted-defect-probe` |
| remove it | 2,453 | 0 |
| plant a deny spec for the uncovered `DELETE /access/delegations/*` | 2,452 (covered 766 → **767**) | reports the file + `ROUTE` link, asks for the ratchet to be lowered |
| remove it | 2,453 | 0 |

`pnpm check:authz-deny:self-test` — **40 passed, rc=0**.

The CI step `Gated handlers have a deny test` was already committed inside `32e4fe6d` by another
agent's pathspec commit; it was verified present and **not** re-added.

---

## Box 5 — the VOID transaction doubles: 9 → 2

A VOID double never runs its callback, so every assertion about what happens inside the transaction
is vacuous: the spec passes whether the source is right or wrong. Seven of the nine were in scope.

Each was repaired to match what the spec **claims**, not whichever fix turned the gate green fastest:

- **Five refusal tests** — `tenant-db`, `holds-and-scope-for`, `change-requests.isolation`,
  `hr-workflow-engine`, and the cross-tenant cases in the two finance files. Their whole point is
  that the write is refused *before* any transaction opens, so they now assert
  `expect(db.transaction).not.toHaveBeenCalled()` — plus `insert`/`update` and the inner `findFirst`
  where the claim is stronger. Verdict: DECLARED-UNREACHED.
- **Two same-tenant controls** genuinely execute work inside the transaction, so their doubles now
  invoke the callback and assert what it did. Verdict: INVOKES.

`reconciliation`'s same-tenant control was **worse than inert**. `checkApprovalPolicy` awaits
`.where(...)` with no `.limit()`; a chain answering only `.limit()` returned the builder object,
`policies.find` was not a function, and the method died on a TypeError before ever reaching the
transaction — indistinguishable to the old assertion, which only said the error was not a
`NotFoundException`.

**`payroll-new-services-tenant-isolation.spec.ts` was a detector false positive and was NOT edited.**
Verified unchanged against HEAD: its double is assigned over the object literal
(`dbSurface["transaction"] = jest\n.fn()\n.mockImplementation(...)`), the form a spec must use when
`db` is typed `as unknown as Db`. Reading it needed two scanner fixes, **both made before the ratchet
moved**, so the new number is a measurement and not the detector going quiet:

1. a chain Prettier wrapped across lines (`jest\n.fn()\n.mockImplementation(...)`) was read as `jest`
   alone, failed the jest-surface guard and vanished from the scan entirely — **18 files** carry that
   shape;
2. an assignment over the literal was never looked for at all.

Six new self-test assertions pin both, including the risky direction — a bare double followed by
sibling properties is still exactly one double, and still VOID. Self-test **21 → 27 passed**.

`VOID_FILE_BASELINE` lowered **9 → 2**. The two remaining are
`inventory/replenishment/inv-replenishment.service.spec.ts` and
`leads/lead-status-tenant-isolation.spec.ts` — inventory and CRM, **excluded from this release**,
left untouched.

### Mutation proofs — a spec that cannot fail proves nothing

`jest --runInBand` over all seven: **7 suites / 56 tests pass**.

1. **`tenant-db.spec.ts`** — making the tenant-aware proxy open a transaction of its own reds the
   file on the new assertion: **1 failed / 55 passed**, at `tenant-db.spec.ts:138`. Source restored →
   **56 passed**.
2. **`reconciliation-tenant-isolation.spec.ts`** — deleting the `MANUAL_JOURNAL` "no linked ledger
   account" branch, which lives **inside** the transaction:

   | Source | Spec version | Result |
   |---|---|---|
   | mutated | repaired (INVOKES) | **1 failed / 1 passed** |
   | mutated | pre-repair at HEAD (VOID) | **2 passed** |
   | restored | repaired | 2 passed |

   That is the box in one measurement: **the old spec could not fail.** Both source files restored;
   `git diff` empty on each.

---

## A planted mutation was live in the shared tree

`src/common/tenant/tenant-db.ts` carried an uncommitted
`if (!context) void target.transaction(async (tx) => tx);` inside the proxy `get` trap — a defect
planted for a bite proof that the previous session was killed before restoring. It fires a floating
transaction on **every property access** whenever no tenant context is active. It typechecks, and no
gate looks for it; it was caught only because the seven specs were actually run. Removed; `git diff`
on that file is now empty. That run **is** mutation proof 1 above.

---

## Cross-territory findings — reported, not fixed

- **`check:authz-deny` — the ratchet is owed a LOWERING, by whoever lands the specs that earned it.**
  Mid-session the working tree read 2,457 (rc=1) on nine handlers another agent was adding with no
  deny test — `src/modules/integrations/git/git-connections.controller.ts` and
  `src/modules/settings/settings-deprecated-routes.controller.ts`. That agent then added deny specs:
  the working tree now reads **covered 781, uncovered 2,443 — ten BELOW the committed ratchet of
  2,453** — and the gate says so and exits 0 rather than failing. The ratchet was left at 2,453
  because 2,453 is the honest **committed** measurement and those specs are still uncommitted;
  banking a number that only exists in a dirty tree would red CI for no defect if they never land.
  Whoever commits them should lower `uncoveredRatchet` to the measured number **in that same change**,
  the discipline S10 used for `check:import-direction` (210 → 194). The gate nags on every run until
  they do; it never banks it silently.
- **`check:spec-typecheck` rc=2, two errors, neither mine:**
  `src/modules/hr/config/hr-config-tenant-isolation.spec.ts(136,30)` and `(146,30)` —
  `TS2554: Expected 2 arguments, but got 1`. Another agent added a second constructor parameter to
  `HrNotificationPreferencesService` without updating that spec. Exactly the ts-jest trap: the spec
  passes jest, only `tsc` sees it.
- **`@AuthorizedInService` is 57 handlers whose deny is unobservable from a route test.** If that
  class matters it needs a service-level deny convention, not a controller-level one.

## Honest gaps

- Backend `typecheck`, `lint`, e2e and the full jest suite: **not run** this session.
- `check:authz-deny` is **static**, exactly like `check:tenant-isolation` — it proves a deny test
  exists and is attributable; it does not run it, and attribution is per spec **file**, not per
  `it()` block. Both limits are stated in the script header rather than hidden, and are why the
  number is a floor to walk down, not a score.
