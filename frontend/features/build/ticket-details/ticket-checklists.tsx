"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useChecklists,
  useCreateChecklist,
} from "@/hooks/api/build/checklists";
import { TicketAiGenerateChecklistAction } from "@/features/build/ai/ticket-detail-ai";
import { ChecklistSection } from "./checklist-section";
import { useCan, useCanState } from "@/hooks/api/access";

interface TicketChecklistsProps {
  projectId: number;
  ticketId: number;
  canUseAI?: boolean;
  generateChecklistDisabledReason?: string;
}

export function TicketChecklists({
  projectId,
  ticketId,
  canUseAI = false,
  generateChecklistDisabledReason,
}: TicketChecklistsProps) {
  const accessState = useCanState("build:tickets:view");
  const canUpdate = useCan("build:tickets:update");
  const { data: checklists = [], isLoading } = useChecklists(
    projectId,
    ticketId,
  );
  const createChecklist = useCreateChecklist(projectId, ticketId);

  const handleAddChecklist = useCallback(() => {
    createChecklist.mutate("Checklist", {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [createChecklist]);

  if (accessState === "denied" || accessState === "loading") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-3 bg-muted rounded w-full ml-6" />
        <div className="h-3 bg-muted rounded w-3/4 ml-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex w-full items-center gap-2">
        <CheckSquare className="h-4 w-4 text-primary shrink-0" />
        <h4 className="text-sm font-semibold">Checklists</h4>
        {canUpdate ? (
          <TicketAiGenerateChecklistAction
            projectId={projectId}
            ticketId={ticketId}
            canUseAI={canUseAI}
            disabledReason={generateChecklistDisabledReason}
          />
        ) : null}
      </div>

      {checklists.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {canUpdate
            ? "No checklists on this ticket yet. Add one to break the work into steps."
            : "No checklists on this ticket yet."}
        </p>
      ) : null}

      <AnimatePresence initial={false}>
        {checklists.map((checklist) => (
          <motion.div
            key={checklist.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ChecklistSection
              checklist={checklist}
              projectId={projectId}
              ticketId={ticketId}
              canUpdate={canUpdate}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {canUpdate ? (
        <button
          type="button"
          onClick={handleAddChecklist}
          disabled={createChecklist.isPending}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <PlusIcon size={16} />
          Add checklist
        </button>
      ) : null}
    </div>
  );
}
