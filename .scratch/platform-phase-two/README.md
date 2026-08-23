# Platform phase two — ticket set

Fifteen tickets across four streams, derived from four PRDs in `docs/specs/`, dated 2026-08-23.

**All fifteen are closed and their files retired.** What each delivered, and what it did not, is below. Two were closed by a concurrent session rather than by this work, and that is marked.

## Outcome by stream

### A — Access version channel

| # | Title | Outcome |
|---|---|---|
| 01 | Pin what an authorization resolution costs | **Done.** Cold 2 borrows, warm 0, measured through `poolTelemetry`. A fifth test pins what the HTTP gate cannot see: past the version window, the cold cost is paid again. |
| 05 | Access version channel | **Done.** A bump clears a shared version key; the durable row stays authoritative so a version can never move backwards into a number another instance already cached against. Local backstop 5s → 1s. |
| 10 | Membership authority joins the version keying | **Done.** `canManageOrganizationMembership` read a cache keyed only by org and user, with no invalidation path at all. Mutation-checked: fails with the version dropped from the key. |
| 11 | Request-cost gate in CI | **Done by the concurrent session.** A `txn-ceiling` job now boots the API against a seeded Postgres and runs `db:check-request-txn`. Not this work. |

**Correction that reshaped the stream.** "Three to four transactions per request" was already fixed before these tickets were written — the warm path costs one, the handler's own, and a gate pins it. The five-second poll survives that gate because a hundred-request run finishes inside the window. So stream A is a **correctness** fix, not a cost one: that poll was the entire cross-instance revocation mechanism, and it could not be moved in either direction.

**Redis pub/sub is not available here.** The only client speaks HTTP and cannot hold a subscription. Coherence comes from the key being *shared*, not pushed. Any future design that reaches for `SUBSCRIBE` is unbuildable in this repository.

### B — Module registry

| # | Title | Outcome |
|---|---|---|
| 02 | One registry declares what a module is | **Done.** 20 modules, one entry each. `ladder` is three-valued — delegable / universal / platform-admin — because "no ladder" conflated a universal surface with organisation administration. |
| 06 | Resolve the `home` ghost | **Done, with two criteria unmet.** `home` is a registry entry administering chat, mail, calendar and notifications. Deriving the namespace map from the registry makes the ghost **structurally impossible**: a module can only claim a namespace by having an entry to claim it from. |
| 07 | Case translation into the registry | **Done.** One function owns it; the guard no longer lowercases inline; the entitlement lookup now tolerates a row stored in either case. Both new tests mutation-checked. |
| 12 | Retire the authored module lists | **Done.** Both lists are computed from the registry. Nothing is authored twice. |

**What ticket 06 could not do:** re-running the permission catalog sync and verifying the stored `module_key` column against existing grant rows both need a live database. Neither was done. The code is correct by construction; the stored rows have not been checked.

**Found while doing it — 15 namespaces that own permissions but are not modules:** `ai`, `audit-log`, `branch`, `dashboard`, `feedbucket`, `integrations`, `onboarding`, `ownership`, `party`, `payments`, `reports`, `sales`, `self`, `settings`, `tasks`. They administer themselves, so nothing redirects to a ghost, but they are pinned in a test so a sixteenth is a decision rather than a discovery.

### C — List-view seam

| # | Title | Outcome |
|---|---|---|
| 03 | Fence Build's filter bar | **Done, two criteria unmet.** 20 tests. Overflow is not fenced — jsdom performs no layout, and an assertion that cannot fail is worse than an absent one. Keyboard navigation is not fenced either. |
| 08 | Filters take a description of what a page filters by | **Done, three criteria unmet.** Three arities — multi, single, range — carry all nine Build categories. 18 tests drive a deliberately non-Build spec. |
| 13 | Move to a neutral home | **Partial.** The decision layer and the chip moved to `features/shared/list-view/`. Nine presentation files stayed: every one imports Build's own types, so moving them means generalising them first. |
| 15 | First non-Build adoption | **Done, three criteria unmet.** Inventory purchase orders. |

**The wall is half down.** Another module can now own its filter *state* declaratively and still has to build its own filter *control*.

**Ticket 15 earned its keep.** The first conversion *added* 8 lines. The criterion says that means the interface is wrong — and it was: the module reset the page parameter but gave no way to set it, so every adopter would have kept a hand-rolled URL writer forever. `page`/`setPage` now belong to the module.

**Also found:** Build holds at least three further filter implementations — `all-work/use-all-work-filters.ts` (which the frontend constitution names *canonical*), `project-list/add-filter-popover.tsx` and `customers/customer-filter-popover.tsx`. The duplication is wider than the review's figures suggested, and the canonical one is not the one this stream generalised.

### D — Entity actions path

| # | Title | Outcome |
|---|---|---|
| 04 | Generic action path, one action end-to-end | **Server done; shipped with no client caller.** `POST /chat/entity-actions/available` and `/submit`, gated on conversation membership and carrying no module permission key. 10 e2e tests. The discovery route had **zero frontend callers** when first written — a route nothing calls is not an end-to-end slice, and calling it done was wrong. A concurrent session has since wired `useEntityActions` to it. |
| 09 | Migrate the remaining actions | **Partial.** Status, assign and due date post to the generic route; four client hooks collapsed to one. The bespoke dialogs were kept. |
| 14 | Delete the Build-keyed routes | **Partial — corrected.** Three server routes deleted and their gate fixed. But **the wrong gate was only removed from the server:** `chat-bubble.tsx` still decided whether to render each action from `useCan("build:tickets:*")`, so a CRM deal in chat offered no actions to anyone without Build permissions — the exact defect the seam exists to remove, moved from route to client rather than removed. Marking this done was wrong. A concurrent session has since migrated three of those five call sites to `useEntityAction`, driven by the discovery route above. |

**The scope correction matters.** `create-task-from-message` is *not* a generic entity action: the server reads the chat message's own text to fill the new record's description. Migrating it to the generic route silently dropped that description — caught before it shipped, by checking what the adapter actually reads. It stays a chat route, but its gate moved from `build:tickets:create` to conversation membership, which was the real defect.

The key assertion lives in `chat-entity-actions.controller.e2e-spec.ts:86`: **a caller holding no Build permission is not refused for a record Build does not own.** It is committed in `781aaae6` and passes. A later commit message (`a16a661b6`) states no such spec exists; that part of it is incorrect — its other two observations about this stream were right, and are recorded above.

**What ticket 09 did not do:** the generic action form driven by `actionsFor`'s declared input kinds was not built, so the assign and due-date dialogs remain. They are the input UI a generic form would have rendered; replacing them is a design job, not a wiring one. No test asserts that discovery and submission cannot disagree.

## Verified state at close

- **Backend:** `tsc --noEmit` 0 errors · `nest build` exit 0 · **553 suites / 4,710 tests** · 19 e2e across both chat action specs.
- **Frontend:** `tsc --noEmit` 0 errors · **77 suites / 438 tests**.
- knip: no new unused files or exports in either repo.
- **Nothing was run against a booted application.** Several criteria are marked unmet for exactly that reason, and this repository's own record shows typecheck, build and mocked tests all passing while nothing worked.
- **Both repos are acyclic — measured, not asserted.** `npx madge@8 --circular` over 3,363 backend files and 4,433 web files: no circular dependency in either. `madge` is still in neither `package.json`, so this had to be run through `npx`; adding it as a dev dependency is the one-line change that makes the constitution's acyclic rule enforceable in CI rather than on request.

## Closed after the fact

- **`pnpm check:cycles` in both repos.** The constitution's acyclic rule had no command behind it. It now has one. `madge` is still not a dev dependency — the script runs it through `npx`, because adding it to `package.json` without regenerating the lockfile would break CI's `--frozen-lockfile`. Pinning it properly is a one-line change plus an install.
- **Ticket 13, second increment.** `FilterCategory` was a closed union of Build's nine categories; it is now open, with Build's list kept as `BuildFilterCategory` and `satisfies` proving those nine still have titles — no cast. `filter-trigger-button.tsx` (the one presentation file with zero Build imports) moved to the shared module. **`features/shared/list-view/` imports nothing from `features/build/`**, so the one-directional flow rule holds.
- **`PAGES.md` and `code-review.txt` restored.** Both were swept into `c27680b6e`, a commit titled for filter parameters that mentions neither. Recovered from `c27680b6e^`, byte-identical.

### Why the remaining seven presentation files did not move

Not effort — a rule. They import Build's `StatusConfigEntry`/`getStatusEntry`, `resolveColumnColor`, `pm-motion`, `status-badge` and `resolve-user-name`. Moving them while those imports stand would make `features/shared/` depend on `features/build/`, which is the exact inversion CLAUDE.md §9 forbids — worse than leaving them where they are. The prerequisite is lifting five genuinely generic helpers (person display, status config, motion constants, column colours, status dot) out of Build first. That is its own ticket, and the overflow behaviour it would carry is still unfenced because jsdom performs no layout.

- **Discovery and submission cannot disagree** — the assertion ticket 09 called for and did not get. Every action `actionsFor` offers on a Build reference is accepted by `submitAction` at the adapter gate, tested as a property over the whole catalog with a deliberately partial permission set. Mutation-checked: drop the `holds` filter from discovery and it fails.
- The same tests pin a real asymmetry rather than papering over it: discovery gates on *readability*, submission on the *write key* plus the runner's tenant and project-membership checks. They are different questions, so an unreadable reference offers nothing while submission is decided further down. Left as-is because the runner is the stricter of the two — the gap cannot admit anything, and closing it would mean discovery re-deciding what the runner already decides better.

## Two incidents, both the same cause

**`496d0404` in `streamlineos-api`** is titled for ticket 10 and contains its seven files plus 24 of a concurrent session's staged work. Cause: `git add <paths>` then a bare `git commit`, which takes the whole index — and the index is shared. The staged count printed 31 against 7 expected and that was not acted on. `56fdde0c` records exactly what was swept in; history was left intact by decision.

**`c27680b6e` in the root repo** is the mirror image: a concurrent session committed all of this work's frontend list-view changes under the message *"Refactor ticket filter parameters and integrate shared list-view functionality"*, together with its own workflow and HR changes — and with the deletion of `PAGES.md` and `code-review.txt`.

**The correct form is `git commit -m … -- <paths>`**, which commits only those paths whatever else is staged. Two sessions sharing one index will otherwise keep doing this to each other.

## Carried forward

- **`PAGES.md` was deleted** in `c27680b6e`. The repository constitution requires it updated at the end of every task; it no longer exists.
- The nine filter presentation files still coupled to Build's types.
- The generic action form, and a test that discovery and submission cannot disagree.
- Re-running the permission catalog sync and checking stored `module_key` values against real grant rows.
- Booting the app and confirming chat actions and Build's filter bar still behave.
