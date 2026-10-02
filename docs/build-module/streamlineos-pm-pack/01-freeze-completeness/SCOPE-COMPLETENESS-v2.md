# Scope Contract — Completeness Wave v2
**Frozen:** 2026-09-30 · Supersedes Freeze-only stand-down for discovery; Freeze v1 eng specs remain valid for Now bugs.

## Goal
Full end-to-end census of StreamlineOS **Build** module: every discoverable page/screen/state, every available role, filters/cards/views, critical workflows — with VERIFIED evidence. Done = ledger complete + bugs filed + PM prioritizes net-new vs Freeze.

## Hosts / env
Unchanged from Scope v1.2: `https://www.streamlineos.in` · Build · production + synthetic `PXC-` data · Session Protocol v1.2 (parallel profiles OK).

## Roles to exercise (minimum)
Owner · Org Admin · Module Owner · Module Admin · Module Member · Client (guest) · Account B (separate tenant isolation) · unauthenticated.

Create accounts via temp mail as needed. Pause MFA/CAPTCHA/secrets.

## Surface census requirements
For each route/dialog: Surface ID · role · entry path · intent · primary actions · filters/cards/views · loading/empty/error/success/denied/offline · mobile+desktop · evidence · status.

Include More tools inventory depth, Products/Portfolios/Programs/Teams, Command Center, My Work, project settings, org settings touching Build, Client portal guest path when unblocked.

## Relationship to Freeze v1
- BUG-001/002/005/006 still block some paths — document BLOCKED and continue around them.
- Do not reopen eng without Aditya; discovery+docs continue.
- New P0s may amend Now only via PM freeze amendment + council ack.

## Done criteria
1. Surface Ledger ≥ all safely discoverable Build routes for Owner + each role that can enter.
2. Role matrix: allow/deny table for critical actions.
3. Bug register updated.
4. PM delta roadmap: what stays Freeze vs new Now/Next.
5. Reading index updated for Aditya.
