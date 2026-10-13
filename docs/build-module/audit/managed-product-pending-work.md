# Managed Product pending work

Status: **repository implementation is complete; external acceptance remains**
as of 2026-10-13.
This file contains only external or deployed-environment evidence that is still
open. The product offering, current verified baseline and complete test flow are
in the [tester guide](../product/manage-product-tester-guide.md). Detailed
browser observations remain in
[MP-09 browser evidence](./evidence/mp09-browser-acceptance-2026-10-13.md).

## Browser acceptance — MP-09

The responsive smoke pass, overview filters, missing-product Settings state and
375 px mobile overlay clearance are complete. These further checks are done
in the signed-in browser on product 1:

- [x] Browser verified — Settings description. Saving a description kept it
  after refresh. Clearing it and saving again left the field empty after a
  second refresh. The product name stayed testog.
- [x] Browser verified — Settings deep link. Reloading
  `/build/managed-products/1/settings?tab=publishing` stays on Publishing and
  shows the published roadmap, issued 13 Oct 2026, 13:13:19, with no expiry.
- [x] Browser verified — Rotate share link. The dialog opens with focus on
  Cancel. Escape closes it, focus returns to Rotate share link, and the
  issued time stays the same.

The following evidence remains:

- Complete all nine real authenticated routes at 375, 768 and 1280 px for
  empty, filtered-empty, loading, error with working retry, denied,
  not-found and offline/recovery states.
- Prove denial in the browser with a real restricted product member, a caller
  without the required product/roadmap/feedback permission, and a caller from a
  different tenant. The intercepted `/me/access` stub proves presentation only;
  MP-11 proves HTTP authorization separately.
- Run keyboard-only traversal on the authenticated routes: visible focus,
  dialogs/sheets/menus/comboboxes trapping focus where required, Escape/Cancel
  focus return, and mobile full-screen dialog behavior. The three passing
  keyboard tests currently exercise only the design-system gallery. The
  Rotate share link dialog above is verified; the rest of this line is not.
- Prove return context and navigation: `?ret=` focus and scroll restoration,
  deep-link refresh, Back/Forward, modifier-click behavior and organization
  switching. The Publishing deep link above is verified; focus and scroll
  restoration, Back/Forward, modifier-click, and organization switching are not.
- Prove three-page pagination and cursor stability: 1 → 2 → 3 → 2 → 1,
  filter round-trips, selector continuation beyond page one, and no duplicate
  or missing rows.
- Prove dirty-form navigation and failed-mutation retention, including duplicate
  submission protection, validation errors and stale-revision recovery.
- Prove public roadmap preview/publication plus expired, rotated and revoked
  token behavior in the browser. The published state is visible; the live link
  was not expired, rotated, or revoked.
- Record role, tenant, starting fixture, action, URL, visible result, network and
  console result, refresh result and screenshot for every claimed cell.

## Non-browser evidence — MP-13

The six WOW workflows are implemented and have database/API evidence. Claims of
superior usability, customer value, adoption, willingness to pay or competitive
advantage remain hypotheses until the customer study in
[MP-13 WOW evidence](./evidence/mp13-wow-evidence-2026-10-13.md) is executed.
The same-scope Productboard and Canny documentation comparison is complete and
shows substantial feature overlap, so it does not support a superiority claim.

## Operational limitation

MP-12's monitoring definitions, JSON webhook delivery implementation and local
firing/recovery proofs are complete. A real HTTP receiver test passes in the
focused backend suite (`src/common/slo`: 34 tests, 2 suites). Deployment must
supply real `MP_ALERT_PAGE_URL` and `MP_ALERT_NOTIFY_URL` values. Delivery was
not executed against the deployed revision, so production paging proof remains
open.

Two gaps found and closed on 2026-10-13 after that paragraph was first written:

- **Nothing scheduled the alerts.** `alerts.yml` is the only workflow that runs
  alert checks and it contained zero references to managed-product, so the
  monitoring would never have executed on its own however correct the scripts
  were. Both self-tests are now registered there and pass exactly as the
  workflow invokes them — ops 9 checks, db 7 checks.
- **The db predicates were only ever checked against `prodshape`.** All four now
  run as read-only `SELECT COUNT(*)` against the live production database, so
  none can fail `42703`/`42P01` on the deployed revision.

Two limits on the above, both measured rather than assumed. That workflow job
runs only the `:self-test` variants — for every alert in it, not just these —
so the schedule proves predicates evaluate, not that they are pointed at live
data. And provisioning on this repo is **intermittent**: `alerts.yml` executed
all 17 steps in 40 s at 15:23 on 2026-10-13 and then failed with `steps=0` in
2 s at 16:29, as did every `Backend CI` and `Database gates` job. Registering
there is necessary and does run on the runs that provision; it is not a
guarantee, so confirm a specific run executed before trusting its colour.

## Delivery checklist

- [x] Close every source-visible Manage Product implementation item.
- [x] Repair and pass the intercepted product-state browser suite.
- [x] Schedule the managed-product alerts so the monitoring can actually run.
- [x] Prove every db-threshold predicate executes against the deployed revision.
- [ ] Complete the real role, tenant, paging, offline and disposable-token browser evidence above.
- [ ] Prove deployed alert delivery, acknowledgement and recovery.
- [ ] Complete the real-customer validation study.
