"use client";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { KbArticle } from "@/types/kb";

export interface CreateFromTicketInput {
  ticketId: number;
  spaceId: number;
}

export function useCreateKbArticleFromTicket() {
  return useMutation({
    mutationFn: ({ ticketId, spaceId }: CreateFromTicketInput) =>
      apiClient.post<KbArticle>(`/kb/articles/from-ticket/${ticketId}`, { spaceId }),
  });
}
