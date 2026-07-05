# Calendar External Accounts via Composio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **GIT BAN (overrides the usual commit steps):** Subagents run NO git commands ever — no add/commit/push/anything (CLAUDE.md §0.11 + user rule). Task checkpoints are "verify + report", never "commit".
> **No code comments, no console.log** (CLAUDE.md §7). Strict TS: no `any`, no casts, no `!` abuse.

**Goal:** Users connect multiple Google/Microsoft calendar accounts via Composio on the `/calendar` page, see external events merged read-only into the grid with per-account visibility toggles, and get Google Meet / Teams links attached when creating events synced to a chosen account.

**Architecture:** New backend `integrations` module wraps `@composio/core` behind a `ComposioGateway` seam and owns connection lifecycle + a `user_integration_connections` mirror table (no provider tokens). The calendar module gains an external-events read path (Redis-cached fan-out) and a push-sync path (create/update/delete propagation + conference links). Superseded direct-OAuth code is deleted.

**Tech Stack:** NestJS · Drizzle/Neon · Upstash Redis · Zod · `@composio/core@^0.13.1` · Next.js App Router · TanStack Query v5.

**Spec:** `docs/superpowers/specs/2026-07-04-calendar-composio-integrations-design.md`

---

## Task order & parallelism

1 → 2 → 3 → 4 → 5 → 6 (backend, sequential — each depends on previous compiling)
7 → 8 → 9 → 10 (frontend, sequential; 7 needs 4-6 contracts, which this plan fixes upfront)
11 (verification + PAGES.md) last.

---

### Task 1: Dependency, env schema, SDK surface verification

**Files:**
- Modify: `backend/package.json` (via pnpm)
- Modify: `backend/src/config/env.validation.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1.1: Install the SDK**

Run: `pnpm -C backend add @composio/core@^0.13.1`
Expected: success, `@composio/core` appears in `backend/package.json` dependencies.

- [ ] **Step 1.2: Verify the SDK's real API surface**

Run: `ls node_modules/@composio/core/dist` (from `backend/`) then open the main `.d.ts` and confirm these exist (adjust Task 4 gateway code to the real names if they differ — record any differences in the task report):
- `class Composio` constructor accepting `{ apiKey: string }`
- `composio.connectedAccounts.link(userId, authConfigId, opts)` returning an object with `redirectUrl` and `id`
- `composio.connectedAccounts.get(id)`, `.list(...)`, `.delete(id)`
- `composio.tools.execute(slug, { userId, arguments, connectedAccountId? })` returning `{ data, successful, error }`

Command to help: `grep -rn "link(" node_modules/@composio/core/dist/*.d.ts | head -20` and `grep -rn "execute" node_modules/@composio/core/dist/*.d.ts | head -20`

- [ ] **Step 1.3: Extend the validated env schema**

In `backend/src/config/env.validation.ts`, add to the `schema` object after `UPSTASH_REDIS_REST_TOKEN`:

```ts
  APP_URL: z.string().url().default("http://localhost:1000"),
  COMPOSIO_API_KEY: z.string().optional(),
  COMPOSIO_AUTH_CONFIG_GOOGLE_CALENDAR: z.string().optional(),
  COMPOSIO_AUTH_CONFIG_OUTLOOK: z.string().optional(),
```

- [ ] **Step 1.4: Document in `.env.example`**

Append to `backend/.env.example`:

```
COMPOSIO_API_KEY=
COMPOSIO_AUTH_CONFIG_GOOGLE_CALENDAR=
COMPOSIO_AUTH_CONFIG_OUTLOOK=
```

- [ ] **Step 1.5: Verify build**

Run: `pnpm -C backend build`
Expected: exit 0.

---

### Task 2: Delete superseded direct-OAuth backend code

**Files:**
- Delete: `backend/src/modules/calendar-connections/` (whole folder: controller, service, module, `dto/calendar-connections.schemas.ts`)
- Delete: `backend/src/modules/google-calendar/google-calendar.controller.ts`
- Delete: `backend/src/modules/google-calendar/google-calendar.controller.e2e-spec.ts`
- Modify: `backend/src/modules/google-calendar/google-calendar.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 2.1: Before deleting, note the e2e harness** — open `google-calendar.controller.e2e-spec.ts` and copy its test-module/bootstrap pattern into the task report (Task 4 mirrors it for the new controller spec).

- [ ] **Step 2.2: Delete `backend/src/modules/calendar-connections/` entirely.**

- [ ] **Step 2.3: Remove from `app.module.ts`:** the import line `import { CalendarConnectionsModule } from "./modules/calendar-connections/calendar-connections.module";` and the `CalendarConnectionsModule,` entry in the imports array. Keep `GoogleCalendarModule` (interviews still use it).

- [ ] **Step 2.4: Trim google-calendar module** — delete `google-calendar.controller.ts` + its e2e spec; in `google-calendar.module.ts` remove `GoogleCalendarController` from `controllers` (keep `GoogleCalendarInterviewsController` and `GoogleCalendarService`). Then check for now-dead service methods: `grep -n "createMeet\|getStatus" backend/src/modules/google-calendar/google-calendar.service.ts` and grep the interviews controller for what it calls — delete service methods used only by the deleted controller.

- [ ] **Step 2.5: Verify nothing dangles**

Run: `grep -rn "calendar-connections\|CalendarConnections" backend/src` — expected: no matches.
Run: `pnpm -C backend build && pnpm -C backend lint` — expected: exit 0.

---

### Task 3: DB schema — mirror table, mapping columns, drop old table

**Files:**
- Create: `backend/src/db/schema/integrations.ts`
- Modify: `backend/src/db/schema/shared.ts`
- Modify: `backend/src/db/schema/index.ts`

- [ ] **Step 3.1: Create `backend/src/db/schema/integrations.ts`:**

```ts
import { boolean, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations, users } from "./auth";

export type IntegrationToolkit = "googlecalendar" | "outlook";
export type IntegrationConnectionStatus = "active" | "needs_reauth" | "disabled";
export type IntegrationConnectionScope = "user" | "org";

export const userIntegrationConnections = pgTable(
  "user_integration_connections",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    toolkit: text("toolkit").$type<IntegrationToolkit>().notNull(),
    composioConnectedAccountId: text("composio_connected_account_id").notNull(),
    accountEmail: text("account_email"),
    accountLabel: text("account_label"),
    status: text("status").$type<IntegrationConnectionStatus>().default("active").notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    scope: text("scope").$type<IntegrationConnectionScope>().default("user").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    unique("uq_integration_connections_composio_account").on(table.composioConnectedAccountId),
    index("idx_integration_connections_org_user").on(table.orgId, table.userId),
  ],
);

export const userIntegrationConnectionsRelations = relations(userIntegrationConnections, ({ one }) => ({
  user: one(users, { fields: [userIntegrationConnections.userId], references: [users.id] }),
}));
```

Note: check how `shared.ts` imports `organizations`/`users` (same-file vs `./auth`) and match that import style exactly.

- [ ] **Step 3.2: In `shared.ts`** — add to the `calendarEvents` columns after `reminder15MinSent`:

```ts
  integrationConnectionId: integer("integration_connection_id"),
  externalEventId: text("external_event_id"),
```

and add to its index array:

```ts
  index("idx_calendar_events_external").on(table.integrationConnectionId, table.externalEventId),
```

(No FK reference to avoid a cross-file cycle; the service enforces ownership.)

- [ ] **Step 3.3: In `shared.ts`** — delete `userCalendarConnections`, `userCalendarConnectionsRelations`, and `export type CalendarProvider` (first verify: `grep -rn "CalendarProvider\|userCalendarConnections" backend/src --include="*.ts" | grep -v schema/shared` — expected: no matches after Task 2).

- [ ] **Step 3.4: In `index.ts`** barrel add `export * from "./integrations";`

- [ ] **Step 3.5: Generate + apply migration**

Run: `pnpm -C backend db:generate` — expected: one new migration in `backend/migrations/` containing `CREATE TABLE "user_integration_connections"`, two `ALTER TABLE "calendar_events" ADD COLUMN`, and `DROP TABLE "user_calendar_connections"`.
Run: `pnpm -C backend db:migrate` — expected: clean apply (lineage was baselined 2026-07-04). If it demands a TTY, STOP and report — the orchestrator asks the user to run it.

- [ ] **Step 3.6:** `pnpm -C backend build` — exit 0.

---

### Task 4: Backend `integrations` module

**Files:**
- Create: `backend/src/modules/integrations/composio.gateway.ts`
- Create: `backend/src/modules/integrations/integrations.service.ts`
- Create: `backend/src/modules/integrations/integrations.controller.ts`
- Create: `backend/src/modules/integrations/dto/integrations.schemas.ts`
- Create: `backend/src/modules/integrations/integrations.module.ts`
- Create: `backend/src/modules/integrations/integrations.service.spec.ts`
- Create: `backend/src/modules/integrations/integrations.controller.spec.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/modules/rbac/permissions.constants.ts`

- [ ] **Step 4.1: DTO schemas** — `dto/integrations.schemas.ts`:

```ts
import { z } from "zod";

export const integrationToolkitSchema = z.enum(["googlecalendar", "outlook"]);

export const initiateConnectionSchema = z.object({
  toolkit: integrationToolkitSchema,
});

export const finalizeConnectionSchema = z.object({
  connectedAccountId: z.string().min(1).max(200),
});

export type InitiateConnectionInput = z.infer<typeof initiateConnectionSchema>;
export type FinalizeConnectionInput = z.infer<typeof finalizeConnectionSchema>;
```

- [ ] **Step 4.2: Gateway seam** — `composio.gateway.ts`. Adjust SDK call names to Step 1.2 findings if they differ:

```ts
import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Composio } from "@composio/core";
import { z } from "zod";
import { APP_CONFIG } from "../../config/config.module";
import type { AppConfig } from "../../config/env.validation";
import type { IntegrationToolkit } from "../../db/schema";

const connectedAccountSchema = z.object({
  id: z.string(),
  status: z.string(),
  userId: z.string().optional(),
  user_id: z.string().optional(),
  toolkit: z.object({ slug: z.string() }).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export interface ComposioConnectedAccount {
  id: string;
  status: string;
  userId: string | null;
  toolkitSlug: string | null;
  email: string | null;
}

export class ComposioToolError extends Error {
  constructor(
    message: string,
    readonly isAuthError: boolean,
  ) {
    super(message);
  }
}

function extractEmail(record: Record<string, unknown> | undefined): string | null {
  if (!record) return null;
  const candidate = record.email ?? record.userEmail ?? record.user_email;
  return typeof candidate === "string" ? candidate : null;
}

@Injectable()
export class ComposioGateway {
  private client: Composio | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.COMPOSIO_API_KEY);
  }

  authConfigIdFor(toolkit: IntegrationToolkit): string | null {
    if (toolkit === "googlecalendar") return this.config.COMPOSIO_AUTH_CONFIG_GOOGLE_CALENDAR ?? null;
    return this.config.COMPOSIO_AUTH_CONFIG_OUTLOOK ?? null;
  }

  private getClient(): Composio {
    if (!this.config.COMPOSIO_API_KEY) {
      throw new ServiceUnavailableException("Composio integration is not configured");
    }
    this.client ??= new Composio({ apiKey: this.config.COMPOSIO_API_KEY });
    return this.client;
  }

  async initiateConnection(
    userId: string,
    toolkit: IntegrationToolkit,
    callbackUrl: string,
  ): Promise<{ redirectUrl: string }> {
    const authConfigId = this.authConfigIdFor(toolkit);
    if (!authConfigId) {
      throw new ServiceUnavailableException(`Composio auth config for ${toolkit} is not configured`);
    }
    const request = await this.getClient().connectedAccounts.link(userId, authConfigId, {
      callbackUrl,
      allowMultiple: true,
    });
    if (!request.redirectUrl) {
      throw new ServiceUnavailableException("Composio did not return a redirect URL");
    }
    return { redirectUrl: request.redirectUrl };
  }

  async getConnectedAccount(connectedAccountId: string): Promise<ComposioConnectedAccount> {
    const raw: unknown = await this.getClient().connectedAccounts.get(connectedAccountId);
    const parsed = connectedAccountSchema.parse(raw);
    return {
      id: parsed.id,
      status: parsed.status,
      userId: parsed.userId ?? parsed.user_id ?? null,
      toolkitSlug: parsed.toolkit?.slug ?? null,
      email: extractEmail(parsed.data) ?? extractEmail(parsed.params),
    };
  }

  async deleteConnectedAccount(connectedAccountId: string): Promise<void> {
    await this.getClient().connectedAccounts.delete(connectedAccountId);
  }

  async executeTool(
    slug: string,
    userId: string,
    args: Record<string, unknown>,
    connectedAccountId: string,
  ): Promise<unknown> {
    const result = await this.getClient().tools.execute(slug, {
      userId,
      arguments: args,
      connectedAccountId,
    });
    if (!result.successful) {
      const message = typeof result.error === "string" ? result.error : "Composio tool execution failed";
      const isAuthError = /auth|token|expired|unauthoriz|invalid_grant|reconnect/i.test(message);
      throw new ComposioToolError(message, isAuthError);
    }
    return result.data;
  }
}
```

- [ ] **Step 4.3: Service** — `integrations.service.ts`:

```ts
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { userIntegrationConnections, type IntegrationToolkit } from "../../db/schema";
import { DRIZZLE } from "../../db/drizzle.constants";
import { type Db } from "../../db/drizzle.module";
import { APP_CONFIG } from "../../config/config.module";
import type { AppConfig } from "../../config/env.validation";
import { ComposioGateway } from "./composio.gateway";

const CONNECTION_COLUMNS = {
  id: userIntegrationConnections.id,
  toolkit: userIntegrationConnections.toolkit,
  accountEmail: userIntegrationConnections.accountEmail,
  accountLabel: userIntegrationConnections.accountLabel,
  status: userIntegrationConnections.status,
  isPrimary: userIntegrationConnections.isPrimary,
  createdAt: userIntegrationConnections.createdAt,
} as const;

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly gateway: ComposioGateway,
  ) {}

  listConnections(orgId: string, userId: string) {
    return this.db
      .select(CONNECTION_COLUMNS)
      .from(userIntegrationConnections)
      .where(
        and(
          eq(userIntegrationConnections.orgId, orgId),
          eq(userIntegrationConnections.userId, userId),
        ),
      )
      .orderBy(desc(userIntegrationConnections.isPrimary), desc(userIntegrationConnections.createdAt));
  }

  async initiate(userId: string, toolkit: IntegrationToolkit) {
    const callbackUrl = `${this.config.APP_URL}/calendar`;
    return this.gateway.initiateConnection(userId, toolkit, callbackUrl);
  }

  async finalize(orgId: string, userId: string, connectedAccountId: string) {
    const account = await this.gateway.getConnectedAccount(connectedAccountId);
    if (account.userId !== userId) {
      throw new ForbiddenException("Connected account does not belong to the current user");
    }
    const toolkit: IntegrationToolkit = account.toolkitSlug === "outlook" ? "outlook" : "googlecalendar";
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: userIntegrationConnections.id })
        .from(userIntegrationConnections)
        .where(
          and(
            eq(userIntegrationConnections.orgId, orgId),
            eq(userIntegrationConnections.userId, userId),
          ),
        )
        .limit(1);
      const rows = await tx
        .insert(userIntegrationConnections)
        .values({
          orgId,
          userId,
          toolkit,
          composioConnectedAccountId: account.id,
          accountEmail: account.email,
          accountLabel: account.email,
          status: "active",
          isPrimary: existing.length === 0,
          scope: "user",
        })
        .onConflictDoUpdate({
          target: userIntegrationConnections.composioConnectedAccountId,
          set: { status: "active", accountEmail: account.email, updatedAt: new Date() },
        })
        .returning(CONNECTION_COLUMNS);
      return rows[0];
    });
  }

  async disconnect(orgId: string, userId: string, connectionId: number) {
    const row = await this.ownedConnection(orgId, userId, connectionId);
    try {
      await this.gateway.deleteConnectedAccount(row.composioConnectedAccountId);
    } catch {
      /* remote cleanup is best-effort; local removal proceeds */
    }
    await this.db.transaction(async (tx) => {
      await tx
        .delete(userIntegrationConnections)
        .where(eq(userIntegrationConnections.id, connectionId));
      if (row.isPrimary) {
        const next = await tx
          .select({ id: userIntegrationConnections.id })
          .from(userIntegrationConnections)
          .where(
            and(
              eq(userIntegrationConnections.orgId, orgId),
              eq(userIntegrationConnections.userId, userId),
            ),
          )
          .orderBy(desc(userIntegrationConnections.createdAt))
          .limit(1);
        const nextRow = next[0];
        if (nextRow) {
          await tx
            .update(userIntegrationConnections)
            .set({ isPrimary: true })
            .where(eq(userIntegrationConnections.id, nextRow.id));
        }
      }
    });
    return { deleted: true };
  }

  async setPrimary(orgId: string, userId: string, connectionId: number) {
    await this.ownedConnection(orgId, userId, connectionId);
    return this.db.transaction(async (tx) => {
      await tx
        .update(userIntegrationConnections)
        .set({ isPrimary: false })
        .where(
          and(
            eq(userIntegrationConnections.orgId, orgId),
            eq(userIntegrationConnections.userId, userId),
          ),
        );
      const rows = await tx
        .update(userIntegrationConnections)
        .set({ isPrimary: true })
        .where(eq(userIntegrationConnections.id, connectionId))
        .returning(CONNECTION_COLUMNS);
      return rows[0];
    });
  }

  async ownedConnection(orgId: string, userId: string, connectionId: number) {
    const rows = await this.db
      .select()
      .from(userIntegrationConnections)
      .where(
        and(
          eq(userIntegrationConnections.id, connectionId),
          eq(userIntegrationConnections.orgId, orgId),
          eq(userIntegrationConnections.userId, userId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException("Connection not found");
    return row;
  }
}
```

Note the comment inside `catch {}` is the single allowed clarifier — if lint rejects it, drop it.

- [ ] **Step 4.4: Controller** — `integrations.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../access/permission.guard";
import { RequirePermission } from "../access/require-permission.decorator";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import type { CurrentUserContext } from "../../common/auth/backend-claims";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { IntegrationsService } from "./integrations.service";
import {
  finalizeConnectionSchema,
  initiateConnectionSchema,
  type FinalizeConnectionInput,
  type InitiateConnectionInput,
} from "./dto/integrations.schemas";

@Controller("integrations")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get("connections")
  @RequirePermission("integrations:connections:view")
  listConnections(@CurrentUser() u: CurrentUserContext) {
    return this.integrations.listConnections(u.orgId, u.userId);
  }

  @Post("connections/initiate")
  @HttpCode(200)
  @RequirePermission("integrations:connections:manage")
  initiate(
    @Body(new ZodValidationPipe(initiateConnectionSchema)) body: InitiateConnectionInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.integrations.initiate(u.userId, body.toolkit);
  }

  @Post("connections/finalize")
  @HttpCode(200)
  @RequirePermission("integrations:connections:manage")
  finalize(
    @Body(new ZodValidationPipe(finalizeConnectionSchema)) body: FinalizeConnectionInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.integrations.finalize(u.orgId, u.userId, body.connectedAccountId);
  }

  @Delete("connections/:connectionId")
  @RequirePermission("integrations:connections:manage")
  disconnect(
    @Param("connectionId", ParseIntPipe) connectionId: number,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.integrations.disconnect(u.orgId, u.userId, connectionId);
  }

  @Patch("connections/:connectionId/primary")
  @RequirePermission("integrations:connections:manage")
  setPrimary(
    @Param("connectionId", ParseIntPipe) connectionId: number,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.integrations.setPrimary(u.orgId, u.userId, connectionId);
  }
}
```

- [ ] **Step 4.5: Module** — `integrations.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { ComposioGateway } from "./composio.gateway";

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, ComposioGateway],
  exports: [ComposioGateway, IntegrationsService],
})
export class IntegrationsModule {}
```

Register in `app.module.ts`: import + add `IntegrationsModule,` to the imports array (alphabetically near `IntegrationsGitModule`).

- [ ] **Step 4.6: RBAC catalog** — in `permissions.constants.ts`, insert directly after the `calendar:write` entry:

```ts
  { name: "integrations:connections:view", resource: "integrations:connections", action: "view", description: "View connected external app accounts" },
  { name: "integrations:connections:manage", resource: "integrations:connections", action: "manage", description: "Connect and manage external app accounts" },
```

and append to `EMPLOYEE_SELF_SERVICE`:

```ts
  "integrations:connections:view",
  "integrations:connections:manage",
```

- [ ] **Step 4.7: Service unit spec** — `integrations.service.spec.ts` (repo pattern: direct instantiation, jest mocks):

```ts
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { IntegrationsService } from "./integrations.service";
import type { ComposioGateway } from "./composio.gateway";
import type { Db } from "../../db/drizzle.module";
import type { AppConfig } from "../../config/env.validation";

function selectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(rows),
        orderBy: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(rows) }),
      }),
    }),
  };
}

describe("IntegrationsService", () => {
  const config = { APP_URL: "http://localhost:1000" } as AppConfig;

  it("finalize rejects an account owned by another user", async () => {
    const gateway = {
      getConnectedAccount: jest.fn().mockResolvedValue({
        id: "ca_x",
        status: "ACTIVE",
        userId: "user-B",
        toolkitSlug: "googlecalendar",
        email: "b@x.com",
      }),
    } as unknown as ComposioGateway;
    const db = {} as Db;
    const service = new IntegrationsService(db, config, gateway);
    await expect(service.finalize("org-1", "user-A", "ca_x")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("disconnect 404s when the connection belongs to someone else", async () => {
    const db = { select: jest.fn().mockReturnValue(selectChain([])) } as unknown as Db;
    const gateway = {} as ComposioGateway;
    const service = new IntegrationsService(db, config, gateway);
    await expect(service.disconnect("org-1", "user-A", 7)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("initiate builds the calendar callback URL", async () => {
    const gateway = {
      initiateConnection: jest.fn().mockResolvedValue({ redirectUrl: "https://composio/redirect" }),
    } as unknown as ComposioGateway;
    const service = new IntegrationsService({} as Db, config, gateway);
    const result = await service.initiate("user-A", "googlecalendar");
    expect(result.redirectUrl).toBe("https://composio/redirect");
    expect(gateway.initiateConnection).toHaveBeenCalledWith(
      "user-A",
      "googlecalendar",
      "http://localhost:1000/calendar",
    );
  });
});
```

Adjust the `selectChain` mock to the real drizzle call chain used in the final service code if it drifts.

- [ ] **Step 4.8: Controller metadata spec** — `integrations.controller.spec.ts` (guards deny-by-default assurance given the fail-open PermissionGuard gap):

```ts
import { IntegrationsController } from "./integrations.controller";
import { REQUIRE_PERMISSION } from "../access/require-permission.decorator";

describe("IntegrationsController RBAC metadata", () => {
  const expectations: Array<[keyof IntegrationsController, string]> = [
    ["listConnections", "integrations:connections:view"],
    ["initiate", "integrations:connections:manage"],
    ["finalize", "integrations:connections:manage"],
    ["disconnect", "integrations:connections:manage"],
    ["setPrimary", "integrations:connections:manage"],
  ];

  it.each(expectations)("%s requires %s", (method, permission) => {
    const handler = IntegrationsController.prototype[method];
    expect(Reflect.getMetadata(REQUIRE_PERMISSION, handler)).toBe(permission);
  });
});
```

If `REQUIRE_PERMISSION` isn't exported with that exact name, use the exported constant from `require-permission.decorator.ts` (Task 2 report or a quick read confirms).

- [ ] **Step 4.9: Verify** — `pnpm -C backend build && pnpm -C backend lint && pnpm -C backend test -- --testPathPattern=integrations` — all green.

---

### Task 5: Backend — external events read path

**Files:**
- Create: `backend/src/modules/calendar/external-event-normalizers.ts`
- Create: `backend/src/modules/calendar/external-calendar-events.service.ts`
- Create: `backend/src/modules/calendar/external-event-normalizers.spec.ts`
- Modify: `backend/src/modules/calendar/calendar.controller.ts`
- Modify: `backend/src/modules/calendar/dto/calendar.schemas.ts`
- Modify: `backend/src/modules/calendar/calendar.module.ts`
- Modify: the `CACHE_KEYS` registry file (locate: `grep -rn "calendarEvents: (orgId" backend/src`)

- [ ] **Step 5.1: Verify tool slugs against the live catalog** (needs `COMPOSIO_API_KEY`; if absent, keep the constants below and flag in the report):

```bash
curl -s -H "x-api-key: $COMPOSIO_API_KEY" "https://backend.composio.dev/api/v3/tools?toolkit_slug=outlook&limit=99" | python -c "import sys,json;[print(i['slug']) for i in json.load(sys.stdin).get('items',[])]" | grep -iE "event|calendar"
curl -s -H "x-api-key: $COMPOSIO_API_KEY" "https://backend.composio.dev/api/v3/tools?toolkit_slug=googlecalendar&limit=99" | python -c "import sys,json;[print(i['slug']) for i in json.load(sys.stdin).get('items',[])]" | grep -iE "EVENTS_LIST|CREATE_EVENT|UPDATE_EVENT|DELETE_EVENT"
```

Set the constants in Step 5.2 from the output. Best-known defaults: `GOOGLECALENDAR_EVENTS_LIST`, `GOOGLECALENDAR_CREATE_EVENT`, `GOOGLECALENDAR_UPDATE_EVENT`, `GOOGLECALENDAR_DELETE_EVENT`, and for Outlook the list tool matching `CALENDAR_VIEW`/`LIST.*EVENT` plus `OUTLOOK_CALENDAR_CREATE_EVENT`.

- [ ] **Step 5.2: Normalizers** — `external-event-normalizers.ts`:

```ts
import { z } from "zod";

export const TOOL_SLUGS = {
  googleList: "GOOGLECALENDAR_EVENTS_LIST",
  googleCreate: "GOOGLECALENDAR_CREATE_EVENT",
  googleUpdate: "GOOGLECALENDAR_UPDATE_EVENT",
  googleDelete: "GOOGLECALENDAR_DELETE_EVENT",
  outlookList: "OUTLOOK_GET_CALENDAR_VIEW",
  outlookCreate: "OUTLOOK_CALENDAR_CREATE_EVENT",
} as const;

export interface ExternalCalendarEventItem {
  id: string;
  connectionId: number;
  toolkit: "googlecalendar" | "outlook";
  accountEmail: string | null;
  providerEventId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  meetingUrl: string | null;
  webLink: string | null;
}

const googleEventSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  hangoutLink: z.string().optional(),
  htmlLink: z.string().optional(),
  start: z.object({ dateTime: z.string().optional(), date: z.string().optional() }),
  end: z.object({ dateTime: z.string().optional(), date: z.string().optional() }),
});

const googleListSchema = z.object({ items: z.array(z.unknown()).optional() }).passthrough();

const graphDateSchema = z.object({ dateTime: z.string(), timeZone: z.string().optional() });

const outlookEventSchema = z.object({
  id: z.string(),
  subject: z.string().nullable().optional(),
  isAllDay: z.boolean().optional(),
  isCancelled: z.boolean().optional(),
  webLink: z.string().optional(),
  onlineMeeting: z.object({ joinUrl: z.string().optional() }).nullable().optional(),
  location: z.object({ displayName: z.string().optional() }).nullable().optional(),
  start: graphDateSchema,
  end: graphDateSchema,
});

const outlookListSchema = z.object({ value: z.array(z.unknown()).optional() }).passthrough();

function graphToIso(value: z.infer<typeof graphDateSchema>): string {
  const raw = value.dateTime.replace(/(\.\d+)?$/, "");
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value.dateTime)) return new Date(value.dateTime).toISOString();
  return new Date(`${raw}Z`).toISOString();
}

interface ConnectionMeta {
  id: number;
  accountEmail: string | null;
}

export function normalizeGoogleEvents(data: unknown, conn: ConnectionMeta): ExternalCalendarEventItem[] {
  const list = googleListSchema.parse(data);
  const items: ExternalCalendarEventItem[] = [];
  for (const raw of list.items ?? []) {
    const parsed = googleEventSchema.safeParse(raw);
    if (!parsed.success) continue;
    const ev = parsed.data;
    if (ev.status === "cancelled") continue;
    const allDay = Boolean(ev.start.date);
    const start = ev.start.dateTime ?? ev.start.date;
    const end = ev.end.dateTime ?? ev.end.date;
    if (!start || !end) continue;
    items.push({
      id: `ext-${conn.id}-${ev.id}`,
      connectionId: conn.id,
      toolkit: "googlecalendar",
      accountEmail: conn.accountEmail,
      providerEventId: ev.id,
      title: ev.summary ?? "(no title)",
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      allDay,
      location: ev.location ?? null,
      meetingUrl: ev.hangoutLink ?? null,
      webLink: ev.htmlLink ?? null,
    });
  }
  return items;
}

export function normalizeOutlookEvents(data: unknown, conn: ConnectionMeta): ExternalCalendarEventItem[] {
  const list = outlookListSchema.parse(data);
  const items: ExternalCalendarEventItem[] = [];
  for (const raw of list.value ?? []) {
    const parsed = outlookEventSchema.safeParse(raw);
    if (!parsed.success) continue;
    const ev = parsed.data;
    if (ev.isCancelled) continue;
    items.push({
      id: `ext-${conn.id}-${ev.id}`,
      connectionId: conn.id,
      toolkit: "outlook",
      accountEmail: conn.accountEmail,
      providerEventId: ev.id,
      title: ev.subject ?? "(no title)",
      start: graphToIso(ev.start),
      end: graphToIso(ev.end),
      allDay: ev.isAllDay ?? false,
      location: ev.location?.displayName ?? null,
      meetingUrl: ev.onlineMeeting?.joinUrl ?? null,
      webLink: ev.webLink ?? null,
    });
  }
  return items;
}
```

If Google's list tool wraps items differently (e.g. `data.items` vs `data.response_data.items`), adapt `googleListSchema` after inspecting one live response — record the shape in the report.

- [ ] **Step 5.3: Unit spec** — `external-event-normalizers.spec.ts` with one fixture per provider (google: dateTime event with hangoutLink + one cancelled dropped + one all-day `date` event; outlook: UTC dateTime + joinUrl + isCancelled dropped), asserting full normalized objects:

```ts
import { normalizeGoogleEvents, normalizeOutlookEvents } from "./external-event-normalizers";

const conn = { id: 5, accountEmail: "me@x.com" };

describe("normalizeGoogleEvents", () => {
  it("maps items, drops cancelled, flags all-day", () => {
    const data = {
      items: [
        {
          id: "g1",
          summary: "Standup",
          location: "Room 1",
          hangoutLink: "https://meet.google.com/abc",
          htmlLink: "https://calendar.google.com/e/g1",
          start: { dateTime: "2026-07-10T10:00:00Z" },
          end: { dateTime: "2026-07-10T10:30:00Z" },
        },
        { id: "g2", status: "cancelled", start: { date: "2026-07-11" }, end: { date: "2026-07-12" } },
        { id: "g3", start: { date: "2026-07-11" }, end: { date: "2026-07-12" } },
      ],
    };
    const result = normalizeGoogleEvents(data, conn);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "ext-5-g1",
      title: "Standup",
      meetingUrl: "https://meet.google.com/abc",
      allDay: false,
    });
    expect(result[1]).toMatchObject({ id: "ext-5-g3", allDay: true, title: "(no title)" });
  });
});

describe("normalizeOutlookEvents", () => {
  it("maps value entries and UTC times", () => {
    const data = {
      value: [
        {
          id: "o1",
          subject: "Review",
          isAllDay: false,
          webLink: "https://outlook.office.com/e/o1",
          onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/x" },
          location: { displayName: "HQ" },
          start: { dateTime: "2026-07-10T14:00:00.0000000", timeZone: "UTC" },
          end: { dateTime: "2026-07-10T15:00:00.0000000", timeZone: "UTC" },
        },
        { id: "o2", isCancelled: true, start: { dateTime: "2026-07-10T14:00:00" }, end: { dateTime: "2026-07-10T15:00:00" } },
      ],
    };
    const result = normalizeOutlookEvents(data, conn);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "ext-5-o1",
      meetingUrl: "https://teams.microsoft.com/l/x",
      start: "2026-07-10T14:00:00.000Z",
    });
  });
});
```

- [ ] **Step 5.4: Events service** — `external-calendar-events.service.ts`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { calendarEvents, userIntegrationConnections } from "../../db/schema";
import { DRIZZLE } from "../../db/drizzle.constants";
import { type Db } from "../../db/drizzle.module";
import { CacheService } from "../../common/cache/cache.service";
import { ComposioGateway, ComposioToolError } from "../integrations/composio.gateway";
import {
  TOOL_SLUGS,
  normalizeGoogleEvents,
  normalizeOutlookEvents,
  type ExternalCalendarEventItem,
} from "./external-event-normalizers";

export interface ExternalEventsResult {
  events: ExternalCalendarEventItem[];
  errors: Array<{ connectionId: number; accountEmail: string | null; message: string }>;
}

@Injectable()
export class ExternalCalendarEventsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly cache: CacheService,
    private readonly gateway: ComposioGateway,
  ) {}

  async getExternalEvents(
    orgId: string,
    userId: string,
    startIso: string,
    endIso: string,
  ): Promise<ExternalEventsResult> {
    if (!this.gateway.isConfigured()) return { events: [], errors: [] };
    const connections = await this.db
      .select({
        id: userIntegrationConnections.id,
        toolkit: userIntegrationConnections.toolkit,
        accountEmail: userIntegrationConnections.accountEmail,
        composioConnectedAccountId: userIntegrationConnections.composioConnectedAccountId,
      })
      .from(userIntegrationConnections)
      .where(
        and(
          eq(userIntegrationConnections.orgId, orgId),
          eq(userIntegrationConnections.userId, userId),
          eq(userIntegrationConnections.status, "active"),
        ),
      );
    if (connections.length === 0) return { events: [], errors: [] };

    const mappedRows = await this.db
      .select({ externalEventId: calendarEvents.externalEventId })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.orgId, orgId),
          inArray(
            calendarEvents.integrationConnectionId,
            connections.map((c) => c.id),
          ),
          isNotNull(calendarEvents.externalEventId),
        ),
      );
    const mapped = new Set(mappedRows.map((r) => r.externalEventId));

    const settled = await Promise.allSettled(
      connections.map((conn) => this.fetchForConnection(userId, conn, startIso, endIso)),
    );

    const events: ExternalCalendarEventItem[] = [];
    const errors: ExternalEventsResult["errors"] = [];
    settled.forEach((outcome, i) => {
      const conn = connections[i];
      if (!conn) return;
      if (outcome.status === "fulfilled") {
        events.push(...outcome.value.filter((e) => !mapped.has(e.providerEventId)));
      } else {
        const message =
          outcome.reason instanceof Error ? outcome.reason.message : "Failed to load external events";
        errors.push({ connectionId: conn.id, accountEmail: conn.accountEmail, message });
        if (outcome.reason instanceof ComposioToolError && outcome.reason.isAuthError) {
          void this.db
            .update(userIntegrationConnections)
            .set({ status: "needs_reauth" })
            .where(eq(userIntegrationConnections.id, conn.id));
        }
      }
    });
    events.sort((a, b) => a.start.localeCompare(b.start));
    return { events, errors };
  }

  private fetchForConnection(
    userId: string,
    conn: {
      id: number;
      toolkit: "googlecalendar" | "outlook";
      accountEmail: string | null;
      composioConnectedAccountId: string;
    },
    startIso: string,
    endIso: string,
  ): Promise<ExternalCalendarEventItem[]> {
    const cacheKey = `integrations:extevents:${conn.id}:${startIso}:${endIso}`;
    return this.cache.cached(cacheKey, async () => {
      if (conn.toolkit === "googlecalendar") {
        const data = await this.gateway.executeTool(
          TOOL_SLUGS.googleList,
          userId,
          { timeMin: startIso, timeMax: endIso, maxResults: 100, singleEvents: true },
          conn.composioConnectedAccountId,
        );
        return normalizeGoogleEvents(data, conn);
      }
      const data = await this.gateway.executeTool(
        TOOL_SLUGS.outlookList,
        userId,
        { startDateTime: startIso, endDateTime: endIso, top: 100 },
        conn.composioConnectedAccountId,
      );
      return normalizeOutlookEvents(data, conn);
    }, 60);
  }
}
```

Check `CacheService.cached`'s real signature (`cached(key, fn, ttlSeconds)`) and match. If a `CACHE_KEYS` registry exists (grep from the task header), register `externalCalendarEvents: (connectionId: number, hash: string) => ...` there and use it instead of the inline template string.

- [ ] **Step 5.5: DTO + controller endpoint.** In `dto/calendar.schemas.ts` add:

```ts
export const externalEventsQuerySchema = z.object({
  start: z.string(),
  end: z.string(),
});

export type ExternalEventsQueryInput = z.infer<typeof externalEventsQuerySchema>;
```

In `calendar.controller.ts` add (imports: `ExternalCalendarEventsService`, the schema + type):

```ts
  @Get("external-events")
  @RequirePermission("calendar:read")
  getExternalEvents(
    @Query(new ZodValidationPipe(externalEventsQuerySchema)) query: ExternalEventsQueryInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.externalEvents.getExternalEvents(u.orgId, u.userId, query.start, query.end);
  }
```

with constructor gaining `private readonly externalEvents: ExternalCalendarEventsService`. IMPORTANT: `@Get("external-events")` must be declared BEFORE any `@Get("events/:eventId")`-style parameterized route in the class if one exists (route-order shadowing) — place it right after the existing `@Get("events")` handler.

- [ ] **Step 5.6: Module wiring.** In `calendar.module.ts`: add `imports: [IntegrationsModule]` (create the array if absent), add `ExternalCalendarEventsService` to providers.

- [ ] **Step 5.7: Verify** — `pnpm -C backend build && pnpm -C backend test -- --testPathPattern="external-event"` — green.

---

### Task 6: Backend — push-sync on event create/update/delete + conference links

**Files:**
- Create: `backend/src/modules/calendar/external-calendar-sync.service.ts`
- Create: `backend/src/modules/calendar/external-calendar-sync.service.spec.ts`
- Modify: `backend/src/modules/calendar/dto/calendar.schemas.ts`
- Modify: `backend/src/modules/calendar/calendar.service.ts`
- Modify: `backend/src/modules/calendar/calendar.module.ts`

- [ ] **Step 6.1: DTO** — in `createEventSchema`'s object (before `.refine`), add:

```ts
    syncConnectionId: z.number().int().positive().optional(),
    addConference: z.boolean().optional(),
```

- [ ] **Step 6.2: Sync service** — `external-calendar-sync.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { ComposioGateway } from "../integrations/composio.gateway";
import { TOOL_SLUGS } from "./external-event-normalizers";

export interface PushEventInput {
  title: string;
  description: string | null;
  startIso: string;
  endIso: string;
  allDay: boolean;
  attendeeEmails: string[];
  addConference: boolean;
}

export interface PushConnection {
  id: number;
  toolkit: "googlecalendar" | "outlook";
  composioConnectedAccountId: string;
}

export interface PushCreateResult {
  externalEventId: string;
  meetingUrl: string | null;
}

const googleCreateResponseSchema = z
  .object({ id: z.string().optional(), hangoutLink: z.string().optional() })
  .passthrough();

const outlookCreateResponseSchema = z
  .object({
    id: z.string().optional(),
    onlineMeeting: z.object({ joinUrl: z.string().optional() }).nullable().optional(),
  })
  .passthrough();

function unwrap(data: unknown): unknown {
  if (data !== null && typeof data === "object" && "response_data" in data) {
    return (data as Record<string, unknown>).response_data;
  }
  return data;
}

@Injectable()
export class ExternalCalendarSyncService {
  constructor(private readonly gateway: ComposioGateway) {}

  async pushCreate(userId: string, conn: PushConnection, input: PushEventInput): Promise<PushCreateResult> {
    if (conn.toolkit === "googlecalendar") {
      const data = unwrap(
        await this.gateway.executeTool(
          TOOL_SLUGS.googleCreate,
          userId,
          {
            summary: input.title,
            description: input.description ?? undefined,
            start_datetime: input.startIso,
            end_datetime: input.endIso,
            create_meeting_room: input.addConference,
            attendees: input.attendeeEmails.length > 0 ? input.attendeeEmails : undefined,
          },
          conn.composioConnectedAccountId,
        ),
      );
      const parsed = googleCreateResponseSchema.parse(data);
      if (!parsed.id) throw new Error("Google Calendar did not return an event id");
      return { externalEventId: parsed.id, meetingUrl: parsed.hangoutLink ?? null };
    }
    const data = unwrap(
      await this.gateway.executeTool(
        TOOL_SLUGS.outlookCreate,
        userId,
        {
          subject: input.title,
          body: input.description ?? undefined,
          start: { dateTime: input.startIso, timeZone: "UTC" },
          end: { dateTime: input.endIso, timeZone: "UTC" },
          is_online_meeting: input.addConference,
          online_meeting_provider: input.addConference ? "teamsForBusiness" : undefined,
          attendees:
            input.attendeeEmails.length > 0
              ? input.attendeeEmails.map((email) => ({
                  emailAddress: { address: email },
                  type: "required",
                }))
              : undefined,
        },
        conn.composioConnectedAccountId,
      ),
    );
    const parsed = outlookCreateResponseSchema.parse(data);
    if (!parsed.id) throw new Error("Outlook did not return an event id");
    return { externalEventId: parsed.id, meetingUrl: parsed.onlineMeeting?.joinUrl ?? null };
  }

  async pushUpdate(
    userId: string,
    conn: PushConnection,
    externalEventId: string,
    input: Pick<PushEventInput, "title" | "description" | "startIso" | "endIso">,
  ): Promise<void> {
    if (conn.toolkit === "googlecalendar") {
      await this.gateway.executeTool(
        TOOL_SLUGS.googleUpdate,
        userId,
        {
          event_id: externalEventId,
          summary: input.title,
          description: input.description ?? undefined,
          start_datetime: input.startIso,
          end_datetime: input.endIso,
        },
        conn.composioConnectedAccountId,
      );
    }
  }

  async pushDelete(userId: string, conn: PushConnection, externalEventId: string): Promise<void> {
    if (conn.toolkit === "googlecalendar") {
      await this.gateway.executeTool(
        TOOL_SLUGS.googleDelete,
        userId,
        { event_id: externalEventId },
        conn.composioConnectedAccountId,
      );
    }
  }
}
```

(Outlook update/delete slugs were not confirmed in research — v1 propagates update/delete for Google only; Outlook events created via push stay as-created and this limitation is listed in the report + PAGES.md note. If Step 5.1's slug listing surfaced `OUTLOOK_UPDATE_CALENDAR_EVENT` / `OUTLOOK_DELETE_CALENDAR_EVENT`, wire them the same way.)

- [ ] **Step 6.3: Wire into `calendar.service.ts`.** Constructor gains `private readonly sync: ExternalCalendarSyncService` and the schema import gains `users`, `userIntegrationConnections`, plus drizzle `inArray`. Replace `createEvent`'s ending (`return { event, oooConflicts };`) with:

```ts
    let meetingUrl: string | null = null;
    let syncError: string | null = null;
    let syncedEvent = event;
    if (event && input.syncConnectionId) {
      try {
        const conn = await this.ownedActiveConnection(orgId, userId, input.syncConnectionId);
        const attendeeEmails = await this.attendeeEmails(attendeeIds);
        const pushed = await this.sync.pushCreate(userId, conn, {
          title: input.title,
          description: input.description ?? null,
          startIso: startDate.toISOString(),
          endIso: endDate.toISOString(),
          allDay: input.allDay ?? false,
          attendeeEmails,
          addConference: input.addConference ?? false,
        });
        meetingUrl = pushed.meetingUrl;
        const rows = await this.db
          .update(calendarEvents)
          .set({
            integrationConnectionId: conn.id,
            externalEventId: pushed.externalEventId,
            location: event.location ?? pushed.meetingUrl ?? null,
          })
          .where(eq(calendarEvents.id, event.id))
          .returning();
        syncedEvent = rows[0] ?? event;
      } catch (error) {
        syncError = error instanceof Error ? error.message : "Failed to sync to external calendar";
      }
    }
    return { event: syncedEvent, oooConflicts, meetingUrl, syncError };
```

and add the two private helpers to the class:

```ts
  private async ownedActiveConnection(orgId: string, userId: string, connectionId: number) {
    const rows = await this.db
      .select({
        id: userIntegrationConnections.id,
        toolkit: userIntegrationConnections.toolkit,
        composioConnectedAccountId: userIntegrationConnections.composioConnectedAccountId,
      })
      .from(userIntegrationConnections)
      .where(
        and(
          eq(userIntegrationConnections.id, connectionId),
          eq(userIntegrationConnections.orgId, orgId),
          eq(userIntegrationConnections.userId, userId),
          eq(userIntegrationConnections.status, "active"),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw new Error("Calendar account connection not found");
    return row;
  }

  private async attendeeEmails(attendeeIds: string[]): Promise<string[]> {
    if (attendeeIds.length === 0) return [];
    const rows = await this.db
      .select({ email: users.email })
      .from(users)
      .where(inArray(users.id, attendeeIds));
    return rows.map((r) => r.email).filter((e): e is string => Boolean(e));
  }
```

- [ ] **Step 6.4: Update/delete propagation.** In `updateEvent`, after the existing update returns the row (inspect the current method ending — it updates and returns), add best-effort propagation when the returned row has `integrationConnectionId` and `externalEventId`:

```ts
    if (updated?.integrationConnectionId && updated.externalEventId) {
      try {
        const conn = await this.ownedActiveConnection(orgId, userId, updated.integrationConnectionId);
        await this.sync.pushUpdate(userId, conn, updated.externalEventId, {
          title: updated.title,
          description: updated.description,
          startIso: updated.startDate.toISOString(),
          endIso: updated.endDate.toISOString(),
        });
      } catch {
        /* best-effort */
      }
    }
```

In `deleteEvent`, select the row's mapping columns BEFORE deleting, then after the delete:

```ts
    const rows = await this.db
      .select({
        integrationConnectionId: calendarEvents.integrationConnectionId,
        externalEventId: calendarEvents.externalEventId,
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, id),
          eq(calendarEvents.orgId, orgId),
          eq(calendarEvents.createdBy, userId),
        ),
      )
      .limit(1);
    const mapping = rows[0];
```

…existing delete… then:

```ts
    if (mapping?.integrationConnectionId && mapping.externalEventId) {
      try {
        const conn = await this.ownedActiveConnection(orgId, userId, mapping.integrationConnectionId);
        await this.sync.pushDelete(userId, conn, mapping.externalEventId);
      } catch {
        /* best-effort */
      }
    }
```

- [ ] **Step 6.5:** Add `ExternalCalendarSyncService` to `calendar.module.ts` providers.

- [ ] **Step 6.6: Unit spec** — `external-calendar-sync.service.spec.ts`:

```ts
import { ExternalCalendarSyncService } from "./external-calendar-sync.service";
import type { ComposioGateway } from "../integrations/composio.gateway";

describe("ExternalCalendarSyncService", () => {
  const conn = { id: 3, toolkit: "googlecalendar" as const, composioConnectedAccountId: "ca_1" };
  const input = {
    title: "Sync",
    description: null,
    startIso: "2026-07-10T10:00:00.000Z",
    endIso: "2026-07-10T11:00:00.000Z",
    allDay: false,
    attendeeEmails: ["a@x.com"],
    addConference: true,
  };

  it("returns the Meet link from a Google create", async () => {
    const gateway = {
      executeTool: jest.fn().mockResolvedValue({ id: "gev1", hangoutLink: "https://meet.google.com/xyz" }),
    } as unknown as ComposioGateway;
    const service = new ExternalCalendarSyncService(gateway);
    const result = await service.pushCreate("u1", conn, input);
    expect(result).toEqual({ externalEventId: "gev1", meetingUrl: "https://meet.google.com/xyz" });
    expect(gateway.executeTool).toHaveBeenCalledWith(
      "GOOGLECALENDAR_CREATE_EVENT",
      "u1",
      expect.objectContaining({ create_meeting_room: true, attendees: ["a@x.com"] }),
      "ca_1",
    );
  });

  it("returns the Teams link from an Outlook create", async () => {
    const gateway = {
      executeTool: jest.fn().mockResolvedValue({
        id: "oev1",
        onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/j" },
      }),
    } as unknown as ComposioGateway;
    const service = new ExternalCalendarSyncService(gateway);
    const result = await service.pushCreate("u1", { ...conn, toolkit: "outlook" }, input);
    expect(result).toEqual({ externalEventId: "oev1", meetingUrl: "https://teams.microsoft.com/l/j" });
  });
});
```

- [ ] **Step 6.7: Verify** — `pnpm -C backend build && pnpm -C backend lint && pnpm -C backend test` — all green.

---

### Task 7: Frontend — hooks + query keys + payload types

**Files:**
- Create: `frontend/hooks/api/integrations.ts`
- Modify: `frontend/hooks/api/calendar.ts`
- Modify: `frontend/lib/query-keys.ts`
- Modify: `frontend/lib/api-client.ts` (only if `/integrations` missing from `MIGRATED_PREFIXES` — check `grep -n '"/integrations"' frontend/lib/api-client.ts` first)

- [ ] **Step 7.1: Query keys.** In the `calendar` section of `lib/query-keys.ts`: remove the `googleMeetStatus` and `connections` lines; add:

```ts
    externalEvents: (start: string, end: string) => [...base, "calendar", "externalEvents", start, end] as const,
```

Add a new top-level section (same style as `featureFlags`):

```ts
  integrations: {
    all: [...base, "integrations"] as const,
    connections: () => [...base, "integrations", "connections"] as const,
  },
```

- [ ] **Step 7.2: New hooks file** — `frontend/hooks/api/integrations.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type IntegrationToolkit = "googlecalendar" | "outlook";
export type IntegrationConnectionStatus = "active" | "needs_reauth" | "disabled";

export interface IntegrationConnection {
  id: number;
  toolkit: IntegrationToolkit;
  accountEmail: string | null;
  accountLabel: string | null;
  status: IntegrationConnectionStatus;
  isPrimary: boolean;
  createdAt: string;
}

export function useIntegrationConnections() {
  return useQuery({
    queryKey: queryKeys.integrations.connections(),
    queryFn: () => apiClient.get<IntegrationConnection[]>("/integrations/connections"),
    staleTime: 60_000,
  });
}

export function useInitiateIntegrationConnection() {
  return useMutation({
    mutationKey: ["integrations", "connections", "initiate"],
    mutationFn: (toolkit: IntegrationToolkit) =>
      apiClient.post<{ redirectUrl: string }>("/integrations/connections/initiate", { toolkit }),
  });
}

export function useFinalizeIntegrationConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["integrations", "connections", "finalize"],
    mutationFn: (connectedAccountId: string) =>
      apiClient.post<IntegrationConnection>("/integrations/connections/finalize", { connectedAccountId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["integrations", "connections", "disconnect"],
    mutationFn: (connectionId: number) =>
      apiClient.delete<{ deleted: boolean }>(`/integrations/connections/${connectionId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export function useSetPrimaryIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["integrations", "connections", "set-primary"],
    mutationFn: (connectionId: number) =>
      apiClient.patch<IntegrationConnection>(`/integrations/connections/${connectionId}/primary`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
  });
}
```

- [ ] **Step 7.3: Rework `hooks/api/calendar.ts`.** Delete: `useGoogleMeetStatus`, `useCreateMeetLink`, `CalendarConnectionProvider`, `CalendarConnection`, `useCalendarConnections`, `useDisconnectCalendar`, `useSetPrimaryCalendar`. Extend `CreateCalendarEventPayload` with:

```ts
  syncConnectionId?: number;
  addConference?: boolean;
```

Read `getOooConflicts`'s return in `backend/src/modules/calendar/calendar.service.ts` and type the create/update responses truthfully:

```ts
interface OooConflict {
  userId: string;
  name: string | null;
}

interface MutateCalendarEventResponse {
  event: CalendarEvent;
  oooConflicts: OooConflict[];
  meetingUrl?: string | null;
  syncError?: string | null;
}
```

(match the actual fields getOooConflicts selects — adjust `OooConflict` to what the backend really returns). Point `useCreateCalendarEvent` at `apiClient.post<MutateCalendarEventResponse>(...)` and `useUpdateCalendarEvent` at `apiClient.put<CalendarEvent>(...)` unchanged. Add:

```ts
export interface ExternalCalendarEvent {
  id: string;
  connectionId: number;
  toolkit: "googlecalendar" | "outlook";
  accountEmail: string | null;
  providerEventId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  meetingUrl: string | null;
  webLink: string | null;
}

export interface ExternalCalendarEventsResponse {
  events: ExternalCalendarEvent[];
  errors: Array<{ connectionId: number; accountEmail: string | null; message: string }>;
}

export function useExternalCalendarEvents(start: Date, end: Date, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.calendar.externalEvents(start.toISOString(), end.toISOString()),
    queryFn: () =>
      apiClient.get<ExternalCalendarEventsResponse>("/calendar/external-events", {
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    enabled,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 7.4: PermissionKey union.** Run `grep -n "PermissionKey" frontend/hooks/api/access.ts frontend/lib/**/*.ts`. If `PermissionKey` is a string-literal union, add `"integrations:connections:view" | "integrations:connections:manage"`; if it's `string`, nothing to do.

- [ ] **Step 7.5: Verify** — `pnpm -C frontend exec tsc --noEmit` — expect errors ONLY in the three files still consuming deleted hooks (`event-create-dialog.tsx`, `event-form-fields.tsx`, settings page) which Tasks 8–10 fix; no errors in the files this task touched. Record the error list in the report.

---

### Task 8: Frontend — accounts sheet, toolbar entry, finalize-on-return, visibility filters

**Files:**
- Create: `frontend/features/calendar/calendar-accounts-sheet.tsx`
- Create: `frontend/features/calendar/use-calendar-account-filters.ts`
- Modify: `frontend/features/calendar/calendar-view.tsx`

- [ ] **Step 8.1: Filters hook** — `use-calendar-account-filters.ts` (repo has no state library; localStorage-backed):

```ts
"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "streamlineos.calendar.hiddenConnectionIds";
const listeners = new Set<() => void>();
let cache: readonly number[] = [];
let cacheRaw: string | null = null;

function readSnapshot(): readonly number[] {
  if (typeof window === "undefined") return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === "number") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: readonly number[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  cacheRaw = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCalendarAccountFilters() {
  const hiddenIds = useSyncExternalStore(subscribe, readSnapshot, () => cache);
  const toggleConnection = useCallback(
    (connectionId: number) => {
      const current = readSnapshot();
      write(
        current.includes(connectionId)
          ? current.filter((id) => id !== connectionId)
          : [...current, connectionId],
      );
    },
    [],
  );
  const showAll = useCallback(() => write([]), []);
  return { hiddenIds, toggleConnection, showAll };
}
```

- [ ] **Step 8.2: Accounts sheet** — `calendar-accounts-sheet.tsx`. Follow the density/interaction patterns of `event-detail-sheet.tsx` (Sheet right side). Full component:

```tsx
"use client";

import { useCallback, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { Loader2, Plus, RefreshCw, Star, Unplug } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useDisconnectIntegration,
  useInitiateIntegrationConnection,
  useIntegrationConnections,
  useSetPrimaryIntegration,
  type IntegrationConnection,
  type IntegrationToolkit,
} from "@/hooks/api/integrations";
import { ACCOUNT_COLORS, accountColor } from "./calendar-account-colors";
import { useCalendarAccountFilters } from "./use-calendar-account-filters";

const TOOLKIT_LABELS: Record<IntegrationToolkit, string> = {
  googlecalendar: "Google Calendar",
  outlook: "Outlook",
};

interface CalendarAccountsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CalendarAccountsSheet({ open, onClose }: CalendarAccountsSheetProps) {
  const { data: connections, isLoading } = useIntegrationConnections();
  const initiate = useInitiateIntegrationConnection();
  const disconnect = useDisconnectIntegration();
  const setPrimary = useSetPrimaryIntegration();
  const { hiddenIds, toggleConnection } = useCalendarAccountFilters();
  const [pendingToolkit, setPendingToolkit] = useState<IntegrationToolkit | null>(null);

  const handleConnect = useCallback(
    async (toolkit: IntegrationToolkit) => {
      setPendingToolkit(toolkit);
      try {
        const { redirectUrl } = await initiate.mutateAsync(toolkit);
        window.location.assign(redirectUrl);
      } catch (error) {
        setPendingToolkit(null);
        toast.error(getErrorMessage(error, "Failed to start the connection"));
      }
    },
    [initiate],
  );

  const handleConnectGoogle = useCallback(() => void handleConnect("googlecalendar"), [handleConnect]);
  const handleConnectOutlook = useCallback(() => void handleConnect("outlook"), [handleConnect]);

  const handleDisconnect = useCallback(
    async (connection: IntegrationConnection) => {
      try {
        await disconnect.mutateAsync(connection.id);
        toast.success(`${connection.accountEmail ?? TOOLKIT_LABELS[connection.toolkit]} disconnected`);
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to disconnect"));
      }
    },
    [disconnect],
  );

  const handleSetPrimary = useCallback(
    async (connectionId: number) => {
      try {
        await setPrimary.mutateAsync(connectionId);
        toast.success("Default account updated");
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to update default account"));
      }
    },
    [setPrimary],
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base">Calendar accounts</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !connections || connections.length === 0 ? (
            <EmptyState
              illustration={<EmptyCalendarIllustration className="h-24 w-24" />}
              title="No accounts connected"
              description="Connect a Google or Microsoft account to see its events here and add meeting links."
            />
          ) : (
            connections.map((connection, index) => (
              <div
                key={connection.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: accountColor(index) }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {connection.accountEmail ?? TOOLKIT_LABELS[connection.toolkit]}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {TOOLKIT_LABELS[connection.toolkit]}
                    {connection.isPrimary ? " · Default" : ""}
                  </p>
                </div>
                {connection.status === "needs_reauth" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => void handleConnect(connection.toolkit)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reconnect
                  </Button>
                ) : (
                  <Switch
                    checked={!hiddenIds.includes(connection.id)}
                    onCheckedChange={() => toggleConnection(connection.id)}
                    aria-label="Show events from this account"
                  />
                )}
                {!connection.isPrimary && connection.status === "active" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => void handleSetPrimary(connection.id)}
                    aria-label="Make default"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => void handleDisconnect(connection)}
                  aria-label="Disconnect"
                >
                  <Unplug className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="px-5 py-3 border-t shrink-0 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            disabled={pendingToolkit !== null}
            onClick={handleConnectGoogle}
          >
            {pendingToolkit === "googlecalendar" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Connect Google Calendar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            disabled={pendingToolkit !== null}
            onClick={handleConnectOutlook}
          >
            {pendingToolkit === "outlook" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Connect Microsoft Outlook
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Named handlers only (§7). If `getErrorMessage`'s signature differs (check `frontend/lib/get-error-message.ts`), adapt the two-arg calls.

- [ ] **Step 8.3: Account colors helper** — create `frontend/features/calendar/calendar-account-colors.ts`, reusing the existing palette values from `calendar-view.tsx`'s `EVENT_COLORS` (read the actual hex values there and reuse — do not invent new colors):

```ts
export const ACCOUNT_COLORS: readonly string[] = [
  /* copy the hex values of EVENT_COLORS.purple, .green, .gold, .red, .blue, .yellow from calendar-view.tsx in this order */
];

export function accountColor(index: number): string {
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] ?? "#2563eb";
}
```

The fallback literal must be one of the copied values.

- [ ] **Step 8.4: Toolbar button + finalize-on-return in `calendar-view.tsx`.** Add imports (`useSearchParams`, `Link2` from lucide, the sheet, hooks). Add state `const [accountsOpen, setAccountsOpen] = useState(false);` and named handlers `handleOpenAccounts`/`handleCloseAccounts`. Insert the button between the Export and Add dropdowns:

```tsx
          <Button
            variant="outline"
            size="icon"
            className={cn(toolbarControlClassName, "h-8 w-8 shrink-0 hover:bg-card relative")}
            aria-label="Calendar accounts"
            onClick={handleOpenAccounts}
          >
            <Link2 className="h-3.5 w-3.5" />
            {activeConnectionCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 rounded-full bg-primary px-0.5 text-[9px] font-semibold leading-3.5 text-primary-foreground">
                {activeConnectionCount}
              </span>
            )}
          </Button>
```

with `const { data: connections = [] } = useIntegrationConnections();` and `const activeConnectionCount = connections.filter((c) => c.status === "active").length;`. Render `<CalendarAccountsSheet open={accountsOpen} onClose={handleCloseAccounts} />` next to the existing sheets.

Finalize-on-return (StrictMode-guarded effect per CLAUDE.md §10):

```tsx
  const searchParams = useSearchParams();
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);
  useEffect(() => {
    const connectedAccountId = searchParams.get("connected_account_id");
    if (!connectedAccountId) return;
    if (finalizeRef.current) return;
    finalizeRef.current = true;
    finalize.mutate(connectedAccountId, {
      onSuccess: (connection) => {
        toast.success(`${connection.accountEmail ?? "Account"} connected`);
        setAccountsOpen(true);
      },
      onError: (error) => toast.error(getErrorMessage(error, "Failed to complete the connection")),
      onSettled: () => router.replace("/calendar"),
    });
  }, [searchParams, finalize, router]);
```

(`useSearchParams` requires the page's Suspense boundary — `CalendarView` is dynamically imported client-side; if `next build` complains, wrap the component usage in `app/(authenticated)/calendar/page.tsx` with `<Suspense>`.)

- [ ] **Step 8.5: Verify** — `pnpm -C frontend exec tsc --noEmit` — remaining errors only in event-create-dialog/event-form-fields/settings page.

---

### Task 9: Frontend — event form sync account + conference toggle

**Files:**
- Modify: `frontend/features/calendar/event-form-fields.tsx`
- Modify: `frontend/features/calendar/event-create-dialog.tsx`

- [ ] **Step 9.1: `event-form-fields.tsx`.** Remove props `meetStatus`, `isMeetPending`, `onGenerateMeet` (and the `MeetStatus` type + `handleGenerateMeetClick`). Add props:

```ts
  connections: IntegrationConnection[];
  syncConnectionId: string;
  addConference: boolean;
  isEdit: boolean;
  onSyncConnectionChange: (v: string) => void;
  onAddConferenceChange: (v: boolean) => void;
```

Replace the whole Meet-button block inside the location field's `<div className="flex gap-2">` with just the `<Input>` (full width), and AFTER the location field div add (hidden entirely in edit mode since v1 sync is create-only):

```tsx
      {!isEdit && connections.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Sync to calendar account</Label>
          <Select value={syncConnectionId} onValueChange={onSyncConnectionChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Don&apos;t sync</SelectItem>
              {connections
                .filter((c) => c.status === "active")
                .map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.accountEmail ?? c.accountLabel ?? c.toolkit}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {syncConnectionId !== "none" && (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <Video className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">
                  {selectedToolkit === "outlook" ? "Add Teams meeting link" : "Add Google Meet link"}
                </span>
              </div>
              <Switch checked={addConference} onCheckedChange={onAddConferenceChange} />
            </div>
          )}
        </div>
      )}
```

with `const selectedToolkit = connections.find((c) => String(c.id) === syncConnectionId)?.toolkit;` above the return, and `import type { IntegrationConnection } from "@/hooks/api/integrations";`. `Loader2` import stays only if still used — remove if not.

- [ ] **Step 9.2: `event-create-dialog.tsx`.** Remove `useGoogleMeetStatus`/`useCreateMeetLink` imports + usage + `handleGenerateMeet`. Add `useIntegrationConnections`. Form state gains (sentinel-in-default pattern, single mapping at submit — user rule):

```ts
  syncConnectionId: "none",
  addConference: true,
```

with default from primary connection when opening in create mode (in the existing open/reset effect): `syncConnectionId: primaryConnection ? String(primaryConnection.id) : "none"` where `const primaryConnection = connections.find((c) => c.isPrimary && c.status === "active");`. Named handlers:

```ts
  const handleSyncConnectionChange = useCallback(
    (v: string) => setForm((f) => ({ ...f, syncConnectionId: v })),
    [],
  );
  const handleAddConferenceChange = useCallback(
    (v: boolean) => setForm((f) => ({ ...f, addConference: v })),
    [],
  );
```

(match the file's existing form-update style — inspect how other fields set state and mirror it). In `handleSave`'s payload (create branch only):

```ts
      syncConnectionId:
        !isEdit && form.syncConnectionId !== "none" ? Number(form.syncConnectionId) : undefined,
      addConference:
        !isEdit && form.syncConnectionId !== "none" ? form.addConference : undefined,
```

and change the create success handling to surface the meeting link / sync errors:

```ts
        const result = await createEvent.mutateAsync(payload);
        if (result.syncError) {
          toast.warning(`Event created, but calendar sync failed: ${result.syncError}`);
        } else if (result.meetingUrl) {
          toast.success("Event created — meeting link added");
        } else {
          toast.success("Event created");
        }
```

Update the `<EventFormFields …>` render: remove `meetStatus`/`isMeetPending`/`onGenerateMeet` props; pass `connections={connections}`, `syncConnectionId={form.syncConnectionId}`, `addConference={form.addConference}`, `isEdit={isEdit}`, `onSyncConnectionChange={handleSyncConnectionChange}`, `onAddConferenceChange={handleAddConferenceChange}`.

- [ ] **Step 9.3: Verify** — `pnpm -C frontend exec tsc --noEmit` — remaining errors only in the settings page (Task 10 deletes it).

---

### Task 10: Frontend — external events in the grid + read-only detail + deletions

**Files:**
- Create: `frontend/features/calendar/external-event-detail-sheet.tsx`
- Modify: `frontend/features/calendar/calendar-view.tsx`
- Modify: `frontend/features/calendar/big-calendar-wrapper.tsx`
- Delete: `frontend/app/(authenticated)/settings/integrations/calendar/` (folder)
- Delete: `frontend/app/api/auth/calendar/` (folder, all 4 routes)
- Delete: `frontend/lib/api/calendar-oauth.ts`
- Modify: `frontend/app/(authenticated)/settings/integrations/page.tsx`

- [ ] **Step 10.1: Extend `BigCalEvent.resource`** in `big-calendar-wrapper.tsx` with:

```ts
    accountEmail?: string | null;
    meetingUrl?: string | null;
    webLink?: string | null;
    connectionId?: number | null;
    externalId?: string | null;
```

- [ ] **Step 10.2: Merge external events in `calendar-view.tsx`:**

```ts
  const { hiddenIds } = useCalendarAccountFilters();
  const { data: externalData } = useExternalCalendarEvents(
    rangeStart,
    rangeEnd,
    activeConnectionCount > 0,
  );

  const externalCalEvents = useMemo(
    () =>
      (externalData?.events ?? [])
        .filter((e) => !hiddenIds.includes(e.connectionId))
        .map((e) => {
          const index = connections.findIndex((c) => c.id === e.connectionId);
          return {
            id: e.id,
            title: e.title,
            start: new Date(e.start),
            end: new Date(e.end),
            allDay: e.allDay,
            resource: {
              source: "external",
              color: accountColor(index === -1 ? 0 : index),
              location: e.location,
              accountEmail: e.accountEmail,
              meetingUrl: e.meetingUrl,
              webLink: e.webLink,
              connectionId: e.connectionId,
              externalId: e.id,
            },
          };
        }),
    [externalData, hiddenIds, connections],
  );

  const allCalEvents = useMemo(
    () => [...calEvents, ...externalCalEvents],
    [calEvents, externalCalEvents],
  );
```

Pass `allCalEvents` to the calendar instead of `calEvents`. In `eventPropGetter`, FIRST branch:

```ts
    if (event.resource?.source === "external") {
      return {
        style: {
          backgroundColor: event.resource.color ?? "#2563eb",
          opacity: 0.85,
          border: "none",
          borderRadius: "4px",
          color: "#fff",
          fontSize: "12px",
          padding: "1px 6px",
        },
      };
    }
```

Surface per-account fetch errors once (place near the toolbar): when `externalData?.errors?.length`, render a compact inline banner `text-[11px] text-amber-600` listing `accountEmail — message` per error with a "Manage accounts" button (`handleOpenAccounts`). Never a broken grid.

- [ ] **Step 10.3: External detail sheet** — `external-event-detail-sheet.tsx`, modeled on `event-detail-sheet.tsx`'s layout (Sheet right 360px, time formatting, MapPin/location row):

```tsx
"use client";

import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ExternalLink, MapPin, Video } from "lucide-react";
import type { BigCalEvent } from "./big-calendar-wrapper";

interface ExternalEventDetailSheetProps {
  event: BigCalEvent | null;
  onClose: () => void;
}

export function ExternalEventDetailSheet({ event, onClose }: ExternalEventDetailSheetProps) {
  return (
    <Sheet open={event !== null} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base leading-snug">{event?.title}</SheetTitle>
          {event?.resource?.accountEmail && (
            <Badge variant="secondary" className="w-fit text-[10px]">
              {event.resource.accountEmail}
            </Badge>
          )}
        </SheetHeader>
        {event && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                {event.allDay
                  ? format(event.start, "EEE, MMM d, yyyy")
                  : `${format(event.start, "EEE, MMM d · h:mm a")} – ${format(event.end, "h:mm a")}`}
              </span>
            </div>
            {event.resource?.location && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="break-all">{event.resource.location}</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Read-only event from a connected account. Edit it in its own calendar.
            </p>
          </div>
        )}
        <div className="px-5 py-3 border-t shrink-0 flex items-center justify-end gap-2">
          {event?.resource?.meetingUrl && (
            <Button size="sm" asChild>
              <a href={event.resource.meetingUrl} target="_blank" rel="noopener noreferrer">
                <Video className="h-3.5 w-3.5 mr-1.5" />
                Join meeting
              </a>
            </Button>
          )}
          {event?.resource?.webLink && (
            <Button variant="outline" size="sm" asChild>
              <a href={event.resource.webLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open in calendar
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

In `calendar-view.tsx`, the event-click handler branches: `if (event.resource?.source === "external") { setSelectedExternal(event); return; }` (new state `const [selectedExternal, setSelectedExternal] = useState<BigCalEvent | null>(null);`, named handler `handleCloseExternal`), and render the new sheet alongside the existing detail sheet.

- [ ] **Step 10.4: Deletions.** Delete the settings calendar page folder, the `app/api/auth/calendar/` folder, and `lib/api/calendar-oauth.ts`. In `settings/integrations/page.tsx` remove the entire card entry object containing `href: "/settings/integrations/calendar"`. Then verify: `grep -rn "calendar-oauth\|settings/integrations/calendar\|create-meet\|googleMeetStatus" frontend --include="*.ts" --include="*.tsx"` — expected: no matches (PLAN docs excluded).

- [ ] **Step 10.5: Verify** — `pnpm -C frontend exec tsc --noEmit && pnpm -C frontend lint` — clean.

---

### Task 11: Full verification + PAGES.md

- [ ] **Step 11.1:** `pnpm -C backend build && pnpm -C backend lint && pnpm -C backend test` — all green.
- [ ] **Step 11.2:** `pnpm -C frontend build` — green (watch for the Next 16 `useSearchParams` Suspense requirement from Task 8).
- [ ] **Step 11.3:** Responsive sanity: calendar toolbar with the new Accounts button at 375/768/1280 (the toolbar already wraps; confirm the new button doesn't overflow at 375px).
- [ ] **Step 11.4:** Update `PAGES.md`: mark the calendar page entry with a one-line summary: external calendar accounts via Composio (multi-account connect/switch/all-accounts, external events merged read-only, Meet/Teams links on create, push sync). Note v1 limitations: Outlook update/delete propagation pending slug confirmation; Composio consent screen branding; requires `COMPOSIO_API_KEY` + two auth-config env vars.
- [ ] **Step 11.5:** Report: files changed · validation output · env vars the user must set · the 3-step Composio dashboard setup (API key; Outlook managed auth config; Google Calendar custom auth config with existing `GOOGLE_CLIENT_ID/SECRET` + Composio redirect URI `https://backend.composio.dev/api/v3.1/toolkits/auth/callback` + enable Calendar API + add test user).

---

## Self-review notes (kept for executors)

- Spec coverage: connect/multi-account/switch/all-accounts (T4, T7, T8), external merged events (T5, T10), Meet/Teams links on create (T6, T9), deletions (T2, T10), security (T3 no-token mirror, T4 RBAC+ownership, T5 partial-failure + needs_reauth), tests (T4-T6), setup guide (T11).
- Known open points, deliberately explicit: Outlook list/update/delete slugs verified live in Step 5.1; Composio SDK 0.x signatures verified in Step 1.2; `getOooConflicts` shape read in Step 7.3; `EVENT_COLORS` hexes copied in Step 8.3. Executors must resolve these against the repo/SDK — never guess.
- The pre-existing uncommitted calendar-view changes (auto-scroll/responsive toolbar) are kept; all edits are additive against the current working tree.
