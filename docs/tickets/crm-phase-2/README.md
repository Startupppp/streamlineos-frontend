# CRM Phase 2 — pending work

Source: [`docs/specs/2026-08-24-crm-phase-2-widening-prd.md`](../../specs/2026-08-24-crm-phase-2-widening-prd.md)

This is the single working list for the remaining CRM Phase 2 work. Closed
tickets 01–06 and 12–24 were removed after verification. The seven former
ticket files were merged here so completed work does not continue consuming
context. All items below remain open. This README is the only active CRM Phase
2 task file.

## Current status

- Identity convergence is complete on the CRM side; 16 legacy readers remain
  in Finance/Accounting, plus one unregistered Calendar reader. The contract
  drop cannot proceed until those readers are migrated.
- Ticket 25 is partially complete: backend organization-to-Party convergence
  exists, but the Companies, Clients and Parties frontend route trees are still
  separate.
- Tickets 09–11 have tested normalizers/services, but no production transport
  consumer or controller reaches the ingress seam.
- Permission-denial handling is incomplete across the CRM hooks and surfaces.
- `src/modules/crm-import/` still needs to move under `src/modules/crm/` with
  all imports updated.

## Consolidated pending tasks

### A. Finish the long-tail identity migration (former 07)

- [ ] Route every remaining legacy-table read in the long-tail modules through
  the Party resolver; remove compatibility mirrors after the migration.
- [ ] Make every long-tail write Party-only, preserving existing behavior and
  e2e coverage.
- [ ] Preserve display behavior, tenant scoping, Party search indexing and
  dashboard counts; stale legacy indexes must not serve results.
- [ ] Move `src/modules/crm-import/` under `src/modules/crm/` and update its
  import paths.

### B. Converge organizations and remove legacy contracts (former 25 + 08)

- [ ] Complete the company-shaped Party model, including
  `employer_party_id`, tenant-composite FKs, organization-to-Party resolution,
  backfill and merge convergence.
- [ ] Route every `crm_organizations` write through the Party mirror and
  converge Companies, Business Parties and organization surfaces.
- [ ] Replace the three frontend route trees (`/crm/companies`, `/crm/clients`
  and `/parties`) with one canonical Party-backed surface.
- [ ] Migrate the 16 Finance/Accounting readers and the Calendar reader at
  `backend/src/modules/calendar/calendar-linked-crm.ts`; register the reader
  with the ratchet while it remains.
- [ ] After all readers and e2e suites pass, remove compatibility writers,
  drop `contacts`, `clients`, `leads` and `business_parties`, and retain a
  reversible snapshot.
- [ ] Keep the resolver working after the drop and retain a lint/test guard
  that rejects new legacy-table readers.

### C. Wire the inbound communication adapters (former 09–11)

- [ ] Wire telephony, WhatsApp and web-form transports to the ingress seam so
  each produces an `InboundCommunicationEvent` with correct participants,
  threading and metadata.
- [ ] Preserve no-transcript semantics for calls and capture WhatsApp media
  through the existing attachment path.
- [ ] Validate web-form content at the boundary and resolve email/phone fields
  through Party without trusting submitted identity.
- [ ] Use Composio/server-side integration paths with no provider-token
  persistence; drive acceptance from fixtures without provider SDK mocks.
- [ ] Keep all downstream workflow/timeline behavior behind the ingress seam
  unchanged and prove each adapter with end-to-end tests.

### D. Make permission denial visible (former 26)

- [ ] Carry permission-denied results from the hook layer and render
  `NoPermissionState` on every denied CRM surface.
- [ ] Use `usePermissionGate` consistently rather than re-deriving denial at
  individual call sites; cover the currently ungated CRM hooks.
- [ ] Preserve the distinction between loading, error, empty, populated and
  denied states; denial is its own fifth state.
- [ ] Add a rendering-order regression test and leave server-side authorization
  unchanged.

## Dependencies and release notes

Tracks C and D can proceed independently once the Party seam is available. The
legacy contract drop in B remains blocked by the Finance/Accounting rewrite and
the Calendar reader. The repository baseline currently has unrelated failures
in `common/http`, `billing`, `kb`, `storage`, `chat`, `build` and one CRM
automation-studio suite; CRM work must not claim those failures as fixed.

The 79 deliberate CRM visual-token exceptions remain separate follow-up work.
