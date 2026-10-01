import { z } from "zod";
import {
  milestonesListMilestonesResponseSchema,
  milestonesCreateMilestoneResponseSchema,
  intakeCreateIntakeResponseSchema,
  intakeListIntakeResponseSchema,
  viewsCreateViewResponseSchema,
  viewsListViewsResponseSchema,
  workspaceViewsListWorkspaceViewsResponseSchema,
  whiteboardsListWhiteboardsResponseSchema,
  whiteboardsGetWhiteboardResponseSchema,
  whiteboardSharingUpdateSharingResponseSchema,
  whiteboardSharingSetSharesResponseSchema,
  publicWhiteboardLinksGetByTokenResponseSchema,
  publicWhiteboardLinksUpdateByTokenResponseSchema,
  projectsBudgetGetBudgetResponseSchema,
  projectsBudgetUpdateBudgetResponseSchema,
  projectsReportsGetAnalyticsResponseSchema,
} from "@/contracts/build-contracts.generated";

export const milestoneListContract = milestonesListMilestonesResponseSchema;
export const milestoneRowContract = milestonesCreateMilestoneResponseSchema;
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
export const intakeItemContract = intakeCreateIntakeResponseSchema;
export const intakeListContract = intakeListIntakeResponseSchema;
export const viewRowSchema = viewsCreateViewResponseSchema;
export const viewRowContract = viewsCreateViewResponseSchema;
export const viewPageContract = viewsListViewsResponseSchema;
export const viewListContract = workspaceViewsListWorkspaceViewsResponseSchema;
export const whiteboardListContract =
  whiteboardsListWhiteboardsResponseSchema.shape.data;
export const whiteboardPageContract = whiteboardsListWhiteboardsResponseSchema;
export const whiteboardResponseContract =
  whiteboardsListWhiteboardsResponseSchema;
export const whiteboardDetailContract = whiteboardsGetWhiteboardResponseSchema;
export const whiteboardSharingUpdateContract =
  whiteboardSharingUpdateSharingResponseSchema;
export const whiteboardSharesContract = whiteboardSharingSetSharesResponseSchema;
export const publicWhiteboardContract =
  publicWhiteboardLinksGetByTokenResponseSchema;
export const publicWhiteboardUpdateContract =
  publicWhiteboardLinksUpdateByTokenResponseSchema;
export const projectBudgetContract = projectsBudgetGetBudgetResponseSchema;
export const projectBudgetUpdateContract =
  projectsBudgetUpdateBudgetResponseSchema;
export const analyticsContract = projectsReportsGetAnalyticsResponseSchema.extend(
  {
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
    volumeOverTime: z.array(
      z.object({ week: z.string(), count: z.number() }),
    ),
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
  },
);
