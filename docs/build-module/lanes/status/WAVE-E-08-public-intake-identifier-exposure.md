# Wave-E-08 status: public intake identifier exposure

**Lane:** B-8 — public intake identifier exposure
**Criterion:** `10-public-intake.md` box 2 — "The page serves the stated job and success metric without exposing internal identifiers or unauthorized record existence."
**Status: BOX 2 REMAINS UNTICKED — migration required before it can close**

---

## Finding confirmed against today's code

**Route:** `POST /public/intake/:projectId`
**File:** `backend/src/modules/public/public.controller.ts:328–339`

```
@Post("intake/:projectId")
@HttpCode(201)
@UseGuards(RateLimitGuard)
@UseRateLimit("public:intake")
@ResponseSchema(intakeSubmitSchema)
@Validate({ params: projectIdParams, body: intakeSchema })
submitIntake(
  @Param("projectId", ParseIntPipe) projectId: number,
  @Body() body: IntakeInput,
) {
  return this.intake.submitIntake(projectId, body);
}
```

**Param schema:** `projectIdParams = z.object({ projectId: z.coerce.number().int().positive() }).strict()` at `public.controller.ts:110`

The param is a sequential integer. Every other write endpoint on this controller (`forms/:token`, `lead-form/:token`, `nps/:token`, `vendor-portal/:token`, `referrals/:token/submit`) is addressed by an opaque token. This endpoint is the outlier.

---

## Internal identifiers enumerated

### In the URL

`projectId` — a sequential integer from `build.projects.id` (`generatedAlwaysAsIdentity()`). Walking 1, 2, 3 … enumerates every project that has ever existed across all tenants.

### In the status code pair

`201` when the project exists and is not soft-deleted → anonymous submission recorded.
`400` ("Invalid request") when the project does not exist OR has been soft-deleted.

The service at `backend/src/modules/public/intake.service.ts:43–99` calls `app.resolve_project_org_id(projectId)` (SECURITY DEFINER, returns the tenant for any row including deleted ones), then re-reads inside a tenant transaction. If the resolver returns null (project never existed) → 400. If the resolver returns an org but the re-read finds the project deleted under RLS → also 400. So 201 vs 400 is a platform-wide existence oracle for live projects across all tenants. The service's own comment at lines 14–42 names both oracle capabilities explicitly.

### In the response body (now fixed)

Prior to this lane: `{ id: <integer>, message: "..." }` — the intake item's sequential PK from `build.intake_items.id` (`generatedAlwaysAsIdentity()`), which reveals the cumulative count of intake submissions across the platform.

**This is now removed.** The success response is `{ message: "Request submitted successfully" }`. See below.

### In error messages

None. Both refusal paths throw `BadRequestException("Invalid request")` — the same message for a non-existent project and a soft-deleted one. Confirmed in `intake-project-lifecycle.db.spec.ts:157–170` and in the new unit spec.

### In redirects

None.

---

## Rate limit check

`public:intake` is registered in `TIERS` at `rate-limit.service.ts:210`: `{ limit: 5, windowSecs: 3600 }` (5 requests per hour per IP). The rate-limit guard does NOT fail open — since SEC-004, an unknown tier denies rather than allows (`rate-limit.service.ts:302–307`). The tier entry exists, so the guard is active.

The rate limit bounds the enumeration *rate* but removes neither oracle capability. An attacker with 5 IPs and an hour has 25 probes. It is mitigation, not a fix.

---

## SECURITY DEFINER hazard check

`app.resolve_project_org_id` is SECURITY DEFINER and is called OUTSIDE the tenant transaction. This is the correct pattern. Its purpose is to name the tenant; it never exposes any other project column. The lifecycle predicate (`isNull(projects.deletedAt)`) is enforced INSIDE the tenant transaction where RLS is live, via `runInTenantTransaction` with `{ orgId }`. This is the same shape the calendar provider webhook uses. No `42501` hazard here.

---

## What was fixed in this lane

**Removed the sequential intake item `id` from the success response.**

- `backend/src/modules/public/intake.service.ts` — return changed to `{ message: "Request submitted successfully" }` (no `id`)
- `backend/src/modules/public/dto/public-response.schemas.ts` — `intakeSubmitSchema` no longer declares `id: z.number().int()`
- `backend/src/modules/public/intake-project-lifecycle.db.spec.ts` — asserts `result.id` is `undefined`, not a number
- `frontend/features/build/intake/public-intake-schema.ts` — `intakeSubmitResponseContract` no longer declares `id: z.number()`

**New tests:**

`backend/src/modules/public/intake-response-shape.spec.ts` — 5 unit tests:
1. "returns only a message string on success" — positive pair
2. "does not include a sequential id in the success response" — guards the fix
3. "throws BadRequestException when the project id does not resolve to any org"
4. "throws BadRequestException when the org resolves but the project is absent under RLS"
5. "both refusal paths produce the same message — walking the id space learns nothing"

All 5 pass. All pre-existing specs (rate limits, page states) also pass.

---

## What remains and why box 2 cannot close

Two violations are open and cannot be closed without a migration:

**Violation 1 — sequential integer in the route parameter.**
`POST /public/intake/42` exposes that project 42 exists. Any unauthenticated caller can walk `projectId` from 1 upward to enumerate every project across every tenant.

**Violation 2 — 201 vs 400 existence oracle.**
A 201 response tells an unauthenticated caller that a project with the given id exists and is live. A 400 tells them it does not, or is deleted. The response message is identical in both failure cases (closes only a second-order oracle), but the status code pair is not.

### The required migration

Add `intake_token UUID NOT NULL DEFAULT gen_random_uuid()` to `build.projects`. This requires:
1. A migration in the reserved range (this lane has no reserved range — orchestrator must allocate one).
2. The migration adds the column, backfills existing rows, and adds an index on `intake_token`.
3. The route becomes `POST /public/intake/:intakeToken` where `intakeToken` is a UUID.
4. A new service method resolves the project by token (not by integer id) and enforces that it exists and is not deleted.
5. The frontend page at `app/(public)/intake/[projectId]/page.tsx` and the hook at `hooks/api/build/public-intake.ts` must be updated to use the token path.
6. All currently-published intake links of the form `.../intake/42` break. A compatibility redirect from the old integer path to a 404 (not to the token URL, to avoid leaking the mapping) is needed.

**Railway ships every backend push.** Do not merge the new route call site ahead of its schema migration. The migration must be journalled and applied before any call site that resolves by `intake_token` is deployed.

Until the migration ships, box 2 remains unticked. The note in `10-public-intake.md` at lines 96–100 already records this correctly. This lane has removed the third, repairable identifier (the response-body `id`) and added regression tests; the primary oracle is a product decision pending migration.
