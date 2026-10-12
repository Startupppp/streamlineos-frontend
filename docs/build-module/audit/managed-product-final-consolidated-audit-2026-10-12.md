# Manage Product final consolidated code audit — 2026-10-12

## Scope

Current-code audit of the product-owned Build surfaces only: product directory, overview, feedback, insights and discovery, goals, linked projects, roadmap, releases, settings, public product roadmap, and WOW reasons 71–76. Inventory and unrelated modules are excluded except where a product workflow crosses a boundary such as Feedbucket, goals, projects, releases, tickets, approvals, tests or incidents.

Markdown completion markings were ignored. Documentation was used only as the expected behavior contract. Completion decisions come from the current source and executable checks.

## Final decision

Manage Product is substantially implemented but not complete. There are eight remaining source-visible work packages and five evidence gates. This list supersedes every earlier Manage Product audit list.

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
| MP-03 | Closed except two server-side limits: `GET /goals` pages by offset, not cursor, so goal selectors got server search and page continuation but no cursor; the managed-product releases endpoint exposes no search parameter, so that selector got cursor continuation only. |
| MP-04 | Closed. `useCopyFeedback` owns the copy timer; the roadmap initiative pane's focus restore now cancels on unmount and refuses a detached element. |
| MP-05 | Closed. Dialog descriptions added and the interaction tests wait on the transitions users see; the focused suites run warning-free. |
| MP-06 | Closed. One shared published-state component shows issued time and expiry and offers "Rotate and copy new link". It deliberately shows no version: the token is hashed, so `publicationVersion` is a rotation counter and not a projection identity. |
| MP-07 | Closed. Linked-project and project-release reads have error and retry; both selectors search server-side and page by cursor; tickets, test runs, incidents and approval link to their owning records and carry return context back to the product release; inaccessible evidence is withheld with its real count rather than a zero. |
| MP-08 | Closed for the five listed proofs. Widget update/delete/rotate-key denial, settings paging 1→2→3→2→1, selector continuation past page 1, per-surface error and retry, and publication preview/link/revoke against the MP-01 contract all have tests. |
| MP-09 | Open — browser acceptance. Not closeable from a test runner. |
| MP-10 | Open — and blocked on data, not code: production holds no managed products, so this must seed the whole lifecycle. |
| MP-11 | Open — deliberately not run. Those five tests are `*.seeded-e2e-spec.ts`; that tier has previously written to production and sent real email. |
| MP-12 | Open — operational proof for one released revision. |
| MP-13 | Open — needs customer and market evidence, which code cannot supply. |

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
