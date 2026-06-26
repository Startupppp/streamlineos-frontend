# CRM Leads Pilot — Core Slice (shadow-verify) — Implementation Plan (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Port the kernel-proving **core** of the CRM Leads domain onto the NestJS service (`streamlineos-api`, :1500) — list, create, get, update, delete, board, stats, and **ingest (API-key)** — reusing the synced Drizzle schema, and **shadow-verify parity** against the live Next.js endpoints + shared Neon DB. **No frontend cutover** in this plan (zero production risk).

**Architecture:** A new `LeadsModule` (controller + service) on the existing kernel (JwtAuthGuard, AbilityGuard, ZodValidationPipe, CacheService, AuditService, AllExceptionsFilter). Adds the one deferred kernel piece — `ApiKeyGuard` — plus a minimal `RateLimitService`. Read queries and lead triggers are **faithful ports** of the web app's `server/queries/leads-*`, `server/lib/lead-triggers.ts`, and `lib/db/branch-filter.ts` (with `server-only` stripped and `db` injected). The frontend keeps calling Next.js; correctness is proven by a **parity script** the operator runs against both services.

**Tech Stack:** NestJS 10, Drizzle (synced schema), `@casl/ability`, `@upstash/redis`, `jose`, `zod`, Jest + supertest. Both repos: API `D:\projects\personal\streamlineos-api` (branch `master`), WEB `D:\projects\personal\Streamlineos` (reference only — not modified in this plan).

**Scope decisions (locked):**
- **In scope (8 endpoints):** `GET /leads`, `POST /leads`, `GET /leads/:leadId`, `PATCH /leads/:leadId`, `DELETE /leads/:leadId`, `GET /leads/board`, `GET /leads/stats`, `POST /leads/ingest`.
- **Deferred (later plans):** status-transition (creates clients/tickets/notifications/emails), assign (email+AI), distribute (HR leaves), import, export, merge, score-explanation, activities/timeline, the read-only analytics endpoints, Inngest crons, and **the cutover** (api-client per-prefix routing + deleting Next routes).
- **`POST /leads` side-effect scope:** port the insert + assignee-membership check + assignee notification row + the portable triggers (`evaluateAssignmentRules`/`recalculateLeadScore`/`applySlaPolicy`) + audit + cache invalidation. **Defer** the webhook dispatch, automation-engine dispatch, and the assignment EMAIL (these pull in other subsystems and are not needed to prove the kernel; the parity script accounts for the missing email/webhook as known shadow-only gaps).

**Source parity references (WEB):** `app/api/leads/route.ts` (list+create — exact schemas/logic), `app/api/leads/[leadId]/route.ts` (get/update/delete + update schema), `app/api/leads/board/route.ts`, `app/api/leads/stats/route.ts`, `app/api/leads/ingest/route.ts` (API-key flow), `server/queries/leads-list.ts` (`getLeads`/`getLeadBoard`/`getLeadStats`), `server/queries/leads-detail.ts` (`getLead`), `server/lib/lead-triggers.ts`, `lib/db/branch-filter.ts`, `lib/rate-limit.ts` (`checkRateLimit`, the `api-key-ingest` tier).

---

## File structure (created by this plan, in the API repo)

```
src/
  common/
    ratelimit/
      rate-limit.service.ts       # minimal checkRateLimit(tier, id) — Upstash sliding window + in-memory fallback
      rate-limit.module.ts        # @Global provider
      rate-limit.service.spec.ts
    auth/
      api-key.guard.ts            # X-API-Key → apiKeys table (sha256), revoked/expiry/scope checks + rate-limit
      api-key.decorator.ts        # @ApiKey() param decorator → { orgId, id, scopes }
      api-key.guard.spec.ts
  modules/leads/
    leads.module.ts
    leads.controller.ts           # GET/POST /leads, GET/PATCH/DELETE /leads/:leadId, GET /leads/board, GET /leads/stats
    leads.ingest.controller.ts    # POST /leads/ingest
    leads.service.ts              # ported reads + create/update/delete
    lead-triggers.ts              # port of server/lib/lead-triggers.ts (db injected)
    branch-filter.ts              # port of lib/db/branch-filter.ts
    dto/lead.schemas.ts           # zod: listSchema, createSchema, updateSchema, ingestSchema
    leads.controller.e2e-spec.ts  # auth/RBAC wiring (no DB needed)
    leads.ingest.e2e-spec.ts      # API-key rejection paths (no DB needed)
scripts/
  parity-leads.mjs                # OPERATOR-run: diff NestJS vs Next.js responses for the 8 endpoints
```

**AppModule:** import `LeadsModule` + `RateLimitModule`. **No WEB changes in this plan.**

---

## Task 1: Lead DTO schemas (Zod)

**Files:** Create `src/modules/leads/dto/lead.schemas.ts`, `src/modules/leads/dto/lead.schemas.spec.ts`

- [ ] **Step 1: Write the failing test** — `dto/lead.schemas.spec.ts`:
```ts
import { listSchema, createSchema, updateSchema, ingestSchema } from "./lead.schemas";

describe("lead schemas", () => {
  it("listSchema coerces page/limit and enforces limit<=100", () => {
    expect(listSchema.parse({ page: "2", limit: "50" })).toMatchObject({ page: 2, limit: 50 });
    expect(() => listSchema.parse({ limit: "500" })).toThrow();
  });
  it("createSchema requires name and defaults source/priority", () => {
    expect(createSchema.parse({ name: "Acme" })).toMatchObject({ name: "Acme", source: "other", priority: "WARM" });
    expect(() => createSchema.parse({})).toThrow();
  });
  it("createSchema accepts empty-string email", () => {
    expect(createSchema.parse({ name: "A", email: "" }).email).toBe("");
  });
  it("ingestSchema allows all-optional but is validated by route for name|email|phone", () => {
    expect(ingestSchema.parse({})).toEqual({});
    expect(ingestSchema.parse({ email: "x@y.com" }).email).toBe("x@y.com");
  });
  it("updateSchema is all-optional", () => {
    expect(updateSchema.parse({})).toEqual({});
    expect(updateSchema.parse({ priority: "HOT" }).priority).toBe("HOT");
  });
});
```

- [ ] **Step 2: Run it (fails)** — `cd "D:/projects/personal/streamlineos-api" && pnpm jest lead.schemas.spec.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** — `dto/lead.schemas.ts` (transcribed exactly from `WEB/app/api/leads/route.ts` lines 14–68 and `ingest/route.ts` lines 11–18; `updateSchema` mirrors `createSchema` all-optional — when implementing, OPEN `WEB/app/api/leads/[leadId]/route.ts` and match its `updateSchema` field set exactly):
```ts
import { z } from "zod";

const LEAD_STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
const LEAD_PRIORITIES = ["HOT", "WARM", "COLD"] as const;
const LEAD_SOURCES = ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"] as const;
const LEAD_SORTABLE = ["name", "email", "company", "status", "priority", "source", "score", "potentialValue", "createdAt"] as const;

export const listSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  assignedToId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(LEAD_SORTABLE).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  source: z.enum(LEAD_SOURCES).default("other"),
  campaignId: z.number().optional(),
  investmentInterest: z.string().optional(),
  potentialValue: z.string().optional(),
  notes: z.string().optional(),
  company: z.string().optional(),
  designation: z.string().optional(),
  city: z.string().optional(),
  referredBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional(),
  priority: z.enum(LEAD_PRIORITIES).default("WARM"),
});

export const updateSchema = createSchema.partial();

export const ingestSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export type ListInput = z.infer<typeof listSchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type IngestInput = z.infer<typeof ingestSchema>;
```
> Implementer: verify `updateSchema` against the WEB `[leadId]` route — if its update fields differ from `createSchema.partial()` (e.g. it allows `status`/`lostReason`/`followUpDate`), define `updateSchema` explicitly to match the WEB route's accepted fields. Do not silently diverge.

- [ ] **Step 4: Run it (passes)** — `pnpm jest lead.schemas.spec.ts` → 5 pass.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(leads): lead DTO zod schemas"`

---

## Task 2: Port branch-filter + lead-triggers

**Files:** Create `src/modules/leads/branch-filter.ts`, `src/modules/leads/lead-triggers.ts`

- [ ] **Step 1: Port `branch-filter.ts`** — Open `WEB/lib/db/branch-filter.ts`. Copy it into `src/modules/leads/branch-filter.ts` VERBATIM with these adaptations only: (a) change any `@/lib/db/schema` import to `../../db/schema`; (b) remove any `import "server-only"` if present; (c) keep the exported types (`BranchContext` etc.) and functions (`branchIdFilter`/`pushBranchAssigneeFilter`/`isBranchScoped`) identical. Do not change logic.

- [ ] **Step 2: Port `lead-triggers.ts`** — Open `WEB/server/lib/lead-triggers.ts`. Copy into `src/modules/leads/lead-triggers.ts`. Adaptations: (a) schema imports → `../../db/schema`; (b) it takes a `db`/`DbHandle` parameter already (no `@/lib/db` singleton import to remove — confirm; if it imports the singleton, change the functions to accept the injected `Db` as their first arg, matching the existing `evaluateAssignmentRules(db, orgId, leadId)` signature); (c) remove `server-only` if present; (d) keep `evaluateAssignmentRules`, `recalculateLeadScore`, `applySlaPolicy` signatures `(db, orgId, leadId)` IDENTICAL. The `Db` type comes from `../../db/drizzle.module`.

- [ ] **Step 3: Type-check** — `cd "D:/projects/personal/streamlineos-api" && pnpm exec tsc --noEmit -p tsconfig.json` → clean. If a schema symbol referenced by the triggers/branch-filter isn't exported by the synced schema, STOP and report (it would indicate a schema-sync gap, not something to patch around).

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(leads): port branch-filter and lead-triggers"`

> No unit test here — these are verbatim ports of already-proven logic; the parity script (Task 8) exercises them against the real DB. (Mirrors Plan A's verbatim cache-keys port.)

---

## Task 3: Minimal RateLimitService

**Files:** Create `src/common/ratelimit/rate-limit.service.ts`, `rate-limit.module.ts`, `rate-limit.service.spec.ts`

- [ ] **Step 1: Write the failing test** — `rate-limit.service.spec.ts`:
```ts
import { RateLimitService } from "./rate-limit.service";

describe("RateLimitService (in-memory fallback, no redis)", () => {
  const svc = new RateLimitService(null);

  it("allows up to the limit then blocks within the window", async () => {
    const id = "k1";
    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) results.push((await svc.check("api-key-ingest", id)).allowed);
    expect(results.slice(0, 5)).toEqual([true, true, true, true, true]);
    expect(results[5]).toBe(false);
  });

  it("isolates different identifiers", async () => {
    expect((await svc.check("api-key-ingest", "a")).allowed).toBe(true);
    expect((await svc.check("api-key-ingest", "b")).allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run it (fails)** — `pnpm jest rate-limit.service.spec.ts` → FAIL.

- [ ] **Step 3: Implement** — `rate-limit.service.ts`. Port the `api-key-ingest` tier semantics from `WEB/lib/rate-limit.ts` (open it to confirm the tier's window/limit — the test above assumes **5 requests / window**; if the WEB tier differs, MATCH the WEB numbers and update the test accordingly). Minimal implementation: a sliding-window counter in Upstash when available, else an in-memory `Map<string, number[]>` of timestamps.
```ts
import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "@upstash/redis";
import { REDIS } from "../cache/cache.service";

interface Tier { limit: number; windowSecs: number; }
const TIERS: Record<string, Tier> = {
  "api-key-ingest": { limit: 5, windowSecs: 60 },
};

export interface RateLimitResult { allowed: boolean; retryAfterSecs: number; }

@Injectable()
export class RateLimitService {
  private readonly mem = new Map<string, number[]>();
  constructor(@Inject(REDIS) private readonly redis: Redis | null) {}

  async check(tier: string, identifier: string): Promise<RateLimitResult> {
    const t = TIERS[tier];
    if (!t) return { allowed: true, retryAfterSecs: 0 };
    const now = Date.now();
    const windowMs = t.windowSecs * 1000;
    if (this.redis) {
      const key = `rl:${tier}:${identifier}`;
      try {
        const count = await this.redis.incr(key);
        if (count === 1) await this.redis.expire(key, t.windowSecs);
        if (count > t.limit) {
          const ttl = await this.redis.ttl(key);
          return { allowed: false, retryAfterSecs: ttl > 0 ? ttl : t.windowSecs };
        }
        return { allowed: true, retryAfterSecs: 0 };
      } catch {
        /* fall through to memory */
      }
    }
    const hits = (this.mem.get(identifier) ?? []).filter((ts) => now - ts < windowMs);
    if (hits.length >= t.limit) {
      const retryAfterSecs = Math.ceil((windowMs - (now - hits[0])) / 1000);
      this.mem.set(identifier, hits);
      return { allowed: false, retryAfterSecs };
    }
    hits.push(now);
    this.mem.set(identifier, hits);
    return { allowed: true, retryAfterSecs: 0 };
  }
}
```
> The empty `catch` here has no comment (project rule); the `/* fall through to memory */` above must be removed before commit — use a bare `catch {}` falling to the memory path. (Replace the comment line with nothing.)

`rate-limit.module.ts`:
```ts
import { Global, Module } from "@nestjs/common";
import { RateLimitService } from "./rate-limit.service";

@Global()
@Module({ providers: [RateLimitService], exports: [RateLimitService] })
export class RateLimitModule {}
```
(REDIS token is provided by the global CacheModule from Plan A.)

- [ ] **Step 4: Run it (passes)** — `pnpm jest rate-limit.service.spec.ts` → pass. `pnpm build` → clean.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(ratelimit): minimal rate-limit service (api-key-ingest tier)"`

---

## Task 4: ApiKeyGuard + @ApiKey decorator

**Files:** Create `src/common/auth/api-key.guard.ts`, `api-key.decorator.ts`, `api-key.guard.spec.ts`

- [ ] **Step 1: Define the decorator** — `api-key.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export interface ApiKeyContext { id: string; orgId: string; scopes: string[]; }

export const ApiKey = createParamDecorator((_d: unknown, ctx: ExecutionContext): ApiKeyContext => {
  const req = ctx.switchToHttp().getRequest<Request & { apiKey: ApiKeyContext }>();
  return req.apiKey;
});
```

- [ ] **Step 2: Write the failing guard test** — `api-key.guard.spec.ts` (uses a fake db + fake rate-limiter; verifies the auth decision logic without a real DB):
```ts
import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import { ApiKeyGuard } from "./api-key.guard";

function ctxWith(headers: Record<string, string>): { ctx: ExecutionContext; req: { headers: Record<string, string>; apiKey?: unknown } } {
  const req: { headers: Record<string, string>; apiKey?: unknown } = { headers };
  const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
  return { ctx, req };
}

function makeDb(row: Record<string, unknown> | undefined) {
  return { query: { apiKeys: { findFirst: jest.fn().mockResolvedValue(row) } }, update: () => ({ set: () => ({ where: () => Promise.resolve() }) }) } as unknown as import("../../db/drizzle.module").Db;
}
const rl = (allowed: boolean) => ({ check: jest.fn().mockResolvedValue({ allowed, retryAfterSecs: 30 }) }) as unknown as import("../ratelimit/rate-limit.service").RateLimitService;

describe("ApiKeyGuard", () => {
  it("401 when X-API-Key header missing", async () => {
    const g = new ApiKeyGuard(makeDb(undefined), rl(true));
    const { ctx } = ctxWith({});
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("401 when key not found / revoked", async () => {
    const g = new ApiKeyGuard(makeDb(undefined), rl(true));
    const { ctx } = ctxWith({ "x-api-key": "raw" });
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("401 when key expired", async () => {
    const row = { id: "k", orgId: "o", scopes: ["leads:write"], expiresAt: new Date(Date.now() - 1000) };
    const g = new ApiKeyGuard(makeDb(row), rl(true));
    const { ctx } = ctxWith({ "x-api-key": "raw" });
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("403 when scopes lack leads:write", async () => {
    const row = { id: "k", orgId: "o", scopes: ["other:read"], expiresAt: null };
    const g = new ApiKeyGuard(makeDb(row), rl(true));
    const { ctx } = ctxWith({ "x-api-key": "raw" });
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows and attaches req.apiKey when valid + scoped", async () => {
    const row = { id: "k", orgId: "o", scopes: ["leads:write"], expiresAt: null };
    const g = new ApiKeyGuard(makeDb(row), rl(true));
    const { ctx, req } = ctxWith({ "x-api-key": "raw" });
    await expect(g.canActivate(ctx)).resolves.toBe(true);
    expect(req.apiKey).toEqual({ id: "k", orgId: "o", scopes: ["leads:write"] });
  });

  it("hashes the raw key with sha256 for lookup", async () => {
    const row = { id: "k", orgId: "o", scopes: ["*"], expiresAt: null };
    const db = makeDb(row);
    const g = new ApiKeyGuard(db, rl(true));
    const { ctx } = ctxWith({ "x-api-key": "secret" });
    await g.canActivate(ctx);
    const expected = createHash("sha256").update("secret").digest("hex");
    const call = (db.query.apiKeys.findFirst as jest.Mock).mock.calls[0][0];
    expect(JSON.stringify(call)).toContain(expected);
  });
});
```

- [ ] **Step 3: Run it (fails)** — `pnpm jest api-key.guard.spec.ts` → FAIL.

- [ ] **Step 4: Implement the guard** — `api-key.guard.ts` (faithful to `WEB/app/api/leads/ingest/route.ts` lines 28–67):
```ts
import {
  CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { apiKeys } from "../../db/schema";
import { DRIZZLE } from "../../db/drizzle.constants";
import { type Db } from "../../db/drizzle.module";
import { RateLimitService } from "../ratelimit/rate-limit.service";
import type { ApiKeyContext } from "./api-key.decorator";

const REQUIRED_SCOPES = ["leads:write", "leads:*", "*"];

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { apiKey?: ApiKeyContext }>();
    const raw = req.headers["x-api-key"];
    const rawKey = Array.isArray(raw) ? raw[0] : raw;
    if (!rawKey) throw new UnauthorizedException("Missing X-API-Key header");

    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isRevoked, false)),
    });
    if (!apiKey) throw new UnauthorizedException("Invalid or revoked API key");
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException("API key has expired");
    }

    const rl = await this.rateLimit.check("api-key-ingest", apiKey.id);
    if (!rl.allowed) {
      throw new HttpException(
        { error: "Rate limit exceeded", retryAfterSecs: rl.retryAfterSecs },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (apiKey.scopes && apiKey.scopes.length > 0) {
      const hasScope = REQUIRED_SCOPES.some((s) => apiKey.scopes.includes(s));
      if (!hasScope) throw new ForbiddenException("API key does not have leads:write scope");
    }

    void this.db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id)).catch(() => undefined);

    req.apiKey = { id: apiKey.id, orgId: apiKey.orgId, scopes: apiKey.scopes ?? [] };
    return true;
  }
}
```
> Parity note: the WEB route returns 429 with a `Retry-After` HEADER; here we return 429 with `retryAfterSecs` in the body. If exact header parity matters for the ingest client, add a `Retry-After` header in a dedicated exception filter later — out of scope for shadow-verify (documented gap in the parity script).

- [ ] **Step 5: Run it (passes), build, commit** — `pnpm jest api-key.guard.spec.ts` → 6 pass. `pnpm build` → clean.
```bash
git add -A && git commit -m "feat(auth): ApiKeyGuard (X-API-Key, scopes, rate-limit) + @ApiKey decorator"
```

---

## Task 5: LeadsService (ported reads + create/update/delete)

**Files:** Create `src/modules/leads/leads.service.ts`

- [ ] **Step 1: Port the read queries** — Create `LeadsService` (`@Injectable`, `constructor(@Inject(DRIZZLE) private readonly db: Db, private readonly cache: CacheService, private readonly audit: AuditService)`). Add methods by porting from the WEB sources, keeping query logic byte-identical:
  - `listLeads(orgId, filters)` — port `getLeads` from `WEB/server/queries/leads-list.ts`. Strip `import "server-only"`; replace the module `db` with `this.db`; import branch-filter from `./branch-filter`; keep the `{ role, userId, branch: { role, branchId, userId } }` argument shape (the controller passes it).
  - `getBoard(orgId, opts)` — port `getLeadBoard`.
  - `getStats(orgId, filters)` — port `getLeadStats`.
  - `getLead(orgId, id)` — port `getLead` from `WEB/server/queries/leads-detail.ts`.

- [ ] **Step 2: Port the writes** — add to `LeadsService`, faithful to `WEB/app/api/leads/route.ts` POST (lines 94–206) and the `[leadId]` PATCH/DELETE, with the documented side-effect scope:
  - `create(orgId, userId, input)` — assignee-membership check (return a typed error the controller maps to 400); insert lead (exact `.values({...})` from the WEB POST); if assigned, insert the `notifications` row; run `evaluateAssignmentRules` (only when unassigned), `recalculateLeadScore`, `applySlaPolicy` from `./lead-triggers` (each wrapped in try/catch + logger like the source); `await this.cache.invalidatePattern(\`leads:*:${orgId}:*\`)`; `this.audit.log({ action: "lead.created", userId, orgId, targetId: String(newLead.id), targetType: "lead", metadata: {...} })`; return `newLead`. **DEFER** (do NOT port) the webhook dispatch, automation-engine dispatch, and the assignment email — add NOTHING in their place.
  - `update(orgId, id, input)` — port the `[leadId]` PATCH (update fields + `recalculateLeadScore`); audit `lead.updated`. Return the updated row or a not-found signal.
  - `remove(orgId, id)` — port the `[leadId]` DELETE (hard delete scoped by orgId); audit `lead.deleted`; return `{ success: true }`.
  - `ingestCreate(orgId, input)` — faithful to `ingest/route.ts` insert (source `"other"`, status `"NEW"`, name fallback `name ?? email ?? phone ?? "Unknown"`) + the three triggers via `Promise.allSettled`; return `{ id }`.

- [ ] **Step 3: Type-check + build** — `pnpm exec tsc --noEmit` and `pnpm build` → clean. This is the main correctness gate for the ported queries (they compile against the real synced schema). If a ported query references a query-builder relation not present in the synced schema, STOP and report (schema-sync gap).

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(leads): leads service (ported reads + create/update/delete/ingest)"`

> No DB-backed unit tests here — the data path is verified by the parity script (Task 8) against the real shared DB. The compile against the real schema + the parity diff are the gates.

---

## Task 6: LeadsController + module wiring + auth/RBAC e2e

**Files:** Create `src/modules/leads/leads.controller.ts`, `leads.module.ts`, `leads.controller.e2e-spec.ts`; modify `src/app.module.ts`

- [ ] **Step 1: Write the controller** — `leads.controller.ts`. All routes under `@Controller("leads")` with `@UseGuards(JwtAuthGuard, AbilityGuard)`. Use `@CheckAbility` ONLY where the WEB route used `withAbility` (list=read, create=create, delete=delete); the get/update/board/stats WEB routes used `withAuth` (auth-only, no ability) — replicate that (no `@CheckAbility` on those). Use `new ZodValidationPipe(schema)` for body/query. Build the branch context from `@CurrentUser()`.
```ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { AbilityGuard } from "../../common/rbac/ability.guard";
import { CheckAbility } from "../../common/rbac/check-ability.decorator";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import type { CurrentUserContext } from "../../common/auth/backend-claims";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { LeadsService } from "./leads.service";
import { createSchema, listSchema, updateSchema, type CreateInput, type ListInput, type UpdateInput } from "./dto/lead.schemas";

@Controller("leads")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @CheckAbility("read", "crm:leads")
  list(@Query(new ZodValidationPipe(listSchema)) filters: ListInput, @CurrentUser() u: CurrentUserContext) {
    return this.leads.listLeads(u.orgId, {
      ...filters,
      role: u.role || undefined,
      userId: u.userId,
      branch: { role: u.role, branchId: u.branchId, userId: u.userId },
    });
  }

  @Post()
  @CheckAbility("create", "crm:leads")
  create(@Body(new ZodValidationPipe(createSchema)) body: CreateInput, @CurrentUser() u: CurrentUserContext) {
    return this.leads.create(u.orgId, u.userId, body);
  }

  @Get("board")
  board(@CurrentUser() u: CurrentUserContext) {
    return this.leads.getBoard(u.orgId, { role: u.role, branchId: u.branchId, userId: u.userId });
  }

  @Get("stats")
  stats(@Query() query: Record<string, string>, @CurrentUser() u: CurrentUserContext) {
    return this.leads.getStats(u.orgId, { ...query, role: u.role, userId: u.userId, branch: { role: u.role, branchId: u.branchId, userId: u.userId } });
  }

  @Get(":leadId")
  get(@Param("leadId", ParseIntPipe) leadId: number, @CurrentUser() u: CurrentUserContext) {
    return this.leads.getLead(u.orgId, leadId);
  }

  @Patch(":leadId")
  update(@Param("leadId", ParseIntPipe) leadId: number, @Body(new ZodValidationPipe(updateSchema)) body: UpdateInput, @CurrentUser() u: CurrentUserContext) {
    return this.leads.update(u.orgId, leadId, body);
  }

  @Delete(":leadId")
  @CheckAbility("delete", "crm:leads")
  remove(@Param("leadId", ParseIntPipe) leadId: number, @CurrentUser() u: CurrentUserContext) {
    return this.leads.remove(u.orgId, leadId);
  }
}
```
> Implementer: align `getStats`/`getBoard`/`listLeads`/`getLead` argument shapes with the EXACT signatures of the ported service methods (Task 5). If `getLeadStats` in the WEB source takes `(orgId, { dateFrom, dateTo, role, userId, branch })`, shape the controller call to match. The `not-found` returns from `getLead`/`update` must be mapped to a `NotFoundException` so the filter yields `404 { error: "Lead not found" }` (match the WEB route's 404 message).

- [ ] **Step 2: Write the auth/RBAC e2e (no DB needed)** — `leads.controller.e2e-spec.ts`. These assert the guard layer rejects BEFORE the handler touches the DB, so no DB is required:
```ts
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { AllExceptionsFilter } from "../../common/http/all-exceptions.filter";
import { signToken } from "../../../test/helpers/sign-token";

describe("Leads auth/RBAC (e2e)", () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgres://u:p@localhost:5432/db";
    process.env.BACKEND_JWT_SECRET ??= "x".repeat(44);
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });
  afterAll(async () => app.close());

  it("401 on GET /leads without a token", async () => {
    const res = await request(app.getHttpServer()).get("/leads");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("403 on GET /leads without crm:leads read", async () => {
    const token = await signToken({ permissions: [], enabledModules: [] });
    const res = await request(app.getHttpServer()).get("/leads").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: "Forbidden", code: "RBAC_DENIED", verb: "read", subject: "crm:leads" });
  });

  it("403 on DELETE /leads/1 without crm:leads delete", async () => {
    const token = await signToken({ permissions: ["crm:leads:read"], enabledModules: [] });
    const res = await request(app.getHttpServer()).delete("/leads/1").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: "RBAC_DENIED", verb: "delete", subject: "crm:leads" });
  });
});
```
> Note: do NOT add a test that lets a request reach the handler (that would hit the dummy DB and fail). The three above all short-circuit in the guards.

- [ ] **Step 3: Wire the module** — `leads.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({ controllers: [LeadsController], providers: [LeadsService] })
export class LeadsModule {}
```
Add `LeadsModule` and `RateLimitModule` to `AppModule` imports.

- [ ] **Step 4: Run e2e + build** — `pnpm jest --config ./jest-e2e.json src/modules/leads/leads.controller.e2e-spec.ts` → 3 pass. `pnpm build` → clean. Re-run the full e2e (`pnpm test:e2e`) to ensure no regression to /health or /me.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(leads): leads controller + module wiring + auth/RBAC e2e"`

---

## Task 7: Ingest controller (API-key)

**Files:** Create `src/modules/leads/leads.ingest.controller.ts`, `leads.ingest.e2e-spec.ts`; modify `leads.module.ts`

- [ ] **Step 1: Write the ingest controller** — `leads.ingest.controller.ts`:
```ts
import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiKeyGuard } from "../../common/auth/api-key.guard";
import { ApiKey, type ApiKeyContext } from "../../common/auth/api-key.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { BadRequestException } from "@nestjs/common";
import { ingestSchema, type IngestInput } from "./dto/lead.schemas";
import { LeadsService } from "./leads.service";

@Controller("leads/ingest")
@UseGuards(ApiKeyGuard)
export class LeadsIngestController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @HttpCode(201)
  async ingest(@Body(new ZodValidationPipe(ingestSchema)) body: IngestInput, @ApiKey() key: ApiKeyContext) {
    if (!body.name && !body.email && !body.phone) {
      throw new BadRequestException("At least one of name, email, or phone is required");
    }
    return this.leads.ingestCreate(key.orgId, body);
  }
}
```
> Parity gap: the WEB route returns 422 for both bad-JSON-shape and the missing-name/email/phone case. Here the ZodValidationPipe yields 400 for shape errors and the explicit check yields 400 for missing fields (BadRequestException → `{ error }`). If exact 422 parity matters, throw an `HttpException(msg, 422)` instead of `BadRequestException`. Decide and document in the parity script; for shadow-verify, note the status-code difference.

- [ ] **Step 2: Write the ingest e2e (no DB needed — rejection paths)** — `leads.ingest.e2e-spec.ts`:
```ts
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { AllExceptionsFilter } from "../../common/http/all-exceptions.filter";

describe("Leads ingest (e2e)", () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgres://u:p@localhost:5432/db";
    process.env.BACKEND_JWT_SECRET ??= "x".repeat(44);
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });
  afterAll(async () => app.close());

  it("401 without X-API-Key", async () => {
    const res = await request(app.getHttpServer()).post("/leads/ingest").send({ name: "x" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Missing X-API-Key header" });
  });
});
```
> Only the missing-header path is DB-free (the guard rejects before any DB lookup). The invalid-key path requires a DB query, so it belongs in the parity script.

- [ ] **Step 3: Register the controller** — add `LeadsIngestController` to `leads.module.ts` controllers.

- [ ] **Step 4: Run e2e + build** — ingest e2e passes; `pnpm build` clean; `pnpm test:e2e` (all) green.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(leads): ingest controller (API-key)"`

---

## Task 8: Parity verification harness + docs (OPERATOR-run)

**Files:** Create `scripts/parity-leads.mjs`; update `MIGRATION.md`

- [ ] **Step 1: Write the parity script** — `scripts/parity-leads.mjs`. A Node script (no test framework) that the OPERATOR runs with both servers up and real env. It:
  1. Reads `WEB_BASE` (e.g. `http://localhost:1000/api`), `API_BASE` (`http://localhost:1500`), and a `BACKEND_TOKEN` (obtained from the web app's `/api/auth/backend-token` while signed in) from env/argv.
  2. For each read endpoint (`/leads?limit=5`, `/leads/board`, `/leads/stats`, `/leads/:id` for a known id), GETs from BOTH bases with the bearer token and **deep-diffs the JSON** (ignoring volatile fields like timestamps if needed), printing PASS/DIFF per endpoint.
  3. For `POST /leads` and `POST /leads/ingest`: optionally create against the API and confirm the row appears via the WEB read (same DB), then clean up — gated behind a `--write` flag so a read-only run is safe.
  4. Exits non-zero if any read diff is found.
Provide the full script content (deep-equal helper inline; use global `fetch`). Keep it dependency-free.

- [ ] **Step 2: Document the operator workflow in `MIGRATION.md`** — update the CRM Leads row and add a "How to shadow-verify" section:
  - Set `BACKEND_JWT_SECRET` (same in both), `DATABASE_URL` (same Neon DB), `CORS_ORIGINS=http://localhost:1000` in the API `.env`.
  - `pnpm sync:schema && pnpm start:dev` (API on :1500); run the web app on :1000.
  - Sign in to the web app; grab a token from `GET /api/auth/backend-token`.
  - `node scripts/parity-leads.mjs` (read-only) → expect all PASS.
  - Known shadow-only gaps (documented, acceptable for this phase): `POST /leads` omits webhook/automation/assignment-email; ingest 429 uses a body field not a `Retry-After` header; ingest validation errors are 400 not 422. None affect read parity.
  - Mark the pilot "verified" once read parity passes and a `--write` smoke create round-trips.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "test(leads): parity verification script + shadow-verify docs"`

> This task's code is committable by an implementer, but the actual PARITY RUN is performed by the operator (needs real env + both servers + a real org's data). Do not mark the pilot complete until the operator reports parity PASS.

---

## Self-review (completed during planning)

**Scope coverage:** 8 in-scope endpoints → list/create/get/update/delete/board/stats in `LeadsController` (T6), ingest in `LeadsIngestController` (T7). Kernel additions: ApiKeyGuard (T4) + RateLimitService (T3) — the pieces deferred from Plan A. Supporting ports: DTOs (T1), branch-filter + triggers (T2), service (T5). Verification: auth/RBAC e2e (T6/T7, DB-free) + operator parity script (T8). Deferred items (status/assign/distribute/import/export/merge/score/activities/timeline/analytics/Inngest/**cutover**) are explicitly out of scope and listed in the header.

**Placeholder scan:** No TBDs. The "port from `<WEB file>` with adaptations X" instructions (T2, T5) are precise port directives (the implementer reads the named source), mirroring Plan A's verbatim cache-keys/audit-columns approach — not placeholders. The DB-backed data path is intentionally verified by the parity script, not by fabricated unit tests, because no test DB is available to subagents (stated explicitly).

**Type/contract consistency:** Controller (T6) call shapes must match the ported service signatures (T5) — flagged inline with a "align signatures" instruction. `ApiKeyContext` defined in T4 decorator, consumed by T4 guard + T7 controller. `signToken` (Plan A) reused in T6/T7 e2e. Cache key `leads:list:${orgId}:${userId}:${role}:${branchId??""}:${hash}` and invalidation pattern `leads:*:${orgId}:*` match the WEB source exactly (Plan A's CacheService shares the keyspace).

**Known parity gaps (intentional, documented in T8):** create side-effects (webhook/automation/email) deferred; ingest 429 header vs body; ingest 400 vs 422. All are non-data-path and acceptable for a shadow (non-cutover) pilot.

---

## After this plan

- **Operator runs the parity script** → confirm read parity + a write smoke test.
- **Plan B2 (cutover):** add per-prefix routing to `WEB/lib/api-client.ts` (route only the verified `/leads/*` paths to `NEXT_PUBLIC_API_URL`, everything else same-origin), then delete the migrated Next routes + their now-dead server queries.
- **Plan B3 (integration-heavy):** status-transition (port the conversion writes to clients/tickets/notifications via the shared schema), assign (email+AI), distribute (HR leaves), import/export, merge, score-explanation, and the lead Inngest crons.
