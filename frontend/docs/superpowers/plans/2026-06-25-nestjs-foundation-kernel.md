# NestJS Foundation + Shared Kernel + Auth Bridge — Implementation Plan (Plan A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a standalone NestJS service `streamlineos-api` on **port 1500** that verifies the existing NextAuth identity (via a minted backend JWT), enforces the same CASL RBAC, shares the Neon DB and Upstash Redis, and exposes a proving `/me` endpoint — without cutting over any product domain yet.

**Architecture:** A persistent Node/NestJS process is a pure **resource server**. NextAuth stays the sole auth authority in the existing Next.js app; it mints a short-lived HS256 backend token (shared `BACKEND_JWT_SECRET`) that the frontend sends as `Authorization: Bearer`. NestJS verifies the token with `jose`, builds a CASL ability from the claims, and reuses ported copies of the existing response/error, cache, pagination, and audit helpers. Success responses are returned **raw** (no envelope) to stay byte-compatible with the current API; only errors use `{ error }`.

**Tech Stack:** NestJS 10, TypeScript (strict), Drizzle ORM + postgres.js, `jose` (JWT), `@casl/ability`, `@upstash/redis`, `zod`, Jest + supertest. Separate git repo at `D:\projects\personal\streamlineos-api` (sibling of the web repo `D:\projects\personal\Streamlineos`).

**Source parity references (web repo):** `lib/api/helpers.ts` (response/RBAC wrappers), `lib/abilities.ts` (`defineAbilityFor`), `lib/billing/plan-modules.ts` (`moduleFromPermission`, `Module`), `lib/db.ts` (pool), `lib/cache.ts` (cache + `CACHE_KEYS`/`CACHE_TTL`), `lib/env.ts` (env validation), `lib/logger.ts`, `types/next-auth.d.ts` (claim shape).

**Conventions used in every command below:**
- `WEB = D:\projects\personal\Streamlineos`
- `API = D:\projects\personal\streamlineos-api`
- Shell is Git Bash (POSIX). Run API commands from `$API`.

---

## File structure (created by this plan)

```
streamlineos-api/
  package.json  tsconfig.json  tsconfig.build.json  nest-cli.json  .gitignore  .env.example  Dockerfile  README.md  jest-e2e.json
  scripts/sync-schema.mjs                 # copies WEB lib/db/schema → src/db/schema, fails CI on drift
  src/
    main.ts                               # bootstrap :1500, helmet, CORS allowlist, global filter
    app.module.ts
    config/
      env.validation.ts                   # zod schema (port of lib/env.ts server vars + BACKEND_JWT_SECRET + CORS)
      config.module.ts                    # @Global ConfigModule providing typed AppConfig
    db/
      schema/                             # SYNCED copy of WEB lib/db/schema (do not hand-edit)
      drizzle.module.ts                   # @Global provider DRIZZLE
      drizzle.constants.ts
    common/
      logger/logger.service.ts            # port of lib/logger.ts
      http/all-exceptions.filter.ts       # { error } shape + status codes + Zod + structured bodies
      http/api-exceptions.ts              # AbilityDeniedException, ModuleDisabledException
      pipes/zod-validation.pipe.ts        # parseBody/parseQuery equivalent
      pagination/pagination.ts            # paginateOffset + buildListResponse
      cache/cache.module.ts  cache/cache.service.ts  cache/cache-keys.ts   # port of lib/cache.ts
      audit/audit.module.ts  audit/audit.service.ts                        # port of lib/audit-log.ts (write path)
      auth/
        backend-claims.ts                 # BackendClaims type + CurrentUserContext
        jwt-auth.guard.ts                 # verify Bearer token via jose
        current-user.decorator.ts         # @CurrentUser()
        public.decorator.ts               # @Public() opt-out
      rbac/
        abilities.factory.ts              # port of defineAbilityFor + moduleFromPermission
        ability.guard.ts                  # enforces @CheckAbility
        check-ability.decorator.ts        # @CheckAbility(verb, subject)
        module.guard.ts                   # enforces @RequireModule
        require-module.decorator.ts       # @RequireModule(module)
    health/health.controller.ts           # GET /health, GET /health/ready (SELECT 1)
    me/me.controller.ts                   # GET /me, GET /me/can  (proves auth + RBAC)
    me/me.e2e-spec.ts
  test/
    helpers/sign-token.ts                 # test util: mint a backend token with jose
    app.e2e-spec.ts
```

**Web repo changes (this plan):**
- Create `WEB/app/api/auth/backend-token/route.ts` — mint endpoint.
- Modify `WEB/lib/api-client.ts` — configurable base URL + Bearer attach + 401 refresh (defaults to same-origin `/api`, so nothing changes until opted in).
- Add `jose` dependency to WEB (already transitively present via next-auth; pin it directly).

---

## Task 1: Scaffold the repo skeleton

**Files:**
- Create: `$API/package.json`, `$API/tsconfig.json`, `$API/tsconfig.build.json`, `$API/nest-cli.json`, `$API/.gitignore`, `$API/jest-e2e.json`, `$API/.env.example`

- [ ] **Step 1: Create the project directory and init git**

Run:
```bash
mkdir -p "D:/projects/personal/streamlineos-api" && cd "D:/projects/personal/streamlineos-api" && git init
```
Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "streamlineos-api",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.18.0",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main.js",
    "sync:schema": "node scripts/sync-schema.mjs",
    "check:schema": "node scripts/sync-schema.mjs --check",
    "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\"",
    "test": "jest",
    "test:e2e": "jest --config ./jest-e2e.json"
  },
  "dependencies": {
    "@casl/ability": "^7.0.0",
    "@nestjs/common": "^10.4.15",
    "@nestjs/core": "^10.4.15",
    "@nestjs/platform-express": "^10.4.15",
    "@upstash/redis": "^1.37.0",
    "drizzle-orm": "^0.45.2",
    "helmet": "^8.0.0",
    "jose": "^5.9.6",
    "postgres": "^3.4.7",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.9",
    "@nestjs/schematics": "^10.2.3",
    "@nestjs/testing": "^10.4.15",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^20.17.0",
    "@types/supertest": "^6.0.2",
    "eslint": "^9.0.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.6.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "moduleNameMapper": { "^src/(.*)$": "<rootDir>/$1" }
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": { "src/*": ["src/*"] },
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

`tsconfig.build.json`:
```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

`nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

- [ ] **Step 4: Write `.gitignore`, `jest-e2e.json`, `.env.example`**

`.gitignore`:
```
node_modules
dist
coverage
.env
*.log
```

`jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": { "^src/(.*)$": "<rootDir>/src/$1" }
}
```

`.env.example`:
```
NODE_ENV=development
PORT=1500
DATABASE_URL=postgres://user:pass@host.neon.tech/db?sslmode=require
BACKEND_JWT_SECRET=replace-with-a-44+char-base64-secret-shared-with-web
CORS_ORIGINS=http://localhost:1000
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 5: Install and commit**

Run:
```bash
cd "$API" && pnpm install
```
Expected: dependencies install, lockfile written.

```bash
cd "$API" && git add -A && git commit -m "chore: scaffold streamlineos-api NestJS skeleton"
```

---

## Task 2: Config module with Zod env validation

**Files:**
- Create: `$API/src/config/env.validation.ts`, `$API/src/config/config.module.ts`
- Test: `$API/src/config/env.validation.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/config/env.validation.spec.ts`:
```ts
import { validateEnv } from "./env.validation";

describe("validateEnv", () => {
  const base = {
    NODE_ENV: "test",
    DATABASE_URL: "postgres://u:p@localhost:5432/db",
    BACKEND_JWT_SECRET: "x".repeat(44),
    CORS_ORIGINS: "http://localhost:1000",
  };

  it("parses a valid environment", () => {
    const cfg = validateEnv(base);
    expect(cfg.PORT).toBe(1500);
    expect(cfg.corsOrigins).toEqual(["http://localhost:1000"]);
  });

  it("throws when BACKEND_JWT_SECRET is too short", () => {
    expect(() => validateEnv({ ...base, BACKEND_JWT_SECRET: "short" })).toThrow(
      /BACKEND_JWT_SECRET/,
    );
  });

  it("throws when DATABASE_URL is missing", () => {
    const { DATABASE_URL, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "$API" && pnpm jest src/config/env.validation.spec.ts`
Expected: FAIL — cannot find module `./env.validation`.

- [ ] **Step 3: Write `env.validation.ts`**

```ts
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(1500),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BACKEND_JWT_SECRET: z
    .string()
    .min(44, "BACKEND_JWT_SECRET must be at least 44 characters (256-bit base64)"),
  CORS_ORIGINS: z.string().default("http://localhost:1000"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema> & { corsOrigins: string[] };

export function validateEnv(source: Record<string, unknown> = process.env): AppConfig {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`[env] Validation failed:\n${issues}`);
  }
  const corsOrigins = result.data.CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { ...result.data, corsOrigins };
}
```

- [ ] **Step 4: Write `config.module.ts`**

```ts
import { Global, Module } from "@nestjs/common";
import { validateEnv, type AppConfig } from "./env.validation";

export const APP_CONFIG = "APP_CONFIG";

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: (): AppConfig => validateEnv() }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
```

- [ ] **Step 5: Run test to verify it passes, then commit**

Run: `cd "$API" && pnpm jest src/config/env.validation.spec.ts`
Expected: PASS (3 tests).

```bash
cd "$API" && git add -A && git commit -m "feat(config): zod-validated typed env config module"
```

---

## Task 3: Bootstrap + health controller (boots on :1500)

**Files:**
- Create: `$API/src/main.ts`, `$API/src/app.module.ts`, `$API/src/health/health.controller.ts`
- Test: `$API/test/app.e2e-spec.ts`

- [ ] **Step 1: Write the failing e2e test**

`test/app.e2e-spec.ts`:
```ts
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "src/app.module";

describe("App (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgres://u:p@localhost:5432/db";
    process.env.BACKEND_JWT_SECRET ??= "x".repeat(44);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns 200 ok", async () => {
    const res = await request(app.getHttpServer()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "$API" && pnpm jest --config ./jest-e2e.json test/app.e2e-spec.ts`
Expected: FAIL — cannot find `src/app.module`.

- [ ] **Step 3: Write `health.controller.ts` and `app.module.ts`**

`src/health/health.controller.ts`:
```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  health(): { status: "ok" } {
    return { status: "ok" };
  }
}
```

`src/app.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 4: Write `main.ts`**

```ts
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { validateEnv } from "./config/env.validation";

async function bootstrap(): Promise<void> {
  const config = validateEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.use(helmet());
  app.enableCors({ origin: config.corsOrigins, credentials: false });
  app.enableShutdownHooks();
  await app.listen(config.PORT);
}

void bootstrap();
```

- [ ] **Step 5: Run test, verify boot, commit**

Run: `cd "$API" && pnpm jest --config ./jest-e2e.json test/app.e2e-spec.ts`
Expected: PASS.

Run: `cd "$API" && pnpm build`
Expected: compiles with no errors.

```bash
cd "$API" && git add -A && git commit -m "feat: bootstrap NestJS app on :1500 with health endpoint"
```

---

## Task 4: Schema sync + Drizzle module + readiness probe

**Files:**
- Create: `$API/scripts/sync-schema.mjs`, `$API/src/db/drizzle.constants.ts`, `$API/src/db/drizzle.module.ts`
- Modify: `$API/src/app.module.ts`, `$API/src/health/health.controller.ts`

- [ ] **Step 1: Write the schema-sync script**

`scripts/sync-schema.mjs`:
```js
import { cpSync, rmSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const WEB_SCHEMA = resolve(process.cwd(), "..", "Streamlineos", "lib", "db", "schema");
const DEST = resolve(process.cwd(), "src", "db", "schema");
const check = process.argv.includes("--check");

if (!existsSync(WEB_SCHEMA)) {
  console.error(`[sync-schema] web schema not found at ${WEB_SCHEMA}`);
  process.exit(1);
}

function listFiles(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : [p.slice(base.length + 1)];
  });
}

if (check) {
  if (!existsSync(DEST)) {
    console.error("[sync-schema] dest missing; run `pnpm sync:schema`");
    process.exit(1);
  }
  const src = listFiles(WEB_SCHEMA).sort();
  const dst = listFiles(DEST).sort();
  let drift = JSON.stringify(src) !== JSON.stringify(dst);
  for (const f of src) {
    if (!drift && readFileSync(join(WEB_SCHEMA, f), "utf8") !== readFileSync(join(DEST, f), "utf8")) {
      drift = true;
    }
  }
  if (drift) {
    console.error("[sync-schema] DRIFT detected. Run `pnpm sync:schema` and commit.");
    process.exit(1);
  }
  console.log("[sync-schema] schema in sync.");
} else {
  rmSync(DEST, { recursive: true, force: true });
  cpSync(WEB_SCHEMA, DEST, { recursive: true });
  console.log(`[sync-schema] copied ${WEB_SCHEMA} -> ${DEST}`);
}
```

- [ ] **Step 2: Run the sync and verify the schema compiles standalone**

Run:
```bash
cd "$API" && pnpm sync:schema && pnpm exec tsc --noEmit -p tsconfig.json
```
Expected: `copied ... -> .../src/db/schema` and a clean type-check. If the schema imports any path outside `lib/db/schema`, STOP and report it — the schema dir must be self-contained (it is the drizzle.config root in the web repo). Add `src/db/schema/` to git (it is committed, not generated at build time).

- [ ] **Step 3: Write the Drizzle provider (persistent-server pool)**

`src/db/drizzle.constants.ts`:
```ts
export const DRIZZLE = "DRIZZLE";
```

`src/db/drizzle.module.ts`:
```ts
import { Global, Module, type OnApplicationShutdown } from "@nestjs/common";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DRIZZLE } from "./drizzle.constants";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

function normalizeDatabaseUrl(url: string): string {
  if (!/\.neon\.tech/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url.replace(/[&?]channel_binding=[^&]*/g, "").replace(/\?&/, "?");
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (): Db & { __client: ReturnType<typeof postgres> } => {
        const raw = process.env.DATABASE_URL;
        if (!raw) throw new Error("DATABASE_URL is required");
        const connectionString = normalizeDatabaseUrl(raw);
        const isNeon = /\.neon\.tech/i.test(connectionString);
        const isDev = process.env.NODE_ENV === "development";
        const client = postgres(connectionString, {
          prepare: false,
          max: isDev ? 10 : 75,
          idle_timeout: isDev ? 20 : 60,
          connect_timeout: isNeon ? 60 : 30,
          max_lifetime: 60 * 30,
          ...(isNeon ? { ssl: "require" as const } : {}),
        });
        const db = drizzle(client, { schema }) as Db;
        return Object.assign(db, { __client: client });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {}
}
```

> Note: the persistent pool uses `max: 75` (not the serverless `15`) — a real scaling win from leaving Vercel functions. Pool drain on shutdown is handled by postgres.js `max_lifetime`/`idle_timeout`; explicit `client.end()` is added in Task 13 once a graceful-shutdown hook owns the client reference.

- [ ] **Step 4: Add the readiness probe (SELECT 1) and wire DrizzleModule**

Modify `src/app.module.ts` to import `DrizzleModule`:
```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { DrizzleModule } from "./db/drizzle.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [ConfigModule, DrizzleModule],
  controllers: [HealthController],
})
export class AppModule {}
```

Replace `src/health/health.controller.ts`:
```ts
import { Controller, Get, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DRIZZLE, type Db } from "../db/drizzle.module";

@Controller("health")
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  @Get()
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  async ready(): Promise<{ status: "ready" | "degraded" }> {
    try {
      await this.db.execute(sql`select 1`);
      return { status: "ready" };
    } catch {
      return { status: "degraded" };
    }
  }
}
```

Fix the import path: `DRIZZLE` and `Db` are exported from `../db/drizzle.module` and `../db/drizzle.constants`. Import `Db` from `../db/drizzle.module` and `DRIZZLE` from `../db/drizzle.constants`:
```ts
import { DRIZZLE } from "../db/drizzle.constants";
import { type Db } from "../db/drizzle.module";
```

- [ ] **Step 5: Build, commit**

Run: `cd "$API" && pnpm build`
Expected: clean compile.

```bash
cd "$API" && git add -A && git commit -m "feat(db): synced Drizzle schema, persistent pool, readiness probe"
```

---

## Task 5: Error filter ({ error } parity) + typed API exceptions

**Files:**
- Create: `$API/src/common/logger/logger.service.ts`, `$API/src/common/http/api-exceptions.ts`, `$API/src/common/http/all-exceptions.filter.ts`
- Test: `$API/src/common/http/all-exceptions.filter.spec.ts`

- [ ] **Step 1: Write the logger (port of lib/logger.ts)**

`src/common/logger/logger.service.ts`:
```ts
type LogLevel = "debug" | "info" | "warn" | "error";
const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const current: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

function emit(level: LogLevel, message: string, meta?: unknown): void {
  if (LEVELS[level] < LEVELS[current]) return;
  const base = { timestamp: new Date().toISOString(), level, message };
  const line = JSON.stringify(meta !== undefined ? { ...base, meta } : base);
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const logger = {
  debug: (m: string, meta?: unknown) => emit("debug", m, meta),
  info: (m: string, meta?: unknown) => emit("info", m, meta),
  warn: (m: string, meta?: unknown) => emit("warn", m, meta),
  error: (m: string, meta?: unknown) => emit("error", m, meta),
};
```

- [ ] **Step 2: Write typed exceptions that carry structured bodies**

`src/common/http/api-exceptions.ts`:
```ts
import { HttpException, HttpStatus } from "@nestjs/common";
import type { AbilityVerb, AbilitySubject } from "../rbac/check-ability.decorator";

export class AbilityDeniedException extends HttpException {
  constructor(verb: AbilityVerb, subject: AbilitySubject) {
    super({ error: "Forbidden", code: "RBAC_DENIED", verb, subject }, HttpStatus.FORBIDDEN);
  }
}

export class ModuleDisabledException extends HttpException {
  constructor(module: string) {
    super(
      { error: "Module not available on this plan", code: "MODULE_DISABLED", module },
      HttpStatus.NOT_FOUND,
    );
  }
}
```

> `AbilityVerb`/`AbilitySubject` are defined in Task 7's `check-ability.decorator.ts`. If executing tasks out of order, create that file first (its type block is self-contained).

- [ ] **Step 3: Write the failing filter test**

`src/common/http/all-exceptions.filter.spec.ts`:
```ts
import { ArgumentsHost, BadRequestException, HttpException, NotFoundException } from "@nestjs/common";
import { ZodError, z } from "zod";
import { AllExceptionsFilter } from "./all-exceptions.filter";

function hostWith(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: "GET", url: "/x" }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe("AllExceptionsFilter", () => {
  const filter = new AllExceptionsFilter();

  it("maps a string HttpException to { error }", () => {
    const { host, json, status } = hostWith();
    filter.catch(new NotFoundException("Deal not found"), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "Deal not found" });
  });

  it("preserves structured HttpException bodies", () => {
    const { host, json, status } = hostWith();
    filter.catch(new HttpException({ error: "Forbidden", code: "RBAC_DENIED" }, 403), host);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden", code: "RBAC_DENIED" });
  });

  it("maps a raw ZodError to a 400 with detail", () => {
    const { host, json, status } = hostWith();
    const zerr = (() => {
      try {
        z.object({ a: z.string() }).parse({});
        return new ZodError([]);
      } catch (e) {
        return e as ZodError;
      }
    })();
    filter.catch(zerr, host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error).toMatch(/^Validation failed:/);
  });

  it("maps unknown errors to a 500 generic message", () => {
    const { host, json, status } = hostWith();
    filter.catch(new Error("boom"), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "An unexpected error occurred" });
  });

  it("passes BadRequestException message through", () => {
    const { host, json, status } = hostWith();
    filter.catch(new BadRequestException("Validation failed: a: Required"), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "Validation failed: a: Required" });
  });
});
```

- [ ] **Step 4: Run it (fails), then write the filter**

Run: `cd "$API" && pnpm jest all-exceptions.filter.spec.ts`
Expected: FAIL — cannot find `./all-exceptions.filter`.

`src/common/http/all-exceptions.filter.ts`:
```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";
import { logger } from "../logger/logger.service";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ZodError) {
      const detail = exception.issues
        .map((i) => `${i.path.length ? i.path.join(".") : "body"}: ${i.message}`)
        .join("; ");
      res.status(HttpStatus.BAD_REQUEST).json({ error: `Validation failed: ${detail}` });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        res.status(status).json({ error: body });
        return;
      }
      const obj = body as Record<string, unknown>;
      if (typeof obj.error === "string") {
        res.status(status).json(obj);
        return;
      }
      const message = obj.message;
      const error = Array.isArray(message) ? message.join("; ") : String(message ?? "Error");
      res.status(status).json({ error });
      return;
    }

    logger.error("Unhandled exception", { error: exception });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "An unexpected error occurred" });
  }
}
```

- [ ] **Step 5: Register globally, run tests, commit**

In `src/main.ts`, after `app.enableCors(...)` add:
```ts
import { AllExceptionsFilter } from "./common/http/all-exceptions.filter";
// ...
app.useGlobalFilters(new AllExceptionsFilter());
```

Run: `cd "$API" && pnpm jest all-exceptions.filter.spec.ts`
Expected: PASS (5 tests).

```bash
cd "$API" && git add -A && git commit -m "feat(http): global exception filter with { error } parity"
```

---

## Task 6: Zod validation pipe (parseBody/parseQuery equivalent)

**Files:**
- Create: `$API/src/common/pipes/zod-validation.pipe.ts`
- Test: `$API/src/common/pipes/zod-validation.pipe.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/common/pipes/zod-validation.pipe.spec.ts`:
```ts
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

const schema = z.object({ page: z.coerce.number().min(1), q: z.string().optional() });

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(schema);

  it("parses and coerces valid input", () => {
    expect(pipe.transform({ page: "2" })).toEqual({ page: 2 });
  });

  it("throws a ZodError on invalid input", () => {
    expect(() => pipe.transform({ page: "0" })).toThrow();
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `cd "$API" && pnpm jest zod-validation.pipe.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the pipe**

`src/common/pipes/zod-validation.pipe.ts`:
```ts
import { PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}
```

> The thrown `ZodError` is converted to the `Validation failed: ...` 400 body by `AllExceptionsFilter` (Task 5) — identical to the web app's `withAuth` catch.

- [ ] **Step 4: Run it (passes)**

Run: `cd "$API" && pnpm jest zod-validation.pipe.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd "$API" && git add -A && git commit -m "feat(http): zod validation pipe"
```

---

## Task 7: Backend JWT auth — claims, guard, @CurrentUser, ability/module decorators

**Files:**
- Create: `$API/src/common/auth/backend-claims.ts`, `$API/src/common/auth/jwt-auth.guard.ts`, `$API/src/common/auth/current-user.decorator.ts`, `$API/src/common/auth/public.decorator.ts`, `$API/src/common/rbac/check-ability.decorator.ts`, `$API/src/common/rbac/require-module.decorator.ts`
- Test util: `$API/test/helpers/sign-token.ts`
- Test: `$API/src/common/auth/jwt-auth.guard.spec.ts`

- [ ] **Step 1: Define claim/context types and the ability/module decorators**

`src/common/auth/backend-claims.ts`:
```ts
export interface BackendClaims {
  sub: string;                 // userId
  orgId: string;
  branchId: number | null;
  role: string;
  permissions: string[];
  enabledModules: string[];
  plan: string | null;
  isPlatformAdmin: boolean;
  isOrgOwner: boolean;
  sessionId: string;
}

export interface CurrentUserContext {
  userId: string;
  orgId: string;
  branchId: number | null;
  role: string;
  permissions: string[];
  enabledModules: string[];
  plan: string | null;
  isPlatformAdmin: boolean;
  isOrgOwner: boolean;
  sessionId: string;
}
```

`src/common/rbac/check-ability.decorator.ts`:
```ts
import { SetMetadata } from "@nestjs/common";

export type AbilityVerb =
  | "create" | "read" | "update" | "delete" | "manage" | "approve" | "generate" | "view";

export type AbilitySubject = string; // e.g. "crm:leads", "hr:employees", "all"

export const CHECK_ABILITY = "check_ability";
export interface RequiredAbility {
  verb: AbilityVerb;
  subject: AbilitySubject;
}

export const CheckAbility = (verb: AbilityVerb, subject: AbilitySubject) =>
  SetMetadata(CHECK_ABILITY, { verb, subject } satisfies RequiredAbility);
```

`src/common/rbac/require-module.decorator.ts`:
```ts
import { SetMetadata } from "@nestjs/common";

export const REQUIRE_MODULE = "require_module";
export const RequireModule = (module: string) => SetMetadata(REQUIRE_MODULE, module);
```

`src/common/auth/public.decorator.ts`:
```ts
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "is_public";
export const Public = () => SetMetadata(IS_PUBLIC, true);
```

- [ ] **Step 2: Write the test helper that mints a token**

`test/helpers/sign-token.ts`:
```ts
import { SignJWT } from "jose";
import type { BackendClaims } from "src/common/auth/backend-claims";

export async function signToken(
  claims: Partial<BackendClaims> = {},
  secret = process.env.BACKEND_JWT_SECRET ?? "x".repeat(44),
): Promise<string> {
  const payload: BackendClaims = {
    sub: "user_1",
    orgId: "org_1",
    branchId: null,
    role: "SALES",
    permissions: ["crm:leads:read"],
    enabledModules: ["crm"],
    plan: "PROFESSIONAL",
    isPlatformAdmin: false,
    isOrgOwner: false,
    sessionId: "sess_1",
    ...claims,
  };
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
}
```

- [ ] **Step 3: Write the failing guard unit test**

`src/common/auth/jwt-auth.guard.spec.ts`:
```ts
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { signToken } from "../../../test/helpers/sign-token";

function ctxWith(headers: Record<string, string>, isPublic = false): ExecutionContext {
  const req: { headers: Record<string, string>; user?: unknown } = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
    __req: req,
    __isPublic: isPublic,
  } as unknown as ExecutionContext;
}

describe("JwtAuthGuard", () => {
  process.env.BACKEND_JWT_SECRET ??= "x".repeat(44);
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new JwtAuthGuard(reflector);

  beforeEach(() => (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false));

  it("rejects a missing token with 401", async () => {
    await expect(guard.canActivate(ctxWith({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a malformed token with 401", async () => {
    await expect(
      guard.canActivate(ctxWith({ authorization: "Bearer not.a.jwt" })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("accepts a valid token and attaches req.user", async () => {
    const token = await signToken({ sub: "user_42", orgId: "org_9" });
    const ctx = ctxWith({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    const req = (ctx as unknown as { switchToHttp: () => { getRequest: () => { user: { userId: string } } } })
      .switchToHttp().getRequest();
    expect(req.user.userId).toBe("user_42");
  });

  it("allows @Public routes without a token", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    await expect(guard.canActivate(ctxWith({}))).resolves.toBe(true);
  });
});
```

- [ ] **Step 4: Run it (fails), then write the guard + decorator**

Run: `cd "$API" && pnpm jest jwt-auth.guard.spec.ts`
Expected: FAIL — module not found.

`src/common/auth/jwt-auth.guard.ts`:
```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { jwtVerify } from "jose";
import { IS_PUBLIC } from "./public.decorator";
import type { BackendClaims, CurrentUserContext } from "./backend-claims";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: CurrentUserContext }>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Unauthorized");
    }
    const token = header.slice("Bearer ".length).trim();
    const secret = process.env.BACKEND_JWT_SECRET;
    if (!secret) throw new UnauthorizedException("Unauthorized");

    let claims: BackendClaims;
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      claims = payload as unknown as BackendClaims;
    } catch {
      throw new UnauthorizedException("Unauthorized");
    }

    if (!claims.sub || !claims.orgId) {
      throw new UnauthorizedException("Organization not found");
    }

    req.user = {
      userId: claims.sub,
      orgId: claims.orgId,
      branchId: claims.branchId ?? null,
      role: claims.role,
      permissions: claims.permissions ?? [],
      enabledModules: claims.enabledModules ?? [],
      plan: claims.plan ?? null,
      isPlatformAdmin: claims.isPlatformAdmin === true,
      isOrgOwner: claims.isOrgOwner === true,
      sessionId: claims.sessionId,
    };
    return true;
  }
}
```

`src/common/auth/current-user.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { CurrentUserContext } from "./backend-claims";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserContext => {
    const req = ctx.switchToHttp().getRequest<Request & { user: CurrentUserContext }>();
    return req.user;
  },
);
```

- [ ] **Step 5: Run tests, commit**

Run: `cd "$API" && pnpm jest jwt-auth.guard.spec.ts`
Expected: PASS (4 tests).

```bash
cd "$API" && git add -A && git commit -m "feat(auth): backend JWT guard, claims, @CurrentUser, rbac decorators"
```

---

## Task 8: CASL ability factory + AbilityGuard + ModuleGuard

**Files:**
- Create: `$API/src/common/rbac/abilities.factory.ts`, `$API/src/common/rbac/ability.guard.ts`, `$API/src/common/rbac/module.guard.ts`
- Test: `$API/src/common/rbac/abilities.factory.spec.ts`, `$API/src/common/rbac/ability.guard.spec.ts`

- [ ] **Step 1: Write the failing ability-factory test (parity with lib/abilities.ts)**

`src/common/rbac/abilities.factory.spec.ts`:
```ts
import { defineAbilityFor } from "./abilities.factory";

describe("defineAbilityFor", () => {
  it("grants everything to platform admin / org owner", () => {
    const a = defineAbilityFor({ isPlatformAdmin: true });
    expect(a.can("manage", "all")).toBe(true);
    expect(a.can("delete", "crm:leads")).toBe(true);
  });

  it("maps domain:resource:action → can(action, domain:resource)", () => {
    const a = defineAbilityFor({ permissions: ["crm:leads:read"] });
    expect(a.can("read", "crm:leads")).toBe(true);
    expect(a.can("delete", "crm:leads")).toBe(false);
  });

  it("maps domain:action → can(action, domain)", () => {
    const a = defineAbilityFor({ permissions: ["sales:view"] });
    expect(a.can("view", "sales")).toBe(true);
  });

  it("filters out permissions whose module is not enabled", () => {
    const a = defineAbilityFor({
      permissions: ["crm:leads:read", "hr:employees:read"],
      enabledModules: ["crm"],
    });
    expect(a.can("read", "crm:leads")).toBe(true);
    expect(a.can("read", "hr:employees")).toBe(false);
  });

  it("allows all permissions when enabledModules is empty/absent", () => {
    const a = defineAbilityFor({ permissions: ["hr:employees:read"], enabledModules: [] });
    expect(a.can("read", "hr:employees")).toBe(true);
  });
});
```

- [ ] **Step 2: Run it (fails), then write the factory (faithful port)**

Run: `cd "$API" && pnpm jest abilities.factory.spec.ts`
Expected: FAIL — module not found.

`src/common/rbac/abilities.factory.ts`:
```ts
import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";

export type AppAbility = MongoAbility<[string, string]>;

interface AbilityInput {
  isPlatformAdmin?: boolean;
  isOrgOwner?: boolean;
  permissions?: readonly string[] | null;
  enabledModules?: readonly string[] | null;
}

function moduleFromPermission(permission: string): string | null {
  const [domain] = permission.split(":");
  return domain || null;
}

export function defineAbilityFor({
  isPlatformAdmin,
  isOrgOwner,
  permissions,
  enabledModules,
}: AbilityInput): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (isPlatformAdmin || isOrgOwner) {
    can("manage", "all");
    return build();
  }

  const moduleAllowed = (perm: string): boolean => {
    if (!enabledModules || enabledModules.length === 0) return true;
    const mod = moduleFromPermission(perm);
    if (!mod) return false;
    return enabledModules.includes(mod);
  };

  for (const perm of permissions ?? []) {
    if (!moduleAllowed(perm)) continue;
    const parts = perm.split(":");
    if (parts.length === 3) {
      const [domain, resource, action] = parts;
      if (!domain || !resource || !action) continue;
      can(action, `${domain}:${resource}`);
    } else if (parts.length === 2) {
      const [domain, action] = parts;
      if (!domain || !action) continue;
      can(action, domain);
    }
  }

  return build();
}
```

- [ ] **Step 3: Run it (passes), then write the AbilityGuard test**

Run: `cd "$API" && pnpm jest abilities.factory.spec.ts`
Expected: PASS (5 tests).

`src/common/rbac/ability.guard.spec.ts`:
```ts
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AbilityGuard } from "./ability.guard";
import { AbilityDeniedException } from "../http/api-exceptions";
import type { CurrentUserContext } from "../auth/backend-claims";

function ctx(user: Partial<CurrentUserContext>): ExecutionContext {
  const req = { user: { permissions: [], enabledModules: [], isPlatformAdmin: false, isOrgOwner: false, ...user } };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("AbilityGuard", () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new AbilityGuard(reflector);

  it("passes through when no @CheckAbility is set", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(ctx({}))).toBe(true);
  });

  it("allows when the user has the permission", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue({ verb: "read", subject: "crm:leads" });
    expect(guard.canActivate(ctx({ permissions: ["crm:leads:read"] }))).toBe(true);
  });

  it("throws AbilityDeniedException when lacking permission", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue({ verb: "delete", subject: "crm:leads" });
    expect(() => guard.canActivate(ctx({ permissions: ["crm:leads:read"] }))).toThrow(AbilityDeniedException);
  });
});
```

- [ ] **Step 4: Write AbilityGuard + ModuleGuard**

`src/common/rbac/ability.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { CHECK_ABILITY, type RequiredAbility } from "./check-ability.decorator";
import { defineAbilityFor } from "./abilities.factory";
import { AbilityDeniedException } from "../http/api-exceptions";
import type { CurrentUserContext } from "../auth/backend-claims";

@Injectable()
export class AbilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredAbility | undefined>(CHECK_ABILITY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest<Request & { user: CurrentUserContext }>();
    const user = req.user;
    const ability = defineAbilityFor({
      isPlatformAdmin: user.isPlatformAdmin,
      isOrgOwner: user.isOrgOwner,
      permissions: user.permissions,
      enabledModules: user.enabledModules,
    });
    if (!ability.can(required.verb, required.subject)) {
      throw new AbilityDeniedException(required.verb, required.subject);
    }
    return true;
  }
}
```

`src/common/rbac/module.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { REQUIRE_MODULE } from "./require-module.decorator";
import { ModuleDisabledException } from "../http/api-exceptions";
import type { CurrentUserContext } from "../auth/backend-claims";

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string | undefined>(REQUIRE_MODULE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest<Request & { user: CurrentUserContext }>();
    const user = req.user;
    if (!user.isPlatformAdmin && !user.enabledModules.includes(required)) {
      throw new ModuleDisabledException(required);
    }
    return true;
  }
}
```

- [ ] **Step 5: Run all rbac tests, commit**

Run: `cd "$API" && pnpm jest src/common/rbac`
Expected: PASS (factory 5 + guard 3).

```bash
cd "$API" && git add -A && git commit -m "feat(rbac): CASL ability factory + ability & module guards"
```

---

## Task 9: CacheService + pagination + AuditService

**Files:**
- Create: `$API/src/common/cache/cache-keys.ts`, `$API/src/common/cache/cache.service.ts`, `$API/src/common/cache/cache.module.ts`, `$API/src/common/pagination/pagination.ts`, `$API/src/common/audit/audit.service.ts`, `$API/src/common/audit/audit.module.ts`
- Test: `$API/src/common/pagination/pagination.spec.ts`, `$API/src/common/cache/cache.service.spec.ts`

- [ ] **Step 1: Write the failing pagination test (parity with lib/api/list-response.ts)**

`src/common/pagination/pagination.spec.ts`:
```ts
import { paginateOffset, buildListResponse } from "./pagination";

describe("pagination", () => {
  it("computes limit/offset", () => {
    expect(paginateOffset({ page: 3, pageSize: 20 })).toEqual({ limit: 20, offset: 40 });
  });

  it("builds the list envelope", () => {
    expect(buildListResponse([1, 2], 42, { page: 1, pageSize: 20 })).toEqual({
      items: [1, 2],
      total: 42,
      page: 1,
      pageSize: 20,
      totalPages: 3,
    });
  });

  it("returns totalPages 0 when empty", () => {
    expect(buildListResponse([], 0, { page: 1, pageSize: 20 }).totalPages).toBe(0);
  });
});
```

- [ ] **Step 2: Run it (fails), then write pagination**

Run: `cd "$API" && pnpm jest pagination.spec.ts`
Expected: FAIL — module not found.

`src/common/pagination/pagination.ts`:
```ts
export interface PageParams {
  page: number;
  pageSize: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginateOffset({ page, pageSize }: PageParams): { limit: number; offset: number } {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

export function buildListResponse<T>(items: T[], total: number, { page, pageSize }: PageParams): ListResponse<T> {
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
```

> Verify against the web repo `lib/api/list-response.ts`; if its field names or offset math differ, MATCH the web version exactly (the frontend depends on the shape).

- [ ] **Step 3: Write cache-keys (copied verbatim from web lib/cache.ts) + CacheService**

`src/common/cache/cache-keys.ts` — copy the `CACHE_KEYS` and `CACHE_TTL` objects verbatim from `WEB/lib/cache.ts` (lines 71–144) so keys match across services.

`src/common/cache/cache.service.ts`:
```ts
import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "@upstash/redis";

export const REDIS = "REDIS";

@Injectable()
export class CacheService {
  constructor(@Inject(REDIS) private readonly redis: Redis | null) {}

  async cached<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    if (!this.redis) return fetcher();
    try {
      const hit = await this.redis.get<T>(key);
      if (hit !== null) return hit;
    } catch {
      return fetcher();
    }
    const data = await fetcher();
    try {
      await this.redis.set(key, data, { ex: ttlSeconds });
    } catch {
      /* best-effort */
    }
    return data;
  }

  async invalidate(key: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch {
      /* best-effort */
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.redis) return;
    try {
      let cursor: string | number = 0;
      const keys: string[] = [];
      do {
        const [next, batch] = await this.redis.scan(cursor, { match: pattern, count: 100 });
        cursor = next;
        keys.push(...batch);
      } while (Number(cursor) !== 0);
      if (keys.length) await this.redis.del(...keys);
    } catch {
      /* best-effort */
    }
  }
}
```

`src/common/cache/cache.module.ts`:
```ts
import { Global, Module } from "@nestjs/common";
import { Redis } from "@upstash/redis";
import { CacheService, REDIS } from "./cache.service";

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: (): Redis | null => {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        return url && token ? new Redis({ url, token }) : null;
      },
    },
    CacheService,
  ],
  exports: [CacheService, REDIS],
})
export class CacheModule {}
```

- [ ] **Step 4: Write the cache.service test (null-redis fallback) + AuditService**

`src/common/cache/cache.service.spec.ts`:
```ts
import { CacheService } from "./cache.service";

describe("CacheService (no redis)", () => {
  const svc = new CacheService(null);

  it("falls back to the fetcher when redis is absent", async () => {
    const fetcher = jest.fn().mockResolvedValue(99);
    await expect(svc.cached("k", fetcher)).resolves.toBe(99);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("invalidate is a no-op without redis", async () => {
    await expect(svc.invalidate("k")).resolves.toBeUndefined();
  });
});
```

`src/common/audit/audit.service.ts`:
```ts
import { Inject, Injectable } from "@nestjs/common";
import { auditLogs } from "../../db/schema";
import { DRIZZLE } from "../../db/drizzle.constants";
import { type Db } from "../../db/drizzle.module";
import { logger } from "../logger/logger.service";

export interface AuditEntry {
  action: string;
  userId: string;
  orgId?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  log(entry: AuditEntry): void {
    void this.db
      .insert(auditLogs)
      .values({
        action: entry.action,
        userId: entry.userId,
        orgId: entry.orgId ?? null,
        targetId: entry.targetId ?? null,
        targetType: entry.targetType ?? null,
        metadata: entry.metadata ?? {},
        ipAddress: entry.ipAddress ?? null,
      })
      .catch((error: unknown) => logger.error("audit.log failed", { error, action: entry.action }));
  }
}
```

> Verify `auditLogs` column names against `WEB/lib/db/audit.ts` + the synced schema; adjust `.values({...})` keys to match the actual Drizzle column names exactly. If the audit insert uses different column names (e.g. `target_id` vs `targetId`), use the Drizzle property names from the schema object.

`src/common/audit/audit.module.ts`:
```ts
import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
```

- [ ] **Step 5: Run cache+pagination tests, build, commit**

Run: `cd "$API" && pnpm jest src/common/cache src/common/pagination`
Expected: PASS (cache 2 + pagination 3).

Run: `cd "$API" && pnpm build`
Expected: clean compile (confirms AuditService types against the synced schema).

```bash
cd "$API" && git add -A && git commit -m "feat(common): cache service, pagination, audit service"
```

---

## Task 10: Wire global guards + `/me` proving endpoint (auth + RBAC end-to-end)

**Files:**
- Create: `$API/src/me/me.controller.ts`, `$API/src/me/me.e2e-spec.ts`
- Modify: `$API/src/app.module.ts`

- [ ] **Step 1: Write the failing e2e test**

`src/me/me.e2e-spec.ts`:
```ts
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";
import { AllExceptionsFilter } from "../common/http/all-exceptions.filter";
import { signToken } from "../../test/helpers/sign-token";

describe("/me (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgres://u:p@localhost:5432/db";
    process.env.BACKEND_JWT_SECRET ??= "x".repeat(44);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  it("401 without a token", async () => {
    const res = await request(app.getHttpServer()).get("/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("200 with a valid token, returns the user context", async () => {
    const token = await signToken({ sub: "user_77", orgId: "org_3", role: "SALES" });
    const res = await request(app.getHttpServer()).get("/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userId: "user_77", orgId: "org_3", role: "SALES" });
  });

  it("403 RBAC_DENIED on /me/protected without the permission", async () => {
    const token = await signToken({ permissions: ["crm:leads:read"], enabledModules: [] });
    const res = await request(app.getHttpServer())
      .get("/me/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Forbidden", code: "RBAC_DENIED", verb: "delete", subject: "crm:leads" });
  });

  it("200 on /me/protected with the permission", async () => {
    const token = await signToken({ permissions: ["crm:leads:delete"], enabledModules: [] });
    const res = await request(app.getHttpServer())
      .get("/me/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `cd "$API" && pnpm jest --config ./jest-e2e.json src/me/me.e2e-spec.ts`
Expected: FAIL — `/me` not found / guards not wired.

- [ ] **Step 3: Write the controller**

`src/me/me.controller.ts`:
```ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { AbilityGuard } from "../common/rbac/ability.guard";
import { CheckAbility } from "../common/rbac/check-ability.decorator";
import type { CurrentUserContext } from "../common/auth/backend-claims";

@Controller("me")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class MeController {
  @Get()
  me(@CurrentUser() user: CurrentUserContext): CurrentUserContext {
    return user;
  }

  @Get("protected")
  @CheckAbility("delete", "crm:leads")
  protected(@CurrentUser() user: CurrentUserContext): { ok: true; userId: string } {
    return { ok: true, userId: user.userId };
  }
}
```

- [ ] **Step 4: Register the controller**

Modify `src/app.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { DrizzleModule } from "./db/drizzle.module";
import { CacheModule } from "./common/cache/cache.module";
import { AuditModule } from "./common/audit/audit.module";
import { HealthController } from "./health/health.controller";
import { MeController } from "./me/me.controller";

@Module({
  imports: [ConfigModule, DrizzleModule, CacheModule, AuditModule],
  controllers: [HealthController, MeController],
})
export class AppModule {}
```

> Guards here are applied at the controller via `@UseGuards`. We deliberately do NOT register `JwtAuthGuard` as a global `APP_GUARD` in Plan A, because health/readiness must stay public and most controllers arrive in later domain plans. Domain controllers will declare `@UseGuards(JwtAuthGuard, ModuleGuard, AbilityGuard)` explicitly (matching the web app's per-route `withModuleAbility`).

- [ ] **Step 5: Run e2e, commit**

Run: `cd "$API" && pnpm jest --config ./jest-e2e.json src/me/me.e2e-spec.ts`
Expected: PASS (4 tests).

```bash
cd "$API" && git add -A && git commit -m "feat(me): proving endpoint exercising JWT auth + CASL RBAC end-to-end"
```

---

## Task 11: Web repo — backend-token mint endpoint

**Files:**
- Create: `WEB/app/api/auth/backend-token/route.ts`
- Modify: `WEB/package.json` (add `jose` as a direct dependency)
- Test: `WEB/app/api/auth/backend-token/route.test.ts` (only if the web repo has a route-test setup; otherwise verify manually in Step 4)

- [ ] **Step 1: Pin `jose` in the web repo**

Run:
```bash
cd "$WEB" && pnpm add jose@^5.9.6
```
Expected: `jose` added to dependencies.

- [ ] **Step 2: Write the mint route**

`WEB/app/api/auth/backend-token/route.ts`:
```ts
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { auth } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Backend token not configured" }, { status: 503 });
  }

  const branchId = (session as { branchId?: number | null }).branchId ?? null;
  const token = await new SignJWT({
    orgId: session.orgId,
    branchId,
    role: session.user.role,
    permissions: session.permissions ?? [],
    enabledModules: session.enabledModules ?? [],
    plan: session.plan ?? null,
    isPlatformAdmin: session.user.isPlatformAdmin === true,
    isOrgOwner: session.user.isOrgOwner === true,
    sessionId: (session as { sessionId?: string }).sessionId ?? "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json({ token, expiresIn: 600 });
}
```

> Claim parity note: the NestJS `JwtAuthGuard` reads `sub` (subject) as `userId`, plus `orgId, branchId, role, permissions, enabledModules, plan, isPlatformAdmin, isOrgOwner, sessionId`. This route emits exactly those. The `enabledModules`/`permissions` here are the SAME arrays NextAuth already put in the session (`types/next-auth.d.ts`), so RBAC outcomes match the web app.

- [ ] **Step 3: Add `BACKEND_JWT_SECRET` to web env**

Add `BACKEND_JWT_SECRET=<same 44+ char secret as the API>` to `WEB/.env`. Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(33).toString('base64'))"
```
Use the SAME value in `$API/.env`.

- [ ] **Step 4: Verify the endpoint mints a verifiable token (manual)**

Start the web app (`cd "$WEB" && pnpm dev`), sign in, then in the browser console on the app origin:
```js
await (await fetch("/api/auth/backend-token")).json()
```
Expected: `{ token: "<jwt>", expiresIn: 600 }`. Copy the token and confirm the API accepts it:
```bash
curl -s http://localhost:1500/me -H "Authorization: Bearer <paste-token>"
```
Expected: JSON user context with your `userId`/`orgId`. (Requires the API running with the same `BACKEND_JWT_SECRET`.)

- [ ] **Step 5: Commit (web repo)**

```bash
cd "$WEB" && git add app/api/auth/backend-token/route.ts package.json pnpm-lock.yaml && git commit -m "feat(auth): mint short-lived backend JWT for the NestJS API"
```

---

## Task 12: Web repo — api-client base URL + Bearer attach + 401 refresh

**Files:**
- Modify: `WEB/lib/api-client.ts`

- [ ] **Step 1: Read the current api-client to preserve its public surface**

Run: open `WEB/lib/api-client.ts`. Confirm the exported method names (`get/post/put/patch/delete/upload/download`) and the `apiClient` object shape. The change below MUST keep those identical so the ~700 hooks compile unchanged.

- [ ] **Step 2: Add configurable base URL + token attachment**

At the top of `WEB/lib/api-client.ts`, replace the hardcoded base URL line (`const BASE_URL = "/api";`) with:
```ts
const SAME_ORIGIN = "/api";
const EXTERNAL_API = process.env.NEXT_PUBLIC_API_URL;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getBackendToken(): Promise<string | null> {
  if (!EXTERNAL_API) return null;
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 30_000 > now) return cachedToken.value;
  const res = await fetch("/api/auth/backend-token", { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { token: string; expiresIn: number };
  cachedToken = { value: data.token, expiresAt: now + data.expiresIn * 1000 };
  return data.token;
}

function resolveUrl(path: string): string {
  return EXTERNAL_API ? `${EXTERNAL_API}${path}` : `${SAME_ORIGIN}${path}`;
}
```

- [ ] **Step 3: Attach the Bearer header and add one-shot 401 refresh**

In the shared request function (the one that builds `fetch` options), before the fetch, add the Authorization header when calling the external API:
```ts
const headers = new Headers(init.headers);
if (EXTERNAL_API) {
  const token = await getBackendToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
}
```
Use `resolveUrl(path)` instead of `` `${BASE_URL}${path}` ``. After the first response, if `EXTERNAL_API && res.status === 401`, clear `cachedToken`, fetch a fresh token once, and retry the request a single time:
```ts
if (EXTERNAL_API && res.status === 401) {
  cachedToken = null;
  const token = await getBackendToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    res = await fetch(resolveUrl(path), { ...init, headers, credentials: "include" });
  }
}
```
(Declare the response with `let res` so it can be reassigned.)

> Behavior with `NEXT_PUBLIC_API_URL` unset (the default today): `EXTERNAL_API` is `undefined`, so every request stays same-origin `/api`, no token is fetched, and the app behaves exactly as before. The split is opt-in per environment.

- [ ] **Step 4: Verify the web app still builds with the default (same-origin)**

Run: `cd "$WEB" && pnpm build`
Expected: build succeeds; no behavior change because `NEXT_PUBLIC_API_URL` is unset.

- [ ] **Step 5: Commit (web repo)**

```bash
cd "$WEB" && git add lib/api-client.ts && git commit -m "feat(api-client): opt-in external API base URL with backend-token bearer auth"
```

---

## Task 13: CORS lock, graceful shutdown, Dockerfile, README, MIGRATION.md

**Files:**
- Modify: `$API/src/main.ts`, `$API/src/db/drizzle.module.ts`
- Create: `$API/Dockerfile`, `$API/README.md`, `$API/MIGRATION.md`

- [ ] **Step 1: Graceful DB pool drain on shutdown**

In `src/db/drizzle.module.ts`, give the module access to the client and close it on shutdown:
```ts
import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
// ...existing imports...
import { DRIZZLE } from "./drizzle.constants";

@Global()
@Module({ providers: [ /* DRIZZLE provider as before */ ], exports: [DRIZZLE] })
export class DrizzleModule implements OnApplicationShutdown {
  constructor(@Inject(DRIZZLE) private readonly db: Db & { __client: ReturnType<typeof postgres> }) {}
  async onApplicationShutdown(): Promise<void> {
    await this.db.__client.end({ timeout: 5 });
  }
}
```

- [ ] **Step 2: Confirm CORS + filter are wired in main.ts**

Confirm `src/main.ts` contains (from Tasks 3 and 5):
```ts
app.use(helmet());
app.enableCors({ origin: config.corsOrigins, credentials: false });
app.useGlobalFilters(new AllExceptionsFilter());
app.enableShutdownHooks();
```

- [ ] **Step 3: Write the Dockerfile**

`$API/Dockerfile`:
```dockerfile
FROM node:20-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-slim AS run
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
EXPOSE 1500
CMD ["node", "dist/main.js"]
```

- [ ] **Step 4: Write README.md and MIGRATION.md**

`$API/README.md`:
```md
# streamlineos-api

NestJS resource server for StreamlineOS. Runs on port 1500. Verifies the NextAuth-minted
backend JWT (`BACKEND_JWT_SECRET`, shared with the web app), enforces CASL RBAC, shares the
Neon DB and Upstash Redis with the web app during the strangler migration.

## Setup
1. `cp .env.example .env` and fill `DATABASE_URL`, `BACKEND_JWT_SECRET` (same as web), `CORS_ORIGINS`.
2. `pnpm install`
3. `pnpm sync:schema`  (copies the Drizzle schema from ../Streamlineos)
4. `pnpm start:dev`

## Schema sync
The Drizzle schema is owned by the web repo during migration. Run `pnpm sync:schema` after any
web schema change; CI runs `pnpm check:schema` and fails on drift.

## Tests
- `pnpm test` (unit) · `pnpm test:e2e` (e2e)
```

`$API/MIGRATION.md`:
```md
# Domain migration checklist (strangler-fig)

Kernel + auth bridge: ✅ (Plan A)

| Domain | Routes | Ported | Verified | Cutover (web routes deleted) |
|--------|-------:|:------:|:--------:|:----------------------------:|
| CRM Leads (pilot) | ~31 | ☐ | ☐ | ☐ |
| ... remaining ~45 domains | | | | |
```

- [ ] **Step 5: Full build + test sweep, commit**

Run:
```bash
cd "$API" && pnpm build && pnpm test && pnpm test:e2e
```
Expected: build clean; all unit + e2e tests pass.

```bash
cd "$API" && git add -A && git commit -m "feat: CORS lock, graceful shutdown, Dockerfile, docs"
```

---

## Self-review (completed during planning)

**Spec coverage:** Kernel pieces from spec §3.1/§3.2 — JWT guard (T7), CASL ability + module guards (T8), Zod pipe (T6), error envelope/filter (T5), cache (T9), pagination (T9), audit (T9), logger (T5), DB module (T4), config (T2). Auth bridge §4 — mint endpoint (T11), api-client wiring (T12), CORS (T3/T13). Schema-drift control §6 — sync script + `check:schema` (T4). Scale/security §8 — persistent pool (T4), helmet/CORS (T3/T13), graceful shutdown (T13), Dockerfile (T13). ApiKeyGuard (§3.1) is intentionally deferred to Plan B (first needed by `/api/leads/ingest`); noted here so it is not lost.

**Placeholder scan:** No TBDs. Two explicit "verify against web source" notes (pagination field names in T9; `auditLogs` column names in T9) are deliberate parity checks with exact instructions, not placeholders.

**Type consistency:** `BackendClaims`/`CurrentUserContext` (T7) are consumed unchanged by the guard (T7), decorators (T7), ability/module guards (T8), and `/me` (T10). `AbilityVerb`/`AbilitySubject` defined in `check-ability.decorator.ts` (T7) and reused by `api-exceptions.ts` (T5) and `ability.guard.ts` (T8). `Db`/`DRIZZLE` defined in T4 and reused in T9/T10/T13. `signToken` claims (T7) match the mint route's emitted claims (T11).

---

## Plan B preview (next plan — not part of this one)

CRM Leads pilot migration (M3–M4): port all ~31 lead routes into a `LeadsModule` (controller + service from `lib/services/lead-*` + `server/queries/crm`), reuse the existing Zod schemas as DTOs, add the `ApiKeyGuard` for `/leads/ingest`, wire Inngest `crm/lead.created` dispatch, achieve response/RBAC/cache parity, load-test with k6, then repoint the web leads hooks (`NEXT_PUBLIC_API_URL`) and delete `WEB/app/api/leads/**` + dead services. Tracked in `$API/MIGRATION.md`.
