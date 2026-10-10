import type { z } from "zod";
import {
  projectsRoadmapGetRoadmapSignalsResponseSchema,
  projectsRoadmapCreateRoadmapResponseSchema,
  projectsRoadmapListRoadmapResponseSchema,
  projectsFeedbackChangelogUpdateFeedbackResponseSchema,
  projectsFeedbackChangelogListFeedbackResponseSchema,
  projectsFeedbackChangelogCreateChangelogResponseSchema,
  projectsFeedbackChangelogListChangelogResponseSchema,
  projectsTemplatesListTemplatesResponseSchema,
  projectsTemplatesCreateTemplateResponseSchema,
  projectsTemplatesApplyTemplateResponseSchema,
  projectsRoadmapReadRoadmapPublicationResponseSchema,
  publicRoadmapGetRoadmapResponseSchema,
  publicRoadmapVoteRoadmapResponseSchema,
  publicRoadmapSubmitRoadmapFeedbackResponseSchema,
} from "@/contracts/build-contracts.generated";

export const roadmapPrioritizationContract =
  projectsRoadmapGetRoadmapSignalsResponseSchema.shape.prioritization;

export const roadmapTierWeightingContract =
  projectsRoadmapGetRoadmapSignalsResponseSchema.shape.tierWeighting;

export const roadmapSignalsContract = projectsRoadmapGetRoadmapSignalsResponseSchema;

export type RoadmapPrioritization = z.infer<typeof roadmapPrioritizationContract>;
export type RoadmapTierWeighting = z.infer<typeof roadmapTierWeightingContract>;
export type RoadmapSignals = z.infer<typeof roadmapSignalsContract>;

export const roadmapOwnerContract =
  projectsRoadmapCreateRoadmapResponseSchema.shape.owner.unwrap();

export type RoadmapOwner = z.infer<typeof roadmapOwnerContract>;

const roadmapItemShape = projectsRoadmapCreateRoadmapResponseSchema.shape;

export const roadmapGoalContract = roadmapItemShape.goal.unwrap();
export const roadmapReleaseContract = roadmapItemShape.release.unwrap();
export const roadmapTeamContract = roadmapItemShape.team.unwrap();
export const roadmapOpportunityContract = roadmapItemShape.opportunity.unwrap();
export const roadmapDeliveryContract = roadmapItemShape.delivery;

export type RoadmapGoal = z.infer<typeof roadmapGoalContract>;
export type RoadmapRelease = z.infer<typeof roadmapReleaseContract>;
export type RoadmapTeam = z.infer<typeof roadmapTeamContract>;
export type RoadmapOpportunity = z.infer<typeof roadmapOpportunityContract>;
export type RoadmapDelivery = z.infer<typeof roadmapDeliveryContract>;

export const roadmapItemContract = projectsRoadmapCreateRoadmapResponseSchema;
export const roadmapPageContract = projectsRoadmapListRoadmapResponseSchema;

export const feedbackPostContract = projectsFeedbackChangelogUpdateFeedbackResponseSchema;
export const feedbackPageContract = projectsFeedbackChangelogListFeedbackResponseSchema;

export const changelogEntryContract = projectsFeedbackChangelogCreateChangelogResponseSchema;
export const changelogPageContract = projectsFeedbackChangelogListChangelogResponseSchema;

export const templateRowContract = projectsTemplatesCreateTemplateResponseSchema;
export const templateListContract = projectsTemplatesListTemplatesResponseSchema;
export const applyTemplateResultContract = projectsTemplatesApplyTemplateResponseSchema;

export const publicRoadmapBoardContract = publicRoadmapGetRoadmapResponseSchema;
export const publicVoteResultContract = publicRoadmapVoteRoadmapResponseSchema;
export const publicFeedbackResultContract = publicRoadmapSubmitRoadmapFeedbackResponseSchema;
export const roadmapPublicationContract = projectsRoadmapReadRoadmapPublicationResponseSchema;
