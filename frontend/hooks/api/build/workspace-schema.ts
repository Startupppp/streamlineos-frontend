import { z } from 'zod';

const milestoneRowSchema = z.object({
  id: z.number(),
  projectId: z.number().nullable(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  targetDate: z.string().nullable(),
  status: z.string().nullable(),
  createdBy: z.string().nullable(),
  clientVisible: z.boolean(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const intakeItemSchema = z.object({
  id: z.number(),
  projectId: z.number().nullable(),
  orgId: z.string(),
  title: z.string(),
  description: z.unknown(),
  source: z.string(),
  status: z.string(),
  submitterEmail: z.string().nullable(),
  submitterName: z.string().nullable(),
  priority: z.string().nullable(),
  requestType: z.string().nullable(),
  linkedWorkItemId: z.number().nullable(),
  declineReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const intakeListSchema = z.object({
  data: z.array(intakeItemSchema),
  pagination: z.object({ limit: z.number(), hasMore: z.boolean(), nextCursor: z.string().nullable() }),
});

const viewRowSchema = z.object({
  id: z.number(),
  projectId: z.number().nullable(),
  orgId: z.string(),
  createdBy: z.string().nullable(),
  name: z.string(),
  filters: z.unknown(),
  groupBy: z.string().nullable(),
  orderBy: z.string().nullable(),
  layoutType: z.string(),
  isPinned: z.boolean(),
  visibility: z.string().nullable(),
  displayOptions: z.unknown(),
  scope: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const whiteboardListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  elementCount: z.number(),
  visibility: z.string(),
  createdBy: z.string().nullable(),
  updatedAt: z.string(),
});

const whiteboardShareSchema = z.object({
  userId: z.string(),
  role: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

const whiteboardSharingUpdateSchema = z.object({
  visibility: z.string(),
  publicAccess: z.string().nullable(),
  shareToken: z.string().nullable(),
  linkExpiresAt: z.string().nullable(),
  allowExport: z.boolean(),
});

const whiteboardDetailSchema = z.object({
  id: z.number(),
  projectId: z.number().nullable(),
  name: z.string(),
  data: z.unknown(),
  visibility: z.string(),
  access: z.enum(['view', 'edit', 'manage']),
  sharing: z.object({ visibility: z.string(), publicAccess: z.string().nullable(), shareToken: z.string().nullable(), linkExpiresAt: z.string().nullable(), allowExport: z.boolean() }).nullable(),
  shares: z.array(whiteboardShareSchema).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const publicWhiteboardSchema = z.object({
  name: z.string(),
  data: z.unknown(),
  access: z.enum(['edit', 'view']),
  allowExport: z.boolean(),
  updatedAt: z.string(),
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
  stateDistribution: z.unknown(),
  priorityBreakdown: z.unknown(),
  assigneeCompletion: z.unknown(),
  volumeOverTime: z.unknown(),
  cycleVelocity: z.unknown(),
  estimateVsActual: z.unknown(),
  healthScore: z.number(),
  healthStatus: z.string(),
  healthBreakdown: z.object({ completionPct: z.number(), onTimePct: z.number(), velocityScore: z.number(), overdueTickets: z.number(), totalTickets: z.number() }),
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
  role: z.string(),
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
