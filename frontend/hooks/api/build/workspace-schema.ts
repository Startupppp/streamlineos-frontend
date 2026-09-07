import { z } from "zod";

const milestoneRowSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  targetDate: z.string(),
  status: z.enum(["PENDING", "ACHIEVED", "MISSED"]),
  createdBy: z.string().nullable(),
  clientVisible: z.boolean(),
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
  source: z.enum(["manual", "web_form", "email"]),
  status: z.enum(["pending", "accepted", "declined", "duplicate"]),
  submitterEmail: z.string().nullable(),
  submitterName: z.string().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).nullable(),
  requestType: z.enum(["bug", "feature", "task", "question", "other"]).nullable(),
  linkedWorkItemId: z.number().nullable(),
  declineReason: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const intakeListSchema = z.object({
  data: z.array(intakeItemSchema),
  pagination: z.object({ limit: z.number(), hasMore: z.boolean(), nextCursor: z.string().nullable() }),
});

const viewRowSchema = z.object({
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
  visibility: z.enum(['project', 'private', 'public']),
  createdBy: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const whiteboardShareSchema = z.object({
  userId: z.string(),
  role: z.enum(['viewer', 'editor']),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

const whiteboardSharingUpdateSchema = z.object({
  visibility: z.enum(['project', 'private', 'public']),
  publicAccess: z.enum(['viewer', 'editor']),
  shareToken: z.string().nullable(),
  linkExpiresAt: z.string().nullable(),
  allowExport: z.boolean(),
});

const excalidrawSceneDataSchema = z.object({ type: z.string().optional(), version: z.number().optional(), source: z.string().optional(), elements: z.array(z.unknown()), appState: z.record(z.string(), z.unknown()).optional(), files: z.record(z.string(), z.unknown()).optional() });

const whiteboardDetailSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  data: excalidrawSceneDataSchema,
  visibility: z.enum(["project", "private", "public"]),
  access: z.enum(["view", "edit", "manage"]),
  sharing: z.object({ visibility: z.enum(["project", "private", "public"]), publicAccess: z.enum(["viewer", "editor"]), shareToken: z.string().nullable(), linkExpiresAt: z.string().nullable(), allowExport: z.boolean() }).nullable(),
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
  memberBreakdown: z.array(z.object({ userId: z.string(), hours: z.number(), cost: z.number(), unratedHours: z.number() })),
});

const analyticsSchema = z.object({
  stateDistribution: z.array(z.object({ status: z.string(), count: z.number() })),
  priorityBreakdown: z.array(z.object({ priority: z.string().nullable(), count: z.number() })),
  assigneeCompletion: z.array(z.object({ assigneeId: z.string().nullable(), assigneeName: z.string().nullable(), total: z.number(), completed: z.number() })),
  volumeOverTime: z.array(z.object({ week: z.string(), count: z.number() })),
  cycleVelocity: z.array(z.object({ cycleId: z.number(), cycleName: z.string(), completedPoints: z.number() })),
  estimateVsActual: z.array(z.object({ ticketId: z.number(), title: z.string(), estimated: z.string().nullable(), actual: z.number() })),
  healthScore: z.number().optional(),
  healthStatus: z.string().optional(),
  healthBreakdown: z.object({ completionPct: z.number(), onTimePct: z.number(), velocityScore: z.number(), overdueTickets: z.number(), totalTickets: z.number() }).optional(),
});

export const milestoneListContract = z.array(milestoneRowSchema);
export const milestoneRowContract = milestoneRowSchema;
export const intakeItemContract = intakeItemSchema;
export const intakeListContract = intakeListSchema;
export const viewRowContract = viewRowSchema;
export const viewListContract = z.array(viewRowSchema);
export const whiteboardListContract = z.array(whiteboardListItemSchema);
export const whiteboardDetailContract = whiteboardDetailSchema;
export const whiteboardSharingUpdateContract = whiteboardSharingUpdateSchema;
export const whiteboardSharesContract = z.array(whiteboardShareSchema);
export const publicWhiteboardContract = publicWhiteboardSchema;
export const publicWhiteboardUpdateContract = publicWhiteboardUpdateSchema;
export const projectBudgetContract = projectBudgetSchema;
export const projectBudgetUpdateContract = z.object({ id: z.number().int(), budget: z.number(), currency: z.string().nullable() });
export const analyticsContract = analyticsSchema;
export const successContract = z.object({ success: z.literal(true) });

const workspaceMemberItemSchema = z.object({
  id: z.string(),
  role: z.enum(['member', 'admin']),
  addedAt: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  teams: z.array(z.string()),
});

export const workspaceMemberPageContract = z.object({
  data: z.array(workspaceMemberItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
