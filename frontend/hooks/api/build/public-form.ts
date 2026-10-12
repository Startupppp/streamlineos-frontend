"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import {
  publicFormDefinitionContract,
  publicFormSubmitResponseContract,
  type PublicFormDefinition,
  type PublicFormSubmitResponse,
} from "@/features/build/forms/form-submission-schema";
import { buildUrl } from "@/lib/api-client";
import { parseApiResponse } from "@/lib/api-envelope";
import { withCorrelation } from "@/lib/observability/with-correlation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

async function fetchPublicFormAtPath(
  path: string,
  signal?: AbortSignal,
): Promise<PublicFormDefinition> {
  const res = await fetch(buildUrl(path), {
    credentials: "omit",
    headers: withCorrelation(new Headers()),
    signal,
  });
  return parseApiResponse(res, publicFormDefinitionContract, path);
}

export function fetchPublicForm(
  token: string,
  signal?: AbortSignal,
): Promise<PublicFormDefinition> {
  return fetchPublicFormAtPath(`/public/forms/${token}`, signal);
}

export async function submitPublicForm(
  token: string,
  values: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<PublicFormSubmitResponse> {
  const path = `/public/forms/${token}/submit`;
  const res = await fetch(buildUrl(path), {
    method: "POST",
    credentials: "omit",
    headers: withCorrelation(
      new Headers({ "Content-Type": "application/json", ...headers }),
    ),
    body: JSON.stringify({ values }),
  });
  return parseApiResponse(res, publicFormSubmitResponseContract, path);
}

export function usePublicForm(token: string) {
  return useQuery<PublicFormDefinition>({
    queryKey: buildWorkQueryKeys.projects.publicForms.token(token),
    queryFn: ({ signal }) =>
      fetchPublicFormAtPath(`/public/forms/${token}`, signal),
    enabled: !!token,
    retry: false,
    staleTime: 60_000,
    ...INLINE_READ_ERROR,
  });
}

export function useSubmitPublicForm(token: string) {
  const operation = useIdempotentOperation();
  return useMutation<PublicFormSubmitResponse, Error, Record<string, unknown>>({
    mutationKey: ["projects", "public-form", token, "submit"],
    mutationFn: (payload) =>
      submitPublicForm(token, payload, operation.configFor(payload).headers),
  });
}

export function useProjectIntakeForm(projectId: string) {
  return useQuery<PublicFormDefinition>({
    queryKey: buildWorkQueryKeys.projects.publicForms.projectIntakeForm(projectId),
    queryFn: ({ signal }) =>
      fetchPublicFormAtPath(`/public/intake/${projectId}/form`, signal),
    enabled: !!projectId,
    retry: false,
    staleTime: 60_000,
    ...INLINE_READ_ERROR,
  });
}
