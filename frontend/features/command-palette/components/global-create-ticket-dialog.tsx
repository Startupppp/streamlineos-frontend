"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { useCommandPalette } from "../hooks/use-command-palette";

const CreateTicketDialogDynamic = dynamic(
  () =>
    import("@/features/projects/tickets/create-ticket-dialog").then(
      (m) => m.CreateTicketDialog,
    ),
  { ssr: false },
);

export function GlobalCreateTicketDialog() {
  const { createTicketOpen, createTicketProjectId, closeCreateTicket } =
    useCommandPalette();

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeCreateTicket();
    },
    [closeCreateTicket],
  );

  if (!createTicketOpen) return null;

  return (
    <CreateTicketDialogDynamic
      projectId={createTicketProjectId ?? undefined}
      hideTrigger
      externalOpen={createTicketOpen}
      onExternalOpenChange={handleOpenChange}
    />
  );
}
