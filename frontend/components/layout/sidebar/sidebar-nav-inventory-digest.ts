/**
 * The digest `sidebar-nav-inventory.test.ts` expects of the ordered sidebar
 * route and access graph, and the record of every time it moved.
 *
 * The notes sit beside the constant they explain, not in the test, which only
 * says what is hashed. When the digest moves on purpose, recompute it here and
 * add a note saying which route or permission changed and why.
 */
// Moved 2026-09-12 by the origin/main merge into the inventory integration
// lane (3cf6d3a8e). No inventory or CRM route or permission changed; the graph
// moved because main's navigation work landed beside them:
//   * Accounting > Settings gained "Automations"
//     (/accounting/settings/automations, on settings:automations:view), a page
//     the merged tree serves.
//   * The Support group asks for support:tickets:view and its dashboard for
//     dashboard:support:view, where both had borrowed build:tickets:view.
//   * The Git integration entry moved off settings:manage onto
//     integrations:git:view.
//   * The Workflows group now names module "workflows", and Variables, Secrets
//     and Access moved to /workflows/settings/* (module configuration lives in
//     /<module>/settings/*).
//   * Chat's inactivePrefixes no longer lists /chat/moderation.
// Moved 2026-09-05 by T09: two inventory navigation changes, both of them the
// nav half of a URL that answered 404.
//   * The Reports parent moved from /inventory/reports/stock-summary to
//     /inventory/reports. It had been aliasing its own first child because the
//     segment above them had no page at all, so clicking the group and clicking
//     Stock Summary were the same destination and nobody ever met the hole; a
//     reader who typed the obvious URL, or bookmarked the group, did.
//     /inventory/reports is now a hub that derives its seven cards from these
//     very children, so the group lands on the group and the hub cannot drift
//     from the nav that describes it.
//   * Operations gained one child, "Pick lists" (/inventory/operations/picking,
//     gated on inventory:sales-orders:read — the key the wave workbench itself
//     asks for, not the Operations parent's purchase-orders/sales-orders pair).
//     `inventory.md:1358` says "Do not 404 /inventory/pick-lists if you keep
//     picking under operations — then make operations picking the pick-list
//     surface and say so in nav." Picking is kept under operations, so
//     /inventory/pick-lists is now a redirect to the workbench, and this entry
//     is the "say so in nav" half: before it, the word "pick" appeared nowhere
//     in the inventory sidebar and the only route that said it was a 404.
// Changed 2026-08-31 by the origin/main merge: 266 commits of navigation work
// landed alongside this branch — route-access management (`enforce-route-access`),
// My Payroll repointed at the canonical /me/pay with its vacuous gate dropped,
// two authenticated pages that denied everyone repaired, and the module manifest
// becoming schema-validated JSON. The inventory routes themselves are unchanged;
// the digest moves because the graph it hashes is the whole sidebar.
// Moved 2026-08-29 by B10: the throughput/SLA dashboard got its nav entry
// ("Operations SLA", /inventory/reports/throughput, on inventory:reports:read).
// Moved 2026-08-29 by C2/C5/C7: the Planning group and its Replenishment child
// shared an href but asked for `inventory:reports:read` while that page asks for
// `inventory:replenishment:read` — so a reports-only reader saw the entry and
// landed on NoPermissionState. Both now ask for what the page asks for. A parent
// nobody may open is not a dead end: `filterRoute` promotes its accessible
// children, so that reader still reaches Forecasting, Valuation, Costing and
// Reconciliation. Two routes that had pages and no way to reach them joined the
// group: "Transfer recommendations" (/inventory/replenishment/transfers) and
// "Forecast drift" (/inventory/replenishment/drift), both on
// inventory:replenishment:read.
// Moved 2026-08-29 by G1: the inventory audit trail got its first read surface
// ("Audit Trail", /inventory/reports/audit-trail, gated on inventory:audit:read
// — a key of its own, because inventory:audit:export is the right to take a
// checksummed evidence bundle away, not the right to look at the trail).
// Moved 2026-08-29 by A6: nine inventory routes were gated on a key their page
// does not use. Dashboard now accepts inventory:stock:read OR inventory:reports:read
// (it serves a stock-safe subset instead of the onboarding empty state); Operations
// accepts purchase-orders:read OR sales-orders:read; Packages, Loads and 3PL moved off
// inventory:shipments:manage onto their own manage keys; Valuation and Costing moved off
// inventory:reports:read onto inventory:valuation:read; Import moved off
// inventory:products:read onto inventory:import.
// Changed 2026-08-31: CRM "API Keys" moved from /crm/api-keys to
// /crm/settings/api-keys (§8 — module-owned surfaces live in /<module>/settings/*),
// and the Knowledge group lost module: "documents" so KB reading stays universal.
// Moved 2026-08-30: /me/pay removed from PAYROLL_NAV_GROUPS — self-service pay
// belongs exclusively in HOME_NAV_GROUPS "For Me" group (product: home). The
// payroll product sidebar no longer lists it; the home sidebar already did.
// Moved 2026-08-27 (c25-03): 55 finance gates, plus /crm/deals/approvals and
// /hr/goals, named keys no route enforces — each now names the key its own
// endpoints check. `pnpm -C backend check:navigation-permissions` proves it.
// Moved 2026-09-01 by the HR dashboard route ("Dashboard", /hr/dashboard,
// gated on hr:analytics:read to match the page's own requirePermission call —
// not hr:employees:view, which would show it to people the page then denies).
// Moved 2026-08-25 by the CRM import/export route ("Import & export",
// /crm/import, gated on party:parties:view because export is ungated by design).
// Moved 2026-08-24 by the CRM autonomy review route ("What the system did",
// /crm/autonomy, gated on crm:autonomy:view). The digest exists so a route or
// its permission cannot change without somebody saying why.
// Moved 2026-08-29 by F3/F6: the inventory AI surfaces got their first nav entry
// ("AI", /inventory/ai, gated on inventory:ai:read). Before it, the copilot was
// written, tested and mounted on no route at all — a page nobody can navigate to
// has not shipped — and the anomaly queue and demand-risk narrative would have
// landed in the same state. The gate is the surfaces' own key rather than
// inventory:stock:read, because that is what the pages behind it require and a
// parent asking for less shows the entry to people who then hit
// NoPermissionState.
// Moved 2026-08-30 by NEO-2/NEO-3, NEO-4 and NEO-5: three inventory routes got
// their first nav entries. "Quick commerce" (/inventory/quick-commerce, gated on
// inventory:channels:manage) is where platform purchase orders from Blinkit,
// Instamart and Zepto arrive and where fill rate is read. "Handling units"
// (/inventory/handling-units, on inventory:stock:read) is the pallet, cage or
// tote stock now stands on. "My tasks (RF)" (/inventory/rf, on
// inventory:stock:read) is the one-task-at-a-time operator surface; it is gated
// on the read key rather than on a write key because the queue itself is a read,
// and each runner behind it re-gates on the key its own command needs.
// Moved 2026-08-30 by NEO-6 and NEO-7: two more inventory routes got nav
// entries. "Slotting" (/inventory/slotting, on inventory:warehouses:read) is
// where the rules that decide which zone a SKU lives in are read, alongside the
// nightly re-slot recommendations. "Labour" (/inventory/labor) is gated on
// inventory:labor:read — its own key rather than inventory:reports:read, because
// that screen names individual people and rates their work, which is an
// authority an organisation should grant deliberately rather than one that
// arrives with the ability to read a stock summary.
// Moved 2026-08-30 by NEO-9, NEO-11 and NEO-12: three more inventory routes got
// nav entries. "Kits" (/inventory/kits, on inventory:products:read) is a kit's
// bill of materials and the build command; the assemble action behind it re-gates
// on inventory:kits:assemble, because building consumes components and creates a
// SKU that did not exist a moment ago. "Consignment" (/inventory/consignment, on
// inventory:stock:read) lists stock standing in the building that belongs to
// somebody else; taking title re-gates on inventory:stock:adjust. "Dock"
// (/inventory/dock) is gated on inventory:dock:manage — booking vehicles in is a
// receiving clerk's job rather than the person who configures the site.
// Moved 2026-09-01 by B1/B2 (materials pack): two inventory routes were added.
// "Dark Stores" (/inventory/dark-stores, on inventory:stock:read) is the zone
// board — what each Hyderabad facility holds and what it owes; it reads stock
// levels, so it asks for the key the stock pages ask for. "Projects"
// (/inventory/projects, on inventory:projects:read) is construction sites and the
// material each still needs. Projects has a key of its own rather than reusing
// stock-read, because a site engineer who raises requirements is not necessarily
// somebody who may see every bin in the network — and reserving stock against a
// line is a third key again (inventory:stock:reserve), since holding material is
// a claim on the warehouse.
// Changed 2026-09-01 by the origin/main merge: main added the HR "Dashboard"
// route (/hr/dashboard, on hr:analytics:read) to HR_FOUNDATION_ROUTES while this
// branch was adding the inventory entries below. Both sides are in the graph, so
// neither side's digest describes it and the merge cannot inherit one of them --
// this is the hash of the merged graph, recomputed and re-read, not copied across.
// Moved 2026-09-09 by the reachability audit: two inventory routes were mounted
// on the backend, called from nowhere in this repo, and therefore did not exist
// for a user. "In Transit" (/inventory/stock/transit, on inventory:stock:read)
// is the queue of goods a dispatch put on the road and of what a short receipt
// left stranded on a transit bin -- stock that is on hand, unsellable and, until
// the exit command was reachable, had no route out of the waypoint at all. It is
// gated on the read key rather than on inventory:transit:abandon because the
// queue is a read and a supervisor who cannot see it cannot decide anything
// about it; the Resolve action re-gates on the abandon key. "GL Reconciliation"
// (/inventory/reconciliation/gl, on inventory:reports:read) is the report that
// names a movement which produced no journal entry -- the only surface in the
// module that can say money did not follow stock. It sits beside Stock
// Reconciliation but asks for a different key, because that page compares the
// projection against the ledger and this one compares the ledger against the
// journals.
// Moved 2026-09-09 by the same audit, second pass: "Landed Cost"
// (/inventory/landed-cost, on inventory:valuation:read). Six routes, a
// permission key of its own and a backfill migration existed for it, and no way
// in the product to raise a voucher -- so freight and duty never reached a cost
// layer and margin was computed off the goods price alone. The nav entry asks
// for the READ key beside Valuation and Costing; raising and applying a voucher
// re-gate on inventory:landed-cost:manage inside the page, because applying one
// restates what inventory is worth and posts to the ledger.
// Moved 2026-09-10 by the route census: "Allocation Overrides"
// (/inventory/reports/allocation-overrides, on inventory:audit:read) —
// `GET /inventory/traceability/allocation-overrides` is the only record that a
// near-expiry or minimum-shelf-life policy was overruled on a specific lot, for
// a named client, by a named person, with a stated reason, and it had no caller
// in this repo. A control that runs and is never reviewed is a control in name
// only, so the override log was being written for nobody. It sits beside Audit
// Trail and asks for the same key: the register names individuals and the
// judgements they made, which is the authority inventory:audit:read exists to
// grant, and not something that should arrive with the ability to read a stock
// summary. It is not gated on inventory:reports:read like its six siblings for
// the same reason Audit Trail is not.
/**
 * Updated 2026-08-26, for two changes that both belong in the graph:
 *
 *  - **Record Layouts** joined CRM settings (ticket 20's per-tenant layouts).
 *  - Its `requiredPermission` was `settings:manage` -- a platform-wide key on a
 *    CRM page, where every sibling uses a `crm:` one -- while the page itself
 *    gates on `crm:settings:view`. The nav therefore hid the entry from people
 *    the page would have admitted, and offered it to people it would refuse.
 *    Aligned to the page.
 *
 * Updated 2026-08-27, for the same class of mismatch one row further down:
 * "What customers owe us" (/accounting/aged-receivables) was gated in the nav on
 * `accounting:reports:read` while the page calls
 * `requirePermission("accounting:receivables:read")`. Anyone holding reports but
 * not receivables was shown a link that answered 403. Aligned to the page, which
 * narrows what is displayed rather than widening what is reachable.
 *
 * Updated 2026-08-30, for two destinations that had a backend and no way in:
 *
 *  - **Commissions** (/crm/commissions), gated on `crm:commission-earnings:view`.
 *    A rep's destination as much as a manager's — every CRM member holds that key
 *    for their own rows, and the server narrows to the caller's scope rather than
 *    the nav hiding it.
 *  - **Call intelligence** (/crm/intelligence), gated on
 *    `crm:call-analysis:view-team`, which stops at the two admin rungs. A rep
 *    reads their own calls' analyses on the calls themselves, not here.
 *
 * Both match what their page gates on, which is the mismatch the three notes
 * above are all about. `modules/commission/` and `modules/calls/` had been
 * registered in `app.module.ts` with permission-guarded controllers and no route,
 * no hook and no permission key, so neither was reachable by anything.
 */
/*
 * Recomputed for the merge with main, which brings its own navigation entries
 * alongside the two above. The digest is a tripwire for an unnoticed change to
 * what the sidebar offers, not a claim that the list is final — it moves when
 * the list is meant to, and this is one of those times.
 */
/*
 * Updated 2026-09-09 for one destination that had a backend and no way in.
 *
 * **Query builder** (/crm/reports/builder), gated on `crm:reporting:run`. The
 * `crm/reporting` compiler shipped with zero frontend callers, so the endpoint
 * that lets somebody ask a question they thought of themselves could not be
 * reached at all. It sits under Reports but carries its own key deliberately:
 * `crm:reporting:*` and `crm:reports:*` are two different features whose names
 * read alike, and gating the child on the parent's key would hide the builder
 * from exactly the people the backend grants it to.
 */
/*
 * Updated 2026-09-09 again, for the same class of gap one row further down.
 *
 * **Nurture sequences** (/crm/autonomy/nurture), a child of "What the system
 * did", gated on `crm:autonomy:view`. The nurture engine landed with nine
 * permission-guarded routes and no frontend caller at all, so a tenant could
 * neither author a cadence nor see who was in one. It carries its PARENT's key
 * rather than one of its own, which is the opposite of the query-builder note
 * above and deliberate for the opposite reason: `NurtureSequencesController`
 * declares `crm:autonomy:view` and `crm:autonomy:manage` on every handler, and
 * a key of its own would need a catalogue entry in both repos plus a backfill
 * for every organisation that already exists.
 *
 * Updated 2026-09-10, for a route that landed without answering this tripwire.
 *
 * **Duplicates** (/parties/duplicates), a child of Parties, gated on
 * `party:duplicates:view`. Added by `a15bd4a66` ("the merge UI onto the
 * mechanism that can be undone"); the digest was not recomputed with it, so
 * this test has been red ever since — which is the tripwire working, not
 * failing. Recording it here rather than just recomputing the hash, because a
 * digest updated without a reason is the same as no digest.
 *
 * Checked before accepting it, since three of the notes above are about exactly
 * this and it is the only thing worth checking here: the nav key and the page
 * agree. `app/(authenticated)/parties/duplicates/page.tsx:5` calls
 * `requirePermission("party:duplicates:view")` — the same key, not a broader
 * one — and the key has a catalogue entry in BOTH repos
 * (`lib/rbac/permissions/party.ts:11` and the backend's `permissions/party.ts:47`),
 * so `useCan` can answer it and the gate is real on both sides.
 *
 * Updated 2026-09-10 again, for three gates that named keys NO ROUTE ENFORCES —
 * the inverse of the mismatches above, and caught by
 * `pnpm check:navigation-permissions` rather than by reading.
 *
 *  - The group and **Overview** (/accounting) gated on `accounting:view`.
 *    Nothing enforces it: `AccountingHubClient` reads `accounting:read`, and 14
 *    routes require that. (`accounting:view` is still a real catalogue key,
 *    granted by a role template and used by billing's own DashboardGate — it is
 *    simply not what this destination checks.)
 *  - **Debit notes** (/accounting/vendor-credits) gated on
 *    `accounting:vendor-credits:read`. That page renders `ApDocumentsPage`,
 *    which reads `useCan("accounting:payables:read")` and fetches AP documents,
 *    whose routes all require that same key. The ONLY vendor-credit route in
 *    the backend is a POST on `:manage`, so `:read` is enforced nowhere.
 *
 * That last one was wrong in both directions at once: it offered the link to
 * somebody holding a key the page would refuse, and hid it from somebody
 * holding the key the page actually wants. All three now name what their
 * destination checks.
 */
/*
 * Updated 2026-09-10, for a destination that had a backend and no way in.
 *
 * **Overdue** (/timesheets/overdue), gated on `timesheets:approvals:view`,
 * matching `PeriodsController`'s own `@RequirePermission` on the endpoint the
 * page reads. `GET /timesheets/periods/overdue` shipped with no caller: the
 * submission grace and reminder thresholds were read by the nightly sweep to
 * decide whom to email and by nothing else, so the only person who ever learned
 * a timesheet was late was the person who owed it. It carries the approvals key
 * rather than one of its own for the same reason the nurture note above does —
 * the backend already declares that key, and a new one would need a catalogue
 * entry in both repos plus a backfill for every organisation that exists.
 *
 * It sits above Exceptions rather than below: both are queues an approver works,
 * and the overdue one is upstream — a period that was never submitted cannot
 * have produced an exception yet.
 */
/*
 * Carried in by the 2026-09-11 origin/main merge. Main kept its notes in the
 * test, which this branch had emptied into this file, so they move here with
 * the routes they describe:
 *
 * Moved 2026-09-02: the Support group and its /support + /support/inbox routes
 * were gated on build:tickets:view, a Build key on Support routes, so the links
 * tracked Build access instead of Support access. Repointed to
 * dashboard:support:view and support:tickets:view to match what those pages read.
 * Moved 2026-09-03: the Build "Settings" route (/build/settings/integrations)
 * and the Build group's admission list were gated on settings:manage, a global
 * key, for a surface Build owns. The four git-connection routes moved to
 * /integrations/git/connections behind integrations:git:view|manage, and
 * MODULE_ADMIN_EXTRA_KEYS.build now grants that pair, so a BUILD_MODULE_ADMIN
 * holds the key but could not see the link. Repointed to integrations:git:view.
 * Strictly widening: OWNER and ORG_ADMIN are ALL_PERMISSION_NAMES and no role
 * template carries settings:manage, so nobody who saw the item loses it.
 * Moved 2026-09-03: the Finance "Settings" group gained an "Automations" child
 * (/accounting/settings/automations, settings:automations:view). The page
 * existed and was linked from the accounting settings tab strip, but navigation
 * had no entry for it, so route-access resolved it by the longest matching nav
 * prefix (/accounting/settings) and gated it on accounting:settings:read — a
 * different key from the settings:automations:view the backend routes enforce,
 * which is how a finance admin reached a page whose every request then 403s.
 * This is the same shape as the /support sibling, which navigation already
 * gates on settings:automations:view. Strictly narrowing for the page and
 * additive for the sidebar: only OWNER/ORG_ADMIN hold settings:automations:view
 * (ALL_PERMISSION_NAMES; no role template carries it), and they already saw the
 * Finance Settings group.
 * Updated 2026-09-06: Workflows nav group gained module: "workflows" (nav gate
 * fix) and Variables/Secrets/Access routes moved to /workflows/settings/*
 * (route-conformance §8).
 */
export const EXPECTED_NAVIGATION_INVENTORY_DIGEST =
  "ca94134d34f0545cfc42f0fbf591a6cabb660073caecae0f04a365a9165c42db";
