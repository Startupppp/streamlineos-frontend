"use client";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { KbArticle } from "@/types/kb";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface CreateFromTicketInput {
  ticketId: number;
  spaceId: number;
}

export function useCreateKbArticleFromTicket() {
  return useAuthorizedMutation("kb:articles:create", {
    mutationKey: ["create", "kb", "article", "from", "ticket"],
    mutationFn: ({ ticketId, spaceId }: CreateFromTicketInput) =>
      apiClient.post<KbArticle>(`/kb/articles/from-ticket/${ticketId}`, { spaceId }),
  });
}
