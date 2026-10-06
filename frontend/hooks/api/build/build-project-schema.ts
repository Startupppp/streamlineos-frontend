import {
  projectsByIdGetProjectResponseSchema,
  projectsCreateProjectResponseSchema,
  projectsListProjectsResponseSchema,
  projectsListLabelsResponseSchema,
  projectsCreateLabelResponseSchema,
  projectResourcesListMembersResponseSchema,
  projectResourcesAddMemberResponseSchema,
  projectResourcesUpdateMemberRoleResponseSchema,
  projectResourcesGetRosterResponseSchema,
  projectResourcesListCustomStatesResponseSchema,
  projectResourcesCreateCustomStateResponseSchema,
  projectResourcesBulkReorderCustomStatesResponseSchema,
  projectsCustomFieldsCreateFieldResponseSchema,
  projectsCustomFieldsListFieldsResponseSchema,
  projectsCustomFieldsGetTicketValuesResponseSchema,
  projectsCustomFieldsUpsertTicketValuesResponseSchema,
  projectsReleasesListReleasesResponseSchema,
  projectsReleasesCreateReleaseResponseSchema,
  projectsWebhooksListWebhooksResponseSchema,
  projectsWebhooksCreateWebhookResponseSchema,
  projectsWebhooksUpdateWebhookBodySchema,
  projectsWebhooksSendTestResponseSchema,
  projectsAutomationsListResponseSchema,
  projectsAutomationsCreateResponseSchema,
  buildMembersListResponseSchema,
  buildMembersAddResponseSchema,
} from "@/contracts/build-contracts.generated";
import { z } from "zod";

const projectDetailMemberContract =
  projectsByIdGetProjectResponseSchema.shape.members.element.transform((m) => ({
    id: m.id,
    projectId: m.projectId,
    userId: m.user.user.id,
    role: m.role,
    joinedAt: null,
    user: {
      id: m.user.user.id,
      name: m.user.user.name,
      firstName: m.user.user.firstName,
      lastName: m.user.user.lastName,
      email: m.user.user.email,
      image: m.user.user.image,
    },
  }));


export const ticketLabelListContract = projectsListLabelsResponseSchema;
export const ticketLabelContract = projectsCreateLabelResponseSchema;
export const projectListPageContract = projectsListProjectsResponseSchema;
export const projectRowContract = projectsCreateProjectResponseSchema;
export const projectDetailContract = projectsByIdGetProjectResponseSchema.extend({
  members: z.array(projectDetailMemberContract),
});
export const projectMemberPageContract = projectResourcesListMembersResponseSchema;
export const projectMemberRowContract = projectResourcesAddMemberResponseSchema;
export const memberRoleContract = projectResourcesUpdateMemberRoleResponseSchema;
export const projectRosterContract = projectResourcesGetRosterResponseSchema;
export const projectCustomStateListContract =
  projectResourcesListCustomStatesResponseSchema;
export const projectCustomStateContract =
  projectResourcesCreateCustomStateResponseSchema;
export const bulkReorderStatesResultContract =
  projectResourcesBulkReorderCustomStatesResponseSchema;
export const buildCustomFieldContract =
  projectsCustomFieldsCreateFieldResponseSchema;
export const buildCustomFieldListContract =
  projectsCustomFieldsListFieldsResponseSchema;
export const ticketFieldValueListContract =
  projectsCustomFieldsGetTicketValuesResponseSchema;
export const ticketFieldValueCreateContract =
  projectsCustomFieldsUpsertTicketValuesResponseSchema;
export const projectReleaseListContract =
  projectsReleasesListReleasesResponseSchema;

export const projectReleaseRowContract = projectsReleasesCreateReleaseResponseSchema;
export const projectWebhookPageContract =
  projectsWebhooksListWebhooksResponseSchema;
export const projectWebhookListContract = projectWebhookPageContract;
export const projectWebhookRowContract =
  projectsWebhooksCreateWebhookResponseSchema;
export const projectWebhookUpdateRequestContract =
  projectsWebhooksUpdateWebhookBodySchema;
export const webhookTestResultContract = projectsWebhooksSendTestResponseSchema;
export const projectAutomationListContract =
  projectsAutomationsListResponseSchema;
export const projectAutomationRowContract =
  projectsAutomationsCreateResponseSchema;
export const buildMemberPageContract = buildMembersListResponseSchema.extend({
  data: z.array(
    buildMembersListResponseSchema.shape.data.element.extend({
      role: z.enum(["member", "admin"]),
    }),
  ),
});
export const buildMemberRowContract = buildMembersAddResponseSchema;
export const successContract = projectsCustomFieldsUpsertTicketValuesResponseSchema;
