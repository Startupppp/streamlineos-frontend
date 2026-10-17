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
export const viewRowContract = viewsCreateViewResponseSchema;
export const viewPageContract = viewsListViewsResponseSchema;
export const viewListContract = workspaceViewsListWorkspaceViewsResponseSchema;
export const whiteboardListContract =
  whiteboardsListWhiteboardsResponseSchema.shape.data;
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
export const analyticsContract = projectsReportsGetAnalyticsResponseSchema;
