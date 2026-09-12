# Inventory UI reference pack

These reference boards are intentionally deterministic SVGs, built to match the existing StreamlineOS authenticated shell and inventory surfaces. They are not production UI and should not be copied literally; they communicate hierarchy, density, component anatomy, and responsive behavior to Claude Code.

## Non-negotiable visual rules

- Keep the existing StreamlineOS palette: `#f8fafc` page canvas, `#ffffff` cards, `#0b1220` ink/primary, `#64748b` muted text, `#e2e8f0` borders.
- Keep existing blue/cyan chart and product accents. Use amber only as the inventory module identity cue, not as a new global theme.
- Keep Geist/Geist Mono typography, compact controls, `h-9` fields, rounded-xl cards, hairline borders, and the existing PageWrapper anatomy.
- Keep semantic status colors for meaning only: green = healthy/received, amber = attention/pending, red = critical/error, blue = informational.
- Preserve the left navigation rail and existing shell. New inventory work should feel like a sibling of the current `/inventory` screens.
- Prefer real tables, queues, filters, and clear empty/loading/error states over decorative charts.

## Boards

- [Desktop command center](./desktop-command-center.svg) — dashboard hierarchy, KPI row, movement table, low-stock queue, and AI brief.
- [Mobile receiving](./mobile-receiving.svg) — one-handed scan-to-confirm warehouse flow.
- [Product replenishment](./product-replenishment.svg) — product detail, stock by location, demand evidence, and reviewable reorder action.

Source references: `frontend/globals.css`, `components/ui/page-wrapper.tsx`, `features/inventory/components/inventory-dashboard-client.tsx`, and the existing inventory query/API hooks.
