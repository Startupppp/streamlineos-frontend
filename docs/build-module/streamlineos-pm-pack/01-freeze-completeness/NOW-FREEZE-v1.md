# Now Freeze v1 — StreamlineOS Build
**Frozen:** 2026-09-30 · **Owner:** Principal Product Manager  
**Evidence:** Scope v1.2 · Surface ledger · CI Cut v2 · R1 · Owner Client Access dual-repro

## Frozen Now initiatives (implementation order)

| Order | ID | Problem | PRD | Key bugs |
| --- | --- | --- | --- | --- |
| 1 | PM-011 | Cold invite accept blank + lifecycle | `PRD-PM-011-invite-accept.md` | BUG-001 |
| 2 | PM-002 | Invite → Build access (named Build Module Member default ON) | `PRD-PM-002-build-role-at-invite.md` | BUG-002 |
| 3 | PM-001 | Client grant must persist + guest entry (not paint CTA) | `PRD-PM-001-client-portal-grant.md` | BUG-005, BUG-006, BUG-004 |

## Explicitly not in this freeze
PM-003 VERIFIED · PM-004 VERIFIED (polish Later) · PM-005/006 Next · PM-007 instrumentation with each · H-Builder / More-tools sprawl **Not Now**

## Cross-cutting DoD
- Truth labels on every claim
- Designer constraints: ADOPT multi-method auth/session · ADAPT quiet chrome/portal · AVOID perm dump / mega-menu
- Tester: dual apex/www where relevant; provisioned-Member ≠ cold invite
- CI bar: Directs Linear/Jira/ClickUp + suite Zoho/Odoo; Client wedge vs JSM/Zoho not Linear-guest

## Claude implement prompt
See `CLAUDE-IMPLEMENT-NOW.md`
