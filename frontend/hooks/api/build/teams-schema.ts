import {
  teamsListTeamsResponseSchema,
  teamsGetTeamResponseSchema,
  teamsListTeamMembersResponseSchema,
  teamsAddMemberResponseSchema,
  teamsListTeamProjectsResponseSchema,
  teamsAddProjectResponseSchema,
  teamsCreateTeamResponseSchema,
  type TeamsListTeamMembersResponse,
} from "@/contracts/build-contracts.generated";

export const teamRowContract = teamsCreateTeamResponseSchema;
export const teamListItemContract = teamsListTeamsResponseSchema.shape.data.element;
export const teamPageContract = teamsListTeamsResponseSchema;
export const teamDetailContract = teamsGetTeamResponseSchema;
export const teamMemberRowContract = teamsAddMemberResponseSchema;
export const teamMemberPageContract = teamsListTeamMembersResponseSchema;
export const teamProjectItemListContract = teamsListTeamProjectsResponseSchema;
export const teamProjectRowContract = teamsAddProjectResponseSchema;

export type TeamMemberPage = TeamsListTeamMembersResponse;
