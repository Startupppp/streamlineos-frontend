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

async function messageFrom(res: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (typeof data !== "object" || data === null) return fallback;
    const message = Reflect.get(data, "message");
    if (
      typeof message === "string" &&
      message &&
      !message.startsWith(String(res.status))
    )
      return message;
    if (Array.isArray(message)) {
      const messages = message.filter(
        (item): item is string => typeof item === "string",
      );
      if (messages.length > 0) return messages.join(", ");
    }
  } catch {}
  return fallback;
}

export async function fetchPublicForm(
  token: string,
  signal?: AbortSignal,
): Promise<PublicFormDefinition> {
  const path = `/public/forms/${token}`;
  const res = await fetch(buildUrl(path), {
    credentials: "omit",
    headers: withCorrelation(new Headers()),
    signal,
  });
  if (!res.ok)
    throw new Error(
      await messageFrom(res, "Form not found or no longer active."),
    );
  return parseApiResponse(res, publicFormDefinitionContract, path);
}

export async function submitPublicForm(
  token: string,
  values: Record<string, string>,
  submittedByName?: string,
): Promise<PublicFormSubmitResponse> {
  const path = `/public/forms/${token}/submit`;
  const res = await fetch(buildUrl(path), {
    method: "POST",
    credentials: "omit",
    headers: withCorrelation(
      new Headers({ "Content-Type": "application/json" }),
    ),
    body: JSON.stringify({ values, submittedByName }),
  });
  if (!res.ok)
    throw new Error(
      await messageFrom(res, "Failed to submit. Please try again."),
    );
  return parseApiResponse(res, publicFormSubmitResponseContract, path);
}

export type {
  PublicFormDefinition,
  PublicFormSubmitResponse,
};

export function usePublicForm(token: string) {
  return useQuery<PublicFormDefinition>({
    queryKey: buildWorkQueryKeys.projects.publicForms.token(token),
    queryFn: ({ signal }) => fetchPublicForm(token, signal),
    enabled: !!token,
    retry: false,
    staleTime: 60_000,
  });
}

export function useSubmitPublicForm(token: string) {
  return useMutation<PublicFormSubmitResponse, Error, Record<string, string>>({
    mutationKey: ["projects", "public-form", token, "submit"],
    mutationFn: (payload) => submitPublicForm(token, payload),
  });
}
