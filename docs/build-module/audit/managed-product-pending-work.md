# Managed-product pending work

Status: **code complete** (2026-10-11). Overview, Goals, Settings, and the browser checks already finished are removed from this list. Creating a product, accepting an opportunity onto an epic, picking an epic on the roadmap, the overview feedback count after a capture, and the Linked Projects customer filter are proven in the browser. Still open: Denial. This does not replace the [product-discovery delivery checklist](../experience/screens/product-discovery.md#delivery-checklist), [requirement ledger](../implementation/REQUIREMENT-LEDGER.md), or [work claims](../implementation/WORK-CLAIMS.md).

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
- [ ] Denial: a user without the managed-products, roadmap, or feedback permission, and a user from another tenant, are refused on pages, selectors, mutations, and deep links. Not run — [BVG-BLOCK-001](./browser-verification-backend-gaps.md).
- [x] Cache: Overview counts follow Feedback writes without a full refetch. The list and pane already follow classify, merge, unmark, and opportunity link with no GET — see the Verification log in [the gaps doc](./browser-verification-backend-gaps.md).
