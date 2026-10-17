# UI-UX-SUGGESTIONS.md
# UI-UX-SUGGESTIONS (MP round 1)
## MP-U-001 Key not auto-derived from Name
- Route: /build/managed-products create sheet. Key is required (inline "Required" only after submit), placeholder "PROD" gives no format rule.
- Suggestion: auto-suggest Key from Name (editable), show format hint (length/charset) before submit.
## MP-U-002 Roadmap item RICE vs opportunity RICE
- Route: /roadmap?view=timeline&item=1. Opportunity was overridden to 250 and accepted, but roadmap item shows RICE 1200 (Reach 1000, Impact 3, Confidence 80%, Effort 2) while original score had Impact Medium(1) => 400. Suggest: show "source: opportunity (overridden 250)" or sync override into roadmap item; clarify which RICE is authoritative. (Possible data mismatch — see MP-B-010.)

## MP-U-003 Roadmap List view: Title column does not truncate; table scrolls horizontally
- Route: /build/managed-products/3/roadmap?view=list. The long auto-created title (MP-B-004 text) pushes the Horizon/Status/Owner/Target/Confidence columns off-screen at 1280px; a horizontal scrollbar appears under the table.
- Suggestion: truncate Title with ellipsis + tooltip, keep Horizon/Status visible (sticky or fixed widths), and cap title length in the create form (see MP-B-014).

## MP-U-004 Edit Roadmap Item: Public toggle is at the bottom of a long sheet
- Route: Board card pencil → Edit Roadmap Item. "Public / Show this item on the public board" is below Decision snapshot, after ~6 scroll-screens. Users publishing a roadmap likely miss it.
- Suggestion: place visibility near the top (next to Status) or show a per-card "Public" toggle on the board card.

## MP-U-005 Directory: Back/Forward skip filter changes; "Clear filters" and status changes are not separate history steps
- Route: /build/managed-products. Sequence tested: search q=qamp → status=archived → Clear filters → grid (?view=grid) → Back. Back returned to ?status=active&q=QAMP1013 (a state from before the Archived step), skipping the Archived and cleared states. Users expecting Back to undo the last filter/view change will land elsewhere.
- Suggestion: push a history entry per committed filter/view change (or at least on status/view), so Back restores the previous filter set, and keep the URL as the single source of truth.

## MP-U-006 Filter chips show raw enum values
- Route: /build/managed-products?status=archived. Chip reads "Status archived" (lowercase raw value) while the select reads "Archived"; same with "Status active".
- Suggestion: use the same label as the select ("Status: Archived").

## MP-U-007 Publishing panel: "Expires — No expiry" with no way to set an expiry
- Route: /build/managed-products/3/settings?tab=publishing after Publish. Shows "Expires No expiry" and only Rotate/Unpublish. No expiry option, so expired-token behaviour cannot be exercised or configured from the UI.
- Suggestion: offer an expiry choice (e.g., 7/30/90 days / never) at publish and on rotate, or hide the Expires row if not supported.

## MP-U-008 Publish panel after Unpublish confirm
- Route: Settings > Publishing > Unpublish → confirm "Unpublish". After confirming, the panel still showed "Published" with the link for at least ~4 s; the state changed only after a later click and reload. Show a pending state and update the panel when the request completes.

## MP-U-009 Narrow (~300% zoom, ~427px) directory: table clipped inside card; Actions column unreachable without scroll
- Route: /build/managed-products at 300% browser zoom. Header shows "Name Lifecycle Health Goals Owner Projects N…" cut at card edge; Next release/Feedback/Updated/Actions need horizontal scroll inside the card with no visible scroll affordance.
- Suggestion: switch to the card/grid layout automatically under ~600px, or pin Name + Actions and show a horizontal-scroll hint.

## MP-U-010 Add product member: dropdown lists existing members
- Route: /build/managed-products/3/settings?tab=members → Add member → "Select a member".
- Observed: the list includes people who are already product members (qamem1012c, qaadm1012d); choosing one with a role returns "This person is already a member of this product."
- Suggestion: hide existing members from the picker, or show "Already a member" as a disabled option.

## MP-U-011 Release row shows "Owner" label, not the owner name
- Route: /build/managed-products/3/releases → Upcoming row.
- Observed: the row shows an owner icon with the text "Owner" and "just now" (updated time) next to it, so the owner name is not visible in the list. The owner picker shows only initials ("Q") and names.
- Suggestion: show the owner name (or initials + name) in the row.

## MP-U-012 Release create sheet stays on "Creating…" for several seconds
- Route: /build/managed-products/3/releases → New release → Create release.
- Observed: button label "Creating…" for ~6–10 s before the sheet closes; no progress feedback.
- Suggestion: disable and show a spinner on submit; close on success with an immediate list update.

## MP-U-013 Sidebar draft pill shows a long run of "N" characters
- Route: product sidebar at bottom of the nav ("Draft awaiting review: NNNNNNNNNN…") on every product page.
- Suggestion: show a readable label (e.g. the draft title) and truncate with a tooltip; check the placeholder value.

## MP-U-014 Overview "Measured outcomes" has no action to schedule or complete a review
- Route: /build/managed-products/3 → "Measured outcomes" card (Reviews scheduled 0, Completed 0, Latest review "Not measured yet").
- Suggestion: add "Schedule review" and "Mark complete" actions here, or link to where outcome reviews are managed.

## MP-U-015 Floating companion covers content at 300% zoom
- Route: all product pages at 300% browser zoom.
- Observed: the companion bubble and pet cover the top-right header actions and part of the stats row on Releases; makes narrow-viewport checks hard to read.
- Suggestion: allow the companion to collapse by default on narrow viewports and keep header actions above it.
