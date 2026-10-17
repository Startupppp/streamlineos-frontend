# Designer Phase 4 — PM-001 (post Owner verify)

**Approve PRD direction with evidence-based scope shift:**

1. Slice 1 is **not** “add missing Owner CTA” — Owner CTAs VERIFIED. Slice 1 = **complete the grant**: persist row, success toast, show magic-link/copy, fix projects loader error.
2. Slice 1b (BUG-004): Member empty state must not look broken — Request access / Contact admin (UX-017b/018).
3. Guest auth (magic-link/OTP) stays Slice 2 per CI — blocked until one grant exists.
4. Publish checklist (UX-009) after first grant works.
5. AVOID conflating Build Member with Client — Owner verify used “client contact” path correctly.

Open for eng: is Invite Client writing to a different store than Grants list (contact vs grant)?

## Dual-repro update (Designer Owner VERIFIED ×2)

BUG-005: Success toast “Client invited and portal access activated” with **empty grants** (false success) — High/blocking.
BUG-006: Grant Access projects loader error — High.

### Slice-1 handoff acceptance (freeze-ready)
1. Never show success toast unless grant row is queryable in UI.
2. After Invite Client: grants list shows row OR explicit error toast with retry.
3. Produce guest entry (magic link/copy or email sent confirmation with deep link).
4. Grant Access: load projects or show recoverable error; block confirm until loaded.
5. Member empty state: Request access (BUG-004) — separate from Owner complete-grant.
