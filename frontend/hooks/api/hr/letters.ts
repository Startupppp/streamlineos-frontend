"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface LetterRender {
  id: number;
  templateId: number;
  templateVersion: number;
  renderedForEmployeeId: number | null;
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
  employeeId?: number;
}

export interface RenderLetterInput {
  templateId: number;
  employeeId?: number;
  extraContext?: Record<string, string>;
}

export interface SaveLetterInput {
  templateId: number;
  templateVersion: number;
  employeeId?: number;
  outputHtml: string;
  contextSnapshot?: Record<string, unknown>;
}

const LETTERS_KEY = ["hr", "letters"] as const;

export function useLetters(employeeId?: string) {
  return useQuery<LetterRender[]>({
    queryKey: [...LETTERS_KEY, { employeeId }],
    queryFn: () =>
      apiClient.get<LetterRender[]>("/hr/documents/letters", employeeId ? { employeeId } : undefined),
    staleTime: 60_000,
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

export function useSendLetterToSign() {
  return useMutation({
    mutationKey: [...LETTERS_KEY, "sign"],
    mutationFn: ({ renderId, signerUserIds }: { renderId: number; signerUserIds: string[] }) =>
      apiClient.post(`/hr/documents/letters/${renderId}/sign`, { signerUserIds }),
  });
}
