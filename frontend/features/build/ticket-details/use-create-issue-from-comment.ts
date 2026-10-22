"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateTicket } from "@/hooks/api/build/tickets";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";

interface UseCreateIssueFromCommentInput {
  ticketId: number;
  projectId: number;
  projectKey?: string | null;
  ticketNumber?: number | null;
}

export function useCreateIssueFromComment({
  ticketId,
  projectId,
  projectKey,
  ticketNumber,
}: UseCreateIssueFromCommentInput) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createTicket = useCreateTicket({
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({
        queryKey: accountingAndSupportQueryKeys.ticketActivity.list(ticketId),
        exact: true,
        refetchType: "none",
      });
      toast.success("Issue created");
      if (ticket.projectId != null && ticket.ticketNumber != null) {
        router.push(
          getTicketDetailHref(
            ticket.projectId,
            ticket.project?.key ?? projectKey,
            ticket.ticketNumber,
          ),
        );
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function handleCreateIssue(commentId: number, content: string) {
    if (!projectId) return;
    const sourceRef =
      ticketNumber != null && projectKey
        ? `${projectKey}-${ticketNumber}`
        : `ticket #${ticketId}`;
    createTicket.mutate({
      projectId,
      title: `Issue from comment on ${sourceRef}`,
      description: `${content}\n\n---\nCreated from a comment on ${sourceRef} (comment #${commentId}).`,
      type: "TASK",
    });
  }

  return { handleCreateIssue };
}
