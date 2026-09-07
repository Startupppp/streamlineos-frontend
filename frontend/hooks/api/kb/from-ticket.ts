"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { KbArticle } from "@/types/kb";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface CreateFromTicketInput {
  ticketId: number;
  spaceId: number;
}

const kbFromTicketSuccessContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-import-schema").then((m) => m.kbFromTicketSuccessContract),
);

export function useCreateKbArticleFromTicket() {
  return useAuthorizedMutation("kb:articles:create", {
    mutationKey: ["create", "kb", "article", "from", "ticket"],
    mutationFn: ({ ticketId, spaceId }: CreateFromTicketInput) =>
      apiClient.post<KbArticle>(`/kb/articles/from-ticket/${ticketId}`, { spaceId }, undefined, kbFromTicketSuccessContract),
  });
}
