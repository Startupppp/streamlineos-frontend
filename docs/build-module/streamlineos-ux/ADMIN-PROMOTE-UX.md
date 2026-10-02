# Admin promote — Design notes (VERIFIED 2026-09-30)

**Owner Account A** · org `PXC-Design-A-20260930`  
**Target Member:** `[REDACTED-TEST-EMAIL]`

## VERIFIED
- Promoted Member → **Build Module Admin** (kept Member + Build Module Member context; Build Access shows **Build Module Admin**, 80/80 Build permissions).
- Toast: “Group assignments updated”
- URL: `https://www.streamlineos.in/build/settings/access?userId=862184d2-8bb4-4817-a8ce-84cc909f1c53&section=access`
- **Org Admin** exists in catalog (system role, 54 permissions, automatic / non-editable) — **not assigned** this pass (Module Admin preferred).
- UX: reversible checkbox + Save/Cancel; **no** dangerous confirm dialog.

## Evidence
`/workspace/streamlineos-ux/evidence/admin-promote/`
- `build-module-admin-assigned.webp`
- `build-access-confirmed.webp`
- `org-admin-role-catalog.webp`

## Design follow-ups
- **Build Module Admin shell census** (as that user): still needed — Tester owns Member session; Design to coordinate / score chrome vs Owner.
- Org Admin live shell: UNTESTED (catalog only).
- Role labels: “Build Module Admin” vs “Org Admin” — clear in access settings; confirm nav chrome shows role identity for the actor (ties earlier session-chrome note, lower priority).
