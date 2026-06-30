# RBAC Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all RBAC gaps identified in the PRD — temporary access endpoints, delegation schema + endpoints, analytics `recentChanges` metric, and the matching frontend grant dialogs.

**Architecture:** Backend is NestJS in `backend/`; frontend is Next.js App Router in `frontend/`. Business logic lives only in backend. Frontend calls backend via TanStack Query hooks. All RBAC actions use `JwtAuthGuard + PermissionGuard + @RequirePermission`. Delegation requires a new `delegations` DB table (migration via Drizzle).

**Tech Stack:** NestJS, Drizzle ORM (Neon Postgres), Zod, TanStack Query, React Hook Form, shadcn/ui, date-fns

---

## File Map

### Backend — new / modified
| File | Action |
|---|---|
| `backend/src/db/schema/access.ts` | Add `delegationStatusEnum` + `delegations` table + export types |
| `backend/src/modules/access/dto/access.schemas.ts` | **New** — Zod schemas for temp-access and delegation DTOs |
| `backend/src/modules/access/temporary-access.service.ts` | **New** — list, grant, revoke temp assignments |
| `backend/src/modules/access/delegation.service.ts` | **New** — list received, list given, create, revoke delegations |
| `backend/src/modules/access/temporary-access.controller.ts` | **New** — `GET/POST /access/temporary`, `DELETE /access/temporary/:id` |
| `backend/src/modules/access/delegation.controller.ts` | **New** — `GET /access/delegations`, `GET /access/delegations/given`, `POST /access/delegations`, `DELETE /access/delegations/:delegationId` |
| `backend/src/modules/access/access.module.ts` | Register 2 new services + 2 new controllers |
| `backend/src/modules/rbac/roles.service.ts` | Fix `getRoleAnalytics` to include `recentChanges` |

### Frontend — modified
| File | Action |
|---|---|
| `frontend/app/(authenticated)/settings/temporary-access/page.tsx` | Replace disabled button with `GrantTempAccessDialog`; inline the dialog component |
| `frontend/app/(authenticated)/settings/delegations/page.tsx` | Add "Delegate permissions" button + `GrantDelegationDialog`; inline the dialog component |

---

## Task 1 — Add `delegations` table to DB schema

**Files:** Modify `backend/src/db/schema/access.ts`

- [ ] **Step 1: Add enum + table**

Open `backend/src/db/schema/access.ts`. After the existing `resourceGrantsRelations` block and before the type exports at the bottom, add:

```typescript
export const delegationStatusEnum = pgEnum("delegation_status", ["ACTIVE", "REVOKED"]);

export const delegations = pgTable(
  "delegations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    delegatorId: text("delegator_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    delegateeId: text("delegatee_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    permissions: text("permissions").array().notNull().default([]),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    reason: text("reason"),
    status: delegationStatusEnum("status").default("ACTIVE").notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedBy: text("revoked_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_delegations_org_delegatee").on(table.orgId, table.delegateeId),
    index("idx_delegations_org_delegator").on(table.orgId, table.delegatorId),
  ],
);

export const delegationsRelations = relations(delegations, ({ one }) => ({
  organization: one(organizations, {
    fields: [delegations.orgId],
    references: [organizations.id],
  }),
  delegator: one(users, {
    fields: [delegations.delegatorId],
    references: [users.id],
  }),
  delegatee: one(users, {
    fields: [delegations.delegateeId],
    references: [users.id],
  }),
}));
```

Also add the new types to the type-export block at the bottom of the file:
```typescript
export type Delegation = typeof delegations.$inferSelect;
export type NewDelegation = typeof delegations.$inferInsert;
```

And add the `delegationStatusEnum` to the existing `pgEnum` import if it isn't already there (it needs to be added to the destructured import at line 1).

- [ ] **Step 2: Export from schema barrel**

Check `backend/src/db/schema/index.ts` (or wherever `access.ts` is re-exported). Verify `delegations`, `delegationStatusEnum`, `Delegation`, `NewDelegation` are exported. If the file uses `export * from "./access"`, nothing extra is needed. If it re-exports named items, add the new ones.

- [ ] **Step 3: Generate and apply migration**

```bash
pnpm -C backend db:generate
pnpm -C backend db:push
```

Expected: A new migration file is created in `backend/migrations/`. The `delegations` table and `delegation_status` enum appear in the DB.

---

## Task 2 — Backend DTO schemas

**Files:** Create `backend/src/modules/access/dto/access.schemas.ts`

- [ ] **Step 1: Create the file**

```typescript
import { z } from "zod";

export const grantTempAccessSchema = z.object({
  userId: z.string().min(1).max(255),
  roleId: z.number().int().positive(),
  expiresAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

export const tempAccessIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createDelegationSchema = z.object({
  delegateeId: z.string().min(1).max(255),
  permissions: z.array(z.string().min(1).max(120)).min(1).max(100),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

export const delegationIdParamSchema = z.object({
  delegationId: z.string().uuid(),
});

export type GrantTempAccessInput = z.infer<typeof grantTempAccessSchema>;
export type TempAccessIdParam = z.infer<typeof tempAccessIdParamSchema>;
export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;
export type DelegationIdParam = z.infer<typeof delegationIdParamSchema>;
```

---

## Task 3 — Temporary Access service

**Files:** Create `backend/src/modules/access/temporary-access.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, isNotNull } from "drizzle-orm";
import { roles, userRoles, users } from "../../db/schema";
import { DRIZZLE } from "../../db/drizzle.constants";
import type { Db } from "../../db/drizzle.module";
import { CacheService } from "../../common/cache/cache.service";
import { CACHE_KEYS } from "../../common/cache/cache-keys";
import { AuditService } from "../../common/audit/audit.service";
import { bumpPermissionsVersion } from "../../common/rbac/access-invalidate";
import type { CurrentUserContext } from "../../common/auth/backend-claims";
import type { GrantTempAccessInput } from "./dto/access.schemas";

export interface TemporaryAssignment {
  id: number;
  userId: string;
  userName: string | null;
  roleId: number;
  roleName: string;
  expiresAt: string | null;
  reason: string | null;
  assignedBy: string | null;
  createdAt: string;
}

@Injectable()
export class TemporaryAccessService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
  ) {}

  async listTemporary(orgId: string): Promise<TemporaryAssignment[]> {
    const rows = await this.db
      .select({
        id: userRoles.id,
        userId: userRoles.userId,
        userName: users.name,
        roleId: userRoles.roleId,
        roleName: roles.name,
        expiresAt: userRoles.expiresAt,
        reason: userRoles.reason,
        assignedBy: userRoles.assignedBy,
        createdAt: userRoles.createdAt,
      })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(userRoles.orgId, orgId), isNotNull(userRoles.expiresAt)))
      .limit(200);

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      roleId: row.roleId,
      roleName: row.roleName,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      reason: row.reason,
      assignedBy: row.assignedBy,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async grantTemporary(
    actor: CurrentUserContext,
    input: GrantTempAccessInput,
  ): Promise<TemporaryAssignment> {
    const expiresAt = new Date(input.expiresAt);
    if (expiresAt <= new Date()) {
      throw new BadRequestException("expiresAt must be in the future");
    }

    const role = await this.db.query.roles.findFirst({
      where: and(eq(roles.id, input.roleId), eq(roles.orgId, actor.orgId)),
      columns: { id: true, name: true },
    });
    if (!role) throw new NotFoundException("Role not found");

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, input.userId),
      columns: { id: true, name: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const [inserted] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(userRoles)
        .values({
          orgId: actor.orgId,
          userId: input.userId,
          roleId: input.roleId,
          assignedBy: actor.userId,
          expiresAt,
          reason: input.reason ?? null,
        })
        .returning();
      await bumpPermissionsVersion(tx, actor.orgId);
      return rows;
    });

    await this.cache.invalidate(CACHE_KEYS.access(input.userId, actor.orgId));

    this.audit.log({
      action: "role.temp.granted",
      userId: actor.userId,
      orgId: actor.orgId,
      targetId: input.userId,
      targetType: "user",
      metadata: { roleId: input.roleId, expiresAt: input.expiresAt },
    });

    return {
      id: inserted.id,
      userId: inserted.userId,
      userName: user.name,
      roleId: inserted.roleId,
      roleName: role.name,
      expiresAt: inserted.expiresAt?.toISOString() ?? null,
      reason: inserted.reason,
      assignedBy: inserted.assignedBy,
      createdAt: inserted.createdAt.toISOString(),
    };
  }

  async revokeTemporary(actor: CurrentUserContext, id: number): Promise<void> {
    const assignment = await this.db.query.userRoles.findFirst({
      where: and(eq(userRoles.id, id), eq(userRoles.orgId, actor.orgId)),
      columns: { id: true, expiresAt: true, userId: true },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");
    if (!assignment.expiresAt) {
      throw new ForbiddenException("Only temporary assignments can be revoked here");
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(userRoles).where(eq(userRoles.id, id));
      await bumpPermissionsVersion(tx, actor.orgId);
    });

    await this.cache.invalidate(CACHE_KEYS.access(assignment.userId, actor.orgId));

    this.audit.log({
      action: "role.temp.revoked",
      userId: actor.userId,
      orgId: actor.orgId,
      targetId: assignment.userId,
      targetType: "user",
      metadata: { assignmentId: id },
    });
  }
}
```

---

## Task 4 — Temporary Access controller

**Files:** Create `backend/src/modules/access/temporary-access.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import type { CurrentUserContext } from "../../common/auth/backend-claims";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PermissionGuard } from "./permission.guard";
import { RequirePermission } from "./require-permission.decorator";
import { TemporaryAccessService } from "./temporary-access.service";
import {
  grantTempAccessSchema,
  tempAccessIdParamSchema,
  type GrantTempAccessInput,
  type TempAccessIdParam,
} from "./dto/access.schemas";

@Controller("access/temporary")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TemporaryAccessController {
  constructor(private readonly service: TemporaryAccessService) {}

  @Get()
  @RequirePermission("settings:rbac:manage")
  list(@CurrentUser() u: CurrentUserContext) {
    return this.service.listTemporary(u.orgId);
  }

  @Post()
  @RequirePermission("settings:rbac:manage")
  grant(
    @Body(new ZodValidationPipe(grantTempAccessSchema)) body: GrantTempAccessInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.service.grantTemporary(u, body);
  }

  @Delete(":id")
  @RequirePermission("settings:rbac:manage")
  @HttpCode(204)
  revoke(
    @Param(new ZodValidationPipe(tempAccessIdParamSchema)) params: TempAccessIdParam,
    @CurrentUser() u: CurrentUserContext,
  ): Promise<void> {
    return this.service.revokeTemporary(u, params.id);
  }
}
```

---

## Task 5 — Delegation service

**Files:** Create `backend/src/modules/access/delegation.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { delegations } from "../../db/schema";
import { DRIZZLE } from "../../db/drizzle.constants";
import type { Db } from "../../db/drizzle.module";
import { AuditService } from "../../common/audit/audit.service";
import type { CurrentUserContext } from "../../common/auth/backend-claims";
import type { CreateDelegationInput } from "./dto/access.schemas";
import type { Delegation } from "../../db/schema/access";

@Injectable()
export class DelegationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async listReceived(actor: CurrentUserContext): Promise<Delegation[]> {
    return this.db.query.delegations.findMany({
      where: and(
        eq(delegations.orgId, actor.orgId),
        eq(delegations.delegateeId, actor.userId),
      ),
      limit: 200,
    });
  }

  async listGiven(actor: CurrentUserContext): Promise<Delegation[]> {
    return this.db.query.delegations.findMany({
      where: and(
        eq(delegations.orgId, actor.orgId),
        eq(delegations.delegatorId, actor.userId),
      ),
      limit: 200,
    });
  }

  async create(
    actor: CurrentUserContext,
    input: CreateDelegationInput,
  ): Promise<Delegation> {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException("endsAt must be after startsAt");
    }
    if (endsAt <= new Date()) {
      throw new BadRequestException("endsAt must be in the future");
    }
    if (input.delegateeId === actor.userId) {
      throw new BadRequestException("Cannot delegate to yourself");
    }

    const [delegation] = await this.db
      .insert(delegations)
      .values({
        orgId: actor.orgId,
        delegatorId: actor.userId,
        delegateeId: input.delegateeId,
        permissions: input.permissions,
        startsAt,
        endsAt,
        reason: input.reason ?? null,
        status: "ACTIVE",
      })
      .returning();

    this.audit.log({
      action: "delegation.created",
      userId: actor.userId,
      orgId: actor.orgId,
      targetId: input.delegateeId,
      targetType: "user",
      metadata: { delegationId: delegation.id, permissions: input.permissions },
    });

    return delegation;
  }

  async revoke(actor: CurrentUserContext, delegationId: string): Promise<void> {
    const delegation = await this.db.query.delegations.findFirst({
      where: and(
        eq(delegations.id, delegationId),
        eq(delegations.orgId, actor.orgId),
      ),
      columns: { id: true, delegatorId: true, status: true },
    });
    if (!delegation) throw new NotFoundException("Delegation not found");
    if (delegation.delegatorId !== actor.userId) {
      throw new ForbiddenException("Only the delegator can revoke a delegation");
    }
    if (delegation.status === "REVOKED") {
      throw new BadRequestException("Delegation is already revoked");
    }

    await this.db
      .update(delegations)
      .set({ status: "REVOKED", revokedAt: new Date(), revokedBy: actor.userId })
      .where(eq(delegations.id, delegationId));

    this.audit.log({
      action: "delegation.revoked",
      userId: actor.userId,
      orgId: actor.orgId,
      targetId: delegationId,
      targetType: "delegation",
    });
  }
}
```

---

## Task 6 — Delegation controller

**Files:** Create `backend/src/modules/access/delegation.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import type { CurrentUserContext } from "../../common/auth/backend-claims";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PermissionGuard } from "./permission.guard";
import { RequirePermission } from "./require-permission.decorator";
import { DelegationService } from "./delegation.service";
import {
  createDelegationSchema,
  delegationIdParamSchema,
  type CreateDelegationInput,
  type DelegationIdParam,
} from "./dto/access.schemas";

@Controller("access/delegations")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DelegationController {
  constructor(private readonly service: DelegationService) {}

  @Get()
  @RequirePermission("settings:rbac:manage")
  listReceived(@CurrentUser() u: CurrentUserContext) {
    return this.service.listReceived(u);
  }

  @Get("given")
  @RequirePermission("settings:rbac:manage")
  listGiven(@CurrentUser() u: CurrentUserContext) {
    return this.service.listGiven(u);
  }

  @Post()
  @RequirePermission("settings:rbac:manage")
  create(
    @Body(new ZodValidationPipe(createDelegationSchema)) body: CreateDelegationInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.service.create(u, body);
  }

  @Delete(":delegationId")
  @RequirePermission("settings:rbac:manage")
  @HttpCode(204)
  revoke(
    @Param(new ZodValidationPipe(delegationIdParamSchema)) params: DelegationIdParam,
    @CurrentUser() u: CurrentUserContext,
  ): Promise<void> {
    return this.service.revoke(u, params.delegationId);
  }
}
```

---

## Task 7 — Register services + controllers in AccessModule

**Files:** Modify `backend/src/modules/access/access.module.ts`

- [ ] **Step 1: Update the module**

Replace the full file content:

```typescript
import { Global, Module } from "@nestjs/common";
import { AccessService } from "./access.service";
import { EntitlementsService } from "./entitlements.service";
import { EntitlementsController } from "./entitlements.controller";
import { PermissionGuard } from "./permission.guard";
import { ResourceGrantsService } from "./resource-grants.service";
import { ResourceGrantsController } from "./resource-grants.controller";
import { TemporaryAccessService } from "./temporary-access.service";
import { TemporaryAccessController } from "./temporary-access.controller";
import { DelegationService } from "./delegation.service";
import { DelegationController } from "./delegation.controller";

@Global()
@Module({
  controllers: [
    EntitlementsController,
    ResourceGrantsController,
    TemporaryAccessController,
    DelegationController,
  ],
  providers: [
    AccessService,
    EntitlementsService,
    PermissionGuard,
    ResourceGrantsService,
    TemporaryAccessService,
    DelegationService,
  ],
  exports: [AccessService, EntitlementsService, PermissionGuard, ResourceGrantsService],
})
export class AccessModule {}
```

---

## Task 8 — Fix `recentChanges` in analytics

**Files:** Modify `backend/src/modules/rbac/roles.service.ts`

- [ ] **Step 1: Add `auditLogs` import**

In the existing imports block near the top of `roles.service.ts`, add `auditLogs` to the schema import and add `gte`, `like` to the drizzle-orm import:

```typescript
// Change:
import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
// To:
import { and, asc, count, eq, gte, inArray, like, ne } from "drizzle-orm";

// In the schema import block add auditLogs:
import {
  auditLogs,   // ← add this
  departmentMembers,
  departments,
  groupRoles,
  organizationMembers,
  rolePermissionGrants,
  roles,
  userRoles,
  users,
} from "../../db/schema";
```

- [ ] **Step 2: Update `getRoleAnalytics` return type and implementation**

Find the `getRoleAnalytics` method (around line 543). Replace it entirely:

```typescript
async getRoleAnalytics(orgId: string): Promise<{
  totalRoles: number;
  customRoles: number;
  systemRoles: number;
  totalPermissions: number;
  usersAssigned: number;
  recentChanges: number;
}> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const orgRoles = await this.db
    .select({ id: roles.id, isSystem: roles.isSystem })
    .from(roles)
    .where(eq(roles.orgId, orgId))
    .limit(ROLES_PAGE_LIMIT);

  const totalRoles = orgRoles.length;
  const systemRoles = orgRoles.filter((r) => r.isSystem).length;
  const customRoles = totalRoles - systemRoles;

  const roleIds = orgRoles.map((r) => r.id);
  const [assignedRow] = roleIds.length > 0
    ? await this.db
        .select({ value: count() })
        .from(userRoles)
        .where(and(eq(userRoles.orgId, orgId), inArray(userRoles.roleId, roleIds)))
    : [{ value: 0 }];

  const [changesRow] = await this.db
    .select({ value: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.orgId, orgId),
        like(auditLogs.action, "role.%"),
        gte(auditLogs.createdAt, sevenDaysAgo),
      ),
    );

  return {
    totalRoles,
    customRoles,
    systemRoles,
    totalPermissions: PERMISSIONS.length,
    usersAssigned: Number(assignedRow.value),
    recentChanges: Number(changesRow.value),
  };
}
```

---

## Task 9 — Frontend: Grant Temporary Access dialog

**Files:** Modify `frontend/app/(authenticated)/settings/temporary-access/page.tsx`

- [ ] **Step 1: Replace the page with dialog-enabled version**

The current page has a `disabled` button. Replace the entire file with the version below that includes an inline `GrantTempAccessDialog` component using `react-hook-form + zod + shadcn Dialog`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { Plus, Clock, Trash2, Users, CalendarClock } from "lucide-react";
import { formatRelative } from "date-fns";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { useRoles } from "@/hooks/api/roles";
import { useHrEmployees } from "@/hooks/api/hr/employees";
import type { Employee } from "@/types/hr";

interface TemporaryAssignment {
  id: number;
  userId: string;
  userName: string | null;
  roleId: number;
  roleName: string;
  expiresAt: string | null;
  reason: string | null;
  assignedBy: string | null;
  createdAt: string;
}

const grantSchema = z.object({
  userId: z.string().min(1, "Select a user"),
  roleId: z.coerce.number().int().positive("Select a role"),
  expiresAt: z.string().min(1, "Expiry date is required"),
  reason: z.string().max(500).optional(),
});

type GrantFormValues = z.infer<typeof grantSchema>;

export default function TemporaryAccessPage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <TemporaryAccessContent />
    </DashboardGate>
  );
}

function TemporaryAccessContent() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);

  const { data: assignments, isLoading } = useQuery<TemporaryAssignment[]>({
    queryKey: ["temporary-access"],
    queryFn: () => apiClient.get<TemporaryAssignment[]>("/access/temporary"),
    staleTime: 60_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/access/temporary/${id}`),
    onSuccess: () => {
      toast.success("Access revoked");
      void queryClient.invalidateQueries({ queryKey: ["temporary-access"] });
      setRevoking(null);
    },
    onError: (error) => {
      toast.error(getApiError(error));
      setRevoking(null);
    },
  });

  const handleRevoke = useCallback(
    (id: number) => {
      setRevoking(id);
      revokeMutation.mutate(id);
    },
    [revokeMutation],
  );

  const handleGrantSuccess = useCallback(() => {
    setDialogOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["temporary-access"] });
  }, [queryClient]);

  const active = (assignments ?? []).filter(
    (a) => !a.expiresAt || new Date(a.expiresAt) > new Date(),
  );
  const expired = (assignments ?? []).filter(
    (a) => a.expiresAt && new Date(a.expiresAt) <= new Date(),
  );

  return (
    <PageWrapper
      title="Temporary Access"
      subtitle="Manage time-bound role assignments"
      actions={
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Grant temporary access
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Active temporary assignments
            </CardTitle>
            <CardDescription>
              Role assignments with an expiry date that are still active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : active.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium">No active temporary assignments</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Grant time-bound role access for contractors or temporary staff.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {active.map((assignment) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    onRevoke={handleRevoke}
                    isRevoking={revoking === assignment.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {expired.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Expired assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expired.map((assignment) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    onRevoke={handleRevoke}
                    isRevoking={revoking === assignment.id}
                    isExpired
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <GrantTempAccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleGrantSuccess}
      />
    </PageWrapper>
  );
}

interface AssignmentRowProps {
  assignment: TemporaryAssignment;
  onRevoke: (id: number) => void;
  isRevoking: boolean;
  isExpired?: boolean;
}

function AssignmentRow({
  assignment,
  onRevoke,
  isRevoking,
  isExpired,
}: AssignmentRowProps) {
  const handleRevoke = useCallback(
    () => onRevoke(assignment.id),
    [assignment.id, onRevoke],
  );

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {assignment.userName ?? assignment.userId}
          </span>
          <Badge variant="outline" className="text-xs">
            {assignment.roleName}
          </Badge>
          {isExpired && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Expired
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
          {assignment.reason && <span>Reason: {assignment.reason}</span>}
          {assignment.expiresAt && (
            <span className={isExpired ? "text-red-500" : ""}>
              {isExpired ? "Expired" : "Expires"}{" "}
              {formatRelative(new Date(assignment.expiresAt), new Date())}
            </span>
          )}
        </div>
      </div>
      {!isExpired && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:bg-destructive/10"
          onClick={handleRevoke}
          disabled={isRevoking}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface GrantTempAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function GrantTempAccessDialog({
  open,
  onOpenChange,
  onSuccess,
}: GrantTempAccessDialogProps) {
  const { data: rolesData } = useRoles();
  const employeesQuery = useHrEmployees({ limit: 500 });
  const employees: Employee[] = (() => {
    const data = employeesQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return (data as { data?: Employee[] }).data ?? [];
  })();

  const form = useForm<GrantFormValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: { userId: "", roleId: 0, expiresAt: "", reason: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: GrantFormValues) =>
      apiClient.post("/access/temporary", {
        userId: values.userId,
        roleId: values.roleId,
        expiresAt: new Date(values.expiresAt).toISOString(),
        reason: values.reason || undefined,
      }),
    onSuccess: () => {
      toast.success("Temporary access granted");
      form.reset();
      onSuccess();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const handleSubmit = useCallback(
    (values: GrantFormValues) => mutation.mutate(values),
    [mutation],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) form.reset();
      onOpenChange(open);
    },
    [form, onOpenChange],
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grant Temporary Access</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name ?? e.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(rolesData ?? []).map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires at</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" min={minDate} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Covering during leave"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Granting…" : "Grant access"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Task 10 — Frontend: Grant Delegation dialog

**Files:** Modify `frontend/app/(authenticated)/settings/delegations/page.tsx`

- [ ] **Step 1: Replace the page with a dialog-enabled version**

Replace the entire file. Key change: add a "Delegate permissions" button in the page header that opens `GrantDelegationDialog`. The dialog collects delegatee (employee select), permissions (multi-select checkboxes), start date, end date, and reason:

```typescript
"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { ArrowRightLeft, Plus, Trash2, Users, Clock } from "lucide-react";
import { formatRelative } from "date-fns";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { useHrEmployees } from "@/hooks/api/hr/employees";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { Employee } from "@/types/hr";

interface Delegation {
  id: string;
  orgId: string;
  delegatorId: string;
  delegateeId: string;
  permissions: string[];
  startsAt: string;
  endsAt: string;
  reason: string | null;
  status: string;
  createdAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
}

const delegationSchema = z
  .object({
    delegateeId: z.string().min(1, "Select a recipient"),
    permissions: z
      .array(z.string())
      .min(1, "Select at least one permission"),
    startsAt: z.string().min(1, "Start date required"),
    endsAt: z.string().min(1, "End date required"),
    reason: z.string().max(500).optional(),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: "End date must be after start date",
    path: ["endsAt"],
  });

type DelegationFormValues = z.infer<typeof delegationSchema>;

export default function DelegationsPage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <DelegationsContent />
    </DashboardGate>
  );
}

function DelegationsContent() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const { data: received, isLoading: loadingReceived } = useQuery<Delegation[]>({
    queryKey: ["delegations", "received"],
    queryFn: () => apiClient.get<Delegation[]>("/access/delegations"),
    staleTime: 60_000,
  });

  const { data: given, isLoading: loadingGiven } = useQuery<Delegation[]>({
    queryKey: ["delegations", "given"],
    queryFn: () => apiClient.get<Delegation[]>("/access/delegations/given"),
    staleTime: 60_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/access/delegations/${id}`),
    onSuccess: () => {
      toast.success("Delegation revoked");
      void queryClient.invalidateQueries({ queryKey: ["delegations"] });
      setRevoking(null);
    },
    onError: (error) => {
      toast.error(getApiError(error));
      setRevoking(null);
    },
  });

  const handleRevoke = useCallback(
    (id: string) => {
      setRevoking(id);
      revokeMutation.mutate(id);
    },
    [revokeMutation],
  );

  const handleGrantSuccess = useCallback(() => {
    setDialogOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["delegations"] });
  }, [queryClient]);

  const activeGiven = (given ?? []).filter(
    (d) => d.status === "ACTIVE" && new Date(d.endsAt) > new Date(),
  );
  const expiredOrRevoked = (given ?? []).filter(
    (d) => d.status !== "ACTIVE" || new Date(d.endsAt) <= new Date(),
  );

  return (
    <PageWrapper
      title="Permission Delegations"
      subtitle="Manage permissions you've delegated to others or received from others"
      actions={
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Delegate permissions
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Delegated to you
            </CardTitle>
            <CardDescription>
              Active permissions another user has delegated to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReceived ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : !received?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ArrowRightLeft className="h-9 w-9 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium">No delegations received</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When another user delegates permissions to you they will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {received.map((d) => (
                  <DelegationRow key={d.id} delegation={d} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Delegations you granted
            </CardTitle>
            <CardDescription>
              Permissions you have delegated to other users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGiven ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : !activeGiven.length && !expiredOrRevoked.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="h-9 w-9 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium">No delegations granted</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You haven&apos;t delegated any permissions to other users.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeGiven.map((d) => (
                  <DelegationRow
                    key={d.id}
                    delegation={d}
                    canRevoke
                    onRevoke={handleRevoke}
                    isRevoking={revoking === d.id}
                  />
                ))}
                {expiredOrRevoked.map((d) => (
                  <DelegationRow key={d.id} delegation={d} isExpired />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GrantDelegationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleGrantSuccess}
      />
    </PageWrapper>
  );
}

interface DelegationRowProps {
  delegation: Delegation;
  canRevoke?: boolean;
  onRevoke?: (id: string) => void;
  isRevoking?: boolean;
  isExpired?: boolean;
}

function DelegationRow({
  delegation,
  canRevoke,
  onRevoke,
  isRevoking,
  isExpired,
}: DelegationRowProps) {
  const handleRevoke = useCallback(
    () => onRevoke?.(delegation.id),
    [delegation.id, onRevoke],
  );
  const isRevoked = delegation.status === "REVOKED";
  const isExpiredByTime = !isRevoked && new Date(delegation.endsAt) <= new Date();

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {delegation.delegateeId}
          </span>
          <div className="flex gap-1 flex-wrap">
            {delegation.permissions.slice(0, 3).map((p) => (
              <Badge key={p} variant="outline" className="text-xs font-mono">
                {p}
              </Badge>
            ))}
            {delegation.permissions.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{delegation.permissions.length - 3} more
              </Badge>
            )}
          </div>
          {(isExpired || isRevoked || isExpiredByTime) && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {isRevoked ? "Revoked" : "Expired"}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
          {delegation.reason && <span>{delegation.reason}</span>}
          <span
            className={isExpired || isExpiredByTime ? "text-red-500" : ""}
          >
            {isExpired || isExpiredByTime || isRevoked ? "Ended" : "Ends"}{" "}
            {formatRelative(new Date(delegation.endsAt), new Date())}
          </span>
        </div>
      </div>
      {canRevoke && !isExpired && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:bg-destructive/10"
          onClick={handleRevoke}
          disabled={isRevoking}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface GrantDelegationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function GrantDelegationDialog({
  open,
  onOpenChange,
  onSuccess,
}: GrantDelegationDialogProps) {
  const employeesQuery = useHrEmployees({ limit: 500 });
  const [permSearch, setPermSearch] = useState("");

  const employees: Employee[] = (() => {
    const data = employeesQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return (data as { data?: Employee[] }).data ?? [];
  })();

  const filteredPermissions = PERMISSIONS.filter(
    (p) =>
      !permSearch ||
      p.name.toLowerCase().includes(permSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(permSearch.toLowerCase()),
  );

  const form = useForm<DelegationFormValues>({
    resolver: zodResolver(delegationSchema),
    defaultValues: {
      delegateeId: "",
      permissions: [],
      startsAt: "",
      endsAt: "",
      reason: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: DelegationFormValues) =>
      apiClient.post("/access/delegations", {
        delegateeId: values.delegateeId,
        permissions: values.permissions,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        reason: values.reason || undefined,
      }),
    onSuccess: () => {
      toast.success("Delegation created");
      form.reset();
      setPermSearch("");
      onSuccess();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const handleSubmit = useCallback(
    (values: DelegationFormValues) => mutation.mutate(values),
    [mutation],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        form.reset();
        setPermSearch("");
      }
      onOpenChange(open);
    },
    [form, onOpenChange],
  );

  const today = new Date().toISOString().slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delegate Permissions</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="delegateeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delegate to</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name ?? e.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Permissions ({field.value.length} selected)
                  </FormLabel>
                  <div className="border rounded-md">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search permissions…"
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <ScrollArea className="h-40">
                      <div className="p-2 space-y-1">
                        {filteredPermissions.map((perm) => (
                          <PermissionCheckboxItem
                            key={perm.name}
                            perm={perm}
                            checked={field.value.includes(perm.name)}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...field.value, perm.name]
                                : field.value.filter((p) => p !== perm.name);
                              field.onChange(next);
                            }}
                          />
                        ))}
                        {filteredPermissions.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No permissions match
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starts at</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" min={today} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends at</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" min={today} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Covering annual leave" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Delegating…" : "Delegate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface PermissionCheckboxItemProps {
  perm: { name: string; description: string };
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function PermissionCheckboxItem({
  perm,
  checked,
  onCheckedChange,
}: PermissionCheckboxItemProps) {
  const handleChange = useCallback(
    (v: boolean | "indeterminate") => onCheckedChange(v === true),
    [onCheckedChange],
  );

  return (
    <label className="flex items-start gap-2 cursor-pointer rounded p-1 hover:bg-muted/50">
      <Checkbox
        checked={checked}
        onCheckedChange={handleChange}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0">
        <p className="text-xs font-mono leading-snug truncate">{perm.name}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">
          {perm.description}
        </p>
      </div>
    </label>
  );
}
```

---

## Task 11 — Verify backend builds without errors

- [ ] **Step 1: Run backend build**

```bash
pnpm -C backend build
```

Expected: `BUILD SUCCESS` (or `Compilation complete` for `tsc`). Fix any TypeScript errors before proceeding. Common issues:
- `delegations` not exported from schema barrel → add to `backend/src/db/schema/index.ts`
- `Delegation` type import missing in delegation.service.ts → confirm `access.ts` exports it
- `like` not imported from drizzle-orm in roles.service.ts → add it

- [ ] **Step 2: Run frontend build**

```bash
pnpm -C frontend build
```

Expected: no TypeScript or lint errors. Common issues:
- Missing `Label` import in temp-access page → `import { Label } from "@/components/ui/label"` (label is not used — it comes via FormLabel from `@/components/ui/form`, so remove if unused)
- `PERMISSIONS` not having `action` or `resource` fields → check `frontend/lib/rbac/permissions.ts` for the exact shape

- [ ] **Step 3: Run lint**

```bash
pnpm -C frontend lint
pnpm -C backend lint
```

Fix all errors.

---

## Task 12 — Verify `PERMISSIONS` shape on frontend

The delegation dialog uses `PERMISSIONS` from `@/lib/rbac/permissions`. The `permissions/page.tsx` already uses `perm.name`, `perm.description`, and `perm.action`. Confirm these fields exist.

- [ ] **Step 1: Read the file**

```bash
# check the shape
cat frontend/lib/rbac/permissions.ts | head -40
```

If the shape is `{ name: string; description: string; resource: string; action: string }`, the dialog code is correct as-is. If any field name differs, update `PermissionCheckboxItem` to match.

---

## Notes

- **No git commands in subagents.** Only the orchestrator commits after all tasks pass build + lint.
- **Migration must run before backend starts.** If running locally, ensure `pnpm -C backend db:push` completes before testing the delegation/temp-access endpoints.
- **Cache keys:** `CACHE_KEYS.access(userId, orgId)` must exist in `backend/src/common/cache/cache-keys.ts` — it is already used by `AccessService`. If the key helper doesn't take those args, check the actual signature and adjust the service calls in `TemporaryAccessService`.
- **`delegations` must be in the Drizzle relations map** so `this.db.query.delegations.findMany` works. Ensure the `delegationsRelations` export is picked up by the schema barrel and that Drizzle's `schema` object passed to `drizzle(pool, { schema })` includes the new table.
