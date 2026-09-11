import { createHash } from "node:crypto";
import { NAV_GROUPS, type NavRoute } from "./sidebar-nav-items";

// Moved 2026-08-25 by the CRM import/export route ("Import & export",
// /crm/import, gated on party:parties:view because export is ungated by design).
// Moved 2026-08-24 by the CRM autonomy review route ("What the system did",
// /crm/autonomy, gated on crm:autonomy:view). The digest exists so a route or
// its permission cannot change without somebody saying why.
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
const EXPECTED_NAVIGATION_INVENTORY_DIGEST =
  "a0eb7b1062d42968b4a821cc878fbebb94b8df1825fe872f263c5c75eb6bc7a2";

function serializeNavigationRoute(route: NavRoute): unknown {
  return {
    label: route.label,
    href: route.href,
    badge: route.badge,
    requiredPermission: route.requiredPermission,
    module: route.module,
    modulesAny: route.modulesAny,
    exact: route.exact,
    activePrefixes: route.activePrefixes,
    inactivePrefixes: route.inactivePrefixes,
    children: route.children?.map(serializeNavigationRoute),
  };
}

describe("sidebar navigation inventory", () => {
  it("preserves the ordered route and access graph across configuration files", () => {
    const navigationInventory = NAV_GROUPS.map((group) => ({
      label: group.label,
      defaultCollapsed: group.defaultCollapsed,
      requiredPermission: group.requiredPermission,
      product: group.product,
      module: group.module,
      routes: group.routes.map(serializeNavigationRoute),
    }));
    const inventoryDigest = createHash("sha256")
      .update(JSON.stringify(navigationInventory))
      .digest("hex");

    expect(inventoryDigest).toBe(EXPECTED_NAVIGATION_INVENTORY_DIGEST);
  });
});
