"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { queryKeys } from "@/lib/query-keys";

export interface LetterRender {
  id: number;
  templateId: number;
  templateVersion: number;
  renderedForEmploymentId: number | null;
  renderedBy: string;
  createdAt: string;
  templateName: string;
  templateLetterType: string | null;
  rendererName: string | null;
}

export interface RenderLetterPreview {
  templateId: number;
  templateVersion: number;
  templateName: string;
  letterType: string | null;
  outputHtml: string;
  variables: string[];
  contextSnapshot: Record<string, string>;
  employmentId?: number;
}

export interface RenderLetterInput {
  templateId: number;
  employmentId?: number;
  employeeUserId?: string;
  extraContext?: Record<string, string>;
}

export interface SaveLetterInput {
  templateId: number;
  templateVersion: number;
  employmentId?: number;
  employeeUserId?: string;
  outputHtml: string;
  contextSnapshot?: Record<string, unknown>;
}

const LETTERS_KEY = [...queryKeys.hr.all, "letters"] as const;

export function useLetters(employmentId?: number) {
  const canView = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<LetterRender[]>({
    queryKey: [...queryKeys.hr.all, "letters", { employmentId }],
    queryFn: ({ signal }) =>
      apiClient.get<LetterRender[]>(
        "/hr/documents/letters",
        employmentId ? { employmentId } : undefined, signal,
      ),
    staleTime: 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useRenderLetter() {
  return useMutation({
    mutationKey: [...LETTERS_KEY, "render"],
    mutationFn: (data: RenderLetterInput) =>
      apiClient.post<RenderLetterPreview>("/hr/documents/letters/render", data),
  });
}

export function useSaveLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...LETTERS_KEY, "save"],
    mutationFn: (data: SaveLetterInput) =>
      apiClient.post<LetterRender>("/hr/documents/letters", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: LETTERS_KEY }),
  });
}
