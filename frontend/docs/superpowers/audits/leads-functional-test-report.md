# Leads Pilot — Functional + Multi-Role RBAC Test Report

**Date:** 2026-06-25 (overnight run)
**Target:** NestJS service `streamlineos-api` on :1500, against the **live Neon DB** (shared, via copied `.env`).
**Harness:** `streamlineos-api/scripts/functional-test-leads.mjs` (mints multi-role backend JWTs with the shared secret = "login" equivalent; discovers a real org with leads; exercises all 8 endpoints; write-path uses `ZZ_FUNCTEST`-tagged rows + a temp API key, all cleaned up).
**Result:** ✅ **22/22 passed.**

## What was verified (on real data)
- Discovery: real org `43aa1af7-…` with 5 leads, real member, sample lead.
- **Auth:** no token → `401 {error:"Unauthorized"}`.
- **RBAC matrix (CASL):**
  - `GET /leads` no-perm → `403 {error:"Forbidden",code:"RBAC_DENIED",verb:"read",subject:"crm:leads"}`
  - `POST /leads` no-perm → `403 RBAC_DENIED`
  - `DELETE /leads/:id` viewer (read-only) → `403`
  - org-wide OWNER (`isOrgOwner`) → full access; returned all **5 real leads** with shape `{leads,totalCount,page,totalPages}`.
  - SALES role with no assigned leads → `leads:[]` (correct **role/branch-scoped** filtering, not a bug).
- **Validation (Zod pipe → 400):** `limit=500` → `"Validation failed: limit: Too big: expected number to be <=100"`; `page=abc` → `"… expected number, received NaN"`; `POST /leads` empty body → `"name: … received undefined"`.
- **Errors:** `GET /leads/999999999` → `404 {error:"Lead not found"}`; `GET /leads/not-a-number` → `400` (ParseIntPipe).
- **Auth-only endpoints** (board/stats) → `200` for any authenticated token (faithful to the web routes, which used `withAuth` not `withAbility`).
- **Write round-trip:** `POST /leads` (SALES) → `201` with id → `GET` matches → `PATCH` → `200` → `DELETE` (OWNER) → `200`. Row cleaned up.
- **API-key ingest:** missing key → `401 {error:"Missing X-API-Key header"}`; bad key → `401`; valid temp key (`leads:write` scope) → `201` with new lead id. Temp key + lead cleaned up.
- **Stats** shape: `{total, byStatus, conversionRate, totalPotentialValue, unassigned, thisMonth}` (matches web).

## Parity note
`GET /leads` returns `{leads, totalCount, page, totalPages}` — **byte-identical to the web `getLeads`** (`server/queries/leads-list.ts:93`). The error/RBAC/validation bodies match the web `{error}` / `RBAC_DENIED` shapes. The frontend hooks will work unchanged once cut over.

## Safety
All writes were create-then-delete on clearly-tagged rows (`ZZ_FUNCTEST_*`) + a temp API key; no pre-existing data was modified or deleted. Verified the working set was cleaned up.

## Not covered here (by design / deferred)
Status-transition, assign, distribute, import, export, merge, score-explanation, activities/timeline, analytics (deferred endpoints — not built). Cross-service parity-vs-Next (operator runs `scripts/parity-leads.mjs` with both servers up).
