# Managed-product pending work

Status: **code complete** (2026-10-11). Overview, Goals, Settings, and the browser checks already finished are removed from this list. Still open: Directory create and owner deploy, Feedback writes, Insights epic accept, Roadmap reorder and epic, the Linked Projects customer filter, Denial, and Cache. This does not replace the [product-discovery delivery checklist](../experience/screens/product-discovery.md#delivery-checklist), [requirement ledger](../implementation/REQUIREMENT-LEDGER.md), or [work claims](../implementation/WORK-CLAIMS.md).

Product decision: Overview is the concise product summary and Insights is the source-linked deep dive. They stay separate routes.

## Delivery checklist

Only browser verification remains. Each item needs an authenticated session against the current deployment at 375, 768, and 1280 px, plus keyboard checks.

- [ ] Directory: create a product outside the sandbox — [BVG-BLOCK-001](./browser-verification-backend-gaps.md). After the backend deploy, set and clear an owner and confirm the overview follows each change — [BVG-OWN-001](./browser-verification-backend-gaps.md).
- [ ] Feedback: after the backend deploy, route a submission to Intake through the project picker — [BVG-FB-003](./browser-verification-backend-gaps.md), and create a product widget from Collect via Feedbucket and submit through it so the row shows the Feedbucket badge — [BVG-FB-004](./browser-verification-backend-gaps.md). Opportunity deep links need [BVG-INS-001](./browser-verification-backend-gaps.md). A missing product's submissions list still returns 200 — [BVG-FB-001](./browser-verification-backend-gaps.md).
- [ ] Insights: accept an opportunity into the roadmap with an epic. The only linkable project has no epics, and creating one needs the owner's approval.
- [ ] Roadmap: reorder a card so it stays in the new place after reload — [BVG-RM-001](./browser-verification-backend-gaps.md). Pick an epic on a project that has epics.
- [ ] Linked Projects: choose a real CRM client in the customer filter — [BVG-BLOCK-004](./browser-verification-backend-gaps.md).
- [ ] Denial: a user without the managed-products, roadmap, or feedback permission, and a user from another tenant, are refused on pages, selectors, mutations, and deep links. Not run — [BVG-BLOCK-001](./browser-verification-backend-gaps.md).
- [ ] Cache: Overview counts follow Feedback writes without a full refetch. The list and pane already follow classify, merge, unmark, and opportunity link with no GET — see the Verification log in [the gaps doc](./browser-verification-backend-gaps.md).
