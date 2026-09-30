import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";
import { DB_ENUMS } from "@/contracts/db-enums.generated";
import { genProjectAnalyticsSchema } from "@/contracts/build-contracts.generated";

const milestoneOwnerSchema = z.object({
  membershipId: z.number().int(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  image: z.string().nullable(),
});

const milestoneRowSchema = z.object({
  id: z.number(),
  projectId: z.number().nullable(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  targetDate: z.string().nullable(),
  status: z.string().nullable(),
  createdBy: z.string().nullable(),
  ownerMembershipId: z.number().int().nullable(),
  owner: milestoneOwnerSchema.nullable(),
  linkedTicketCount: z.number().int(),
  completedTicketCount: z.number().int(),
  clientVisible: z.boolean(),
  version: z.number().int(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const intakeItemSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  orgId: z.string(),
  title: z.string(),
  description: z.unknown(),
  source: z.enum(DB_ENUMS.intake_source),
  status: z.enum(DB_ENUMS.intake_status),
  submitterEmail: z.string().nullable(),
  submitterName: z.string().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).nullable(),
  requestType: z
    .enum(["bug", "feature", "task", "question", "other"])
    .nullable(),
  linkedWorkItemId: z.number().nullable(),
  declineReason: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const intakeListSchema = z.object({
  data: z.array(intakeItemSchema),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const viewRowSchema = z.object({
  id: z.number(),
  projectId: z.number().nullable(),
  orgId: z.string(),
  createdBy: z.string(),
  name: z.string(),
  filters: z.record(z.string(), z.unknown()),
  groupBy: z.string().nullable(),
  orderBy: z.string().nullable(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]),
  isPinned: z.boolean(),
  visibility: z.enum(["private", "shared"]),
  displayOptions: z.record(z.string(), z.unknown()).nullable(),
  scope: z.enum(["project", "workspace"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const whiteboardListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  elementCount: z.number(),
  visibility: z.enum(DB_ENUMS.whiteboard_visibility),
  createdBy: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const whiteboardShareSchema = z.object({
  userId: z.string(),
  role: z.enum(DB_ENUMS.whiteboard_share_role),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

const whiteboardSharingUpdateSchema = z.object({
  visibility: z.enum(DB_ENUMS.whiteboard_visibility),
  publicAccess: z.enum(DB_ENUMS.whiteboard_share_role),
  shareToken: z.string().nullable(),
  linkExpiresAt: z.string().nullable(),
  allowExport: z.boolean(),
});

const excalidrawSceneDataSchema = z.object({
  type: z.string().optional(),
  version: z.number().optional(),
  source: z.string().optional(),
  elements: z.array(z.unknown()),
  appState: z.record(z.string(), z.unknown()).optional(),
  files: z.record(z.string(), z.unknown()).optional(),
});

const whiteboardDetailSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  data: excalidrawSceneDataSchema,
  visibility: z.enum(DB_ENUMS.whiteboard_visibility),
  access: z.enum(["view", "edit", "manage"]),
  sharing: z
    .object({
      visibility: z.enum(DB_ENUMS.whiteboard_visibility),
      publicAccess: z.enum(DB_ENUMS.whiteboard_share_role),
      shareToken: z.string().nullable(),
      linkExpiresAt: z.string().nullable(),
      allowExport: z.boolean(),
    })
    .nullable(),
  shares: z.array(whiteboardShareSchema).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const publicWhiteboardSchema = z.object({
  name: z.string(),
  data: excalidrawSceneDataSchema,
  access: z.enum(["edit", "view"]),
  allowExport: z.boolean(),
  updatedAt: z.string().nullable(),
});

const publicWhiteboardUpdateSchema = z.object({
  success: z.literal(true),
  updatedAt: z.string(),
});

const projectBudgetSchema = z.object({
  projectId: z.number(),
  plannedBudget: z.number(),
  actualCost: z.number(),
  remaining: z.number(),
  utilizationPct: z.number(),
  currency: z.string().nullable(),
  totalHours: z.number(),
  unratedHours: z.number(),
  currencyMismatch: z.boolean(),
  excludedCurrencyHours: z.number(),
  memberBreakdown: z.array(
    z.object({
      userId: z.string(),
      hours: z.number(),
      cost: z.number(),
      unratedHours: z.number(),
    }),
  ),
});


export const milestoneListContract = cursorPageContract(milestoneRowSchema);
export const milestoneRowContract = milestoneRowSchema;
export const milestoneUpdateRequestContract = z
  .object({
    version: z.number().int().positive(),
    name: z.string().min(1).trim().max(200).optional(),
    description: z.string().max(1000).optional(),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    status: z.enum(["PENDING", "ACHIEVED", "MISSED"]).optional(),
    ownerMembershipId: z.number().int().nullable().optional(),
  })
  .strict();
export const intakeItemContract = intakeItemSchema;
export const intakeListContract = intakeListSchema;
export const viewRowContract = viewRowSchema;
export const viewPageContract = cursorPageContract(viewRowSchema);
export const viewListContract = z.array(viewRowSchema);
export const whiteboardListContract = z.array(whiteboardListItemSchema);
export const whiteboardPageContract = cursorPageContract(
  whiteboardListItemSchema,
);
export const whiteboardResponseContract = whiteboardPageContract.or(
  whiteboardListContract,
);
export const whiteboardDetailContract = whiteboardDetailSchema;
export const whiteboardSharingUpdateContract = whiteboardSharingUpdateSchema;
export const whiteboardSharesContract = z.array(whiteboardShareSchema);
export const publicWhiteboardContract = publicWhiteboardSchema;
export const publicWhiteboardUpdateContract = publicWhiteboardUpdateSchema;
export const projectBudgetContract = projectBudgetSchema;
export const projectBudgetUpdateContract = z.object({
  id: z.number().int(),
  budget: z.number(),
  currency: z.string().nullable(),
});
export const analyticsContract = genProjectAnalyticsSchema.extend({
  stateDistribution: z.array(
    z.object({ status: z.string(), count: z.number() }),
  ),
  priorityBreakdown: z.array(
    z.object({ priority: z.string().nullable(), count: z.number() }),
  ),
  assigneeCompletion: z.array(
    z.object({
      assigneeId: z.string().nullable(),
      assigneeName: z.string().nullable(),
      total: z.number(),
      completed: z.number(),
    }),
  ),
  volumeOverTime: z.array(z.object({ week: z.string(), count: z.number() })),
  cycleVelocity: z.array(
    z.object({
      cycleId: z.number(),
      cycleName: z.string(),
      completedPoints: z.number(),
    }),
  ),
  estimateVsActual: z.array(
    z.object({
      ticketId: z.number(),
      title: z.string(),
      estimated: z.string().nullable(),
      actual: z.number(),
    }),
  ),
});
export const successContract = z.object({ success: z.literal(true) });

const buildMemberItemSchema = z.object({
  id: z.string(),
  role: z.enum(["member", "admin"]),
  addedAt: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  teams: z.array(z.string()),
});

export const buildMemberPageContract = z.object({
  data: z.array(buildMemberItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
