import type { z } from "zod";
import {
  projectsRoadmapGetRoadmapSignalsResponseSchema,
  projectsRoadmapCreateRoadmapResponseSchema,
  projectsRoadmapListRoadmapResponseSchema,
  projectsRoadmapUpdateFeedbackResponseSchema,
  projectsRoadmapListFeedbackResponseSchema,
  projectsRoadmapCreateChangelogResponseSchema,
  projectsRoadmapListChangelogResponseSchema,
  projectsTemplatesListTemplatesResponseSchema,
  projectsTemplatesCreateTemplateResponseSchema,
  projectsTemplatesApplyTemplateResponseSchema,
  projectsRoadmapReadRoadmapPublicationResponseSchema,
  publicGetRoadmapResponseSchema,
  publicVoteRoadmapResponseSchema,
  publicSubmitRoadmapFeedbackResponseSchema,
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

export const roadmapItemContract = projectsRoadmapCreateRoadmapResponseSchema;
export const roadmapPageContract = projectsRoadmapListRoadmapResponseSchema;

export const feedbackPostContract = projectsRoadmapUpdateFeedbackResponseSchema;
export const feedbackPageContract = projectsRoadmapListFeedbackResponseSchema;

export const changelogEntryContract = projectsRoadmapCreateChangelogResponseSchema;
export const changelogPageContract = projectsRoadmapListChangelogResponseSchema;

export const templateRowContract = projectsTemplatesCreateTemplateResponseSchema;
export const templateListContract = projectsTemplatesListTemplatesResponseSchema;
export const applyTemplateResultContract = projectsTemplatesApplyTemplateResponseSchema;

export const publicRoadmapBoardContract = publicGetRoadmapResponseSchema;
export const publicVoteResultContract = publicVoteRoadmapResponseSchema;
export const publicFeedbackResultContract = publicSubmitRoadmapFeedbackResponseSchema;
export const roadmapPublicationContract = projectsRoadmapReadRoadmapPublicationResponseSchema;
