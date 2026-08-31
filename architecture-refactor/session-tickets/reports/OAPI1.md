# OAPI1 — OpenAPI Path Parameter Fidelity

**Date:** 2026-08-31  
**Lane:** OAPI1  
**Scope:** backend OpenAPI generator, gate script

---

## Finding Reproduced

Running the supplied reproduction command against the committed `openapi.json` confirmed **82 operations** with path template parameters not declared in the operation.

---

## Cause Breakdown

All 82 operations carry `@Validate({ params: <ZodSchema> })` on their handler — the Zod validation interceptor enforces each parameter at runtime. The defect is **documentation fidelity only, not a security gap**. No handler was missing runtime validation.

The generator defect was in `applyPathParams` (`src/common/openapi/build-openapi-document.ts`). It only enriched the `schema` field on already-existing path parameter entries; it never created entries for parameters not emitted by SwaggerModule. Compare with `applyQuery`, which both enriches existing query params AND inserts new ones. The three causes that leave SwaggerModule without an entry:

| Cause | Count | Example |
|---|---|---|
| **A — prefix-only param, no `@Param()` in handler** | ~35 | `GET /module-access/{moduleKey}/catalog` — controller `@Controller("module-access")`, handler uses `@Param() params` (no name), so Swagger adds nothing for `moduleKey` |
| **B — no `@Param()` at all** | ~15 | `GET /build/{projectId}/labels` — handler `listProjectLabels` has zero `@Param` decorators; SwaggerModule adds no path params |
| **C — partial: prefix param absent, handler param present** | ~32 | `POST /hr/recruitment/candidates/{candidateId}/offers/{offerId}/approve` — handler has `@Param("offerId")` (Swagger adds `offerId`) but `candidateId` is in the controller prefix only |

All causes share the same fix: teach `applyPathParams` to add missing path parameters from the Zod params schema, exactly as `applyQuery` does for query params.

---

## Security Assessment

**Not a security finding.** Every affected handler has `@Validate({ params })`. The `ZodValidationInterceptor` runs before the handler and rejects requests with invalid or missing path parameters. The missing entries are a document fidelity gap — the frontend vendor types silently drop those parameters (root CLAUDE.md §5 "contracts match exactly"), which breaks type-safe client generation, not authorization.

---

## Changes Made

### 1. Generator fix — `src/common/openapi/build-openapi-document.ts`

Replaced the narrow `applyPathParams` (enrich-only) with one that also inserts missing entries — mirroring the pattern `applyQuery` already uses. Path parameters are always `required: true` per OpenAPI spec.

**Before:** 13 lines, only enriched `schema` on existing `in: "path"` entries.  
**After:** 31 lines, enriches existing entries AND appends entries for any property in the params schema not yet declared.

### 2. Gate — `src/scripts/check-openapi-path-params.mjs`

New script that:
- Reads `openapi.json` from the backend root
- Flags any operation whose path template declares a `{param}` the operation's `parameters` list omits
- Vacuity guard: exit 2 if fewer than 500 operations are parsed
- `--self-test` flag exercises 9 real assertions (present, missing-one, no-field, empty-list, query-same-name, no-template, multi-method, empty-doc, vacuity) against the same `findMissingPathParams` function the real scan calls

### 3. `package.json` — two new script entries

```
"check:openapi-path-params": "node src/scripts/check-openapi-path-params.mjs"
"check:openapi-path-params:self-test": "node src/scripts/check-openapi-path-params.mjs --self-test"
```

### 4. Frontend contract vendor

`frontend/contracts/openapi.json` re-vendored from the regenerated `backend/openapi.json`.

---

## Before / After Counts

| Metric | Before | After |
|---|---|---|
| Operations with missing path params | **82** | **0** |
| Total operations | 3,551 | 3,551 |
| Zod contracts applied | — | 2,915 |
| Unconvertible schemas | — | 0 |

---

## Gate Bite Proof

1. Deleted `projectId` from `GET /build/{projectId}/labels` in `openapi.json`
2. `node src/scripts/check-openapi-path-params.mjs` → **exit 1**, reported `GET /build/{projectId}/labels — missing: projectId`
3. Restored via `pnpm openapi:generate`
4. `node src/scripts/check-openapi-path-params.mjs` → **exit 0**, `3551 operations checked, all path parameters declared`

---

## Gate Exit Codes

| Script | Exit Code |
|---|---|
| `pnpm check:contract-vendor` (frontend) | **0** |
| `pnpm check:route-classification` (backend) | **0** |
| `pnpm check:openapi-path-params` | **0** |
| `pnpm check:openapi-path-params:self-test` | **0** (9/9 assertions pass) |

---

## Files Changed

- `backend/src/common/openapi/build-openapi-document.ts` — `applyPathParams` fixed
- `backend/src/scripts/check-openapi-path-params.mjs` — new gate script
- `backend/package.json` — two new script entries
- `backend/openapi.json` — regenerated
- `frontend/contracts/openapi.json` — re-vendored
