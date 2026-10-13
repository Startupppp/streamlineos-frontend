# Manage Product final consolidated code audit — 2026-10-12

## Scope

Current-code audit of the product-owned Build surfaces only: product directory, overview, feedback, insights and discovery, goals, linked projects, roadmap, releases, settings, public product roadmap, and WOW reasons 71–76. Inventory and unrelated modules are excluded except where a product workflow crosses a boundary such as Feedbucket, goals, projects, releases, tickets, approvals, tests or incidents.

Markdown completion markings were ignored. Documentation was used only as the expected behavior contract. Completion decisions come from the current source and executable checks.

## Final decision

Manage Product is substantially implemented but not complete. There are eight remaining source-visible work packages and five evidence gates. This list supersedes every earlier Manage Product audit list.

> **Status as of 2026-10-13 — 11 of 13 closed.**
> MP-01…MP-08 and MP-10, MP-11 are closed. MP-12 and MP-13 are partially
> closed, each held open by one thing code cannot produce: operational
> monitoring and an executed rollback drill for MP-12, current customer and
> market evidence for MP-13. **MP-09 is the only item open on work a test
> runner could never do** — authenticated browser acceptance at 375/768/1280.
> The per-item table below and the dated passes carry the evidence.

## Remaining implementation and test work

### MP-01 — Unify product roadmap publication

Product tokens are hashed, expirable, revocable and versioned. `publicationVersion` does not select a stored snapshot: token resolution returns organization/product IDs and the public service rebuilds the board from current rows. The preview sheet also reads the organization publication endpoint while product publication controls use the product-token endpoint.

Choose one contract:

- For immutable publication, store an allowlisted board snapshot keyed by publication version and serve exactly that snapshot.
- For a live board, remove snapshot implications from the contract and UI and make the version an issuance version only.
- Use the same model for preview, public-page links, cache identity, rotate, expiry and revoke.

### MP-02 — Complete error and retry states on secondary product reads

Several reads use only `data` and `isLoading`. Failures become “not found,” an empty selector or invisible content. Confirmed surfaces include Feedback detail, Opportunity Impact, Settings publication, Roadmap publication and preview, Roadmap initiative detail, duplicate search, Route to Intake project loading, Feedbucket collection, opportunity linking and supporting filter queries.

For each surface:

- distinguish loading, error, denied/not-found and valid empty states;
- provide retry without closing the current dialog or sheet;
- retain typed search and selected values;
- use the repository's non-leaking 403/404 behavior.

### MP-03 — Make all relation selectors complete

Several selectors read one page with a limit of 10, 50 or 100 and provide no cursor continuation. Valid members, goals, linked projects, releases, teams, owners, opportunities or roadmap records can disappear in larger organizations.

Replace bounded one-page selectors with server-search plus cursor paging or infinite loading in:

- Add Product Member;
- Link Existing Goal;
- Mark Duplicate;
- Route Feedback to Intake;
- Link Feedback to Opportunity;
- Accept Opportunity;
- Schedule Outcome Review;
- product release project/release selection;
- roadmap team/goal filters;
- project owner and contribution filters.

### MP-04 — Clean up timers used by publication and return focus

Publication copy feedback and Roadmap initiative focus restoration create timeouts without cleanup. Store timer IDs and cancel them on unmount/navigation, or use a shared safe clipboard/focus utility. Verify that closing one pane and immediately opening another cannot focus an old element or update unmounted state.

### MP-05 — Close accessibility and interaction-test warnings

The frontend suite passes but logs missing Radix dialog descriptions for Opportunity Pane and Compare Drawer. Product Feedback tests also log React updates outside `act`.

Add accessible descriptions, assert name/description relationships, and update interaction tests so they wait for the same state transitions users experience. Treat a warning-free focused suite as the acceptance condition.

### MP-06 — Make active public-link recovery explicit

The raw token is correctly not stored, so after reload a published product can show “Published” but cannot show, open or copy the active URL. Both Settings and Roadmap implement similar publication UI separately.

Create one shared publication component that shows issuance version, issued time and expiry, and provides an explicit “Rotate and copy new link” recovery action. Keep confirmation, mutation errors and cache updates consistent in both entry points.

### MP-07 — Finish canonical release evidence usability

The canonical `projectReleaseId` relation, selector and evidence sheet now exist. Remaining work:

- handle linked-project and project-release query errors;
- search/page both selectors instead of relying on one page;
- link tickets, test runs, incidents and approval state to their authorized owning records;
- carry return context back to the product release;
- redact inaccessible evidence without presenting a false zero count.

### MP-08 — Add regression coverage for repaired boundaries

Add tests that directly prove:

- inaccessible Feedbucket widget update, delete, rotate-key and reassignment are denied;
- Settings Feedback Channels, Projects and Members navigate page 1 → 2 → 3 → 2 → 1;
- selector results continue past the first page;
- every secondary read above renders error and retry;
- publication preview/link/revoke follows the chosen MP-01 contract.

## Required evidence gates

### MP-09 — Authenticated browser acceptance

Test directory, overview, feedback, insights/discovery, goals, projects, roadmap, releases and settings at 375, 768 and 1280 pixels. Cover populated, empty, filtered-empty, loading, error, denied, not-found and offline states; keyboard behavior; focus return; three-page pagination; dirty forms; failed mutation retention; deep links; and expired/revoked public tokens.

### MP-10 — Persisted database lifecycle

Run one complete product lifecycle against a real database: create product and restricted member; link one project to two products; capture/classify/deduplicate feedback; create/score/override/accept opportunity; connect goal, roadmap, project and release; attach tickets, QA, tests, approval, incidents and deployment evidence; deliver; record measured outcome; publish, rotate and revoke. Assert junction rows, revisions, audit records, idempotency, conflicts and cross-product/cross-tenant denial.

### MP-11 — HTTP authorization verification

Re-run the five server-listening managed-product RBAC tests where loopback sockets are permitted. In this audit they were blocked by `connect EACCES 127.0.0.1`, so they remain unverified rather than failed product behavior.

### MP-12 — Exact-revision operational proof

For the same revision being released, confirm migration head, frontend/backend/schema parity, large-data query plans, concurrent membership/primary-link/release/publication writes, rollback, monitoring and public-token revocation behavior.

### MP-13 — WOW reasons 71–76 demonstration

Record one authorized persisted drill-down for feedback traceability, customer impact, explainable scoring, durable opportunity history, public roadmap and measured outcomes. Customer value, adoption and competitor-superiority claims require current customer and market evidence in addition to code.

## Verified as implemented

- managed-product CRUD, archive/restore/delete impact handling and bulk reach filtering;
- centralized managed-product reach and restricted membership;
- many-to-many product/project junction projections;
- directory filters, contains search, grid/table modes, paging, facets and actions;
- Overview metrics, updates and cross-surface links;
- product feedback capture, classification, deduplication, routing and product scoping;
- discovery opportunities, evidence, scoring, override, comparison, accept/decline and trace;
- Insights filters, trend, evidence themes, outcome reviews and export;
- goals tree/list/table and product linkage;
- product projects list, filters, linking, unlinking and primary project;
- roadmap board/list/timeline, filters, detail pane, preview and publication controls;
- releases timeline, revision conflicts, owner, QA, deployment URL, canonical project release and evidence detail;
- Settings tabs, member protection, linked projects, feedback channels and publication;
- hashed/expiring/revocable public tokens and active-product enforcement;
- return context for major feedback, roadmap and ticket handoffs.

## Verification snapshot

- Frontend managed-product scope: 65 suites and 722 tests passed, with the warnings recorded in MP-05.
- Backend managed-product and product-boundary scope: 28 suites and 407 tests passed.
- One backend HTTP authorization suite had five environment-blocked tests because loopback connections were denied.
- No authenticated browser, persisted end-to-end database or deployed-environment verification was completed.

Manage Product can be called complete when MP-01 through MP-13 are closed against the same code and schema revision.

## Resolution status — 2026-10-12

Source and focused-test tier only. No browser, persisted-database or deployed
evidence was produced, so MP-09 through MP-13 are untouched by this pass.

| Item | Status |
|---|---|
| MP-01 | Closed. Live-link contract chosen and recorded in [BLD-02D](../acceptance/module/02d-scope-public-page-contracts-prd.md); preview sheet repointed from the organization publication to the product share token; `getPreview` now applies the public page's own active/not-deleted predicate. |
| MP-02 | Closed for every surface the audit named, plus the release form's two selectors. Each failed read renders a distinct error with a retry that leaves the dialog open. |
| MP-03 | **Closed.** Both server-side limits are gone — see the 2026-10-13 pass below. `GET /goals` now accepts a keyset `cursor` alongside its offset mode, and the managed-product releases endpoint accepts `search`. Every selector the item names now has server search *and* cursor continuation. |
| MP-04 | Closed. `useCopyFeedback` owns the copy timer; the roadmap initiative pane's focus restore now cancels on unmount and refuses a detached element. |
| MP-05 | Closed. Dialog descriptions added and the interaction tests wait on the transitions users see; the focused suites run warning-free. |
| MP-06 | Closed. One shared published-state component shows issued time and expiry and offers "Rotate and copy new link". It deliberately shows no version: the token is hashed, so `publicationVersion` is a rotation counter and not a projection identity. |
| MP-07 | Closed. Linked-project and project-release reads have error and retry; both selectors search server-side and page by cursor; tickets, test runs, incidents and approval link to their owning records and carry return context back to the product release; inaccessible evidence is withheld with its real count rather than a zero. |
| MP-08 | Closed for the five listed proofs. Widget update/delete/rotate-key denial, settings paging 1→2→3→2→1, selector continuation past page 1, per-surface error and retry, and publication preview/link/revoke against the MP-01 contract all have tests. |
| MP-09 | Open — browser acceptance. Not closeable from a test runner. |
| MP-10 | **Closed 2026-10-13.** Two db specs, 26 tests, driven through the real services against a local Postgres restored to production schema head with RLS live. See the pass below. |
| MP-11 | **Closed 2026-10-13.** The suite ran: 118 of 118 passed against a listening server on loopback. The "five blocked tests" framing was wrong — it is one 118-test suite, and the blocker was never the tests. See the pass below. |
| MP-12 | Partially closed 2026-10-13 — migration head, ledger parity, rollback coverage, concurrency and token revocation are proven; monitoring and an executed rollback drill are not. See the pass below. |
| MP-13 | Partially closed 2026-10-13 — the six persisted drill-downs are now evidenced by the MP-10 specs. The customer-value, adoption and competitor claims still need market evidence, which code cannot supply. |

Three defects outside the original list were found and fixed while closing the
above, each one a disclosure rather than a cosmetic: `GET /build/{projectId}`
shipped `projects.intake_token` — a public write capability — plus every
member's hourly rate to any holder of `build:view`; the organization roadmap
served and accepted anonymous writes for an unpublished board whenever the URL
handle happened to equal the organization id; and the shared-board RLS policy
compared a hashed column against a raw token, so its public-token arm could
never match.

## Follow-up pass — 2026-10-12, later

Four more defects, found while closing BLD-02D and regenerating the contracts.
None was on any list; each was reachable in production.

| Defect | Why it mattered |
|---|---|
| `useRoadmapPreview` parsed `/build/managed-products/:id/roadmap-preview` with `publicRoadmapGetRoadmapResponseSchema`, the schema of a different operation | The preview declares `horizon` nullable and the public board does not, so one initiative with no horizon threw inside the contract and took the whole preview sheet down. The vendored `openapi.json` had been stale long enough to hide it; regenerating it is what surfaced the mismatch. |
| Neither public KB wiki GET set `X-Robots-Tag` | A shared wiki page was indexable, and revoking a share never reaches a crawler's stored copy. |
| The KB attachment broker declared no cache policy while redirecting to a URL signed for 300s | A stored 302 outlives its own signature, so the cached redirect serves a dead link. |
| The projectId intake address was a working anonymous write endpoint for every project | Migration 1300 published every existing project, so a small integer was a live submit address. Retired — see the decision in [BLD-02D](../acceptance/module/02d-scope-public-page-contracts-prd.md). |

Six endpoints were removed as unreachable or duplicated: the three
`/kb/wiki/analytics/*` routes on a controller no module registers, the
`/build/:projectId/export/tickets` alias of the canonical import-export path,
and the two `BuildStandingController` reads whose page was deleted and whose
`getMemberStanding` answered a `:userId` query with the caller's own role and a
hard-coded zero. `TimeEntriesController` and `BillingSummaryController` were
deliberately kept: they have no caller but are a complete feature behind real
service logic, which is unwired rather than dead.

`check:contract-parity` remains red, and was red before this pass — the same 12
nullability findings, 8 db-column findings and 66 stale baseline entries
reproduce against the previously committed `openapi.json`. The 12 are the
checker flattening a union whose persisted branch does accept null; the 8 are
`roadmapPublicTokenHash` and its expiry, which must not appear in any response.
Neither was baselined, because a gate is not fixed by recording its output.

## Third pass — 2026-10-13

This pass closed MP-03's two residuals, MP-10 and MP-11, and took MP-12 and
MP-13 as far as code and a database can take them. It also caused, found and
fixed a production outage; that is recorded here rather than left out.

### MP-03 — the two server-side limits are gone

`GET /goals` accepted only offset paging, so the Link-Existing-Goal and
Accept-Opportunity selectors accumulated offset pages into one list and could
duplicate or skip a goal when rows were inserted mid-scroll. It now also accepts
a keyset `cursor`. Both modes coexist deliberately: `baseListQuerySchema`
already carries `page` and `cursor` together, the goals table needs `total` for
numbered pagination, and the selectors need a cursor. `nextCursor` and `hasMore`
are computed in both modes by reading `limit + 1` rows, so nothing is faked. The
ORDER BY gained `id` as a tiebreaker in both modes, because a cursor over a
non-unique sort key is unsound.

The managed-product releases endpoint gained `search`, matched server-side over
`name` and `version` with the module's existing `strpos(lower(...))` predicate
rather than a leading-wildcard ILIKE (BE-49). It is pushed into the shared
condition list, so a filtered page 2 is still a continuation of page 1.

19 keyset tests and 35 release tests, red first. The frontend consumes both:
`useLinkGoalCandidates` moved from offset to cursor, the release selector got a
300 ms debounced search, and the Accept-Opportunity goal selector moved off a
single bounded page onto the infinite selector.

### MP-10 — persisted lifecycle, closed

`managed-product-lifecycle.db.spec.ts` and
`managed-product-publication-lifecycle.db.spec.ts`: 2 suites, 26 tests, against a
local Postgres restored from a production schema dump and brought to journal
head, with RLS live and the app role proven non-superuser.

Proven: one project linked to two products yields two junction rows and
unlinking one leaves the other; a duplicate member add is a `ConflictException`;
`record_revision` increments and a stale-revision update matches no rows, so the
optimistic lock is enforced in the database and not merely in the service;
feedback classification and `duplicate_of_id` deduplication; RICE scoring with a
stale-version conflict and an override bumping to version 2; acceptance creating
a roadmap item; delivery retaining the canonical project-release link; an outcome
review moving a delivered opportunity to `measured`; `token_hash` storing a
SHA-256 digest and never the plaintext; rotate invalidating the old token;
revoke making every token for a product unresolvable. Every cross-tenant denial
carries a same-spec positive control, so a blanket failure cannot pass as
isolation.

### MP-11 — HTTP authorization, closed

The audit recorded "five server-listening managed-product RBAC tests ... blocked
by `connect EACCES 127.0.0.1`". Two parts of that were wrong. It is one suite of
**118** tests, and loopback was not the real obstacle. The suite now passes
118/118.

Three things actually blocked it, each a finding in its own right:

1. The seeded harness refuses any database whose ledger does not match the
   journal hash for hash. Exactly one entry diverged:
   `1988_managed_product_share_tokens` had been **edited after it was applied**,
   so the file no longer hashed to its ledger row. The appended block armed RLS
   and granted to `streamline_app` — a verbatim duplicate of what `1990` already
   does, which `1993` then corrects to the hashed `token_hash` column. The live
   catalog confirms production already has the correct policy. Restoring the
   applied bytes therefore lost nothing and made `check:migration-immutability`
   green again.
2. `RouteClassifierGuard` refused to boot (see below).
3. The database had to be built. Production is the only thing at head, so a
   read-only `pg_dump --schema-only` plus the ledger was restored locally.

### MP-12 — what is proven and what is not

Proven at this revision: **migration head** — production is at head on every
managed-product migration, the only pending entries being another session's
calendar migrations; **ledger parity** — measured hash by hash, one divergence,
repaired as above; **rollback coverage** — `check:migration-rollback` was red on
`1981` and `1982` and is now green, with both rollbacks authored (1981's is
deliberately wider than its forward migration and says so, because the backfill
recorded nothing about which rows it touched, and re-running the idempotent
forward migration restores anything the rollback clears); **concurrency** — the
release optimistic lock is enforced at the database level, proven by a
stale-revision update matching zero rows; **public-token revocation** — proven
in the MP-10 publication spec.

Measured, not assumed: the managed-products list over **50,000 rows in one
tenant**, as `streamline_app` with the tenant GUC set, in buffers (BE-76/77).
The first page costs **17 buffers** for 21 rows via
`idx_managed_products_org_created_id`, with no sort node and the RLS qual folded
to a one-time filter rather than evaluated per row.

One honest negative: a **deep** keyset page costs 269 buffers, because
`(created_at, id) < (…)` is applied as a Filter and never becomes an index
condition — the index is mixed-direction (`org_id ASC, created_at DESC, id
DESC`), and Postgres will not turn a row comparison into an index qual across
mixed directions. Rewriting the tuple to lead with `org_id` makes it worse (927
buffers). So keyset pages are index-ordered and sort-free, but walking to page N
costs O(N). This is a property of every keyset list in the repository, not of
this change, and it is recorded rather than fixed.

Not closeable here: monitoring, and an actually-executed rollback drill
(`check:migration-rollback` states plainly that it never executes one).

### The outage this pass caused, and fixed

Push `61c0a7169..d47a64848` carried a peer commit,
`d47a64848 feat(attendance): …`, which added three public calendar controllers
whose nine routes carried no exposure declaration. `RouteClassifierGuard`
enforces by default — `REQUIRE_ROUTE_CLASSIFICATION` is unset in both env files
and absence enforces — so every deploy of `main` died in
`onApplicationBootstrap` with "9 route(s) carry no exposure declaration".

The code was not authored in this pass, but it was **shipped** in this pass, by a
push that never checked that the application boots. `check:route-classification`
takes seconds and prints all nine.

Fixed in `155cf5a79`: each class is mounted under `public/calendar`, takes no
`@CurrentUser()`, resolves its caller from a `:token` in the service and already
carries `@UseRateLimit`, `@Validate` and `@ResponseSchema` — the shape
`PublicController` declares with one class-level `@Public()`, so they got the
same. The gate reports 0 undeclared and the application boots, proven by the
118-test suite above, which boots the real `AppModule`.

The lesson is narrow and worth keeping: **a push is a deploy**, so the gate that
decides whether the process starts belongs before the push, not after it.
