import { z } from "zod";
import {
  projectsByIdGetProjectResponseSchema,
  projectsListProjectsResponseSchema,
  projectsListLabelsResponseSchema,
  projectsCreateLabelResponseSchema,
  projectResourcesListMembersResponseSchema,
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
  projectsWebhooksListWebhooksResponseSchema,
  projectsWebhooksCreateWebhookResponseSchema,
  projectsWebhooksUpdateWebhookBodySchema,
  projectsWebhooksListDeliveriesResponseSchema,
  projectsWebhooksSendTestResponseSchema,
  projectsAutomationsListResponseSchema,
  projectsAutomationsCreateResponseSchema,
  buildMembersListResponseSchema,
  buildMembersAddResponseSchema,
} from "@/contracts/build-contracts.generated";

const STATE_GROUP_VALUES = [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "cancelled",
] as const;

const projectStatusRowSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  orgId: z.string(),
  name: z.string(),
  order: z.number(),
  color: z.string().nullable(),
  type: z.enum(STATE_GROUP_VALUES).nullable(),
  wipLimit: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const projectRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  key: z.string(),
  clientMembershipId: z.number().nullable(),
  managerMembershipId: z.number().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).nullable(),
  priority: z.string().nullable(),
  dealId: z.number().nullable(),
  managedProductId: z.number().nullable(),
  budget: z.string().nullable(),
  budgetMinor: z.number().nullable(),
  budgetCurrency: z.string().nullable(),
  settings: z
    .object({
      modules: z.object({
        epics: z.boolean(),
        timeTracking: z.boolean(),
        wiki: z.boolean(),
      }),
      projectType: z.string().optional(),
      workflow: z.string().optional(),
      features: z.record(z.string(), z.boolean()).optional(),
    })
    .nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectDetailMemberContract =
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

const projectDetailSchema = projectRowSchema.extend({
  crmClient: projectsByIdGetProjectResponseSchema.shape.crmClient,
  statuses: z.array(projectStatusRowSchema),
  members: z.array(projectDetailMemberContract),
});

const projectMemberRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  membershipId: z.number(),
  role: z.string(),
  hourlyRate: z.string(),
  hourlyRateMinor: z.number(),
  rateCurrency: z.string().nullable(),
  joinedAt: z.string(),
});

const projectReleaseRowSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  version: z.string(),
  rowVersion: z.number(),
  description: z.string().nullable(),
  status: z.enum(["draft", "released", "archived"]),
  releaseDate: z.string().nullable(),
  publishedAt: z.string().nullable(),
  ticketCount: z.number(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectMemberSchema =
  projectResourcesListMembersResponseSchema.shape.data.element;
export const ticketLabelListContract = projectsListLabelsResponseSchema;
export const ticketLabelContract = projectsCreateLabelResponseSchema;
export const projectListPageContract = projectsListProjectsResponseSchema;
export const projectRowContract = projectRowSchema;
export const projectDetailContract = projectDetailSchema;
export const projectMemberPageContract = projectResourcesListMembersResponseSchema;
export const projectMemberRowContract = projectMemberRowSchema;
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
export const projectReleaseListItemContract =
  projectsReleasesListReleasesResponseSchema.shape.data.element;
export const projectReleaseRowContract = projectReleaseRowSchema;
export const projectWebhookPageContract =
  projectsWebhooksListWebhooksResponseSchema;
export const projectWebhookListContract = projectWebhookPageContract;
export const projectWebhookRowContract =
  projectsWebhooksCreateWebhookResponseSchema;
export const projectWebhookUpdateRequestContract =
  projectsWebhooksUpdateWebhookBodySchema;
export const webhookDeliveryListContract =
  projectsWebhooksListDeliveriesResponseSchema;
export const webhookTestResultContract = projectsWebhooksSendTestResponseSchema;
export const projectAutomationListContract =
  projectsAutomationsListResponseSchema;
export const projectAutomationRowContract =
  projectsAutomationsCreateResponseSchema;
export const buildMemberPageContract = buildMembersListResponseSchema;
export const buildMemberRowContract = buildMembersAddResponseSchema;
export const successContract = projectsCustomFieldsUpsertTicketValuesResponseSchema;
