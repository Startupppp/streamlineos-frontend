"use client";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { KbArticle } from "@/types/kb";

interface CreateFromTicketInput {
  ticketId: number;
  spaceId: number;
}

export function useCreateKbArticleFromTicket() {
  return useMutation({
    mutationKey: ["create", "kb", "article", "from", "ticket"],
    mutationFn: ({ ticketId, spaceId }: CreateFromTicketInput) =>
      apiClient.post<KbArticle>(`/kb/articles/from-ticket/${ticketId}`, { spaceId }),
  });
}
