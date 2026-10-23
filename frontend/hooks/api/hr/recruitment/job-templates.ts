"use client";

import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const jobTemplatePageC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/job-templates-schema").then(
    (m) => m.jobTemplatePageContract,
  ),
);
const appliedJobTemplateC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/job-templates-schema").then(
    (m) => m.appliedJobTemplateContract,
  ),
);

export interface JobTemplateScreeningQuestion {
  id: string;
  question: string;
  type: "TEXT" | "YES_NO" | "SINGLE_SELECT" | "NUMBER";
  required: boolean;
  knockout: boolean;
  knockoutAnswer?: string;
  options?: string[];
}

export interface JobTemplate {
  id: number;
  name: string;
  title: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  type: string;
  experience: string | null;
  screeningQuestions: JobTemplateScreeningQuestion[] | null;
  jobLevelId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobTemplatesPage {
  data: JobTemplate[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface JobTemplatesParams {
  type?: string;
  cursor?: string;
  limit?: number;
}

export interface JobTemplateDraft {
  title?: string;
  departmentId?: string;
  hiringFlowId?: number;
  location?: string;
  type?: string;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  requirements?: string;
  benefits?: string;
  openings?: number;
  applicationDeadline?: string;
  status?: string;
  screeningQuestions?: JobTemplateScreeningQuestion[];
}

export interface AppliedJobTemplate {
  jobTemplateId: number;
  jobTemplateName: string;
  draft: JobTemplateDraft;
}

const TEMPLATES_PREFIX = humanResourcesQueryKeys.hr.jobTemplates();

function templateQueryParams(params: JobTemplatesParams | undefined, limit: number) {
  const queryParams: Record<string, unknown> = { limit };
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.type) queryParams.type = params.type;
  return queryParams;
}

export function useJobTemplates(params?: JobTemplatesParams) {
  const queryParams = templateQueryParams(params, params?.limit ?? 100);

  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.jobTemplates(queryParams),
    queryFn: async ({ signal }): Promise<JobTemplate[]> => {
      const page = await apiClient.get<JobTemplatesPage>(
        "/hr/recruitment/job-templates",
        queryParams,
        signal,
        jobTemplatePageC,
      );
      return page.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useApplyJobTemplate() {
  return useAuthorizedMutation("hr:requisitions:view", {
    mutationKey: ["hr", "recruitment", "job-templates", "apply"],
    mutationFn: ({ jobTemplateId, draft }: { jobTemplateId: number; draft: JobTemplateDraft }) =>
      apiClient.post<AppliedJobTemplate>(
        `/hr/recruitment/job-templates/${jobTemplateId}/apply`,
        draft,
        undefined,
        appliedJobTemplateC,
      ),
  });
}
