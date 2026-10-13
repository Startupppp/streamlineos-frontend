# Managed Product pending work

Status: **browser acceptance remains** as of 2026-10-13.
The publication viewer gate and the stable publication-controls object are
done. This file contains only work that is still open. Completed source,
database, HTTP authorization and browser checks live in the
[consolidated audit](./managed-product-final-consolidated-audit-2026-10-12.md)
and [MP-09 browser evidence](./evidence/mp09-browser-acceptance-2026-10-13.md).

## Browser acceptance — MP-09

The responsive smoke pass, overview filters, missing-product Settings state and
375 px mobile overlay clearance are complete. The following evidence remains:

- Triage the 12 failures in
  `frontend/e2e-intercepted/managed-products-states.spec.ts`. Correct invalid
  fixtures and assertions first; classify a failure as a product defect only
  after its mocked response satisfies the current response contract.
- Complete all nine real authenticated routes at 375, 768 and 1280 px for
  populated, empty, filtered-empty, loading, error with working retry, denied,
  not-found and offline/recovery states.
- Prove denial in the browser with a real restricted product member, a caller
  without the required product/roadmap/feedback permission, and a caller from a
  different tenant. The intercepted `/me/access` stub proves presentation only;
  MP-11 proves HTTP authorization separately.
- Run keyboard-only traversal on the authenticated routes: visible focus,
  dialogs/sheets/menus/comboboxes trapping focus where required, Escape/Cancel
  focus return, and mobile full-screen dialog behavior. The three passing
  keyboard tests currently exercise only the design-system gallery.
- Prove return context and navigation: `?ret=` focus and scroll restoration,
  deep-link refresh, Back/Forward, modifier-click behavior and organization
  switching.
- Prove three-page pagination and cursor stability: 1 → 2 → 3 → 2 → 1,
  filter round-trips, selector continuation beyond page one, and no duplicate
  or missing rows.
- Prove dirty-form navigation and failed-mutation retention, including duplicate
  submission protection, validation errors and stale-revision recovery.
- Drive representative persisted mutations through the browser and confirm the
  saved result after refresh. Stubbed API responses are not persistence proof.
- Prove public roadmap preview/publication plus expired, rotated and revoked
  token behavior in the browser.
- Record role, tenant, starting fixture, action, URL, visible result, network and
  console result, refresh result and screenshot for every claimed cell.

## Non-browser evidence — MP-13

The six WOW workflows are implemented and have database/API evidence. Claims of
superior usability, customer value, adoption, willingness to pay or competitive
advantage remain hypotheses until the customer study and same-scope Productboard
and Canny comparison in
[MP-13 WOW evidence](./evidence/mp13-wow-evidence-2026-10-13.md) are executed.

## Operational limitation

MP-12's monitoring definitions and local firing/recovery proofs are complete.
The repository still has no wired paging destination, and the alert proof was
not executed against the deployed revision. Keep this limitation explicit in a
release decision; do not describe the local proof as production paging proof.
