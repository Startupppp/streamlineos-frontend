import { useQuery, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { portalApiClient, getPortalToken } from "@/lib/portal-api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import type { PortalProjectOverview } from "@/features/portal/lib/portal-types";

const backendPortalProjectOverviewSchema = z.object({
  project: z.object({
    id: z.number().int(),
    name: z.string(),
    key: z.string(),
    status: z.string(),
    startDate: z.string().nullable(),
    targetEndDate: z.string().nullable(),
  }),
  capabilities: z
    .object({
      canViewMilestones: z.boolean(),
      canViewTasks: z.boolean(),
      canViewAttachments: z.boolean(),
      canViewComments: z.boolean(),
      canSubmitChangeRequests: z.boolean(),
    })
    .optional(),
  milestones: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      dueDate: z.string().nullable(),
      status: z.string().nullable(),
    }),
  ),
  tasks: z.array(
    z.object({
      id: z.number().int(),
      ticketNumber: z.number().int(),
      title: z.string(),
      status: z.string(),
      dueDate: z.string().nullable(),
    }),
  ),
  attachments: z.array(
    z.object({
      id: z.number().int(),
      filename: z.string(),
      url: z.string(),
    }),
  ),
  comments: z.array(
    z.object({
      id: z.number().int(),
      body: z.string(),
      authorName: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

export function portalProjectOverviewQueryOptions(projectId: number) {
  return queryOptions({
    queryKey: directoryAndOwnershipQueryKeys.portal.projectOverview(projectId),
    queryFn: async (): Promise<PortalProjectOverview> => {
      const raw = await portalApiClient.get<unknown>(
        `/portal/v1/projects/${projectId}/overview`,
      );
      return backendPortalProjectOverviewSchema.parse(raw);
    },
    staleTime: 1000 * 60,
  });
}

export function usePortalProjectOverview(projectId: number) {
  return useQuery({
    ...portalProjectOverviewQueryOptions(projectId),
    enabled: typeof window !== "undefined" && !!getPortalToken() && projectId > 0,
    staleTime: 30_000,
  });
}
