# PM PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the StreamlineOS PM PRD end-to-end: fix RBAC/query-key bugs, add project inline edit/archive/delete, comment permalinks, chat ticket mentions + status actions, calendar ticket linking, and clean up non-PRD routes.

**Architecture:** Backend-first (NestJS fixes → new endpoints), then frontend data layer (hooks + query keys), then UI features (Projects list, Chat, Calendar). Each subsystem is independent and can be implemented in parallel.

**Tech Stack:** NestJS (backend), Next.js App Router + TanStack Query v5 + react-hook-form + Zod (frontend), Drizzle ORM + Neon Postgres.

---

## CRITICAL RULES (read before each task)
- No `any` types, no `@ts-ignore`, no non-null assertions (`!`)
- No code comments
- Named event handlers only (no anonymous functions)
- No raw `fetch`/`axios` in components — use TanStack Query hooks
- Follow existing file naming: kebab-case for files, PascalCase for components
- Never touch git (no commit/push/checkout)
- After each file change: verify TypeScript compiles (`pnpm -C frontend tsc --noEmit`)

---

## Subsystem A — Backend Fixes + New Endpoints

### Task A1: Fix RBAC bug — creator always becomes project member

**Files:**
- Modify: `backend/src/modules/projects/projects.service.ts` (line ~212 `createProject` method)

**Root cause:** `createProject` only inserts `memberIds` into `project_members` but never inserts the creator. So a project created with no invited members has zero members, and `GET /projects/:id` (which checks membership) returns 403.

- [ ] **Step 1: Read the full `createProject` method**

Read `backend/src/modules/projects/projects.service.ts` lines 212-265 to understand current structure.

- [ ] **Step 2: Fix `createProject` to add creator as OWNER in a transaction**

In `backend/src/modules/projects/projects.service.ts`, replace the `createProject` method body so that all inserts happen in a transaction and the creator is always added:

```typescript
async createProject(orgId: string, creatorUserId: string, input: CreateProjectInput) {
  const projectKey = input.key ?? generateProjectKey(input.name);

  const project = await this.db.transaction(async (tx) => {
    const [created] = await tx
      .insert(projects)
      .values({
        orgId,
        key: projectKey,
        name: input.name,
        description: input.description,
        managerId: input.managerId,
        clientId: input.clientId,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        status: "ACTIVE",
        settings: {
          modules: input.modules ?? { sprints: true, epics: true, timeTracking: true, wiki: true },
        },
      })
      .returning();

    await tx.insert(projectStatuses).values(
      DEFAULT_STATUSES.map((s) => ({
        orgId,
        projectId: created.id,
        name: s.name,
        order: s.order,
        color: s.color,
      })),
    );

    const memberInserts = [{ projectId: created.id, userId: creatorUserId, role: "OWNER" as const }];
    const additionalIds = (input.memberIds ?? []).filter((id) => id !== creatorUserId);
    for (const userId of additionalIds) {
      memberInserts.push({ projectId: created.id, userId, role: "CONTRIBUTOR" as const });
    }
    await tx.insert(projectMembers).values(memberInserts);

    return created;
  });

  if ((input.memberIds ?? []).length > 0) {
    void this.projectsEmail
      .notifyProjectMembers(
        creatorUserId,
        (input.memberIds ?? []).filter((id) => id !== creatorUserId),
        input.name,
        projectKey,
        project.id,
      )
      .catch(() => undefined);
  }

  this.audit.log({
    action: "project.created",
    userId: creatorUserId,
    orgId,
    targetId: String(project.id),
    targetType: "project",
    metadata: { name: input.name, key: projectKey, managerId: input.managerId },
  });

  await this.cache.invalidatePattern(`projects:list:${orgId}:*`);

  return project;
}
```

- [ ] **Step 3: Build backend to verify**

```bash
cd D:/projects/personal/Streamlineos && pnpm -C backend build 2>&1 | tail -20
```

Expected: no TypeScript errors.

---

### Task A2: Add `GET /projects/search/tickets` endpoint (backend)

**Files:**
- Modify: `backend/src/modules/projects/projects.controller.ts`
- Modify: `backend/src/modules/projects/projects-tickets.service.ts`
- Modify: `backend/src/modules/projects/dto/projects.schemas.ts`

This endpoint is needed by the chat and calendar ticket pickers.

- [ ] **Step 1: Add Zod schema for the search query**

In `backend/src/modules/projects/dto/projects.schemas.ts`, add at the end:

```typescript
export const searchTicketsSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
export type SearchTicketsInput = z.infer<typeof searchTicketsSchema>;
```

- [ ] **Step 2: Add `searchOrgTickets` to the tickets service**

In `backend/src/modules/projects/projects-tickets.service.ts`, read the file to find imports, then add this method to the `ProjectsTicketsService` class:

```typescript
async searchOrgTickets(orgId: string, userId: string, input: SearchTicketsInput) {
  const { q, limit } = input;

  const memberProjectIds = await this.db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  const ids = memberProjectIds.map((r) => r.projectId);
  if (ids.length === 0) return [];

  const rows = await this.db
    .select({
      id: tickets.id,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      ticketNumber: tickets.ticketNumber,
      projectId: tickets.projectId,
      projectKey: projects.key,
      projectName: projects.name,
    })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(
      and(
        eq(tickets.orgId, orgId),
        isNull(tickets.deletedAt),
        inArray(tickets.projectId, ids),
        q
          ? or(
              sql`${tickets.title} ILIKE ${"%" + q + "%"}`,
              sql`CAST(${tickets.ticketNumber} AS TEXT) ILIKE ${"%" + q + "%"}`,
              sql`CONCAT(${projects.key}, '-', CAST(${tickets.ticketNumber} AS TEXT)) ILIKE ${"%" + q + "%"}`,
            )
          : undefined,
      ),
    )
    .orderBy(desc(tickets.updatedAt))
    .limit(limit);

  return rows;
}
```

Make sure `projectMembers`, `projects`, `isNull`, `inArray`, `or`, `desc` are imported. Check existing imports at the top of the file and add any missing ones.

- [ ] **Step 3: Add the controller endpoint**

In `backend/src/modules/projects/projects.controller.ts`, after the existing `GET` list endpoint, add:

```typescript
@Get("search/tickets")
@UseGuards(PermissionGuard)
@RequirePermission("projects:tickets:view")
searchTickets(
  @Query(new ZodValidationPipe(searchTicketsSchema)) query: SearchTicketsInput,
  @CurrentUser() u: CurrentUserContext,
) {
  return this.tickets.searchOrgTickets(u.orgId, u.userId, query);
}
```

Also add `tickets` service to the constructor injection (check if `ProjectsTicketsService` is already injected; if not, add it). Also add the schema import.

- [ ] **Step 4: Build backend**

```bash
pnpm -C backend build 2>&1 | tail -20
```

Expected: zero errors.

---

### Task A3: Add `GET /projects/:projectId/tickets/:ticketId/comments/:commentId` endpoint

**Files:**
- Modify: `backend/src/modules/projects/projects.controller.ts` (or whichever controller handles comments)
- Modify: `backend/src/modules/projects/projects-tickets.service.ts` (or comments service)

- [ ] **Step 1: Check which file handles comments**

```bash
grep -rn "comments\|comment" "D:/projects/personal/Streamlineos/backend/src/modules/projects/" --include="*.controller.ts" | grep -i "route\|@Get\|@Post" | head -20
```

- [ ] **Step 2: Add `getComment` method to the tickets service**

In the appropriate service file, add:

```typescript
async getTicketComment(orgId: string, projectId: number, ticketId: number, commentId: number) {
  const comment = await this.db.query.ticketComments.findFirst({
    where: and(
      eq(ticketComments.id, commentId),
      eq(ticketComments.ticketId, ticketId),
      eq(ticketComments.orgId, orgId),
      isNull(ticketComments.deletedAt),
    ),
    with: {
      user: {
        columns: { id: true, firstName: true, lastName: true, image: true },
      },
    },
  });

  if (!comment) throw new NotFoundException("Comment not found");

  const ticket = await this.db.query.tickets.findFirst({
    where: and(eq(tickets.id, ticketId), eq(tickets.projectId, projectId), eq(tickets.orgId, orgId)),
    columns: { id: true, title: true, ticketNumber: true, projectId: true },
  });

  if (!ticket) throw new NotFoundException("Ticket not found");

  return { comment, ticket };
}
```

- [ ] **Step 3: Add GET route to controller**

```typescript
@Get(":projectId/tickets/:ticketId/comments/:commentId")
@UseGuards(PermissionGuard)
@RequirePermission("projects:tickets:view")
getTicketComment(
  @Param("projectId", ParseIntPipe) projectId: number,
  @Param("ticketId", ParseIntPipe) ticketId: number,
  @Param("commentId", ParseIntPipe) commentId: number,
  @CurrentUser() u: CurrentUserContext,
) {
  return this.tickets.getTicketComment(u.orgId, projectId, ticketId, commentId);
}
```

- [ ] **Step 4: Build backend**

```bash
pnpm -C backend build 2>&1 | tail -20
```

---

### Task A4: Add `POST /chat/actions/ticket-status` endpoint

**Files:**
- Create: `backend/src/modules/chat/chat-actions.controller.ts`
- Create: `backend/src/modules/chat/chat-actions.service.ts`
- Modify: `backend/src/modules/chat/chat.module.ts`
- Modify: `backend/src/modules/chat/dto/chat.schemas.ts`

- [ ] **Step 1: Add Zod schema for the action**

In `backend/src/modules/chat/dto/chat.schemas.ts`, append:

```typescript
export const ticketStatusActionSchema = z.object({
  channelId: z.number().int().positive(),
  projectId: z.number().int().positive(),
  ticketId: z.number().int().positive(),
  nextStatus: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
});
export type TicketStatusActionInput = z.infer<typeof ticketStatusActionSchema>;
```

- [ ] **Step 2: Create the actions service**

Create `backend/src/modules/chat/chat-actions.service.ts`:

```typescript
import { ForbiddenException, Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { tickets, projectMembers } from "../../db/schema";
import { DRIZZLE } from "../../db/drizzle.constants";
import type { Db } from "../../db/drizzle.module";
import { AuditService } from "../../common/audit/audit.service";
import { AccessService } from "../access/access.service";
import type { CurrentUserContext } from "../../common/auth/backend-claims";
import type { TicketStatusActionInput } from "./dto/chat.schemas";

@Injectable()
export class ChatActionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly access: AccessService,
  ) {}

  async changeTicketStatus(u: CurrentUserContext, input: TicketStatusActionInput) {
    const membership = await this.db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, input.projectId),
        eq(projectMembers.userId, u.userId),
      ),
    });

    if (!membership && !u.isOrgOwner && !u.isPlatformAdmin) {
      throw new ForbiddenException("Not a project member");
    }

    const ticket = await this.db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, input.ticketId),
        eq(tickets.projectId, input.projectId),
        eq(tickets.orgId, u.orgId),
      ),
      columns: { id: true, status: true, title: true, ticketNumber: true },
    });

    if (!ticket) throw new ForbiddenException("Ticket not found or access denied");

    const prevStatus = ticket.status;

    await this.db
      .update(tickets)
      .set({ status: input.nextStatus, updatedAt: new Date() })
      .where(and(eq(tickets.id, input.ticketId), eq(tickets.orgId, u.orgId)));

    this.audit.log({
      action: "ticket.status_changed",
      userId: u.userId,
      orgId: u.orgId,
      targetId: String(input.ticketId),
      targetType: "ticket",
      metadata: {
        source: "chat",
        channelId: input.channelId,
        from: prevStatus,
        to: input.nextStatus,
      },
    });

    return { success: true, prevStatus, nextStatus: input.nextStatus };
  }
}
```

- [ ] **Step 3: Create the actions controller**

Create `backend/src/modules/chat/chat-actions.controller.ts`:

```typescript
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../access/permission.guard";
import { RequirePermission } from "../access/require-permission.decorator";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import type { CurrentUserContext } from "../../common/auth/backend-claims";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ChatActionsService } from "./chat-actions.service";
import { ticketStatusActionSchema, type TicketStatusActionInput } from "./dto/chat.schemas";
import { RequireModule } from "../../common/rbac/require-module.decorator";

@RequireModule("chat")
@Controller("chat/actions")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ChatActionsController {
  constructor(private readonly actions: ChatActionsService) {}

  @Post("ticket-status")
  @RequirePermission("projects:tickets:update")
  changeTicketStatus(
    @Body(new ZodValidationPipe(ticketStatusActionSchema)) body: TicketStatusActionInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.actions.changeTicketStatus(u, body);
  }
}
```

- [ ] **Step 4: Register in chat.module.ts**

Open `backend/src/modules/chat/chat.module.ts` and add `ChatActionsController` and `ChatActionsService` to the module's `controllers` and `providers` arrays. Also import `AccessService` from the access module if not already present (check existing imports).

- [ ] **Step 5: Build backend**

```bash
pnpm -C backend build 2>&1 | tail -20
```

---

## Subsystem B — Frontend Data Layer

### Task B1: Fix `useProjects` query key to include filters

**Files:**
- Modify: `frontend/lib/query-keys.ts` (line ~164)
- Modify: `frontend/hooks/api/projects/projects.ts` (line ~25)

- [ ] **Step 1: Update query keys to accept filters**

In `frontend/lib/query-keys.ts`, change:

```typescript
list: () => [...base, "projects", "list"] as const,
```

to:

```typescript
list: (filters?: Record<string, unknown>) => [...base, "projects", "list", filters] as const,
```

- [ ] **Step 2: Update `useProjects` to pass filters to queryKey**

In `frontend/hooks/api/projects/projects.ts`, change:

```typescript
queryKey: queryKeys.projects.list(),
```

to:

```typescript
queryKey: queryKeys.projects.list(filters as Record<string, unknown>),
```

Also set a proper `staleTime` since `refetchInterval: 30_000` without `staleTime` causes excessive network calls:

```typescript
staleTime: 30_000,
refetchInterval: 30_000,
```

- [ ] **Step 3: Add `useArchiveProject` mutation hook**

In `frontend/hooks/api/projects/projects.ts`, add after `useDeleteProject`:

```typescript
export function useArchiveProject(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { projectId: number; restore?: boolean }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { projectId: number; restore?: boolean }>({
    mutationFn: ({ projectId, restore }) =>
      apiClient.patch<{ success: boolean }>(`/projects/${projectId}`, {
        status: restore ? "ACTIVE" : "ARCHIVED",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}
```

- [ ] **Step 4: Export from barrel**

In `frontend/hooks/api/projects/index.ts`, add `useArchiveProject` to the exports from `./projects`.

- [ ] **Step 5: Add `useTicketSearch` hook**

Create `frontend/hooks/api/projects/ticket-search.ts`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface TicketSearchResult {
  id: number;
  title: string;
  status: string;
  priority: string;
  ticketNumber: number;
  projectId: number;
  projectKey: string;
  projectName: string;
}

export function useTicketSearch(
  q: string,
  options?: Omit<UseQueryOptions<TicketSearchResult[]>, "queryKey" | "queryFn">
) {
  return useQuery<TicketSearchResult[]>({
    queryKey: [...queryKeys.projects.all, "search", "tickets", q],
    queryFn: () =>
      apiClient.get<TicketSearchResult[]>("/projects/search/tickets", { q, limit: 10 }),
    enabled: q.length > 0,
    staleTime: 30_000,
    ...options,
  });
}
```

- [ ] **Step 6: Export from barrel**

In `frontend/hooks/api/projects/index.ts`, add `export * from "./ticket-search";`.

- [ ] **Step 7: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | tail -20
```

---

## Subsystem C — Projects List: Inline Edit / Archive / Delete

### Task C1: Update `new-project-dialog.tsx` to navigate after create

**Files:**
- Modify: `frontend/features/projects/project-list/new-project-dialog.tsx`

- [ ] **Step 1: Read the full file**

Read `frontend/features/projects/project-list/new-project-dialog.tsx`.

- [ ] **Step 2: Add router and navigate to new project on success**

Add `useRouter` import and navigate to the new project ID on success. The `createProjectMutation.mutateAsync` returns the project object including `id`.

Replace the `onSubmit` function:

```typescript
const router = useRouter();

function onSubmit(values: z.infer<typeof formSchema>) {
  const capitalizedValues = {
    ...values,
    name: values.name.replace(/^\w/, (c) => c.toUpperCase()),
  };
  createProjectMutation.mutate(capitalizedValues, {
    onSuccess: (project) => {
      setOpen(false);
      form.reset();
      toast.success("Project created successfully");
      router.push(`/projects/${project.id}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
```

Add imports at top:

```typescript
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/get-error-message";
```

Remove the `toast.promise` wrapper since we now handle manually.

- [ ] **Step 3: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "new-project" | head -10
```

---

### Task C2: Create `edit-project-sheet.tsx`

**Files:**
- Create: `frontend/features/projects/project-list/edit-project-sheet.tsx`

- [ ] **Step 1: Create the edit sheet component**

Create `frontend/features/projects/project-list/edit-project-sheet.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateProject } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";

const editProjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
});

type EditProjectFormValues = z.infer<typeof editProjectSchema>;

interface EditProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: number;
    name: string;
    description: string | null;
    status: string | null;
  };
}

export function EditProjectSheet({ open, onOpenChange, project }: EditProjectSheetProps) {
  const updateProject = useUpdateProject();

  const form = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
      status: (project.status as EditProjectFormValues["status"]) ?? "ACTIVE",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: project.name,
        description: project.description ?? "",
        status: (project.status as EditProjectFormValues["status"]) ?? "ACTIVE",
      });
    }
  }, [open, project, form]);

  function handleSubmit(values: EditProjectFormValues) {
    updateProject.mutate(
      { projectId: project.id, ...values },
      {
        onSuccess: () => {
          toast.success("Project updated");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="bg-muted/40 p-6 pb-4 pr-12 border-b text-left">
          <SheetTitle className="text-xl font-semibold tracking-tight">Edit Project</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Website Redesign" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What is this project about?"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateProject.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProject.isPending}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
              >
                {updateProject.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "edit-project" | head -10
```

---

### Task C3: Update `project-card.tsx` with overflow actions menu

**Files:**
- Modify: `frontend/features/projects/project-list/project-card.tsx`

- [ ] **Step 1: Read the full file**

Read `frontend/features/projects/project-list/project-card.tsx`.

- [ ] **Step 2: Rewrite with overflow menu**

Replace the full file content with:

```typescript
"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, MoreHorizontal, Pencil, Archive, Trash2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar-stack";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDeleteProject, useArchiveProject } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { EditProjectSheet } from "./edit-project-sheet";
import { useCan } from "@/hooks/api/access";

interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    key: string;
    status: string | null;
    description: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    manager: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      image: string | null;
    } | null;
    progress: { total: number; done: number; percentage: number };
    members: { id: string; firstName: string | null; lastName: string | null; image: string | null }[];
  };
}

const projectStatusAccent: Record<string, string> = {
  ACTIVE: "border-l-violet-600",
  PLANNING: "border-l-indigo-500",
  COMPLETED: "border-l-slate-400",
  ON_HOLD: "border-l-amber-500",
  ARCHIVED: "border-l-slate-300",
};

export const ProjectCard = React.memo(function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const canUpdate = useCan("projects:projects:update");
  const canDelete = useCan("projects:projects:delete");

  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();

  const status = project.status ?? "ACTIVE";
  const isArchived = status === "ARCHIVED";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusColor = getColorSafe(projectStatusColors, status);
  const statusAccent = getColorSafe(projectStatusAccent, status);
  const dateStr = project.startDate
    ? format(new Date(project.startDate), "MMM d")
    : null;
  const progressValue = project.progress.total > 0 ? project.progress.percentage : 0;
  const progressLabel =
    project.progress.total > 0
      ? `${project.progress.done}/${project.progress.total}`
      : "0/0";

  const handleCardClick = useCallback(() => {
    router.push(`/projects/${project.id}`);
  }, [router, project.id]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditOpen(true);
  }, []);

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setArchiveConfirmOpen(true);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmOpen(true);
  }, []);

  const handleArchiveConfirm = useCallback(() => {
    archiveProject.mutate(
      { projectId: project.id, restore: isArchived },
      {
        onSuccess: () => {
          toast.success(isArchived ? "Project restored" : "Project archived");
          setArchiveConfirmOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [archiveProject, project.id, isArchived]);

  const handleDeleteConfirm = useCallback(() => {
    deleteProject.mutate(
      { projectId: project.id },
      {
        onSuccess: () => {
          toast.success("Project deleted");
          setDeleteConfirmOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [deleteProject, project.id]);

  const handleMenuOpenChange = useCallback((open: boolean) => {
    if (!open) return;
  }, []);

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-200/80 border-l-[3px] bg-white/90 backdrop-blur-sm p-3 shadow-xl shadow-slate-200/60",
          "flex h-full flex-col group cursor-pointer",
          "transition-all duration-200 hover:scale-[1.02] hover:border-violet-500/30 hover:bg-violet-50 hover:shadow-md hover:shadow-violet-100/50 hover:ring-1 hover:ring-violet-500/20",
          statusAccent,
        )}
        role="listitem"
        onClick={handleCardClick}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") handleCardClick(); }}
        aria-label={`${project.name} — ${displayLabel}. Press Enter to open.`}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
          aria-hidden="true"
        />

        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded-md bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-violet-600/90">
            {project.key}
          </span>
          <div className="flex items-center gap-1">
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full border-0 px-2 py-0 text-[9px] font-semibold uppercase tracking-wide",
                statusColor,
              )}
            >
              {displayLabel}
            </Badge>
            {(canUpdate || canDelete) && (
              <DropdownMenu onOpenChange={handleMenuOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                    aria-label="Project actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                  {canUpdate && (
                    <DropdownMenuItem onClick={handleEditClick}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit project
                    </DropdownMenuItem>
                  )}
                  {canUpdate && (
                    <DropdownMenuItem onClick={handleArchiveClick}>
                      {isArchived ? (
                        <><RotateCcw className="h-3.5 w-3.5 mr-2" />Restore project</>
                      ) : (
                        <><Archive className="h-3.5 w-3.5 mr-2" />Archive project</>
                      )}
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleDeleteClick}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete project
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <h3 className="mb-0.5 line-clamp-1 text-sm font-bold text-slate-900 transition-colors group-hover:text-violet-700">
          {project.name}
        </h3>

        {project.description ? (
          <p className="mb-2 line-clamp-1 text-[11px] text-muted-foreground">
            {project.description}
          </p>
        ) : (
          <p className="mb-2 line-clamp-1 text-[10px] italic text-muted-foreground/45">
            No description
          </p>
        )}

        <div className="mt-auto border-t border-slate-100/80 pt-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-medium">Progress</span>
            <span className="tabular-nums font-medium">{progressLabel}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressValue}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <AvatarStack
              users={project.members}
              limit={4}
              className="[&>div]:h-5 [&>div]:w-5"
            />
            {dateStr && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                {dateStr}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <EditProjectSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
      />

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={isArchived ? "Restore project?" : "Archive project?"}
        description={
          isArchived
            ? "This project will be restored and set to Active."
            : "You can restore this project later from the project list."
        }
        confirmLabel={isArchived ? "Restore" : "Archive"}
        onConfirm={handleArchiveConfirm}
        loading={archiveProject.isPending}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete project?"
        description="This action cannot be undone. All tickets and data in this project will be permanently deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteProject.isPending}
      />
    </>
  );
});
```

**Note:** If `ConfirmDialog` does not exist at `@/components/ui/confirm-dialog`, check what confirm dialog component exists in the codebase:

```bash
grep -rn "ConfirmDialog\|AlertDialog\|confirm-dialog" "D:/projects/personal/Streamlineos/frontend/components" --include="*.tsx" | head -10
```

Then use whatever confirmation pattern exists (likely `AlertDialog` from shadcn/ui).

- [ ] **Step 3: Check confirm dialog component path**

```bash
ls "D:/projects/personal/Streamlineos/frontend/components/ui/" | grep -i confirm
```

If `confirm-dialog.tsx` doesn't exist, use the AlertDialog pattern from shadcn. Replace `ConfirmDialog` usage with inline `AlertDialog`:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
```

And replace each `<ConfirmDialog>` block with `<AlertDialog>` pattern.

- [ ] **Step 4: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "project-card" | head -10
```

---

### Task C4: Update `project-list-row.tsx` with overflow actions menu

**Files:**
- Modify: `frontend/features/projects/project-list/project-list-row.tsx`

- [ ] **Step 1: Rewrite with overflow menu**

Replace the full file with:

```typescript
"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronRight, MoreHorizontal, Pencil, Archive, Trash2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDeleteProject, useArchiveProject } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { EditProjectSheet } from "./edit-project-sheet";
import { useCan } from "@/hooks/api/access";

interface ProjectListRowProps {
  project: {
    id: number;
    name: string;
    key: string;
    status: string | null;
    description: string | null;
    startDate: Date | string | null;
    progress: { total: number; done: number; percentage: number };
    members: { id: string; firstName: string | null; lastName: string | null; image: string | null }[];
  };
}

export const ProjectListRow = React.memo(function ProjectListRow({ project }: ProjectListRowProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const canUpdate = useCan("projects:projects:update");
  const canDelete = useCan("projects:projects:delete");

  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();

  const status = project.status ?? "ACTIVE";
  const isArchived = status === "ARCHIVED";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusColor = getColorSafe(projectStatusColors, status);
  const dateStr = project.startDate
    ? format(new Date(project.startDate), "MMM d")
    : null;

  const handleRowClick = useCallback(() => {
    router.push(`/projects/${project.id}`);
  }, [router, project.id]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditOpen(true);
  }, []);

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setArchiveConfirmOpen(true);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmOpen(true);
  }, []);

  const handleArchiveConfirm = useCallback(() => {
    archiveProject.mutate(
      { projectId: project.id, restore: isArchived },
      {
        onSuccess: () => {
          toast.success(isArchived ? "Project restored" : "Project archived");
          setArchiveConfirmOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [archiveProject, project.id, isArchived]);

  const handleDeleteConfirm = useCallback(() => {
    deleteProject.mutate(
      { projectId: project.id },
      {
        onSuccess: () => {
          toast.success("Project deleted");
          setDeleteConfirmOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [deleteProject, project.id]);

  return (
    <>
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:shadow-sm hover:bg-muted/30 transition-all group cursor-pointer"
        role="listitem"
        onClick={handleRowClick}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") handleRowClick(); }}
        aria-label={`${project.name} — ${displayLabel}. Press Enter to open.`}
      >
        <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 w-14 text-center">
          {project.key}
        </span>

        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate flex-1 min-w-0">
          {project.name}
        </p>

        {project.progress.total > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0 w-28">
            <Progress value={project.progress.percentage} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
              {Math.round(project.progress.percentage)}%
            </span>
          </div>
        )}

        <Badge
          variant="secondary"
          className={`text-[10px] font-medium shrink-0 hidden md:inline-flex ${statusColor}`}
        >
          {displayLabel}
        </Badge>

        <div className="hidden lg:block shrink-0">
          <AvatarStack
            users={project.members}
            limit={3}
            className="[&>div]:h-6 [&>div]:w-6"
          />
        </div>

        {dateStr && (
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {dateStr}
          </div>
        )}

        {(canUpdate || canDelete) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label="Project actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              {canUpdate && (
                <DropdownMenuItem onClick={handleEditClick}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit project
                </DropdownMenuItem>
              )}
              {canUpdate && (
                <DropdownMenuItem onClick={handleArchiveClick}>
                  {isArchived ? (
                    <><RotateCcw className="h-3.5 w-3.5 mr-2" />Restore project</>
                  ) : (
                    <><Archive className="h-3.5 w-3.5 mr-2" />Archive project</>
                  )}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete project
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        )}
      </div>

      <EditProjectSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        project={{ ...project, description: project.description ?? null }}
      />

      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArchived ? "Restore project?" : "Archive project?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? "This project will be restored and set to Active."
                : "You can restore this project later from the project list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm} disabled={archiveProject.isPending}>
              {isArchived ? "Restore" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All tickets and data in this project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteProject.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
```

- [ ] **Step 2: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "project-list-row\|project-card" | head -10
```

---

## Subsystem D — Comment Permalinks

### Task D1: Add "Copy link" to each comment in `activity-feed.tsx`

**Files:**
- Modify: `frontend/features/projects/ticket-details/activity-feed.tsx`

- [ ] **Step 1: Read the full file**

Read `frontend/features/projects/ticket-details/activity-feed.tsx`.

- [ ] **Step 2: Update `CommentItem` to accept `permalinkUrl` and render copy link button**

The `ActivityFeed` component needs to receive `projectId` (already has it) and use it to construct permalink URLs. The `CommentItem` needs a `permalinkUrl` prop and a "Copy link" button.

Changes to `ActivityFeed`:
- The `projectId` prop already exists, good.
- When constructing the permalink, we need `ticketId` too. The `ActivityFeed` props already have `ticketId`.

Add the copy link handler and button to `CommentItem`. The link format is:
`/projects/{projectId}?ticket={ticketId}&comment={commentId}`

In `ActivityFeed`, add `ticketId` to each `CommentItem` call (it already has `ticketId` from props), and add `projectId`.

Updated `CommentItemProps` interface — add:
```typescript
permalinkUrl: string;
```

Updated `CommentItem` component — add a "Copy link" hover action:

Inside the `div.flex.items-center.gap-3.mt-1.5`, after the `EmojiReactionBar`, add:

```typescript
<button
  type="button"
  onClick={() => {
    navigator.clipboard.writeText(window.location.origin + permalinkUrl).then(() => {
      toast.success("Link copied");
    });
  }}
  className="text-[11px] text-muted-foreground hover:text-violet-600 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
  aria-label="Copy comment link"
>
  <Link className="h-3 w-3" />
  Copy link
</button>
```

Add `Link` to the lucide-react import.

In the calls to `CommentItem` inside `ActivityFeed`, pass `permalinkUrl`:

```typescript
permalinkUrl={`/projects/${projectId}?ticket=${ticketId}&comment=${comment.id}`}
```

For replies, use the same URL structure:
```typescript
permalinkUrl={`/projects/${projectId}?ticket=${ticketId}&comment=${reply.id}`}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "activity-feed" | head -10
```

---

### Task D2: Update board `page.tsx` to read `comment` param

**Files:**
- Modify: `frontend/app/(authenticated)/projects/[projectId]/page.tsx`

- [ ] **Step 1: Read current page.tsx**

Read `frontend/app/(authenticated)/projects/[projectId]/page.tsx` fully.

- [ ] **Step 2: Add commentId extraction and pass to TicketDetailsDialog**

In the page component, after `const ticketParam = searchParams.get("ticket");`:

```typescript
const commentParam = searchParams.get("comment");
const highlightCommentId = commentParam ? parseInt(commentParam) : null;
```

Then pass `highlightCommentId` to `TicketDetailsDialog`:

```typescript
<TicketDetailsDialog
  ticketId={selectedTicketId}
  projectId={projectId}
  open={!!selectedTicketId}
  onOpenChange={handleTicketClose}
  highlightCommentId={highlightCommentId}
/>
```

---

### Task D3: Update `ticket-details-dialog.tsx` to scroll/highlight comment

**Files:**
- Modify: `frontend/features/projects/ticket-details/ticket-details-dialog.tsx`
- Modify: `frontend/features/projects/ticket-details/types.ts`

- [ ] **Step 1: Add `highlightCommentId` to props type**

In `frontend/features/projects/ticket-details/types.ts`, read the file first, then add `highlightCommentId?: number | null` to `TicketDetailsDialogProps`.

- [ ] **Step 2: Pass `highlightCommentId` down to `ActivityFeed`**

In `ticket-details-dialog.tsx`, accept `highlightCommentId` prop and pass it to `ActivityFeed`.

- [ ] **Step 3: Implement scroll/highlight in `ActivityFeed`**

Update `ActivityFeedProps` to accept `highlightCommentId?: number | null`.

In the `ActivityFeed` component, use a `useEffect` + `useRef` to scroll to the highlighted comment when it changes:

```typescript
const commentRef = useRef<Map<number, HTMLDivElement>>(new Map());
const highlightedRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if (!highlightCommentId) return;
  const el = commentRef.current.get(highlightCommentId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}, [highlightCommentId]);
```

In `CommentItem`, accept a `ref` and the `isHighlighted` boolean:

```typescript
const highlightClass = isHighlighted
  ? "bg-violet-50 border border-violet-200 rounded-lg px-2 -mx-2 transition-colors"
  : "";
```

Apply `highlightClass` to the comment's wrapper div for ~2 seconds using a local `useState` that gets reset:

```typescript
const [highlighted, setHighlighted] = useState(isHighlighted);
useEffect(() => {
  if (!isHighlighted) return;
  setHighlighted(true);
  const timer = setTimeout(() => setHighlighted(false), 2000);
  return () => clearTimeout(timer);
}, [isHighlighted]);
```

- [ ] **Step 4: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "ticket-details\|activity-feed" | head -10
```

---

## Subsystem E — Chat Ticket Integration

### Task E1: Extend `chat-types.ts` for typed metadata entities

**Files:**
- Modify: `frontend/features/chat/chat-types.ts`

- [ ] **Step 1: Add typed metadata**

Append to `frontend/features/chat/chat-types.ts`:

```typescript
export interface TicketEntityRef {
  type: "ticket";
  id: string;
  projectId: number;
  ticketNumber?: number;
  projectKey?: string;
  title?: string;
  status?: string;
  priority?: string;
}

export interface CommentEntityRef {
  type: "comment";
  id: string;
  ticketId: number;
  projectId: number;
}

export type EntityRef = TicketEntityRef | CommentEntityRef;

export interface MessageMetadata {
  entities?: EntityRef[];
}
```

Update the `Message` type's `metadata` field:

```typescript
metadata: MessageMetadata | null;
```

- [ ] **Step 2: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "chat-types" | head -10
```

---

### Task E2: Create `ticket-mention-picker.tsx` (shared component)

**Files:**
- Create: `frontend/features/chat/ticket-mention-picker.tsx`

- [ ] **Step 1: Create the picker component**

```typescript
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, Search, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTicketSearch } from "@/hooks/api/projects";
import type { TicketSearchResult } from "@/hooks/api/projects";

interface TicketMentionPickerProps {
  query: string;
  onSelect: (ticket: TicketSearchResult) => void;
  selectedIndex: number;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-200 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};

export function TicketMentionPicker({
  query,
  onSelect,
  selectedIndex,
  className,
}: TicketMentionPickerProps) {
  const { data: tickets = [], isLoading, isError } = useTicketSearch(query);

  const handleSelect = useCallback(
    (ticket: TicketSearchResult) => {
      onSelect(ticket);
    },
    [onSelect],
  );

  return (
    <div
      role="listbox"
      aria-label="Tickets"
      className={cn(
        "absolute bottom-full mb-1 left-0 w-80 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
        <Ticket className="h-3.5 w-3.5" />
        Tickets
      </div>

      <div className="max-h-52 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching tickets…
          </div>
        ) : isError ? (
          <div className="px-3 py-3 text-sm text-muted-foreground">
            Can't search tickets right now
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-3 py-3 text-sm text-muted-foreground">
            No matching tickets
          </div>
        ) : (
          tickets.map((ticket, idx) => (
            <button
              key={ticket.id}
              role="option"
              aria-selected={idx === selectedIndex}
              onClick={() => handleSelect(ticket)}
              className={cn(
                "w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
                idx === selectedIndex && "bg-violet-50",
              )}
            >
              <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5 w-16">
                {ticket.projectKey}-{ticket.ticketNumber}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{ticket.title}</p>
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium mt-0.5",
                    STATUS_COLORS[ticket.status] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {ticket.status.replace("_", " ")}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "ticket-mention-picker" | head -5
```

---

### Task E3: Update `message-input.tsx` to support `#` ticket picker

**Files:**
- Modify: `frontend/features/chat/message-input.tsx`

- [ ] **Step 1: Read the full message-input.tsx**

Read the full file to understand current `@` mention implementation. It uses a `mentionQuery` state and a `MentionItem` dropdown.

- [ ] **Step 2: Add ticket picker state and `#` trigger logic**

The key additions:
1. State: `ticketQuery` (string when picker is open, null when closed) and `ticketSelectedIndex`
2. Detect `#` typed in textarea → open picker
3. When user selects a ticket → insert `${projectKey}-${ticketNumber}` token + add to metadata entities
4. Backspace handling: treat full token as one unit (use a token marker pattern)

Add these states alongside existing mention states:

```typescript
const [ticketQuery, setTicketQuery] = useState<string | null>(null);
const [ticketSelectedIndex, setTicketSelectedIndex] = useState(0);
const pendingEntities = useRef<TicketEntityRef[]>([]);
```

In the `onKeyDown` handler, before the existing mention handling, detect `#`:

```typescript
if (e.key === "#" || (e.key === "Shift" && e.key === "3")) {
  // Handled in onChange
}
```

Actually, detect in `onChange`:

```typescript
const handleTextChange = useCallback(
  (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    
    // Detect # trigger for ticket picker
    const hashMatch = val.slice(0, e.target.selectionEnd ?? val.length).match(/#([^\s]*)$/);
    if (hashMatch) {
      setTicketQuery(hashMatch[1]);
      setTicketSelectedIndex(0);
      return;
    }
    
    // Detect @ trigger for user mentions (existing)
    const atMatch = val.slice(0, e.target.selectionEnd ?? val.length).match(/@([^\s]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
      setTicketQuery(null);
      return;
    }
    
    setTicketQuery(null);
    setMentionQuery(null);
  },
  [],
);
```

When a ticket is selected from the picker:

```typescript
const handleTicketSelect = useCallback(
  (ticket: TicketSearchResult) => {
    const token = `${ticket.projectKey}-${ticket.ticketNumber}`;
    const newText = text.replace(/#[^\s]*$/, token + " ");
    setText(newText);
    setTicketQuery(null);
    setTicketSelectedIndex(0);
    pendingEntities.current = [
      ...pendingEntities.current,
      {
        type: "ticket" as const,
        id: String(ticket.id),
        projectId: ticket.projectId,
        ticketNumber: ticket.ticketNumber,
        projectKey: ticket.projectKey,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
      },
    ];
  },
  [text],
);
```

When sending the message, include `metadata.entities`:

```typescript
const metadata = pendingEntities.current.length > 0
  ? { entities: pendingEntities.current }
  : undefined;
// pass metadata to sendMessage mutation
```

Add `TicketMentionPicker` component in the render, near the existing mention picker:

```typescript
{ticketQuery !== null && (
  <TicketMentionPicker
    query={ticketQuery}
    onSelect={handleTicketSelect}
    selectedIndex={ticketSelectedIndex}
  />
)}
```

Add keyboard navigation for the ticket picker in `onKeyDown`:

```typescript
if (ticketQuery !== null) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setTicketSelectedIndex((i) => Math.min(i + 1, 9));
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    setTicketSelectedIndex((i) => Math.max(i - 1, 0));
    return;
  }
  if (e.key === "Escape") {
    setTicketQuery(null);
    return;
  }
}
```

Add import for `TicketMentionPicker` and `TicketSearchResult`:

```typescript
import { TicketMentionPicker } from "./ticket-mention-picker";
import type { TicketSearchResult } from "@/hooks/api/projects";
import type { TicketEntityRef } from "./chat-types";
```

Reset `pendingEntities.current = []` after the message is sent successfully.

- [ ] **Step 3: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "message-input" | head -10
```

---

### Task E4: Update `chat-bubble.tsx` to render ticket pills + status action

**Files:**
- Modify: `frontend/features/chat/chat-bubble.tsx`

- [ ] **Step 1: Read the full chat-bubble.tsx**

Read `frontend/features/chat/chat-bubble.tsx` in full to understand current structure.

- [ ] **Step 2: Add ticket pill rendering**

Add a new `TicketPill` component inside the file:

```typescript
interface TicketPillProps {
  entity: TicketEntityRef;
  channelId: number;
}

const STATUS_DISPLAY: Record<string, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};

function TicketPill({ entity, channelId }: TicketPillProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(entity.status ?? "TODO");
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const canUpdate = useCan("projects:tickets:update");

  const ticketKey = entity.projectKey && entity.ticketNumber
    ? `${entity.projectKey}-${entity.ticketNumber}`
    : `Ticket #${entity.id}`;

  const handlePillClick = useCallback(() => {
    router.push(`/projects/${entity.projectId}?ticket=${entity.id}`);
  }, [router, entity.projectId, entity.id]);

  const handleStatusChange = useCallback(
    async (nextStatus: string) => {
      const prev = currentStatus;
      setCurrentStatus(nextStatus);
      setIsChangingStatus(true);
      try {
        await apiClient.post("/chat/actions/ticket-status", {
          channelId,
          projectId: entity.projectId,
          ticketId: Number(entity.id),
          nextStatus,
        });
      } catch (err) {
        setCurrentStatus(prev);
        toast.error("Failed to update ticket status");
      } finally {
        setIsChangingStatus(false);
      }
    },
    [currentStatus, channelId, entity],
  );

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/80 px-2.5 py-1.5 text-sm shadow-sm hover:shadow-md transition-all my-1">
      <button
        onClick={handlePillClick}
        className="flex items-center gap-1.5 font-mono text-[12px] text-violet-600 hover:text-violet-700 font-semibold"
        aria-label={`Open ticket ${ticketKey}`}
      >
        <Ticket className="h-3.5 w-3.5" />
        {ticketKey}
      </button>
      {entity.title && (
        <button
          onClick={handlePillClick}
          className="text-[12px] text-foreground hover:underline truncate max-w-[200px]"
        >
          {entity.title}
        </button>
      )}
      {canUpdate ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={isChangingStatus}
              className={cn(
                "inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity",
                STATUS_COLORS[currentStatus] ?? "bg-muted text-muted-foreground",
              )}
              aria-label="Change ticket status"
            >
              {isChangingStatus ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                STATUS_DISPLAY[currentStatus] ?? currentStatus
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(s === currentStatus && "font-semibold")}
              >
                {STATUS_DISPLAY[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium",
            STATUS_COLORS[currentStatus] ?? "bg-muted text-muted-foreground",
          )}
        >
          {STATUS_DISPLAY[currentStatus] ?? currentStatus}
        </span>
      )}
    </div>
  );
}
```

Add the necessary imports:

```typescript
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Ticket } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import type { TicketEntityRef, MessageMetadata } from "./chat-types";
import { useState } from "react";
```

In the main `ChatBubble` component, after rendering the message text content, render ticket pills if the message has entity metadata:

```typescript
const metadata = message.metadata as MessageMetadata | null;
const ticketEntities = (metadata?.entities ?? []).filter(
  (e): e is TicketEntityRef => e.type === "ticket",
);

{ticketEntities.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {ticketEntities.map((entity) => (
      <TicketPill key={entity.id} entity={entity} channelId={message.channelId} />
    ))}
  </div>
)}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "chat-bubble" | head -10
```

---

## Subsystem F — Calendar Integration

### Task F1: Update `event-create-dialog.tsx` with ticket link section

**Files:**
- Modify: `frontend/features/calendar/event-create-dialog.tsx`

- [ ] **Step 1: Read the full file**

Read `frontend/features/calendar/event-create-dialog.tsx` fully.

- [ ] **Step 2: Add `linkedTicketId` to `FormState` and render ticket selector**

Add to `FormState` interface:

```typescript
linkedTicketId: number | null;
linkedTicketMeta: { projectKey: string; ticketNumber: number; title: string; projectId: number } | null;
```

Add to `toDefaultForm`:

```typescript
linkedTicketId: null,
linkedTicketMeta: null,
```

Add to `toEditForm` (check if event has entity):

```typescript
linkedTicketId: event.entityType === "ticket" && event.entityId ? Number(event.entityId) : null,
linkedTicketMeta: null,
```

Add a "Linked work item" section to the form, below the description field:

```typescript
<div className="space-y-2">
  <label className="text-sm font-medium">Linked work item</label>
  {form.linkedTicketMeta ? (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <Ticket className="h-3.5 w-3.5 text-violet-600 shrink-0" />
      <span className="font-mono text-[11px] text-violet-600">
        {form.linkedTicketMeta.projectKey}-{form.linkedTicketMeta.ticketNumber}
      </span>
      <span className="text-sm truncate flex-1">{form.linkedTicketMeta.title}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleUnlinkTicket}
        aria-label="Remove linked ticket"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => setTicketPickerOpen(true)}
    >
      <Ticket className="h-3.5 w-3.5" />
      Link a ticket
    </Button>
  )}
</div>
```

Add `ticketPickerOpen` state and a `TicketSearchModal` (a simple sheet/dialog with the ticket search picker).

Add a `CalendarTicketPicker` component inside the file:

```typescript
interface CalendarTicketPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (ticket: TicketSearchResult) => void;
}

function CalendarTicketPicker({ open, onOpenChange, onSelect }: CalendarTicketPickerProps) {
  const [q, setQ] = useState("");
  const { data: tickets = [], isLoading } = useTicketSearch(q);

  const handleSelect = useCallback(
    (ticket: TicketSearchResult) => {
      onSelect(ticket);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh] pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle>Link a ticket</SheetTitle>
        </SheetHeader>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by ticket key or title…"
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>
        <div className="overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => handleSelect(ticket)}
              className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-muted/40 transition-colors"
            >
              <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5">
                {ticket.projectKey}-{ticket.ticketNumber}
              </span>
              <span className="text-sm flex-1 min-w-0 truncate">{ticket.title}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

When building the create/update payload, include `entityType` and `entityId`:

```typescript
const payload = {
  ...existingFields,
  entityType: form.linkedTicketId ? "ticket" : undefined,
  entityId: form.linkedTicketId ? String(form.linkedTicketId) : undefined,
};
```

Add imports: `Ticket`, `Search`, `Loader2`, `X` from lucide-react; `useTicketSearch`, `TicketSearchResult` from hooks; `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` from ui.

- [ ] **Step 3: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "event-create" | head -10
```

---

### Task F2: Update `event-detail-sheet.tsx` with linked ticket display

**Files:**
- Modify: `frontend/features/calendar/event-detail-sheet.tsx`

- [ ] **Step 1: Read the full file**

Read `frontend/features/calendar/event-detail-sheet.tsx`.

- [ ] **Step 2: Add linked ticket section**

After checking `event?.entityType === "ticket"` and `event?.entityId`, render a "Linked ticket" section.

Add state for unlink confirmation:

```typescript
const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
const canUpdateCalendar = useCan("calendar:events:update");
const updateEvent = useUpdateCalendarEvent();
```

In the sheet body, after the description section, add:

```typescript
{event?.entityType === "ticket" && event.entityId && (
  <div className="space-y-2 pt-3 border-t">
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
      <Ticket className="h-3.5 w-3.5" />
      Linked ticket
    </div>
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <Link
        href={`/projects/${event.entityId}`}
        className="flex-1 flex items-center gap-2 min-w-0 hover:underline text-sm"
        onClick={() => onClose()}
      >
        <ExternalLink className="h-3.5 w-3.5 text-violet-600 shrink-0" />
        <span className="truncate">Ticket {event.entityId}</span>
      </Link>
      {canUpdateCalendar && numericEventId && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => setUnlinkConfirmOpen(true)}
          aria-label="Unlink ticket"
        >
          Unlink
        </Button>
      )}
    </div>
  </div>
)}
```

**Note:** The linked ticket section shows the ticket entity ID. For a better UX, we'd show the ticket key + title, but that requires an additional fetch. For now, show the ID and navigate to the project-level URL. To improve this later, use `useTicketSearch` or a dedicated ticket fetch hook.

Add the unlink confirm dialog and handler:

```typescript
const handleUnlinkTicket = useCallback(async () => {
  if (!numericEventId) return;
  await updateEvent.mutateAsync({
    id: numericEventId,
    entityType: undefined,
    entityId: undefined,
  });
  toast.success("Ticket unlinked");
  setUnlinkConfirmOpen(false);
}, [numericEventId, updateEvent]);
```

Add `AlertDialog` for the unlink confirmation.

Import `Ticket`, `ExternalLink` from lucide-react; `useCan` from `@/hooks/api/access`; `useUpdateCalendarEvent` from `@/hooks/api/calendar`.

- [ ] **Step 3: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "event-detail" | head -10
```

---

### Task F3: Add "Create ticket from calendar" entry point

**Files:**
- Modify: `frontend/features/calendar/calendar-view.tsx`

- [ ] **Step 1: Read calendar-view.tsx**

Read `frontend/features/calendar/calendar-view.tsx` to understand the header "Add" dropdown or slot select patterns.

- [ ] **Step 2: Add "Add ticket" dropdown item in header**

Find the header area that has "Add event" button/dropdown. Add a second option "Add ticket due date" that opens a `CreateTicketFromCalendarSheet`.

Create a small sheet component inline or as a separate file `calendar-create-ticket-sheet.tsx`:

```typescript
interface CalendarCreateTicketSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDueDate?: Date;
}
```

The sheet should:
- Show a project selector (`useProjects` for the list)
- Show a title input
- Pre-fill due date from `defaultDueDate`
- On submit: call `POST /projects/:projectId/tickets` via `useCreateTicket`
- On success: toast + navigate to `/projects/[projectId]?ticket=[ticketId]`

Since `useCreateTicket` likely exists in the tickets hooks, use it. Check:

```bash
grep -n "useCreateTicket\|createTicket" "D:/projects/personal/Streamlineos/frontend/hooks/api/projects/tickets.ts" | head -5
```

Then implement the sheet accordingly.

- [ ] **Step 3: Typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1 | grep "calendar-view\|calendar-create" | head -10
```

---

## Subsystem G — Cleanup: Remove Non-PRD Routes

### Task G1: Remove `/projects/[projectId]/audit` route

**Files:**
- Delete: `frontend/app/(authenticated)/projects/[projectId]/audit/page.tsx`
- Delete: `frontend/app/(authenticated)/projects/[projectId]/audit/loading.tsx`

- [ ] **Step 1: Check for any navigation links pointing to the audit route**

```bash
grep -rn "audit\|/audit" "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/projects/[projectId]/layout.tsx" | head -10
grep -rn "audit" "D:/projects/personal/Streamlineos/frontend/features/projects/" | grep -v ".test" | head -10
```

- [ ] **Step 2: Remove nav link if exists**

If there's a sidebar or layout nav item pointing to `/audit`, remove it.

- [ ] **Step 3: Delete the route files**

```bash
rm "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/projects/[projectId]/audit/page.tsx"
rm "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/projects/[projectId]/audit/loading.tsx"
```

Then verify the folder is empty and remove it:

```bash
rmdir "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/projects/[projectId]/audit"
```

---

### Task G2: Remove `/projects/[projectId]/releases` route

**Files:**
- Delete: `frontend/app/(authenticated)/projects/[projectId]/releases/page.tsx`
- Delete: `frontend/app/(authenticated)/projects/[projectId]/releases/loading.tsx`

- [ ] **Step 1: Check for navigation links to releases**

```bash
grep -rn "releases" "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/projects/[projectId]/layout.tsx" | head -10
grep -rn "releases" "D:/projects/personal/Streamlineos/frontend/features/projects/" | grep -v ".test" | head -10
```

- [ ] **Step 2: Remove nav link if exists**

- [ ] **Step 3: Check if `releases.ts` hook is used elsewhere**

```bash
grep -rn "useReleases\|releases" "D:/projects/personal/Streamlineos/frontend/hooks/api/projects/index.ts"
grep -rn "from.*releases\|releases.*hook" "D:/projects/personal/Streamlineos/frontend" --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v "releases/page.tsx" | head -10
```

If `releases.ts` is only used by the releases page, it can stay (unused hooks don't hurt, deleting could break barrel exports). If it's used only by the deleted page, remove its export from `index.ts`.

- [ ] **Step 4: Delete the route files**

```bash
rm "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/projects/[projectId]/releases/page.tsx"
rm "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/projects/[projectId]/releases/loading.tsx"
rmdir "D:/projects/personal/Streamlineos/frontend/app/(authenticated)/projects/[projectId]/releases"
```

---

## Final Verification

### Task Z1: Full typecheck + lint pass

- [ ] **Step 1: Frontend typecheck**

```bash
pnpm -C frontend tsc --noEmit 2>&1
```

Expected: 0 errors. Fix any errors before proceeding.

- [ ] **Step 2: Backend build**

```bash
pnpm -C backend build 2>&1 | tail -30
```

Expected: 0 errors.

- [ ] **Step 3: Frontend lint**

```bash
pnpm -C frontend lint 2>&1 | tail -20
```

Fix any lint errors.

- [ ] **Step 4: Update `PAGES.md`**

In `PAGES.md`, update the Projects section:
- Mark `audit` and `releases` as removed (or just delete those entries)
- Add note about new features: "inline edit/archive/delete on project list, comment permalinks, chat ticket mentions, calendar ticket linking"

- [ ] **Step 5: Verify access hook**

```bash
grep -n "useCan" "D:/projects/personal/Streamlineos/frontend/hooks/api/access.ts" | head -5
```

If `useCan` export doesn't exist, find the correct export name:

```bash
grep -rn "export.*useCan\|export.*useAccess" "D:/projects/personal/Streamlineos/frontend/hooks/api/" | head -5
```

Use the correct import in all files that reference `useCan`.

- [ ] **Step 6: Verify `useArchiveProject` is exported**

```bash
grep -n "useArchiveProject" "D:/projects/personal/Streamlineos/frontend/hooks/api/projects/index.ts"
```

If not present, add:
```typescript
export { useArchiveProject } from "./projects";
```

---

## Implementation Notes

### `ConfirmDialog` vs `AlertDialog`

Check if `ConfirmDialog` exists: 
```bash
ls "D:/projects/personal/Streamlineos/frontend/components/ui/" | grep -i confirm
```

If it doesn't exist, use `AlertDialog` from `@/components/ui/alert-dialog` everywhere.

### `useCan` hook

The existing code uses `useCan("projects:delete")` — the PRD standardizes to 3-segment format `"projects:projects:delete"`. Since the backend permission catalog may not have been updated, use both the old and new format where needed, OR check:

```bash
grep -rn "projects:projects:\|projects:delete\|projects:create" "D:/projects/personal/Streamlineos/backend/src/modules/rbac/permissions.constants.ts" | head -10
```

Use whichever format the backend actually has.

### Backend project member role type

Check the `projectMembers` schema for the `role` enum:

```bash
grep -n "role\|OWNER\|CONTRIBUTOR\|MEMBER" "D:/projects/personal/Streamlineos/backend/src/db/schema/projects.ts" 2>/dev/null | head -10
```

Use the exact string values from the schema.

### Calendar `UpdateCalendarEventPayload` type

The `UpdateCalendarEventPayload` in `frontend/hooks/api/calendar.ts` uses `Partial<CreateCalendarEventPayload>`. Since `entityType` and `entityId` are already in `CreateCalendarEventPayload`, they can be set/cleared via the update mutation.

To "unlink" a ticket, pass `entityType: null` and `entityId: null` (or `undefined` — check what the backend accepts for clearing).
