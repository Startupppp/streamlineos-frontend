"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  PublicFormDefinition,
  PublicFormSubmitResponse,
} from "@/features/build/forms/form-submission-schema";
import {
  fetchPublicForm,
  submitPublicForm,
} from "@/features/build/forms/public-form-api";

export type { PublicFormDefinition, PublicFormSubmitResponse };

export function usePublicForm(token: string) {
  return useQuery<PublicFormDefinition>({
    queryKey: buildWorkQueryKeys.projects.publicForms.token(token),
    queryFn: () => fetchPublicForm(token),
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
