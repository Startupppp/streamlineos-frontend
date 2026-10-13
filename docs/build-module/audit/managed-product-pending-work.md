# Managed-product pending work

Status: **code complete** (2026-10-12). The 2026-10-12 code audit items, many-to-many project links, product reach checks on every product read and write, release revision and evidence fields, contains search, and the QA retest bugs are implemented and covered by focused tests. Overview, Goals, Settings, and the browser checks already finished are removed from this list. Creating a product, accepting an opportunity onto an epic, picking an epic on the roadmap, the overview feedback count after a capture, and the Linked Projects customer filter are proven in the browser. Browser verified on 2026-10-13 in the signed-in local browser: overview filters at 375, 768, and 1280 px, the missing-product Settings page, and the 375 px quick-actions clearance. Still open: Denial, invitation, and the layout line below, because keyboard, focus restore, and `?ret=` were not walked. This does not replace the [product-discovery delivery checklist](../experience/screens/product-discovery.md#delivery-checklist), [requirement ledger](../implementation/REQUIREMENT-LEDGER.md), or [work claims](../implementation/WORK-CLAIMS.md).

Product decision: Overview is the concise product summary and Insights is the source-linked deep dive. They stay separate routes.

## Delivery checklist

Only browser verification remains. Each item needs an authenticated session against the current deployment at 375, 768, and 1280 px, plus keyboard checks.

- [x] Directory owner: set and clear the owner on product 39 from Edit product and confirm the overview follows each change — [BVG-OWN-001](./browser-verification-backend-gaps.md).
- [x] Directory: create a product outside the sandbox — [BVG-BLOCK-001](./browser-verification-backend-gaps.md).
- [x] Feedback: route a submission to Intake through the project picker — [BVG-FB-003](./browser-verification-backend-gaps.md), create a product widget from Collect via Feedbucket and submit through it so the row shows the Feedbucket badge — [BVG-FB-004](./browser-verification-backend-gaps.md), open the opportunity deep link — [BVG-INS-001](./browser-verification-backend-gaps.md), and confirm a missing product's submissions list is not a successful empty inbox — [BVG-FB-001](./browser-verification-backend-gaps.md).
- [x] Insights: accept an opportunity into the roadmap with an epic. QA BV epic accept is on the Next column and its Epic link opens ticket 89.
- [x] Roadmap reorder: move a card up and confirm it stays in the new place after reload — [BVG-RM-001](./browser-verification-backend-gaps.md).
- [x] Roadmap: pick an epic on a project that has epics.
- [x] Linked Projects: choose a real CRM client in the customer filter — [BVG-BLOCK-004](./browser-verification-backend-gaps.md). QA BV Client (id 6) is the client on Build QA Sandbox, and `?pp_client=6` lists that project only.
- [x] Browser verified — overview filters on product 1. The row fills the content width. At 1280 px, Period, Team, Status, Segment, and the date range are one row and each label is fully visible. At 768 px, Period, Team, and Status fill the row; Filters holds Segment and the date range, and the date calendar opens from that menu. At 375 px there are two rows only (Period with Team, then Status with Filters), and both rows meet the content edge.
- [x] Browser verified — missing product. `/build/managed-products/39/settings` shows "Product not found" and Back to products.
- [x] Browser verified — mobile chrome at 375 px on product 1 Settings. Quick actions sits above More and does not cover it. The Archive control ends above the button. Ask OS is not drawn on More. Directory, overview, feedback, insights, goals, projects, roadmap, and releases at 375 px also showed no document overflow and no overlap between quick actions and More.
- [ ] Denial: a user without the managed-products, roadmap, or feedback permission, and a user from another tenant, are refused on pages, selectors, mutations, and deep links. Not run — [BVG-BLOCK-001](./browser-verification-backend-gaps.md).
- [x] Cache: Overview counts follow Feedback writes without a full refetch. The list and pane already follow classify, merge, unmark, and opportunity link with no GET — see the Verification log in [the gaps doc](./browser-verification-backend-gaps.md).
- [ ] Layout and keyboard: directory, overview, feedback, insights, roadmap, releases, and settings at 375, 768, and 1280 px, including focus and scroll restore when returning through `?ret=` and full-screen dialogs on mobile.
- [ ] Invitation: an invited user who signs up with the invited email sees the pending invitation on org setup and joins the inviting organization.
