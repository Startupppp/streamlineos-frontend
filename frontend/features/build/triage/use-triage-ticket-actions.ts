"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import { removeTicketFromCollections } from "@/hooks/api/build/ticket-cache";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Ticket } from "@/types/projects";

const ACCEPT_STATUS = "IN_PROGRESS";
const DECLINE_STATUS = "CANCELLED";

interface UseTriageTicketActionsProps {
  projectId: number;
  tickets: Ticket[];
  project: { key?: string } | null | undefined;
}

export function useTriageTicketActions({ projectId, tickets, project }: UseTriageTicketActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestLeave = useNavigationLeave();
  const updateTicket = useUpdateTicket(projectId);
  const [pendingAccept, setPendingAccept] = useState<Set<number>>(new Set());
  const [pendingDecline, setPendingDecline] = useState<Set<number>>(new Set());

  const handleAccept = useCallback(
    (ticketId: number) => {
      const target = tickets.find((t) => t.id === ticketId);
      if (!target) return;
      setPendingAccept((prev) => new Set(prev).add(ticketId));
      updateTicket.mutate(
        { ticketId, version: target.version, status: ACCEPT_STATUS },
        {
          onSuccess: () => {
            setPendingAccept((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            removeTicketFromCollections(queryClient, projectId, ticketId);
            toast.success("Ticket moved to In Progress");
          },
          onError: (err) => {
            setPendingAccept((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            toast.error(getErrorMessage(err));
          },
        },
      );
    },
    [updateTicket, queryClient, projectId, tickets],
  );

  const handleDecline = useCallback(
    (ticketId: number) => {
      const target = tickets.find((t) => t.id === ticketId);
      if (!target) return;
      setPendingDecline((prev) => new Set(prev).add(ticketId));
      updateTicket.mutate(
        { ticketId, version: target.version, status: DECLINE_STATUS },
        {
          onSuccess: () => {
            setPendingDecline((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            removeTicketFromCollections(queryClient, projectId, ticketId);
            toast.success("Ticket declined");
          },
          onError: (err) => {
            setPendingDecline((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            toast.error(getErrorMessage(err));
          },
        },
      );
    },
    [updateTicket, queryClient, projectId, tickets],
  );

  const handleOpen = useCallback(
    (ticket: Ticket) => {
      const href = getTicketDetailHref(projectId, project?.key, ticket.ticketNumber);
      requestLeave(() => router.push(href));
    },
    [router, projectId, project?.key, requestLeave],
  );

  return { handleAccept, handleDecline, handleOpen, pendingAccept, pendingDecline, updateTicket };
}
