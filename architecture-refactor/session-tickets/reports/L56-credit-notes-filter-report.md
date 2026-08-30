# L56 — Credit Notes `invoiceId` Filter Report

## Files changed

- `backend/src/modules/finance/ar/dto/finance-ar.schemas.ts` — added `invoiceId: z.coerce.number().int().positive().optional()` to `listCreditNotesSchema`
- `backend/src/modules/finance/ar/credit-notes.service.ts` — added `if (query.invoiceId) conditions.push(eq(creditNotes.invoiceId, query.invoiceId));` in `list()`
- `backend/src/modules/finance/ar/credit-notes-tenant-isolation.spec.ts` — fixed pre-existing extra constructor arg (`CreditNotesService` takes 4 params, test was passing 5); added 3 new tests: invoiceId reaches predicate, invoiceId absent = no predicate, cross-tenant with invoiceId never leaks another org's rows
- `backend/openapi.json` + `frontend/contracts/openapi.json` — regenerated after DTO change

## Route

`GET /accounting/credit-notes` — controller at `backend/src/modules/finance/ar/credit-notes.controller.ts` (`@Controller("accounting/credit-notes")`). The ticket stated path `backend/src/modules/accounting/**` but the real path is `backend/src/modules/finance/ar/**`.

## SQL predicate added

`eq(creditNotes.invoiceId, query.invoiceId)` added to the existing `conditions` array in `CreditNotesService.list()`. The predicate is pushed only when `invoiceId` is provided; omitting it leaves the existing behaviour intact.

## Index note (OUT-OF-OWNERSHIP)

The table already has `idx_credit_notes_invoice` on `(invoice_id)` alone. For the query `WHERE org_id = ? AND invoice_id = ?` under RLS, a composite index `(org_id, invoice_id)` would be more efficient and required for an index-only scan. Recommended migration SQL:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_notes_org_invoice
  ON credit_notes (org_id, invoice_id)
  WHERE invoice_id IS NOT NULL;
```

Buffer measurement was not run (no live DB access in this session context).

## Test summary

5/5 tests pass (`credit-notes-tenant-isolation.spec.ts`): org scope, same-tenant control, invoiceId in predicate, invoiceId absent, cross-tenant invoiceId isolation.

## Frontend change required (OUT-OF-OWNERSHIP)

File: `frontend/features/accounting/sales/invoice-detail-panels.tsx`

Add `invoiceId` to `ListCreditNotesParams` (wherever that type lives in the frontend hooks) and pass `invoiceId: invoice.id` when calling `useCreditNotes(...)`. Example:

```ts
useCreditNotes({ invoiceId: invoice.id })
```

This replaces the current client-side filter and eliminates the silent page-2+ omission.

## Validation

- `pnpm typecheck` — PASS (clean)
- `pnpm check:route-classification` — PASS (0 undeclared, 3534 total)
- `pnpm check:tenant-isolation` — 61 pre-existing failures (93% coverage); credit-notes covered; not caused by this change
- `pnpm openapi:generate` — PASS (3546 operations)
- `pnpm check:contract-vendor` — PASS (sha256 match)
- jest credit-notes pattern — 5/5 PASS
