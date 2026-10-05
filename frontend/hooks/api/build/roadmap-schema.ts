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

export const RICE_INPUT_NAMES = ["reach", "impact", "confidence", "effort"] as const;
export const RICE_SCORE_UNAVAILABLE_REASONS = ["missing_inputs", "non_positive_effort"] as const;
export const ROADMAP_DELIVERY_SOURCES = ["epic_ticket", "project", "none"] as const;
export const ROADMAP_TIER_UNWEIGHTED_REASONS = [
  "no_linked_feedback",
  "no_linked_account",
  "account_tier_unset",
  "score_unavailable",
] as const;

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
