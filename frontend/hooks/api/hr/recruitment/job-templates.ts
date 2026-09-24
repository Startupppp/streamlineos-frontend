"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const jobTemplatePageC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/job-templates-schema").then(
    (m) => m.jobTemplatePageContract,
  ),
);
const jobTemplateC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/job-templates-schema").then((m) => m.jobTemplateContract),
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

/** Exactly the keys the backend's `.strict()` list schema accepts — any other key is a 400, not an ignored filter. */
export interface JobTemplatesParams {
  type?: string;
  cursor?: string;
  limit?: number;
}

/** The half-typed posting the picker offers up so the server can fill only what is missing. */
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

/**
 * The bounded library list a picker renders: the first keyset page, nothing
 * more. A picker that walked every page would hold a whole tenant's library in
 * memory to populate a dropdown nobody scrolls past the top of.
 */
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

/** The whole keyset envelope, for a management screen that pages the library rather than picking from it. */
export function useJobTemplatesPage(params?: JobTemplatesParams) {
  const queryParams = templateQueryParams(params, params?.limit ?? 20);

  return useGatedQuery("hr:requisitions:view", {
    queryKey: [...humanResourcesQueryKeys.hr.jobTemplates(queryParams), "page"] as const,
    queryFn: ({ signal }): Promise<JobTemplatesPage> =>
      apiClient.get<JobTemplatesPage>(
        "/hr/recruitment/job-templates",
        queryParams,
        signal,
        jobTemplatePageC,
      ),
    staleTime: 5 * 60_000,
  });
}

export function useCreateJobTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "job-templates", "create"],
    mutationFn: (data: Partial<JobTemplateDraft> & { name: string }) =>
      apiClient.post<JobTemplate>("/hr/recruitment/job-templates", data, undefined, jobTemplateC),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_PREFIX }),
  });
}

export function useUpdateJobTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "job-templates", "update"],
    mutationFn: ({
      jobTemplateId,
      ...data
    }: Partial<JobTemplateDraft> & { jobTemplateId: number; name?: string }) =>
      apiClient.patch<JobTemplate>(
        `/hr/recruitment/job-templates/${jobTemplateId}`,
        data,
        undefined,
        jobTemplateC,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_PREFIX }),
  });
}

export function useDeleteJobTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "job-templates", "delete"],
    mutationFn: (jobTemplateId: number) =>
      apiClient.delete<void>(
        `/hr/recruitment/job-templates/${jobTemplateId}`,
        undefined,
        undefined,
        noContentC,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_PREFIX }),
  });
}

/**
 * Asks the server to merge a template into the draft the recruiter has so far.
 *
 * A mutation because the draft travels in the body — a description can run to
 * ten thousand characters, which has no business in a query string — but it is
 * gated on `hr:requisitions:view` and invalidates nothing, because it is a read
 * of the template library and creates no posting. Gating it on `manage` would
 * hide the picker from every recruiter who may open the create form but not
 * curate the library.
 */
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
