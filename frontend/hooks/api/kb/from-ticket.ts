"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { KbArticleWithTags } from "@/hooks/api/kb/kb-ai-schema";

interface CreateFromTicketInput {
  ticketId: number;
  spaceId: number;
}

const kbArticleWithTagsContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-ai-schema").then((m) => m.kbArticleWithTagsContract),
);

export function useCreateKbArticleFromTicket() {
  return useAuthorizedMutation("kb:articles:create", {
    mutationKey: ["create", "kb", "article", "from", "ticket"],
    mutationFn: ({ ticketId, spaceId }: CreateFromTicketInput) =>
      apiClient.post<KbArticleWithTags>(
        `/kb/articles/from-ticket/${ticketId}`,
        { spaceId },
        undefined,
        kbArticleWithTagsContract,
      ),
  });
}
