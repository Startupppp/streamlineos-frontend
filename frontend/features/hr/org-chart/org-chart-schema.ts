import { z } from "zod";

const orgChartNodeContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  role: z.string().nullable(),
  designation: z.string().nullable(),
  image: z.string().nullable(),
  departmentId: z.string().nullable(),
  departmentName: z.string().nullable(),
  hasDirectReports: z.boolean(),
  // V-026. Optional until the org-chart row carries them; `splitOrgChartRoots`
  // falls back to `hasDirectReports` while they are absent.
  isOwner: z.boolean().optional(),
  isTopLevel: z.boolean().optional(),
});

export const orgChartPageContract = z.object({
  data: z.array(orgChartNodeContract),
  pageInfo: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type OrgChartNode = z.infer<typeof orgChartNodeContract>;
export type OrgChartPage = z.infer<typeof orgChartPageContract>;
